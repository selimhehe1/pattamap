import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function fixLastDuplicate() {
  console.log('🔧 Fixing last duplicate at position (2,14)...\n');

  // Get both establishments at position (2,14)
  const { data: duplicates, error } = await supabase
    .from('establishments')
    .select('id, name, grid_row, grid_col, updated_at')
    .eq('zone', 'soi6')
    .eq('grid_row', 2)
    .eq('grid_col', 14)
    .order('updated_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching duplicates:', error);
    return;
  }

  if (!duplicates || duplicates.length !== 2) {
    console.log(`⚠️ Expected 2 establishments at (2,14), found ${duplicates?.length || 0}`);
    if (duplicates && duplicates.length > 0) {
      duplicates.forEach(est => {
        console.log(`   ${est.name} (${est.id})`);
      });
    }
    return;
  }

  console.log('📋 Found duplicates at (2,14):');
  console.log(`   1. ${duplicates[0].name} (oldest) - KEEP at (2,14)`);
  console.log(`   2. ${duplicates[1].name} (newest) - MOVE to (1,9)`);
  console.log('');

  const establishmentToMove = duplicates[1];

  // Move Miss B Haven to (1,9)
  console.log(`📍 Moving "${establishmentToMove.name}" to (1,9)...`);
  const { data: moveResult, error: moveError } = await supabase
    .from('establishments')
    .update({
      grid_row: 1,
      grid_col: 9,
      updated_at: new Date().toISOString()
    })
    .eq('id', establishmentToMove.id)
    .select();

  if (moveError) {
    console.error('❌ Error moving establishment:', moveError);
    return;
  }

  if (moveResult && moveResult.length > 0) {
    console.log(`✅ Successfully moved to (${moveResult[0].grid_row}, ${moveResult[0].grid_col})`);
  }

  // Final verification
  console.log('\n🔍 Final verification...\n');

  const { data: allEstablishments } = await supabase
    .from('establishments')
    .select('id, name, grid_row, grid_col')
    .eq('zone', 'soi6')
    .not('grid_row', 'is', null)
    .not('grid_col', 'is', null);

  const positionMap = new Map<string, any[]>();
  allEstablishments?.forEach(est => {
    const key = `${est.grid_row},${est.grid_col}`;
    if (!positionMap.has(key)) {
      positionMap.set(key, []);
    }
    positionMap.get(key)!.push(est);
  });

  const remainingDuplicates = Array.from(positionMap.entries()).filter(([_, ests]) => ests.length > 1);

  if (remainingDuplicates.length === 0) {
    console.log('🎉 SUCCESS! All establishments now have unique positions!');
    console.log(`✅ ${allEstablishments?.length} establishments properly distributed.\n`);
  } else {
    console.log(`⚠️ WARNING: ${remainingDuplicates.length} duplicate(s) still exist:\n`);
    remainingDuplicates.forEach(([position, ests]) => {
      console.log(`   Position ${position}: ${ests.map((e: any) => e.name).join(', ')}`);
    });
  }
}

fixLastDuplicate().then(() => process.exit(0));