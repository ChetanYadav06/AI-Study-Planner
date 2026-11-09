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

## 🔧 Recent UI Optimizations

- **Added Project Phases & Progress Tracker** (`ProjectPhasesTracker.jsx`) prominently on the **Student Dashboard** and unauthenticated landing page, tracking all 8 project development phases (P1–P8) with completion percentages and key deliverables.
- **Added dedicated "Project Phases" tab** to the sidebar navigation (`Sidebar.jsx`) for one-click access by students, evaluators, and reviewers.
- **Removed unnecessary columns & blocks not used by students**:
  - Removed duplicate/redundant 4th metric card ("AI Roadmaps - ready for AI synthesis") and replaced it with a real **Overall Progress** metric (% average completion with mini progress bar).
  - Removed developer debugging blocks (HikariCP connection pool specs, database InnoDB tables, BCrypt hash rounds, and REST endpoints table).
  - Removed raw truncated JWT Bearer token hash from student ProfileView.
- **Enhanced Goal Cards with Study Phase progression**:
  - Added learning milestone phase badges (`Phase 1: Fundamentals`, `Phase 2: Core Concepts`, `Phase 3: Applied Practice`, `Phase 4: Advanced Mastery`) dynamically determined by goal completion %.
  - Added streamlined progress controls (`-10%`, `+10%`, and 1-click `Complete`).
  - Added rich AI Study Roadmap multi-phase preview modal.
- **Migrated** entire frontend codebase to **JavaScript (JSX)** (React 19 + Tailwind CSS v4 + Vite).

---

## 🚀 Student Profile & Knowledge-Aware Interactive AI Roadmap Experience (Fully Implemented)

### 1. Student Learning Profile (`/api/profile`, `ProfileView.jsx`)
- **Profile Overview**: Displays student account credentials, education level, academic background, career goal, and overall experience level (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`).
- **Profile Readiness Meter**: Dynamically calculated percentage based on actual saved profile data and skills count.
- **Study Schedule**: Configurable daily study hours, days per week, and preferred focus time windows.
- **Learning Preferences**: Interactive selectors for learning methods (video, reading, coding practice, projects, quizzes), explanation styles (simple, step-by-step, technical, examples-first), and practice formats (coding problems, MCQs, mini-projects, real-world scenarios).
- **AI Tutor Guidance**: Dedicated context area ("What should your AI study planner know about you?") securely fed into Gemini prompts.

### 2. My Skills & Topic-Level Knowledge Engine (`/api/skills`, `StudentTopicKnowledge.java`)
- **Knowledge Level Tracking**: `MASTERED`, `INTERMEDIATE`, `BEGINNER`, `NOT_LEARNED`.
- **Full CRUD & Search**: Fast search, domain suggestions, 1-click level cycle/upgrade, and deletion.
- **Bulk Diagnostic Import**: Supports batch updating from roadmap wizard starting point checks.
- **Student Data Isolation**: Fully enforced at the repository and service layers via authenticated principal.

### 3. Creative 5-Step AI Roadmap Generation Wizard (`RoadmapWizard.jsx`)
- **Step 1: Goal Definition**: Curriculum presets (Java DSA, Full-Stack, SQL, Machine Learning) or custom topic with goal linking.
- **Step 2: Starting Knowledge Calibration**: Automatic extraction of topic-specific skills; intuitive 1-click ratings ("I already know this", "I know the basics", "I need to learn this", "I'm not sure" with diagnostic check tip). Automatically persists knowledge to backend.
- **Step 3: Target & Study Budget**: Duration days, daily commitment, realistic workload check with total study hours calculator.
- **Step 4: Pedagogy Customization**: Explanation style and practice format adjustments without overwriting permanent profile.
- **Step 5: Review & Synthesize**: Summary specification and animated AI generation with error handling.

### 5. Visual Interactive Roadmap & Backend Progress Persistence (`InteractiveRoadmap.jsx`, `SavedRoadmap.java`)
- **Connected Milestone Journey Track**: Visual stage progression from Start to Mastery with milestone status nodes.
- **Expandable Topic & Daily Task Cards**: Title, activity tags (`STUDY`, `PRACTICE`, `REVISION`, `ASSESSMENT`), estimated duration, objectives, and prerequisites.
- **Prerequisite Locking**: Dynamic states (`LOCKED`, `READY_TO_LEARN`, `IN_PROGRESS`, `COMPLETED`).
- **MySQL Progress Persistence**: Checking/unchecking tasks and milestones saves directly to MySQL via `/api/ai/roadmaps/{id}/progress`.
- **Knowledge-Aware Gemini Synthesis**: Mastered topics bypass introductory syntax, intermediate topics receive applied practice, and beginner topics receive foundational theory.
