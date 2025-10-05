require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

(async () => {
  const { data, error } = await supabase
    .from('establishments')
    .select('id, name, grid_row, grid_col, zone')
    .eq('zone', 'walkingstreet')
    .order('grid_row', { ascending: true })
    .order('grid_col', { ascending: true });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Walking Street establishments - Total:', data.length);

    const byRow = data.reduce((acc, est) => {
      acc[est.grid_row] = (acc[est.grid_row] || 0) + 1;
      return acc;
    }, {});

    console.log('\nRow distribution:', JSON.stringify(byRow, null, 2));

    console.log('\nDetailed positions:');
    data.forEach(est => {
      console.log(`Row ${est.grid_row}, Col ${est.grid_col}: ${est.name}`);
    });
  }
})();
