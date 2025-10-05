/**
 * Script to Insert Soi 6 Establishments into Supabase
 * Inserts 20 real verified bars from Soi 6 Pattaya
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeedScript() {
  console.log('🚀 Starting Soi 6 establishments seed...\n');

  try {
    // Step 1: Get category IDs
    console.log('📝 Step 1: Fetching category IDs...');
    const { data: categories } = await supabase
      .from('establishment_categories')
      .select('id, name');

    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });
    console.log('✅ Category map created:', categoryMap);

    // Step 2: Prepare establishment data
    console.log('\n📝 Step 2: Preparing Soi 6 establishment data...');

    const establishments = [
      // ROW 1 - SECOND ROAD SIDE (10 bars, cols 1-10)
      {
        name: 'Ruby Club',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 1,
        grid_col: 1,
        address: 'Midway down Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-01:00',
        description: 'Combination of both open and inside bar styles. Modern bar with luxury atmosphere right in the middle of Soi Six. Popular with regulars.',
        status: 'approved'
      },
      {
        name: 'Sky Bar',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 1,
        grid_col: 2,
        address: 'Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-01:00',
        description: 'Popular girlie bar on Soi 6 with friendly atmosphere and cold beers.',
        status: 'approved'
      },
      {
        name: 'Wicked',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 1,
        grid_col: 3,
        address: 'Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '14:00-02:00',
        description: 'Lively girlie bar known for its energetic atmosphere and late closing hours.',
        status: 'approved'
      },
      {
        name: 'Nightwish',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 1,
        grid_col: 4,
        address: 'Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '14:00-02:00',
        description: 'One of the most popular girlie bars on Soi 6. Part of the Nightwish Group with excellent reputation.',
        status: 'approved'
      },
      {
        name: 'Saigon Girls',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 1,
        grid_col: 5,
        address: 'Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-01:00',
        description: 'Girlie bar with Vietnamese-themed atmosphere and friendly staff.',
        status: 'approved'
      },
      {
        name: 'Roxy Bar',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 1,
        grid_col: 6,
        address: 'Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-01:00',
        description: 'Well-known girlie bar among the top venues on Soi 6. Great atmosphere and service.',
        status: 'approved'
      },
      {
        name: 'Miss B Haven',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 1,
        grid_col: 7,
        address: 'Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-01:00',
        description: 'Charming girlie bar with playful name and welcoming atmosphere.',
        status: 'approved'
      },
      {
        name: 'Soho Bar',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 1,
        grid_col: 8,
        address: 'Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-01:00',
        description: 'Stylish girlie bar with London-themed decor and friendly hostesses.',
        status: 'approved'
      },
      {
        name: "Mod's Bar",
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 1,
        grid_col: 9,
        address: 'Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-01:00',
        description: 'Popular girlie bar with modern vibe and excellent service.',
        status: 'approved'
      },
      {
        name: 'Spider Girl',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 1,
        grid_col: 10,
        address: 'Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-01:00',
        description: 'Unique themed girlie bar with distinctive character and loyal customer base.',
        status: 'approved'
      },

      // ROW 2 - BEACH ROAD SIDE (10 bars, cols 1-10)
      {
        name: 'Queen Victoria Inn',
        category_id: categoryMap['Pub'],
        zone: 'soi6',
        grid_row: 2,
        grid_col: 1,
        address: 'Soi 6, Pattaya (directly on Soi 6)',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '10:00-00:00',
        description: 'Traditional English Pub and Budget hotel/guesthouse, Guest Friendly. Established in 2001 with over 22 years of quality service. The only hotel directly on Soi 6 itself. British style pub where you can watch the antics of Soi 6 from a safe distance.',
        status: 'approved'
      },
      {
        name: 'Hollywood Bar',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 2,
        grid_col: 2,
        address: 'Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '14:00-02:00',
        description: 'New double unit bar on Soi 6. Hot Ladies, Cold Drinks, Cold Air Con. Large space with modern amenities.',
        status: 'approved'
      },
      {
        name: 'Lisa Bar',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 2,
        grid_col: 3,
        address: 'Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-01:00',
        description: 'Nestled along vibrant Soi 6, offers a unique and unforgettable experience for patrons seeking entertainment, refreshments, and good company.',
        status: 'approved'
      },
      {
        name: 'Lollipop Bar',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 2,
        grid_col: 4,
        address: 'Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-01:00',
        description: 'The epitome of fun and excitement on Soi 6, renowned for its unbeatable combination of cheap beers, delicious food, and charming company.',
        status: 'approved'
      },
      {
        name: 'Avarice Bar',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 2,
        grid_col: 5,
        address: 'Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-01:00',
        description: 'Quality drinks from ice-cold beers to cocktails at affordable prices, along with snacks and meals. Over 20,000 Facebook likes and strong reputation.',
        status: 'approved'
      },
      {
        name: 'Bee Corner Bar',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 2,
        grid_col: 6,
        address: 'Across from Corner Bar, Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-01:00',
        description: 'Popular corner location across from Corner Bar. Well-known for friendly atmosphere and strategic position.',
        status: 'approved'
      },
      {
        name: 'Flirt Bar',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 2,
        grid_col: 7,
        address: 'Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-01:00',
        description: 'Hidden gem along Soi 6 with plenty of hostesses and welcoming atmosphere. Known as "Flirt On" by regulars.',
        status: 'approved'
      },
      {
        name: 'Exotica Bar',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 2,
        grid_col: 8,
        address: 'Middle of Soi 6, closer to 2nd Road end, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-01:00',
        description: 'Opened in early October 2019 when the popular Sexy in the City bar was split into two smaller bars. Located in the middle of Soi 6.',
        status: 'approved'
      },
      {
        name: 'Illuzion Bar',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 2,
        grid_col: 9,
        address: 'Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-01:00',
        description: 'Known for wallet-friendly prices and serves as a haven for those seeking a laid-back atmosphere. Popular with budget-conscious visitors.',
        status: 'approved'
      },
      {
        name: '3 Angels Bar',
        category_id: categoryMap['Beer Bar'],
        zone: 'soi6',
        grid_row: 2,
        grid_col: 10,
        address: 'Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-01:00',
        description: 'Features charming hostesses with radiant smiles and engaging personalities. Official Instagram account with over 120,000 followers shows its popularity.',
        status: 'approved'
      }
    ];

    console.log(`✅ Prepared ${establishments.length} Soi 6 establishments`);

    // Step 3: Insert establishments
    console.log('\n📝 Step 3: Inserting establishments into database...');

    const { data, error } = await supabase
      .from('establishments')
      .insert(establishments)
      .select();

    if (error) {
      console.error('❌ Error inserting establishments:', error);
      throw error;
    }

    console.log(`✅ Successfully inserted ${data.length} establishments!\n`);

    // Step 4: Verify and display results
    console.log('📊 Summary by Category:');
    const categoryCounts = {};
    establishments.forEach(est => {
      const catName = Object.keys(categoryMap).find(k => categoryMap[k] === est.category_id);
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    });
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} establishments`);
    });

    console.log('\n📍 Grid Distribution:');
    console.log('   Row 1 (Second Road side): 10 establishments (cols 1-10)');
    console.log('   Row 2 (Beach Road side): 10 establishments (cols 1-10)');
    console.log('   Reserved spaces: 20 positions (cols 11-20 on both rows)');
    console.log(`   Total Capacity: 40 positions (20 filled, 20 reserved = 50% utilization)`);

    console.log('\n✅ Soi 6 seed script completed successfully!');

  } catch (error) {
    console.error('\n❌ Seed script failed:', error.message);
    process.exit(1);
  }
}

runSeedScript();
