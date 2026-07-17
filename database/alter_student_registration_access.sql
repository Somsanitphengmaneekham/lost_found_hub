-- Students can use the system immediately after registration.
-- Account moderation is limited to active/inactive status and deletion.

UPDATE members
SET identity_status = 'verified'
WHERE role = 'student';

ALTER TABLE members
  MODIFY COLUMN identity_status
    ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'verified';

UPDATE student_card_uploads
SET status = 'approved',
    reviewed_by = NULL,
    reviewed_at = NULL,
    reject_reason = NULL;

ALTER TABLE student_card_uploads
  MODIFY COLUMN status
    ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved';
