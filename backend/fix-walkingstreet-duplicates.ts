import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function fixWalkingStreetDuplicates() {
  console.log('🔧 Fixing Walking Street duplicates...\n');

  const { data: establishments, error } = await supabase
    .from('establishments')
    .select('id, name, grid_row, grid_col, zone, updated_at')
    .eq('zone', 'walkingstreet')
    .not('grid_row', 'is', null)
    .not('grid_col', 'is', null)
    .order('grid_row', { ascending: true })
    .order('grid_col', { ascending: true })
    .order('updated_at', { ascending: true });

  if (error || !establishments) {
    console.error('❌ Error fetching establishments:', error);
    return;
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

  // Find duplicates and prepare deletions
  const toDelete: string[] = [];
  const duplicates = Array.from(positionMap.entries()).filter(([_, ests]) => ests.length > 1);

  console.log(`Found ${duplicates.length} duplicate positions\n`);

  duplicates.forEach(([position, ests]) => {
    console.log(`Position (${position}) - ${ests.length} establishments:`);
    ests.forEach((est: any, idx: number) => {
      if (idx === 0) {
        console.log(`   ✅ KEEP: ${est.name} (${est.id.substring(0, 8)}...) - oldest`);
      } else {
        console.log(`   ❌ DELETE: ${est.name} (${est.id.substring(0, 8)}...) - duplicate`);
        toDelete.push(est.id);
      }
    });
    console.log('');
  });

  if (toDelete.length === 0) {
    console.log('✅ No duplicates to delete');
    return;
  }

  console.log(`\n📊 Summary: Will delete ${toDelete.length} duplicate establishments\n`);
  console.log('⏳ Deleting...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const id of toDelete) {
    const { error: deleteError } = await supabase
      .from('establishments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error(`   ❌ Error deleting ${id}:`, deleteError.message);
      errorCount++;
    } else {
      successCount++;
      process.stdout.write('.');
    }
  }

  console.log(`\n\n✅ Deleted ${successCount} duplicates`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} errors`);
  }

  // Final verification
  console.log('\n🔍 Final verification...\n');

  const { data: remaining } = await supabase
    .from('establishments')
    .select('id, name, grid_row, grid_col')
    .eq('zone', 'walkingstreet')
    .not('grid_row', 'is', null)
    .not('grid_col', 'is', null);

  const verifyMap = new Map<string, any[]>();
  remaining?.forEach(est => {
    const key = `${est.grid_row},${est.grid_col}`;
    if (!verifyMap.has(key)) {
      verifyMap.set(key, []);
    }
    verifyMap.get(key)!.push(est);
  });

  const remainingDups = Array.from(verifyMap.entries()).filter(([_, ests]) => ests.length > 1);

  if (remainingDups.length === 0) {
    console.log('🎉 SUCCESS! All duplicates removed from Walking Street!');
    console.log(`✅ ${remaining?.length} establishments with unique positions\n`);
  } else {
    console.log(`⚠️ WARNING: ${remainingDups.length} duplicate(s) still exist`);
  }
}

fixWalkingStreetDuplicates().then(() => process.exit(0));