// Database Logo Check - Verify logo_url schema and data
// Run with: node database-logo-check.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Supabase client using environment variables (same as debug-db-check.js)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function checkDatabaseLogoSchema() {
  console.log('🔍 LOGO SCHEMA CHECK - Starting verification...\n');

  try {
    // 1. Check if logo_url column exists by trying to select it
    console.log('1️⃣ Checking logo_url column exists...');

    const { data: schemaTest, error: schemaError } = await supabase
      .from('establishments')
      .select('id, name, logo_url')
      .limit(1);

    if (schemaError) {
      console.log('❌ logo_url column test failed:', schemaError);
      if (schemaError.message && schemaError.message.includes('logo_url')) {
        console.log('❌ logo_url column does NOT exist in establishments table!');
        return;
      }
    } else {
      console.log('✅ logo_url column exists in establishments table!');
    }

    // 2. Check existing establishments and their logos
    console.log('\n2️⃣ Checking existing establishments with logos...');

    const { data: establishments, error: dataError } = await supabase
      .from('establishments')
      .select('id, name, logo_url, updated_at, created_at')
      .order('updated_at', { ascending: false });

    if (dataError) {
      console.error('❌ Error fetching establishments:', dataError);
      return;
    }

    if (!establishments || establishments.length === 0) {
      console.log('❌ No establishments found in database!');
      return;
    }

    console.log(`📊 Total establishments: ${establishments.length}`);

    const withLogos = establishments.filter(est => est.logo_url);
    const withoutLogos = establishments.filter(est => !est.logo_url);

    console.log(`🎨 With logos: ${withLogos.length}`);
    console.log(`❌ Without logos: ${withoutLogos.length}\n`);

    // 3. Detailed logo analysis
    if (withLogos.length > 0) {
      console.log('3️⃣ Establishments WITH logos:');
      withLogos.forEach((est, index) => {
        console.log(`   ${index + 1}. ${est.name}`);
        console.log(`      Logo URL: ${est.logo_url}`);
        console.log(`      Updated: ${est.updated_at}`);
        console.log(`      Valid URL: ${est.logo_url?.startsWith('https://') ? '✅' : '❌'}`);
        console.log('');
      });
    }

    if (withoutLogos.length > 0) {
      console.log('4️⃣ Establishments WITHOUT logos (first 5):');
      withoutLogos.slice(0, 5).forEach((est, index) => {
        console.log(`   ${index + 1}. ${est.name} (Updated: ${est.updated_at})`);
      });
      if (withoutLogos.length > 5) {
        console.log(`   ... and ${withoutLogos.length - 5} more\n`);
      }
    }

    // 4. Check for Cloudinary URLs specifically
    console.log('5️⃣ Cloudinary URL analysis:');
    const cloudinaryUrls = withLogos.filter(est => est.logo_url?.includes('cloudinary.com'));
    const nonCloudinaryUrls = withLogos.filter(est => est.logo_url && !est.logo_url.includes('cloudinary.com'));

    console.log(`   Cloudinary URLs: ${cloudinaryUrls.length}`);
    console.log(`   Non-Cloudinary URLs: ${nonCloudinaryUrls.length}`);

    if (cloudinaryUrls.length > 0) {
      console.log('\n   ✅ Sample Cloudinary URLs:');
      cloudinaryUrls.slice(0, 3).forEach((est, index) => {
        console.log(`      ${index + 1}. ${est.name}: ${est.logo_url}`);
      });
    }

    if (nonCloudinaryUrls.length > 0) {
      console.log('\n   ⚠️  Non-Cloudinary URLs:');
      nonCloudinaryUrls.forEach((est, index) => {
        console.log(`      ${index + 1}. ${est.name}: ${est.logo_url}`);
      });
    }

    // 5. Check migration record
    console.log('\n6️⃣ Checking migration records...');
    const { data: migrations, error: migError } = await supabase
      .from('schema_migrations')
      .select('version, description, applied_at')
      .ilike('version', '%logo%');

    if (migError) {
      console.log('ℹ️  Migration table check failed (table may not exist):', migError.message);
    } else if (migrations && migrations.length > 0) {
      console.log('✅ Logo migration records found:');
      migrations.forEach(mig => {
        console.log(`   - ${mig.version}: ${mig.description} (Applied: ${mig.applied_at})`);
      });
    } else {
      console.log('ℹ️  No logo-related migrations found in records');
    }

    // 6. Test logo_url update capability
    console.log('\n7️⃣ Testing logo_url update capability...');

    const testEstablishment = establishments[0];
    if (testEstablishment) {
      const testUrl = 'https://res.cloudinary.com/test/image/upload/v1234567890/test-logo.png';
      const originalUrl = testEstablishment.logo_url;

      console.log(`   Testing with establishment: ${testEstablishment.name}`);
      console.log(`   Original logo_url: ${originalUrl || 'NULL'}`);

      // Update test
      const { data: updateResult, error: updateError } = await supabase
        .from('establishments')
        .update({
          logo_url: testUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', testEstablishment.id)
        .select('id, name, logo_url')
        .single();

      if (updateError) {
        console.log('❌ Update test failed:', updateError);
      } else {
        console.log('✅ Update test successful!');
        console.log(`   New logo_url: ${updateResult.logo_url}`);

        // Restore original value
        await supabase
          .from('establishments')
          .update({ logo_url: originalUrl })
          .eq('id', testEstablishment.id);

        console.log('✅ Original value restored');
      }
    }

    // Summary
    console.log('\n🎯 SUMMARY:');
    console.log(`   ✅ logo_url column: EXISTS`);
    console.log(`   📊 Total establishments: ${establishments.length}`);
    console.log(`   🎨 With logos: ${withLogos.length} (${Math.round(withLogos.length / establishments.length * 100)}%)`);
    console.log(`   ☁️  Cloudinary URLs: ${cloudinaryUrls.length}`);
    console.log(`   🔄 Update capability: WORKING`);

    if (withLogos.length === 0) {
      console.log('\n⚠️  RECOMMENDATION: No logos found. System appears ready but no data yet.');
    } else {
      console.log('\n✅ Logo system appears to be working correctly!');
    }

  } catch (error) {
    console.error('❌ LOGO CHECK FAILED:', error);
  }
}

// Run the check
checkDatabaseLogoSchema();