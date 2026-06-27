# NoteGenie

NoteGenie ek MERN study app hai, par ab iska **main product ek student study-material marketplace / store** hai. Students yahan notes, solved assignments, question papers, books, guides aur combo packs **university, degree, course code, exam aur topic** ke hisaab se browse aur download karte hain. Zyada material **100% free** hai, kuch premium guides optional hain jo UPI/cards se Razorpay ke through pay hote hain (instant download).

AI study tools (Ask AI, upload & summarize, notes/flashcards/quizzes, tutor chat) ab **dashboard ke andar bonus add-ons** hain jo har signed-up account ko free milte hain — yeh headline product nahi, ek extra hai. Marketplace hi main event hai.

Frontend React + Vite me hai, backend Express + MongoDB me hai, aur AI Google Gemini API se chalta hai.

## Main Features

**Store (lead feature):**

- Study-material marketplace: notes, solved assignments, question papers, books aur guides ko university, degree, course code, exam aur topic se browse/buy karein. Zyada material free, premium optional.
- Search aur discovery: Landing par free-text hero search, StoreHome par University + category dual-dropdown search, category tiles, aur "shop by degree" program grid.
- Personalized strips: Recently viewed (local browsing history se) aur Recommended for you (viewed resource types par), plus Free first, Most downloaded (popular), aur Just added (latest).
- Cart aur combo packs: multiple items (assignments, papers, books) ek sath add karke buy karein; dedicated combo packs section.
- Secure checkout: UPI/cards via Razorpay, files hamesha ke liye "My downloads" me saved.
- Free account with **OTP email verification** (account sirf OTP verify hone ke baad banta hai).
- Student support: WhatsApp help (jab support number configured ho) sahi material choose karne ke liye.

**AI study tools (dashboard add-ons — bonus, included free):**

- Ask AI — apne material par grounded sawaal poochho.
- Upload & summarize — PDF/DOCX/PPTX/TXT ya link/YouTube drop karke clean summary lo.
- Generate notes — kisi bhi source se structured notes.
- Flashcards — auto-built cards with spaced repetition.
- Quizzes — practice quizzes apne aap ko test karne ke liye.
- Per-document aur cross-document AI tutor chat, mind map view, browser text-to-speech listen mode, analytics/streaks/daily goal, tags/folders/public share links.

**Account, billing, admin:**

- JWT login/register, OTP email verification, password reset.
- Razorpay billing and admin-managed plans (Stripe legacy optional).
- Admin panel for users, store catalog/resources/combos/orders, content, billing, AI keys, usage, audit logs, rate limits, aur **feature toggles**.

## Tech Stack

Frontend: React 18, Vite, React Router, Tailwind CSS, Axios, Framer Motion, React Markdown, Remark GFM.

Backend: Node.js 18+, Express, MongoDB, Mongoose, JWT, bcrypt, Multer, Mammoth (DOCX), OfficeParser (PPTX/Office), Helmet, CORS, Express Rate Limit, Nodemailer, Razorpay, Stripe legacy optional, YouTube Transcript, Google Gemini.

Tooling: ESLint, Prettier commands, Node test runner, Render backend blueprint, Firebase hosting config.

## Folder Structure

```text
NoteGenie/
  README.md                    Project documentation
  package.json                 Root scripts for client/server
  package-lock.json            Root npm lock file
  dev.mjs                      Starts server and client together, prints real URLs
  start-dev.bat                Windows dev starter
  .env.example                 Root/backend env sample
  render.yaml                  Render backend deployment config
  proble.md                    Project notes/problem file
  docs/VECTOR_SEARCH_SETUP.md  Atlas Vector Search + RAG setup
  client/                      React frontend
    package.json               Frontend scripts/dependencies
    index.html                 Vite HTML entry
    vite.config.js             Vite config and API proxy
    tailwind.config.js         Tailwind config
    postcss.config.js          PostCSS config
    eslint.config.js           Frontend lint config
    firebase.json              Firebase hosting config
    .env.example               Frontend API URL sample
    public/favicon.svg         Browser icon
    src/main.jsx               React boot file
    src/App.jsx                Frontend routes/protected route guards
    src/index.css              Global styles and Tailwind layers
    src/api/client.js          Axios API client
    src/config/                Languages/detail/developer/upload constants
    src/context/               Auth, cart, toast, theme, confirm providers
    src/hooks/                 Custom hooks like speech
    src/lib/                   Razorpay, store config, storefront, recentlyViewed
    src/pages/                 Main app + legal pages
    src/pages/store/           Storefront pages
    src/pages/admin/           Admin pages
    src/components/            Shared UI components
    src/components/admin/      Admin-only components
    src/components/store/      Store-only components
    src/utils/                 Client helper functions
  server/                      Express backend
    package.json               Backend scripts/dependencies
    eslint.config.js           Backend lint config
    tests/api.test.js          Backend tests
    src/index.js               Express entry point + /api/health
    src/config/                Env, DB, plans, languages, permissions, observability
    src/routes/                API route definitions
    src/controllers/           Request business logic
    src/models/                Mongoose schemas
    src/middleware/            Auth, upload, quota, rate-limit, feature, errors
    src/services/              AI, billing, email, retrieval, RAG, streak, etc.
    src/utils/                 Shared backend helpers
    src/scripts/seedData.js    Seed admin/demo users + catalog/demo data
    src/scripts/embedBackfill.js Embeddings backfill for vector RAG
```

## Install And Run Commands

Install client and server dependencies:

```bash
npm run install:all
```

Create env file on Windows:

```powershell
copy .env.example .env
```

Create env file on Git Bash/Linux/macOS:

```bash
cp .env.example .env
```

Generate random secret for `JWT_SECRET` and `ENCRYPTION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Seed admin/demo accounts AUR catalog/demo store data (uses `ADMIN_*` / `USER_*` env values). `npm run seed` aur alias `npm run seed:data` dono same script (`node src/scripts/seedData.js`) chalate hain jo users AUR catalog/store demo data dono seed karta hai — koi separate catalog-only step nahi hai:

```bash
npm run seed
```

Run full project in development:

```bash
npm run dev
```

Run only backend:

```bash
npm run server
```

Run only frontend:

```bash
npm run client
```

Run lint for both:

```bash
npm run lint
```

Run server tests:

```bash
npm test --prefix server
```

Build frontend:

```bash
npm run build --prefix client
```

Preview frontend build:

```bash
npm run preview --prefix client
```

Format frontend:

```bash
npm run format --prefix client
```

Format backend:

```bash
npm run format --prefix server
```

Deploy frontend to Firebase:

```bash
npm run deploy --prefix client
```

Windows shortcut:

```powershell
.\start-dev.bat
```

## Local URLs

Local `.env` (gitignored, repo me nahi hota) me ports set kiye ja sakte hain — is project ka local setup `PORT=5001`, `CLIENT_PORT=3000`, `CLIENT_URL=http://localhost:3000` use karta hai. Fresh clone me `.env` nahi hota, to code defaults `PORT=5000` (server) aur `CLIENT_PORT=5173`/client `5173` lagte hain:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5001`
- Health: `http://localhost:5001/api/health`

