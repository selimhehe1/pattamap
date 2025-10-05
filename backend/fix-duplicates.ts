import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Mapping of establishments to move with their new positions (corrected IDs)
const REASSIGNMENTS = [
  { id: '9a669107-7082-4e42-a8c8-60f3b6c73b70', name: 'Toy Box', oldPos: '(1,10)', newRow: 1, newCol: 1 },
  { id: 'ba12b8ec-8675-4831-ac7e-6c8e665ff7bf', name: 'Butterfly Bar', oldPos: '(1,11)', newRow: 1, newCol: 2 },
  { id: 'ad7ea8ab-e8e3-41f9-8260-dc87dd9746ca', name: 'Spider Girl', oldPos: '(1,11)', newRow: 1, newCol: 3 },
  { id: '36347585-c410-4245-8598-ed7852be3076', name: 'Sky Bar', oldPos: '(1,13)', newRow: 1, newCol: 4 },
  { id: '0db13ca6-dfbb-4866-b60f-63364479c74b', name: 'Suna', oldPos: '(2,2)', newRow: 1, newCol: 5 },
  { id: 'e33d083c-bdca-4aaf-a65e-6af27f733af8', name: 'Saigon Girls', oldPos: '(2,6)', newRow: 2, newCol: 1 },
  { id: '4aec774c-c84a-4bde-a9f6-e9f40f3288bf', name: 'Roxy Bar', oldPos: '(2,20)', newRow: 2, newCol: 2 }
];

async function fixDuplicates() {
  console.log('🔧 PHASE 1: Fixing Duplicate Positions\n');
  console.log(`Moving ${REASSIGNMENTS.length} establishments to available positions...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const assignment of REASSIGNMENTS) {
    console.log(`📍 Moving "${assignment.name}" from ${assignment.oldPos} to (${assignment.newRow},${assignment.newCol})...`);

    const { data, error } = await supabase
      .from('establishments')
      .update({
        grid_row: assignment.newRow,
        grid_col: assignment.newCol,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignment.id)
      .select();

    if (error) {
      console.error(`   ❌ Error:`, error.message);
      errorCount++;
    } else if (data && data.length > 0) {
      console.log(`   ✅ Successfully moved to (${data[0].grid_row}, ${data[0].grid_col})`);
      successCount++;
    } else {
      console.error(`   ⚠️ No data returned - establishment might not exist`);
      errorCount++;
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   ✅ Successful moves: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  // Verify no more duplicates
  console.log(`\n🔍 Verifying no duplicates remain...\n`);

  const { data: establishments, error: fetchError } = await supabase
    .from('establishments')
    .select('id, name, grid_row, grid_col, zone')
    .eq('zone', 'soi6')
    .not('grid_row', 'is', null)
    .not('grid_col', 'is', null)
    .order('grid_row', { ascending: true })
    .order('grid_col', { ascending: true });

  if (fetchError) {
    console.error('❌ Verification error:', fetchError);
    return;
  }

  // Check for remaining duplicates
  const positionMap = new Map<string, any[]>();
  establishments?.forEach(est => {
    const key = `${est.grid_row},${est.grid_col}`;
    if (!positionMap.has(key)) {
      positionMap.set(key, []);
    }
    positionMap.get(key)!.push(est);
  });

  const remainingDuplicates = Array.from(positionMap.entries()).filter(([_, ests]) => ests.length > 1);

  if (remainingDuplicates.length === 0) {
    console.log('✅ SUCCESS! No duplicate positions found.');
    console.log(`✅ All ${establishments?.length} establishments have unique positions.\n`);
  } else {
    console.log(`⚠️ WARNING: ${remainingDuplicates.length} duplicate position(s) still exist:\n`);
    remainingDuplicates.forEach(([position, ests]) => {
      console.log(`   Position ${position}: ${ests.map((e: any) => e.name).join(', ')}`);
    });
  }
}

fixDuplicates().then(() => process.exit(0));