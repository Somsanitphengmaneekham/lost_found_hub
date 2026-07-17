USE lost_found_hub;

-- Match rows are automatic recommendations, not records waiting for confirmation.
ALTER TABLE matches
  DROP COLUMN status;
