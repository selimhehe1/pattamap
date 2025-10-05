require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

(async () => {
  console.log('🚀 Atomic Walking Street redistribution...\n');

  try {
    // Step 1: Get all Walking Street establishments sorted by current position
    const { data: establishments, error: fetchError } = await supabase
      .from('establishments')
      .select('id, name, grid_row, grid_col')
      .eq('zone', 'walkingstreet')
      .order('grid_row', { ascending: true })
      .order('grid_col', { ascending: true });

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      return;
    }

    console.log(`Found ${establishments.length} establishments\n`);

    // Step 2: Move ALL establishments to temporary positions first (using high columns temporarily)
    // Use rows 1-12 with columns 10+ as temporary positions
    console.log('📦 Moving all to temporary positions (cols 10+)...');
    for (let i = 0; i < establishments.length; i++) {
      const est = establishments[i];
      const tempRow = Math.floor(i / 3) + 1; // Rows 1-9 (3 per row)
      const tempCol = 10 + (i % 3); // Columns 10, 11, 12 as temporary

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
      console.log(`  ✓ ${est.name} → temp (${tempRow}, ${tempCol})`);
    }

    console.log('\n✅ All establishments in temporary positions');

    // Step 3: Move from temporary to final positions
    console.log('\n🎯 Moving to final positions...\n');

    const newPositions = [
      // Row 1
      { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 },
      // Row 2
      { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
      // Row 3
      { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 },
      // Row 4
      { row: 4, col: 1 }, { row: 4, col: 2 }, { row: 4, col: 3 },
      // Row 5
      { row: 5, col: 1 }, { row: 5, col: 2 }, { row: 5, col: 3 },
      // Row 6
      { row: 6, col: 1 }, { row: 6, col: 2 }, { row: 6, col: 3 },
      // Row 7
      { row: 7, col: 1 }, { row: 7, col: 2 }, { row: 7, col: 3 },
      // Row 8
      { row: 8, col: 1 }, { row: 8, col: 2 }, { row: 8, col: 3 },
      // Row 9
      { row: 9, col: 1 }, { row: 9, col: 2 }, { row: 9, col: 3 }
    ];

    for (let i = 0; i < establishments.length; i++) {
      const est = establishments[i];
      const newPos = newPositions[i];

      console.log(`Moving "${est.name}" → (${newPos.row}, ${newPos.col})`);

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

    console.log('\n✅ Redistribution completed!');

    // Verification
    console.log('\n📊 Verification:');
    const { data: verified, error: verifyError } = await supabase
      .from('establishments')
      .select('name, grid_row, grid_col')
      .eq('zone', 'walkingstreet')
      .order('grid_row', { ascending: true })
      .order('grid_col', { ascending: true });

    if (verifyError) {
      console.error('❌ Verification error:', verifyError);
    } else {
      const byRow = verified.reduce((acc, est) => {
        acc[est.grid_row] = (acc[est.grid_row] || 0) + 1;
        return acc;
      }, {});

      console.log('\nEstablishments per row:');
      Object.entries(byRow).forEach(([row, count]) => {
        console.log(`  Row ${row}: ${count} establishments`);
      });

      console.log('\nAll establishments:');
      verified.forEach(est => {
        console.log(`  Row ${est.grid_row}, Col ${est.grid_col}: ${est.name}`);
      });
    }

  } catch (error) {
    console.error('❌ Redistribution failed:', error);
  }
})();
