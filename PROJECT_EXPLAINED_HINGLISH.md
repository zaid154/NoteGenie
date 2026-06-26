# NoteGenie Project Explained In Easy Hinglish

Ye file beginner ke liye hai. Agar aapko `client`, `server`, `config`, `api`, `components`, `controllers`, `models`, `services` jaise folder names ka matlab clear nahi hai, to is file ko top se bottom read karo.

## 1. Sabse Pehle Big Picture

NoteGenie ek MERN project hai.

MERN ka matlab:

- `M` = MongoDB: database, yahan app ka data save hota hai.
- `E` = Express: backend API server.
- `R` = React: frontend UI jo browser me dikhta hai.
- `N` = Node.js: JavaScript runtime jisme backend chalta hai.

Project ko simple words me aise samjho:

```text
User browser me button click karta hai
  -> React frontend request bhejta hai
  -> Express backend request receive karta hai
  -> Backend database / AI / payment / email ka kaam karta hai
  -> Backend response bhejta hai
  -> React frontend screen update karta hai
```

Example:

```text
User Login page par email/password dalta hai
  -> client/src/pages/Login.jsx form submit karta hai
  -> client/src/api/client.js backend ko request bhejta hai
  -> server/src/routes/auth.js login route pakadta hai
  -> server/src/controllers/authController.js login logic chalata hai
  -> server/src/models/User.js MongoDB se user find karta hai
  -> backend JWT token return karta hai
  -> client/src/context/AuthContext.jsx user ko logged-in save karta hai
```

## 2. Root Folder Kya Hai?

Root folder ka matlab project ka main folder:

```text
NoteGenie/
```

Root me project ke common files hote hain. Ye client aur server dono ko manage karte hain.

| File/Folder | Simple Meaning | Kaam |
| --- | --- | --- |
| `README.md` | Project ka main manual | Commands, setup, structure, features. |
| `PROJECT_EXPLAINED_HINGLISH.md` | Beginner guide | Ye file, jisme project simple Hinglish me explain hai. |
| `package.json` | Root command list | `npm run dev`, `npm run install:all`, `npm run seed` jaise commands. |
| `package-lock.json` | Exact dependency lock | npm ko same versions install karne me help karta hai. |
| `.env` | Real secret settings | MongoDB URL, Gemini key, JWT secret. Isko share nahi karna. |
| `.env.example` | Sample env file | Kaunsi env keys chahiye, uska template. |
| `dev.mjs` | Dev starter script | Client aur server ko ek sath start karta hai. |
| `start-dev.bat` | Windows shortcut | Double-click/PowerShell se dev start karne ke liye. |
| `render.yaml` | Backend deploy config | Render par server deploy karne ke settings. |
| `proble.md` | Notes/scratch file | Project issues ya notes ke liye. |
| `docs/` | Extra documentation | Jaise vector search setup. |
| `client/` | Frontend | Browser me jo UI dikhta hai. |
| `server/` | Backend | API, database, AI, auth, payment, email ka logic. |

## 3. Client Folder Kya Hai?

`client/` ka matlab frontend. Ye wo part hai jo user browser me dekhta hai.

Client ka kaam:

- Pages show karna.
- Forms lena.
- Buttons, cards, layout render karna.
- Backend API ko request bhejna.
- Backend response ko screen par dikhana.

Client direct database se baat nahi karta. Client hamesha backend API se baat karta hai.

```text
Client React UI
  -> API request
  -> Server
  -> Database / AI / Email / Payment
```

## 4. Client Root Files

