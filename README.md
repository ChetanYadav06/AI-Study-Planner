# AI Study Planner – Personalized Learning Roadmap Generator

An AI-powered web application that helps students plan their learning journeys, generate structured day-wise study roadmaps, organize daily schedules, and track learning progress using Google Gemini AI.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS | Vite build tool, Lucide React icons, Recharts |
| **Backend** | Java Spring Boot 3.4.3 | Spring Data JPA, Spring Security, RESTful Web Services |
| **Database** | MySQL 8.0 | Relational database with InnoDB engine & HikariCP connection pooling |
| **AI Integration** | Google Gemini API | Structured learning breakdown & timetable synthesis |
| **Security** | Spring Security + JWT | BCrypt password hashing & stateless JWT token bearer auth |

---

## 📁 Project Architecture

```
AI Study Planner/
├── backend/                        # Java Spring Boot REST API
│   ├── src/main/java/com/aistudyplanner/
│   │   ├── AiStudyPlannerApplication.java  # Main application entry point
│   │   ├── config/                # WebMvc CORS, Security filter chain
│   │   ├── controller/            # REST API Controllers (Health, Auth, etc.)
│   │   ├── dto/                   # Data Transfer Objects
│   │   ├── entity/                # JPA Entity Models (Phase 2+)
│   │   ├── repository/            # Spring Data JPA Repositories (Phase 2+)
│   │   └── service/               # Business Logic & AI Services (Phase 2+)
│   ├── src/main/resources/
│   │   └── application.properties # Spring & MySQL Datasource configuration
│   └── pom.xml                    # Maven build file with dependencies
│
├── frontend/                       # React.js Client Application
│   ├── src/
│   │   ├── components/            # UI components (Navbar, Sidebar, Dashboard)
│   │   ├── services/api.ts        # Axios client with JWT interceptor & health probe
│   │   ├── App.tsx                # Main App wrapper & sidebar navigation
│   │   ├── main.tsx               # Application mount point
│   │   └── index.css              # Tailwind CSS stylesheet
│   ├── vite.config.ts             # Vite configuration with /api reverse proxy
│   └── package.json               # Frontend dependencies & scripts
│
├── scripts/                        # Utility scripts
│   ├── start-mysql.ps1            # Starts local MySQL 8.0 daemon
│   └── stop-mysql.ps1             # Stops MySQL server safely
│
├── dev.ps1                         # ⚡ One-command launcher (MySQL + backend + frontend)
├── stop.ps1                        # 🛑 One-command shutdown
├── package.json                    # Root npm scripts (npm run dev / stop / build)
└── README.md                       # Project documentation & instructions
```

---

## 🚀 Getting Started

### Prerequisites
- **Java Development Kit (JDK):** Version 17, 21, or 24 (Tested on Oracle JDK 24)
- **Apache Maven:** Version 3.8+ (Tested on Maven 3.9.9)
- **Node.js & npm:** Node v18+ & npm v9+ (Tested on Node v22.15.0, npm 11.4.2)
- **MySQL Server 8.0** installed locally

---

### One-Command Launch

From the project root, run:

```powershell
.\dev.ps1
```

