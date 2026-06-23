# NoteGenie

NoteGenie ek MERN study assistant app hai. User PDF upload kar sakta hai, web article ya YouTube link paste kar sakta hai, aur app us content se AI notes, flashcards, quizzes, mind map, aur tutor chat generate karta hai.

Frontend React + Vite me hai, backend Express + MongoDB me hai, aur AI Google Gemini API se chalta hai.

## Main Features

- PDF, web article, aur YouTube link se notes generation.
- Notes ke sath key takeaways aur glossary.
- Output language selection.
- Flashcards with spaced repetition review.
- Quiz generation with score, correct answers, explanations.
- Per-document AI tutor chat.
- Ask page for cross-document AI questions.
- Mind map view for note sections.
- Browser text-to-speech listen mode.
- Dashboard, analytics, streaks, daily goal.
- Tags, folders, public share links.
- JWT login/register, email verification, password reset.
- Razorpay billing and admin-managed plans.
- Admin panel for users, content, billing, AI keys, usage, audit logs, rate limits.

## Tech Stack

Frontend: React 18, Vite, React Router, Tailwind CSS, Axios, Framer Motion, React Markdown, Remark GFM.

Backend: Node.js 18+, Express, MongoDB, Mongoose, JWT, bcrypt, Multer, Helmet, CORS, Express Rate Limit, Nodemailer, Razorpay, Stripe legacy optional, YouTube Transcript, Google Gemini.

Tooling: ESLint, Prettier commands, Node test runner, Render backend blueprint, Firebase hosting config.

## Folder Structure

```text
NoteGenie/
  README.md                    Project documentation
  package.json                 Root scripts for client/server
  package-lock.json            Root npm lock file
  dev.mjs                      Starts server and client together
  start-dev.bat                Windows dev starter
  .env.example                 Root/backend env sample
  render.yaml                  Render backend deployment config
  proble.md                    Project notes/problem file
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
    src/config/                Languages/detail/developer constants
    src/context/               Auth, toast, theme, confirm providers
    src/hooks/                 Custom hooks like speech
    src/pages/                 Main app pages
    src/pages/admin/           Admin pages
    src/components/            Shared UI components
    src/components/admin/      Admin-only components
    src/utils/                 Client helper functions
  server/                      Express backend
    package.json               Backend scripts/dependencies
    eslint.config.js           Backend lint config
    tests/api.test.js          Backend tests
    src/index.js               Express entry point
    src/config/                Env, DB, plans, languages, observability
    src/routes/                API route definitions
    src/controllers/           Request business logic
    src/models/                Mongoose schemas
    src/middleware/            Auth, upload, quota, rate-limit, errors
    src/services/              AI, billing, email, retrieval, streak, etc.
    src/utils/                 Shared backend helpers
    src/scripts/seedData.js    Seed admin/demo users
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

Seed admin/demo accounts:

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

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health: `http://localhost:5000/api/health`

`dev.mjs` agar port busy ho to next free port pick karta hai. Terminal me final URL check karein.

## Environment Variables

Root `.env.example` ko `.env` me copy karke fill karein.

