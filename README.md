# Knovus Auto Claim Daily Points

An automated script to claim daily points and perform daily check-ins on the Knovus platform. This script helps you maximize your daily rewards by automatically handling both daily check-ins (+10 points) and daily claims (+200 points) for multiple accounts.

## Features

- **Automated Daily Activities**: Performs both daily check-in and daily claim
- **Multi-Account Support**: Handles multiple accounts from a single file
- **Smart Detection**: Only performs activities if not already done today
- **Progress Tracking**: Shows detailed progress for each account
- **Error Handling**: Robust error handling with informative messages
- **Daily Scheduling**: Optional automatic daily execution
- **Points Tracking**: Displays before/after points and streak counts

## Prerequisites

- Node.js (version 12 or higher)
- npm (Node Package Manager)

## Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

## Setup

1. Create a `data.txt` file in the same directory as the script
2. Add your account credentials in the format `email:password` (one per line):

```txt
your-email1@gmail.com:your-password1
your-email2@gmail.com:your-password2
another-email@gmail.com:another-password
```

## Usage

### Run Once

To run the script once for all accounts:

```bash
node main.js
```

### Daily Scheduling

The script is configured by default to run automatically every 24 hours. It will:

- Execute immediately when started
- Schedule subsequent runs every 24 hours

## How It Works

For each account, the script will:

1. **Sign In** - Authenticate with Firebase
2. **Get User Data** - Retrieve current points, streak, and last activity timestamps
3. **Daily Check-in** - If not done today, perform check-in (+10 points, +1 streak)
4. **Daily Claim** - If not done today, claim daily reward (+200 points)
5. **Verify Results** - Display updated points and streak count

## Sample Output

```
🚀 Starting Knovus Auto Claim Daily Points
==================================================
📋 Loaded 2 accounts

[1] Processing: user@gmail.com
   Signing in...
   Getting user data...
   Current points: 450
   Streak count: 5
   Referral code: ABC123
   Last claim: 9/21/2025, 4:30:39 PM
   Last check-in: 9/21/2025, 4:36:18 PM
   Performing daily check-in...
   Claiming daily points...
   Activities completed: Daily Check-in (+10), Daily Claim (+200)
   Points: 450 → 660 (+210)
   Streak: 5 → 6
   ⏳ Waiting 2 seconds...

[2] Processing: user2@gmail.com
   ...

==================================================
📊 SUMMARY
   Total accounts: 2
   ✅ Successfully claimed: 2
   ⏭️  Already claimed today: 0
   ❌ Failed: 0
🎉 Auto claim completed!
```

## Configuration

You can modify the configuration at the top of `main.js`:

```javascript
const CONFIG = {
  POINTS: {
    DAILY_CLAIM: 200, // Points from daily claim
    DAILY_CHECKIN: 10, // Points from daily check-in
  },
  DELAYS: {
    BETWEEN_ACCOUNTS: 2000, // Delay between accounts (ms)
  },
};
```

## Registration

If you don't have a Knovus account yet, you can register here:
**[Register on Knovus](https://knovus.xyz/index.html?ref=R9A9R3)**

## Security Notes

- Keep your `data.txt` file secure and never share it
- Use strong, unique passwords for your accounts
- The script includes delays between accounts to avoid rate limiting
- All API calls use the same endpoints as the official web application

## Troubleshooting

### Common Issues

1. **"File data.txt not found"**

   - Create the `data.txt` file with your account credentials

2. **"Login error: INVALID_PASSWORD"**

   - Check your email and password in `data.txt`
   - Ensure credentials are in the correct format `email:password`

3. **"Already claimed/checked-in today"**

   - This is normal behavior - the script only claims once per day

4. **Network errors**
   - Check your internet connection
   - The script will retry on temporary network issues

### Debug Mode

For more detailed logging, you can modify the script to include additional console.log statements in the error handling sections.

## Daily Activities Breakdown

| Activity           | Points   | Frequency    | Requirements        |
| ------------------ | -------- | ------------ | ------------------- |
| Daily Check-in     | +10      | Once per day | Active account      |
| Daily Claim        | +200     | Once per day | Active account      |
| **Total Possible** | **+210** | **Per day**  | **Both activities** |

## API Endpoints Used

The script interacts with the following Knovus API endpoints:

- Firebase Authentication for login
- Firestore Database for user data and updates
- Uses official API keys and follows the same request patterns as the web app

## License

This project is for educational purposes. Use responsibly and in accordance with Knovus terms of service.

## Disclaimer

This tool is provided as-is. Users are responsible for complying with Knovus's terms of service. The authors are not responsible for any account issues that may arise from using this script.

---

**Happy farming! 🌟**
