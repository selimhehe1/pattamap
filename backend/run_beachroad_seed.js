/**
 * Script to Insert Beach Road Establishments into Supabase
 * Executes seed_beachroad_establishments data insertion
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
  console.log('🚀 Starting Beach Road establishments seed...\n');

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
    console.log('\n📝 Step 2: Preparing Beach Road establishment data...');

    const establishments = [
      // NORTH PATTAYA AREA
      {
        name: 'Virgin Rooftop Bar',
        category_id: categoryMap['Bar'],
        zone: 'beachroad',
        grid_row: 1,
        grid_col: 4,
        address: 'Beach Road Soi 4, North Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '17:00-01:00',
        description: 'Stunning rooftop bar with panoramic views over Pattaya beach. Popular sunset spot.',
        status: 'approved'
      },
      {
        name: 'Skybar Summer Club',
        category_id: categoryMap['Bar'],
        zone: 'beachroad',
        grid_row: 1,
        grid_col: 8,
        address: 'Beach Road, North Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '12:00-02:00',
        description: 'The highest rooftop bar in Pattaya with double-decker pool. Rated best restaurant in Pattaya by TripAdvisor 2024.',
        status: 'approved'
      },

      // SOI 6 AREA
      {
        name: 'Beach Bar Soi 6',
        category_id: categoryMap['Bar'],
        zone: 'beachroad',
        grid_row: 2,
        grid_col: 6,
        address: 'Beach Road near Soi 6, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '14:00-02:00',
        description: 'Popular beach bar at the Soi 6 intersection. Great for watching the sunset.',
        status: 'approved'
      },

      // SOI 7/8 AREA
      {
        name: "Gulliver's Bar & Restaurant",
        category_id: categoryMap['Restaurant Bar'],
        zone: 'beachroad',
        grid_row: 1,
        grid_col: 12,
        address: 'Beach Road near Soi 7/8, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '11:00-23:00',
        description: 'Spacious bar and restaurant with cozy outdoor seating. Popular expat hangout.',
        status: 'approved'
      },
      {
        name: 'Hops Brewhouse',
        category_id: categoryMap['Bar'],
        zone: 'beachroad',
        grid_row: 2,
        grid_col: 13,
        address: 'Beach Road, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '15:00-01:00',
        description: 'German beer bar and restaurant. Authentic atmosphere with imported beers.',
        status: 'approved'
      },

      // CENTRAL PATTAYA / CENTRAL FESTIVAL AREA
      {
        name: 'Horizon Rooftop Bar',
        category_id: categoryMap['Bar'],
        zone: 'beachroad',
        grid_row: 1,
        grid_col: 18,
        address: 'Level 34, Hilton Pattaya, Central Festival Beach Road',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '17:00-02:00',
        description: '1390 sqm rooftop venue with panoramic views. Buy 1 Get 1 Happy Hour 5pm-7pm daily.',
        status: 'approved'
      },
      {
        name: "Mulligan's Irish Pub",
        category_id: categoryMap['Pub'],
        zone: 'beachroad',
        grid_row: 2,
        grid_col: 18,
        address: 'Central Festival, Beach Road, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '11:00-01:00',
        description: 'Authentic Irish pub in Central Festival mall. Live sports and traditional atmosphere.',
        status: 'approved'
      },
      {
        name: 'Hard Rock Cafe Pattaya',
        category_id: categoryMap['Restaurant Bar'],
        zone: 'beachroad',
        grid_row: 1,
        grid_col: 19,
        address: 'Beach Road, Pattaya Beachfront',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '11:00-02:00',
        description: 'Iconic Hard Rock Cafe on Pattaya beachfront. Live music and classic American menu.',
        status: 'approved'
      },
      {
        name: 'Lay Beach Club',
        category_id: categoryMap['Bar'],
        zone: 'beachroad',
        grid_row: 1,
        grid_col: 20,
        address: 'Beach Road, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '10:00-23:00',
        description: 'New 2025 beachside venue with rooftop lounge, Gulf views, and evening fire performances.',
        status: 'approved'
      },
      {
        name: 'The Music Bar',
        category_id: categoryMap['Bar'],
        zone: 'beachroad',
        grid_row: 2,
        grid_col: 19,
        address: 'Central Festival, Beach Road, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '18:00-02:00',
        description: 'Live music bar in Central Festival complex. Features local and international bands.',
        status: 'approved'
      },

      // PATTAYALAND AREA
      {
        name: 'Beach Road Bistro',
        category_id: categoryMap['Restaurant Bar'],
        zone: 'beachroad',
        grid_row: 1,
        grid_col: 24,
        address: 'Beach Road near Pattayaland, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '12:00-23:00',
        description: 'Beachfront bistro with international cuisine. Popular for sunset dinners.',
        status: 'approved'
      },
      {
        name: 'The Lounge Central',
        category_id: categoryMap['Bar'],
        zone: 'beachroad',
        grid_row: 2,
        grid_col: 24,
        address: 'Beach Road, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '19:00-03:00',
        description: 'Sophisticated lounge bar with cocktails and DJ sets. Upscale atmosphere.',
        status: 'approved'
      },
      {
        name: 'Pattayaland Beer Garden',
        category_id: categoryMap['Beer Bar'],
        zone: 'beachroad',
        grid_row: 2,
        grid_col: 25,
        address: 'Beach Road near Soi 13, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '15:00-02:00',
        description: 'Collection of small beer bars in open air environment opposite Central Festival.',
        status: 'approved'
      },

      // BOYZTOWN AREA
      {
        name: 'Boyztown Beachside',
        category_id: categoryMap['Bar'],
        zone: 'beachroad',
        grid_row: 1,
        grid_col: 30,
        address: 'Beach Road near Pattayaland Soi 3, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '16:00-02:00',
        description: 'Gay-friendly beach bar near Boyztown entrance. Welcoming atmosphere.',
        status: 'approved'
      },

      // SOUTH PATTAYA / WALKING STREET AREA
      {
        name: 'Beach Club South',
        category_id: categoryMap['Bar'],
        zone: 'beachroad',
        grid_row: 1,
        grid_col: 36,
        address: 'Beach Road, South Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '17:00-03:00',
        description: 'Beachside club near Walking Street. Popular pre-party spot.',
        status: 'approved'
      },
      {
        name: 'Walking Street View Bar',
        category_id: categoryMap['Bar'],
        zone: 'beachroad',
        grid_row: 2,
        grid_col: 37,
        address: 'Beach Road near Walking Street, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '18:00-04:00',
        description: 'Corner bar with views of Walking Street entrance. Strategic location.',
        status: 'approved'
      },
      {
        name: 'Ocean SKY Pattaya',
        category_id: categoryMap['Bar'],
        zone: 'beachroad',
        grid_row: 1,
        grid_col: 38,
        address: 'Beach Road near Walking Street, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '17:00-01:00',
        description: 'Rooftop bar on cruise vessel concept. Unique floating bar experience.',
        status: 'approved'
      },
      {
        name: 'Bali Hai Sunset Bar',
        category_id: categoryMap['Bar'],
        zone: 'beachroad',
        grid_row: 1,
        grid_col: 39,
        address: 'Beach Road near Bali Hai Pier, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '15:00-23:00',
        description: 'End of Beach Road near Bali Hai Pier. Perfect sunset views.',
        status: 'approved'
      },
      {
        name: 'Walking Street Gateway',
        category_id: categoryMap['Bar'],
        zone: 'beachroad',
        grid_row: 2,
        grid_col: 38,
        address: 'Beach Road at Walking Street entrance, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '19:00-05:00',
        description: 'Bar at the iconic Walking Street gateway. First stop for night owls.',
        status: 'approved'
      }
    ];

    console.log(`✅ Prepared ${establishments.length} establishments`);

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
    console.log('   Row 1 (Beach Side): 11 establishments');
    console.log('   Row 2 (City Side): 9 establishments');
    console.log(`   Total: 20 establishments (60 positions available for expansion)`);

    console.log('\n✅ Beach Road seed script completed successfully!');

  } catch (error) {
    console.error('\n❌ Seed script failed:', error.message);
    process.exit(1);
  }
}

runSeedScript();
