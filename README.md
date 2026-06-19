# NoteGenie

NoteGenie is a study app I built that turns a PDF, a web article, or a YouTube video into proper study material — notes, flashcards, and quizzes — and lets you chat with an AI tutor about whatever you uploaded. It runs on Google's Gemini API.

The idea came from a simple problem: reading a long PDF and making notes by hand takes forever. So I made something where you drop the file, and a few seconds later you have clean notes, a set of flashcards, and a quiz to test yourself.

Built with React on the front, Express + MongoDB on the back.

## What it can do

- Upload a PDF and get structured notes out of it (Gemini reads the PDF directly).
- Paste a web link or a YouTube URL — it pulls the text/transcript and makes notes from that.
- Auto-generated flashcards you can flip through.
- Quizzes you can configure: pick easy/medium/hard and how many questions (3 to 25). You get a score, the right answers, and an explanation for each.
- An AI tutor chat tied to each document — ask it anything about your material and it answers (responses stream in live). Chat history is saved.
- Analytics page that tracks your quiz scores over time.
- Export your notes as a Markdown file.
- Accounts with login (JWT). Every user only sees their own stuff.
- An admin panel — see all users and content, platform stats, and set the Gemini API key right from the UI instead of touching files.
- Dark mode, and it works on mobile too.

## Tech used

- **Frontend:** React (with Vite), React Router, Tailwind CSS, Axios
- **Backend:** Node.js, Express, JWT for auth, Multer for file uploads, bcrypt for passwords
- **Database:** MongoDB (Mongoose)
- **AI:** Google Gemini (`@google/generative-ai`)
- For links: `youtube-transcript` for YouTube, and a small scraper for web pages

## How a request actually flows

1. You upload a PDF or paste a link.
2. The backend gets the content ready — a PDF goes straight to Gemini, a link gets scraped (or the YouTube transcript gets fetched).
3. Gemini returns notes + flashcards as JSON, which gets saved as a document.
4. From there you can make a quiz, open the tutor chat, or regenerate the notes.
5. Quiz attempts get saved and show up in Analytics.

One thing worth mentioning: the Gemini API key is read from the database first (whatever the admin set in the UI), and only falls back to the `.env` file if nothing is set. So the key can be changed without redeploying.

## Folder layout

```
learning/
├── .env                 # all secrets live here (not committed)
├── .env.example         # copy this to .env and fill it in
├── package.json         # runs client + server together
├── server/              # the Express API
│   └── src/
│       ├── index.js     # server entry point
│       ├── config/      # env + database connection
│       ├── models/      # User, Document, Quiz, QuizAttempt, ChatMessage, Settings
│       ├── routes/      # auth, documents, quiz, tutor, admin
│       ├── controllers/ # the actual logic for each route
│       ├── services/    # gemini.js (AI calls), linkExtractor.js
│       ├── middleware/  # auth checks, file upload, error handling
│       └── scripts/     # seedData.js (admin + demo user + sample content)
└── client/              # the React app
    └── src/
        ├── main.jsx     # app entry, wraps all the context providers
        ├── App.jsx      # routes
        ├── api/         # axios setup (attaches the login token)
        ├── context/     # auth, theme, toasts, confirm dialog
        ├── components/  # shared UI pieces
        └── pages/       # every screen (login, dashboard, quiz, admin, etc.)
```

## Running it locally

You'll need Node 18+, a MongoDB database (I used a free MongoDB Atlas cluster), and a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

**1. Install everything**

```bash
npm run install:all
```

