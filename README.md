# NoteGenie — AI Study Assistant

Turn any **PDF, web article, or YouTube video** into **AI-generated notes, quizzes, and flashcards**, and chat with an **AI tutor** about your material — powered by Google's **Gemini API**.

> A full-stack MERN-style project built with **React + Node/Express + MongoDB + Gemini**.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
- [Admin Panel](#admin-panel)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

**Study material generation**
- **PDF → Notes** — upload a PDF and get clean, structured notes. Gemini reads the PDF directly (multimodal input).
- **Link → Notes** — paste a web article or YouTube URL; the text/transcript is extracted and turned into notes.
- **Flashcards** — auto-generated flip-to-reveal cards for active recall.
- **Quizzes** — multiple-choice quizzes with a configurable number of questions (3–25) and three difficulty levels (easy / medium / hard), instant scoring, correct answers, and explanations.
- **Regenerate** — re-run notes and flashcards on any document if you want a fresh take.
- **Export** — download your notes as a Markdown file.

**Learning tools**
- **AI Tutor Chat** — ask questions about a specific document; responses **stream in real time** and the full chat history is saved per document.
- **Analytics** — track your quiz attempts, scores, and averages over time.

**Accounts & access**
- **JWT authentication** — every user has their own private library.
- **Profile** — update your name and change your password.
- **Admin panel** — role-based; manage users and content, view platform stats, and set the Gemini API key from the UI.

**UI / UX**
- Clean custom design system (Tailwind CSS, Inter + Sora fonts) — not a generic template look.
- **Dark mode** and fully responsive layout.
- Toast notifications, inline form validation, password strength meter, and custom confirmation dialogs.
- A dedicated **landing page** for logged-out visitors.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 (Vite), React Router, Tailwind CSS, Axios, React Markdown |
| **Backend** | Node.js, Express, JWT (`jsonwebtoken`), bcryptjs, Multer, express-rate-limit |
| **Database** | MongoDB with Mongoose |
| **AI** | Google Gemini (`@google/generative-ai`) — multimodal PDF input, structured JSON output, streaming responses |
| **Content extraction** | `youtube-transcript` for YouTube, custom fetch-based extractor for web pages |

---

## How It Works

1. A user uploads a **PDF** or pastes a **web/YouTube link**.
2. The backend extracts the content:
   - **PDF** → sent directly to Gemini as multimodal input.
   - **Link** → web text is scraped, or the YouTube transcript is fetched.
3. Gemini generates **structured JSON** containing notes and flashcards, which is saved as a `Document`.
4. From a document the user can generate a **Quiz** (Gemini returns MCQs with answers + explanations), chat with the **AI Tutor** (streamed), or **regenerate** the content.
5. Quiz submissions are stored as `QuizAttempt`s and surfaced in **Analytics**.
6. The active Gemini API key/model is resolved from the **database settings first**, falling back to environment variables — so an admin can rotate the key from the UI without redeploying.

---

## Project Structure

```
learning/
├── package.json            # root scripts (run client + server together)
├── README.md
├── server/                 # Express API
│   ├── .env                # secrets (git-ignored)
│   ├── .env.example
│   └── src/
│       ├── index.js        # app entry: middleware, routes, startup
│       ├── config/         # env.js, db.js (Mongo connection + retry)
│       ├── models/         # User, Document, Quiz, QuizAttempt, ChatMessage, Settings
│       ├── routes/         # auth, documents, quiz, tutor, admin
│       ├── controllers/    # request handlers per resource
│       ├── services/       # gemini.js, linkExtractor.js
│       ├── middleware/      # auth (JWT + admin), upload (Multer), errorHandler
│       └── scripts/        # seedAdmin.js
└── client/                 # React app (Vite + Tailwind)
    └── src/
        ├── main.jsx        # providers (Theme, Auth, Toast, Confirm)
        ├── App.jsx         # routes + route guards
        ├── api/            # axios instance with JWT interceptor
        ├── context/        # Auth, Theme, Toast, Confirm
        ├── components/     # Layout, AdminLayout, TutorChat, Flashcards,
        │                   #   FormField, AuthShell, ui, icons, Logo
        └── pages/          # Landing, Login, Register, Dashboard, Upload,
            └── admin/      #   DocumentView, QuizView, Analytics, Profile
                            # admin/: Overview, Users, Settings, Content
```

---

## Getting Started

### 1. Prerequisites
- **Node.js 18+**
- A free **MongoDB Atlas** cluster — [create one here](https://www.mongodb.com/atlas)
- A **Gemini API key** — [Google AI Studio](https://aistudio.google.com/app/apikey)

### 2. Install dependencies
From the project root:
```bash
npm install            # installs root dev deps (concurrently)
npm run install:all    # installs both server and client deps
```

### 3. Configure the backend
Copy the example env file and fill in your values:
```bash
cd server
cp .env.example .env
```
See [Environment Variables](#environment-variables) for what each value means.

### 4. Create the admin account
With `ADMIN_EMAIL` and `ADMIN_PASSWORD` set in `server/.env`:
```bash
cd server
npm run seed:admin
```

### 5. Run the app
From the project root (runs API + client together):
```bash
npm run dev
```
- Client: **http://localhost:5173**
- API: **http://localhost:5000**

The Vite dev server proxies `/api` requests to the backend automatically.

### 6. First steps
1. Open **http://localhost:5173** and register, or log in as the admin.
2. (Optional) Go to **Admin → Settings** and paste your Gemini API key to manage it from the UI.
3. Click **New Material**, upload a PDF or paste a link, and generate your first notes.

---

## Environment Variables

Defined in `server/.env` (see `server/.env.example`):

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | API port (default `5000`). |
| `CLIENT_URL` | No | Allowed CORS origin (default `http://localhost:5173`). |
| `MONGO_URI` | **Yes** | MongoDB connection string. |
| `JWT_SECRET` | **Yes** | Secret used to sign JWTs — use a long random string. |
| `JWT_EXPIRES_IN` | No | Token lifetime (default `7d`). |
| `GEMINI_API_KEY` | **Yes** | Gemini API key (fallback if no key is set in the admin UI). |
| `GEMINI_MODEL` | No | Gemini model name (default `gemini-2.5-flash`). |
| `ADMIN_EMAIL` | For seeding | Email for the seeded admin account. |
| `ADMIN_PASSWORD` | For seeding | Password for the seeded admin account. |
| `ADMIN_NAME` | No | Display name for the admin account. |

> The Gemini key/model saved through the admin panel is stored in the database and **takes priority** over the `.env` values.

---

## Available Scripts

**Root** (`learning/`)
| Script | Description |
|---|---|
| `npm run install:all` | Install server + client dependencies. |
| `npm run dev` | Run server and client together (via `concurrently`). |
| `npm run server` | Run only the backend dev server. |
| `npm run client` | Run only the frontend dev server. |

**Server** (`server/`)
| Script | Description |
|---|---|
| `npm run dev` | Start API with nodemon (auto-reload). |
| `npm start` | Start API with node. |
| `npm run seed:admin` | Create/update the admin user from `.env`. |

**Client** (`client/`)
| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server. |
| `npm run build` | Production build. |
| `npm run preview` | Preview the production build. |

---

## API Reference

All `/api` routes are rate-limited (100 requests / 15 min per IP). Protected routes require an `Authorization: Bearer <token>` header.

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create an account |
| POST | `/api/auth/login` | — | Log in, returns JWT + user |
| GET | `/api/auth/me` | User | Get the current user |
| PUT | `/api/auth/profile` | User | Update name |
| PUT | `/api/auth/password` | User | Change password |

### Documents
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/documents/upload` | User | Upload a PDF → notes + flashcards |
| POST | `/api/documents/link` | User | Web/YouTube link → notes + flashcards |
| GET | `/api/documents` | User | List the user's documents |
| GET | `/api/documents/:id` | User | Get one document |
| POST | `/api/documents/:id/regenerate` | User | Regenerate notes + flashcards |
| DELETE | `/api/documents/:id` | User | Delete a document (and its quizzes/chats) |

### Quizzes
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/quiz/document/:documentId` | User | Generate a quiz (`difficulty`, `count`) |
| GET | `/api/quiz/:id` | User | Get a quiz (without answers) |
| POST | `/api/quiz/:id/submit` | User | Submit answers → score + review |
| GET | `/api/quiz/analytics/overview` | User | Quiz analytics summary |

### Tutor
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/tutor/:documentId` | User | Streaming AI tutor chat |
| GET | `/api/tutor/:documentId/history` | User | Chat history for a document |

### Admin (requires `admin` role)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/stats` | Platform stats + recent activity |
| GET | `/api/admin/users` | List all users |
| DELETE | `/api/admin/users/:id` | Delete a user and all their data |
| GET | `/api/admin/settings` | Get Gemini settings (key masked) |
| PUT | `/api/admin/settings` | Save Gemini API key + model |
| POST | `/api/admin/settings/test` | Test an API key |
| GET | `/api/admin/models` | List available Gemini models |
| GET | `/api/admin/documents` | List all documents |
| DELETE | `/api/admin/documents/:id` | Delete any document |

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |

---

## Admin Panel

Log in with the seeded admin credentials to access **/admin**:

- **Overview** — total users, materials, quizzes, and attempts, plus recent activity.
- **Users** — view every account and delete users (and all their data).
- **Settings** — paste/rotate the Gemini API key and pick a model. Saved values override `.env`.
- **Content** — browse and remove any document on the platform.

---

## Security

- `server/.env` is **git-ignored** — never commit API keys or secrets.
- Passwords are hashed with **bcrypt**; sessions use **JWT**.
- The Gemini key stays **server-side**; the client never receives it (the admin UI only shows a masked value).
- Admin routes are protected by a dedicated `requireAdmin` middleware.
- Basic **rate limiting** guards the API against abuse of the (paid) AI endpoints.

---

## Troubleshooting

**`EADDRINUSE: address already in use :::5000`**
An old server process is still running. Find and kill it:
```powershell
netstat -ano | findstr ":5000"
taskkill /PID <PID> /F
```

**MongoDB connection fails / `querySrv ECONNREFUSED`**
- If a `mongodb+srv://` URI can't resolve, use the direct (non-SRV) connection string with explicit shard hosts.
- In MongoDB Atlas → **Network Access**, make sure your current IP is whitelisted (or use `0.0.0.0/0` for development).

**Gemini error: model not found (404)**
The model name may be unavailable for your key. Update `GEMINI_MODEL` (e.g. `gemini-2.5-flash`) in `.env` or the admin Settings, and use **Admin → Settings → Test** to verify the key.

**Admin data not showing**
Make sure you're logged in with the **admin account** (the one seeded via `npm run seed:admin`). Regular accounts have the `user` role and can't see the admin panel.

---

## License

MIT — built as a portfolio project.
