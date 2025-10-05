/**
 * Script to Run Beach Road Grid Migration (2x40)
 * Updates database constraints to allow 2 rows x 40 columns for beachroad zone
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Starting Beach Road grid migration (2×22 → 2×40)...\n');

  try {
    // Step 1: Remove old constraint
    console.log('📝 Step 1: Removing old check_beachroad_grid constraint...');
    const { error: dropError } = await supabase.rpc('exec_raw_sql', {
      sql: 'ALTER TABLE establishments DROP CONSTRAINT IF EXISTS check_beachroad_grid;'
    });

    if (dropError && dropError.code !== 'PGRST202') {
      console.log('⚠️  Could not drop constraint via RPC (expected). Will try alternative method.');
    } else if (!dropError) {
      console.log('✅ Old constraint removed');
    }

    // Step 2: Add new constraint for 2x40 grid
    console.log('\n📝 Step 2: Adding new check_beachroad_grid constraint (2×40)...');
    const { error: addError } = await supabase.rpc('exec_raw_sql', {
      sql: `ALTER TABLE establishments ADD CONSTRAINT check_beachroad_grid
            CHECK (
              zone != 'beachroad' OR
              (grid_row >= 1 AND grid_row <= 2 AND grid_col >= 1 AND grid_col <= 40)
            );`
    });

    if (addError && addError.code !== 'PGRST202') {
      console.log('⚠️  Could not add constraint via RPC (expected).');
      console.log('   This migration needs to be run directly in Supabase SQL Editor.');
      console.log('\n📋 SQL to run manually in Supabase SQL Editor:');
      console.log('--------------------------------------------------');
      console.log('ALTER TABLE establishments DROP CONSTRAINT IF EXISTS check_beachroad_grid;');
      console.log('');
      console.log('ALTER TABLE establishments ADD CONSTRAINT check_beachroad_grid');
      console.log('CHECK (');
      console.log("  zone != 'beachroad' OR");
      console.log('  (grid_row >= 1 AND grid_row <= 2 AND grid_col >= 1 AND grid_col <= 40)');
      console.log(');');
      console.log('--------------------------------------------------\n');

      console.log('⚠️  Please run this SQL in Supabase SQL Editor, then run this script again.');
      process.exit(0);
    } else if (!addError) {
      console.log('✅ New constraint added (2×40 grid)');
    }

    console.log('\n✅ Beach Road grid migration completed successfully!');
    console.log('   New configuration: 2 rows (Beach/City sides) × 40 columns = 80 positions');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
