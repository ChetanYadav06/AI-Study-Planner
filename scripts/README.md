# Scripts & SQL Migrations Directory — AI Study Planner

This directory contains development automation scripts, database schema migrations, and validation utilities for the **AI Study Planner** project.

---

## 1. Database Migrations (SQL)

All SQL scripts use safe, idempotent patterns (`CREATE TABLE IF NOT EXISTS`, safe column alters) and should be reviewed against backups prior to applying on production databases.

| Script | Purpose |
|---|---|
| **`05_create_task_feedback.sql`** | Creates `task_feedbacks` table for student rating of daily tasks (`TOO_EASY`, `JUST_RIGHT`, `TOO_HARD`). |
| **`06_create_resource_link_checks.sql`** | Creates `resource_link_checks` table for caching external documentation link verification. |
| **`07_create_topic_expansions.sql`** | Creates `topic_expansions` table to store on-demand AI tutorial content per day and topic. |
| **`08_create_day_extra_topics.sql`** | Creates `day_extra_topics` table for supplementary topics added to study days. |
| **`create_study_sessions.sql`** | Creates `study_sessions` table with indexes for tracking focus and Pomodoro intervals. |
| **`add_rated_by_user_to_topic_knowledge.sql`** | Adds `rated_by_user` column to `student_topic_knowledge`. |
| **`add_study_sessions_foreign_keys.sql`** | Safely adds foreign key constraints between `study_sessions`, `goals`, and `saved_roadmaps`. |
| **`backfill_roadmap_goals.sql`** | Data migration linking legacy saved roadmaps to student goals. |

---

## 2. Server Management & Development Utilities

| Script | Platform | Description |
|---|---|---|
| **`start-mysql.ps1`** | PowerShell | Starts local MySQL 8.0 server in background mode using `.mysql/my.cnf`. |
| **`stop-mysql.ps1`** | PowerShell | Gracefully shuts down the local MySQL 8.0 server process. |
| **`test_live_roadmap.ps1`** | PowerShell | Integration test runner verifying live Spring Boot + Gemini AI generation. |
| **`generate_synopsis.py`** | Python 3 | Generates formatted project documentation and academic report artifacts (`.docx`). |

---

## 3. Workflow & Agent Validation Suite

Validation scripts verify repository markdown formatting, UTF-8 encoding, and schema compliance for `.agent/` and `.agents/` workflows and skills.

| Suite | PowerShell Script | Shell Script | Description |
|---|---|---|---|
| **All Validators** | `validate-all.ps1` | `validate-all.sh` | Runs all validation checks in sequence. |
| **Agents** | `validate-agents.ps1` | `validate-agents.sh` | Validates agent definition frontmatter and syntax. |
| **Skills** | `validate-skills.ps1` | `validate-skills.sh` | Checks skill definitions and required fields. |
| **Templates** | `validate-templates.ps1` | `validate-templates.sh` | Verifies GSD markdown templates integrity. |
| **Workflows** | `validate-workflows.ps1` | `validate-workflows.sh` | Validates workflow file structures and prompts. |
| **Encoding** | `validate-encoding.ps1` | `validate-encoding.sh` | Ensures all markdown and text files are clean UTF-8. |

---

## 4. Repository Search Utilities

| Script | Platform | Description |
|---|---|---|
| **`setup_search.ps1` / `setup_search.sh`** | PS / Bash | Sets up indexed search utilities for rapid repository querying. |
| **`search_repo.ps1` / `search_repo.sh`** | PS / Bash | Fast grep/search utility across repository files. |
