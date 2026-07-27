USE lost_found_hub;

-- Persistent in-app notifications with read/unread
CREATE TABLE IF NOT EXISTS notifications (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id     INT UNSIGNED NOT NULL,
  event_type    VARCHAR(64)  NOT NULL,
  title         VARCHAR(255) NOT NULL,
  body          TEXT         NOT NULL,
  meta          VARCHAR(255)     NULL,
  href          VARCHAR(128) NOT NULL DEFAULT '#notifications',
  action_label  VARCHAR(128)     NULL,
  tone          VARCHAR(32)  NOT NULL DEFAULT 'slate',
  priority      TINYINT UNSIGNED NOT NULL DEFAULT 5,
  entity_type   VARCHAR(32)      NULL,
  entity_id     INT UNSIGNED     NULL,
  is_read       TINYINT(1)   NOT NULL DEFAULT 0,
  read_at       DATETIME         NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_member_created (member_id, created_at),
  KEY idx_notifications_member_unread (member_id, is_read, created_at),
  KEY idx_notifications_entity (entity_type, entity_id),
  CONSTRAINT fk_notifications_member
    FOREIGN KEY (member_id) REFERENCES members(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Restore match confirmation status (recommendations can be confirmed/rejected)
SET @match_status_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'matches'
    AND COLUMN_NAME = 'status'
);

SET @add_match_status_sql := IF(
  @match_status_exists = 0,
  "ALTER TABLE matches ADD COLUMN status ENUM('suggested','confirmed','rejected') NOT NULL DEFAULT 'suggested' AFTER match_score, ADD KEY idx_matches_status (status)",
  'SELECT 1'
);

PREPARE stmt FROM @add_match_status_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
