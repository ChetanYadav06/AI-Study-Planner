-- Step 5A Migration: create task_feedback table
-- Back up first: mysqldump -u root -p --result-file=..\backup_pre_5a.sql ai_study_planner
-- PowerShell run command:
-- cmd /c "mysql -u root -p ai_study_planner < scripts\05_create_task_feedback.sql"

CREATE TABLE IF NOT EXISTS task_feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    roadmap_id BIGINT NOT NULL,
    task_id VARCHAR(100) NOT NULL,
    rating ENUM('EASY', 'OK', 'HARD') NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT uk_task_feedback_user_roadmap_task UNIQUE (user_id, roadmap_id, task_id),
    CONSTRAINT fk_task_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_feedback_roadmap FOREIGN KEY (roadmap_id) REFERENCES saved_roadmaps(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

