# REST API Documentation — AI Study Planner

This document provides comprehensive API documentation for all REST endpoints exposed by the **AI Study Planner** backend service (`http://localhost:8080`).

---

## 1. Authentication & Security Conventions

- **Base URL:** `/api`
- **Protected Endpoints:** Require an HTTP Header:
  ```http
  Authorization: Bearer <your-jwt-token>
  ```
- **Error Responses:** Follow RFC 7807 standard:
  ```json
  {
    "type": "about:blank",
    "title": "Bad Request",
    "status": 400,
    "detail": "Description of the validation or logical error",
    "timestamp": "2026-11-13T19:50:00Z"
  }
  ```
- **Rate Limiting:** Exceeded request quotas return HTTP `429 Too Many Requests`.

---

## 2. Authentication API (`/api/auth`)

### 2.1 Register Student Account
- **Endpoint:** `POST /api/auth/register`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "token": "eyJhbGciOiJIUzUxMiJ9...",
    "type": "Bearer",
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "message": "Registration successful! Welcome to AI Study Planner."
  }
  ```

### 2.2 Student Login
- **Endpoint:** `POST /api/auth/login`
- **Auth:** Public
- **Rate Limit:** 5 failed attempts per 15 minutes per IP/email.
- **Request Body:**
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "token": "eyJhbGciOiJIUzUxMiJ9...",
    "type": "Bearer",
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "message": "Login successful. Welcome back, Jane Doe!"
  }
  ```

---

## 3. Student Profile & Preferences (`/api/profile`, `/api/user`)

### 3.1 Get User Basic Profile
- **Endpoint:** `GET /api/user/profile`
- **Auth:** Bearer Token
- **Response (`200 OK`):**
  ```json
  {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "createdAt": "2026-11-01T10:00:00"
  }
  ```

### 3.2 Get Student Personalization Profile
- **Endpoint:** `GET /api/profile`
- **Auth:** Bearer Token
- **Response (`200 OK`):**
  ```json
  {
    "educationLevel": "Undergraduate",
    "academicBackground": "Computer Science",
    "careerGoal": "AI Engineer",
    "experienceLevel": "INTERMEDIATE",
    "dailyStudyHours": 3.0,
    "availableDaysPerWeek": 5,
    "preferredStudyTime": "EVENING",
    "learningMethods": "VIDEO,CODING_PRACTICE",
    "explanationStyle": "STEP_BY_STEP",
    "practiceStyle": "CODING_PROBLEMS",
    "additionalContext": "Focus on neural networks and practical PyTorch implementation."
  }
  ```

### 3.3 Update Student Personalization Profile
- **Endpoint:** `PUT /api/profile`
- **Auth:** Bearer Token
- **Request Body:** Same JSON structure as above.
- **Response (`200 OK`):** Updated profile object.

---

## 4. Learning Goals API (`/api/goals`)

### 4.1 Create Goal
- **Endpoint:** `POST /api/goals`
- **Auth:** Bearer Token
- **Request Body:**
  ```json
  {
    "title": "Master Spring Boot 3 & JPA",
    "description": "Build high-performance REST APIs with database isolation.",
    "targetDays": 30,
    "hoursPerDay": 2.5,
    "skillLevel": "INTERMEDIATE",
    "subject": "Java Backend Development",
    "priority": "HIGH"
  }
  ```
- **Response (`201 Created`):** Goal object with generated `id`, `status: "NOT_STARTED"`, and `progressPercentage: 0`.

### 4.2 List Goals
- **Endpoint:** `GET /api/goals`
- **Auth:** Bearer Token
- **Response (`200 OK`):** Array of goal objects owned by the authenticated student.

### 4.3 Update Goal Status & Progress
- **Endpoint:** `PATCH /api/goals/{id}/status`
- **Auth:** Bearer Token
- **Request Body:**
  ```json
  {
    "status": "IN_PROGRESS",
    "progressPercentage": 45
  }
  ```
- **Response (`200 OK`):** Updated goal object.

### 4.4 Delete Goal
- **Endpoint:** `DELETE /api/goals/{id}`
- **Auth:** Bearer Token
- **Response (`200 OK`):** `{"message": "Learning goal deleted successfully."}`

---

## 5. AI Curriculum Roadmap Generation (`/api/ai/roadmap`)

### 5.1 Initiate Async Roadmap Generation
- **Endpoint:** `POST /api/ai/roadmap/generate`
- **Auth:** Bearer Token
- **Rate Limit:** 5 generation requests per hour.
- **Request Body:**
  ```json
  {
    "topic": "Machine Learning Foundations",
    "targetDays": 14,
    "hoursPerDay": 2.0,
    "skillLevel": "BEGINNER",
    "goalId": 1
  }
  ```
- **Response (`202 Accepted`):**
  ```json
  {
    "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
  ```

### 5.2 Poll Roadmap Generation Job Status
- **Endpoint:** `GET /api/ai/roadmap/generate/{jobId}`
- **Auth:** Bearer Token
- **Response (`200 OK`):**
  ```json
  {
    "state": "RUNNING",
    "phasesDone": 2,
    "phasesTotal": 4,
    "message": "Generating Phase 3 daily lessons..."
  }
  ```
  When complete:
  ```json
  {
    "state": "DONE",
    "phasesDone": 4,
    "phasesTotal": 4,
    "result": {
      "title": "Machine Learning Foundations",
      "overview": "...",
      "phases": [...]
    }
  }
  ```

