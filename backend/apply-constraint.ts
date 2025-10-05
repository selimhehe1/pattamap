import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Use SERVICE_KEY for admin operations
);

async function applyConstraint() {
  console.log('🔒 PHASE 2: Adding UNIQUE constraint to prevent future duplicates...\n');

  try {
    // Create unique index with partial WHERE clause (allows NULLs)
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_position_per_zone
        ON establishments (zone, grid_row, grid_col)
        WHERE zone IS NOT NULL AND grid_row IS NOT NULL AND grid_col IS NOT NULL;
      `
    });

    if (error) {
      // If RPC function doesn't exist, provide manual instructions
      console.log('⚠️ RPC function not available. Please execute manually in Supabase SQL Editor:\n');
      console.log('```sql');
      console.log('CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_position_per_zone');
      console.log('ON establishments (zone, grid_row, grid_col)');
      console.log('WHERE zone IS NOT NULL AND grid_row IS NOT NULL AND grid_col IS NOT NULL;');
      console.log('```\n');

      console.log('📝 This constraint will:');
      console.log('   ✅ Prevent duplicate positions within the same zone');
      console.log('   ✅ Allow NULL values (for establishments not on map)');
      console.log('   ✅ Ensure swaps cannot create conflicts\n');

      console.log('🔗 Go to: https://supabase.com/dashboard → Your Project → SQL Editor');
      console.log('   Paste the SQL above and click "Run"\n');

      return false;
    }

    console.log('✅ SUCCESS! UNIQUE constraint added successfully.\n');

    // Verify the constraint
    const { data: indexes } = await supabase
      .from('pg_indexes')
      .select('indexname, indexdef')
      .eq('tablename', 'establishments')
      .eq('indexname', 'idx_unique_position_per_zone');

    if (indexes && indexes.length > 0) {
      console.log('✅ Verified: Constraint is active in database.');
      console.log(`   Index: ${indexes[0].indexname}\n`);
    }

    return true;
  } catch (err: any) {
    console.error('❌ Error applying constraint:', err.message);
    console.log('\n⚠️ Please apply manually using the SQL provided above.\n');
    return false;
  }
}

async function testConstraint() {
  console.log('🧪 Testing constraint...\n');

  // Try to create a duplicate position (should fail)
  console.log('📝 Attempting to create duplicate at (1,1)...');

  const { data: existingEstablishments } = await supabase
    .from('establishments')
    .select('id, name, grid_row, grid_col')
    .eq('zone', 'soi6')
    .eq('grid_row', 1)
    .eq('grid_col', 1);

  if (!existingEstablishments || existingEstablishments.length === 0) {
    console.log('   ℹ️ No establishment at (1,1), skipping test.');
    return;
  }

  const existingId = existingEstablishments[0].id;
  console.log(`   Existing: ${existingEstablishments[0].name} at (1,1)`);

  // Try to move another establishment to the same position
  const { data: otherEstablishment } = await supabase
    .from('establishments')
    .select('id, name, grid_row, grid_col')
    .eq('zone', 'soi6')
    .neq('id', existingId)
    .not('grid_row', 'is', null)
    .limit(1)
    .single();

  if (!otherEstablishment) {
    console.log('   ℹ️ No other establishment found for test.');
    return;
  }

  console.log(`   Testing: Moving "${otherEstablishment.name}" to (1,1)...`);

  const { error } = await supabase
    .from('establishments')
    .update({ grid_row: 1, grid_col: 1 })
    .eq('id', otherEstablishment.id);

  if (error) {
    console.log('   ✅ CONSTRAINT WORKING! Duplicate was prevented.');
    console.log(`   Error: ${error.message}\n`);
  } else {
    console.log('   ⚠️ WARNING: Duplicate was NOT prevented! Constraint may not be active.\n');
  }
}

(async () => {
  const success = await applyConstraint();

  if (success) {
    await testConstraint();
  }

  process.exit(0);
})();