Note: `.env.example` me `PORT`/`CLIENT_PORT` blank hote hain, jiska matlab code defaults `5000` (server) aur `5173` (client) use hote hain. Asli ports `.env` ke values par depend karte hain. `dev.mjs` start hote waqt **terminal me asli URLs print karta hai** aur agar port busy ho to next free port par fall back kar deta hai — final URL terminal me confirm karein.

## Environment Variables

Root `.env.example` ko `.env` me copy karke fill karein. Sirf `MONGO_URI` aur `JWT_SECRET` truly required hain (production me startup fail ho jata hai agar missing/placeholder ho); baaki optional hain.

### Server core

| Key | Required | Default | Working |
| --- | --- | --- | --- |
| `PORT` | No | `5000` | Express HTTP port. |
| `CLIENT_PORT` | No | — | Dev-only client port hint (`.env.example` me hai, par `env.js` isko consume nahi karta). |
| `NODE_ENV` | No | `development` | `production` par fail-fast validation aur prod behavior on hota hai. |
| `CLIENT_URL` | No | `http://localhost:5173` | Allowed client origin(s) for CORS/links; comma-separated, pehla primary. |
| `MONGO_URI` | **Yes** | — | MongoDB Atlas connection string. Missing/placeholder par startup fail. |
| `JWT_SECRET` | **Yes** | — | JWT signing secret. Long/random hona chahiye (>=32 chars, `changeme` nahi). |
| `JWT_EXPIRES_IN` | No | `7d` | JWT token lifetime. |

### AI (Gemini)

| Key | Required | Default | Working |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | No | — | Main Gemini key. Warn-but-not-fatal (admin UI me bhi set ho sakti hai). |
| `GEMINI_API_KEYS` | No | — | Extra Gemini keys comma-separated, rotation/load ke liye. |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model name. |
| `ENCRYPTION_SECRET` | No | — | Stored sensitive values (e.g. admin-set keys) encrypt karne ke liye. |
| `AI_RATE_LIMIT_MAX` | No | `120` | Max AI generation requests per window (Admin → AI Settings se override). |
| `AI_RATE_LIMIT_WINDOW_MIN` | No | `15` | AI rate-limit window in minutes. |
| `RAG_ENABLED` | No | `true` | Vector RAG embeddings for Ask/tutor. `false` par lexical fallback. (`env.js` reads; `.env.example` me nahi.) |
| `RAG_VECTOR_INDEX` | No | `vector_index` | Atlas vector search index name. (`env.js` reads; `.env.example` me nahi.) |

### Email / OTP (SMTP)

| Key | Required | Default | Working |
| --- | --- | --- | --- |
| `SMTP_HOST` | No | — | SMTP server hostname. |
| `SMTP_PORT` | No | `587` | SMTP server port. |
| `SMTP_SECURE` | No | nodemailer default | `true`/`false` se TLS force; warna nodemailer decide karta hai. (`env.js` reads; `.env.example` me nahi.) |
| `SMTP_USER` | No | — | SMTP auth username. |
| `SMTP_PASS` | No | — | SMTP password / app password. |
| `SMTP_FROM` | No | falls back to `EMAIL_FROM` | Preferred From header; `EMAIL_FROM` par priority. (`env.js` reads; `.env.example` me nahi.) |
| `EMAIL_FROM` | No | — | Fallback From header jab `SMTP_FROM` unset ho. |
| `OTP_LENGTH` | No | `6` | Signup email OTP me digits. |
| `OTP_EXPIRES_MIN` | No | `10` | OTP validity window in minutes. |

### Billing (Razorpay + legacy Stripe)

| Key | Required | Default | Working |
| --- | --- | --- | --- |
| `RAZORPAY_KEY_ID` | No | — | Razorpay public key id. |
| `RAZORPAY_KEY_SECRET` | No | — | Razorpay secret key. |
| `RAZORPAY_PRO_AMOUNT` | No | `74900` | Pro plan price in paise (admin UI override tak). |
| `RAZORPAY_TEAM_AMOUNT` | No | `249900` | Team plan price in paise (admin UI override tak). |
| `STRIPE_SECRET_KEY` | No | — | Stripe secret (legacy/optional). |
| `STRIPE_WEBHOOK_SECRET` | No | — | Stripe webhook signing secret (legacy/optional). |
| `STRIPE_PRICE_PRO` | No | — | Stripe Pro price id (legacy/optional). |
| `STRIPE_PRICE_TEAM` | No | — | Stripe Team price id (legacy/optional). |

### Seed accounts (only `npm run seed` / `seed:data`)

| Key | Default | Working |
| --- | --- | --- |
| `ADMIN_EMAIL` | `admin@shop.com` | Seed admin email (env.js read nahi karta). |
| `ADMIN_PASSWORD` | `Admin@123` | Seed admin password. |
| `ADMIN_NAME` | `Admin` | Seed admin display name. |
| `USER_EMAIL` | `user@shop.com` | Seed demo customer email. |
| `USER_PASSWORD` | `User@123` | Seed demo customer password. |
| `USER_NAME` | `Demo User` | Seed demo customer display name. |

### WhatsApp & social links (env)

Yeh storefront contact/social fallbacks hain. **DB admin setting (Admin → Settings) inn env values par priority leta hai**, aur server inhe public `GET /api/catalog/storefront` se expose karta hai.

| Key | Default | Working |
| --- | --- | --- |
| `SUPPORT_EMAIL` | `""` | Support contact Pricing page aur Admin overview par dikhta hai. |
| `WHATSAPP_NUMBER` | `""` | Storefront WhatsApp fallback (E.164 digits, bina `+`; non-digits strip hote hain). Empty = `wa.me` link hide. DB admin setting override karta hai. |
| `SOCIAL_INSTAGRAM` | `""` | Storefront Instagram link fallback (DB admin setting override). |
| `SOCIAL_FACEBOOK` | `""` | Storefront Facebook link fallback (DB admin setting override). |
| `SOCIAL_YOUTUBE` | `""` | Storefront YouTube link fallback (DB admin setting override). |
| `SOCIAL_TELEGRAM` | `""` | Storefront Telegram link fallback (DB admin setting override). |

### Monitoring

| Key | Default | Working |
| --- | --- | --- |
| `SENTRY_DSN` | — | Sentry DSN for error monitoring (optional). |

### Client (Vite) env

| Key | Default | Working |
| --- | --- | --- |
| `VITE_API_URL` | relative `"/api"` | Full API base URL (incl. `/api`) jab API doosre origin par ho. Dev me Vite proxy `/api` automatically backend ko bhejta hai, isliye normally zaroorat nahi. |
| `VITE_WHATSAPP_NUMBER` | — | Last-resort client storefront WhatsApp fallback (digits only) jab tak storefront API resolve na ho; normally server-provided. |
| `VITE_SUPPORT_EMAIL` | — | Last-resort client storefront support email fallback; normally server-provided. |

Client production env example:

```text
VITE_API_URL=https://your-backend-domain.com/api
```

## Auth & OTP Flow (account banta hi OTP ke baad hai)

Register par **account create nahi hota** — pehle ek `PendingSignup` record banta hai, aur **sirf correct OTP verify hone par real `User` banta hai**. Isse MongoDB me junk unverified users accumulate nahi hote.

