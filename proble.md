# NoteGenie — Problems & Issues Report

A full audit of the project (backend, frontend, repo hygiene). Each issue lists the file, severity, what's wrong, and how to fix it.

Severity legend: **High** = fix before sharing/deploying, **Medium** = should fix soon, **Low** = nice to have / polish.

---

## ✅ Resolution status (fixes applied)

Almost all code-level issues below have been fixed. Highlights:

- **Security:** added `helmet`, `trust proxy`, a CORS allowlist (comma-separated `CLIENT_URL`), a stricter auth rate limiter + a separate AI limiter, SSRF guard in the link extractor (blocks private/link-local IPs, http/https only), PDF magic-byte check, multer error handling, sanitized error messages (no schema/stack leaks), fail-fast env validation in production + weak-`JWT_SECRET` warning, and a confirm flag required to reset usage.
- **Bugs:** tutor now uses DB history (not client-supplied), tutor stream has retry + clean interruption handling, user/assistant messages are saved together, `recordUsage` is awaited, `parseJson` handles code-fenced output, `listModels` has a timeout, deleting a user also clears their `ApiUsage`, DB connect guards a missing URI, and global `unhandledRejection`/`uncaughtException` handlers were added.
- **Robustness:** admin user/document lists are paginated, email + length validation on register, quiz-submit answer validation, lower JSON body limit, and compound indexes on `Document` and `ChatMessage`.
- **Frontend:** global 401 interceptor → auto logout, configurable API base URL (`VITE_API_URL`), `Analytics` no longer crashes on failure, `QuizView`/`DocumentView`/`TutorChat` reset state and ignore stale/aborted responses, login redirects back to the intended page, real 404 page, delete loading states, confirm dialog gets aria attributes + Escape + stale-promise cleanup, form/search/chat inputs are labelled, password rules aligned to 8 chars, and context hooks guard against missing providers.
- **Docs/hygiene:** README ports corrected (`PORT`/`CLIENT_PORT`, `dev.mjs` auto-fallback), `engines` field added, `client/.env.example` added, `.env.example` updated (NODE_ENV, JWT secret generation, CORS note).

### ⚠️ Still needs YOUR action (cannot be done from code)

1. **Rotate secrets now.** The live MongoDB password and Gemini API key in `.env` should be treated as exposed (OneDrive-synced folder). Rotate the Atlas DB password and the Gemini key, then update `.env`.
2. **Move the repo out of OneDrive** (e.g. `C:\dev\notegenie`) so `.env` isn't synced to the cloud.
3. **Set a strong `JWT_SECRET`** in `.env`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. **Change seeded passwords** (`ADMIN_PASSWORD` / `USER_PASSWORD`) before any real use.

### Intentionally deferred (documented, low risk for this project)

- **S3** (encrypt Gemini key at rest) — still plaintext in Mongo but only ever returned masked; acceptable for a personal/portfolio app.
- **S4** (`/admin/models?key=` in query) — admin-only + authenticated; left as a query param.
- **A2** (httpOnly cookies vs `localStorage`) — kept `localStorage` JWT, but added full 401 handling.
- **Q6** (ESLint config) — not added to avoid introducing noise; can be set up separately.

---

## 0. Top Priorities (fix these first)

1. **High** — `.env` holds a live MongoDB password and live Gemini API key, and the project lives inside a OneDrive-synced folder. OneDrive uploads `.env` to the cloud regardless of `.gitignore`. Treat these secrets as exposed: **rotate the Atlas DB password and Gemini key**, and move the repo out of OneDrive.
2. **High** — `Analytics.jsx` crashes if the API call fails (reads `data.x` while `data` is `null`).
3. **High** — No global 401 handling on the client; an expired token leaves a broken, half-logged-in session.
4. **High** — SSRF risk in the link extractor (fetches any user URL, including internal/localhost).
5. **High** — Tutor chat sends client-supplied history to the AI instead of the saved DB history (prompt injection + wrong context).
6. **Medium** — README ports (5000/5173) do not match the real app (5001 API / 3000 client).

> Good news: `.env` is correctly gitignored, was **never committed**, and `.env.example` has only placeholders — no secrets are in git history.

---

## 1. Security (Backend)

