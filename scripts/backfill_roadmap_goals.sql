-- =============================================================================
-- ONE-TIME BACKFILL SCRIPT: Synchronize Roadmap-Linked Goals
-- AI Study Planner Phase 1 Maintenance Script
-- =============================================================================
-- IMPORTANT: Always ensure you have taken a full database backup before running
-- maintenance queries! (e.g. mysqldump -u root ai_study_planner > backup.sql)
--
-- This script synchronizes Goal #31 ("Machine Learning & Generative AI") with
-- Saved Roadmap #9 (which has 45 total tasks, and 3 tasks completed:
-- ["0-task-1", "0-task-2", "0-task-3"]).
-- Calculation: round((3 / 45) * 100) = 7% completion, status = IN_PROGRESS.
-- =============================================================================

USE ai_study_planner;

-- 1. Update Roadmap #9 progress percentage to match its 3 completed tasks
UPDATE saved_roadmaps
SET progress_percentage = 7,
    updated_at = NOW()
WHERE id = 9;

-- 2. Update Goal #31 progress percentage and lifecycle status
UPDATE goals
SET progress_percentage = 7,
    status = 'IN_PROGRESS',
    updated_at = NOW()
WHERE id = 31;

-- 3. Verification query
SELECT id, title, status, progress_percentage, hours_per_day
FROM goals
WHERE id = 31;