1. `POST /api/auth/register` name (2-80 chars), email (regex, max 254) aur password (min 8) validate karta hai. Agar verified `User` already exist karta hai to **409**. Warna password hash karke, `crypto.randomInt` se numeric OTP generate karke (SHA-256 hashed) ek `PendingSignup` record upsert karta hai (email, name, passwordHash, otpHash, otpExpires, attempts=0, lastSentAt, expiresAt = now + ~24h). OTP email bhejta hai aur **201 `{ needsVerification: true, email }`** return karta hai — **no token, no user** (client ko OTP verify karna hi padega).
2. `POST /api/auth/verify-email` email se `PendingSignup` dhoondhta hai: expired OTP reject; **5 galat attempts (`MAX_OTP_ATTEMPTS`) par pending record delete + 429** (brute-force guard, attempts-left report karta hai). Correct OTP par real `User` banta hai (`emailVerified=true`, `usageResetAt=startOfNextMonth`), `PendingSignup` delete hota hai, aur **201 me user + JWT token** milta hai. Race re-check 409 deta hai agar beech me email register ho gaya.
3. `POST /api/auth/resend-verification` ab **PUBLIC hai** (body `{ email }`, ab auth-gated nahi). Per-email **45s cooldown** (`RESEND_COOLDOWN`), attempts reset, fresh OTP. Unknown email par generic "If that signup exists, a new code was sent." (email known hai ya nahi reveal nahi karta).

`PendingSignup.expiresAt` par **TTL index (expireAfterSeconds: 0)** hai, to abandoned signups MongoDB ~24h me auto-remove kar deta hai. `verifyEmail`/`resendVerification` dono purane-flow unverified `User` records ke liye legacy fallback bhi rakhte hain. **Login** alag hai: credentials check karke user + token + usage deta hai.

## Admin Feature Control

Admin **Admin → Settings → Features** se in feature flags ko toggle kar sakta hai (har flag default `true` = enabled):

`upload`, `askAi`, `analytics`, `billing`, `store`, `workspaces`

- Server par naya `server/src/middleware/requireFeature.js` disabled features ko block karta hai — `requireFeature('askAi')` poore `/api/tutor` router par aur `requireFeature('workspaces')` poore `/api/workspaces` router par lagta hai. Disabled hone par **403 `{ message: 'This feature is currently unavailable.' }`**. Flags `models/Settings.js` (`getAppSettings()` + `resolveFeatures()`) se padhe jaate hain with a 30s in-memory cache; `invalidateFeatureCache()` settings change par cache clear karta hai.
- Flags publicly `GET /api/catalog/storefront` se expose hote hain aur client-side `useFeatures()` / `useStorefront()` se padhe jaate hain.
- Disabled features nav se **hide** ho jaate hain, aur frontend par `FeatureProtected` routes "This feature is currently unavailable" dikhate hain.

## Admin Theme Control

Admin **Admin → Settings → Theme** se site-wide default theme set kar sakta hai:

- **Accent colour** — `indigo` / `violet` / `blue` / `emerald` (CSS `[data-accent]` presets, `index.css`).
- **Default mode** — `light` / `dark`.

`Settings.theme` (`resolveTheme()`) me save hota hai aur `GET /api/catalog/storefront` ke `theme` field se publicly expose hota hai. Frontend `ThemeContext` is default ko apply karta hai — lekin **user ka apna choice (ThemePicker, localStorage) priority** rakhta hai. Matlab admin theme change kare to wo har us user par apply hota hai jisne khud apna look nahi chuna.

## Digital + Physical Product System

Har store product (`Resource`) **digital** ya **physical** ho sakta hai (`productType`, default `digital`).

- **Digital**: file/URL, `downloadLimit`, `downloadExpiryDays`, `version`, `licenseKey`, `instantDownload`. Payment verify hone par hi `downloadToken` + license generate hote hain — **verified payment se pehle download impossible**.
- **Physical**: `sku`, `stock`, `weightGrams`, `dimensions`, `deliveryCharges`, `codAvailable`, `manageInventory`. Cart checkout par **shipping address** chahiye; admin courier/tracking/status manage karta hai.

**Secure download**: `GET /api/catalog/download/:token` — unguessable token, ownership + verified-payment + downloadEnabled + limit + expiry check; file stream; har attempt **`DownloadLog`** me. Direct file URL kabhi expose nahi.

**Admin**: Products page (Digital/Physical toggle + fields), Orders + **Order Detail** page (enable/disable download, reset count, regenerate token, extend expiry, license, shipping). Purchase par "download ready" email.

New files: `models/Resource.js` (extended), `models/Purchase.js` (extended), `models/DownloadLog.js`, `controllers/marketplaceController.js` + `resourceController.js` (extended), `routes/catalog.js`/`admin.js`, client `pages/admin/AdminOrderDetail.jsx`, `pages/MyDownloads.jsx`, `pages/ResourceDetail.jsx`, `store/Cart.jsx`, `lib/razorpay.js`.

## Academic Handbook PDF

`npm run handbook --prefix server` → **`docs/academic-handbook.pdf`** — ek professional PDF (cover, table of contents with page numbers, programs/universities/semester courses, assignments with difficulty, recommended books Free/Paid, additional resources, footer page numbers). Data `config/academicSample.js` me (expandable), generator `services/handbookPdf.js` (pdfkit). `npm run seed` ab har product ke liye ek real sample PDF GridFS me upload karke attach karta hai, taaki **store downloads actually kaam karein**.

## Dependencies And Their Work

Client dependencies:

| Package | Work |
| --- | --- |
| `react`, `react-dom` | UI rendering. |
| `react-router-dom` | Frontend routes/pages. |
| `axios` | Backend API calls. |
| `framer-motion` | Animations. |
| `react-markdown` | Markdown notes render. |
| `remark-gfm` | Tables/checklists GitHub markdown support. |

Client dev dependencies:

| Package | Work |
| --- | --- |
| `vite`, `@vitejs/plugin-react` | Dev server and production build. |
| `tailwindcss`, `postcss`, `autoprefixer` | Styling pipeline. |
| `eslint`, React ESLint plugins | Code linting. |

Server dependencies:

| Package | Work |
| --- | --- |
| `express` | API server. |
| `mongoose` | MongoDB models and queries. |
| `dotenv` | Loads `.env`. |
| `cors` | Allows frontend origin. |
| `helmet` | Security headers. |
| `express-rate-limit` | API/auth/AI rate limiting. |
| `jsonwebtoken` | Login tokens. |
| `bcryptjs` | Password hashing. |
| `multer` | PDF/DOCX/PPTX/TXT/resource upload handling. |
| `mammoth` | DOCX text extraction. |
| `officeparser` | PPTX/Office text extraction. |
| `@google/genai` | Gemini AI calls. |
| `youtube-transcript` | YouTube transcript fetch. |
| `nodemailer` | OTP verification/password reset email. |
| `razorpay` | Razorpay checkout/payment. |
| `stripe` | Legacy optional Stripe support. |

Server dev dependencies:

| Package | Work |
| --- | --- |
| `nodemon` | Auto restart server in dev. |
| `eslint` | Backend linting. |

## Full App Working

**Store-first journey:**

