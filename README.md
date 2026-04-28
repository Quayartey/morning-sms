# 🌅 Morning Motivation SMS

Automatically sends your girlfriend a motivational SMS every morning via Africa's Talking.
Runs 24/7 on Railway — no laptop needed, no window to keep open.

---

## Deploy to Railway (free, one-time setup)

### Step 1 — Push this project to GitHub
1. Create a free account at https://github.com
2. Create a new repository called `morning-sms`
3. Upload these files: `server.js`, `dashboard.html`, `package.json`, `.gitignore`

### Step 2 — Deploy on Railway
1. Sign up at https://railway.app using your GitHub account
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `morning-sms` repository
4. Railway will detect Node.js and deploy automatically

### Step 3 — Set environment variables in Railway
In your Railway project → service → Variables tab, add:

| Variable | Value |
|---|---|
| `AT_USERNAME` | Your Africa's Talking live app name |
| `AT_API_KEY` | Your live API key |
| `HER_NAME` | Her first name (e.g. Ama) |
| `HER_PHONE` | Her Ghana number (e.g. +233244123456) |
| `SEND_TIME` | Time to send daily (e.g. 07:00) |
| `SEND_DAYS` | `every` or `weekdays` or `weekdays+sat` |
| `ROTATION` | `sequential` or `random` |

### Step 4 — Open your dashboard
Railway gives you a public URL (e.g. `https://morning-sms-xxx.railway.app`).
Open it in your browser — add your quotes, send a test, confirm she gets it. Done! 🎉

---

## Africa's Talking Live Account
- Sign up at https://account.africastalking.com
- Create a Team → Create an App (select Ghana)
- Settings → API Key → Generate (copy it immediately!)
- Top up your wallet — GHS 5 gives you hundreds of SMS messages

---

## Notes
- The server runs forever on Railway's free tier
- Quotes are stored in `quotes.json` and survive restarts
- Logs are kept for the last 200 messages
- To change send time or her number, just update the Railway environment variables
