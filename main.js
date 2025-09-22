const fs = require("fs");
const path = require("path");
const axios = require("axios");

const CONFIG = {
  API_KEY: "AIzaSyBj9SWHgrSCXqsUza4RSnZeeCIcDWj_baU",
  BASE_URL: "https://identitytoolkit.googleapis.com/v1",
  FIRESTORE_URL:
    "https://firestore.googleapis.com/v1/projects/knovus-xyz-app/databases/(default)",
  PROJECT_ID: "knovus-xyz-app",
  ORIGIN: "https://knovus.xyz",
  POINTS: {
    DAILY_CLAIM: 200,
    DAILY_CHECKIN: 10,
  },
  DELAYS: {
    BETWEEN_ACCOUNTS: 2000,
  },
};

const HEADERS = {
  COMMON: {
    "Content-Type": "application/json",
    Accept: "*/*",
    Origin: CONFIG.ORIGIN,
  },
  FIRESTORE: {
    "Content-Type": "text/plain",
    Origin: CONFIG.ORIGIN,
    "Google-Cloud-Resource-Prefix": `projects/${CONFIG.PROJECT_ID}/databases/(default)`,
  },
};

class KnovusAutoClaim {
  constructor() {
    this.accounts = [];
  }

  loadAccounts() {
    try {
      const dataPath = path.join(__dirname, "data.txt");
      if (!fs.existsSync(dataPath)) {
        console.log("❌ File data.txt tidak ditemukan. Membuat file contoh...");
        fs.writeFileSync(
          dataPath,
          "email1@gmail.com:password1\nemail2@gmail.com:password2"
        );
        console.log(
          "✅ File data.txt telah dibuat. Silakan isi dengan data akun Anda."
        );
        return false;
      }

      const data = fs.readFileSync(dataPath, "utf8");
      const lines = data
        .split("\n")
        .filter((line) => line.trim() && line.includes(":"));

      this.accounts = lines.map((line) => {
        const [email, password] = line.trim().split(":");
        return { email, password };
      });

      console.log(`📋 Loaded ${this.accounts.length} accounts`);
      return true;
    } catch (error) {
      console.error("❌ Error loading accounts:", error.message);
      return false;
    }
  }