1. Koi bhi visitor `/store` par notes/papers/books/combos university, degree, course code, exam, topic se browse karta hai (login zaroori nahi).
2. Search (Landing free-text ya StoreHome University+category), category tiles, "shop by degree" grid, aur strips: Free first, Most downloaded, Just added, Recently viewed, Recommended for you se discovery hoti hai.
3. Free material instant download; premium item ya cart/combo par checkout — UPI/cards via Razorpay.
4. Account banane ke liye register → **OTP email verify** → real account ban-ta hai. Khareeda hua material "My downloads" me hamesha rehta hai.

**AI add-ons (dashboard ke andar, bonus free):**

5. Dashboard se user file upload karta hai (PDF, DOCX, PPTX, TXT) ya link/text/YouTube deta hai.
6. Backend content prepare karta hai (PDF bytes; DOCX/PPTX/TXT text me extract; website text, ya YouTube transcript), Gemini se notes + flashcards generate hote hain, document MongoDB me save hota hai.
7. User notes read karta hai, listen mode/mind map use karta hai, quiz generate/submit karta hai.
8. Tutor chat document context me, aur Ask page saare documents se relevant content nikal kar answer deta hai (RAG/lexical retrieval).
9. Analytics quiz scores, streaks aur study activity dikhata hai.

**Admin:**

10. Admin users, store catalog/resources/combos/orders, content, billing/plans, AI keys/usage, audit logs, rate limits aur **feature toggles** manage karta hai.

## AI Working

- Env keys: `GEMINI_API_KEY` and `GEMINI_API_KEYS`.
- Admin keys: MongoDB me encrypted save hote hain (`ENCRYPTION_SECRET` encrypt/decrypt karta hai).
- AI call ke time key pool se least-loaded key choose hoti hai.
- Key fail/quota/temporary error par next key try hoti hai.
- Large documents chunking pipeline use kar sakte hain.
- Gemini output JSON/markdown clean karke app me save hota hai.
- RAG: `RAG_ENABLED`/`RAG_VECTOR_INDEX` se Atlas vector search; disabled ho to lexical fallback.

## Complete Current Folder Structure - Har File Ka Use

Yeh section current repo scan ke hisaab se hai. Isme root, docs, client, aur server ki har important file ka kaam simple words me diya hai.

### Root And Docs

| File/Folder | Use |
| --- | --- |
| `README.md` | Project guide, commands, structure, file working. |
| `package.json` | Root scripts: install all, run client/server, dev, seed, seed:data, lint. |
| `package-lock.json` | Root npm dependency lock file. |
| `.env.example` | Backend/root environment variables ka sample. |
| `dev.mjs` | Client aur server ko ek command se start karta hai; real URLs print + free port fallback. |
| `start-dev.bat` | Windows shortcut for dev start. |
| `render.yaml` | Render deployment blueprint for backend. |
| `proble.md` | Project notes/problem scratch file. |
| `docs/VECTOR_SEARCH_SETUP.md` | MongoDB Atlas Vector Search setup, embedding backfill, RAG explanation. |
| `client/` | React frontend app. |
| `server/` | Express backend API. |

### Client Root Files

| File | Use |
| --- | --- |
| `client/package.json` | Frontend scripts and dependencies. |
| `client/package-lock.json` | Frontend dependency lock file. |
| `client/index.html` | Vite HTML entry jahan React app mount hota hai. |
| `client/vite.config.js` | Vite config, dev server, API proxy. |
| `client/tailwind.config.js` | Tailwind theme/content config. |
| `client/postcss.config.js` | Tailwind/autoprefixer CSS pipeline config. |
| `client/eslint.config.js` | Frontend lint rules. |
| `client/firebase.json` | Firebase hosting deploy config. |
| `client/.env.example` | Frontend `VITE_API_URL` sample. |
| `client/public/favicon.svg` | Browser tab icon. |
| `client/public/manifest.webmanifest` | PWA/install metadata. |
| `client/public/sw.js` | Service worker/offline install support. |

### Client Entry, API, Config

| File | Use |
| --- | --- |
| `client/src/main.jsx` | React root render karta hai; providers app ke around lagte hain. |
| `client/src/App.jsx` | Saare frontend routes, protected routes, admin/feature route gates. |
| `client/src/index.css` | Global CSS, Tailwind layers, theme variables, reusable styles. |
| `client/src/api/client.js` | Axios instance; API base URL set karta hai; auth token headers attach karta hai. |
| `client/src/config/developer.js` | Developer/admin-facing constants and feature config. |
| `client/src/config/detailLevel.js` | Notes detail level options. |
| `client/src/config/languages.js` | Output language options. |
| `client/src/config/uploadTypes.js` | Allowed upload/resource type config shared with UI. |

### Client Context, Hooks, Lib, Utils

| File | Use |
| --- | --- |
| `client/src/context/AuthContext.jsx` | Login user state, token, permissions, auth API helpers. |
| `client/src/context/CartContext.jsx` | Store cart state and cart actions. |
| `client/src/context/ConfirmContext.jsx` | Confirm dialog state/actions. |
| `client/src/context/ThemeContext.jsx` | Theme/color mode state. |
| `client/src/context/ToastContext.jsx` | Toast notification state. |
| `client/src/hooks/useSpeech.js` | Browser text-to-speech hook for listen/audio features. |
| `client/src/lib/razorpay.js` | Loads/opens Razorpay checkout script on frontend. |
| `client/src/lib/storeCategories.js` | Store category metadata/helpers (`STORE_CATEGORIES`). |
| `client/src/lib/storeConfig.js` | Store display/config constants. |
| `client/src/lib/useStorefront.js` | Storefront data fetching/filtering helpers (features, WhatsApp/social, support email). |
| `client/src/lib/recentlyViewed.js` | localStorage-only browsing history (`ng_recently_viewed`, max 12); `getRecentlyViewed()`, `recordView()`, `viewedResourceTypes()`. Powers "Recently viewed" + "Recommended for you". No backend/account. |
| `client/src/utils/objectId.js` | Mongo ObjectId validation/normalization helpers. |
| `client/src/utils/parseNoteSections.js` | Markdown notes ko sections/headings me split karta hai. |
| `client/src/utils/printExport.jsx` | Print/export helpers for notes/resources. |
| `client/src/utils/quota.js` | Plan quota/usage display helpers. |
| `client/src/utils/sourceMeta.jsx` | Source badges/icons/labels for uploaded/link resources. |
| `client/src/utils/textClean.js` | Text cleanup and formatting helpers. |

### Client Components

