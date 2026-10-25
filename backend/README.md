# AI Study Planner — Backend Service

A high-performance Spring Boot 3.4.3 REST API providing authentication, study goal management, progress analytics, and AI-powered curriculum roadmap generation powered by the Google Gemini API.

---

## 🛠️ Technology Stack

- **Framework**: Spring Boot 3.4.3
- **Language**: Java 24
- **Security**: Spring Security 6 with JWT (JSON Web Tokens)
- **Database**: MySQL 8.0 with Spring Data JPA & Hibernate
- **AI Integration**: Google Gemini API via Spring `RestClient` (Gemini Flash & Flash-Lite models with automatic fallback)
- **Validation**: Jakarta Bean Validation (`@Valid`)
- **Testing**: JUnit 5, Mockito, Spring Boot Test

---

## 🏛️ Architecture Overview

```
backend/src/main/java/com/aistudyplanner/
├── config/       # SecurityConfig, WebConfig (CORS)
├── controller/   # REST Controllers (Auth, Goal, Roadmap, Dashboard, Health)
├── dto/          # Data Transfer Objects & API Schemas
├── entity/       # JPA Entities (User, Goal, SkillLevel, GoalStatus)
├── exception/    # Global Exception Handling & ProblemDetails
├── repository/   # Spring Data JPA Repositories
├── security/     # JWT Token Provider, Auth Filter & UserDetails
└── service/      # Business Logic, Goal Management & Gemini AI Engine
```

---

## 📡 API Endpoints Summary

### 1. Authentication (`/api/auth`)
- `POST /api/auth/register` — Register new student account
- `POST /api/auth/login` — Authenticate and receive JWT token

### 2. Learning Goals (`/api/goals`)
- `GET /api/goals` — List authenticated student's goals
- `POST /api/goals` — Create a new learning goal
- `PUT /api/goals/{id}/status` — Update goal progress & completion status
- `DELETE /api/goals/{id}` — Delete a learning goal

### 3. AI Roadmap Generation (`/api/ai`)
- `POST /api/ai/roadmap` — Synthesizes personalized day-by-day curriculum roadmaps with phases, milestones, daily tasks, and learning resources using Google Gemini AI
- `GET /api/ai/test` — AI engine health and connectivity test

### 4. Dashboard Stats (`/api/dashboard`)
- `GET /api/dashboard/stats` — Overall study metrics, completion rates, and daily commitment hours

---

## 🚀 Running Locally

```powershell
# Run backend dev server on port 8080
mvn spring-boot:run

# Run test suite
mvn test
```
