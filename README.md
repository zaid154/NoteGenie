# NoteGenie

NoteGenie is a study app that turns a PDF, a web article, or a YouTube video into structured study material — notes, flashcards, and quizzes — and lets you chat with an AI tutor about whatever you uploaded. It runs on Google's Gemini API.

The idea came from a simple problem: reading a long PDF and making notes by hand takes forever. So I built something where you drop the file, and a few seconds later you have clean notes, flashcards, and a quiz to test yourself.

Built with React on the front, Express + MongoDB on the back.

## What it can do

- Upload a PDF and get structured notes (Gemini reads the PDF directly), now with **key takeaways** and an auto-built **glossary**.
- Paste a web link or a YouTube URL — it pulls the text/transcript and generates notes from that.
- **Output language** — choose the language for notes, flashcards, quizzes, and tutor replies (**English** by default). Source can be Hindi or anything else; output follows your selection.
- Auto-generated flashcards with spaced-repetition review.
- Quizzes: pick easy/medium/hard and question count (3–25). Score, correct answers, and explanations included.
- AI tutor chat per document — streaming responses, history saved in the database.
- **Ask across all notes** — a cross-document tutor that retrieves from your most relevant materials and answers in one place.
- **Mind map view** — an interactive node graph of any document, built from its note sections.
- **Audio "Listen" mode** — text-to-speech playback of notes and hands-free flashcard review (browser speech engine, no API cost).
- **Study streaks & daily goal** — a consecutive-day streak, daily goal, and a 30-day activity heatmap on the dashboard and analytics.
- **⌘K command palette** — jump to any page or search your materials from anywhere.
- Analytics for quiz scores over time.
- Export notes as Markdown or PDF; flashcards as Anki CSV.
- Folders and tags on documents.
- Share links for read-only document viewing.
- Accounts with JWT login. Each user only sees their own data.
- **Admin panel** — users, content, billing, AI key pool, usage stats, audit log, rate limits.
- **Billing** — Free / Pro / Team plans via Razorpay (test mode supported).
- Dark mode and mobile-friendly layout.

## Tech used

- **Frontend:** React (Vite), React Router, Tailwind CSS, Axios, Framer Motion; lazy-loaded routes for a small initial bundle
- **Backend:** Node.js, Express, JWT, Multer, bcrypt
- **Database:** MongoDB (Mongoose)
- **AI:** Google Gemini (`@google/genai`) with a multi-key pool, automatic failover, and model fallback
- **Audio:** Web Speech API (browser-native text-to-speech) — no extra service
- **Links:** `youtube-transcript` for YouTube, fetch + HTML strip for web pages
- **Payments:** Razorpay (Stripe legacy optional)
- **Tooling:** ESLint + Prettier, GitHub Actions CI (lint, test, build), optional Sentry error tracking

## How a request actually flows

1. You upload a PDF or paste a link and pick an **output language** (default English).
2. The backend prepares content — PDF goes to Gemini; links get scraped or YouTube transcript is fetched.
3. Gemini generates **notes first** (with key takeaways + glossary), then **flashcards** (one request at a time to reduce rate-limit pressure). Large sources use a chunked outline → per-section pipeline.
4. Results are saved as a document with `outputLanguage` stored for quiz/tutor/regenerate.
5. From there you can generate a quiz, open the tutor, view the mind map, listen to the notes, or regenerate in a different language.

### AI key pool

Gemini keys can live in two places:

1. **Admin UI** — encrypted in MongoDB (primary for production).
2. **`.env`** — `GEMINI_API_KEY` and/or comma-separated `GEMINI_API_KEYS` as fallback.

On each AI call the server tries keys in priority order. If one fails (invalid key, quota, transient error), it **automatically fails over** to the next key. Bad admin-pool keys get a short cooldown so working keys are used on the next request.

**Tip:** Multiple keys from the **same Google Cloud project** share the same free-tier daily quota. Extra keys only help if they are from different projects/accounts.

## Folder layout

