import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function cleanNullPositions() {
  console.log('🧹 Cleaning establishments with NULL positions in soi6...\n');

  // IDs to delete (test establishments + duplicates with NULL)
  const idsToDelete = [
    '5b294d7a-2729-47e9-a077-7563e1c6c315', // Suna (NULL)
    '0bfc7548-f553-46b9-8530-554118d328b3', // Test Establishment avec Logo
    'a1e68e76-13f5-4237-b21c-94067b9a29f6', // Test Establishment AVEC Logo
    '0ca70b5f-5a2f-4c08-8bb3-442e6d1c6624', // TEST DEBUG Logo
    'd60a1abe-6b15-4712-b26f-34ff1908fc26'  // Suna duplicate (NULL)
  ];

  for (const id of idsToDelete) {
    const { data, error } = await supabase
      .from('establishments')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error(`❌ Error deleting ${id}:`, error);
    } else if (data && data.length > 0) {
      console.log(`✅ Deleted: ${data[0].name} (${id})`);
    }
  }

  console.log('\n✅ Cleanup complete!\n');

  // Verify cleanup
  const { data: remaining, error: verifyError } = await supabase
    .from('establishments')
    .select('id, name, grid_row, grid_col')
    .eq('zone', 'soi6')
    .or('grid_row.is.null,grid_col.is.null');

  if (verifyError) {
    console.error('❌ Verification error:', verifyError);
    return;
  }

  if (remaining && remaining.length > 0) {
    console.log(`⚠️ Still ${remaining.length} establishments with NULL positions`);
  } else {
    console.log('✅ No more NULL positions in soi6!');
  }
}

cleanNullPositions().then(() => process.exit(0));