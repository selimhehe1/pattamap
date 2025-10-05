/**
 * Check existing Soi 6 establishments
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExisting() {
  console.log('🔍 Checking existing Soi 6 establishments...\n');

  const { data, error } = await supabase
    .from('establishments')
    .select('id, name, zone, grid_row, grid_col, status')
    .eq('zone', 'soi6')
    .order('grid_row')
    .order('grid_col');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} existing Soi 6 establishments:\n`);

  data.forEach(est => {
    console.log(`  Row ${est.grid_row}, Col ${est.grid_col}: ${est.name} (${est.status})`);
  });

  if (data.length > 0) {
    console.log('\n⚠️  You need to delete existing establishments before running the seed script, or modify positions.');
    console.log('\nTo delete all Soi 6 establishments, you can use:');
    console.log('DELETE FROM establishments WHERE zone = \'soi6\';');
  } else {
    console.log('\n✅ No existing Soi 6 establishments found. Safe to run seed script.');
  }
}

checkExisting();