| File | Use |
| --- | --- |
| `client/src/components/AdminLayout.jsx` | Admin sidebar/layout wrapper. |
| `client/src/components/AdminStatCard.jsx` | Admin dashboard stat card. |
| `client/src/components/AdminTableToolbar.jsx` | Admin table filters/search/actions toolbar. |
| `client/src/components/AudioPlayer.jsx` | Audio/listen controls. |
| `client/src/components/AuthShell.jsx` | Login/register/reset layout shell. |
| `client/src/components/CommandPalette.jsx` | Keyboard command/search palette. |
| `client/src/components/Credit.jsx` | Credit/usage badge display. |
| `client/src/components/EmailVerificationBanner.jsx` | Email verification reminder UI. |
| `client/src/components/FlashcardUI.jsx` | Single flashcard display/interactions. |
| `client/src/components/Flashcards.jsx` | Flashcards list/review/generation UI. |
| `client/src/components/FormField.jsx` | Reusable input/label/error field. |
| `client/src/components/GenerationOverlay.jsx` | AI generation loading/progress overlay. |
| `client/src/components/InstallButton.jsx` | PWA install button. |
| `client/src/components/Layout.jsx` | Protected app layout; grouped sidebar nav (Workspace/Store/Account/Manage) + 5-item mobile bottom bar. |
| `client/src/components/Logo.jsx` | App logo component. |
| `client/src/components/MarkdownContent.jsx` | Markdown renderer for notes/content. |
| `client/src/components/MarketingShell.jsx` | Public marketing/legal page shell (Landing, Terms, Privacy, Refund). |
| `client/src/components/MindMap.jsx` | Notes sections ka mind map view. |
| `client/src/components/NotesReveal.jsx` | Notes reveal/progressive display UI. |
| `client/src/components/NotesTOC.jsx` | Notes table of contents. |
| `client/src/components/OnboardingWizard.jsx` | First-login onboarding flow. |
| `client/src/components/OtpInput.jsx` | OTP code input boxes. |
| `client/src/components/StoreLayout.jsx` | Public store layout, header/footer, outlet; env-driven WhatsApp/social links. |
| `client/src/components/TagInput.jsx` | Tags add/remove input. |
| `client/src/components/ThemePicker.jsx` | Theme selector UI. |
| `client/src/components/TutorChat.jsx` | AI tutor chat UI. |
| `client/src/components/icons.jsx` | Shared SVG/icon components. |
| `client/src/components/motion.jsx` | Shared animation helpers. |
| `client/src/components/ui.jsx` | Shared buttons, cards, loaders, empty states, skeletons. |
| `client/src/components/admin/CustomPlanForm.jsx` | Admin custom billing plan form. |
| `client/src/components/store/ResourceCard.jsx` | Store resource/course card. |
| `client/src/components/store/ResultsGrid.jsx` | Store search/category grid layout. |

### Client Pages - App/Auth/Legal

| File | Use |
| --- | --- |
| `client/src/pages/Landing.jsx` | Store-first public landing/home page. |
| `client/src/pages/Login.jsx` | Login form. |
| `client/src/pages/Register.jsx` | Register form (starts OTP signup). |
| `client/src/pages/VerifyEmail.jsx` | Email/OTP verification page. |
| `client/src/pages/ForgotPassword.jsx` | Forgot password request page. |
| `client/src/pages/ResetPassword.jsx` | Reset password page. |
| `client/src/pages/Dashboard.jsx` | Main user dashboard. |
| `client/src/pages/Upload.jsx` | File/link upload and AI generation (feature `upload`). |
| `client/src/pages/DocumentView.jsx` | Single document notes, flashcards, quiz, tutor, mind map. |
| `client/src/pages/Review.jsx` | Due flashcards review page. |
| `client/src/pages/Ask.jsx` | Global Ask across user notes/resources (feature `askAi`). |
| `client/src/pages/QuizView.jsx` | Quiz attempt/results page. |
| `client/src/pages/Analytics.jsx` | Study analytics and streaks (feature `analytics`). |
| `client/src/pages/Profile.jsx` | User profile/account settings. |
| `client/src/pages/Workspaces.jsx` | Workspace list/management (feature `workspaces`). |
| `client/src/pages/WorkspaceDetail.jsx` | One workspace with documents/resources. |
| `client/src/pages/Pricing.jsx` | Public pricing/plans page. |
| `client/src/pages/Checkout.jsx` | Payment checkout page. |
| `client/src/pages/Billing.jsx` | User billing/subscription + purchase-history section (feature `billing`). |
| `client/src/pages/ShareView.jsx` | Public shared note view by token. |
| `client/src/pages/ResourceDetail.jsx` | Store resource detail/download page (records recently-viewed). |
| `client/src/pages/MyDownloads.jsx` | Purchased/downloadable resources page. |
| `client/src/pages/Terms.jsx` | Terms page. |
| `client/src/pages/Privacy.jsx` | Privacy page. |
| `client/src/pages/Refund.jsx` | Refund & Billing Policy page (MarketingShell); footer-linked. |
| `client/src/pages/Catalog.jsx` | Older catalog page/redirect support. |
| `client/src/pages/CourseResources.jsx` | Older course resources view/support. |

### Client Pages - Store

| File | Use |
| --- | --- |
| `client/src/pages/store/About.jsx` | Store/about page. |
| `client/src/pages/store/Cart.jsx` | Shopping cart page. |
| `client/src/pages/store/ComboDetail.jsx` | Combo detail page. |
| `client/src/pages/store/CombosList.jsx` | Combos listing page. |
| `client/src/pages/store/Contact.jsx` | Contact page. |
| `client/src/pages/store/FAQ.jsx` | FAQ page. |
| `client/src/pages/store/HowToBuy.jsx` | Buying instructions page. |
| `client/src/pages/store/StoreCategory.jsx` | Store category listing. |
| `client/src/pages/store/StoreCourse.jsx` | Course detail page. |
| `client/src/pages/store/StoreHome.jsx` | Store homepage; search, strips (Recently viewed, Recommended, Free first, Popular, Latest). |
| `client/src/pages/store/StoreSearch.jsx` | Store search results; sort + "Free only" toolbar (default free-first). |
| `client/src/pages/store/Support.jsx` | Support page. |

### Client Pages - Admin

| File | Use |
| --- | --- |
| `client/src/pages/admin/AdminOverview.jsx` | Admin dashboard overview. |
| `client/src/pages/admin/AdminUsers.jsx` | Users list/admin user actions. |
| `client/src/pages/admin/AdminUserDetail.jsx` | Single user detail/admin actions. |
| `client/src/pages/admin/AdminUsage.jsx` | AI usage/cost/rate analytics (admin only). |
| `client/src/pages/admin/AdminSettings.jsx` | AI keys, model, limits, app settings, **feature toggles** (admin only). |
| `client/src/pages/admin/AdminContent.jsx` | Documents/quizzes/chat/share content management. |
| `client/src/pages/admin/AdminBilling.jsx` | Plans, pricing, payments billing admin (admin only). |
| `client/src/pages/admin/AdminCatalog.jsx` | Universities/programs/courses catalog admin. |
| `client/src/pages/admin/AdminResources.jsx` | Store resources admin. |
| `client/src/pages/admin/AdminCombos.jsx` | Store combo bundles admin. |
| `client/src/pages/admin/AdminOrders.jsx` | Orders/purchases admin. |

### Server Root And Config

| File | Use |
| --- | --- |
| `server/package.json` | Backend scripts and dependencies. |
| `server/package-lock.json` | Backend dependency lock file. |
| `server/eslint.config.js` | Backend lint rules. |
| `server/tests/api.test.js` | Backend unit/API helper tests. |
| `server/src/index.js` | Express app start, middleware, routes, DB connect, inline `/api/health` endpoint. |
| `server/src/config/db.js` | MongoDB connection helper. |
| `server/src/config/detailLevel.js` | Notes detail levels and flashcard count rules. |
| `server/src/config/env.js` | Env loading, defaults, validation, CORS URLs. |
| `server/src/config/languages.js` | Supported output languages. |
| `server/src/config/observability.js` | Request logging and optional monitoring setup. |
| `server/src/config/permissions.js` | Staff/admin granular permission definitions. |
| `server/src/config/plans.js` | Plan limits, usage limits, plan summaries. |
| `server/src/config/sampleDocument.js` | Sample/demo document content. |
| `server/src/config/uploadTypes.js` | Allowed upload/resource MIME/type config. |