| # | File | Severity | Issue | Fix |
|---|------|----------|-------|-----|
| S1 | `server/src/routes/auth.js` | High | No rate limit on login/register (global 100/15min allows credential stuffing). | Add a dedicated auth limiter (5-10 attempts/15min per IP). |
| S2 | `server/src/services/linkExtractor.js` | High | SSRF: fetches any user URL with no blocklist (can hit `localhost`, `169.254.169.254`, private IPs). | Allow only http/https, reject private/link-local IPs after DNS resolve. |
| S3 | `server/src/models/Settings.js`, `adminController.js` | High | Gemini API key stored in plaintext in MongoDB. | Encrypt at rest, never return raw key (masking already exists). |
| S4 | `server/src/controllers/adminController.js` | Medium | `GET /admin/models?key=...` takes the API key in the URL query (leaks to logs/history). | Accept key only in POST body or use the saved DB key. |
| S5 | `server/src/middleware/upload.js` | Medium | PDF check trusts client `mimetype` only. | Verify magic bytes (`%PDF-`). |
| S6 | `server/src/index.js` | Medium | CORS allows a single origin; breaks with multiple origins or standalone runs. | Support an allowlist via env. |
| S7 | `server/src/index.js` | Medium | One rate limiter for all `/api`; expensive AI routes share the budget = cost/abuse vector. | Stricter limits on AI routes + per-user quotas. |
| S8 | `server/src/config/env.js` | Medium | `validateEnv()` only warns; server starts with missing `JWT_SECRET`/`MONGO_URI`/`GEMINI_API_KEY`. | Fail fast (`process.exit(1)`) in production. |
| S9 | `server/src/middleware/errorHandler.js` | Medium | Returns raw `err.message`; Mongoose errors can leak schema details. | Map known errors to generic messages; log full error server-side. |
| S10 | `server/src/controllers/tutorController.js` | Medium | Tutor uses client-supplied `history` (prompt injection). | Load history from DB; cap/validate any client input. |
| S11 | `.env` | Medium | `JWT_SECRET=...change_me...` is a weak placeholder-style secret. | Replace with `openssl rand -hex 32`. |
| S12 | `server/src/scripts/seedData.js` | Medium | Falls back to hardcoded creds; prints passwords to stdout. | Require env vars in prod; never log passwords. |
| S13 | `server/src/middleware/auth.js` | Low | No check that `jwtSecret` is set before signing. | Validate in `validateEnv`. |
| S14 | `server/src/index.js` | Low | No `helmet` (missing security headers). | Add `helmet()`. |
| S15 | `server/src/index.js` | Low | No `trust proxy` for deployments behind a reverse proxy. | `app.set('trust proxy', 1)` when applicable. |
| S16 | `server/src/controllers/authController.js` | Low | Min password length only 6, no complexity. | Enforce 8+ chars for production. |
| S17 | `server/src/routes/auth.js` | Low | Open registration, no email verification/CAPTCHA. | Add verification or invite-only mode. |

---

## 2. Bugs / Correctness

### Backend

| # | File | Severity | Issue | Fix |
|---|------|----------|-------|-----|
| B1 | `server/src/controllers/tutorController.js` | High | History saved to DB but AI prompt uses `req.body.history` — UI and model see different context. | Build history from DB before calling `tutorStream`. |
| B2 | `server/src/services/gemini.js` | Medium | `tutorStream` does not use `withRetry` (transient 503/429 fail instantly). | Wrap stream init with retry. |
| B3 | `server/src/services/gemini.js` | Medium | `recordUsage(...)` called without `await` (records may be lost). | `await` it or attach `.catch()`. |
| B4 | `server/src/controllers/tutorController.js` | Medium | User message saved before streaming; on failure chat state is inconsistent. | Save after success or add a status field. |
| B5 | `server/src/controllers/tutorController.js` | Medium | On error after headers sent, `res.end()` with no error signal (silent truncation). | Use SSE error events or fail before streaming. |
| B6 | `server/src/services/gemini.js` | Medium | `parseJson` greedy regex fallback can extract wrong substring. | Use non-greedy parse / rely on structured output. |
| B7 | `server/src/config/db.js` | Medium | Undefined `mongoUri` retries 5x then crashes unclearly. | Throw immediately if `!mongoUri`. |
| B8 | `server/src/controllers/adminController.js` | Low | `deleteUser` leaves orphaned `ApiUsage` records. | Add `ApiUsage.deleteMany({ userId })`. |
| B9 | `server/src/controllers/adminController.js` | Low | Cascading deletes are not transactional. | Use transactions or ordered cleanup. |
| B10 | `server/src/services/gemini.js` | Low | `listModels` fetch has no timeout (can hang admin UI). | Add `AbortSignal.timeout(10000)`. |
| B11 | `server/src/index.js` | Low | No `unhandledRejection`/`uncaughtException` handlers. | Register global handlers. |
| B12 | `server/src/config/db.js` | Low | No reconnect handling after initial connect. | Listen to mongoose connection events. |

