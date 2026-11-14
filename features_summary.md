# AI Study Planner — Implemented Features Summary

> **Current Status:** Phases 1–7 are fully implemented and verified. The application is production-ready for student learning roadmap synthesis, schedule management, and focus tracking.

---

## 🗃️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19.3.0 + JavaScript (JSX) + Tailwind CSS v4.3.3 (Vite 8.3.0) |
| Backend | Java 24 + Spring Boot 3.4.3 (Maven 3.9+) |
| Database | MySQL 8.0 (Spring Data JPA + Hibernate ORM 6.6 + HikariCP) |
| Auth & Security | Spring Security 6.4 + Stateless JWT (HMAC-SHA512) + BCrypt |
| Artificial Intelligence | Google Gemini API (`gemini-3.5-flash-lite`, `gemini-2.5-flash`, `gemini-flash-lite-latest`) |

---

## ✅ Phase 1 — Project Foundation & Infrastructure
- Spring Boot 3.4.3 backend bootstrapped with Maven.
- MySQL 8.0 datasource configuration with HikariCP connection pooling.
- Health Check Endpoint (`GET /api/health`) reporting server and MySQL status and response times.
- Vite + React 19 + Tailwind CSS v4 frontend with reverse proxy (`/api -> http://localhost:8080`).
- Cross-Origin Resource Sharing (CORS) security configuration.
- Local startup automation scripts (`scripts/start-mysql.ps1`, `scripts/stop-mysql.ps1`).

---

## ✅ Phase 2 — Authentication & Security Engine
- **User Registration** (`POST /api/auth/register`): Validates uniqueness, hashes password with BCrypt, issues signed JWT token.
- **User Login** (`POST /api/auth/login`): Validates credentials, returns JWT Bearer token with expiration.
- **User Profile** (`GET /api/user/profile`): Retrieves authenticated user identity.
- **Frontend Authentication Modal** (`AuthModal.jsx`): Login/Register toggle, client validations, JWT persistence in `localStorage`.
- **Axios Interceptors** (`api.js`): Automatic Bearer token header injection and 401 unauthorized session eviction.

---

## ✅ Phase 3 — Student Dashboard & Learning Goals Engine
- **Learning Goals REST API** (`/api/goals`): Full CRUD for study targets with target days, daily hours, priority, and skill level.
- **Dashboard Metrics** (`GET /api/dashboard/stats`): Aggregated statistics on active goals, daily commitment, and completion rates.
- **Student Data Isolation**: Query-level multi-tenancy (`findByIdAndUserId`) ensuring students cannot access each other's goals.

---

## ✅ Phase 4 — Design System & UI Standardization
- **Phase 4 Minimalist SaaS Design System**: Modern, clean, professional EdTech interface.
- Standardized UI primitives in `frontend/src/components/ui/` (`Button`, `Card`, `ConfirmDialog`, `EmptyState`, `PageHeader`, `ProgressBar`, `StatusText`).
- Token-based design tokens using Tailwind v4 (no arbitrary hex colors or custom inline styling).
- Accessible typography, responsive layouts, and zero console warnings.

---

## ✅ Phase 5 — System Hardening & Quality Defenses
- **Sliding Window Rate Limiters**:
  - Max 5 failed login attempts per 15 minutes per IP/email.
  - Max 5 AI roadmap generation requests per hour per authenticated student.
  - Max 10 resource link verifications per 5 minutes.
- **Resource Link Verification** (`ResourceController.java`): Safe URL reachability verification restricted to an allowlist of trusted developer domains (Python, PyTorch, HuggingFace, Spring, MDN, etc.) with SSRF and loopback blocking.
- **Task Feedback System** (`TaskFeedbackController.java`): Students can rate task difficulty (`TOO_EASY`, `JUST_RIGHT`, `TOO_HARD`).
- **Progress Endpoint** (`GET /api/progress/overview`): Unified progress analytics across roadmaps, tasks, and focus sessions.

---

## ✅ Phase 6 — Personalization, Preferences & Topic Knowledge
- **Student Profile API** (`GET /api/profile`, `PUT /api/profile`): Comprehensive profile calibration including education level, career goals, daily study hours, available days, and preferred learning methods.
- **Topics & Knowledge Base** (`/api/topics/knowledge`): Competency tracking matrix (`NOT_LEARNED`, `BEGINNER`, `INTERMEDIATE`, `MASTERED`) with category grouping and interactive level selector.
- **Learning Preferences UI** (`LearningPreferencesSection.jsx`): Interactive cards for pace, study format, explanation depth, and practice problem types.
- **AI Prompt Dynamic Calibration**: Knowledge levels and preferences automatically steer the prompt to skip mastered topics and emphasize preferred learning formats.

---

## ✅ Phase 7 — Reliable Generation, Interactive Roadmap & Topic Expansions
- **Asynchronous Roadmap Generation Jobs**:
  - `POST /api/ai/roadmap/generate`: Initiates background generation job (`202 Accepted` with `jobId`).
  - `GET /api/ai/roadmap/generate/{jobId}`: Real-time progress polling (`state`, `phasesDone`, `phasesTotal`, `message`).
  - In-memory job store with thread pool execution and automatic 30-minute TTL cleanup.
- **Two-Pass Generation & Multi-Model Fallback**:
  - Call 1 generates high-level curriculum outline.
  - Granular per-phase calls generate daily tasks and learning objectives.
  - Resilient model fallback chain: `gemini-3.5-flash-lite` -> `gemini-2.5-flash` -> `gemini-flash-lite-latest`.
  - Single canonical task ID calculation for consistent progress representation across dashboard, goals, and roadmap views.
- **On-Demand Topic Expansions** (`TopicExpansionController.java`):
  - Students can click any topic to generate deep-dive markdown tutorials on demand.
  - Stored in dedicated `topic_expansions` table without modifying the base roadmap schema.
- **Supplementary Schedule Topics** (`DayExtraTopic.java`):
  - Ability to attach additional learning topics to specific roadmap days.
- **Safe Markdown Renderer** (`SafeMarkdown.jsx`): Lightweight, dependency-free markdown parser rendering headings, lists, bold text, and code blocks safely without external libraries.
