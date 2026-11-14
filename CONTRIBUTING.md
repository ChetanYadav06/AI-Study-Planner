# Contributing to AI Study Planner

Thank you for your interest in contributing to **AI Study Planner**! We welcome contributions from developers, students, and educators.

Please take a moment to review this document before submitting issues or pull requests.

---

## 1. Development Environment Setup

### 1.1 Prerequisites
Ensure you have the following installed on your machine:
- **Java Development Kit (JDK):** Version 24 (or JDK 17/21 LTS)
- **Apache Maven:** Version 3.8+
- **Node.js & npm:** Node.js v20+ / v22+ and npm 10+
- **MySQL Server:** Version 8.0 (configured with InnoDB engine)
- **Git:** Version 2.30+

### 1.2 Repository Setup
```bash
# Clone repository
git clone https://github.com/ChetanYadav06/AI-Study-Planner.git
cd AI-Study-Planner

# Copy environment variables template
cp .env.example .env

# Install frontend dependencies
npm run install:all
```

### 1.3 Database Setup
Create test and development databases:
```sql
CREATE DATABASE IF NOT EXISTS ai_study_planner;
CREATE DATABASE IF NOT EXISTS ai_study_planner_test;
```

---

## 2. Branching & Git Workflow

### 2.1 Branch Naming Conventions
Follow standardized prefix-based branch naming:
- `feat/feature-name` — New user-facing capabilities
- `fix/bug-description` — Bug fixes and corrections
- `refactor/component-name` — Code restructuring without behavioral change
- `docs/topic` — Documentation updates
- `chore/task-name` — Build scripts, dependencies, CI configuration

### 2.2 Commit Message Standards
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
```
<type>(<optional scope>): <short description in present tense>

[optional body explaining motivation and details]

[optional footer(s)]
```

**Allowed types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of code (formatting, white-space)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to build process or auxiliary tools

*Examples:*
- `feat(auth): add rate limiting on failed login attempts`
- `fix(roadmap): resolve task id collision in multi-phase generation`
- `docs(api): document topic expansion endpoints`

---

## 3. Pull Request Guidelines

1. **Keep PRs Focused:** Submit small, targeted PRs rather than massive multi-feature changes.
2. **Never Commit Secrets:** Do not commit `.env`, private keys, passwords, or live database dumps.
3. **Verify Locally First:** Ensure the full test suite and frontend build pass locally before creating a pull request:
   ```powershell
   # Backend test suite
   mvn -f backend/pom.xml test

   # Frontend production build
   npm --prefix frontend run build
   ```
4. **Description:** Provide a clear summary of what was changed and why, linking related issues.

---

## 4. Code Style & Quality Expectations

### 4.1 Backend (Java / Spring Boot)
- Adhere to standard Java code conventions (camelCase variables/methods, PascalCase classes).
- Use constructor injection (`@RequiredArgsConstructor` or explicit constructors) over field injection (`@Autowired`).
- Annotate REST endpoints with appropriate validation (`@Valid`, Jakarta Constraints).
- Enforce strict user data isolation in queries (`findByIdAndUserId`).
- Provide unit and integration tests for every new service or controller endpoint.

### 4.2 Frontend (React / Tailwind CSS)
- Write clean functional components using React 19 hooks.
- Use the established Phase 4 UI primitives (`Button`, `Card`, `ConfirmDialog`, `ProgressBar`, `EmptyState`, `PageHeader`).
- Adhere to design system tokens — do not use arbitrary hex color literals or custom shadows outside Tailwind configuration.
- Handle loading, empty, and error states gracefully in every view.

---

## 5. Security & Isolation Testing

Any pull request introducing or modifying data endpoints must include cross-user isolation tests verifying that Student A cannot read, modify, or delete Student B's data.

