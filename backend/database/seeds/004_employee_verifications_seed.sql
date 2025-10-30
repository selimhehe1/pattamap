-- ================================================
-- EMPLOYEE VERIFICATIONS SEED DATA (v10.2)
-- ================================================
-- Purpose: Populate the employee_verifications table with realistic test data
-- Usage: Execute this SQL in Supabase SQL Editor after employees table is populated
-- Dependencies: Requires existing employee records in the employees table
-- ================================================

-- Note: Replace the UUID values below with actual employee IDs from your database
-- To get employee IDs: SELECT id, name FROM employees LIMIT 20;

-- ================================================
-- SEED DATA (15 Verifications)
-- ================================================

-- 5 APPROVED verifications (2 auto + 3 manual)
INSERT INTO employee_verifications (employee_id, selfie_url, face_match_score, status, auto_approved, admin_notes, reviewed_by, reviewed_at, submitted_at)
VALUES
  -- Auto-approved (high match score 95%+)
  ('REPLACE_WITH_EMPLOYEE_ID_1', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_001.jpg', 98, 'approved', true, NULL, NULL, NULL, NOW() - INTERVAL '2 days'),
  ('REPLACE_WITH_EMPLOYEE_ID_2', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_002.jpg', 96, 'approved', true, NULL, NULL, NULL, NOW() - INTERVAL '5 days'),

  -- Manual approved (admin reviewed)
  ('REPLACE_WITH_EMPLOYEE_ID_3', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_003.jpg', 88, 'approved', false, 'Verified via LINE chat proof', (SELECT id FROM users WHERE role = 'admin' LIMIT 1), NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 days'),
  ('REPLACE_WITH_EMPLOYEE_ID_4', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_004.jpg', 85, 'approved', false, 'ID card verification confirmed', (SELECT id FROM users WHERE role = 'admin' LIMIT 1), NOW() - INTERVAL '2 days', NOW() - INTERVAL '6 days'),
  ('REPLACE_WITH_EMPLOYEE_ID_5', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_005.jpg', 82, 'approved', false, 'Manager vouched for employee', (SELECT id FROM users WHERE role = 'admin' LIMIT 1), NOW() - INTERVAL '4 days', NOW() - INTERVAL '8 days');

-- 3 PENDING verifications (awaiting review)
INSERT INTO employee_verifications (employee_id, selfie_url, face_match_score, status, auto_approved, submitted_at)
VALUES
  ('REPLACE_WITH_EMPLOYEE_ID_6', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_006.jpg', 78, 'pending', false, NOW() - INTERVAL '1 hour'),
  ('REPLACE_WITH_EMPLOYEE_ID_7', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_007.jpg', 75, 'pending', false, NOW() - INTERVAL '3 hours'),
  ('REPLACE_WITH_EMPLOYEE_ID_8', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_008.jpg', 80, 'pending', false, NOW() - INTERVAL '6 hours');

-- 4 REJECTED verifications (low match score or fraud detected)
INSERT INTO employee_verifications (employee_id, selfie_url, face_match_score, status, auto_approved, admin_notes, reviewed_by, reviewed_at, submitted_at)
VALUES
  ('REPLACE_WITH_EMPLOYEE_ID_9', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_009.jpg', 45, 'rejected', false, 'Face match score too low - photo appears old or different person', (SELECT id FROM users WHERE role = 'admin' LIMIT 1), NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 days'),
  ('REPLACE_WITH_EMPLOYEE_ID_10', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_010.jpg', 38, 'rejected', false, 'Profile photo does not match verification selfie', (SELECT id FROM users WHERE role = 'admin' LIMIT 1), NOW() - INTERVAL '2 days', NOW() - INTERVAL '7 days'),
  ('REPLACE_WITH_EMPLOYEE_ID_11', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_011.jpg', 52, 'rejected', false, 'Possible identity fraud - reported by establishment manager', (SELECT id FROM users WHERE role = 'admin' LIMIT 1), NOW() - INTERVAL '3 days', NOW() - INTERVAL '9 days'),
  ('REPLACE_WITH_EMPLOYEE_ID_12', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_012.jpg', 60, 'rejected', false, 'No finger heart pose detected in selfie', (SELECT id FROM users WHERE role = 'admin' LIMIT 1), NOW() - INTERVAL '5 days', NOW() - INTERVAL '12 days');

-- 3 REVOKED verifications (fraud detected after approval)
INSERT INTO employee_verifications (employee_id, selfie_url, face_match_score, status, auto_approved, admin_notes, reviewed_by, reviewed_at, submitted_at)
VALUES
  ('REPLACE_WITH_EMPLOYEE_ID_13', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_013.jpg', 90, 'revoked', false, 'Verification revoked due to identity theft report from real employee', (SELECT id FROM users WHERE role = 'admin' LIMIT 1), NOW() - INTERVAL '1 day', NOW() - INTERVAL '15 days'),
  ('REPLACE_WITH_EMPLOYEE_ID_14', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_014.jpg', 87, 'revoked', false, 'Profile no longer active at establishment - verification invalid', (SELECT id FROM users WHERE role = 'admin' LIMIT 1), NOW() - INTERVAL '3 days', NOW() - INTERVAL '20 days'),
  ('REPLACE_WITH_EMPLOYEE_ID_15', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_015.jpg', 92, 'revoked', false, 'Multiple complaints about misrepresentation - verified badge removed', (SELECT id FROM users WHERE role = 'admin' LIMIT 1), NOW() - INTERVAL '5 days', NOW() - INTERVAL '25 days');

-- ================================================
-- MULTIPLE ATTEMPTS (Same Employee - Show Timeline)
-- ================================================

-- Employee with 3 verification attempts (rejected → rejected → approved)
INSERT INTO employee_verifications (employee_id, selfie_url, face_match_score, status, auto_approved, admin_notes, reviewed_by, reviewed_at, submitted_at)
VALUES
  -- First attempt - rejected (bad photo)
  ('REPLACE_WITH_EMPLOYEE_ID_16', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_016a.jpg', 55, 'rejected', false, 'Photo quality too low, please retake with better lighting', (SELECT id FROM users WHERE role = 'admin' LIMIT 1), NOW() - INTERVAL '10 days', NOW() - INTERVAL '12 days'),

  -- Second attempt - rejected (no pose)
  ('REPLACE_WITH_EMPLOYEE_ID_16', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_016b.jpg', 72, 'rejected', false, 'Finger heart pose not visible in selfie', (SELECT id FROM users WHERE role = 'admin' LIMIT 1), NOW() - INTERVAL '5 days', NOW() - INTERVAL '8 days'),

  -- Third attempt - approved!
  ('REPLACE_WITH_EMPLOYEE_ID_16', 'https://res.cloudinary.com/demo/image/upload/v1234567890/verifications/selfie_016c.jpg', 94, 'approved', true, NULL, NULL, NULL, NOW() - INTERVAL '1 day');

-- ================================================
-- NOTES FOR MANUAL CONFIGURATION
-- ================================================

-- 1. Replace all 'REPLACE_WITH_EMPLOYEE_ID_X' with actual employee UUIDs from your database
-- 2. To get employee IDs, run: SELECT id, name FROM employees ORDER BY created_at DESC LIMIT 20;
-- 3. Copy real employee IDs and replace the placeholders above
-- 4. Execute this entire SQL script in Supabase SQL Editor
-- 5. Verify seed data: SELECT * FROM employee_verifications ORDER BY submitted_at DESC;

-- ================================================
-- VERIFICATION STATS AFTER SEEDING
-- ================================================

-- Expected results:
-- - Total Verifications: 18
-- - Auto-Approved: 2
-- - Manual Approved: 3 + 1 (from timeline) = 4
-- - Pending: 3
-- - Rejected: 4 + 2 (from timeline) = 6
-- - Revoked: 3
-- - Multiple Attempts: 1 employee (3 attempts)

-- ================================================
-- UPDATE EMPLOYEE RECORDS (Set is_verified)
-- ================================================

-- After seeding, update employees table to reflect verified status
-- Only for employees with approved verifications

-- Uncomment and modify these lines after replacing employee IDs:
-- UPDATE employees SET is_verified = true, verified_at = NOW() WHERE id = 'REPLACE_WITH_EMPLOYEE_ID_1';
-- UPDATE employees SET is_verified = true, verified_at = NOW() WHERE id = 'REPLACE_WITH_EMPLOYEE_ID_2';
-- UPDATE employees SET is_verified = true, verified_at = NOW() WHERE id = 'REPLACE_WITH_EMPLOYEE_ID_3';
-- UPDATE employees SET is_verified = true, verified_at = NOW() WHERE id = 'REPLACE_WITH_EMPLOYEE_ID_4';
-- UPDATE employees SET is_verified = true, verified_at = NOW() WHERE id = 'REPLACE_WITH_EMPLOYEE_ID_5';
-- UPDATE employees SET is_verified = true, verified_at = NOW() WHERE id = 'REPLACE_WITH_EMPLOYEE_ID_16';

-- ================================================
-- END OF SEED FILE
-- ================================================
