-- Migration: Fix Placeholder Image URLs
-- Replace broken via.placeholder.com with working placehold.co service

-- Update all employees with via.placeholder.com photos
UPDATE employees
SET photos = ARRAY(
  SELECT REPLACE(unnest(photos), 'via.placeholder.com', 'placehold.co')
)
WHERE array_to_string(photos, ',') LIKE '%via.placeholder.com%';

-- Verify the update
SELECT
    id,
    name,
    photos
FROM employees
WHERE array_to_string(photos, ',') LIKE '%placehold.co%'
LIMIT 5;