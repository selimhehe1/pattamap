/**
 * Create test users for E2E testing
 *
 * This script creates:
 * - Admin user (admin@test.com)
 * - Owner user (owner@test.com)
 * - Test establishment (Test Bar)
 *
 * Password for both: SecureTestP@ssw0rd2024!
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUsers() {
  console.log('🧪 Creating test users for E2E testing...\n');

  try {
    // Create test admin user
    console.log('1️⃣ Creating admin user (admin@test.com)...');
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .upsert({
        id: 'test-admin-e2e-00000001',
        email: 'admin@test.com',
        username: 'testadmin',
        password_hash: '$2b$12$cwqlzUjOcvDABqJtfRoaQegtAX5s/MdIRhD1wpvskzSLSAftDCZIi',
        role: 'admin',
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'email',
      })
      .select();

    if (adminError) {
      console.error('❌ Error creating admin:', adminError.message);
    } else {
      console.log('✅ Admin user created/updated');
    }

    // Create test owner user
    console.log('\n2️⃣ Creating owner user (owner@test.com)...');
    const { data: ownerData, error: ownerError } = await supabase
      .from('users')
      .upsert({
        id: 'test-owner-e2e-00000002',
        email: 'owner@test.com',
        username: 'testowner',
        password_hash: '$2b$12$cwqlzUjOcvDABqJtfRoaQegtAX5s/MdIRhD1wpvskzSLSAftDCZIi',
        role: 'user',
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'email',
      })
      .select();

    if (ownerError) {
      console.error('❌ Error creating owner:', ownerError.message);
    } else {
      console.log('✅ Owner user created/updated');
    }

    // Create test establishment
    console.log('\n3️⃣ Creating test establishment (Test Bar)...');
    const { data: establishmentData, error: establishmentError } = await supabase
      .from('establishments')
      .upsert({
        id: 'test-establishment-001',
        name: 'Test Bar',
        name_en: 'Test Bar',
        slug: 'test-bar-e2e',
        zone: 'walking-street',
        category: 'bar',
        google_maps_url: 'https://maps.google.com/?q=Pattaya+Walking+Street',
        owner_user_id: 'test-owner-e2e-00000002',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'slug',
      })
      .select();

    if (establishmentError) {
      console.error('❌ Error creating establishment:', establishmentError.message);
    } else {
      console.log('✅ Test establishment created/updated');
    }

    // Verify users were created
    console.log('\n4️⃣ Verifying users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, username, role, email_verified')
      .in('email', ['admin@test.com', 'owner@test.com'])
      .order('role', { ascending: false });

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
    } else {
      console.log('\n✅ Test users created successfully:\n');
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.role})`);
        console.log(`    ID: ${user.id}`);
        console.log(`    Username: ${user.username}`);
        console.log(`    Email verified: ${user.email_verified}`);
        console.log();
      });
    }

    // Verify establishment
    const { data: establishment, error: estError } = await supabase
      .from('establishments')
      .select('*')
      .eq('slug', 'test-bar-e2e')
      .single();

    if (estError) {
      console.error('❌ Error fetching establishment:', estError.message);
    } else {
      console.log('✅ Test establishment verified:\n');
      console.log(`  - ${establishment.name}`);
      console.log(`    ID: ${establishment.id}`);
      console.log(`    Slug: ${establishment.slug}`);
      console.log(`    Zone: ${establishment.zone}`);
      console.log(`    Owner ID: ${establishment.owner_user_id}`);
      console.log();
    }

    console.log('\n🎉 Test users setup complete!');
    console.log('\n📝 Credentials for E2E tests:');
    console.log('  Admin: admin@test.com / SecureTestP@ssw0rd2024!');
    console.log('  Owner: owner@test.com / SecureTestP@ssw0rd2024!');
    console.log();

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

createTestUsers();