### Frontend

| # | File | Severity | Issue | Fix |
|---|------|----------|-------|-----|
| F1 | `client/src/pages/Analytics.jsx` | High | Crashes when API fails (`data` is null but still rendered). | Return early when `error && !data`. |
| F2 | `client/src/pages/QuizView.jsx` | High | On quiz id change, `result`/`error`/`loading` not reset — shows previous quiz's results. | Reset all state at effect start. |
| F3 | `client/src/pages/DocumentView.jsx` | High | On id change, stale document flashes (loading/doc not reset). | Reset state at effect start. |
| F4 | Multiple pages (DocumentView, QuizView, Dashboard, TutorChat, Analytics, admin) | High | Fetch race conditions — no AbortController/cancel flag; stale responses overwrite current state. | Use AbortController or an `ignore` flag. |
| F5 | `client/src/components/TutorChat.jsx` | High | Streaming fetch not aborted on unmount/doc change; `setMessages` after unmount. | Abort in cleanup; guard with mounted flag. |
| F6 | `client/src/pages/Upload.jsx` | Medium | Says "Max 15MB" but no client-side size check. | Validate `file.size` before upload. |
| F7 | `client/src/pages/Upload.jsx` | Medium | PDF check is MIME-only (spoofable). | Also check extension/magic bytes. |
| F8 | `client/src/pages/DocumentView.jsx` | Medium | Delete button has no loading/disabled state (double-click = duplicate requests). | Add `deleting` state. |
| F9 | `client/src/pages/Register.jsx` | Medium | Password strength: score of 1 ("Weak") shows zero bars (off-by-one). | Use `score >= i`. |
| F10 | `client/src/pages/Upload.jsx` | Low | Tab switch doesn't clear file/url; loading never reset on nav failure. | Clear opposite tab state; use `finally`. |
| F11 | `client/src/pages/QuizView.jsx`, `Flashcards.jsx`, `TutorChat.jsx` | Low | Lists use array index as React `key`. | Use stable IDs. |
| F12 | `client/src/context/ConfirmContext.jsx` | Low | Rapid `confirm()` calls overwrite the resolver; first promise never resolves. | Queue dialogs or reject the previous one. |
| F13 | `client/src/App.jsx` | Low | Unknown routes silently redirect to `/`. | Add a 404 page. |

---

## 3. Auth Handling (Frontend)

| # | File | Severity | Issue | Fix |
|---|------|----------|-------|-----|
| A1 | `client/src/api/client.js` | High | No axios 401 interceptor — expired token leaves a broken session. | On 401: clear token, logout, redirect to `/login`. |
| A2 | `client/src/api/client.js` | High | JWT in `localStorage` (XSS theft risk). | Prefer httpOnly cookie, or harden XSS surface. |
| A3 | `client/src/api/client.js` | High | No token expiry handling client-side. | Decode `exp` and logout, or rely on 401 interceptor. |
| A4 | `client/src/context/AuthContext.jsx` | Medium | `setUser(null)` not explicit on `/auth/me` failure. | Always set user null in catch. |
| A5 | `client/src/context/AuthContext.jsx` | Medium | `refreshUser()` has no error handling. | Wrap in try/catch. |
| A6 | `client/src/App.jsx` | Medium | Protected routes are client-side only (real check is server-side). | Document; hide admin nav early. |
| A7 | `client/src/App.jsx` | Low | After login, intended destination not preserved. | Pass `state={{ from: location }}`. |

