require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

(async () => {
  console.log('🔧 Fixing grid_row constraint for Walking Street...\n');

  try {
    // Drop the old constraint
    console.log('Dropping old check_grid_row constraint...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE establishments DROP CONSTRAINT IF EXISTS check_grid_row;'
    });

    if (dropError) {
      console.log('Note: Could not drop via RPC, constraint may not exist or requires direct SQL access');
    } else {
      console.log('✅ Old constraint dropped');
    }

    // Add new constraint allowing rows 1-12 for walkingstreet
    console.log('\nAdding new constraint...');
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE establishments ADD CONSTRAINT check_grid_row
            CHECK (
              (zone = 'soi6' AND grid_row >= 1 AND grid_row <= 2) OR
              (zone = 'walkingstreet' AND grid_row >= 1 AND grid_row <= 12) OR
              (zone NOT IN ('soi6', 'walkingstreet'))
            );`
    });

    if (addError) {
      console.log('❌ Could not add via RPC. You need to run this SQL manually:');
      console.log(`
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS check_grid_row;

ALTER TABLE establishments ADD CONSTRAINT check_grid_row
CHECK (
  (zone = 'soi6' AND grid_row >= 1 AND grid_row <= 2) OR
  (zone = 'walkingstreet' AND grid_row >= 1 AND grid_row <= 12) OR
  (zone NOT IN ('soi6', 'walkingstreet'))
);
`);
    } else {
      console.log('✅ New constraint added successfully!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n⚠️ You need to run this SQL manually in Supabase dashboard:');
    console.log(`
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS check_grid_row;

ALTER TABLE establishments ADD CONSTRAINT check_grid_row
CHECK (
  (zone = 'soi6' AND grid_row >= 1 AND grid_row <= 2) OR
  (zone = 'walkingstreet' AND grid_row >= 1 AND grid_row <= 12) OR
  (zone NOT IN ('soi6', 'walkingstreet'))
);
`);
  }
})();
