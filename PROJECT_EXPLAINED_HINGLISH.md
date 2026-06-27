# NoteGenie — Project Explained In Easy Hinglish

Ye file beginner ke liye hai. Agar `client`, `server`, `controllers`, `models`, `services` jaise
folder names confusing lagte hain, to is file ko upar se neeche padho. Last update: poora **Digital +
Physical product system** add hone ke baad.

---

## 1. Project kya hai (Big picture)

NoteGenie ek **MERN** app hai:

- **M** = MongoDB (database — data yahan save hota hai)
- **E** = Express (backend API server)
- **R** = React (frontend UI, browser me dikhta hai)
- **N** = Node.js (backend JavaScript runtime)

**Direction (important):** NoteGenie ab ek **student study-material MARKETPLACE / STORE** hai
(IGNOU & distance-learning vibe — solved assignments, question papers, help books, notes, projects;
zyada material FREE, kuch paid). **AI tools (Ask AI, summarize, notes/quiz/flashcards) ek BONUS
add-on hain dashboard ke andar — main product nahi.** Store hi main event hai.

Flow simple shabdon me:

```text
User browser me click karta hai
  -> React frontend request bhejta hai (client/src/api/client.js)
  -> Express backend request pakadta hai (server/src/routes/*)
  -> Backend DB / payment / file / AI / email ka kaam karta hai (controllers + services)
  -> Backend response bhejta hai
  -> React screen update karta hai
```

---

## 2. Do tarah ke products (Digital + Physical)

Har store product (`Resource`) ya to **Digital** hai ya **Physical**:

- **Digital** (e.g. solved assignment PDF): payment verify hone ke baad **secure token** se download.
  Fields: download limit, expiry (days), version, license key, instant-download.
- **Physical** (e.g. printed book): stock, weight, dimensions, delivery charges, COD. Checkout par
  **shipping address** maangta hai; admin courier/tracking manage karta hai.

**Golden rule:** Digital product **kabhi verified payment se pehle download nahi** hota.

---

## 3. Root folder + main commands

```text
NoteGenie/
  client/                React + Vite frontend
  server/                Express + MongoDB backend
  docs/                  Docs + generated academic-handbook.pdf
  dev.mjs                Ek command se server + client dono start karta hai
  .env                   Secrets/config (gitignored) — root me
  .env.example           .env ka sample
  README.md              Full technical docs
  PROJECT_EXPLAINED_HINGLISH.md   Ye file
```

**Commands (root se):**

```bash
npm run install:all          # client + server dependencies install
npm run dev                  # backend + frontend dono start (dev.mjs)
npm run seed --prefix server # store data seed: IGNOU + 150 products + combos + demo orders
npm run handbook --prefix server  # docs/academic-handbook.pdf generate (programs/courses/books PDF)
npm test --prefix server     # backend tests
npm run build --prefix client# frontend production build
```

> Note: `npm run seed` store ko **reset** karta hai (resources delete + recreate). Isliye test ke liye
> kuch khareeda ho to re-seed ke baad wo orphan ho jayega — fresh khareed lena.

---

## 4. CLIENT file structure (`client/src/`)

### Entry + core
| File | Kaam |
| --- | --- |
| `main.jsx` | React boot; saare providers (Auth, Cart, Theme, Toast, Confirm) yahan lagte hain. |
| `App.jsx` | Saare routes (public / auth-protected / admin) + feature-gated routes. |
| `index.css` | Global Tailwind styles, theme CSS vars, `.material-card`/`.store-*` classes. |
| `api/client.js` | Axios instance, base URL, JWT header, 401 auto-logout. |

### Context (global state)
| File | Kaam |
| --- | --- |
| `context/AuthContext.jsx` | Login user, token, `register`/`login`/`verifyEmail`/`logout`. |
| `context/CartContext.jsx` | Store cart (localStorage), add/remove/subtotal. |
| `context/ThemeContext.jsx` | Light/dark + accent; admin ka default theme apply karta hai. |
| `context/ToastContext.jsx` · `ConfirmContext.jsx` | Toast notifications · confirm dialogs. |

### Lib (helpers)
| File | Kaam |
| --- | --- |
| `lib/storeCategories.js` | Store categories + icons/tints, `typeLabel`, `rupees`. |
| `lib/storeConfig.js` | Brand/WhatsApp fallback (env-driven, hardcode nahi). |
| `lib/useStorefront.js` | Public config fetch: features, theme, `aiEnabled`, storefront. Hooks: `useFeatures`, `useAiEnabled`. |
| `lib/recentlyViewed.js` | "Recently viewed" + recommendations (localStorage). |
| `lib/savedResources.js` | Wishlist/Save (localStorage). |
| `lib/razorpay.js` | Razorpay script + `downloadResourceFile` / `downloadByToken` (secure file download). |

