// Add a test logo manually to verify the system
// This simulates what the frontend would do
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

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

async function addTestLogo() {
  console.log('🎨 ADDING TEST LOGO TO DATABASE');
  console.log('='.repeat(40));

  try {
    // Get first establishment
    const { data: establishments, error: findError } = await supabase
      .from('establishments')
      .select('id, name, logo_url')
      .limit(1);

    if (findError || !establishments || establishments.length === 0) {
      console.log('❌ No establishments found');
      return;
    }

    const establishment = establishments[0];
    console.log(`\n🏢 Target: ${establishment.name} (ID: ${establishment.id})`);
    console.log(`📄 Current logo_url: ${establishment.logo_url || 'NULL'}`);

    // Add a real-looking Cloudinary URL (simulates successful upload)
    const testLogoUrl = 'https://res.cloudinary.com/pattaya-directory/image/upload/v1727632000/establishments/test-establishment-logo.png';

    console.log(`\n🔄 Adding test logo URL: ${testLogoUrl}`);

    const { data: result, error: updateError } = await supabase
      .from('establishments')
      .update({
        logo_url: testLogoUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', establishment.id)
      .select('id, name, logo_url')
      .single();

    if (updateError) {
      console.log('❌ Failed to add logo:', updateError);
      return;
    }

    console.log('✅ Logo added successfully!');
    console.log(`📊 Result:`, result);

    // Verify the change
    console.log('\n🔍 Verifying change in database...');

    const { data: verification, error: verifyError } = await supabase
      .from('establishments')
      .select('id, name, logo_url, updated_at')
      .eq('id', establishment.id)
      .single();

    if (verifyError) {
      console.log('❌ Verification failed:', verifyError);
    } else {
      console.log('✅ Verification successful!');
      console.log(`   Name: ${verification.name}`);
      console.log(`   Logo URL: ${verification.logo_url}`);
      console.log(`   Updated: ${verification.updated_at}`);
    }

    // Check total count with logos
    const { data: allWithLogos, error: countError } = await supabase
      .from('establishments')
      .select('id, name, logo_url')
      .not('logo_url', 'is', null);

    if (!countError) {
      console.log(`\n📊 Total establishments with logos: ${allWithLogos?.length || 0}`);
      if (allWithLogos && allWithLogos.length > 0) {
        allWithLogos.forEach((est, index) => {
          console.log(`   ${index + 1}. ${est.name}: ${est.logo_url}`);
        });
      }
    }

    console.log('\n✅ TEST LOGO ADDED TO DATABASE!');
    console.log('\n💡 Next steps:');
    console.log('   1. Refresh your frontend');
    console.log('   2. Check the maps for logo display');
    console.log('   3. Verify logo appears on establishment cards');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
addTestLogo();