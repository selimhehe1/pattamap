/**
 * Setup Test Accounts for E2E Testing
 *
 * This script:
 * 1. Finds the admin@test.com and owner@test.com users in Supabase Auth
 * 2. Updates admin user metadata to include role: "admin"
 * 3. Creates a test establishment "Test Bar" for the owner
 *
 * Run this AFTER creating the users manually in Supabase Dashboard
 */

// Load .env file if it exists (won't override existing env vars)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available, continue with process.env
}

const { createClient } = require('@supabase/supabase-js');

const isCI = process.env.CI === 'true';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Debug output for CI troubleshooting
console.log('🔍 Environment Check:');
console.log(`   CI: ${isCI}`);
console.log(`   SUPABASE_URL: ${supabaseUrl ? '✓ Set (' + supabaseUrl.substring(0, 30) + '...)' : '✗ Missing'}`);
console.log(`   SUPABASE_SERVICE_KEY: ${supabaseServiceKey ? '✓ Set (' + supabaseServiceKey.substring(0, 10) + '...)' : '✗ Missing'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  if (isCI) {
    console.log('⚠️  Running in CI - skipping test account setup.');
    console.log('   Tests will use mock authentication instead.');
    process.exit(0); // Exit gracefully in CI
  }
  process.exit(1);
}

// Create Supabase client with service role key (has admin privileges)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupTestAccounts() {
  console.log('🔧 Setting up test accounts for E2E testing...\n');

  try {
    // Step 1: List all users to find our test accounts
    console.log('1️⃣ Finding test users in Supabase Auth...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      if (listError.message.includes('Invalid API key') || listError.message.includes('invalid')) {
        console.error('\n⚠️  The SUPABASE_SERVICE_KEY appears to be invalid.');
        console.error('   Make sure you are using the "service_role" key from Supabase Dashboard:');
        console.error('   Settings → API → Project API keys → service_role (secret)');
        if (isCI) {
          console.log('\n⚠️  Running in CI with invalid key - skipping setup.');
          console.log('   Tests will use mock authentication instead.');
          process.exit(0); // Exit gracefully in CI
        }
      }
      process.exit(1);
    }

    const adminUser = users.find(u => u.email === 'admin@test.com');
    const ownerUser = users.find(u => u.email === 'owner@test.com');

    if (!adminUser) {
      console.error('❌ admin@test.com not found in Supabase Auth!');
      console.log('   Create it in Supabase Dashboard:');
      console.log('   Authentication → Users → Add User');
      console.log('   Email: admin@test.com');
      console.log('   Password: SecureTestP@ssw0rd2024!');
      if (isCI) {
        console.log('\n⚠️  Running in CI - skipping setup. Tests will use mock auth.');
        process.exit(0);
      }
      process.exit(1);
    }

    if (!ownerUser) {
      console.error('❌ owner@test.com not found in Supabase Auth!');
      console.log('   Create it in Supabase Dashboard:');
      console.log('   Authentication → Users → Add User');
      console.log('   Email: owner@test.com');
      console.log('   Password: SecureTestP@ssw0rd2024!');
      if (isCI) {
        console.log('\n⚠️  Running in CI - skipping setup. Tests will use mock auth.');
        process.exit(0);
      }
      process.exit(1);
    }

    console.log('✅ Found admin user:', adminUser.id);
    console.log('✅ Found owner user:', ownerUser.id);

    // Step 2: Create/sync users in the users table
    console.log('\n2️⃣ Creating/syncing users in database...');

    // Bcrypt hash for 'SecureTestP@ssw0rd2024!' (rounds=12)
    const testPasswordHash = '$2b$12$cwqlzUjOcvDABqJtfRoaQegtAX5s/MdIRhD1wpvskzSLSAftDCZIi';

    // Create admin in users table
    const { data: adminDbUser, error: adminDbError } = await supabase
      .from('users')
      .upsert({
        id: adminUser.id,
        pseudonym: 'testadmin',
        email: 'admin@test.com',
        password: testPasswordHash, // Bcrypt hash of 'SecureTestP@ssw0rd2024!'
        role: 'admin',
        is_active: true
      }, {
        onConflict: 'email'
      })
      .select()
      .single();

    if (adminDbError) {
      console.error('❌ Error creating admin in users table:', adminDbError.message);
    } else {
      console.log('✅ Admin user synced to database');
    }

    // Create owner in users table
    const { data: ownerDbUser, error: ownerDbError } = await supabase
      .from('users')
      .upsert({
        id: ownerUser.id,
        pseudonym: 'testowner',
        email: 'owner@test.com',
        password: testPasswordHash, // Bcrypt hash of 'SecureTestP@ssw0rd2024!'
        role: 'user',
        is_active: true
      }, {
        onConflict: 'email'
      })
      .select()
      .single();

    if (ownerDbError) {
      console.error('❌ Error creating owner in users table:', ownerDbError.message);
    } else {
      console.log('✅ Owner user synced to database');
    }

    // Step 3: Update admin user metadata to add role
    console.log('\n3️⃣ Setting admin role for admin@test.com...');
    const { data: updatedAdmin, error: adminError } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      {
        user_metadata: {
          ...adminUser.user_metadata,
          role: 'admin'
        }
      }
    );

    if (adminError) {
      console.error('❌ Error updating admin user:', adminError.message);
    } else {
      console.log('✅ Admin user updated with role: admin');
      console.log('   User ID:', updatedAdmin.user.id);
      console.log('   Metadata:', JSON.stringify(updatedAdmin.user.user_metadata, null, 2));
    }

    // Step 4: Create test establishment for owner
    console.log('\n4️⃣ Creating test establishment "Test Bar"...');

    // First, check if it already exists
    const { data: existingEst, error: checkError } = await supabase
      .from('establishments')
      .select('*')
      .eq('name', 'Test Bar')
      .single();

    let establishmentId;

    if (existingEst && !checkError) {
      console.log('ℹ️  Test Bar already exists');
      console.log('   ID:', existingEst.id);
      establishmentId = existingEst.id;
    } else {
      // Create new establishment with required fields
      const { data: newEst, error: createError } = await supabase
        .from('establishments')
        .insert({
          name: 'Test Bar',
          address: 'Walking Street, Pattaya',
          zone: 'walking-street'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating establishment:', createError.message);
        console.error('   Details:', createError);
      } else {
        console.log('✅ Test Bar created');
        console.log('   ID:', newEst.id);
        console.log('   Name:', newEst.name);
        console.log('   Zone:', newEst.zone);
        establishmentId = newEst.id;
      }
    }

    // Step 5: Link owner to establishment via establishment_owners table
    if (establishmentId) {
      console.log('\n5️⃣ Linking owner to Test Bar...');

      const { data: existingOwnership, error: ownershipCheckError } = await supabase
        .from('establishment_owners')
        .select('*')
        .eq('user_id', ownerUser.id)
        .eq('establishment_id', establishmentId)
        .single();

      if (existingOwnership && !ownershipCheckError) {
        console.log('ℹ️  Ownership link already exists');
        console.log('   Owner:', ownerUser.email);
        console.log('   Role:', existingOwnership.owner_role);
      } else {
        const { data: ownership, error: ownershipError } = await supabase
          .from('establishment_owners')
          .insert({
            user_id: ownerUser.id,
            establishment_id: establishmentId,
            owner_role: 'owner',
            permissions: {
              can_edit_info: true,
              can_edit_pricing: true,
              can_edit_photos: true,
              can_edit_employees: false,
              can_view_analytics: true
            }
          })
          .select()
          .single();

        if (ownershipError) {
          console.error('❌ Error linking owner:', ownershipError.message);
        } else {
          console.log('✅ Owner linked to Test Bar');
          console.log('   Owner:', ownerUser.email);
          console.log('   Role:', ownership.owner_role);
        }
      }
    }

    // Step 6: Verify setup
    console.log('\n6️⃣ Verifying test accounts setup...');

    // Check admin role
    const { data: { user: verifyAdmin }, error: verifyAdminError } = await supabase.auth.admin.getUserById(adminUser.id);

    if (verifyAdminError) {
      console.error('❌ Error verifying admin:', verifyAdminError.message);
    } else {
      const hasAdminRole = verifyAdmin.user_metadata?.role === 'admin';
      if (hasAdminRole) {
        console.log('✅ Admin role verified for admin@test.com');
      } else {
        console.log('⚠️  Admin role NOT set! Metadata:', verifyAdmin.user_metadata);
      }
    }

    // Check establishment ownership
    const { data: verifyOwnership, error: verifyOwnershipError } = await supabase
      .from('establishment_owners')
      .select('*, establishments(*)')
      .eq('user_id', ownerUser.id)
      .single();

    if (verifyOwnershipError) {
      console.log('⚠️  Test Bar ownership not found for owner@test.com');
    } else {
      console.log('✅ Test Bar verified for owner@test.com');
      console.log('   Establishment ID:', verifyOwnership.establishment_id);
      console.log('   Establishment Name:', verifyOwnership.establishments.name);
      console.log('   Owner Role:', verifyOwnership.owner_role);
    }

    console.log('\n🎉 Test accounts setup complete!');
    console.log('\n📝 Summary:');
    console.log('  ✅ Admin: admin@test.com (role: admin)');
    console.log('  ✅ Owner: owner@test.com (owns Test Bar)');
    console.log('  ✅ Password for both: SecureTestP@ssw0rd2024!');
    console.log('\n🧪 You can now run E2E tests:');
    console.log('  npm run test:e2e');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

setupTestAccounts();
