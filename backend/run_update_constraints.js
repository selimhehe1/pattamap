/**
 * Script to update Walking Street grid constraints in the database
 * Run with: node backend/run_update_constraints.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateConstraints() {
  console.log('🔧 Updating Walking Street grid constraints...\n');

  try {
    // Step 1: Drop old constraints
    console.log('📌 Step 1: Dropping old constraints...');
    const dropQueries = [
      'ALTER TABLE establishments DROP CONSTRAINT IF EXISTS establishments_grid_row_check',
      'ALTER TABLE establishments DROP CONSTRAINT IF EXISTS establishments_grid_col_check',
      'ALTER TABLE establishments DROP CONSTRAINT IF EXISTS check_grid_row',
      'ALTER TABLE establishments DROP CONSTRAINT IF EXISTS check_grid_col'
    ];

    for (const query of dropQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: query });
      if (error) {
        console.warn(`⚠️  Warning dropping constraint: ${error.message}`);
      } else {
        console.log(`✅ Dropped: ${query.substring(0, 60)}...`);
      }
    }

    // Step 2: Add new row constraint
    console.log('\n📌 Step 2: Adding new row constraint...');
    const rowConstraint = `
      ALTER TABLE establishments
      ADD CONSTRAINT check_grid_row CHECK (
        grid_row IS NULL OR
        (zone = 'walkingstreet' AND grid_row >= 1 AND grid_row <= 30) OR
        (zone = 'soi6' AND grid_row >= 1 AND grid_row <= 2) OR
        (zone = 'lkmetro' AND grid_row >= 1 AND grid_row <= 4) OR
        (zone = 'treetown' AND grid_row >= 1 AND grid_row <= 14) OR
        (zone = 'soibuakhao' AND grid_row >= 1 AND grid_row <= 3) OR
        (zone = 'jomtiencomplex' AND grid_row >= 1 AND grid_row <= 2) OR
        (zone = 'boyztown' AND grid_row >= 1 AND grid_row <= 2) OR
        (zone = 'soi78' AND grid_row >= 1 AND grid_row <= 3) OR
        (zone = 'beachroadcentral' AND grid_row >= 1 AND grid_row <= 2) OR
        (zone NOT IN ('walkingstreet', 'soi6', 'lkmetro', 'treetown', 'soibuakhao', 'jomtiencomplex', 'boyztown', 'soi78', 'beachroadcentral'))
      )
    `;

    const { error: rowError } = await supabase.rpc('exec_sql', { sql_query: rowConstraint });
    if (rowError) {
      console.error(`❌ Error adding row constraint: ${rowError.message}`);
      throw rowError;
    }
    console.log('✅ Row constraint added successfully');

    // Step 3: Add new column constraint
    console.log('\n📌 Step 3: Adding new column constraint...');
    const colConstraint = `
      ALTER TABLE establishments
      ADD CONSTRAINT check_grid_col CHECK (
        grid_col IS NULL OR
        (zone = 'walkingstreet' AND grid_col >= 1 AND grid_col <= 24) OR
        (zone = 'soi6' AND grid_col >= 1 AND grid_col <= 20) OR
        (zone = 'lkmetro' AND grid_col >= 1 AND grid_col <= 10) OR
        (zone = 'treetown' AND grid_col >= 1 AND grid_col <= 10) OR
        (zone = 'soibuakhao' AND grid_col >= 1 AND grid_col <= 18) OR
        (zone = 'jomtiencomplex' AND grid_col >= 1 AND grid_col <= 15) OR
        (zone = 'boyztown' AND grid_col >= 1 AND grid_col <= 12) OR
        (zone = 'soi78' AND grid_col >= 1 AND grid_col <= 16) OR
        (zone = 'beachroadcentral' AND grid_col >= 1 AND grid_col <= 22) OR
        (zone NOT IN ('walkingstreet', 'soi6', 'lkmetro', 'treetown', 'soibuakhao', 'jomtiencomplex', 'boyztown', 'soi78', 'beachroadcentral'))
      )
    `;

    const { error: colError } = await supabase.rpc('exec_sql', { sql_query: colConstraint });
    if (colError) {
      console.error(`❌ Error adding column constraint: ${colError.message}`);
      throw colError;
    }
    console.log('✅ Column constraint added successfully');

    console.log('\n✅ ✅ ✅ All constraints updated successfully!\n');
    console.log('📊 New constraints allow:');
    console.log('   • Walking Street: Rows 1-30, Cols 1-24');
    console.log('   • Soi 6: Rows 1-2, Cols 1-20');
    console.log('   • LK Metro: Rows 1-4, Cols 1-10');
    console.log('   • Tree Town: Rows 1-14, Cols 1-10');
    console.log('   • Soi Buakhao: Rows 1-3, Cols 1-18');
    console.log('   • Jomtien Complex: Rows 1-2, Cols 1-15');
    console.log('   • BoyzTown: Rows 1-2, Cols 1-12');
    console.log('   • Soi 7&8: Rows 1-3, Cols 1-16');
    console.log('   • Beach Road Central: Rows 1-2, Cols 1-22\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
updateConstraints();