| File | Meaning | Kaam |
| --- | --- | --- |
| `client/package.json` | Frontend command/dependency file | Vite, React, build, lint commands. |
| `client/package-lock.json` | Frontend dependency lock | Exact package versions. |
| `client/index.html` | Browser HTML entry | React app isi HTML ke `root` me mount hota hai. |
| `client/vite.config.js` | Vite settings | Dev server aur `/api` proxy setup. |
| `client/tailwind.config.js` | Tailwind settings | CSS classes/theme paths. |
| `client/postcss.config.js` | CSS processor config | Tailwind CSS build pipeline. |
| `client/eslint.config.js` | Lint config | Code style/errors check. |
| `client/firebase.json` | Firebase hosting config | Frontend deploy settings. |
| `client/.env.example` | Frontend env sample | `VITE_API_URL` ka sample. |
| `client/.env.production` | Production frontend env | Production API URL set karne ke liye. |
| `client/public/` | Public static files | Favicon, manifest, service worker. |
| `client/src/` | Main React source code | Real frontend code yahan hai. |

## 5. Client Src Folder

`client/src/` frontend ka heart hai.

```text
client/src/
  api/
  components/
  config/
  context/
  hooks/
  lib/
  pages/
  utils/
  App.jsx
  main.jsx
  index.css
```

## 6. Client Folder Names Ka Matlab

### `api/`

`api` ka matlab backend se baat karne wali layer.

Is project me:

```text
client/src/api/client.js
```

Ye file Axios setup karti hai.

Simple kaam:

- Backend URL decide karna.
- Token ko request header me attach karna.
- API request bhejna.

Example:

```text
Login page
  -> api/client.js
  -> POST /api/auth/login
  -> server
```

### `components/`

`components` ka matlab reusable UI pieces.

Component ek chhota UI block hota hai jo multiple pages me use ho sakta hai.

Example:

- Button
- Layout
- Navbar
- Flashcard
- Tutor chat box
- Admin table toolbar

Simple analogy:

```text
Page = poori screen
Component = screen ka reusable tukda
```

Example:

```text
DocumentView page
  -> MarkdownContent component
  -> Flashcards component
  -> TutorChat component
  -> MindMap component
```

### `pages/`

`pages` ka matlab full screen route pages.

Example:

- `Login.jsx` = login screen
- `Dashboard.jsx` = dashboard screen
- `Upload.jsx` = upload screen
- `DocumentView.jsx` = one document ki screen
- `admin/AdminUsers.jsx` = admin users screen

React Router `App.jsx` me decide hota hai ki kaunsa URL kaunsi page file open karega.

Example:

```text
/login
  -> client/src/pages/Login.jsx

/upload
  -> client/src/pages/Upload.jsx

/admin/users
  -> client/src/pages/admin/AdminUsers.jsx
```

### `config/`

`config` ka matlab fixed settings/options.

Ye mostly wo values hoti hain jo UI me baar-baar use hoti hain.

Example:

- Languages list
- Detail level options
- Upload type options

`config` ko simple words me samjho:

```text
App ke fixed choices/settings yahan rakhe jate hain.
```

### `context/`

`context` ka matlab global state.

Global state wo data hai jo bahut pages/components ko chahiye hota hai.

Example:

- Current logged-in user
- Theme
- Toast notification
- Cart
- Confirm dialog

Example:

```text
AuthContext
  -> user logged in hai ya nahi
  -> token kya hai
  -> user admin hai ya normal user
```

### `hooks/`

`hooks` reusable React logic hota hai.

Example:

```text
useSpeech.js
```

Ye browser text-to-speech ka logic reusable banata hai.

### `lib/`

`lib` ka matlab helper library code.

Ye code usually kisi feature ke support/helper ke liye hota hai.

Example:

- Razorpay script load karna.
- Store config.
- Store categories.
- Storefront data helper.

### `utils/`

`utils` ka matlab small helper functions.

Ye functions UI nahi banate. Ye data clean/format/parse karte hain.

Example:

- Text clean karna.
- ObjectId validate karna.
- Notes headings split karna.
- Quota display karna.

### `main.jsx`

React app ka starting point.

Browser me app yahin se start hoti hai.

### `App.jsx`

Routes ka map.

Ye decide karta hai:

- `/login` par Login page.
- `/app` par Dashboard.
- `/admin` par AdminLayout.
- Protected route me user logged-in hona chahiye.
- Admin route me admin/staff permission hona chahiye.

### `index.css`