```
NoteGenie/
├── .env                 # all secrets (not committed)
├── .env.example         # copy to .env and fill in
├── .prettierrc.json     # shared formatting config
├── .github/workflows/   # CI: lint + test + build
├── package.json         # runs client + server together
├── dev.mjs              # starts API + Vite together
├── server/
│   ├── eslint.config.js
│   └── src/
│       ├── index.js
│       ├── config/      # env, plans, languages, observability (Sentry + req logging)
│       ├── models/      # User, Document, Quiz, ChatMessage, StudyActivity, Settings, …
│       ├── routes/
│       ├── controllers/
│       ├── services/    # gemini.js, retrieval.js, studyStreak.js, linkExtractor.js, …
│       ├── middleware/
│       └── scripts/     # seedData.js
└── client/
    ├── eslint.config.js
    └── src/
        ├── pages/       # Upload, DocumentView, Ask, admin, billing, …
        ├── components/  # MindMap, AudioPlayer, CommandPalette, ui, …
        ├── hooks/       # useSpeech (text-to-speech)
        ├── config/      # languages.js
        └── api/
```

## Running it locally

You need Node 18+, MongoDB (e.g. free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster), and a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

**1. Install dependencies**

```bash
npm run install:all
```

**2. Environment**

```bash
cp .env.example .env
```

Fill in MongoDB URI, a long random `JWT_SECRET`, `ENCRYPTION_SECRET`, and at least one `GEMINI_API_KEY`. See the table below.

Generate secrets (optional):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**3. Seed accounts**

```bash
npm run seed
```

Uses credentials from `.env` (see `.env.example` for defaults). README examples:

- Admin — values from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- Demo user — values from `USER_EMAIL` / `USER_PASSWORD`

**4. Start**

```bash
npm run dev
```

**Windows:** double-click [`start-dev.bat`](start-dev.bat).

`dev.mjs` starts the API and Vite using `PORT` and `CLIENT_PORT` from `.env` (e.g. **5001** and **3000**). If a port is busy, the next free port is picked — check the terminal for the real URLs.

**Lint & format** (each workspace has its own config):

```bash
npm run lint              # lints server + client
npm run lint --prefix server
npm run format --prefix client   # Prettier write
```

CI (`.github/workflows/ci.yml`) runs lint, server tests, and the client build on every push/PR.

## The .env file

