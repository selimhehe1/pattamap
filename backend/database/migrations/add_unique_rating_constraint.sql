-- Migration: Add unique constraint for user ratings per employee
-- Date: 2025-09-26
-- Description: Ensures one user can only have one rating comment per employee

-- Create unique partial index (only for comments with ratings)
-- This allows multiple comments without ratings, but only one comment with rating per user/employee
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_employee_rating
ON comments (user_id, employee_id)
WHERE rating IS NOT NULL;

-- Add comment to document the constraint
COMMENT ON INDEX unique_user_employee_rating IS
'Ensures one user can only rate an employee once, but allows multiple reviews without ratings';