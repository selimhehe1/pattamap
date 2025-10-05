import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function checkAllZones() {
  console.log('🔍 Checking for duplicate positions in ALL zones...\n');

  const zones = ['soi6', 'walkingstreet', 'lkmetro', 'treetown'];

  for (const zone of zones) {
    console.log(`\n📍 Zone: ${zone.toUpperCase()}`);
    console.log('═'.repeat(50));

    const { data: establishments, error } = await supabase
      .from('establishments')
      .select('id, name, grid_row, grid_col, zone, updated_at')
      .eq('zone', zone)
      .not('grid_row', 'is', null)
      .not('grid_col', 'is', null)
      .order('grid_row', { ascending: true })
      .order('grid_col', { ascending: true })
      .order('updated_at', { ascending: true });

    if (error) {
      console.error('❌ Error:', error);
      continue;
    }

    if (!establishments || establishments.length === 0) {
      console.log('   No establishments found\n');
      continue;
    }

    // Group by position
    const positionMap = new Map<string, typeof establishments>();
    establishments.forEach(est => {
      const key = `${est.grid_row},${est.grid_col}`;
      if (!positionMap.has(key)) {
        positionMap.set(key, []);
      }
      positionMap.get(key)!.push(est);
    });

    // Find duplicates
    const duplicates = Array.from(positionMap.entries()).filter(([_, ests]) => ests.length > 1);

    console.log(`   Total establishments: ${establishments.length}`);
    console.log(`   Unique positions: ${positionMap.size}`);
    console.log(`   Duplicate positions: ${duplicates.length}`);

    if (duplicates.length > 0) {
      console.log('\n   ❌ DUPLICATES FOUND:\n');
      duplicates.forEach(([position, ests]) => {
        console.log(`   Position (${position}) - ${ests.length} establishments:`);
        ests.forEach((est: any, idx: number) => {
          console.log(`      ${idx + 1}. ${est.name} (ID: ${est.id.substring(0, 8)}...)`);
          console.log(`         Updated: ${est.updated_at}`);
        });
        console.log('');
      });
    } else {
      console.log('   ✅ No duplicates found\n');
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(50) + '\n');

  // Count total duplicates across all zones
  let totalDuplicates = 0;
  for (const zone of zones) {
    const { data: establishments } = await supabase
      .from('establishments')
      .select('id, name, grid_row, grid_col')
      .eq('zone', zone)
      .not('grid_row', 'is', null)
      .not('grid_col', 'is', null);

    if (!establishments) continue;

    const positionMap = new Map<string, any[]>();
    establishments.forEach(est => {
      const key = `${est.grid_row},${est.grid_col}`;
      if (!positionMap.has(key)) {
        positionMap.set(key, []);
      }
      positionMap.get(key)!.push(est);
    });

    const duplicates = Array.from(positionMap.entries()).filter(([_, ests]) => ests.length > 1);
    totalDuplicates += duplicates.length;
  }

  if (totalDuplicates > 0) {
    console.log(`⚠️  Total duplicate positions across all zones: ${totalDuplicates}`);
    console.log(`\n💡 Fix required before applying UNIQUE constraint`);
  } else {
    console.log(`✅ No duplicates found in any zone!`);
    console.log(`\n🔒 Safe to apply UNIQUE constraint`);
  }
}

checkAllZones().then(() => process.exit(0));