require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

(async () => {
  console.log('🚀 Starting Walking Street redistribution...\n');

  try {
    // Row 1 establishments (3)
    console.log('📍 Updating Row 1...');
    await supabase.from('establishments').update({ grid_row: 1, grid_col: 1, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Shark Club');
    await supabase.from('establishments').update({ grid_row: 1, grid_col: 2, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Champagne Gogo');
    await supabase.from('establishments').update({ grid_row: 1, grid_col: 3, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', "Misty's Gogo");

    // Row 2 establishments (3)
    console.log('📍 Updating Row 2...');
    await supabase.from('establishments').update({ grid_row: 2, grid_col: 1, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Electric Blue');
    await supabase.from('establishments').update({ grid_row: 2, grid_col: 2, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Club Electric Blue');
    await supabase.from('establishments').update({ grid_row: 2, grid_col: 3, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Hollywood Gogo');

    // Row 3 establishments (3)
    console.log('📍 Updating Row 3...');
    await supabase.from('establishments').update({ grid_row: 3, grid_col: 1, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Cosmos Gogo');
    await supabase.from('establishments').update({ grid_row: 3, grid_col: 2, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Striphouse Gogo');
    await supabase.from('establishments').update({ grid_row: 3, grid_col: 3, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Angelwitch Gogo');

    // Row 4 establishments (3)
    console.log('📍 Updating Row 4...');
    await supabase.from('establishments').update({ grid_row: 4, grid_col: 1, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'MYST Nightclub');
    await supabase.from('establishments').update({ grid_row: 4, grid_col: 2, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Republic Club');
    await supabase.from('establishments').update({ grid_row: 4, grid_col: 3, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Lucifer Gogo');

    // Row 5 establishments (3)
    console.log('📍 Updating Row 5...');
    await supabase.from('establishments').update({ grid_row: 5, grid_col: 1, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Marine 2 Disco');
    await supabase.from('establishments').update({ grid_row: 5, grid_col: 2, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Insomnia Nightclub');
    await supabase.from('establishments').update({ grid_row: 5, grid_col: 3, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Dollhouse Gogo');

    // Row 6 establishments (3)
    console.log('📍 Updating Row 6...');
    await supabase.from('establishments').update({ grid_row: 6, grid_col: 1, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', '808 Club');
    await supabase.from('establishments').update({ grid_row: 6, grid_col: 2, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', "What's Up Gogo");
    await supabase.from('establishments').update({ grid_row: 6, grid_col: 3, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Mixx Discotheque');

    // Row 7 establishments (3)
    console.log('📍 Updating Row 7...');
    await supabase.from('establishments').update({ grid_row: 7, grid_col: 1, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Sapphire Gogo');
    await supabase.from('establishments').update({ grid_row: 7, grid_col: 2, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Marine Disco');
    await supabase.from('establishments').update({ grid_row: 7, grid_col: 3, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'X-Zone Gogo');

    // Row 8 establishments (3)
    console.log('📍 Updating Row 8...');
    await supabase.from('establishments').update({ grid_row: 8, grid_col: 1, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Baccara Gogo');
    await supabase.from('establishments').update({ grid_row: 8, grid_col: 2, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Climax Gogo');
    await supabase.from('establishments').update({ grid_row: 8, grid_col: 3, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Windmill Gogo');

    // Row 9 establishments (3)
    console.log('📍 Updating Row 9...');
    await supabase.from('establishments').update({ grid_row: 9, grid_col: 1, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Kiss Gogo');
    await supabase.from('establishments').update({ grid_row: 9, grid_col: 2, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Showgirls Gogo');
    await supabase.from('establishments').update({ grid_row: 9, grid_col: 3, updated_at: new Date().toISOString() }).eq('zone', 'walkingstreet').eq('name', 'Baby Gogo');

    console.log('\n✅ Redistribution completed successfully!');

    // Verification
    console.log('\n📊 Verification:');
    const { data: establishments, error } = await supabase
      .from('establishments')
      .select('name, grid_row, grid_col')
      .eq('zone', 'walkingstreet')
      .order('grid_row', { ascending: true })
      .order('grid_col', { ascending: true });

    if (error) {
      console.error('❌ Verification error:', error);
    } else {
      console.log(`Total: ${establishments.length} establishments`);

      const byRow = establishments.reduce((acc, est) => {
        acc[est.grid_row] = (acc[est.grid_row] || 0) + 1;
        return acc;
      }, {});

      console.log('\nEstablishments per row:');
      Object.entries(byRow).forEach(([row, count]) => {
        console.log(`  Row ${row}: ${count} establishments`);
      });
    }

  } catch (error) {
    console.error('❌ Redistribution failed:', error);
  }
})();
