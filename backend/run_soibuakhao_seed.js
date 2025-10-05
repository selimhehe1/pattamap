/**
 * Script to Insert Soi Buakhao Establishments into Supabase
 * Executes seed_soibuakhao_establishments.sql
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
  console.log('🚀 Starting Soi Buakhao establishments seed...\n');

  try {
    // Step 1: Add new categories (Sports Bar, Restaurant Bar)
    console.log('📝 Step 1: Adding new establishment categories...');

    const { data: existingCategories } = await supabase
      .from('establishment_categories')
      .select('name');

    const existingNames = existingCategories.map(c => c.name);

    const newCategories = [];
    if (!existingNames.includes('Sports Bar')) {
      newCategories.push({ name: 'Sports Bar', icon: 'tv', color: '#3a86ff' });
    }
    if (!existingNames.includes('Restaurant Bar')) {
      newCategories.push({ name: 'Restaurant Bar', icon: 'restaurant', color: '#fb5607' });
    }

    if (newCategories.length > 0) {
      const { error: catError } = await supabase
        .from('establishment_categories')
        .insert(newCategories);

      if (catError) {
        console.error('❌ Error adding categories:', catError);
      } else {
        console.log(`✅ Added ${newCategories.length} new categories`);
      }
    } else {
      console.log('✅ Categories already exist');
    }

    // Step 2: Get category IDs
    console.log('\n📝 Step 2: Fetching category IDs...');
    const { data: categories } = await supabase
      .from('establishment_categories')
      .select('id, name');

    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });
    console.log('✅ Category map created:', categoryMap);

    // Step 3: Prepare establishment data
    console.log('\n📝 Step 3: Preparing establishment data...');

    const establishments = [
      // ROW 1 - WEST SIDE
      // South Section (Cols 1-10)
      {
        name: 'Scooters Bar',
        category_id: categoryMap['Bar'],
        zone: 'soibuakhao',
        grid_row: 1,
        grid_col: 5,
        address: 'Soi Buakhao, next to Hungry Hippo, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '12:00-02:00',
        description: 'Popular bar with scooter theme, especially popular with Lambretta and Vespa enthusiasts. Great atmosphere and excellent value drinks.',
        status: 'approved'
      },
      {
        name: "Nicky's Restaurant & Bar",
        category_id: categoryMap['Restaurant Bar'],
        zone: 'soibuakhao',
        grid_row: 1,
        grid_col: 8,
        address: 'Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '10:00-23:00',
        description: "One of Soi Buakhao's favorite restaurants. Popular for both Thai and Western cuisine.",
        status: 'approved'
      },
      {
        name: 'Cheap Charlies',
        category_id: categoryMap['Restaurant Bar'],
        zone: 'soibuakhao',
        grid_row: 1,
        grid_col: 10,
        address: 'Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '11:00-23:00',
        description: 'Famous for cheap food and drinks. Breakfasts for less than 100 baht, lunches and dinners for under 150 baht.',
        status: 'approved'
      },
      // Mid-South Section (Cols 11-20)
      {
        name: 'Geordie Bar 1',
        category_id: categoryMap['Sports Bar'],
        zone: 'soibuakhao',
        grid_row: 1,
        grid_col: 13,
        address: 'Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '12:00-02:00',
        description: 'Great bar for playing pool or watching football. Popular with expats.',
        status: 'approved'
      },
      {
        name: 'Geordie Bar 2',
        category_id: categoryMap['Sports Bar'],
        zone: 'soibuakhao',
        grid_row: 1,
        grid_col: 15,
        address: 'Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '12:00-02:00',
        description: 'Sister venue to Geordie Bar 1. Great for pool and watching football matches.',
        status: 'approved'
      },
      {
        name: 'Matador Bar',
        category_id: categoryMap['Bar'],
        zone: 'soibuakhao',
        grid_row: 1,
        grid_col: 17,
        address: 'Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '18:00-02:00',
        description: 'Large live music venue playing rock music. Popular spot for live entertainment.',
        status: 'approved'
      },
      {
        name: 'Triangle Bar',
        category_id: categoryMap['Bar'],
        zone: 'soibuakhao',
        grid_row: 1,
        grid_col: 19,
        address: 'Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '14:00-02:00',
        description: 'Famous for excellent selection of beers, especially noted for offering all drinks at two for one. Lively atmosphere and live music.',
        status: 'approved'
      },
      // Mid-North Section (Cols 21-30)
      {
        name: 'Treetown Market',
        category_id: categoryMap['Bar'],
        zone: 'soibuakhao',
        grid_row: 1,
        grid_col: 25,
        address: 'Soi Buakhao, Pattaya (2 entrances)',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '17:00-02:00',
        description: 'Has 2 entrances on Soi Buakhao and contains many bars. Popular complex with multiple venues.',
        status: 'approved'
      },
      {
        name: "Butcher's Arms",
        category_id: categoryMap['Bar'],
        zone: 'soibuakhao',
        grid_row: 1,
        grid_col: 27,
        address: 'Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '11:00-23:00',
        description: 'British-style pub with traditional atmosphere. Popular expat hangout.',
        status: 'approved'
      },
      {
        name: "Stag's Head",
        category_id: categoryMap['Bar'],
        zone: 'soibuakhao',
        grid_row: 1,
        grid_col: 29,
        address: 'Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '12:00-23:00',
        description: 'Traditional British pub atmosphere. Good for watching sports and socializing.',
        status: 'approved'
      },
      // North Section (Cols 31-40)
      {
        name: 'Cheeky Monkey',
        category_id: categoryMap['Bar'],
        zone: 'soibuakhao',
        grid_row: 1,
        grid_col: 32,
        address: 'Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '12:00-02:00',
        description: 'Fun and lively bar with great atmosphere. Popular spot for evening drinks.',
        status: 'approved'
      },
      {
        name: "Crazy Dave's",
        category_id: categoryMap['Bar'],
        zone: 'soibuakhao',
        grid_row: 1,
        grid_col: 35,
        address: 'Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '14:00-02:00',
        description: 'Energetic bar known for wild parties and good times.',
        status: 'approved'
      },
      {
        name: 'Nikom Court',
        category_id: categoryMap['Bar'],
        zone: 'soibuakhao',
        grid_row: 1,
        grid_col: 38,
        address: 'Soi Buakhao, near Central Pattaya Rd, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '15:00-02:00',
        description: 'Popular bar in the northern section of Soi Buakhao.',
        status: 'approved'
      },

      // ROW 2 - EAST SIDE
      // South Section (Cols 1-10)
      {
        name: 'Hungry Hippo',
        category_id: categoryMap['Restaurant Bar'],
        zone: 'soibuakhao',
        grid_row: 2,
        grid_col: 5,
        address: '210, 30 Soi Buakhao, Muang Pattaya, Pattaya 20150',
        phone: '+66-95-231-4296',
        opening_hours: '07:00-22:15',
        description: 'One of the most popular restaurants on Soi Buakhao. Diagonally opposite Treetown Market. Serves breakfasts for less than 100 baht, excellent value.',
        status: 'approved'
      },
      {
        name: 'Witherspoons',
        category_id: categoryMap['Restaurant Bar'],
        zone: 'soibuakhao',
        grid_row: 2,
        grid_col: 7,
        address: 'Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '09:00-23:00',
        description: 'Popular restaurant and bar on Soi Buakhao. One of the favorite spots for food and drinks.',
        status: 'approved'
      },
      {
        name: 'Candy Club',
        category_id: categoryMap['Bar'],
        zone: 'soibuakhao',
        grid_row: 2,
        grid_col: 11,
        address: 'Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '18:00-03:00',
        description: 'Nightlife venue with vibrant atmosphere. Popular late-night spot.',
        status: 'approved'
      },
      // Mid-South Section (Cols 11-20)
      {
        name: "Danny's Sports Bar",
        category_id: categoryMap['Sports Bar'],
        zone: 'soibuakhao',
        grid_row: 2,
        grid_col: 14,
        address: 'Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '11:00-02:00',
        description: 'Sports bar showing live sports events. Popular with fans watching football, rugby, and more.',
        status: 'approved'
      },
      {
        name: 'Myth Night',
        category_id: categoryMap['Beer Bar'],
        zone: 'soibuakhao',
        grid_row: 2,
        grid_col: 18,
        address: 'Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '17:00-02:00',
        description: 'Beer bar complex with multiple seating areas. Relaxed atmosphere.',
        status: 'approved'
      },
      // Mid-North Section (Cols 21-30)
      {
        name: 'Heaven Above',
        category_id: categoryMap['Bar'],
        zone: 'soibuakhao',
        grid_row: 2,
        grid_col: 23,
        address: 'Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '17:00-02:00',
        description: 'Popular rooftop bar particularly busy from 10-11 PM. Great views and atmosphere.',
        status: 'approved'
      },
      {
        name: 'Marquee Bar',
        category_id: categoryMap['Bar'],
        zone: 'soibuakhao',
        grid_row: 2,
        grid_col: 26,
        address: 'Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '14:00-02:00',
        description: 'Retro style bar with scooter theme, especially popular with Lambretta and Vespa enthusiasts. Excellent value drinks and often has live music.',
        status: 'approved'
      },
      {
        name: 'Treetown Beer Garden',
        category_id: categoryMap['Beer Bar'],
        zone: 'soibuakhao',
        grid_row: 2,
        grid_col: 28,
        address: 'Soi Buakhao (inside Treetown complex), Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '17:00-02:00',
        description: 'Part of the Treetown complex. Open-air beer garden with relaxed atmosphere.',
        status: 'approved'
      },
      // North Section (Cols 31-40)
      {
        name: 'Scandinavian Bar',
        category_id: categoryMap['Bar'],
        zone: 'soibuakhao',
        grid_row: 2,
        grid_col: 33,
        address: 'Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-02:00',
        description: 'Nordic-themed bar popular with Scandinavian expats. Friendly atmosphere.',
        status: 'approved'
      },
      {
        name: 'Boomerang Bar',
        category_id: categoryMap['Bar'],
        zone: 'soibuakhao',
        grid_row: 2,
        grid_col: 36,
        address: 'Soi Buakhao, near Soi Boomerang, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '14:00-02:00',
        description: 'Australian-themed bar. Popular spot for drinks and sports.',
        status: 'approved'
      },
      {
        name: 'Plaza Bar',
        category_id: categoryMap['Bar'],
        zone: 'soibuakhao',
        grid_row: 2,
        grid_col: 39,
        address: 'Soi Buakhao, near New Plaza area, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '15:00-02:00',
        description: 'Located in the northern section near Central Pattaya Rd. Good spot for late afternoon drinks.',
        status: 'approved'
      }
    ];

    console.log(`✅ Prepared ${establishments.length} establishments`);

    // Step 4: Insert establishments
    console.log('\n📝 Step 4: Inserting establishments into database...');

    const { data, error } = await supabase
      .from('establishments')
      .insert(establishments)
      .select();

    if (error) {
      console.error('❌ Error inserting establishments:', error);
      throw error;
    }

    console.log(`✅ Successfully inserted ${data.length} establishments!\n`);

    // Step 5: Verify and display results
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
    console.log('   Row 1 (West Side): 13 establishments');
    console.log('   Row 2 (East Side): 12 establishments');
    console.log(`   Total: 25 establishments (55 positions available for expansion)`);

    console.log('\n✅ Soi Buakhao seed script completed successfully!');

  } catch (error) {
    console.error('\n❌ Seed script failed:', error.message);
    process.exit(1);
  }
}

runSeedScript();
