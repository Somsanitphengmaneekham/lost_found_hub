-- Add password reset OTP support to an existing lost_found_hub database.
-- Import this file in phpMyAdmin if you do not want to recreate the database.

USE lost_found_hub;

CREATE TABLE IF NOT EXISTS password_reset_otps (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id INT UNSIGNED NOT NULL,
  channel ENUM('email') NOT NULL,
  destination VARCHAR(190) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  verified_at DATETIME NULL,
  reset_token_digest VARCHAR(64) NULL,
  reset_token_expires_at DATETIME NULL,
  consumed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_password_reset_member_id (member_id),
  KEY idx_password_reset_destination (destination),
  KEY idx_password_reset_expires_at (expires_at),
  KEY idx_password_reset_token_digest (reset_token_digest),
  CONSTRAINT fk_password_reset_member
    FOREIGN KEY (member_id) REFERENCES members(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELETE FROM password_reset_otps WHERE channel = 'phone';

ALTER TABLE password_reset_otps
  MODIFY COLUMN channel ENUM('email') NOT NULL;
