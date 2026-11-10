-- Migration: Create study_sessions table if not exists (for deterministic environments)
CREATE TABLE IF NOT EXISTS `study_sessions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `goal_id` BIGINT DEFAULT NULL,
  `roadmap_id` BIGINT DEFAULT NULL,
  `task_id` VARCHAR(100) DEFAULT NULL,
  `started_at` DATETIME(6) NOT NULL,
  `ended_at` DATETIME(6) NOT NULL,
  `duration_seconds` INT NOT NULL,
  `session_type` ENUM('FOCUS', 'BREAK') NOT NULL DEFAULT 'FOCUS',
  `completed` BIT(1) NOT NULL DEFAULT b'1',
  `created_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_started` (`user_id`, `started_at`),
  CONSTRAINT `fk_study_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