  async signIn(email, password) {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    try {
      const response = await axios.post(
        `${CONFIG.BASE_URL}/accounts:signInWithPassword?key=${CONFIG.API_KEY}`,
        {
          returnSecureToken: true,
          email,
          password,
          clientType: "CLIENT_TYPE_WEB",
        },
        { headers: HEADERS.COMMON }
      );

      return {
        idToken: response.data.idToken,
        localId: response.data.localId,
        refreshToken: response.data.refreshToken,
      };
    } catch (error) {
      throw new Error(
        `Login error: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  async getUserData(idToken, userId) {
    if (!idToken || !userId) {
      throw new Error("ID token and user ID are required");
    }

    try {
      const response = await axios.post(
        `${CONFIG.FIRESTORE_URL}/documents:batchGet`,
        {
          documents: [
            `projects/${CONFIG.PROJECT_ID}/databases/(default)/documents/users/${userId}`,
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
            ...HEADERS.FIRESTORE,
          },
        }
      );

      const userData = response.data?.[0]?.found;
      if (!userData) {
        throw new Error("User data not found");
      }
      return userData;
    } catch (error) {
      throw new Error(
        `Get user data error: ${
          error.response?.data?.error?.message || error.message
        }`
      );
    }
  }

  async claimDailyPoints(idToken, userId, currentUpdateTime) {
    if (!idToken || !userId || !currentUpdateTime) {
      throw new Error("Required parameters missing for daily claim");
    }

    try {
      const response = await axios.post(
        `${CONFIG.FIRESTORE_URL}/documents:commit`,
        {
          writes: [
            {
              currentDocument: { updateTime: currentUpdateTime },
              transform: {
                document: `projects/${CONFIG.PROJECT_ID}/databases/(default)/documents/users/${userId}`,
                fieldTransforms: [
                  {
                    fieldPath: "points",
                    increment: {
                      integerValue: String(CONFIG.POINTS.DAILY_CLAIM),
                    },
                  },
                  {
                    fieldPath: "lastClaim",
                    setToServerValue: "REQUEST_TIME",
                  },
                ],
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
            ...HEADERS.FIRESTORE,
          },
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(
        `Claim error: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  async dailyCheckin(
    idToken,
    userId,
    currentUpdateTime,
    currentStreakCount = 0
  ) {
    if (!idToken || !userId || !currentUpdateTime) {
      throw new Error("Required parameters missing for daily check-in");
    }

    try {
      const response = await axios.post(
        `${CONFIG.FIRESTORE_URL}/documents:commit`,
        {
          writes: [
            {
              currentDocument: { updateTime: currentUpdateTime },
              update: {
                name: `projects/${CONFIG.PROJECT_ID}/databases/(default)/documents/users/${userId}`,
                fields: {
                  streakCount: { integerValue: String(currentStreakCount + 1) },
                },
              },
              updateMask: { fieldPaths: ["streakCount"] },
              updateTransforms: [
                {
                  fieldPath: "points",
                  increment: {
                    integerValue: String(CONFIG.POINTS.DAILY_CHECKIN),
                  },
                },
                {
                  fieldPath: "lastCheckin",
                  setToServerValue: "REQUEST_TIME",
                },
                {
                  fieldPath: "taskStats.dailyCheckin",
                  increment: { integerValue: "1" },
                },
              ],
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
            ...HEADERS.FIRESTORE,
          },
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(
        `Daily check-in error: ${
          error.response?.data?.error?.message || error.message
        }`
      );
    }
  }

  isDifferentDay(timestamp) {
    if (!timestamp) return true;

    const lastAction = new Date(timestamp);
    const today = new Date();

    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const lastActionStart = new Date(
      lastAction.getFullYear(),
      lastAction.getMonth(),
      lastAction.getDate()
    );

    return todayStart > lastActionStart;
  }

  canClaimToday(lastClaimTimestamp) {
    return this.isDifferentDay(lastClaimTimestamp);
  }

  canCheckinToday(lastCheckinTimestamp) {
    return this.isDifferentDay(lastCheckinTimestamp);
  }

  formatTime(timestamp) {
    return timestamp ? new Date(timestamp).toLocaleString() : "Never";
  }

  async processAccount(account, index) {
    const { email, password } = account;
    console.log(`\n[${index + 1}] Processing: ${email}`);

    try {
      console.log("   Signing in...");
      const authData = await this.signIn(email, password);

      console.log("   Getting user data...");
      const userData = await this.getUserData(
        authData.idToken,
        authData.localId
      );

      const userFields = userData.fields || {};
      const points = parseInt(userFields.points?.integerValue || "0");
      const lastClaim = userFields.lastClaim?.timestampValue;
      const lastCheckin = userFields.lastCheckin?.timestampValue;
      const streakCount = parseInt(userFields.streakCount?.integerValue || "0");
      const referralCode = userFields.referralCode?.stringValue || "N/A";

      this.displayUserInfo({
        points,
        streakCount,
        referralCode,
        lastClaim,
        lastCheckin,
      });

      let totalPointsEarned = 0;
      const activitiesDone = [];

      if (this.canCheckinToday(lastCheckin)) {
        console.log("   Performing daily check-in...");
        await this.dailyCheckin(
          authData.idToken,
          authData.localId,
          userData.updateTime,
          streakCount
        );
        totalPointsEarned += CONFIG.POINTS.DAILY_CHECKIN;
        activitiesDone.push(`Daily Check-in (+${CONFIG.POINTS.DAILY_CHECKIN})`);

        const updatedData = await this.getUserData(
          authData.idToken,
          authData.localId
        );
        userData.updateTime = updatedData.updateTime;
      } else {
        console.log("   Already checked-in today, skipping...");
      }

      if (this.canClaimToday(lastClaim)) {
        console.log("   Claiming daily points...");
        await this.claimDailyPoints(
          authData.idToken,
          authData.localId,
          userData.updateTime
        );
        totalPointsEarned += CONFIG.POINTS.DAILY_CLAIM;
        activitiesDone.push(`Daily Claim (+${CONFIG.POINTS.DAILY_CLAIM})`);
      } else {
        console.log("   Already claimed today, skipping...");
      }

      if (activitiesDone.length > 0) {
        const finalData = await this.getUserData(
          authData.idToken,
          authData.localId
        );
        const newPoints = parseInt(
          finalData.fields?.points?.integerValue || "0"
        );
        const newStreakCount = parseInt(
          finalData.fields?.streakCount?.integerValue || "0"
        );

        console.log(`   Activities completed: ${activitiesDone.join(", ")}`);
        console.log(
          `   Points: ${points} → ${newPoints} (+${totalPointsEarned})`
        );
        console.log(`   Streak: ${streakCount} → ${newStreakCount}`);

        return {
          success: true,
          claimed: true,
          points: newPoints,
          pointsEarned: totalPointsEarned,
          activities: activitiesDone,
          email,
        };
      }

      console.log("   All daily activities already completed");
      return { success: true, claimed: false, points, email };
    } catch (error) {
      console.log(`   Error: ${error.message}`);
      return { success: false, error: error.message, email };
    }
  }

  displayUserInfo({
    points,
    streakCount,
    referralCode,
    lastClaim,
    lastCheckin,
  }) {
    console.log(`   Current points: ${points}`);
    console.log(`   Streak count: ${streakCount}`);
    console.log(`   Referral code: ${referralCode}`);
    console.log(`   Last claim: ${this.formatTime(lastClaim)}`);
    console.log(`   Last check-in: ${this.formatTime(lastCheckin)}`);
  }

  async run() {
    console.log("🚀 Starting Knovus Auto Claim Daily Points");
    console.log("=".repeat(50));

    if (!this.loadAccounts()) {
      return;
    }

    const results = {
      total: this.accounts.length,
      claimed: 0,
      skipped: 0,
      failed: 0,
    };

    for (let i = 0; i < this.accounts.length; i++) {
      const result = await this.processAccount(this.accounts[i], i);

      if (result.success) {
        if (result.claimed) {
          results.claimed++;
        } else {
          results.skipped++;
        }
      } else {
        results.failed++;
      }

      if (i < this.accounts.length - 1) {
        console.log(
          `   ⏳ Waiting ${CONFIG.DELAYS.BETWEEN_ACCOUNTS / 1000} seconds...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, CONFIG.DELAYS.BETWEEN_ACCOUNTS)
        );
      }
    }

    this.displaySummary(results);
  }

  displaySummary(results) {
    console.log("\n" + "=".repeat(50));
    console.log("📊 SUMMARY");
    console.log(`   Total accounts: ${results.total}`);
    console.log(`   ✅ Successfully claimed: ${results.claimed}`);
    console.log(`   ⏭️  Already claimed today: ${results.skipped}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log("🎉 Auto claim completed!");
  }

  scheduleDaily() {
    console.log("⏰ Scheduling daily auto claim...");

    const runDaily = async () => {
      const now = new Date();
      console.log(`\n🕐 Daily run started at: ${now.toLocaleString()}`);

      try {
        await this.run();
        console.log("✅ Daily run completed");
      } catch (error) {
        console.error("❌ Daily run failed:", error);
      }
    };

    runDaily();
    setInterval(runDaily, 24 * 60 * 60 * 1000);
  }
}

if (require.main === module) {
  const autoClaim = new KnovusAutoClaim();
  autoClaim.scheduleDaily();
}

module.exports = KnovusAutoClaim;