Global CSS.

Tailwind, theme colors, common styles yahan hote hain.

## 7. Client Data Flow Example

Login flow:

```text
client/src/pages/Login.jsx
  -> user email/password enter karta hai
  -> AuthContext login function call hota hai
  -> api/client.js POST /api/auth/login bhejta hai
  -> server response me user + token deta hai
  -> AuthContext token save karta hai
  -> App.jsx user ko /app dashboard par bhejta hai
```

Upload flow:

```text
client/src/pages/Upload.jsx
  -> user file/link deta hai
  -> api/client.js request bhejta hai
  -> server documents route receive karta hai
  -> AI generation complete hoti hai
  -> frontend generated document show karta hai
```

## 8. Server Folder Kya Hai?

`server/` backend hai.

Backend ka kaam:

- API routes banana.
- Database se data read/write karna.
- Login/register/auth handle karna.
- Gemini AI ko call karna.
- Email bhejna.
- Payment verify karna.
- File upload/extract karna.
- Admin settings manage karna.

Frontend database ko direct touch nahi karta. Backend database ko touch karta hai.

## 9. Server Root Files

| File | Meaning | Kaam |
| --- | --- | --- |
| `server/package.json` | Backend commands/dependencies | `start`, `dev`, `test`, `seed`. |
| `server/package-lock.json` | Backend dependency lock | Exact backend package versions. |
| `server/eslint.config.js` | Backend lint config | Code checks. |
| `server/tests/api.test.js` | Tests | Backend helpers/logic test karta hai. |
| `server/src/` | Backend source code | Real API code yahan hai. |

## 10. Server Src Folder

```text
server/src/
  config/
  controllers/
  middleware/
  models/
  routes/
  scripts/
  services/
  utils/
  index.js
```

## 11. Server Folder Names Ka Matlab

### `index.js`

Backend ka starting point.

Ye kaam karta hai:

- Express app banata hai.
- Env validate karta hai.
- MongoDB connect karta hai.
- Security middleware lagata hai.
- Routes attach karta hai.
- Error handler attach karta hai.
- Server start karta hai.

Flow:

```text
server/src/index.js
  -> config/env.js
  -> config/db.js
  -> middleware
  -> routes
  -> controllers
```

### `config/`

Backend config ka matlab app ki settings.

Example:

- Database URL
- JWT secret
- Gemini model
- Razorpay keys
- SMTP email settings
- Plan limits
- Language options
- Upload allowed types

Important files:

| File | Kaam |
| --- | --- |
| `env.js` | `.env` se values read karta hai aur defaults/validation lagata hai. |
| `db.js` | MongoDB connect karta hai. |
| `plans.js` | Free/Pro/Team plan limits. |
| `permissions.js` | Admin/staff permissions. |
| `languages.js` | Supported languages. |
| `detailLevel.js` | Notes detail level settings. |
| `uploadTypes.js` | Allowed upload file types. |
| `observability.js` | Request logs/monitoring. |
| `sampleDocument.js` | Demo/sample document content. |

Simple meaning:

```text
config = app ki settings ka folder
```

### `routes/`

Routes ka matlab API URLs ka map.

Route file decide karti hai ki URL par kaunsa controller function chalega.

Example:

```text
POST /api/auth/login
  -> routes/auth.js
  -> authController.login
```

Important route groups:

| File | URL Group | Kaam |
| --- | --- | --- |
| `auth.js` | `/api/auth` | Login, register, email verify, profile. |
| `documents.js` | `/api/documents` | Upload, notes, flashcards, share. |
| `quiz.js` | `/api/quiz` | Quiz create, get, submit. |
| `tutor.js` | `/api/tutor` | AI tutor chat. |
| `admin.js` | `/api/admin` | Admin users/settings/content/billing. |
| `billing.js` | `/api/billing` | Payment/order/usage. |
| `catalog.js` | `/api/catalog` | Store, courses, resources, combos. |
| `share.js` | `/api/share` | Public share link. |
| `workspaces.js` | `/api/workspaces` | Workspace/folder organization. |

