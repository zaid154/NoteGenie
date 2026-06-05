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
│       └── scripts/     # seedAdmin.js (creates the first accounts)
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

```bash
cd server
npm run seed:admin
```

This creates an admin and a demo user using the credentials from `.env`:

- Admin — `admin@notegenie.local` / `admin123456`
- User — `user@notegenie.local` / `user123456`

**4. Start it**

From the project root:

```bash
npm run dev
```

That starts both the API (port 5000) and the React app (port 5173) at the same time. Open **http://localhost:5173** in your browser.

## The .env file

Everything goes in a single `.env` at the project root. Here's what each line is for:

| Key | What it's for |
|---|---|
| `PORT` | Port the API runs on (5000). |
| `CLIENT_URL` | The frontend URL, used for CORS. |
| `MONGO_URI` | Your MongoDB connection string. |
| `JWT_SECRET` | Secret used to sign login tokens — make it long and random. |
| `JWT_EXPIRES_IN` | How long a login lasts (7d). |
| `GEMINI_API_KEY` | Your Gemini key (used if the admin hasn't set one in the UI). |
| `GEMINI_MODEL` | Which Gemini model to use (gemini-2.5-flash). |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | The admin account the seed script makes. |
| `USER_EMAIL` / `USER_PASSWORD` / `USER_NAME` | The demo user the seed script makes. |

The `.env` is git-ignored, so your keys never get pushed. Only `.env.example` (the blank template) is in the repo.

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

## A few notes

- Passwords are hashed with bcrypt, and the API uses JWT for sessions.
- The Gemini key stays on the server — the admin UI only ever shows a masked version of it.
- There's basic rate limiting on the API so the AI endpoints don't get hammered.
- To use the admin panel you have to log in with the admin account. A normal account won't see it (that's on purpose).

## If something breaks

**Port 5000 already in use** — an old server is still running. Find and kill it:

```powershell
netstat -ano | findstr ":5000"
taskkill /PID <PID> /F
```

**MongoDB won't connect** — usually it's the IP whitelist. In MongoDB Atlas go to Network Access and add your current IP (or `0.0.0.0/0` while developing). If a `mongodb+srv://` URI won't resolve, use the direct connection string instead.

**Gemini says the model wasn't found** — the model name might not be available for your key. Change `GEMINI_MODEL` in `.env` (or in the admin Settings page) and use the Test button there to check the key.

**Admin panel is empty** — make sure you logged in with the admin account, not a regular one.