| Key | Working |
| --- | --- |
| `PORT` | Backend API port. Empty ho to 5000. |
| `CLIENT_PORT` | Frontend Vite port. Empty ho to 5173. |
| `NODE_ENV` | `development` ya `production`. |
| `CLIENT_URL` | Frontend URL for CORS. |
| `MONGO_URI` | MongoDB connection string. |
| `JWT_SECRET` | JWT token signing secret. Strong random value use karein. |
| `JWT_EXPIRES_IN` | Token expiry, example `7d`. |
| `GEMINI_API_KEY` | Main Gemini API key. |
| `GEMINI_API_KEYS` | Extra Gemini keys, comma separated. |
| `GEMINI_MODEL` | Gemini model, example `gemini-2.5-flash`. |
| `ENCRYPTION_SECRET` | Admin saved API keys encrypt/decrypt karne ke liye. Change na karein after saving keys. |
| `SMTP_HOST` | Email server host. |
| `SMTP_PORT` | Email server port, usually 587. |
| `SMTP_USER` | SMTP username. |
| `SMTP_PASS` | SMTP password/app password. |
| `EMAIL_FROM` | Email sender name/address. |
| `RAZORPAY_KEY_ID` | Razorpay key id. |
| `RAZORPAY_KEY_SECRET` | Razorpay secret. |
| `RAZORPAY_PRO_AMOUNT` | Pro amount in paise. |
| `RAZORPAY_TEAM_AMOUNT` | Team amount in paise. |
| `STRIPE_SECRET_KEY` | Optional legacy Stripe secret. |
| `STRIPE_WEBHOOK_SECRET` | Optional legacy Stripe webhook secret. |
| `STRIPE_PRICE_PRO` | Optional legacy Stripe Pro price. |
| `STRIPE_PRICE_TEAM` | Optional legacy Stripe Team price. |
| `ADMIN_EMAIL` | Seed admin email. |
| `ADMIN_PASSWORD` | Seed admin password. |
| `ADMIN_NAME` | Seed admin name. |
| `USER_EMAIL` | Seed demo user email. |
| `USER_PASSWORD` | Seed demo user password. |
| `USER_NAME` | Seed demo user name. |
| `SUPPORT_EMAIL` | Support email shown in app. |
| `AI_RATE_LIMIT_MAX` | AI request limit. |
| `AI_RATE_LIMIT_WINDOW_MIN` | AI limit window in minutes. |
| `SENTRY_DSN` | Optional monitoring DSN. |

Client production env:

```text
VITE_API_URL=https://your-backend-domain.com/api
```

Local development me normally client env file ki zaroorat nahi hoti because Vite proxy `/api` requests backend ko bhejta hai.

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
| `multer` | PDF upload handling. |
| `@google/genai` | Gemini AI calls. |
| `youtube-transcript` | YouTube transcript fetch. |
| `nodemailer` | Email verification/password reset. |
| `razorpay` | Razorpay checkout/payment. |
| `stripe` | Legacy optional Stripe support. |

Server dev dependencies:

| Package | Work |
| --- | --- |
| `nodemon` | Auto restart server in dev. |
| `eslint` | Backend linting. |

## Full App Working

1. User register/login karta hai.
2. Email verify hone ke baad protected app pages open hote hain.
3. User PDF upload karta hai ya link paste karta hai.
4. Backend content prepare karta hai: PDF bytes, website text, ya YouTube transcript.
5. Gemini se notes generate hote hain.
6. Flashcards generate hote hain.
7. Document MongoDB me save hota hai.
8. User notes read kar sakta hai, listen mode use kar sakta hai, mind map dekh sakta hai.
9. User quiz generate/submit kar sakta hai.
10. Tutor chat document ke context me answer deta hai.
11. Ask page saare documents se relevant content nikal kar answer deta hai.
12. Analytics quiz scores, streaks, aur study activity dikhata hai.
13. Admin users, AI keys, content, billing, usage, aur settings manage karta hai.

## AI Working

- Env keys: `GEMINI_API_KEY` and `GEMINI_API_KEYS`.
- Admin keys: MongoDB me encrypted save hote hain.
- `ENCRYPTION_SECRET` admin keys encrypt/decrypt karta hai.
- AI call ke time key pool se key choose hoti hai.
- Key fail/quota/temporary error par next key try hoti hai.
- Large documents chunking pipeline use kar sakte hain.
- Gemini output JSON/markdown clean karke app me save hota hai.

## Frontend Routes

| Route | Page/Work |
| --- | --- |
| `/` | Landing or redirect to app. |
| `/pricing` | Pricing page. |
| `/checkout` | Protected checkout. |
| `/terms` | Terms. |
| `/privacy` | Privacy. |
| `/share/:token` | Public shared document. |
| `/verify-email` | Email verification. |
| `/login` | Login. |
| `/register` | Register. |
| `/forgot-password` | Forgot password. |
| `/reset-password` | Reset password. |
| `/app` | Dashboard. |
| `/upload` | Upload PDF/link. |
| `/review` | Flashcard review. |
| `/ask` | Cross-document tutor. |
| `/document/:id` | Document details. |
| `/quiz/:id` | Quiz page. |
| `/analytics` | Analytics. |
| `/profile` | Profile. |
| `/billing` | User billing. |
| `/admin` | Admin dashboard. |
| `/admin/usage` | Admin usage. |
| `/admin/users` | Admin users. |
| `/admin/users/:id` | Admin user detail. |
| `/admin/content/:section` | Admin content. |
| `/admin/billing/:section` | Admin billing. |
| `/admin/settings/:section` | Admin settings. |

