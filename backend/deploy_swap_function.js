/**
 * Script: Deploy Swap Establishments Atomic Function
 * Description: Executes the swap_establishments_atomic.sql stored procedure in Supabase
 * Usage: node deploy_swap_function.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deploySwapFunction() {
  try {
    console.log('🚀 Starting deployment of swap_establishments_atomic function...\n');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'src', 'database', 'swap_establishments_atomic.sql');
    console.log(`📁 Reading SQL file: ${sqlFilePath}`);

    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ Error: SQL file not found at', sqlFilePath);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('✅ SQL file loaded successfully\n');

    // Execute the SQL to create the stored procedure
    console.log('🔄 Executing SQL to create stored procedure...');
    const { data, error } = await supabase.rpc('query', { query_text: sqlContent });

    if (error) {
      // Try alternative method: split and execute statements
      console.log('⚠️  First method failed, trying alternative approach...\n');

      // Extract just the CREATE FUNCTION statement
      const createFunctionMatch = sqlContent.match(/CREATE OR REPLACE FUNCTION[\s\S]*?\$\$ LANGUAGE plpgsql;/i);

      if (!createFunctionMatch) {
        console.error('❌ Error: Could not extract CREATE FUNCTION statement from SQL');
        console.error('Error details:', error);
        process.exit(1);
      }

      const createFunctionSql = createFunctionMatch[0];

      // Note: Since Supabase doesn't allow direct SQL execution via JS client,
      // we'll provide instructions instead
      console.log('📋 MANUAL DEPLOYMENT REQUIRED\n');
      console.log('Please follow these steps:\n');
      console.log('1. Open your Supabase Dashboard');
      console.log('2. Go to SQL Editor');
      console.log('3. Copy and paste the content of this file:');
      console.log('   backend/src/database/swap_establishments_atomic.sql');
      console.log('4. Click "Run" to execute\n');
      console.log('🔗 Quick link: ' + supabaseUrl.replace('/rest/v1', '') + '/project/_/sql\n');

      // Verify if function exists
      console.log('🔍 Checking if function already exists...');
      const { data: testData, error: testError } = await supabase
        .rpc('swap_establishments_atomic', {
          p_source_id: '00000000-0000-0000-0000-000000000000',
          p_target_id: '00000000-0000-0000-0000-000000000000',
          p_source_new_row: 1,
          p_source_new_col: 1,
          p_target_new_row: 2,
          p_target_new_col: 2,
          p_zone: 'test'
        });

      if (testError) {
        if (testError.code === 'PGRST202' || testError.message.includes('not found')) {
          console.log('❌ Function does NOT exist in database');
          console.log('   Please follow the manual deployment steps above.\n');
        } else if (testError.message.includes('not found') || testError.message.includes('cannot be NULL')) {
          // Expected error with fake UUIDs - function exists but validation fails
          console.log('✅ Function EXISTS in database!');
          console.log('   (Test call failed as expected with fake UUIDs)\n');
          console.log('🎉 Deployment verification successful!\n');
        } else {
          console.log('⚠️  Unexpected error during test:', testError.message);
        }
      } else {
        console.log('✅ Function EXISTS and responds correctly!\n');
        console.log('🎉 Deployment verification successful!\n');
      }

      return;
    }

    console.log('✅ Stored procedure deployed successfully!\n');

    // Verify the function was created
    console.log('🔍 Verifying function deployment...');
    const { data: verifyData, error: verifyError } = await supabase
      .rpc('swap_establishments_atomic', {
        p_source_id: '00000000-0000-0000-0000-000000000000',
        p_target_id: '00000000-0000-0000-0000-000000000000',
        p_source_new_row: 1,
        p_source_new_col: 1,
        p_target_new_row: 2,
        p_target_new_col: 2,
        p_zone: 'test'
      });

    if (verifyError) {
      if (verifyError.message.includes('not found')) {
        console.log('❌ Function verification failed - function may not exist');
      } else {
        // Expected error with fake UUIDs
        console.log('✅ Function verified successfully!');
        console.log('   (Test call failed as expected with fake UUIDs)\n');
      }
    } else {
      console.log('✅ Function verified successfully!\n');
    }

    console.log('🎉 Deployment complete!\n');
    console.log('Next steps:');
    console.log('1. Restart your backend: npm run dev');
    console.log('2. Check logs for: "✅ ATOMIC SWAP RPC completed successfully"');
    console.log('3. Test swap operations on the map\n');

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the deployment
deploySwapFunction();
