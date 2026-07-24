USE lost_found_hub;

ALTER TABLE lost_posts
  ADD COLUMN IF NOT EXISTS reject_reason TEXT NULL AFTER status;