### Pages — app / auth / legal
| File | Kaam |
| --- | --- |
| `pages/Landing.jsx` | Public home — **store-first** (categories, popular, free material; AI as add-on). |
| `pages/Login.jsx` · `Register.jsx` · `VerifyEmail.jsx` | Login · signup · OTP verify. |
| `pages/ForgotPassword.jsx` · `ResetPassword.jsx` | Password reset. |
| `pages/Dashboard.jsx` | Logged-in home ("Your library") — materials, streak, quizzes. AI off par "Add material" hide. |
| `pages/Upload.jsx` · `Ask.jsx` · `Review.jsx` | AI tools: upload+generate · cross-doc tutor · flashcard review. |
| `pages/DocumentView.jsx` · `QuizView.jsx` | Document (notes/flashcards/quiz/tutor) · quiz attempt. |
| `pages/Analytics.jsx` | Study analytics. AI off par "Add material" → "Browse store". |
| `pages/Profile.jsx` · `Billing.jsx` · `Pricing.jsx` · `Checkout.jsx` | Profile · billing+purchase history · plans · plan checkout. |
| `pages/MyDownloads.jsx` | **Saved & downloads** — purchased items, secure token download, remaining/expiry/license. |
| `pages/ResourceDetail.jsx` | Product page — digital vs physical conditional, specs, related, sticky buy bar. |
| `pages/Terms.jsx` · `Privacy.jsx` · `Refund.jsx` | Legal pages. |
| `pages/Workspaces.jsx` · `WorkspaceDetail.jsx` · `ShareView.jsx` | Workspaces · shared note view. |

### Pages — store (`pages/store/`)
| File | Kaam |
| --- | --- |
| `StoreHome.jsx` | Store homepage — search, categories, recently-viewed/recommended/free/popular strips, shop-by-degree. |
| `StoreCategory.jsx` · `StoreSearch.jsx` · `StoreCourse.jsx` | Category · search (sort + free-only) · course pages. |
| `Cart.jsx` | Cart + checkout (physical hone par shipping address form). |
| `CombosList.jsx` · `ComboDetail.jsx` | Combo packs (savings badge). |
| `About.jsx` · `FAQ.jsx` · `Contact.jsx` · `Support.jsx` · `HowToBuy.jsx` | Footer/info pages. |

### Pages — admin (`pages/admin/`)
| File | Kaam |
| --- | --- |
| `AdminOverview.jsx` · `AdminUsers.jsx` · `AdminUserDetail.jsx` | Dashboard · users · user detail. |
| `AdminResources.jsx` | **Products** — Digital/Physical toggle + conditional fields + file upload. |
| `AdminOrders.jsx` · `AdminOrderDetail.jsx` | Orders list (digital/physical) · order detail + admin actions (enable/disable download, reset, regenerate token, extend expiry, shipping). |
| `AdminCombos.jsx` · `AdminCatalog.jsx` · `AdminContent.jsx` | Combos · universities/programs/courses · content moderation. |
| `AdminBilling.jsx` · `AdminUsage.jsx` | Billing/plans · AI usage. |
| `AdminSettings.jsx` | AI keys · **Features** (on/off) · **Theme** · Storefront · Audit log · Rate limits. |

### Components (important)
| File | Kaam |
| --- | --- |
| `components/Layout.jsx` | Logged-in app chrome — grouped sidebar nav. AI off par Upload/Ask AI hide. |
| `components/StoreLayout.jsx` | Public store chrome (header/nav/footer, teal theme). |
| `components/MarketingShell.jsx` | Public marketing/legal pages shell + footer. |
| `components/store/ResourceCard.jsx` | Product card — thumbnail, downloads, Free/Paid, Save heart. |
| `components/store/ResultsGrid.jsx` | Store grid — skeletons, result count, empty state. |
| `components/ui.jsx` · `icons.jsx` · `motion.jsx` | Shared UI · SVG icons · animation helpers. |

---

## 5. SERVER file structure (`server/src/`)

### Entry + config
| File | Kaam |
| --- | --- |
| `index.js` | Express start, security (helmet/CORS/rate-limit), routes mount, DB connect. |
| `config/env.js` | `.env` values load + validate (WhatsApp/socials/OTP env fallbacks). |
| `config/db.js` · `plans.js` · `permissions.js` | Mongo connect · plan limits · staff/admin permissions. |
| `config/academicSample.js` | Sample academic data (programs/universities/courses/assignments/books) for the handbook PDF. |

