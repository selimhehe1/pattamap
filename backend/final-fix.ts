import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function finalFix() {
  console.log('🔧 Final fix for last 2 duplicates...\n');

  // Move Toy Box to (1,7) - truly free position
  console.log('📍 Moving "Toy Box" to (1,7)...');
  const { data: toyBox, error: toyBoxError } = await supabase
    .from('establishments')
    .update({ grid_row: 1, grid_col: 7, updated_at: new Date().toISOString() })
    .eq('id', '9a669107-7082-4e42-a8c8-60f3b6c73b70')
    .select();

  if (toyBoxError) {
    console.error('   ❌ Error:', toyBoxError.message);
  } else if (toyBox && toyBox.length > 0) {
    console.log(`   ✅ Toy Box moved to (${toyBox[0].grid_row}, ${toyBox[0].grid_col})`);
  }

  // Move Roxy Bar to (2,4) - truly free position
  console.log('📍 Moving "Roxy Bar" to (2,4)...');
  const { data: roxyBar, error: roxyBarError } = await supabase
    .from('establishments')
    .update({ grid_row: 2, grid_col: 4, updated_at: new Date().toISOString() })
    .eq('id', '4aec774c-c84a-4bde-a9f6-e9f40f3288bf')
    .select();

  if (roxyBarError) {
    console.error('   ❌ Error:', roxyBarError.message);
  } else if (roxyBar && roxyBar.length > 0) {
    console.log(`   ✅ Roxy Bar moved to (${roxyBar[0].grid_row}, ${roxyBar[0].grid_col})`);
  }

  // Final verification
  console.log('\n🔍 Final verification...\n');

  const { data: establishments, error } = await supabase
    .from('establishments')
    .select('id, name, grid_row, grid_col, zone')
    .eq('zone', 'soi6')
    .not('grid_row', 'is', null)
    .not('grid_col', 'is', null)
    .order('grid_row', { ascending: true })
    .order('grid_col', { ascending: true });

  if (error) {
    console.error('❌ Verification error:', error);
    return;
  }

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
    console.log('🎉 SUCCESS! All establishments now have unique positions!');
    console.log(`✅ ${establishments?.length} establishments properly distributed on soi6 map.\n`);
    console.log('📊 Position Summary:');
    console.log(`   - Total establishments: ${establishments?.length}`);
    console.log(`   - Unique positions: ${positionMap.size}`);
    console.log(`   - Duplicates: 0\n`);
  } else {
    console.log(`⚠️ WARNING: ${remainingDuplicates.length} duplicate(s) still exist:\n`);
    remainingDuplicates.forEach(([position, ests]) => {
      console.log(`   Position ${position}: ${ests.map((e: any) => e.name).join(', ')}`);
    });
  }
}

finalFix().then(() => process.exit(0));