| Key | What it's for |
|---|---|
| `NODE_ENV` | `development` locally; `production` when deploying. |
| `PORT` | API port (e.g. 5001). |
| `CLIENT_PORT` | Vite dev port (e.g. 3000). |
| `CLIENT_URL` | CORS allowed origin(s) — comma-separate multiple. |
| `MONGO_URI` | MongoDB connection string. |
| `JWT_SECRET` | Signs login tokens — use a long random value (32+ chars). |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`). |
| `GEMINI_API_KEY` | Primary Gemini key (env fallback). |
| `GEMINI_API_KEYS` | Optional comma-separated extra keys (same pool). |
| `GEMINI_MODEL` | Default model (e.g. `gemini-2.5-flash`). Overridable in Admin → AI keys. |
| `ENCRYPTION_SECRET` | Encrypts API keys stored in the admin pool. **Set once and keep stable** — changing it makes saved keys unreadable until re-added. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Seed admin account. |
| `USER_EMAIL` / `USER_PASSWORD` / `USER_NAME` | Seed demo user. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay test/live keys. |
| `RAZORPAY_PRO_AMOUNT` / `RAZORPAY_TEAM_AMOUNT` | Default prices in **paise** (74900 = ₹749). |
| `SUPPORT_EMAIL` | Contact on Pricing page. |
| `SMTP_*` / `EMAIL_FROM` | Email verification and password reset. |
| `AI_RATE_LIMIT_MAX` / `AI_RATE_LIMIT_WINDOW_MIN` | Default AI rate limits (overridable in admin). |
| `SENTRY_DSN` | Optional server error tracking. Activates only if set **and** `@sentry/node` is installed (`npm i @sentry/node`); otherwise it's a no-op. Requests are always logged with timing regardless. |

The `.env` is git-ignored. Do not commit secrets. Prefer keeping the repo **outside** cloud-sync folders (OneDrive, etc.) so `.env` is not synced.

## Admin panel

Log in with the admin account, then open **System** in the sidebar.

| Section | Purpose |
|---|---|
| **AI keys** | Key pool, model picker, test all keys (shows masked suffix + pass/fail), usage pricing |
| **Audit log** | Admin actions history |
| **Rate limits** | Per-user AI generation caps |

Other admin areas: Dashboard stats, Users, Content, Billing (plan prices), Usage (cost by key/feature).

## Output languages

Supported on upload: English (default), Hindi, Urdu, Arabic, Spanish, French, German, Portuguese, Bengali, Tamil, Telugu, Marathi.

On an existing document, change the language dropdown and click **Regenerate** to rebuild notes and flashcards in that language. Quiz and tutor use the document's language (or the dropdown selection before generate).

## Razorpay test payments

Use **test keys** only (`rzp_test_...`) in `.env`.

### UPI

1. Choose **UPI** at checkout.
2. Use `success@razorpay` to simulate success, or `failure@razorpay` for failure.

### Domestic cards (India)

| Network | Card number |
|---------|-------------|
| Mastercard | `5267 3181 8797 5449` |
| Visa | `4111 1111 1111 1111` |

Expiry: any future date · CVV: any 3 digits · Confirm **Success** on the mock bank page.

Docs: [Razorpay test integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/test-integration/)

## Main API routes

**Auth:** `POST /api/auth/register`, `login`, `GET /api/auth/me`, profile/password updates, email verify, forgot/reset password

**Documents:** `POST /api/documents/upload`, `POST /api/documents/link` (body: `url`, `outputLanguage`, `folder`, `tags`), `GET /api/documents`, `GET /api/documents/:id`, `POST /api/documents/:id/regenerate`, `DELETE /api/documents/:id`, flashcard rate/generate, `GET /api/documents/review/due`

**Quizzes:** `POST /api/quiz/document/:documentId`, `GET /api/quiz/:id`, `POST /api/quiz/:id/submit`, `GET /api/quiz/analytics/overview` (scores + **streak**, daily goal, 30-day activity)

**Tutor:** `POST /api/tutor/:documentId` (stream), `GET /api/tutor/:documentId/history`, **`POST /api/tutor/global`** (cross-document, stream), `GET`/`DELETE /api/tutor/global/history`

**Admin:** stats, users, documents, settings, `POST /api/admin/settings/test`, `POST /api/admin/settings/test-all`, key CRUD, models list, usage, audit log, billing

## Security notes

- Passwords hashed with bcrypt; JWT for sessions.
- Gemini keys encrypted at rest when stored via admin UI (`ENCRYPTION_SECRET`).
- Admin UI only shows masked keys (e.g. `AIza••••xYz9`).
- Helmet, CORS allowlist, rate limits (stricter on auth and AI routes).
- SSRF protection on link imports; PDF magic-byte check.
- Tutor history loaded from DB (not client-supplied).

## If something breaks

**Port in use** — `dev.mjs` auto-picks the next port, or free the port manually:

```powershell
netstat -ano | findstr ":5001"
taskkill /PID <PID> /F
```

**MongoDB won't connect** — Atlas → Network Access → add your IP (or `0.0.0.0/0` for local dev only).

**Gemini model not found** — change model in Admin → AI keys or `GEMINI_MODEL` in `.env`, then use **Test key**.

**429 / quota exceeded** — Free tier is ~20 requests/day per model. Wait for daily reset, switch to `gemini-2.0-flash`, enable billing at [ai.google.dev](https://ai.google.dev), or reduce **Test all keys** / upload frequency.

**Admin keys not showing / "Something went wrong"** — `ENCRYPTION_SECRET` may have changed. Delete unreadable keys in Admin → AI keys and re-add them, or restore the original secret.

**YouTube link fails** — Use a real public video URL with captions. Placeholder URLs like `watch?v=example` will not work.

**Upload works in test but generate fails** — Check server logs for `[gemini] key … failed`. Failover should try env keys next; if all keys share one project's quota, all will fail until reset.

**Admin panel empty** — Log in with the admin account, not the demo user.

## Tests

From `server/`:

```bash
npm test
```

Runs unit tests (Node's built-in test runner) for plans, spaced repetition, Gemini error/failover/model-fallback helpers, cross-document retrieval, and study-streak logic.