This single script will:
1. **Start MySQL 8.0** (waits until it's fully ready before continuing)
2. **Start the Spring Boot backend** on `http://localhost:8080` (in a new terminal window)
3. **Start the Vite frontend** on `http://localhost:5173` (in a new terminal window)

> **Tip:** If MySQL is already running (e.g. as a Windows service), skip the MySQL step:
> ```powershell
> .\dev.ps1 -SkipMysql
> ```

You can also use the root npm scripts if you prefer:
```powershell
npm run dev     # start everything
npm run stop    # stop everything
```

---

### Stop Everything

```powershell
.\stop.ps1
```

Gracefully shuts down MySQL, the Spring Boot JVM, and the Vite dev server.

---

### First-Time Setup

1. **Install frontend dependencies** (only needed once):
   ```powershell
   npm run install:all
   ```

2. **Database password** — if your MySQL `root` user has a password, set it before running:
   ```powershell
   $env:DB_PASSWORD = "your_password"
   .\dev.ps1
   ```
   Or edit `backend/src/main/resources/application.properties` directly.

3. **Gemini API key** (for AI roadmap generation):
   ```powershell
   $env:GEMINI_API_KEY = "your-gemini-api-key-here"
   .\dev.ps1
   ```

---

### 5. Gemini API Key Configuration (Phase 4)

Set your Google Gemini API key as an environment variable before launching the backend:

**Windows PowerShell:**
```powershell
$env:GEMINI_API_KEY="your-gemini-api-key-here"
```

**Linux / macOS:**
```bash
export GEMINI_API_KEY="your-gemini-api-key-here"
```

The Spring Boot backend injects this via `@Value("${gemini.api.key}")`. The key is never exposed to the frontend or committed to source control.

---

## 📊 Development Phases

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | Project setup, React frontend, Spring Boot backend, MySQL configuration and database connectivity | ✅ **Completed & Verified** |
| **Phase 2** | User registration, login, JWT authentication, and protected routes | ✅ **Completed & Verified** |
| **Phase 3** | Student dashboard, learning goal creation, and database integration | ✅ **Completed & Verified** |
| **Phase 4** | Gemini API integration, AI roadmap generation, structured JSON validation, and preview | ⏳ Pending Approval |
| **Phase 5** | Timetable generation, roadmap management, and task scheduling | ⏳ Pending |
| **Phase 6** | Task completion, study timer, session recording, and progress tracking | ⏳ Pending |
| **Phase 7** | Progress analytics, charts, UI refinement, and responsive design | ⏳ Pending |
| **Phase 8** | End-to-end testing, bug fixing, security checks, and final polish | ⏳ Pending |

---

## 🔐 Authentication REST API (Phase 2)

### 1. Register Student
`POST /api/auth/register` (Public)
```json
{
  "name": "Student Name",
  "email": "student@example.com",
  "password": "Password123!"
}
```
**Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "type": "Bearer",
  "id": 1,
  "name": "Student Name",
  "email": "student@example.com",
  "message": "Registration successful! Welcome to AI Study Planner."
}
```

### 2. Login Student
`POST /api/auth/login` (Public)
```json
{
  "email": "student@example.com",
  "password": "Password123!"
}
```
**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "type": "Bearer",
  "id": 1,
  "name": "Student Name",
  "email": "student@example.com",
  "message": "Login successful. Welcome back, Student Name!"
}
```

### 3. Get Student Profile
`GET /api/user/profile` (Protected - Requires `Authorization: Bearer <token>`)
**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Student Name",
  "email": "student@example.com",
  "createdAt": "2026-10-04T15:00:02"
}
```
If unauthenticated or invalid token, returns `401 Unauthorized`.

---

## 🎯 Learning Goals & Dashboard REST API (Phase 3)

### 1. Create Learning Goal
`POST /api/goals` (Protected - Requires `Authorization: Bearer <token>`)
```json
{
  "title": "Master Spring Boot 3 & Microservices",
  "description": "Cover JPA, Security, REST, Docker, and Microservices architecture.",
  "targetDays": 30,
  "hoursPerDay": 3.0,
  "skillLevel": "INTERMEDIATE"
}
```
**Response (201 Created):**
```json
{
  "id": 1,
  "userId": 1,
  "title": "Master Spring Boot 3 & Microservices",
  "description": "Cover JPA, Security, REST, Docker, and Microservices architecture.",
  "targetDays": 30,
  "hoursPerDay": 3.0,
  "skillLevel": "INTERMEDIATE",
  "status": "NOT_STARTED",
  "progressPercentage": 0,
  "createdAt": "2026-10-04T20:40:00",
  "updatedAt": "2026-10-04T20:40:00"
}
```

### 2. List Student's Learning Goals
`GET /api/goals` (Protected)
Returns list of goals isolated strictly to the authenticated student, sorted newest first.

### 3. Update Goal Status & Progress
`PATCH /api/goals/{id}/status` (Protected)
```json
{
  "status": "IN_PROGRESS",
  "progressPercentage": 45
}
```

### 4. Delete Goal
`DELETE /api/goals/{id}` (Protected)
Returns `200 OK` with `{"message": "Learning goal deleted successfully."}`.

### 5. Get Student Dashboard Aggregated Stats
`GET /api/dashboard/stats` (Protected)
**Response (200 OK):**
```json
{
  "totalGoals": 3,
  "activeGoals": 2,
  "completedGoals": 1,
  "dailyTargetHours": 5.5,
  "studyStreakDays": 1,
  "roadmapsGenerated": 0
}
```

---

## 🧪 Testing & Verification

1. **Backend Integration Tests:** Verified with `mvn test` (Build Success: 8/8 tests passing).
   - Application context loading
   - Student Registration & Login with BCrypt & JWT
   - Protected endpoint authorization & rejection of invalid credentials
   - Goal creation, listing, updating, and deletion
   - Multi-tenant student data isolation (User B blocked from User A's goals)
   - Input validation error handling
2. **Frontend Compilation:** Verified with `npm run build` (0 TypeScript / bundling errors).
3. **Database Connectivity:** Live MySQL 8.0 server verified on port 3306 with InnoDB tables `users` and `goals`.

