require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

/**
 * WALKING STREET TOPOGRAPHIC REDISTRIBUTION
 *
 * Walking Street has 6 blocks created by 5 vertical streets:
 * - Block 1 (rows 1-2): Before Soi JP (0-15%)
 * - Block 2 (rows 3-4): Soi JP ↔ Marine (15-35%)
 * - Block 3 (rows 5-6): Marine ↔ Soi 15 (35-50%)
 * - Block 4 (rows 7-8): Soi 15 ↔ Soi 14 (50-65%)
 * - Block 5 (rows 9-10): Soi 14 ↔ Diamond (65-85%)
 * - Block 6 (rows 11-12): After Diamond (85-100%)
 *
 * Each block has 2 sides (North and South of Walking Street):
 * - Odd rows (1, 3, 5, 7, 9, 11): North side
 * - Even rows (2, 4, 6, 8, 10, 12): South side
 */

(async () => {
  console.log('🗺️  Walking Street Topographic Redistribution...\n');
  console.log('📍 Organizing establishments by real street topology:\n');

  try {
    // Get all Walking Street establishments
    const { data: establishments, error: fetchError } = await supabase
      .from('establishments')
      .select('id, name, grid_row, grid_col')
      .eq('zone', 'walkingstreet')
      .order('name', { ascending: true });

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      return;
    }

    console.log(`Found ${establishments.length} establishments\n`);

    // Define topographic distribution (27 establishments across 6 blocks)
    // Using all 5 columns to spread establishments across each block
    const topographicPositions = [
      // Block 1 (Before Soi JP) - 5 establishments spread across 5 columns
      { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 4 }, // North: 3 (col 1,2,4)
      { row: 2, col: 2 }, { row: 2, col: 4 },                     // South: 2 (col 2,4)

      // Block 2 (Soi JP ↔ Marine) - 5 establishments spread across 5 columns
      { row: 3, col: 1 }, { row: 3, col: 3 }, { row: 3, col: 5 }, // North: 3 (col 1,3,5)
      { row: 4, col: 2 }, { row: 4, col: 4 },                     // South: 2 (col 2,4)

      // Block 3 (Marine ↔ Soi 15) - 4 establishments spread
      { row: 5, col: 2 }, { row: 5, col: 4 },                     // North: 2 (col 2,4)
      { row: 6, col: 1 }, { row: 6, col: 5 },                     // South: 2 (col 1,5)

      // Block 4 (Soi 15 ↔ Soi 14) - 4 establishments spread
      { row: 7, col: 1 }, { row: 7, col: 5 },                     // North: 2 (col 1,5)
      { row: 8, col: 2 }, { row: 8, col: 4 },                     // South: 2 (col 2,4)

      // Block 5 (Soi 14 ↔ Diamond) - 5 establishments spread across 5 columns
      { row: 9, col: 1 }, { row: 9, col: 3 }, { row: 9, col: 5 }, // North: 3 (col 1,3,5)
      { row: 10, col: 2 }, { row: 10, col: 4 },                   // South: 2 (col 2,4)

      // Block 6 (After Diamond) - 4 establishments spread
      { row: 11, col: 1 }, { row: 11, col: 5 },                   // North: 2 (col 1,5)
      { row: 12, col: 2 }, { row: 12, col: 4 }                    // South: 2 (col 2,4)
    ];

    console.log('📊 Distribution by blocks:');
    console.log('  Block 1 (Before Soi JP):       5 establishments (rows 1-2)');
    console.log('  Block 2 (Soi JP ↔ Marine):     5 establishments (rows 3-4)');
    console.log('  Block 3 (Marine ↔ Soi 15):     4 establishments (rows 5-6)');
    console.log('  Block 4 (Soi 15 ↔ Soi 14):     4 establishments (rows 7-8)');
    console.log('  Block 5 (Soi 14 ↔ Diamond):    5 establishments (rows 9-10)');
    console.log('  Block 6 (After Diamond):       4 establishments (rows 11-12)');
    console.log('\n🔄 Starting redistribution...\n');

    // Step 1: Move all to temporary positions (cols 10+)
    console.log('📦 Step 1: Moving all to temporary positions...');
    for (let i = 0; i < establishments.length; i++) {
      const est = establishments[i];
      const tempRow = Math.floor(i / 3) + 1;
      const tempCol = 10 + (i % 3);

      const { error: tempError } = await supabase
        .from('establishments')
        .update({
          grid_row: tempRow,
          grid_col: tempCol,
          updated_at: new Date().toISOString()
        })
        .eq('id', est.id);

      if (tempError) {
        console.error(`❌ Error moving ${est.name} to temp:`, tempError);
        return;
      }
    }
    console.log('✅ All establishments in temporary positions\n');

    // Step 2: Move to final topographic positions
    console.log('🗺️  Step 2: Moving to final topographic positions...\n');

    for (let i = 0; i < establishments.length; i++) {
      const est = establishments[i];
      const newPos = topographicPositions[i];
      const blockNumber = Math.ceil(newPos.row / 2);
      const side = newPos.row % 2 === 1 ? 'North' : 'South';

      console.log(`  "${est.name}"`);
      console.log(`    → Block ${blockNumber}, ${side} side, Position (${newPos.row}, ${newPos.col})`);

      const { error: updateError } = await supabase
        .from('establishments')
        .update({
          grid_row: newPos.row,
          grid_col: newPos.col,
          updated_at: new Date().toISOString()
        })
        .eq('id', est.id);

      if (updateError) {
        console.error(`❌ Error updating ${est.name}:`, updateError);
      }
    }

    console.log('\n✅ Topographic redistribution completed!\n');

    // Verification
    console.log('📊 Verification by blocks:\n');
    const { data: verified, error: verifyError } = await supabase
      .from('establishments')
      .select('name, grid_row, grid_col')
      .eq('zone', 'walkingstreet')
      .order('grid_row', { ascending: true })
      .order('grid_col', { ascending: true });

    if (verifyError) {
      console.error('❌ Verification error:', verifyError);
    } else {
      // Group by blocks
      const blockLabels = [
        'Block 1 (Before Soi JP)',
        'Block 2 (Soi JP ↔ Marine)',
        'Block 3 (Marine ↔ Soi 15)',
        'Block 4 (Soi 15 ↔ Soi 14)',
        'Block 5 (Soi 14 ↔ Diamond)',
        'Block 6 (After Diamond)'
      ];

      for (let blockNum = 1; blockNum <= 6; blockNum++) {
        const northRow = blockNum * 2 - 1;
        const southRow = blockNum * 2;

        const northEsts = verified.filter(e => e.grid_row === northRow);
        const southEsts = verified.filter(e => e.grid_row === southRow);

        console.log(`${blockLabels[blockNum - 1]}:`);
        console.log(`  North (row ${northRow}): ${northEsts.length} establishments`);
        northEsts.forEach(e => console.log(`    - ${e.name} (col ${e.grid_col})`));
        console.log(`  South (row ${southRow}): ${southEsts.length} establishments`);
        southEsts.forEach(e => console.log(`    - ${e.name} (col ${e.grid_col})`));
        console.log('');
      }

      console.log(`\n✅ Total: ${verified.length} establishments distributed across 6 topographic blocks`);
    }

  } catch (error) {
    console.error('❌ Redistribution failed:', error);
  }
})();
