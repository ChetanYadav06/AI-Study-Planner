# AI Study Planner — Backend Service

A high-performance Spring Boot 3.4.3 REST API providing authentication, study goal management, focus session analytics, and AI-powered curriculum roadmap generation powered by Google Gemini models.

---

## 🛠️ Technology Stack

- **Framework**: Spring Boot 3.4.3
- **Language**: Java 24
- **Security**: Spring Security 6 with stateless JWT authentication (HMAC-SHA512)
- **Database**: MySQL 8.0 with Spring Data JPA & Hibernate ORM 6.6
- **Connection Pooling**: HikariCP
- **AI Integration**: Google Gemini API via Spring `RestClient` (Multi-model fallback chain: `gemini-3.5-flash-lite` -> `gemini-2.5-flash` -> `gemini-flash-lite-latest`)
- **Validation**: Jakarta Bean Validation (`@Valid`)
- **Testing**: JUnit 5, Mockito, Spring Boot Test, Spring Security Test

---

## 🏛️ Directory Architecture

```
backend/src/main/java/com/aistudyplanner/
├── config/        # SecurityConfig, WebConfig (CORS origin mapping)
├── controller/    # REST Controllers (Auth, Goal, Roadmap, Session, Topic, Progress, Health)
├── dto/           # Data Transfer Objects & Validation Schemas
├── entity/        # JPA Entities (User, Goal, SavedRoadmap, StudentProfile, etc.)
├── exception/     # Global Exception Handling & RFC 7807 ProblemDetails
├── repository/    # Spring Data JPA Repositories with tenant isolation queries
├── security/      # JwtUtil, JwtAuthenticationFilter, CustomUserDetailsService, RateLimiters
└── service/       # Business Logic, AI Roadmap Engine, Validation, and Progress Sync
```

---

## 📡 REST API Summary

### 1. Authentication & Users (`/api/auth`, `/api/user`)
- `POST /api/auth/register` — Register student account
- `POST /api/auth/login` — Authenticate and receive JWT bearer token
- `GET /api/user/profile` — Fetch basic authenticated user details

### 2. Personalization & Knowledge (`/api/profile`, `/api/topics`)
- `GET /api/profile` — Fetch student learning preferences and background
- `PUT /api/profile` — Update learning preferences and study duration
- `GET /api/topics/knowledge` — Retrieve student topic competency ratings
- `POST /api/topics/knowledge/bulk` — Update competency levels for topics

### 3. Learning Goals (`/api/goals`)
- `GET /api/goals` — List student's learning goals
- `POST /api/goals` — Create a new learning goal
- `PATCH /api/goals/{id}/status` — Update goal completion status & progress %
- `DELETE /api/goals/{id}` — Delete a learning goal

### 4. AI Curriculum Roadmap Generation (`/api/ai/roadmap`)
- `POST /api/ai/roadmap/generate` — Asynchronously initiates generation job (returns `202 Accepted` with `jobId`)
- `GET /api/ai/roadmap/generate/{jobId}` — Polls generation job state (`QUEUED`, `RUNNING`, `DONE`, `FAILED`)
- `POST /api/ai/roadmap` — Synchronous generation fallback

### 5. Saved Roadmaps & Schedule Progress (`/api/roadmaps`)
- `GET /api/roadmaps` — List all saved roadmaps for the authenticated student
- `POST /api/roadmaps` — Persist generated roadmap
- `PATCH /api/roadmaps/{id}/progress` — Synchronize completed canonical task IDs & recalculate progress %
- `DELETE /api/roadmaps/{id}` — Remove saved roadmap

### 6. Topic Expansions & Extra Topics (`/api/roadmaps/{id}/days/{day}/topics`)
- `POST /api/roadmaps/{id}/days/{day}/topics/expand` — Generates on-demand markdown deep-dive tutorial
- `POST /api/roadmaps/{id}/days/{day}/topics/extra` — Adds supplementary topic to day
- `GET /api/roadmaps/{id}/days/{day}/topics` — Lists all expansions and extra topics for day

### 7. Study Sessions & Focus Timer (`/api/study-sessions`)
- `POST /api/study-sessions` — Records completed focus interval
- `GET /api/study-sessions` — Lists recent study sessions
- `GET /api/study-sessions/stats` — Aggregates study time, weekly metrics, and streaks

### 8. Task Feedback & Link Checking (`/api/task-feedback`, `/api/resources`)
- `POST /api/task-feedback` — Rates difficulty of daily tasks
- `POST /api/resources/verify` — Validates external documentation URL reachability

---

## 🚀 Running & Testing Locally

```powershell
# Run backend development server (port 8080)
mvn spring-boot:run

# Execute full automated test suite (108 unit & integration tests)
mvn test
```
