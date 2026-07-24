-- Add secure pickup evidence fields for real item returns.
-- Run this on an existing XAMPP/MySQL database if the columns are missing.

ALTER TABLE return_records MODIFY COLUMN claim_request_id INT UNSIGNED NULL;
ALTER TABLE return_records MODIFY COLUMN received_by INT UNSIGNED NULL;

ALTER TABLE return_records
  DROP FOREIGN KEY fk_return_records_claim_request,
  ADD CONSTRAINT fk_return_records_claim_request
    FOREIGN KEY (claim_request_id) REFERENCES claim_requests(id)
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE return_records
  ADD COLUMN IF NOT EXISTS receiver_type ENUM('owner','representative') NOT NULL DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS receiver_photo_url LONGTEXT NULL,
  ADD COLUMN IF NOT EXISTS receiver_name_snapshot VARCHAR(160) NULL,
  ADD COLUMN IF NOT EXISTS receiver_student_code_snapshot VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS receiver_department_snapshot VARCHAR(160) NULL,
  ADD COLUMN IF NOT EXISTS receiver_phone_snapshot VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS identity_verified TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS representative_name VARCHAR(160) NULL,
  ADD COLUMN IF NOT EXISTS representative_phone VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS representative_relation VARCHAR(80) NULL,
  ADD COLUMN IF NOT EXISTS authorization_note TEXT NULL,
  ADD COLUMN IF NOT EXISTS authorization_image_url LONGTEXT NULL;
