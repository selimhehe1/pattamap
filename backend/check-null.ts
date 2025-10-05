import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function checkNullPositions() {
  console.log('🔍 Checking for establishments with NULL positions in soi6...\n');

  const { data, error } = await supabase
    .from('establishments')
    .select('id, name, grid_row, grid_col, zone, updated_at')
    .eq('zone', 'soi6')
    .or('grid_row.is.null,grid_col.is.null')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`⚠️ Found ${data.length} establishment(s) with NULL positions:\n`);
    data.forEach(est => {
      console.log(`  - ${est.name}`);
      console.log(`    ID: ${est.id}`);
      console.log(`    Position: (${est.grid_row}, ${est.grid_col})`);
      console.log(`    Updated: ${est.updated_at}`);
      console.log('');
    });
  } else {
    console.log('✅ No establishments with NULL positions found in soi6');
  }

  console.log('\n🔍 Checking all soi6 establishments...\n');

  const { data: allData, error: allError } = await supabase
    .from('establishments')
    .select('id, name, grid_row, grid_col, zone, updated_at')
    .eq('zone', 'soi6')
    .order('grid_row', { ascending: true, nullsFirst: true })
    .order('grid_col', { ascending: true, nullsFirst: true });

  if (allError) {
    console.error('❌ Error:', allError);
    return;
  }

  console.log(`📊 Total soi6 establishments: ${allData.length}\n`);
  allData.forEach(est => {
    console.log(`  ${est.name}: (${est.grid_row}, ${est.grid_col})`);
  });
}

checkNullPositions().then(() => process.exit(0));