---

## 6. Saved Roadmaps API (`/api/roadmaps`)

### 6.1 Save Generated Roadmap
- **Endpoint:** `POST /api/roadmaps`
- **Auth:** Bearer Token
- **Request Body:**
  ```json
  {
    "title": "Machine Learning Foundations",
    "topic": "Machine Learning",
    "skillLevel": "BEGINNER",
    "targetDays": 14,
    "hoursPerDay": 2.0,
    "goalId": 1,
    "roadmapJson": "{...full JSON string...}"
  }
  ```
- **Response (`201 Created`):** Saved roadmap entity with ID.

### 6.2 List Saved Roadmaps
- **Endpoint:** `GET /api/roadmaps`
- **Auth:** Bearer Token
- **Response (`200 OK`):** Array of saved roadmaps with completion statistics.

### 6.3 Toggle Task Completion & Sync Progress
- **Endpoint:** `PATCH /api/roadmaps/{id}/progress`
- **Auth:** Bearer Token
- **Request Body:**
  ```json
  {
    "completedTaskIds": ["phase-1-day-1-task-1", "phase-1-day-1-task-2"],
    "completedMilestones": ["phase-1-assessment"]
  }
  ```
- **Response (`200 OK`):** Updated roadmap with synchronized `progressPercentage`.

### 6.4 Delete Saved Roadmap
- **Endpoint:** `DELETE /api/roadmaps/{id}`
- **Auth:** Bearer Token
- **Response (`200 OK`):** `{"message": "Roadmap deleted successfully."}`

---

## 7. Topic Expansions & Extra Topics (`/api/roadmaps/{roadmapId}/days/{dayNumber}/topics`)

### 7.1 On-Demand Deep Dive Explanation
- **Endpoint:** `POST /api/roadmaps/{roadmapId}/days/{dayNumber}/topics/expand`
- **Auth:** Bearer Token
- **Request Body:**
  ```json
  {
    "topicTitle": "Gradient Descent Optimization",
    "level": 1
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "id": 12,
    "roadmapId": 5,
    "dayNumber": 3,
    "topicTitle": "Gradient Descent Optimization",
    "level": 1,
    "markdownContent": "### Understanding Gradient Descent\n\nGradient Descent is an iterative optimization algorithm...",
    "createdAt": "2026-11-13T12:00:00"
  }
  ```

### 7.2 Add Extra Topic to Schedule Day
- **Endpoint:** `POST /api/roadmaps/{roadmapId}/days/{dayNumber}/topics/extra`
- **Auth:** Bearer Token
- **Request Body:**
  ```json
  {
    "title": "Stochastic vs Batch Gradient Descent",
    "summary": "Key differences in convergence speed, memory usage, and noise resistance."
  }
  ```
- **Response (`201 Created`):** Created `DayExtraTopic` object.

### 7.3 List Day Topics & Expansions
- **Endpoint:** `GET /api/roadmaps/{roadmapId}/days/{dayNumber}/topics`
- **Auth:** Bearer Token
- **Response (`200 OK`):**
  ```json
  {
    "extraTopics": [...],
    "expansions": [...]
  }
  ```

---

## 8. Topic Competency & Knowledge Base (`/api/topics/knowledge`)

### 8.1 List Topic Knowledge Ratings
- **Endpoint:** `GET /api/topics/knowledge`
- **Auth:** Bearer Token
- **Response (`200 OK`):** List of topics with knowledge levels (`NOT_LEARNED`, `BEGINNER`, `INTERMEDIATE`, `MASTERED`).

### 8.2 Bulk Update Topic Knowledge
- **Endpoint:** `POST /api/topics/knowledge/bulk`
- **Auth:** Bearer Token
- **Request Body:**
  ```json
  {
    "topics": [
      {"topicName": "React Hooks", "knowledgeLevel": "INTERMEDIATE"},
      {"topicName": "Docker", "knowledgeLevel": "BEGINNER"}
    ]
  }
  ```
- **Response (`200 OK`):** Updated list of topics.

---

## 9. Study Sessions & Focus Timer (`/api/study-sessions`)

### 9.1 Log Study Session
- **Endpoint:** `POST /api/study-sessions`
- **Auth:** Bearer Token
- **Request Body:**
  ```json
  {
    "roadmapId": 5,
    "goalId": 1,
    "taskId": "phase-1-day-2-task-1",
    "startedAt": "2026-11-13T10:00:00",
    "endedAt": "2026-11-13T10:45:00",
    "durationSeconds": 2700,
    "sessionType": "FOCUS",
    "completed": true
  }
  ```
- **Response (`201 Created`):** Recorded session entity.

### 9.2 Get Study Metrics & Analytics
- **Endpoint:** `GET /api/study-sessions/stats`
- **Auth:** Bearer Token
- **Response (`200 OK`):** Aggregated metrics including total focus hours, streak days, and weekly breakdown.

---

## 10. System Health Probe (`/api/health`)

- **Endpoint:** `GET /api/health`
- **Auth:** Public
- **Response (`200 OK`):**
  ```json
  {
    "status": "UP",
    "database": {
      "status": "UP",
      "product": "MySQL",
      "version": "8.0.46",
      "responseTimeMs": 3
    },
    "timestamp": "2026-11-13T19:50:00Z"
  }
  ```