---

## 4. Robustness / Validation (Backend)

| # | File | Severity | Issue | Fix |
|---|------|----------|-------|-----|
| V1 | `server/src/controllers/adminController.js` | Medium | `DELETE /admin/usage` wipes all logs with no confirmation/audit. | Require `{ confirm: true }`; log who reset. |
| V2 | `server/src/controllers/adminController.js` | Medium | `listUsers` returns all users (no pagination). | Add `page`/`limit`. |
| V3 | `server/src/controllers/adminController.js` | Medium | `listAllDocuments` returns all docs (no pagination). | Add pagination. |
| V4 | `server/src/controllers/authController.js` | Medium | No email format / max-length validation. | Use `validator.isEmail` + length caps. |
| V5 | `server/src/routes/documents.js` | Medium | Multer errors (too large/wrong type) not handled → unformatted 500. | Add multer error middleware → 400 JSON. |
| V6 | `server/src/controllers/tutorController.js` | Medium | No validation on `history` size/shape/length (DoS / broken prompt). | Cap to last ~20 turns, validate items. |
| V7 | `server/src/controllers/quizController.js` | Low | `submitQuiz` doesn't validate `answers` length / index bounds. | Validate against question count. |
| V8 | `server/src/index.js` | Low | Global `express.json({ limit: "10mb" })` (DoS vector). | Lower default; raise only where needed. |
| V9 | `server/src/models/ChatMessage.js`, `Document.js` | Low | Missing compound indexes for sorted history/list queries. | Add `{ userId, createdAt }` indexes. |
| V10 | `server/src/services/gemini.js` | Low | `testApiKey` doesn't record usage under feature `"test"` (enum unused). | Record usage for accuracy. |

---

## 5. API Client / Build / Config (Frontend)

| # | File | Severity | Issue | Fix |
|---|------|----------|-------|-----|
| P1 | `client/src/api/client.js`, `vite.config.js` | High | `baseURL: "/api"` relies on the Vite dev proxy; production build has no proxy and server serves no static files → 404 on `/api/*` when deployed. | Add `VITE_API_URL` for prod; configure reverse proxy or serve client from the API. |
| P2 | `client/src/components/TutorChat.jsx` | Medium | Tutor streaming uses raw `fetch` instead of the axios instance (bypasses interceptors). | Centralize through a shared helper. |
| P3 | `client/vite.config.js` | Medium | Reads env from `../.env`; running client alone is surprising and port logic differs from `dev.mjs`. | Document "use root `npm run dev`"; add `client/.env.example`. |
| P4 | `client/src/api/client.js` | Low | `apiError()` only reads `response.data.message`. | Handle `errors[]`, status codes. |

---

## 6. UX / Accessibility

| # | File | Severity | Issue | Fix |
|---|------|----------|-------|-----|
| U1 | `client/src/components/FormField.jsx` | Medium | `<label>` not linked to `<input>` (no `htmlFor`/`id`). | Use `useId()` to link them. |
| U2 | `client/src/pages/Dashboard.jsx` | Medium | Search input has placeholder but no label. | Add an sr-only label. |
| U3 | `client/src/components/TutorChat.jsx` | Medium | Chat input no label; send button icon-only (no accessible name). | Add label + `aria-label`. |
| U4 | `client/src/pages/DocumentView.jsx` | Medium | Delete button icon-only, no `aria-label`. | Add `aria-label="Delete material"`. |
| U5 | `client/src/components/Layout.jsx` | Medium | Mobile menu button no `aria-label`/`aria-expanded`. | Add both. |
| U6 | `client/src/context/ConfirmContext.jsx` | Medium | Dialog missing `aria-labelledby`/`aria-describedby`; no Escape handler. | Wire IDs; handle Escape; focus trap. |
| U7 | `client/src/pages/Dashboard.jsx` | Medium | Stat cards show "0" during load (misleading flash). | Show skeletons until loaded. |
| U8 | `client/src/pages/Profile.jsx` | Medium | One shared `error` state for name + password forms. | Separate error states per form. |
| U9 | `client/src/pages/QuizView.jsx` | Medium | Error-only view has no back link. | Add back link. |
| U10 | `client/src/components/TutorChat.jsx` | Medium | History load errors swallowed (empty chat, no message). | Surface a toast/alert on non-404. |
| U11 | `client/src/pages/admin/AdminUsers.jsx` | Low | No empty state when there are no users. | Add an empty state. |

