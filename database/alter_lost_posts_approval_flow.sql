-- Run this once on an existing XAMPP/MySQL database.
-- New installs can use lost_found_hub_xampp_mysql.sql directly.

ALTER TABLE lost_posts
  MODIFY status ENUM(
    'draft',
    'pending_approval',
    'published',
    'matched',
    'closed',
    'rejected',
    'deleted'
  ) NOT NULL DEFAULT 'pending_approval';

ALTER TABLE found_posts
  MODIFY status ENUM(
    'awaiting_handover',
    'pending_approval',
    'approved',
    'matched',
    'returned',
    'rejected',
    'archived'
  ) NOT NULL DEFAULT 'pending_approval';
