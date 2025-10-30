/**
 * ============================================
 * VERIFICATION SEED GENERATOR (v10.2)
 * ============================================
 *
 * Generates verification seed SQL using REAL employee data from Supabase.
 *
 * Usage:
 *   cd backend/database/scripts
 *   node generate-verification-seed.js
 *
 * Output:
 *   backend/database/seeds/004_employee_verifications_seed_GENERATED.sql
 *
 * Features:
 *   - Fetches 16 real employees from database
 *   - Uses actual employee UUIDs and Cloudinary photo URLs
 *   - Generates 18 verification records (5 approved, 3 pending, 4 rejected, 3 revoked, 3 timeline)
 *   - Ready to execute in Supabase SQL Editor
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// ============================================
// CONFIGURATION
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERROR: Missing Supabase credentials in .env file');
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// FETCH REAL EMPLOYEES
// ============================================

async function fetchEmployees() {
  console.log('🔍 Fetching real employees from database...\n');

  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, name, photos')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(16);

  if (error) {
    console.error('❌ ERROR fetching employees:', error.message);
    process.exit(1);
  }

  if (!employees || employees.length < 16) {
    console.error(`❌ ERROR: Not enough employees found (need 16, found ${employees?.length || 0})`);
    console.error('   Please add more employees to your database first.');
    process.exit(1);
  }

  // Transform photos array to get first photo URL
  return employees.map(emp => ({
    ...emp,
    photo_url: emp.photos && emp.photos.length > 0 ? emp.photos[0] : 'https://via.placeholder.com/400x600?text=No+Photo'
  }));
}

// ============================================
// FETCH ADMIN USER
// ============================================

async function fetchAdminUser() {
  const { data: admins, error } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .limit(1);

  if (error || !admins || admins.length === 0) {
    console.warn('⚠️  WARNING: No admin user found. Using NULL for reviewed_by fields.');
    return null;
  }

  return admins[0].id;
}

// ============================================
// GENERATE VERIFICATION SQL
// ============================================

function generateVerificationSQL(employees, adminId) {
  const adminIdSQL = adminId ? `'${adminId}'` : 'NULL';

  const sql = `-- ================================================
-- EMPLOYEE VERIFICATIONS SEED DATA (v10.2)
-- ================================================
-- Auto-generated from real employee data
-- Generated: ${new Date().toISOString()}
-- Total verifications: 18
-- ================================================

-- ================================================
-- SEED DATA (18 Verifications)
-- ================================================

-- 5 APPROVED verifications (2 auto + 3 manual)
INSERT INTO employee_verifications (employee_id, selfie_url, face_match_score, status, auto_approved, admin_notes, reviewed_by, reviewed_at, submitted_at)
VALUES
  -- Auto-approved (high match score 95%+)
  ('${employees[0].id}', '${employees[0].photo_url}', 98, 'approved', true, NULL, NULL, NULL, NOW() - INTERVAL '2 days'),
  ('${employees[1].id}', '${employees[1].photo_url}', 96, 'approved', true, NULL, NULL, NULL, NOW() - INTERVAL '5 days'),

  -- Manual approved (admin reviewed)
  ('${employees[2].id}', '${employees[2].photo_url}', 88, 'approved', false, 'Verified via LINE chat proof', ${adminIdSQL}, NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 days'),
  ('${employees[3].id}', '${employees[3].photo_url}', 85, 'approved', false, 'ID card verification confirmed', ${adminIdSQL}, NOW() - INTERVAL '2 days', NOW() - INTERVAL '6 days'),
  ('${employees[4].id}', '${employees[4].photo_url}', 82, 'approved', false, 'Manager vouched for employee', ${adminIdSQL}, NOW() - INTERVAL '4 days', NOW() - INTERVAL '8 days');

-- 3 PENDING verifications (awaiting review)
INSERT INTO employee_verifications (employee_id, selfie_url, face_match_score, status, auto_approved, submitted_at)
VALUES
  ('${employees[5].id}', '${employees[5].photo_url}', 78, 'pending', false, NOW() - INTERVAL '1 hour'),
  ('${employees[6].id}', '${employees[6].photo_url}', 75, 'pending', false, NOW() - INTERVAL '3 hours'),
  ('${employees[7].id}', '${employees[7].photo_url}', 80, 'pending', false, NOW() - INTERVAL '6 hours');

-- 4 REJECTED verifications (low match score or fraud detected)
INSERT INTO employee_verifications (employee_id, selfie_url, face_match_score, status, auto_approved, admin_notes, reviewed_by, reviewed_at, submitted_at)
VALUES
  ('${employees[8].id}', '${employees[8].photo_url}', 45, 'rejected', false, 'Face match score too low - photo appears old or different person', ${adminIdSQL}, NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 days'),
  ('${employees[9].id}', '${employees[9].photo_url}', 38, 'rejected', false, 'Profile photo does not match verification selfie', ${adminIdSQL}, NOW() - INTERVAL '2 days', NOW() - INTERVAL '7 days'),
  ('${employees[10].id}', '${employees[10].photo_url}', 52, 'rejected', false, 'Possible identity fraud - reported by establishment manager', ${adminIdSQL}, NOW() - INTERVAL '3 days', NOW() - INTERVAL '9 days'),
  ('${employees[11].id}', '${employees[11].photo_url}', 60, 'rejected', false, 'No finger heart pose detected in selfie', ${adminIdSQL}, NOW() - INTERVAL '5 days', NOW() - INTERVAL '12 days');

-- 3 REVOKED verifications (fraud detected after approval)
INSERT INTO employee_verifications (employee_id, selfie_url, face_match_score, status, auto_approved, admin_notes, reviewed_by, reviewed_at, submitted_at)
VALUES
  ('${employees[12].id}', '${employees[12].photo_url}', 90, 'revoked', false, 'Verification revoked due to identity theft report from real employee', ${adminIdSQL}, NOW() - INTERVAL '1 day', NOW() - INTERVAL '15 days'),
  ('${employees[13].id}', '${employees[13].photo_url}', 87, 'revoked', false, 'Profile no longer active at establishment - verification invalid', ${adminIdSQL}, NOW() - INTERVAL '3 days', NOW() - INTERVAL '20 days'),
  ('${employees[14].id}', '${employees[14].photo_url}', 92, 'revoked', false, 'Multiple complaints about misrepresentation - verified badge removed', ${adminIdSQL}, NOW() - INTERVAL '5 days', NOW() - INTERVAL '25 days');

-- ================================================
-- MULTIPLE ATTEMPTS (Same Employee - Show Timeline)
-- ================================================

-- Employee with 3 verification attempts (rejected → rejected → approved)
INSERT INTO employee_verifications (employee_id, selfie_url, face_match_score, status, auto_approved, admin_notes, reviewed_by, reviewed_at, submitted_at)
VALUES
  -- First attempt - rejected (bad photo)
  ('${employees[15].id}', '${employees[15].photo_url}', 55, 'rejected', false, 'Photo quality too low, please retake with better lighting', ${adminIdSQL}, NOW() - INTERVAL '10 days', NOW() - INTERVAL '12 days'),

  -- Second attempt - rejected (no pose)
  ('${employees[15].id}', '${employees[15].photo_url}', 72, 'rejected', false, 'Finger heart pose not visible in selfie', ${adminIdSQL}, NOW() - INTERVAL '5 days', NOW() - INTERVAL '8 days'),

  -- Third attempt - approved!
  ('${employees[15].id}', '${employees[15].photo_url}', 94, 'approved', true, NULL, NULL, NULL, NOW() - INTERVAL '1 day');

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
  '${employees[0].id}',
  '${employees[1].id}',
  '${employees[2].id}',
  '${employees[3].id}',
  '${employees[4].id}',
  '${employees[15].id}'
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
`;

  return sql;
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('🏮 PATTAMAP - Verification Seed Generator (v10.2)');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Fetch data
    const employees = await fetchEmployees();
    const adminId = await fetchAdminUser();

    // Display selected employees
    console.log('✅ Successfully fetched 16 employees from database:\n');
    employees.forEach((emp, index) => {
      const photoPreview = emp.photo_url
        ? emp.photo_url.substring(0, 70) + '...'
        : 'No photo';
      console.log(`   ${(index + 1).toString().padStart(2)}. ${emp.name.padEnd(25)} (${emp.id.substring(0, 8)}...)`);
      console.log(`       ${photoPreview}`);
    });

    console.log('');
    console.log('📊 Verification Seed Distribution:');
    console.log('   - Approved (auto):       2 verifications');
    console.log('   - Approved (manual):     3 verifications');
    console.log('   - Pending:               3 verifications');
    console.log('   - Rejected:              4 verifications');
    console.log('   - Revoked:               3 verifications');
    console.log('   - Timeline (3 attempts): 1 employee');
    console.log('   ─────────────────────────────────────');
    console.log('   TOTAL:                  18 verifications');
    console.log('');

    // Generate SQL
    const sql = generateVerificationSQL(employees, adminId);

    // Write to file
    const outputPath = path.join(__dirname, '../seeds/004_employee_verifications_seed_GENERATED.sql');
    fs.writeFileSync(outputPath, sql, 'utf8');

    console.log('✅ Seed file generated successfully!');
    console.log('');
    console.log('📁 Output file:');
    console.log(`   ${outputPath}`);
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Open Supabase SQL Editor');
    console.log('   2. Copy the contents of the generated file');
    console.log('   3. Execute in Supabase');
    console.log('   4. Navigate to Admin Dashboard → Verifications');
    console.log('');
    console.log('✨ Your verification admin page will now show REAL data!');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
