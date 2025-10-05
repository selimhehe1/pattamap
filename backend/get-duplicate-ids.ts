import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function getDuplicateIds() {
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

  // Find duplicates and generate reassignment code
  console.log('📋 Establishments to reassign (keep oldest, move newer):\n');

  const reassignments: any[] = [];
  const availablePositions = ['1,1', '1,2', '1,3', '1,4', '1,5', '2,1', '2,2', '2,3'];
  let posIndex = 0;

  positionMap.forEach((ests, position) => {
    if (ests.length > 1) {
      console.log(`\nPosition ${position} (${ests.length} establishments):`);

      ests.forEach((est: any, idx: number) => {
        if (idx === 0) {
          console.log(`  ✅ KEEP: ${est.name} (oldest) - ID: ${est.id}`);
        } else {
          const [newRow, newCol] = availablePositions[posIndex].split(',').map(Number);
          console.log(`  ➡️  MOVE: ${est.name} to (${newRow},${newCol}) - ID: ${est.id}`);
          reassignments.push({
            id: est.id,
            name: est.name,
            oldPos: `(${position})`,
            newRow,
            newCol
          });
          posIndex++;
        }
      });
    }
  });

  console.log('\n\n📋 Copy this array into fix-duplicates.ts:\n');
  console.log('const REASSIGNMENTS = [');
  reassignments.forEach(r => {
    console.log(`  { id: '${r.id}', name: '${r.name}', oldPos: '${r.oldPos}', newRow: ${r.newRow}, newCol: ${r.newCol} },`);
  });
  console.log('];\n');
}

getDuplicateIds().then(() => process.exit(0));