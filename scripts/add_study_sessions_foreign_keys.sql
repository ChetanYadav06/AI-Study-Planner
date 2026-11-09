-- Migration: Add ON DELETE SET NULL foreign keys from study_sessions to goals and saved_roadmaps
-- IMPORTANT: Please back up your database before executing this migration!
-- Example backup command:
-- mysqldump -u root -p ai_study_planner > backup_ai_study_planner_pre_phase2a.sql

-- Step 1: Clean up any dangling references where goal_id does not exist in goals table
UPDATE study_sessions
SET goal_id = NULL
WHERE goal_id IS NOT NULL
  AND goal_id NOT IN (SELECT id FROM (SELECT id FROM goals) AS g);

-- Step 2: Clean up any dangling references where roadmap_id does not exist in saved_roadmaps table
UPDATE study_sessions
SET roadmap_id = NULL
WHERE roadmap_id IS NOT NULL
  AND roadmap_id NOT IN (SELECT id FROM (SELECT id FROM saved_roadmaps) AS r);

-- Step 3: Add foreign keys with ON DELETE SET NULL
ALTER TABLE study_sessions
ADD CONSTRAINT fk_study_sessions_goal
FOREIGN KEY (goal_id) REFERENCES goals (id)
ON DELETE SET NULL;

ALTER TABLE study_sessions
ADD CONSTRAINT fk_study_sessions_roadmap
FOREIGN KEY (roadmap_id) REFERENCES saved_roadmaps (id)
ON DELETE SET NULL;
