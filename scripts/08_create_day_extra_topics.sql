-- Step 7C Migration: create day_extra_topics table
-- Back up first: mysqldump -u root -p --result-file=..\backup_pre_7c.sql ai_study_planner
-- PowerShell run command:
-- cmd /c "mysql -u root -p ai_study_planner < scripts\08_create_day_extra_topics.sql"

CREATE TABLE IF NOT EXISTS day_extra_topics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    roadmap_id BIGINT NOT NULL,
    day_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_day_extra_topics_roadmap FOREIGN KEY (roadmap_id) REFERENCES saved_roadmaps(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