### Server Routes

| File | Use |
| --- | --- |
| `server/src/routes/admin.js` | Admin API for users, settings, content, billing, catalog, audit. |
| `server/src/routes/auth.js` | Register (OTP), login, verify-email, resend-verification (public), password reset, profile routes. |
| `server/src/routes/billing.js` | Billing status, order creation, payment verify, webhook routes. |
| `server/src/routes/catalog.js` | Public/admin catalog, courses, resources, combos, storefront, purchases/downloads. |
| `server/src/routes/documents.js` | Upload/link/text/document/flashcard/share/regenerate routes. |
| `server/src/routes/quiz.js` | Quiz create/get/submit/analytics routes. |
| `server/src/routes/share.js` | Public share-token route. |
| `server/src/routes/tutor.js` | Document + global tutor routes (whole router `requireFeature('askAi')`). |
| `server/src/routes/workspaces.js` | Workspace CRUD/membership (whole router `requireFeature('workspaces')`). |

### Server Controllers

| File | Use |
| --- | --- |
| `server/src/controllers/adminController.js` | Admin dashboard, users, AI keys, settings, content, usage, audit actions. |
| `server/src/controllers/authController.js` | Register (PendingSignup/OTP), verify-email, resend, login/email/profile/password/account logic. |
| `server/src/controllers/billingController.js` | Billing config, usage, order, payment verification, portal/webhook logic. |
| `server/src/controllers/catalogController.js` | Catalog/storefront public data and admin catalog actions. |
| `server/src/controllers/comboController.js` | Combo bundle create/update/delete/list logic. |
| `server/src/controllers/documentController.js` | Upload/link/text/list/read/update/share/regenerate/delete document logic. |
| `server/src/controllers/marketplaceController.js` | Store marketplace resource/course browsing helpers. |
| `server/src/controllers/quizController.js` | Quiz generation, retrieval, submit, analytics logic. |
| `server/src/controllers/resourceController.js` | Resource upload/download/admin/public resource logic. |
| `server/src/controllers/shareController.js` | Public shared document response logic. |
| `server/src/controllers/tutorController.js` | Tutor/global tutor chat and history logic. |
| `server/src/controllers/workspaceController.js` | Workspace list/create/update/delete and item organization logic. |

### Server Models

| File | Model → Collection | Use |
| --- | --- | --- |
| `server/src/models/AdminAuditLog.js` | `AdminAuditLog` → `adminauditlogs` | Admin action log records. |
| `server/src/models/ApiUsage.js` | `ApiUsage` → `apiusages` | AI usage, tokens, model, cost-like tracking. |
| `server/src/models/ChatMessage.js` | `ChatMessage` → `chatmessages` | Tutor/global chat history messages. |
| `server/src/models/Combo.js` | `Combo` → `combos` | Store combo/bundle model. |
| `server/src/models/Course.js` | `Course` → `courses` | Course model for catalog/store. |
| `server/src/models/Document.js` | `Document` → `documents` | Generated notes, flashcards, metadata, share data. |
| `server/src/models/DocumentChunk.js` | `DocumentChunk` → `documentchunks` | RAG/vector chunks and embeddings. |
| `server/src/models/PaymentEvent.js` | `PaymentEvent` → `paymentevents` | Razorpay/Stripe payment event records. |
| `server/src/models/PendingSignup.js` | `PendingSignup` → `pendingsignups` | Unverified signup (email, name, passwordHash, otpHash, otpExpires, attempts, lastSentAt, expiresAt). TTL index auto-removes abandoned signups. Verify par real User banta hai aur yeh delete hota hai. |
| `server/src/models/Program.js` | `Program` → `programs` | University program model. |
| `server/src/models/Purchase.js` | `Purchase` → `purchases` | User purchases/download access. |
| `server/src/models/Quiz.js` | `Quiz` → `quizzes` | Quiz questions/answers/explanations. |
| `server/src/models/QuizAttempt.js` | `QuizAttempt` → `quizattempts` | Quiz attempt score and selected answers. |
| `server/src/models/Resource.js` | `Resource` → `resources` | Store/admin resource file metadata. |
| `server/src/models/Settings.js` | `Settings` → `settings` | Admin settings, encrypted AI keys, limits, **feature flags**, app config. |
| `server/src/models/StudyActivity.js` | `StudyActivity` → `studyactivities` | Daily activity/streak records. |
| `server/src/models/University.js` | `University` → `universities` | University/category root model. |
| `server/src/models/User.js` | `User` → `users` | User account, auth, role, plan, usage, permissions. |
| `server/src/models/Workspace.js` | `Workspace` → `workspaces` | Workspace/folder organization model. |

> Note: koi bhi model explicit `collection:` set nahi karta, isliye sab collection names Mongoose ke default = lowercased + pluralized model name hain (e.g. `Quiz` → `quizzes`, `University` → `universities`, `ApiUsage` → `apiusages`).

### Server Middleware

| File | Use |
| --- | --- |
| `server/src/middleware/aiEnabled.js` | Checks AI availability/settings before AI routes (`requireAiEnabled`). |
| `server/src/middleware/aiRateLimit.js` | Admin-configurable AI rate limiting. |
| `server/src/middleware/auth.js` | JWT auth, admin/staff/permission guards. |
| `server/src/middleware/authRateLimit.js` | Login/register/password reset rate limits. |
| `server/src/middleware/errorHandler.js` | 404 and central error response handler. |
| `server/src/middleware/quota.js` | Plan quota checks before expensive actions. |
| `server/src/middleware/requireFeature.js` | `requireFeature(name)` guard; admin-disabled feature par 403 "This feature is currently unavailable." 30s cache + `invalidateFeatureCache()`. |
| `server/src/middleware/upload.js` | User study document upload handling/validation. |
| `server/src/middleware/uploadResource.js` | Store/admin resource upload handling/validation. |

### Server Services

| File | Use |
| --- | --- |
| `server/src/services/adminAudit.js` | Writes admin audit log entries. |
| `server/src/services/billingPricing.js` | Pricing/plan amount helpers from settings/env. |
| `server/src/services/documentGeneration.js` | Upload/link generation support and streaming helpers. |
| `server/src/services/email.js` | OTP verification and password reset email sending. |
| `server/src/services/fileExtractor.js` | Extracts text from uploaded files. |
| `server/src/services/fileStorage.js` | Resource/file storage paths and file lifecycle helpers. |
| `server/src/services/gemini.js` | Gemini prompts/calls for notes, flashcards, quiz, tutor, embeddings. |
| `server/src/services/geminiHelpers.js` | Gemini JSON parse, retry, fallback, error classification helpers. |
| `server/src/services/generationOrchestrator.js` | Coordinates multi-step AI generation and retries. |
| `server/src/services/keyBalancer.js` | Chooses best Gemini key and tracks key load/failures. |
| `server/src/services/keyCrypto.js` | Encrypts/decrypts admin-saved API keys. |
| `server/src/services/linkExtractor.js` | Extracts website text and YouTube transcripts. |
| `server/src/services/planCatalog.js` | Plan catalog and admin plan helpers. |
| `server/src/services/planExpiry.js` | Plan expiry/downgrade helper logic. |
| `server/src/services/rag.js` | RAG chunk embedding, vector/lexical retrieval, source context. |
| `server/src/services/razorpay.js` | Razorpay order/payment helper functions. |
| `server/src/services/retrieval.js` | Cross-document retrieval for Ask/tutor context. |
| `server/src/services/spacedRepetition.js` | Flashcard review scheduling. |
| `server/src/services/stripe.js` | Legacy optional Stripe helpers. |
| `server/src/services/studyStreak.js` | Daily study activity and streak calculations. |
| `server/src/services/workspaceAccess.js` | Workspace permission/access helper logic. |

