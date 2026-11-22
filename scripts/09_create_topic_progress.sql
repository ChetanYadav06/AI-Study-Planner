-- Phase 9C Migration: create topic_progress table
-- Back up first: mysqldump -u root -p --result-file=..\backup_pre_9c.sql ai_study_planner
-- PowerShell run command:
-- cmd /c "mysql -u root -p ai_study_planner < scripts\09_create_topic_progress.sql"

CREATE TABLE IF NOT EXISTS topic_progress (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    roadmap_id BIGINT NOT NULL,
    day_number INT NOT NULL,
    topic_key VARCHAR(120) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_topic_progress UNIQUE (user_id, roadmap_id, day_number, topic_key),
    CONSTRAINT fk_topic_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_topic_progress_roadmap FOREIGN KEY (roadmap_id) REFERENCES saved_roadmaps(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