## Backend API Routes

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify-email`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `POST /api/auth/resend-verification`
- `POST /api/auth/onboarding/complete`
- `PUT /api/auth/profile`
- `PUT /api/auth/password`
- `DELETE /api/auth/account`

Documents:

- `GET /api/documents/review/due`
- `GET /api/documents/folders/list`
- `POST /api/documents/upload/stream`
- `POST /api/documents/upload`
- `POST /api/documents/link/stream`
- `POST /api/documents/link`
- `GET /api/documents`
- `GET /api/documents/:id`
- `PATCH /api/documents/:id/meta`
- `POST /api/documents/:id/share`
- `POST /api/documents/:id/flashcards/generate`
- `DELETE /api/documents/:id/flashcards`
- `PATCH /api/documents/:id/flashcards/:cardId`
- `DELETE /api/documents/:id/flashcards/:cardId`
- `POST /api/documents/:id/flashcards/:cardId/rate`
- `POST /api/documents/:id/regenerate`
- `DELETE /api/documents/:id`

Quiz:

- `GET /api/quiz/analytics/overview`
- `POST /api/quiz/document/:documentId`
- `GET /api/quiz/:id`
- `POST /api/quiz/:id/submit`

Tutor:

- `GET /api/tutor/global/history`
- `DELETE /api/tutor/global/history`
- `POST /api/tutor/global`
- `GET /api/tutor/:documentId/history`
- `DELETE /api/tutor/:documentId/history`
- `POST /api/tutor/:documentId`

Billing:

- `GET /api/billing/public-config`
- `POST /api/billing/webhook`
- `GET /api/billing/status`
- `GET /api/billing/usage`
- `POST /api/billing/create-order`
- `POST /api/billing/verify-payment`
- `POST /api/billing/portal`

Share:

- `GET /api/share/:token`

Admin routes include stats, users, billing, settings, AI keys, models, documents, quizzes, chat, shares, usage, and audit logs under `/api/admin/...`.

## File Working - Client Pages

| File | Working |
| --- | --- |
| `Landing.jsx` | Public home page. |
| `Login.jsx` | Login form. |
| `Register.jsx` | Register form. |
| `VerifyEmail.jsx` | Email/OTP verification. |
| `ForgotPassword.jsx` | Password reset request. |
| `ResetPassword.jsx` | New password form. |
| `Dashboard.jsx` | Main user dashboard. |
| `Upload.jsx` | PDF/link upload and generation. |
| `DocumentView.jsx` | Notes, flashcards, quiz, tutor, mind map for one document. |
| `Review.jsx` | Due flashcards review. |
| `Ask.jsx` | Ask AI across all notes. |
| `QuizView.jsx` | Quiz answer/result page. |
| `Analytics.jsx` | Study and quiz analytics. |
| `Profile.jsx` | User profile and account settings. |
| `Pricing.jsx` | Public plans page. |
| `Checkout.jsx` | Payment checkout. |
| `Billing.jsx` | User subscription/billing. |
| `ShareView.jsx` | Public shared notes view. |
| `Terms.jsx` | Terms page. |
| `Privacy.jsx` | Privacy page. |
| `admin/AdminOverview.jsx` | Admin overview. |
| `admin/AdminUsers.jsx` | Admin user list. |
| `admin/AdminUserDetail.jsx` | Admin single user detail. |
| `admin/AdminUsage.jsx` | Admin usage/cost page. |
| `admin/AdminSettings.jsx` | AI keys, models, rate limits, audit/settings. |
| `admin/AdminContent.jsx` | Admin documents/quizzes/chat/share content. |
| `admin/AdminBilling.jsx` | Admin pricing/plans/payments. |

## File Working - Client Components

| File | Working |
| --- | --- |
| `ui.jsx` | Shared UI pieces, loaders, shells. |
| `Layout.jsx` | Main app layout. |
| `AdminLayout.jsx` | Admin layout/sidebar. |
| `MarketingShell.jsx` | Public page shell. |
| `AuthShell.jsx` | Auth page shell. |
| `Logo.jsx` | App logo. |
| `icons.jsx` | Shared icons. |
| `motion.jsx` | Animation helpers. |
| `FormField.jsx` | Reusable input field. |
| `OtpInput.jsx` | OTP input boxes. |
| `EmailVerificationBanner.jsx` | Verification reminder. |
| `OnboardingWizard.jsx` | First-time onboarding. |
| `CommandPalette.jsx` | Keyboard command/search palette. |
| `GenerationOverlay.jsx` | AI generation loading overlay. |
| `TagInput.jsx` | Tags input. |
| `NotesTOC.jsx` | Notes table of contents. |
| `MarkdownContent.jsx` | Markdown renderer. |
| `MindMap.jsx` | Notes mind map. |
| `AudioPlayer.jsx` | Text-to-speech controls. |
| `Flashcards.jsx` | Flashcard area. |
| `FlashcardUI.jsx` | Single flashcard UI. |
| `TutorChat.jsx` | AI tutor chat UI. |
| `Credit.jsx` | Credit/usage display. |
| `AdminStatCard.jsx` | Admin stats card. |
| `AdminTableToolbar.jsx` | Admin table filters/actions. |
| `admin/CustomPlanForm.jsx` | Custom billing plan form. |

## File Working - Client Utils And Context

| File | Working |
| --- | --- |
| `api/client.js` | Axios base client and API configuration. |
| `config/detailLevel.js` | Note detail level options. |
| `config/developer.js` | Developer constants/config. |
| `config/languages.js` | Output language options. |
| `context/AuthContext.jsx` | Auth state and auth API helpers. |
| `context/ConfirmContext.jsx` | Confirmation dialog state. |
| `context/ThemeContext.jsx` | Theme state. |
| `context/ToastContext.jsx` | Toast notification state. |
| `hooks/useSpeech.js` | Browser text-to-speech hook. |
| `utils/printExport.jsx` | Print/export helpers. |
| `utils/parseNoteSections.js` | Markdown headings ko sections me split karta hai. |
| `utils/objectId.js` | Mongo ObjectId helpers. |
| `utils/quota.js` | Usage/quota helpers. |
| `utils/textClean.js` | Text cleanup helpers. |

## File Working - Server

Config:

| File | Working |
| --- | --- |
| `index.js` | Express app start, security middleware, routes, DB connect. |
| `config/env.js` | Env values load/validate. |
| `config/db.js` | MongoDB connection. |
| `config/plans.js` | Plan limits and usage summary. |
| `config/detailLevel.js` | Notes detail level config. |
| `config/languages.js` | Supported languages. |
| `config/observability.js` | Request logs and optional monitoring. |

Routes:

| File | Working |
| --- | --- |
| `routes/auth.js` | Auth/profile/password/email routes. |
| `routes/documents.js` | Upload/link/document/flashcard/share routes. |
| `routes/quiz.js` | Quiz routes. |
| `routes/tutor.js` | Tutor/global tutor routes. |
| `routes/admin.js` | Admin routes. |
| `routes/billing.js` | Billing/payment routes. |
| `routes/share.js` | Public share route. |

Controllers:

| File | Working |
| --- | --- |
| `authController.js` | Register/login/email/profile/password logic. |
| `documentController.js` | Document upload/link/list/view/update/share/regenerate logic. |
| `quizController.js` | Quiz create/submit/analytics logic. |
| `tutorController.js` | Tutor streaming/history logic. |
| `adminController.js` | Admin users/content/settings/AI keys/usage logic. |
| `billingController.js` | Billing status/order/payment/pricing logic. |
| `shareController.js` | Public shared document logic. |

Models:

| File | Working |
| --- | --- |
| `User.js` | User, role, plan, usage, verification. |
| `Document.js` | Documents, notes, flashcards, tags, share data. |
| `Quiz.js` | Quiz questions. |
| `QuizAttempt.js` | Quiz scores/answers. |
| `ChatMessage.js` | Tutor chat history. |
| `StudyActivity.js` | Daily activity/streak data. |
| `Settings.js` | Admin settings and AI key pool. |
| `PaymentEvent.js` | Payment records. |
| `ApiUsage.js` | AI usage tracking. |
| `AdminAuditLog.js` | Admin action logs. |

Middleware:

| File | Working |
| --- | --- |
| `auth.js` | JWT auth/admin checks. |
| `upload.js` | PDF upload validation. |
| `quota.js` | Plan quota checks. |
| `aiRateLimit.js` | AI rate limit. |
| `authRateLimit.js` | Login/password reset rate limits. |
| `errorHandler.js` | 404 and central error handling. |

Services:

| File | Working |
| --- | --- |
| `gemini.js` | Gemini generation functions. |
| `geminiHelpers.js` | Gemini errors, JSON parse, failover helpers. |
| `generationOrchestrator.js` | Multi-step generation and retry. |
| `keyBalancer.js` | Least-loaded AI key selection. |
| `keyCrypto.js` | API key encryption/decryption. |
| `linkExtractor.js` | Website/YouTube text extraction. |
| `retrieval.js` | Cross-document context for Ask. |
| `spacedRepetition.js` | Flashcard review scheduling. |
| `studyStreak.js` | Streak/activity calculations. |
| `planCatalog.js` | Plan catalog helpers. |
| `planExpiry.js` | Plan expiry logic. |
| `billingPricing.js` | Billing price/plan settings. |
| `razorpay.js` | Razorpay helpers. |
| `stripe.js` | Legacy Stripe helpers. |
| `email.js` | Verification/password reset emails. |
| `adminAudit.js` | Admin audit logging. |
| `documentGeneration.js` | Document generation support. |

Utils and scripts:

| File | Working |
| --- | --- |
| `utils/textClean.js` | Text cleanup. |
| `utils/parseNoteSections.js` | Markdown notes section parser. |
| `utils/objectId.js` | Mongo ObjectId helpers. |
| `utils/notesChunk.js` | Large notes chunk/merge helpers. |
| `utils/documentTags.js` | Tag cleanup helpers. |
| `utils/dateKey.js` | Local date/streak helpers. |
| `scripts/seedData.js` | Seed admin/demo users. |

## Database Collections

- Users
- Documents
- Quizzes
- Quiz attempts
- Chat messages
- Study activities
- Settings
- API usage
- Payment events
- Admin audit logs

## Security

- Passwords bcrypt se hash hote hain.
- JWT sessions use hote hain.
- Admin routes role-protected hain.
- Helmet security headers enabled hain.
- CORS only allowed frontend origins ko allow karta hai.
- Auth/API/AI rate limits hain.
- Plan quota middleware hai.
- PDF upload validation hai.
- Admin saved Gemini keys encrypted hain.
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

Port busy:

```powershell
netstat -ano | findstr ":5000"
taskkill /PID <PID> /F
```

MongoDB issue:

- `MONGO_URI` check karein.
- Atlas Network Access me apna IP allow karein.
- Local MongoDB use kar rahe hain to service running honi chahiye.

Gemini issue:

- `GEMINI_API_KEY` valid rakhein.
- Admin panel me key test karein.
- Quota exceed ho to wait karein ya different project/account key use karein.

Email issue:

- SMTP details check karein.
- Gmail ke liye app password use karein.

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
3. Gemini API key ready karein.
4. `.env.example` copy karke `.env` banayein.
5. `MONGO_URI`, `JWT_SECRET`, `ENCRYPTION_SECRET`, `GEMINI_API_KEY` fill karein.
6. `npm run install:all` run karein.
7. `npm run seed` run karein.
8. `npm run dev` run karein.
9. Browser me frontend URL open karein.
10. Admin login karke AI key/settings test karein.

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
Login/Register
  -> Upload PDF/link
  -> Backend extracts content
  -> Gemini generates notes/flashcards/quiz/tutor answers
  -> MongoDB stores data
  -> Frontend shows study tools
  -> Admin manages users, billing, usage, AI keys
```