### Server Utils And Scripts

| File | Use |
| --- | --- |
| `server/src/utils/dateKey.js` | Local date keys for streak/activity grouping. |
| `server/src/utils/documentTags.js` | Document tag cleanup/normalization. |
| `server/src/utils/notesChunk.js` | Large notes chunking/merging helpers. |
| `server/src/utils/objectId.js` | Mongo ObjectId validation helpers. |
| `server/src/utils/parseNoteSections.js` | Markdown notes section parser. |
| `server/src/utils/textClean.js` | Text cleanup/normalization helpers. |
| `server/src/scripts/seedData.js` | Seed admin/demo user (uses `ADMIN_*`/`USER_*`) and initial catalog/demo data. |
| `server/src/scripts/embedBackfill.js` | Creates embeddings for existing documents/resources for vector RAG. |

## Frontend Routes

| Route | Access | Page/Work |
| --- | --- | --- |
| `/` | Public | Home: logged-in users `/app` par redirect, warna Landing. |
| `/pricing` | Public | Pricing page. |
| `/checkout` | Auth | Protected checkout (login + verified email). |
| `/terms` | Public | Terms. |
| `/privacy` | Public | Privacy. |
| `/refund` | Public | Refund & Billing Policy. |
| `/share/:token` | Public | Read-only shared document. |
| `/verify-email` | Public | Email/OTP verification (reads `?email=`). |
| `/login` | Public | Login (authed users redirect). |
| `/register` | Public | Register (starts OTP signup). |
| `/forgot-password` | Public | Forgot password. |
| `/reset-password` | Public | Reset password from token. |
| `/app` | Auth | Dashboard. |
| `/upload` | Auth | Upload PDF/link/text (feature `upload`). |
| `/review` | Auth | Flashcard review. |
| `/ask` | Auth | Cross-document AI tutor (feature `askAi`). |
| `/document/:id` | Auth | Document details. |
| `/quiz/:id` | Auth | Quiz page. |
| `/analytics` | Auth | Analytics (feature `analytics`). |
| `/workspaces` | Auth | Workspaces list (feature `workspaces`). |
| `/workspaces/:id` | Auth | Workspace detail (feature `workspaces`). |
| `/profile` | Auth | Profile. |
| `/billing` | Auth | User billing (feature `billing`). |
| `/catalog` | Public | Legacy redirect → `/store`. |
| `/catalog/courses/:id` | Public | Legacy redirect → `/store`. |
| `/my-downloads` | Auth | Purchased/downloaded resources. |
| `/store` | Public | Store home (StoreLayout outlet). |
| `/store/search` | Public | Store search results. |
| `/store/cart` | Public | Cart. |
| `/store/combos` | Public | Combos list. |
| `/store/combos/:id` | Public | Combo detail. |
| `/store/course/:id` | Public | Course detail. |
| `/store/how-to-buy` | Public | Buying guide. |
| `/store/:category` | Public | Store category page. |
| `/resources/:id` | Public | Resource detail. |
| `/about` | Public | About page. |
| `/faq` | Public | FAQ page. |
| `/contact` | Public | Contact page. |
| `/support` | Public | Support page. |
| `/admin` | Admin/Staff | Admin shell (index = AdminOverview). |
| `/admin/usage` | Admin | Usage & cost analytics (admin only). |
| `/admin/users` | Admin/Staff | Users list. |
| `/admin/users/:id` | Admin/Staff | User detail. |
| `/admin/catalog` | Admin | Redirect → `/admin/catalog/universities`. |
| `/admin/catalog/:section` | Admin | Catalog management (perm `manage_catalog`). |
| `/admin/resources` | Admin | Resource management (perm `manage_resources`). |
| `/admin/combos` | Admin | Combos management (perm `manage_combos`). |
| `/admin/orders` | Admin | Orders management (perm `manage_orders`). |
| `/admin/content` | Admin | Redirect → `/admin/content/materials`. |
| `/admin/content/:section` | Admin/Staff | Content moderation (documents/quizzes/chat/shares). |
| `/admin/billing` | Admin | Redirect → `/admin/billing/pricing`. |
| `/admin/billing/:section` | Admin | Billing/pricing/plans (admin only). |
| `/admin/settings` | Admin | Redirect → `/admin/settings/keys`. |
| `/admin/settings/:section` | Admin | System settings, API keys, **feature toggles** (admin only). |
| `*` | Public | 404 Not Found. |

## Backend API Routes

Health:

- `GET /api/health` — server + DB connection status (inline in `index.js`).

Auth:

- `POST /api/auth/register` — OTP signup; creates `PendingSignup`, returns `{ needsVerification, email }` (no token, no user).
- `POST /api/auth/login`
- `POST /api/auth/verify-email` — verify OTP, creates real `User`, returns user + token.
- `POST /api/auth/resend-verification` — **PUBLIC** (body `{ email }`), 45s cooldown.
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `POST /api/auth/onboarding/complete`
- `PUT /api/auth/profile`
- `PUT /api/auth/password`
- `DELETE /api/auth/account`

Documents (whole router `requireAuth`; AI ops add `requireAiEnabled` + AI rate-limit; create routes add `requireQuota('documents')`):

- `GET /api/documents/review/due`
- `GET /api/documents/folders/list`
- `POST /api/documents/upload` and `/upload/stream`
- `POST /api/documents/link` and `/link/stream`
- `POST /api/documents/text` and `/text/stream`
- `POST /api/documents/sample`
- `GET /api/documents`
- `GET /api/documents/:id`
- `PATCH /api/documents/:id/meta`
- `PATCH /api/documents/:id/workspace`
- `POST /api/documents/:id/share`
- `POST /api/documents/:id/flashcards/generate`
- `DELETE /api/documents/:id/flashcards`
- `PATCH /api/documents/:id/flashcards/:cardId`
- `DELETE /api/documents/:id/flashcards/:cardId`
- `POST /api/documents/:id/flashcards/:cardId/rate`
- `POST /api/documents/:id/regenerate`
- `DELETE /api/documents/:id`

Quiz (whole router `requireAuth`; create gated by `requireAiEnabled` + AI rate-limit + `requireQuota('quizzes')`):

- `GET /api/quiz/analytics/overview`
- `POST /api/quiz/document/:documentId`
- `GET /api/quiz/:id`
- `POST /api/quiz/:id/submit`

