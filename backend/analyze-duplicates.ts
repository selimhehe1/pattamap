import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function analyzeDuplicates() {
  console.log('🔍 Analyzing duplicate positions in soi6...\n');

  const { data: establishments, error } = await supabase
    .from('establishments')
    .select('id, name, grid_row, grid_col, zone, updated_at')
    .eq('zone', 'soi6')
    .not('grid_row', 'is', null)
    .not('grid_col', 'is', null)
    .order('grid_row', { ascending: true })
    .order('grid_col', { ascending: true })
    .order('updated_at', { ascending: true });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  // Group by position
  const positionMap = new Map<string, any[]>();

  establishments?.forEach(est => {
    const key = `${est.grid_row},${est.grid_col}`;
    if (!positionMap.has(key)) {
      positionMap.set(key, []);
    }
    positionMap.get(key)!.push(est);
  });

  // Find duplicates
  const duplicates: any[] = [];
  positionMap.forEach((ests, position) => {
    if (ests.length > 1) {
      duplicates.push({ position, establishments: ests });
    }
  });

  console.log(`📊 Total establishments: ${establishments?.length}`);
  console.log(`🔢 Unique positions occupied: ${positionMap.size}`);
  console.log(`⚠️ Positions with duplicates: ${duplicates.length}\n`);

  if (duplicates.length > 0) {
    console.log('❌ DUPLICATE POSITIONS FOUND:\n');
    duplicates.forEach(({ position, establishments }) => {
      console.log(`Position (${position}) - ${establishments.length} establishments:`);
      establishments.forEach((est: any, idx: number) => {
        console.log(`  ${idx + 1}. ${est.name} (ID: ${est.id.substring(0, 8)}...)`);
        console.log(`     Updated: ${est.updated_at}`);
      });
      console.log('');
    });

    console.log('\n💡 RECOMMENDED ACTIONS:\n');
    console.log('1. For each duplicate position, keep the OLDEST establishment (first created)');
    console.log('2. Move other establishments to available positions');
    console.log('3. Add UNIQUE constraint on (zone, grid_row, grid_col)\n');
  }

  // Find available positions
  console.log('🔍 Finding available positions...\n');
  const maxRow = 2;
  const maxCol = 20;
  const occupiedPositions = new Set<string>();

  establishments?.forEach(est => {
    occupiedPositions.add(`${est.grid_row},${est.grid_col}`);
  });

  const availablePositions: string[] = [];
  for (let row = 1; row <= maxRow; row++) {
    for (let col = 1; col <= maxCol; col++) {
      const key = `${row},${col}`;
      if (!occupiedPositions.has(key)) {
        availablePositions.push(key);
      }
    }
  }

  console.log(`✅ Available positions: ${availablePositions.length}`);
  if (availablePositions.length > 0) {
    console.log('First 10 available:', availablePositions.slice(0, 10).join(', '));
  }

  return { duplicates, availablePositions };
}

analyzeDuplicates().then(() => process.exit(0));