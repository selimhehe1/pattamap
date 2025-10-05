const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

(async () => {
  // Check status of Soi 6 establishments
  const { data, error } = await supabase
    .from('establishments')
    .select('id, name, zone, status')
    .eq('zone', 'soi6');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('🔍 Soi 6 establishments by status:');
    const statusCounts = {};
    data.forEach(est => {
      statusCounts[est.status] = (statusCounts[est.status] || 0) + 1;
    });
    console.log('\nStatus distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count} establishments`);
    });

    console.log('\nFirst 10 examples:');
    data.slice(0, 10).forEach(est => {
      console.log(`  - ${est.name}: status=${est.status}`);
    });
  }

  process.exit(0);
})();
