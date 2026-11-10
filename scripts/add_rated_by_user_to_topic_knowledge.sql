-- Migration: Add rated_by_user column to student_topic_knowledge
-- IMPORTANT: Please back up your database before executing this migration!
-- Example backup command:
-- mysqldump -u root -p ai_study_planner > backup_ai_study_planner_pre_phase2b.sql

-- Step 1: Add rated_by_user column with default FALSE
ALTER TABLE student_topic_knowledge
ADD COLUMN rated_by_user BOOLEAN NOT NULL DEFAULT FALSE;

-- Step 2: Mark genuine ratings (where knowledge_level is not NOT_LEARNED) as rated_by_user = TRUE
UPDATE student_topic_knowledge
SET rated_by_user = TRUE
WHERE knowledge_level <> 'NOT_LEARNED';