Tutor (whole router `requireFeature('askAi')` + `requireAuth`; chat adds AI gates + `requireQuota('tutorMessages')`):

- `GET /api/tutor/global/history`
- `DELETE /api/tutor/global/history`
- `POST /api/tutor/global`
- `GET /api/tutor/:documentId/history`
- `DELETE /api/tutor/:documentId/history`
- `POST /api/tutor/:documentId`

Workspaces (whole router `requireAuth` + `requireFeature('workspaces')`):

- `POST /api/workspaces` (create), `GET /api/workspaces` (list), `POST /api/workspaces/join`
- `GET|PATCH|DELETE /api/workspaces/:id`, `POST /api/workspaces/:id/leave`, `POST /api/workspaces/:id/regenerate-code`
- `DELETE /api/workspaces/:id/members/:userId`, `GET /api/workspaces/:id/documents`

Catalog/store:

- Public browse (no auth): `GET /api/catalog/storefront`, `/universities`, `/universities/:id/programs`, `/programs/flat`, `/programs/:id/courses`, `/resources` (search; supports `sort=popular|latest|price_low|price_high|free_first` and `price=free|paid`), `/combos`, `/combos/:id`, `/resources/:id`.
- Marketplace (auth): `POST /api/catalog/resources/order`, `/resources/verify`, `/cart/order`, `/cart/verify`, `GET /api/catalog/me/purchases`, `GET /api/catalog/resources/:id/download`.

Billing:

- Public: `GET /api/billing/public-config`, `POST /api/billing/webhook` (Stripe; raw body before JSON parser).
- Auth: `GET /api/billing/status`, `GET /api/billing/usage`, `POST /api/billing/create-order`, `POST /api/billing/verify-payment`, `POST /api/billing/portal`.

Share:

- `GET /api/share/:token` — public read-only shared document.

Admin (`/api/admin/...`, whole router `requireAuth` + per-route role/permission gates): stats, users, billing/pricing/plans, settings, API keys, models, content moderation, usage, audit logs, plus `manage_catalog`/`manage_resources`/`manage_combos`/`manage_orders` permission routes.

## Database Collections

- `users`
- `pendingsignups` (unverified OTP signups; TTL auto-cleanup)
- `documents`
- `documentchunks` (RAG vector/lexical chunks)
- `quizzes`
- `quizattempts`
- `chatmessages`
- `studyactivities`
- `workspaces`
- `settings` (includes feature flags + encrypted AI keys)
- `apiusages`
- `paymentevents`
- `adminauditlogs`
- `universities`
- `programs`
- `courses`
- `resources`
- `combos`
- `purchases`

## Security

- Passwords bcrypt se hash hote hain.
- JWT sessions use hote hain.
- Signup OTP-verified hai: account sirf OTP verify hone par banta hai (unverified junk DB me nahi rehta; TTL auto-cleanup).
- OTP `crypto.randomInt` se, hashed store hota hai; 5 wrong attempts par signup discard; resend 45s cooldown.
- Admin routes role/permission-protected hain; feature flags disabled features ko block karte hain.
- Helmet security headers enabled hain.
- CORS only allowed frontend origins (`CLIENT_URL`) ko allow karta hai.
- Auth/API/AI rate limits hain.
- Plan quota middleware hai.
- Upload validation (study docs aur store resources dono) hai.
- Admin saved Gemini keys encrypted hain (`ENCRYPTION_SECRET`).
- Central error handler use hota hai.

## Razorpay Test Payment

UPI:

```text
success@razorpay
failure@razorpay
```

Cards:

| Network | Card |
| --- | --- |
| Visa | `4111 1111 1111 1111` |
| Mastercard | `5267 3181 8797 5449` |

Expiry future date, CVV koi bhi 3 digits.

## Common Problems

Port busy (local .env ports — 5001 backend / 3000 frontend in this setup; defaults are 5000/5173 with no .env):

```powershell
netstat -ano | findstr ":5001"
taskkill /PID <PID> /F
```

`dev.mjs` busy port par next free port pick karke real URL print kar deta hai.

MongoDB issue:

- `MONGO_URI` check karein (placeholder na ho).
- Atlas Network Access me apna IP allow karein.
- Local MongoDB use kar rahe hain to service running honi chahiye.

Gemini issue:

- `GEMINI_API_KEY` valid rakhein (ya admin UI me set karein).
- Admin panel me key test karein.
- Quota exceed ho to wait karein ya different project/account key use karein.

Email/OTP issue:

- SMTP details check karein (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`/`EMAIL_FROM`).
- Gmail ke liye app password use karein.
- OTP nahi aaya to Resend use karein (45s cooldown); abandoned signup ~24h me auto-expire ho jata hai.

"This feature is currently unavailable":

- Admin → Settings → Features me wo flag enable karein (upload/askAi/analytics/billing/store/workspaces).

Admin issue:

- `npm run seed` run karein.
- Admin account se login karein.

Frontend API issue:

- Backend running hai ya nahi check karein.
- `CLIENT_URL` correct hai ya nahi check karein.
- Production me `VITE_API_URL` set karein.

## Deployment

Backend on Render:

- Config file: `render.yaml`
- Root dir: `server`
- Build: `npm install`
- Start: `npm start`
- Secrets Render dashboard me set karein.

Frontend on Firebase:

```bash
npm run build --prefix client
npm run deploy --prefix client
```

Production frontend env:

```text
VITE_API_URL=https://your-backend-domain.com/api
```

## First Time Setup Checklist

1. Node.js 18+ install karein.
2. MongoDB Atlas cluster ready karein.
3. Gemini API key ready karein (optional; admin UI me bhi set ho sakti hai).
4. `.env.example` copy karke `.env` banayein.
5. `MONGO_URI`, `JWT_SECRET`, `ENCRYPTION_SECRET`, `GEMINI_API_KEY` fill karein; OTP ke liye SMTP set karein.
6. `npm run install:all` run karein.
7. `npm run seed` run karein (alias `npm run seed:data` same hi script hai — users AUR catalog/demo data dono seed karta hai).
8. `npm run dev` run karein.
9. Terminal me printed frontend URL open karein.
10. Admin login karke AI key/settings/feature toggles test karein.

## Tests

Server tests cover:

- Plan limits and usage summary.
- Spaced repetition.
- Gemini error/failover/model fallback helpers.
- Detail level and flashcard count helpers.
- Large notes chunking.
- Markdown note section parsing.
- JSON extraction helpers.
- Date/streak helpers.
- Key balancer.
- Generation retry helper.
- Cross-document retrieval.

Run:

```bash
npm test --prefix server
```

## Short Flow

```text
Store (public): browse notes/papers/books/combos by university/degree/course/exam/topic
  -> Free download instantly, ya cart/combo -> Razorpay (UPI/cards) -> My downloads
  -> Register -> OTP email verify -> real account banta hai
  -> Dashboard AI add-ons (bonus, free): Upload PDF/link/text
      -> Backend extracts content -> Gemini notes/flashcards/quiz/tutor -> MongoDB
      -> Ask AI, mind map, listen mode, analytics/streaks
  -> Admin: store catalog/resources/combos/orders, users, billing, usage, AI keys, feature toggles
```
