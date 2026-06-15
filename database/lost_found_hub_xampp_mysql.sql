-- Lost & Found Hub database schema for XAMPP
-- Target database: MySQL / MariaDB via phpMyAdmin
-- Import this file in phpMyAdmin.

SET NAMES utf8mb4;
SET time_zone = '+07:00';

CREATE DATABASE IF NOT EXISTS lost_found_hub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lost_found_hub;

SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS v_report_member_summary;
DROP VIEW IF EXISTS v_report_lost_by_category;
DROP VIEW IF EXISTS v_report_return_records_by_month;
DROP VIEW IF EXISTS v_report_pending_found_items;
DROP VIEW IF EXISTS v_report_found_status_summary;
DROP VIEW IF EXISTS v_report_found_count_by_month;
DROP VIEW IF EXISTS v_report_lost_count_by_month;

DROP TABLE IF EXISTS return_records;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS claim_requests;
DROP TABLE IF EXISTS handover_records;
DROP TABLE IF EXISTS item_images;
DROP TABLE IF EXISTS found_posts;
DROP TABLE IF EXISTS lost_posts;
DROP TABLE IF EXISTS student_card_uploads;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS item_categories;
DROP TABLE IF EXISTS departments;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE departments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(30) NOT NULL,
  name_th VARCHAR(160) NOT NULL,
  name_en VARCHAR(160) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_departments_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE item_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name_th VARCHAR(120) NOT NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_item_categories_name_th (name_th)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE locations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name_th VARCHAR(180) NOT NULL,
  building VARCHAR(120) NULL,
  floor VARCHAR(40) NULL,
  detail TEXT NULL,
  location_type ENUM('found', 'lost', 'both', 'handover') NOT NULL DEFAULT 'both',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_locations_place (name_th, building, floor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE members (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  role ENUM('student', 'teacher') NOT NULL,
  username VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  student_code VARCHAR(30) NULL,
  employee_code VARCHAR(30) NULL,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  phone VARCHAR(40) NULL,
  department_id INT UNSIGNED NULL,
  identity_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  card_image_url LONGTEXT NULL,
  avatar_url LONGTEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_members_username (username),
  UNIQUE KEY uq_members_email (email),
  UNIQUE KEY uq_members_student_code (student_code),
  UNIQUE KEY uq_members_employee_code (employee_code),
  KEY idx_members_role (role),
  KEY idx_members_department_id (department_id),
  KEY idx_members_identity_status (identity_status),
  CONSTRAINT fk_members_department
    FOREIGN KEY (department_id) REFERENCES departments(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_card_uploads (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id INT UNSIGNED NOT NULL,
  claim_request_id INT UNSIGNED NULL,
  image_url LONGTEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  reject_reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_student_card_uploads_member_id (member_id),
  KEY idx_student_card_uploads_claim_request_id (claim_request_id),
  KEY idx_student_card_uploads_reviewed_by (reviewed_by),
  CONSTRAINT fk_student_card_uploads_member
    FOREIGN KEY (member_id) REFERENCES members(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_student_card_uploads_reviewed_by
    FOREIGN KEY (reviewed_by) REFERENCES members(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lost_posts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  lost_location_id INT UNSIGNED NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  color VARCHAR(80) NULL,
  brand VARCHAR(120) NULL,
  unique_mark TEXT NULL,
  lost_at DATETIME NULL,
  contact_name VARCHAR(160) NULL,
  contact_channel VARCHAR(180) NULL,
  status ENUM('draft', 'pending_approval', 'published', 'matched', 'closed', 'rejected', 'deleted') NOT NULL DEFAULT 'pending_approval',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_lost_posts_owner_id (owner_id),
  KEY idx_lost_posts_category_id (category_id),
  KEY idx_lost_posts_location_id (lost_location_id),
  KEY idx_lost_posts_status (status),
  KEY idx_lost_posts_lost_at (lost_at),
  FULLTEXT KEY ft_lost_posts_search (title, description, color, brand, unique_mark),
  CONSTRAINT fk_lost_posts_owner
    FOREIGN KEY (owner_id) REFERENCES members(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_lost_posts_category
    FOREIGN KEY (category_id) REFERENCES item_categories(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_lost_posts_location
    FOREIGN KEY (lost_location_id) REFERENCES locations(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE found_posts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  finder_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  found_location_id INT UNSIGNED NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  color VARCHAR(80) NULL,
  brand VARCHAR(120) NULL,
  unique_mark TEXT NULL,
  found_at DATETIME NULL,
  status ENUM(
    'draft',
    'awaiting_handover',
    'pending_approval',
    'approved',
    'matched',
    'returned',
    'rejected',
    'archived'
  ) NOT NULL DEFAULT 'pending_approval',
  approved_by INT UNSIGNED NULL,
  approved_at DATETIME NULL,
  reject_reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_found_posts_finder_id (finder_id),
  KEY idx_found_posts_category_id (category_id),
  KEY idx_found_posts_location_id (found_location_id),
  KEY idx_found_posts_status (status),
  KEY idx_found_posts_found_at (found_at),
  FULLTEXT KEY ft_found_posts_search (title, description, color, brand, unique_mark),
  CONSTRAINT fk_found_posts_finder
    FOREIGN KEY (finder_id) REFERENCES members(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_found_posts_category
    FOREIGN KEY (category_id) REFERENCES item_categories(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_found_posts_location
    FOREIGN KEY (found_location_id) REFERENCES locations(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_found_posts_approved_by
    FOREIGN KEY (approved_by) REFERENCES members(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE item_images (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_type ENUM('lost_post', 'found_post') NOT NULL,
  lost_post_id INT UNSIGNED NULL,
  found_post_id INT UNSIGNED NULL,
  image_url LONGTEXT NOT NULL,
  alt_text VARCHAR(180) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_item_images_lost_post_id (lost_post_id),
  KEY idx_item_images_found_post_id (found_post_id),
  CONSTRAINT fk_item_images_lost_post
    FOREIGN KEY (lost_post_id) REFERENCES lost_posts(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_item_images_found_post
    FOREIGN KEY (found_post_id) REFERENCES found_posts(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT chk_item_images_single_owner CHECK (
    (lost_post_id IS NOT NULL AND found_post_id IS NULL)
    OR
    (lost_post_id IS NULL AND found_post_id IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE handover_records (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  found_post_id INT UNSIGNED NOT NULL,
  received_by INT UNSIGNED NOT NULL,
  handover_location_id INT UNSIGNED NULL,
  handed_over_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  proof_image_url LONGTEXT NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_handover_records_found_post_id (found_post_id),
  KEY idx_handover_records_received_by (received_by),
  KEY idx_handover_records_location_id (handover_location_id),
  CONSTRAINT fk_handover_records_found_post
    FOREIGN KEY (found_post_id) REFERENCES found_posts(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_handover_records_received_by
    FOREIGN KEY (received_by) REFERENCES members(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_handover_records_location
    FOREIGN KEY (handover_location_id) REFERENCES locations(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE claim_requests (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  found_post_id INT UNSIGNED NOT NULL,
  claimant_id INT UNSIGNED NOT NULL,
  lost_post_id INT UNSIGNED NULL,
  claim_message TEXT NOT NULL,
  status ENUM('submitted', 'under_review', 'approved', 'rejected', 'returned') NOT NULL DEFAULT 'submitted',
  verified_by INT UNSIGNED NULL,
  verified_at DATETIME NULL,
  reject_reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_claim_requests_found_post_id (found_post_id),
  KEY idx_claim_requests_claimant_id (claimant_id),
  KEY idx_claim_requests_lost_post_id (lost_post_id),
  KEY idx_claim_requests_status (status),
  CONSTRAINT fk_claim_requests_found_post
    FOREIGN KEY (found_post_id) REFERENCES found_posts(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_claim_requests_claimant
    FOREIGN KEY (claimant_id) REFERENCES members(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_claim_requests_lost_post
    FOREIGN KEY (lost_post_id) REFERENCES lost_posts(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_claim_requests_verified_by
    FOREIGN KEY (verified_by) REFERENCES members(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE matches (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  lost_post_id INT UNSIGNED NOT NULL,
  found_post_id INT UNSIGNED NOT NULL,
  match_score DECIMAL(5,2) NOT NULL,
  status ENUM('suggested','confirmed','rejected') NOT NULL DEFAULT 'suggested',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  KEY idx_matches_lost_post_id (lost_post_id),
  KEY idx_matches_found_post_id (found_post_id),

  CONSTRAINT fk_matches_lost_post
    FOREIGN KEY (lost_post_id) REFERENCES lost_posts(id)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT fk_matches_found_post
    FOREIGN KEY (found_post_id) REFERENCES found_posts(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE student_card_uploads
  ADD CONSTRAINT fk_student_card_uploads_claim_request
  FOREIGN KEY (claim_request_id) REFERENCES claim_requests(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

CREATE TABLE return_records (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  claim_request_id INT UNSIGNED NOT NULL,
  found_post_id INT UNSIGNED NOT NULL,
  returned_by INT UNSIGNED NOT NULL,
  received_by INT UNSIGNED NOT NULL,
  return_location_id INT UNSIGNED NULL,
  proof_image_url LONGTEXT NULL,
  note TEXT NULL,
  returned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_return_records_claim_request_id (claim_request_id),
  KEY idx_return_records_found_post_id (found_post_id),
  KEY idx_return_records_returned_by (returned_by),
  KEY idx_return_records_received_by (received_by),
  KEY idx_return_records_return_location_id (return_location_id),
  KEY idx_return_records_returned_at (returned_at),
  CONSTRAINT fk_return_records_claim_request
    FOREIGN KEY (claim_request_id) REFERENCES claim_requests(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_return_records_found_post
    FOREIGN KEY (found_post_id) REFERENCES found_posts(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_return_records_returned_by
    FOREIGN KEY (returned_by) REFERENCES members(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_return_records_received_by
    FOREIGN KEY (received_by) REFERENCES members(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_return_records_return_location
    FOREIGN KEY (return_location_id) REFERENCES locations(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO departments (code, name_th, name_en) VALUES
  ('SCI', 'ພາກວິຊາວິທະຍາສາດ', 'Science'),
  ('MATH', 'ພາກວິຊາຄະນິດສາດ', 'Mathematics'),
  ('PHY-CHEM', 'ພາກວິຊາຟີຊິກ ແລະ ເຄມີ', 'Physics and Chemistry')
ON DUPLICATE KEY UPDATE name_th = VALUES(name_th), name_en = VALUES(name_en);

INSERT INTO item_categories (name_th, description) VALUES
  ('ອິເລັກໂທຣນິກ', 'ໂທລະສັບ ຫູຟັງ ສາຍສາກ ແລະ ອຸປະກອນໄອທີ'),
  ('ກະເປົາ/ເອກະສານ', 'ກະເປົາ ປຶ້ມ ເອກະສານ ແລະ ແຟ້ມ'),
  ('ກະແຈ/ບັດ', 'ກະແຈ ບັດນັກສຶກສາ ແລະ ບັດຜ່ານ'),
  ('ຕຸກນ້ຳ', 'ແກ້ວນ້ຳ ຕຸກນ້ຳ ແລະ ກະຕິກນ້ຳ'),
  ('ອື່ນໆ', 'ລາຍການທີ່ບໍ່ຢູ່ໃນໝວດໝູ່ທີ່ກຳນົດ')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO locations (name_th, building, floor, detail, location_type) VALUES
  ('ຫ້ອງຄຸ້ມຄອງ', 'ຄະນະວິທະຍາສາດທຳມະຊາດ', '1', 'ຈຸດຮັບຝາກ ແລະ ສົ່ງມອບສິ່ງຂອງ', 'handover'),
  ('ຕຶກພາກວິຊາວິທະຍາສາດ', 'ຄະນະວິທະຍາສາດທຳມະຊາດ', NULL, 'ພື້ນທີ່ຫ້ອງຮຽນ ຫ້ອງປະຕິບັດການ ແລະ ທາງເດີນ', 'both'),
  ('ຕຶກພາກວິຊາຄະນິດສາດ', 'ຄະນະວິທະຍາສາດທຳມະຊາດ', NULL, 'ພື້ນທີ່ຫ້ອງຮຽນ ແລະ ທາງເດີນຂອງພາກວິຊາ', 'both'),
  ('ຕຶກພາກວິຊາຟີຊິກ ແລະ ເຄມີ', 'ຄະນະວິທະຍາສາດທຳມະຊາດ', NULL, 'ພື້ນທີ່ຫ້ອງຮຽນ ຫ້ອງທົດລອງ ແລະ ທາງເດີນ', 'both'),
  ('ລານກາງຄະນະ', 'ຄະນະວິທະຍາສາດທຳມະຊາດ', NULL, 'ພື້ນທີ່ກາງແຈ້ງ ແລະ ຈຸດນັ່ງພັກ', 'both');

-- Starter accounts for first login. Replace with real staff/student accounts before production use.
-- Password value is only a placeholder. Replace with a real password_hash before production use.
INSERT INTO members (
  role,
  username,
  password_hash,
  student_code,
  employee_code,
  first_name,
  last_name,
  email,
  phone,
  department_id,
  identity_status
) VALUES
  ('teacher', 'teacher01', '123456', NULL, 'T001', 'ອາຈານ', 'ຫ້ອງຄຸ້ມຄອງ', 'teacher01@example.com', '020-1111-2222', 1, 'verified'),
  ('student', 'student01', '123456', '66000001', NULL, 'ນັກສຶກສາ', 'ຕົວຢ່າງ', 'student01@example.com', '020-3333-4444', 1, 'verified');

CREATE OR REPLACE VIEW v_report_lost_count_by_month AS
SELECT
  DATE_FORMAT(COALESCE(lost_at, created_at), '%Y-%m-01') AS report_month,
  COUNT(*) AS lost_count
FROM lost_posts
WHERE status <> 'deleted'
GROUP BY DATE_FORMAT(COALESCE(lost_at, created_at), '%Y-%m-01');

CREATE OR REPLACE VIEW v_report_found_count_by_month AS
SELECT
  DATE_FORMAT(COALESCE(found_at, created_at), '%Y-%m-01') AS report_month,
  COUNT(*) AS found_count
FROM found_posts
WHERE status <> 'archived'
GROUP BY DATE_FORMAT(COALESCE(found_at, created_at), '%Y-%m-01');

CREATE OR REPLACE VIEW v_report_found_status_summary AS
SELECT
  status,
  COUNT(*) AS item_count
FROM found_posts
WHERE deleted_at IS NULL
GROUP BY status;

CREATE OR REPLACE VIEW v_report_pending_found_items AS
SELECT
  status,
  COUNT(*) AS item_count
FROM found_posts
WHERE status IN ('awaiting_handover', 'pending_approval', 'approved', 'matched')
  AND deleted_at IS NULL
GROUP BY status;

CREATE OR REPLACE VIEW v_report_return_records_by_month AS
SELECT
  DATE_FORMAT(returned_at, '%Y-%m-01') AS report_month,
  COUNT(*) AS returned_count
FROM return_records
GROUP BY DATE_FORMAT(returned_at, '%Y-%m-01');

CREATE OR REPLACE VIEW v_report_lost_by_category AS
SELECT
  c.name_th AS category_name,
  COUNT(lp.id) AS lost_count
FROM item_categories c
LEFT JOIN lost_posts lp
  ON lp.category_id = c.id
  AND lp.status <> 'deleted'
GROUP BY c.id, c.name_th;

CREATE OR REPLACE VIEW v_report_member_summary AS
SELECT
  m.role,
  d.name_th AS department_name,
  m.identity_status,
  COUNT(*) AS member_count
FROM members m
LEFT JOIN departments d ON d.id = m.department_id
GROUP BY m.role, d.name_th, m.identity_status;