### Models (MongoDB schemas)
| File | Kaam |
| --- | --- |
| `models/User.js` | Account, role, plan, usage, email-verify. |
| `models/PendingSignup.js` | Unverified signup (OTP) — account **sirf OTP verify ke baad** banta hai (TTL auto-clean). |
| `models/Resource.js` | Product — **productType (digital/physical)** + digital fields (download limit/expiry/version/license) + physical fields (sku/stock/weight/delivery/COD). |
| `models/Purchase.js` | Order line — payment verified, **downloadToken/limit/expiry/license**, shipping (physical). |
| `models/DownloadLog.js` | Har download attempt (allowed/blocked) ka audit (ip/device/browser). |
| `models/Combo.js` · `Course.js` · `Program.js` · `University.js` | Bundles · catalog hierarchy. |
| `models/Settings.js` | Admin settings — AI keys, **feature flags**, **theme**, storefront. |
| `models/Document.js` · `Quiz.js` · `QuizAttempt.js` · `ChatMessage.js` | AI-tool data (notes/flashcards/quiz/tutor). |
| `models/PaymentEvent.js` · `ApiUsage.js` · `AdminAuditLog.js` | Payments · AI usage · admin audit. |

### Routes → Controllers
| Route file | Controller | Kaam |
| --- | --- | --- |
| `routes/auth.js` | `authController.js` | Register (PendingSignup/OTP), verify, login, profile, password. |
| `routes/catalog.js` | `catalogController.js`, `resourceController.js`, `comboController.js`, `marketplaceController.js` | Public browse/search, storefront config, **buy/verify/secure-download**, my-purchases. |
| `routes/billing.js` | `billingController.js` | Plan billing (Razorpay/Stripe). |
| `routes/admin.js` | `adminController.js` + others | Users, settings, catalog, resources, **orders + order detail/actions**, content. |
| `routes/documents.js` · `quiz.js` · `tutor.js` · `workspaces.js` · `share.js` | (AI controllers) | AI tools (feature-gated). |

### Middleware
| File | Kaam |
| --- | --- |
| `middleware/auth.js` | JWT auth, admin/staff/permission guards. |
| `middleware/requireFeature.js` | Disabled feature par 403 "This feature is currently unavailable." |
| `middleware/aiEnabled.js` · `aiRateLimit.js` · `quota.js` | AI master switch · AI rate limit · plan quota. |
| `middleware/uploadResource.js` · `upload.js` | Product file upload · study-doc upload. |

### Services
| File | Kaam |
| --- | --- |
| `services/fileStorage.js` | Provider-agnostic file storage (GridFS) — upload/stream/delete. |
| `services/razorpay.js` · `stripe.js` | Payment helpers. |
| `services/email.js` | Verification + purchase "download ready" emails. |
| `services/handbookPdf.js` | **PDF generator** (pdfkit) — academic handbook + per-resource sample PDFs. |
| `services/gemini*.js` · `rag.js` · `retrieval.js` | AI generation + RAG. |
| `services/adminAudit.js` · `studyStreak.js` · `spacedRepetition.js` | Audit log · streaks · flashcard SM-2. |

### Scripts
| File | Kaam |
| --- | --- |
| `scripts/seedData.js` | Store seed — IGNOU catalog + 150 products (real PDF attached) + combos + demo orders. |
| `scripts/generateHandbook.js` | `docs/academic-handbook.pdf` banata hai (`npm run handbook`). |
| `scripts/embedBackfill.js` | RAG embeddings backfill. |

---

## 6. Main flows (step-by-step)

**Signup / OTP:** Register → backend `PendingSignup` banata hai (User nahi) + OTP email → user OTP
daalta hai → verify hone par **real User + JWT** banta hai. Galat OTP 5 baar = discard; resend 45s
cooldown. (No junk unverified users.)

**Store buy (digital):** ResourceDetail → Add to cart / Buy now → Razorpay → **verify** → Purchase me
`downloadToken` + license + limit/expiry set → MyDownloads me secure download.

**Secure download:** `GET /api/catalog/download/:token` → check (logged-in owner + payment verified +
download enabled + limit + expiry) → file stream → DownloadLog me entry. Direct file URL kabhi expose nahi.

**Physical buy:** Cart me physical item → shipping address maangta hai → verify → admin Order Detail se
courier/tracking/status update.

**Admin product create:** Admin → Products → Digital/Physical chuno → relevant fields + file → save.

**Feature flags:** Admin → Settings → Features se koi feature off → nav se hide + route "unavailable" +
API block. **AI master switch** off → Upload/Ask AI hide (admin se bhi) + "Add material" CTAs hide.

---

## 7. Setup (pehli baar)

1. Node.js 18+ install.
2. `.env.example` → `.env` copy, fill: `MONGO_URI`, `JWT_SECRET`, `ENCRYPTION_SECRET`, `GEMINI_API_KEY`,
   SMTP (email), `RAZORPAY_*`, `WHATSAPP_NUMBER`.
3. `npm run install:all`
4. `npm run seed --prefix server`  (store me 150 products aa jayenge)
5. `npm run dev`  → browser me frontend URL kholo (default `http://localhost:3000`).
6. Admin se login (`.env` ke `ADMIN_EMAIL`/`ADMIN_PASSWORD`) → Admin panel manage karo.

> Detailed env table + deployment ke liye `README.md` dekho.
