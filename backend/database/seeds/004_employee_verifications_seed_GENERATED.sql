-- ================================================
-- EMPLOYEE VERIFICATIONS SEED DATA (v10.2)
-- ================================================
-- Auto-generated from real employee data
-- Generated: 2025-10-17T15:05:56.363Z
-- Total verifications: 18
-- ================================================

-- ================================================
-- SEED DATA (18 Verifications)
-- ================================================

-- 5 APPROVED verifications (2 auto + 3 manual)
INSERT INTO employee_verifications (employee_id, selfie_url, face_match_score, status, auto_approved, admin_notes, reviewed_by, reviewed_at, submitted_at)
VALUES
  -- Auto-approved (high match score 95%+)
  ('9614c2ee-7b25-440a-8ff1-19bb4f5fbea7', 'https://res.cloudinary.com/di9pto36h/image/upload/v1760637336/pattaya-directory/employees/employee_1760637335807_xo79vrjji.jpg', 98, 'approved', true, NULL, NULL, NULL, NOW() - INTERVAL '2 days'),
  ('2bacc5fb-9935-47c8-9b44-6f3570357f7e', 'https://res.cloudinary.com/di9pto36h/image/upload/v1760635827/pattaya-directory/employees/employee_1760635826894_fnnjphcy9.jpg', 96, 'approved', true, NULL, NULL, NULL, NOW() - INTERVAL '5 days'),

  -- Manual approved (admin reviewed)
  ('9d8de905-a092-4fa7-aedb-0ef7da917774', 'https://res.cloudinary.com/di9pto36h/image/upload/v1760553715/pattaya-directory/employees/employee_1760553714633_bv6l2bjh3.jpg', 88, 'approved', false, 'Verified via LINE chat proof', 'dbb71245-50fa-475f-9f20-e9ba3f9f2bca', NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 days'),
  ('99999999-9999-9999-9999-999999999992', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop', 85, 'approved', false, 'ID card verification confirmed', 'dbb71245-50fa-475f-9f20-e9ba3f9f2bca', NOW() - INTERVAL '2 days', NOW() - INTERVAL '6 days'),
  ('37e63723-6f44-4d69-a22a-9c533ec7325f', 'https://res.cloudinary.com/di9pto36h/image/upload/v1760483172/pattaya-directory/employees/employee_1760483170909_jtv59oqqf.webp', 82, 'approved', false, 'Manager vouched for employee', 'dbb71245-50fa-475f-9f20-e9ba3f9f2bca', NOW() - INTERVAL '4 days', NOW() - INTERVAL '8 days');

-- 3 PENDING verifications (awaiting review)
INSERT INTO employee_verifications (employee_id, selfie_url, face_match_score, status, auto_approved, submitted_at)
VALUES
  ('ab07511b-55a7-4791-b516-34dfbf21c11a', 'https://res.cloudinary.com/di9pto36h/image/upload/v1760393001/pattaya-directory/employees/employee_1760393000375_g58x4im2c.jpg', 78, 'pending', false, NOW() - INTERVAL '1 hour'),
  ('b8500461-2b14-475f-b193-7bbc557df0b3', 'https://res.cloudinary.com/di9pto36h/image/upload/v1760392194/pattaya-directory/employees/employee_1760392192857_d4urd707d.jpg', 75, 'pending', false, NOW() - INTERVAL '3 hours'),
  ('9f19e3c8-a983-43fe-912b-864147e1f3bb', 'https://via.placeholder.com/300', 80, 'pending', false, NOW() - INTERVAL '6 hours');

-- 4 REJECTED verifications (low match score or fraud detected)
INSERT INTO employee_verifications (employee_id, selfie_url, face_match_score, status, auto_approved, admin_notes, reviewed_by, reviewed_at, submitted_at)
VALUES
  ('3c080741-a6c5-4219-b329-cfa73378df47', 'https://via.placeholder.com/300', 45, 'rejected', false, 'Face match score too low - photo appears old or different person', 'dbb71245-50fa-475f-9f20-e9ba3f9f2bca', NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 days'),
  ('2db7b77c-2bd6-40e1-8e41-0feeb2f73274', 'https://example.com/photo2.jpg', 38, 'rejected', false, 'Profile photo does not match verification selfie', 'dbb71245-50fa-475f-9f20-e9ba3f9f2bca', NOW() - INTERVAL '2 days', NOW() - INTERVAL '7 days'),
  ('5e77f4ff-5b60-4df7-be86-95fedab98ca0', 'https://res.cloudinary.com/di9pto36h/image/upload/v1759621789/pattaya-directory/employees/employee_1759621788852_e443vph0j.jpg', 52, 'rejected', false, 'Possible identity fraud - reported by establishment manager', 'dbb71245-50fa-475f-9f20-e9ba3f9f2bca', NOW() - INTERVAL '3 days', NOW() - INTERVAL '9 days'),
  ('4c235e0e-ae22-4434-af11-b56926f54918', 'https://res.cloudinary.com/di9pto36h/image/upload/v1759594826/pattaya-directory/employees/employee_1759594825393_29dyfhgu5.jpg', 60, 'rejected', false, 'No finger heart pose detected in selfie', 'dbb71245-50fa-475f-9f20-e9ba3f9f2bca', NOW() - INTERVAL '5 days', NOW() - INTERVAL '12 days');

-- 3 REVOKED verifications (fraud detected after approval)
INSERT INTO employee_verifications (employee_id, selfie_url, face_match_score, status, auto_approved, admin_notes, reviewed_by, reviewed_at, submitted_at)
VALUES
  ('6a6bed38-87c8-4046-9408-8e9b70f81e2b', 'https://res.cloudinary.com/di9pto36h/image/upload/v1758897709/pattaya-directory/employees/employee_1758897708678_lz4tg55mo.jpg', 90, 'revoked', false, 'Verification revoked due to identity theft report from real employee', 'dbb71245-50fa-475f-9f20-e9ba3f9f2bca', NOW() - INTERVAL '1 day', NOW() - INTERVAL '15 days'),
  ('550e8400-e29b-41d4-a716-446655440008', 'https://res.cloudinary.com/di9pto36h/image/upload/v1758893522/pattaya-directory/employees/employee_1758893521761_nglsefh0q.jpg', 87, 'revoked', false, 'Profile no longer active at establishment - verification invalid', 'dbb71245-50fa-475f-9f20-e9ba3f9f2bca', NOW() - INTERVAL '3 days', NOW() - INTERVAL '20 days'),
  ('550e8400-e29b-41d4-a716-446655440003', 'https://res.cloudinary.com/di9pto36h/image/upload/v1758878364/pattaya-directory/employees/employee_1758878363292_0nqbhl93x.jpg', 92, 'revoked', false, 'Multiple complaints about misrepresentation - verified badge removed', 'dbb71245-50fa-475f-9f20-e9ba3f9f2bca', NOW() - INTERVAL '5 days', NOW() - INTERVAL '25 days');

-- ================================================
-- MULTIPLE ATTEMPTS (Same Employee - Show Timeline)
-- ================================================

-- Employee with 3 verification attempts (rejected → rejected → approved)
INSERT INTO employee_verifications (employee_id, selfie_url, face_match_score, status, auto_approved, admin_notes, reviewed_by, reviewed_at, submitted_at)
VALUES
  -- First attempt - rejected (bad photo)
  ('550e8400-e29b-41d4-a716-446655440013', 'https://res.cloudinary.com/di9pto36h/image/upload/v1758893537/pattaya-directory/employees/employee_1758893536857_pnpxwv4mm.jpg', 55, 'rejected', false, 'Photo quality too low, please retake with better lighting', 'dbb71245-50fa-475f-9f20-e9ba3f9f2bca', NOW() - INTERVAL '10 days', NOW() - INTERVAL '12 days'),

  -- Second attempt - rejected (no pose)
  ('550e8400-e29b-41d4-a716-446655440013', 'https://res.cloudinary.com/di9pto36h/image/upload/v1758893537/pattaya-directory/employees/employee_1758893536857_pnpxwv4mm.jpg', 72, 'rejected', false, 'Finger heart pose not visible in selfie', 'dbb71245-50fa-475f-9f20-e9ba3f9f2bca', NOW() - INTERVAL '5 days', NOW() - INTERVAL '8 days'),

  -- Third attempt - approved!
  ('550e8400-e29b-41d4-a716-446655440013', 'https://res.cloudinary.com/di9pto36h/image/upload/v1758893537/pattaya-directory/employees/employee_1758893536857_pnpxwv4mm.jpg', 94, 'approved', true, NULL, NULL, NULL, NOW() - INTERVAL '1 day');

-- ================================================
-- VERIFICATION STATS AFTER SEEDING
-- ================================================

-- Expected results:
-- - Total Verifications: 18
-- - Auto-Approved: 2 + 1 (timeline) = 3
-- - Manual Approved: 3
-- - Pending: 3
-- - Rejected: 4 + 2 (timeline) = 6
-- - Revoked: 3
-- - Multiple Attempts: 1 employee (3 attempts)

-- ================================================
-- UPDATE EMPLOYEE RECORDS (Set is_verified)
-- ================================================

-- Update employees with approved verifications to show verified badge
UPDATE employees SET is_verified = true, verified_at = NOW() WHERE id IN (
  '9614c2ee-7b25-440a-8ff1-19bb4f5fbea7',
  '2bacc5fb-9935-47c8-9b44-6f3570357f7e',
  '9d8de905-a092-4fa7-aedb-0ef7da917774',
  '99999999-9999-9999-9999-999999999992',
  '37e63723-6f44-4d69-a22a-9c533ec7325f',
  '550e8400-e29b-41d4-a716-446655440013'
);

-- ================================================
-- VERIFICATION QUERY
-- ================================================

-- Check inserted verifications
SELECT
  'Verification seed completed!' as status,
  COUNT(*) as total_verifications,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
  COUNT(*) FILTER (WHERE status = 'revoked') as revoked,
  COUNT(*) FILTER (WHERE auto_approved = true) as auto_approved_count
FROM employee_verifications;

-- ================================================
-- END OF SEED FILE
-- ================================================
