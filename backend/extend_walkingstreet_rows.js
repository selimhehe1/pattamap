require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

(async () => {
  console.log('🔧 Extending Walking Street grid rows to support vertical Sois (rows 13-42)...\n');

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

    // Add new constraint allowing rows 1-32 for walkingstreet
    // Rows 1-12: Walking Street horizontal
    // Rows 13-32: Vertical Sois (5 Sois × 2 sides × 2 positions = 20 rows)
    console.log('\nAdding new extended constraint...');
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE establishments ADD CONSTRAINT check_grid_row
            CHECK (
              (zone = 'soi6' AND grid_row >= 1 AND grid_row <= 2) OR
              (zone = 'walkingstreet' AND grid_row >= 1 AND grid_row <= 32) OR
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
  (zone = 'walkingstreet' AND grid_row >= 1 AND grid_row <= 32) OR
  (zone NOT IN ('soi6', 'walkingstreet'))
);

-- Rows 1-12: Walking Street horizontal blocks
-- Rows 13-32: Vertical Sois grids (2 positions per side)
--   13-14: Soi JP West (2 positions)
--   15-16: Soi JP East (2 positions)
--   17-18: Soi Marine West
--   19-20: Soi Marine East
--   21-22: Soi 15 West
--   23-24: Soi 15 East
--   25-26: Soi 14 West
--   27-28: Soi 14 East
--   29-30: Soi Diamond West
--   31-32: Soi Diamond East
`);
    } else {
      console.log('✅ New extended constraint added successfully!');
      console.log('\n📊 Walking Street now supports:');
      console.log('   - Rows 1-12: Walking Street horizontal (existing)');
      console.log('   - Rows 13-32: Vertical Sois grids (2 positions per side)');
      console.log('   - Total capacity: 12 horizontal + 20 vertical = 32 positions');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n⚠️ You need to run this SQL manually in Supabase dashboard:');
    console.log(`
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS check_grid_row;

ALTER TABLE establishments ADD CONSTRAINT check_grid_row
CHECK (
  (zone = 'soi6' AND grid_row >= 1 AND grid_row <= 2) OR
  (zone = 'walkingstreet' AND grid_row >= 1 AND grid_row <= 32) OR
  (zone NOT IN ('soi6', 'walkingstreet'))
);
`);
  }
})();
