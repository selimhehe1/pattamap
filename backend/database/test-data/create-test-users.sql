/**
 * 🧪 Test Users Creation Script
 *
 * Creates test accounts for E2E testing:
 * - Admin account for VIP verification tests
 * - Owner account for establishment management tests
 *
 * Run this script ONLY in development/test environments!
 *
 * Password: SecureTestP@ssw0rd2024!
 * (Hash generated with bcrypt, rounds=12)
 */

-- Create test admin user
-- Email: admin@test.com
-- Password: SecureTestP@ssw0rd2024!
INSERT INTO users (id, email, username, password_hash, role, email_verified, created_at, updated_at)
VALUES (
  'test-admin-e2e-00000001',
  'admin@test.com',
  'testadmin',
  '$2b$12$cwqlzUjOcvDABqJtfRoaQegtAX5s/MdIRhD1wpvskzSLSAftDCZIi', -- SecureTestP@ssw0rd2024!
  'admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  email_verified = EXCLUDED.email_verified,
  updated_at = NOW();

-- Create test establishment for owner
INSERT INTO establishments (id, name, name_en, slug, zone, category, google_maps_url, created_at, updated_at, owner_user_id)
VALUES (
  'test-establishment-001',
  'Test Bar',
  'Test Bar',
  'test-bar-e2e',
  'walking-street',
  'bar',
  'https://maps.google.com/?q=Pattaya+Walking+Street',
  NOW(),
  NOW(),
  'test-owner-e2e-00000002'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  zone = EXCLUDED.zone,
  owner_user_id = EXCLUDED.owner_user_id,
  updated_at = NOW();

-- Create test owner user
-- Email: owner@test.com
-- Password: SecureTestP@ssw0rd2024!
INSERT INTO users (id, email, username, password_hash, role, email_verified, created_at, updated_at)
VALUES (
  'test-owner-e2e-00000002',
  'owner@test.com',
  'testowner',
  '$2b$12$cwqlzUjOcvDABqJtfRoaQegtAX5s/MdIRhD1wpvskzSLSAftDCZIi', -- SecureTestP@ssw0rd2024!
  'user',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  email_verified = EXCLUDED.email_verified,
  updated_at = NOW();

-- Link owner to establishment (if establishments_owners table exists)
-- This ensures the owner can manage the test bar
-- INSERT INTO establishments_owners (establishment_id, user_id, created_at)
-- VALUES ('test-establishment-001', 'test-owner-e2e-00000002', NOW())
-- ON CONFLICT (establishment_id, user_id) DO NOTHING;

-- Verify test users were created
SELECT
  id,
  email,
  username,
  role,
  email_verified,
  created_at
FROM users
WHERE email IN ('admin@test.com', 'owner@test.com')
ORDER BY role DESC;

-- Verify test establishment was created
SELECT
  id,
  name,
  slug,
  zone,
  category,
  owner_user_id,
  created_at
FROM establishments
WHERE slug = 'test-bar-e2e';