This installs the server and client dependencies (they're separate).

**2. Set up your environment**

Copy the example file and fill in your own values:

```bash
cp .env.example .env
```

Then open `.env` and put in your MongoDB URI, a JWT secret (any long random string), and your Gemini key. Everything is explained in the file.

**3. Create the login accounts**

From the project root:

```bash
npm run seed
```

This creates an admin and a demo user using the credentials from `.env`:

- Admin — `admin@notegenie.local` / `admin123456` (email verified)
- Demo user — from `USER_EMAIL` / `USER_PASSWORD` in `.env`

**4. Start it**

From the project root:

```bash
npm run dev
```

**Windows:** Double-click [`start-dev.bat`](start-dev.bat) in the project folder (keeps the CMD window open if something fails). Do not close that window while using the app.

This runs `dev.mjs`, which starts both the API and the React app together using the ports from your `.env` (`PORT` for the API, `CLIENT_PORT` for the app — `5001` and `3000` in the example). If a port is busy, it automatically picks the next free one and prints the real URLs in the terminal — open the frontend URL it shows (e.g. **http://localhost:3000**).

## The .env file

Everything goes in a single `.env` at the project root. Here's what each line is for:

| Key | What it's for |
|---|---|
| `NODE_ENV` | `development` locally; set to `production` when deploying (enables stricter checks). |
| `PORT` | Port the API runs on (5001 in the example). |
| `CLIENT_PORT` | Port the React dev server runs on (3000 in the example). |
| `CLIENT_URL` | Allowed frontend origin(s) for CORS — comma-separate multiple. |
| `MONGO_URI` | Your MongoDB connection string. |
| `JWT_SECRET` | Secret used to sign login tokens — make it long and random. |
| `JWT_EXPIRES_IN` | How long a login lasts (7d). |
| `GEMINI_API_KEY` | Your Gemini key (used if the admin hasn't set one in the UI). |
| `GEMINI_MODEL` | Which Gemini model to use (gemini-2.5-flash). |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | The admin account the seed script makes. |
| `USER_EMAIL` / `USER_PASSWORD` / `USER_NAME` | The demo user the seed script makes. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay test/live keys for paid plans. |
| `RAZORPAY_PRO_AMOUNT` / `RAZORPAY_TEAM_AMOUNT` | Default prices in **paise** (74900 = ₹749). Admin can override in **Admin → Billing**. |
| `SUPPORT_EMAIL` | Shown on the Pricing page for help contact. |
| `SMTP_*` / `SMTP_FROM` | Email OTP verification and password reset. |

The `.env` is git-ignored, so your keys never get pushed. Only `.env.example` (the blank template) is in the repo.

## Razorpay test payments

Use **test keys** only (`rzp_test_...`) in `.env`. Real cards do not work in test mode.

### UPI (easiest)

1. At checkout, choose **UPI**.
2. Enter `success@razorpay` for a successful payment, or `failure@razorpay` to simulate failure.

### Domestic cards (India)

Use only these in test mode if your Razorpay account does not support international cards:

| Network | Type | Card number |
|---------|------|-------------|
| Mastercard | Domestic | `5267 3181 8797 5449` |
| Visa | Domestic | `4111 1111 1111 1111` |

- Expiry: any future date (e.g. `12/30`)
- CVV: any 3 digits (e.g. `123`)
- On the mock bank page, click **Success**

### Netbanking

Pick any bank → Razorpay shows a mock page → click **Success**.

### Do not use (international test cards)

These often fail with *"International cards are not supported"* on India-only accounts:

- `4012 8888 8888 1881`
- `5104 0600 0000 0008`
- `5555 5555 5555 4444`

Official docs: [Razorpay test integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/test-integration/)

## The main API routes

Auth:
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `PUT /api/auth/profile`, `PUT /api/auth/password`

Documents:
- `POST /api/documents/upload` (PDF), `POST /api/documents/link` (web/YouTube)
- `GET /api/documents`, `GET /api/documents/:id`
- `POST /api/documents/:id/regenerate`, `DELETE /api/documents/:id`

Quizzes:
- `POST /api/quiz/document/:documentId` (generate)
- `GET /api/quiz/:id`, `POST /api/quiz/:id/submit`
- `GET /api/quiz/analytics/overview`

Tutor:
- `POST /api/tutor/:documentId` (chat), `GET /api/tutor/:documentId/history`

Admin (admin role only):
- `GET /api/admin/stats`, `GET /api/admin/users`, `DELETE /api/admin/users/:id`
- `GET/PUT /api/admin/settings`, `POST /api/admin/settings/test`, `GET /api/admin/models`
- `GET /api/admin/documents`, `DELETE /api/admin/documents/:id`
- `GET /api/admin/usage`, `DELETE /api/admin/usage` (AI usage stats + reset)

## A few notes

- Passwords are hashed with bcrypt, and the API uses JWT for sessions.
- The Gemini key stays on the server — the admin UI only ever shows a masked version of it.
- Security headers (helmet), a CORS allowlist, and rate limiting are on by default. Login/register get a stricter limit than the rest of the API.
- Link imports are checked to block private/internal addresses (basic SSRF protection).
- To use the admin panel you have to log in with the admin account. A normal account won't see it (that's on purpose).

## If something breaks

**Port already in use** — `dev.mjs` will normally pick the next free port automatically. If you'd rather free up the one you want, find and kill whatever is using it (replace `5001` with your `PORT`):

```powershell
netstat -ano | findstr ":5001"
taskkill /PID <PID> /F
```

**MongoDB won't connect** — usually it's the IP whitelist. In MongoDB Atlas go to Network Access and add your current IP (or `0.0.0.0/0` while developing). If a `mongodb+srv://` URI won't resolve, use the direct connection string instead.

**Gemini says the model wasn't found** — the model name might not be available for your key. Change `GEMINI_MODEL` in `.env` (or in the admin Settings page) and use the Test button there to check the key.

**Admin panel is empty** — make sure you logged in with the admin account, not a regular one.