---

## 7. Code Quality

| # | File | Severity | Issue | Fix |
|---|------|----------|-------|-----|
| Q1 | `client/src/context/AuthContext.jsx` + pages | Low | `apiError` imported from two places inconsistently. | Import only from `api/client.js`. |
| Q2 | `client/src/pages/Landing.jsx`, `components/AuthShell.jsx` | Low | Duplicated `features` arrays. | Extract a shared constant. |
| Q3 | `client/src/pages/Dashboard.jsx`, `Analytics.jsx` | Low | Near-identical stat card components (`StatCard` vs `Stat`). | Share one component. |
| Q4 | `client/src/pages/admin/AdminSettings.jsx` | Low | Client `rateForModel` duplicates server pricing logic (drift risk). | Use API-provided rates only. |
| Q5 | `client/src/context/AuthContext.jsx`, `ThemeContext.jsx` | Low | `useAuth()`/`useTheme()` have no null guard. | Throw if used outside provider. |
| Q6 | `client/` | Low | No ESLint configured. | Add ESLint + react-hooks plugin. |
| Q7 | `client/src/components/Layout.jsx` | Low | Profile nav uses `IconUsers` (misleading). | Use a profile icon. |

---

## 8. Repo Hygiene / Docs / Dependencies

| # | File | Severity | Issue | Fix |
|---|------|----------|-------|-----|
| H1 | whole repo under `OneDrive\...\All-Pojects\learning` | Medium | OneDrive + git is risky (can corrupt `.git`, syncs secret `.env` to cloud). Folder name also misspelled "All-Pojects". | Move repo to e.g. `C:\dev\notegenie`. |
| H2 | `README.md` (line ~109) | Medium | Says ports 5000/5173 and "open :5173"; real app is 5001 (API) / 3000 (client). | Update README ports; note `dev.mjs` prints real URLs. |
| H3 | `README.md` | Low | `.env` table omits `CLIENT_PORT`; folder layout omits `dev.mjs`. | Add both. |
| H4 | `server/package.json` | Medium | `@google/generative-ai ^0.21.0` is deprecated (replaced by `@google/genai`). | Plan migration to `@google/genai`. |
| H5 | all `package.json` | Low | No `engines` field / `.nvmrc` though README says Node 18+. | Add `"engines": { "node": ">=18" }`. |
| H6 | `.gitignore` (lines 14, 17) | Low | Dead entries: `server/uploads/` (memory storage, no folder) and `test.js` (already removed). | Harmless; can clean up. |
| H7 | root | Low | No root `package-lock.json` (root has no deps, so OK). | Optional. |

---

## 9. What's Already Good

- `.env` is gitignored and was never committed; `.env.example` has only placeholders.
- Passwords hashed with bcrypt; protected/admin routes use `requireAuth`/`requireAdmin`.
- User resources scoped by `userId` (no obvious IDOR); quiz answers hidden until submit.
- Sensible MongoDB connect retry; `ApiUsage` has useful indexes.
- Confirm dialogs for destructive actions; loading/empty states on most pages.
- No leftover `console.log` in client source; `StrictMode` enabled.
- The dev/port chain (`dev.mjs` -> `vite.config.js` -> `server env`) is internally consistent.

---

## Suggested Fix Order

1. **Security must-fix:** rotate secrets + move off OneDrive (H1), SSRF (S2), auth rate limit (S1), tutor history from DB (B1/S10), fail-fast env (S8).
2. **Frontend stability:** Analytics crash (F1), state reset on route change (F2/F3), fetch races (F4/F5), 401 interceptor (A1).
3. **Robustness:** multer error handling (V5), pagination (V2/V3), reset-usage confirmation (V1), input validation (V4/V6).
4. **Production readiness:** API base URL/proxy (P1), CORS allowlist (S6), helmet/trust proxy (S14/S15).
5. **Docs & polish:** README ports (H2/H3), dependency migration (H4), accessibility (U1-U11), code-quality cleanups (Q1-Q7).