Simple meaning:

```text
routes = URL ka traffic controller
```

### `controllers/`

Controller ka matlab actual request ka main logic.

Route sirf URL pakadta hai. Controller decide karta hai:

- Request se data lena.
- Validation/check karna.
- Service/model call karna.
- Response bhejna.

Example:

```text
routes/auth.js
  -> authController.js
  -> User model
  -> JWT token
  -> response
```

Important controllers:

| File | Kaam |
| --- | --- |
| `authController.js` | Register, login, email verify, password reset, profile. |
| `documentController.js` | Upload/link document, notes, flashcards, share, delete. |
| `quizController.js` | Quiz generation, submit, analytics. |
| `tutorController.js` | Tutor chat and history. |
| `adminController.js` | Admin dashboard, users, settings, AI keys, content. |
| `billingController.js` | Billing status, Razorpay order, payment verify. |
| `catalogController.js` | Store/catalog public/admin data. |
| `resourceController.js` | Resource upload/download/admin resource logic. |
| `comboController.js` | Store combo bundle logic. |
| `workspaceController.js` | Workspace/folder logic. |
| `shareController.js` | Public shared note view. |
| `marketplaceController.js` | Store marketplace helper logic. |

Simple meaning:

```text
controllers = request ka main decision-maker
```

### `models/`

Model ka matlab MongoDB collection ka structure.

Database me data kaise save hoga, model batata hai.

Example:

```text
User.js
  -> name
  -> email
  -> passwordHash
  -> role
  -> plan
```

Important models:

| File | Database Data |
| --- | --- |
| `User.js` | Users, auth, role, plan, usage. |
| `Document.js` | Notes, flashcards, uploaded/link document data. |
| `DocumentChunk.js` | RAG/vector search chunks and embeddings. |
| `Quiz.js` | Quiz questions and answers. |
| `QuizAttempt.js` | User quiz score/attempts. |
| `ChatMessage.js` | Tutor chat history. |
| `StudyActivity.js` | Daily study/streak activity. |
| `Settings.js` | Admin settings, AI keys, limits. |
| `ApiUsage.js` | Gemini/API usage logs. |
| `AdminAuditLog.js` | Admin action history. |
| `PaymentEvent.js` | Payment events. |
| `Purchase.js` | User purchases/download access. |
| `University.js` | Store/catalog university. |
| `Program.js` | Store/catalog program. |
| `Course.js` | Store/catalog course. |
| `Resource.js` | Store resource file/details. |
| `Combo.js` | Bundle/combo products. |
| `Workspace.js` | User workspace/folder organization. |

Simple meaning:

```text
models = database table/collection ka shape
```

### `middleware/`

Middleware ka matlab request ke beech me check lagana.

Request controller tak jane se pehle middleware pass hota hai.

Example:

```text
User /api/documents/upload hit karta hai
  -> auth middleware checks login
  -> quota middleware checks plan limit
  -> upload middleware checks file
  -> controller runs
```

Important middleware:

| File | Kaam |
| --- | --- |
| `auth.js` | JWT login/admin/permission check. |
| `authRateLimit.js` | Login/reset spam limit. |
| `aiRateLimit.js` | AI request limit. |
| `aiEnabled.js` | AI feature enabled hai ya nahi. |
| `quota.js` | User plan quota check. |
| `upload.js` | Study document upload validation. |
| `uploadResource.js` | Store/admin resource upload validation. |
| `errorHandler.js` | 404/errors ko clean response me convert karta hai. |

Simple meaning:

```text
middleware = security/checking gate
```

### `services/`

Service ka matlab reusable business logic.

Controller request handle karta hai, lekin heavy kaam services karti hain.

Example:

```text
documentController.js
  -> documentGeneration.js
  -> gemini.js
  -> rag.js
  -> MongoDB save
```

Important services:

