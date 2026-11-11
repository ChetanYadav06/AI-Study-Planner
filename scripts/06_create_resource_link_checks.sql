-- ==============================================================================
-- Migration: 06_create_resource_link_checks.sql
-- Description: Create resource_link_checks table for caching external link checks.
--
-- BACK UP YOUR DATABASE FIRST BEFORE RUNNING MANUAL MIGRATIONS:
--   mysqldump -u root -p ai_study_planner > backup_before_06.sql
--
-- PowerShell safe run command:
--   Get-Content ./scripts/06_create_resource_link_checks.sql | mysql -u root -p ai_study_planner
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `resource_link_checks` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `url_hash` VARCHAR(64) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `status_code` INT DEFAULT NULL,
    `reachable` BOOLEAN NOT NULL DEFAULT FALSE,
    `error_message` VARCHAR(255) DEFAULT NULL,
    `checked_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_resource_link_hash` (`url_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
