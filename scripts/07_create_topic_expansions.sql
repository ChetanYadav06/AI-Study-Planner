-- Step 7C Migration: create topic_expansions table
-- Back up first: mysqldump -u root -p --result-file=..\backup_pre_7c.sql ai_study_planner
-- PowerShell run command:
-- cmd /c "mysql -u root -p ai_study_planner < scripts\07_create_topic_expansions.sql"

CREATE TABLE IF NOT EXISTS topic_expansions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    roadmap_id BIGINT NOT NULL,
    day_number INT NOT NULL,
    topic_title VARCHAR(255) NOT NULL,
    level INT NOT NULL,
    markdown_content LONGTEXT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT uk_topic_expansion UNIQUE (roadmap_id, day_number, topic_title, level),
    CONSTRAINT fk_topic_expansion_roadmap FOREIGN KEY (roadmap_id) REFERENCES saved_roadmaps(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
