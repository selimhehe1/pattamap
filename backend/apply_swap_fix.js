/**
 * Script to update swap_establishments_atomic function to use row 99 as temp position
 * Run with: node backend/apply_swap_fix.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Need: SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySwapFix() {
  console.log('🔧 Applying swap_establishments_atomic fix...\n');
  console.log('📌 This will update the temporary position from row 3 to row 99');
  console.log('📌 This fixes the swap bug for Tree Town and all other zones\n');

  try {
    // Read the updated SQL file
    const sqlFile = path.join(__dirname, 'src', 'database', 'swap_establishments_atomic.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📄 SQL file loaded:', sqlFile);
    console.log('📝 Applying function update...\n');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Failed to update function:', error.message);
      throw error;
    }

    console.log('✅ ✅ ✅ swap_establishments_atomic function updated successfully!\n');
    console.log('📊 Changes applied:');
    console.log('   • Temporary position changed from (3, 1) to (99, 1)');
    console.log('   • Row 99 is out of bounds for ALL zones (Soi 6, Walking Street, LK Metro, Tree Town, etc.)');
    console.log('   • This prevents conflicts during swap operations\n');
    console.log('🎯 You can now test the swap function on Tree Town!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Tip: You may need to run the SQL manually in Supabase SQL Editor');
    console.error('   File: backend/src/database/swap_establishments_atomic.sql\n');
    process.exit(1);
  }
}

// Run the migration
applySwapFix();