| File | Kaam |
| --- | --- |
| `gemini.js` | Gemini AI prompts/calls. |
| `geminiHelpers.js` | Gemini response parse, retry, fallback, errors. |
| `generationOrchestrator.js` | Multi-step AI generation manage karta hai. |
| `documentGeneration.js` | Upload/link se document generation support. |
| `rag.js` | Vector embeddings, semantic search, RAG context. |
| `retrieval.js` | Ask/tutor ke liye relevant documents find karta hai. |
| `linkExtractor.js` | Website/YouTube text extract karta hai. |
| `fileExtractor.js` | Uploaded file se text extract karta hai. |
| `fileStorage.js` | Resource/file storage helpers. |
| `email.js` | Verification/reset emails bhejta hai. |
| `razorpay.js` | Razorpay helper logic. |
| `stripe.js` | Legacy Stripe helper logic. |
| `billingPricing.js` | Plan pricing helpers. |
| `planCatalog.js` | Plan list/settings helpers. |
| `planExpiry.js` | Plan expire/downgrade logic. |
| `keyBalancer.js` | Gemini keys me se best key select karta hai. |
| `keyCrypto.js` | Admin saved keys encrypt/decrypt karta hai. |
| `spacedRepetition.js` | Flashcard review schedule. |
| `studyStreak.js` | Daily streak/activity calculate karta hai. |
| `workspaceAccess.js` | Workspace access/permission helpers. |
| `adminAudit.js` | Admin actions log karta hai. |

Simple meaning:

```text
services = heavy kaam karne wale helper modules
```

### `utils/`

Utils small helper functions hote hain.

Ye chhote reusable functions hain jo controllers/services me use hote hain.

| File | Kaam |
| --- | --- |
| `textClean.js` | Text clean/normalize. |
| `parseNoteSections.js` | Markdown headings ko sections me split. |
| `objectId.js` | Mongo ObjectId check. |
| `notesChunk.js` | Large notes ko chunks me split/merge. |
| `documentTags.js` | Tags clean/normalize. |
| `dateKey.js` | Date/streak key banata hai. |

Simple meaning:

```text
utils = chhote helper tools
```

### `scripts/`

Scripts one-time ya manual commands ke liye hote hain.

| File | Kaam |
| --- | --- |
| `seedData.js` | Admin/demo user and sample data create karta hai. |
| `embedBackfill.js` | Purane documents/resources ke embeddings create karta hai. |

## 12. Backend Request Flow

Example: user document upload karta hai.

```text
1. Browser me Upload page open
2. User file select karta hai
3. client/src/pages/Upload.jsx form submit karta hai
4. client/src/api/client.js backend ko request bhejta hai
5. server/src/routes/documents.js request route pakadta hai
6. middleware/auth.js login check karta hai
7. middleware/quota.js plan limit check karta hai
8. middleware/upload.js file validate karta hai
9. documentController.js main upload logic chalata hai
10. fileExtractor.js file se text nikalta hai
11. generationOrchestrator.js AI steps manage karta hai
12. gemini.js Gemini se notes/flashcards banwata hai
13. Document.js MongoDB me data save karta hai
14. response frontend ko wapas jata hai
15. React page generated notes show karta hai
```

## 13. Login/Auth Flow

```text
client/src/pages/Login.jsx
  -> AuthContext login()
  -> api/client.js POST /api/auth/login
  -> server/src/routes/auth.js
  -> server/src/controllers/authController.js
  -> server/src/models/User.js
  -> password check
  -> JWT token create
  -> frontend token save
  -> protected pages unlock
```

## 14. AI Notes Flow

```text
Upload/link text
  -> documentController.js
  -> fileExtractor.js or linkExtractor.js
  -> generationOrchestrator.js
  -> keyBalancer.js
  -> gemini.js
  -> geminiHelpers.js
  -> Document.js save
  -> frontend DocumentView.jsx show
```

## 15. Store/Payment Flow

```text
Store page
  -> catalog API
  -> Course/Resource/Combo models
  -> CartContext cart me item add karta hai
  -> Checkout page
  -> billingController.js
  -> razorpay.js order create
  -> payment verify
  -> Purchase.js me access save
  -> MyDownloads page resource show karta hai
```

