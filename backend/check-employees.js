const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkEmployees() {
  try {
    console.log('🔍 Checking employee data in database...\n');

    // Get latest employees
    const { data: latest, error } = await supabase
      .from('employees')
      .select('id, name, nickname, created_at, status')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    console.log('📋 Latest 10 employees:');
    latest.forEach((emp, index) => {
      console.log(`${index + 1}. ID: ${emp.id}`);
      console.log(`   Name: ${emp.name} (${emp.nickname})`);
      console.log(`   Status: ${emp.status}`);
      console.log(`   Created: ${emp.created_at}\n`);
    });

    // Search specifically for 'Fon' (from the error log)
    const { data: fonResults } = await supabase
      .from('employees')
      .select('id, name, nickname, created_at, status')
      .ilike('name', '%fon%');

    console.log('🔍 Employees named "Fon":');
    if (fonResults.length > 0) {
      fonResults.forEach(emp => {
        console.log(`ID: ${emp.id} | Name: ${emp.name} (${emp.nickname}) | Status: ${emp.status}`);
      });
    } else {
      console.log('No employees found with name containing "fon"');
    }

    // Check if the problematic ID exists anywhere
    console.log('\n🚨 Checking for problematic ID "1716781013":');
    const { data: problematicEmployee } = await supabase
      .from('employees')
      .select('*')
      .eq('id', '1716781013')
      .single();

    if (problematicEmployee) {
      console.log('Found employee with ID 1716781013:');
      console.log(JSON.stringify(problematicEmployee, null, 2));
    } else {
      console.log('❌ No employee found with ID "1716781013"');
      console.log('This confirms the ID is invalid/non-existent');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkEmployees();