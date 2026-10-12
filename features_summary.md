# AI Study Planner — Implemented Features Summary

> **Current Status:** Phases 1–3 are fully implemented and verified. Phases 4–8 are pending.

---

## 🗃️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + **JavaScript (JSX)** + Tailwind CSS v4 (Vite) |
| Backend | Java Spring Boot 3.4.3 (Maven) |
| Database | MySQL 8.0 (Spring Data JPA + HikariCP) |
| Auth | Spring Security + JWT (HS512) + BCrypt |
| AI (Pending) | Google Gemini API (`gemini-1.5-flash`) |

---

## ✅ Phase 1 — Project Foundation & Infrastructure

### Backend
- Spring Boot application bootstrapped with Maven (`pom.xml`)
- MySQL 8.0 datasource configured with `createDatabaseIfNotExist=true` (auto-creates `ai_study_planner` DB)
- HikariCP connection pooling
- CORS policy configured for the frontend origin
- **Health Check Endpoint** — `GET /api/health`:
  - Returns server status, database connectivity status, DB product name & version, and response time in ms

### Frontend
- Vite + React 19 + **JavaScript (JSX)** scaffold (no TypeScript)
- Tailwind CSS v4 integrated via `@tailwindcss/vite` plugin
- Axios HTTP client configured with `/api` base URL
- Vite dev-server reverse proxy: `/api → http://localhost:8080`
- **Phase1Overview** landing page shown to unauthenticated users
- MySQL status badge visible from the UI (health API probe)

### Scripts
- `scripts/start-mysql.ps1` — Starts MySQL server on port 3306 (with already-running check)
- `scripts/stop-mysql.ps1` — Safely stops MySQL server

---

## ✅ Phase 2 — Authentication System (JWT)

### Backend
- **User Registration** — `POST /api/auth/register` (Public)
  - Validates unique email, hashes password with BCrypt, returns JWT token
- **User Login** — `POST /api/auth/login` (Public)
  - Validates credentials, returns JWT Bearer token on success
- **Get User Profile** — `GET /api/user/profile` (Protected)
  - Returns authenticated student's `id`, `name`, `email`, `createdAt`
- JWT utilities: `JwtUtil.java` (token generation, validation, expiry: 24h)
- JWT filter: `JwtAuthenticationFilter.java` (validates token on every protected request)
- Custom UserDetailsService loads user by email from MySQL

### Frontend
- **AuthModal component** (`AuthModal.jsx`):
  - Toggle between **Login** and **Register** modes in a single modal
  - Shows/hides password toggle (eye icon)
  - Client-side validations: required fields, password length >= 6, password confirmation match
  - Displays success and error messages
  - Saves JWT token + user info to `localStorage` on success
- **AuthContext** (`AuthContext.jsx`):
  - React context providing `user`, `isAuthenticated`, `login()`, `register()`, `logout()` globally
  - Auto-restores session from `localStorage` on page reload
  - Dispatches `auth:unauthorized` event on 401 (auto-logout)
- **Axios interceptors** in `api.js`:
  - Request interceptor: attaches `Authorization: Bearer <token>` header automatically
  - Response interceptor: clears token and triggers logout on 401

---

## ✅ Phase 3 — Student Dashboard & Learning Goals Engine

### Backend REST API (all routes Protected — require Bearer token)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/goals` | Create a new learning goal |
| `GET` | `/api/goals` | List all goals for the authenticated student (sorted newest-first) |
| `GET` | `/api/goals/{id}` | Get a single goal by ID |
| `PATCH` | `/api/goals/{id}/status` | Update goal status and/or progress % |
| `DELETE` | `/api/goals/{id}` | Delete a learning goal |
| `GET` | `/api/dashboard/stats` | Get aggregated dashboard statistics |

**Goal Fields:** `title`, `description`, `targetDays` (1–365), `hoursPerDay` (0.5–24), `skillLevel` (`BEGINNER` / `INTERMEDIATE` / `ADVANCED`), `status` (`NOT_STARTED` / `IN_PROGRESS` / `COMPLETED` / `ARCHIVED`), `progressPercentage` (0–100)

**Data isolation:** Each student can only access their own goals — enforced at the DB query level (`findByIdAndUserId`)

**Business logic in GoalService:**
- Auto-sets status to `COMPLETED` when `progressPercentage` reaches 100
- Auto-promotes status from `NOT_STARTED` to `IN_PROGRESS` when progress > 0
- Dashboard stats aggregate: total goals, active, completed, total daily hours, study streak

### Frontend — Student Dashboard (`StudentDashboard.jsx`)

**Metric Cards (live from API):**
- Active Goals count (with total & completed sub-stats)
- Daily Study Target (total hours/day across active goals)
- Study Streak Days
- Roadmaps Generated (shows 0 until Phase 4)

**Goal Management:**
- Create Learning Goal button opens `CreateGoalModal`
- Refresh Dashboard button with spinning animation while loading
- Filter goals by status: `ALL` / `NOT_STARTED` / `IN_PROGRESS` / `COMPLETED`
- **Goal cards** display: title, description, skill level badge (color-coded), status badge, progress bar, target days, hours/day
- **Progress controls** on each card: `+10%` / `-10%` increment buttons (auto-updates status)
- **Status dropdown** on each card: manually change to any status
- Delete goal with confirmation prompt
- Generate Roadmap button (placeholder; will activate in Phase 4)
- Action notification banner (auto-dismisses after 3 seconds)

**Create Goal Modal (`CreateGoalModal.jsx`):**
- 4 one-click **topic presets**: Full-Stack Spring Boot, Machine Learning & AI, DSA for Interviews, Cloud Architecture
- Free-form fields: title, description, target days, hours/day, skill level (radio selector)
- Client-side validation with error display
- Submits to `POST /api/goals` and refreshes the dashboard on success

**System Health Panel:**
- Shows backend status, database product + version, and API response time in ms

---

## 🖥️ UI / Layout

- **Navbar** (`Navbar.jsx`): Logo, app name, Login/Register buttons, user avatar with name & email
- **Sidebar** (`Sidebar.jsx`): Navigation tabs — Dashboard, Create Roadmap, My Roadmaps, Study Timetable, Progress, Profile; locked tabs prompt login
- **ProfileView** (`ProfileView.jsx`): Displays authenticated user's name, email, account creation date, security info, and truncated JWT token
- Responsive layout: sidebar + main content area, adapts for mobile

---

## 🔧 Recent UI Changes

- **Removed** Milestone Progress phase tracker (P1–P4 checklist) from the sidebar
- **Removed** Spring Boot, MySQL, and Gemini tech-stack badge pills from the navbar
- **Migrated** entire frontend codebase from **TypeScript to JavaScript** — all `.ts` / `.tsx` files converted to `.js` / `.jsx`, TypeScript and `@types` packages removed from `package.json`

---

## ⏳ Phases 4–8 (Not Yet Implemented)

| Phase | Description |
|---|---|
| **Phase 4** | Gemini AI integration — generate day-wise study roadmaps from a learning goal |
| **Phase 5** | Timetable generation, roadmap save/manage, task scheduling |
| **Phase 6** | Task completion tracking, study timer, session recording |
| **Phase 7** | Progress analytics with charts (Recharts already installed), UI refinement |
| **Phase 8** | End-to-end testing, security audit, final polish |

> [!NOTE]
> The Gemini API key config is already wired into `application.properties` via `$env:GEMINI_API_KEY` — ready for Phase 4 activation.