## 16. Admin Flow

```text
Admin login
  -> App.jsx admin route check
  -> AdminLayout.jsx admin UI
  -> Admin pages
  -> /api/admin routes
  -> adminController.js
  -> Settings/User/Document/ApiUsage models
```

Admin ka kaam:

- Users manage karna.
- AI keys manage karna.
- Billing/pricing manage karna.
- Catalog/resources/combos manage karna.
- Usage/audit logs dekhna.

## 17. Common Folder Name Dictionary

| Name | Simple Meaning |
| --- | --- |
| `root` | Project ka main folder. |
| `client` | Frontend/browser app. |
| `server` | Backend/API/database logic. |
| `src` | Source code folder. |
| `api` | Frontend se backend request bhejne ka code. |
| `components` | Reusable UI blocks. |
| `pages` | Full screens/routes. |
| `config` | Fixed settings/options. |
| `context` | Global frontend state. |
| `hooks` | Reusable React logic. |
| `lib` | Feature helper libraries. |
| `utils` | Small helper functions. |
| `routes` | Backend API URL map. |
| `controllers` | Backend request ka main logic. |
| `models` | MongoDB data structure. |
| `middleware` | Request ke beech ke checks/security gates. |
| `services` | Heavy/reusable backend business logic. |
| `scripts` | Manual/one-time command files. |
| `public` | Static files jo browser directly access kar sakta hai. |
| `docs` | Extra documentation. |

## 18. Kaunsi File Kab Open Karni Chahiye?

| Aapko kya samajhna hai? | Pehle ye file/folder open karo |
| --- | --- |
| App start kaise hoti hai? | `client/src/main.jsx`, `client/src/App.jsx`, `server/src/index.js` |
| URL kis page par ja raha hai? | `client/src/App.jsx` |
| API request kahan se ja rahi hai? | `client/src/api/client.js` |
| Login kaise kaam karta hai? | `client/src/context/AuthContext.jsx`, `server/src/controllers/authController.js` |
| Upload kaise kaam karta hai? | `client/src/pages/Upload.jsx`, `server/src/controllers/documentController.js` |
| AI kaise call hoti hai? | `server/src/services/gemini.js`, `server/src/services/generationOrchestrator.js` |
| Database structure kya hai? | `server/src/models/` |
| API URL ka map kya hai? | `server/src/routes/` |
| Env values kahan read hoti hain? | `server/src/config/env.js` |
| MongoDB connect kahan hota hai? | `server/src/config/db.js` |
| Admin ka code kahan hai? | `client/src/pages/admin/`, `server/src/controllers/adminController.js` |
| Store ka code kahan hai? | `client/src/pages/store/`, `server/src/routes/catalog.js` |

## 19. Ek Rule Yaad Rakho

Frontend:

```text
pages call components
components show UI
api sends request
context stores global state
```

Backend:

```text
routes receive URL
middleware checks request
controllers run main logic
services do heavy work
models talk to MongoDB
utils help everywhere
```

Full app:

```text
User
  -> Client page
  -> Client api
  -> Server route
  -> Middleware
  -> Controller
  -> Service
  -> Model/Database
  -> Response
  -> UI update
```

## 20. Is Project Ko Padhne Ka Best Order

Beginner ke liye ye order follow karo:

1. `PROJECT_EXPLAINED_HINGLISH.md` read karo.
2. `README.md` ka commands/setup section read karo.
3. `client/src/App.jsx` read karo, routes samjho.
4. `client/src/api/client.js` read karo, API call samjho.
5. `server/src/index.js` read karo, backend start samjho.
6. `server/src/routes/auth.js` and `server/src/controllers/authController.js` read karo.
7. `server/src/models/User.js` read karo.
8. Phir upload flow: `Upload.jsx`, `documents.js`, `documentController.js`, `gemini.js`.

Is tarah aapko project dheere-dheere clear ho jayega.
