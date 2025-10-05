/**
 * Script to Insert LK Metro Establishments into Supabase
 * Executes seed_lkmetro_establishments.sql
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeedScript() {
  console.log('🚀 Starting LK Metro establishments seed...\n');

  try {
    // Step 1: Add new categories (Sports Bar, Coyote Bar)
    console.log('📝 Step 1: Adding new establishment categories...');

    const { data: existingCategories } = await supabase
      .from('establishment_categories')
      .select('name');

    const existingNames = existingCategories.map(c => c.name);

    const newCategories = [];
    if (!existingNames.includes('Sports Bar')) {
      newCategories.push({ name: 'Sports Bar', icon: 'tv', color: '#3a86ff' });
    }
    if (!existingNames.includes('Coyote Bar')) {
      newCategories.push({ name: 'Coyote Bar', icon: 'fire', color: '#ff006e' });
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
      // ROW 1 - Horizontal Segment (9 positions)
      {
        name: 'KINK Agogo',
        category_id: categoryMap['GoGo Bar'],
        zone: 'lkmetro',
        grid_row: 1,
        grid_col: 1,
        address: 'LK Metro, Soi Diana leg, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '19:00-03:00',
        description: 'The biggest and most stylish gogo bar on LK Metro. Two-story venue opened in 2019 with large stage and comfortable seating. One of the busiest gogos in the city.',
        status: 'approved'
      },
      {
        name: 'Lady Love Agogo',
        category_id: categoryMap['GoGo Bar'],
        zone: 'lkmetro',
        grid_row: 1,
        grid_col: 2,
        address: '33/102 LK Metro Alley (Soi Diana Entrance), Pattaya 20150',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '20:00-03:00',
        description: 'The most popular gogo bar in LK Metro for 10 years. Known for excellent service and vibrant atmosphere. Email: info@ladylovepattaya.com',
        status: 'approved'
      },
      {
        name: 'Sugar Sugar Agogo',
        category_id: categoryMap['GoGo Bar'],
        zone: 'lkmetro',
        grid_row: 1,
        grid_col: 3,
        address: 'Corner of LK Metro and Soi Buakhao, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '19:00-03:00',
        description: 'Medium-sized agogo on the strategic corner location. Luxurious decoration, relaxing ambience, good music, and fantastic shows. Dozens of girls working each night.',
        status: 'approved'
      },
      {
        name: 'Crystal Club',
        category_id: categoryMap['GoGo Bar'],
        zone: 'lkmetro',
        grid_row: 1,
        grid_col: 4,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '19:00-03:00',
        description: 'Double unit agogo bar established as one of the best and most popular gogos in LK Metro. Known for excellent service and party atmosphere.',
        status: 'approved'
      },
      {
        name: 'Queen Club',
        category_id: categoryMap['GoGo Bar'],
        zone: 'lkmetro',
        grid_row: 1,
        grid_col: 5,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '19:00-03:00',
        description: 'Large gogo bar with over 70 stunning girls working each night. One of the premier venues on LK Metro.',
        status: 'approved'
      },
      {
        name: 'Champagne Agogo',
        category_id: categoryMap['GoGo Bar'],
        zone: 'lkmetro',
        grid_row: 1,
        grid_col: 6,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '19:00-03:00',
        description: 'The original and first agogo to open in LK Metro. Still in its original location and one of the most popular venues. Known for "stunners".',
        status: 'approved'
      },
      {
        name: "Murphy's Law",
        category_id: categoryMap['Bar'],
        zone: 'lkmetro',
        grid_row: 1,
        grid_col: 7,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '12:00-02:00',
        description: 'Irish bar with great atmosphere. Enjoy the craic with Steve the owner. Popular expat hangout spot.',
        status: 'approved'
      },
      {
        name: 'iRovers Sports Bar',
        category_id: categoryMap['Sports Bar'],
        zone: 'lkmetro',
        grid_row: 1,
        grid_col: 8,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '00:00-23:59',
        description: 'Open 24 hours. The ultimate destination for sports enthusiasts. Shows live English Premier League, Championship, NRL, AFL, rugby, UFC, NFL, NCAA, cricket, Formula 1, and more.',
        status: 'approved'
      },
      {
        name: 'Billabong Bar',
        category_id: categoryMap['Bar'],
        zone: 'lkmetro',
        grid_row: 1,
        grid_col: 9,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '12:00-02:00',
        description: 'Highly recommended for solo visitors. Prime people-watching location with lively yet approachable atmosphere. Great spot to relax and observe the LK Metro scene.',
        status: 'approved'
      },

      // ROW 2 - Horizontal Segment (8 positions, col 9 masked)
      {
        name: 'Touch Agogo',
        category_id: categoryMap['GoGo Bar'],
        zone: 'lkmetro',
        grid_row: 2,
        grid_col: 1,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '19:00-03:00',
        description: 'Small gogo bar but a great party place with very hands-on performers. Popular with regulars.',
        status: 'approved'
      },
      {
        name: 'Pulse Agogo',
        category_id: categoryMap['GoGo Bar'],
        zone: 'lkmetro',
        grid_row: 2,
        grid_col: 2,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '19:00-03:00',
        description: 'Energetic gogo bar with good atmosphere and quality entertainment.',
        status: 'approved'
      },
      {
        name: 'Pandoras Agogo',
        category_id: categoryMap['GoGo Bar'],
        zone: 'lkmetro',
        grid_row: 2,
        grid_col: 3,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '19:30-03:00',
        description: 'Popular gogo bar with consistent quality and friendly atmosphere.',
        status: 'approved'
      },
      {
        name: 'LK Angels Agogo',
        category_id: categoryMap['GoGo Bar'],
        zone: 'lkmetro',
        grid_row: 2,
        grid_col: 4,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '19:00-03:00',
        description: 'Small but vibrant party venue. Known for energetic shows and friendly staff.',
        status: 'approved'
      },
      {
        name: 'Kilkenny Bar',
        category_id: categoryMap['Bar'],
        zone: 'lkmetro',
        grid_row: 2,
        grid_col: 5,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '12:00-02:00',
        description: 'Irish-themed bar with traditional atmosphere. Popular with expats looking for a familiar pub experience.',
        status: 'approved'
      },
      {
        name: 'Fubar',
        category_id: categoryMap['Bar'],
        zone: 'lkmetro',
        grid_row: 2,
        grid_col: 6,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-02:00',
        description: 'Casual bar with relaxed atmosphere. Good spot for afternoon drinks and evening entertainment.',
        status: 'approved'
      },
      {
        name: 'Cloud 9 Bar',
        category_id: categoryMap['Bar'],
        zone: 'lkmetro',
        grid_row: 2,
        grid_col: 7,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '11:00-02:00',
        description: 'All-day bar opening from late morning. Comfortable atmosphere with friendly staff.',
        status: 'approved'
      },
      {
        name: "Jibby's",
        category_id: categoryMap['Bar'],
        zone: 'lkmetro',
        grid_row: 2,
        grid_col: 8,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-03:00',
        description: 'Lively bar with late closing hours. Popular spot for nightlife enthusiasts.',
        status: 'approved'
      },

      // ROW 3 - Vertical Segment (7 positions, cols 3-9, cols 1-2 masked)
      {
        name: 'Top Gun',
        category_id: categoryMap['GoGo Bar'],
        zone: 'lkmetro',
        grid_row: 3,
        grid_col: 3,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '14:00-03:00',
        description: 'Now open in the afternoon. Established gogo bar with loyal customer base.',
        status: 'approved'
      },
      {
        name: 'Fever Agogo',
        category_id: categoryMap['GoGo Bar'],
        zone: 'lkmetro',
        grid_row: 3,
        grid_col: 4,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '19:00-03:00',
        description: 'Quality gogo bar with excellent shows and friendly atmosphere.',
        status: 'approved'
      },
      {
        name: 'The Den',
        category_id: categoryMap['Bar'],
        zone: 'lkmetro',
        grid_row: 3,
        grid_col: 5,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:00-23:00',
        description: 'Lounge bar with more relaxed atmosphere. Perfect for earlier evening drinks.',
        status: 'approved'
      },
      {
        name: 'Bar Club Le Poste',
        category_id: categoryMap['Bar'],
        zone: 'lkmetro',
        grid_row: 3,
        grid_col: 6,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '13:30-02:00',
        description: 'Stylish lounge bar with sophisticated atmosphere. Good for conversation and cocktails.',
        status: 'approved'
      },
      {
        name: 'Champagne Coyotes',
        category_id: categoryMap['Coyote Bar'],
        zone: 'lkmetro',
        grid_row: 3,
        grid_col: 7,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '17:30-02:30',
        description: 'Unique coyote bar with energetic dancers and party atmosphere. Related to Champagne Agogo brand.',
        status: 'approved'
      },
      {
        name: 'Bar Code',
        category_id: categoryMap['Beer Bar'],
        zone: 'lkmetro',
        grid_row: 3,
        grid_col: 8,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '17:00-02:00',
        description: 'Classic girlie beer bar. Regular crowd favorite with affordable prices.',
        status: 'approved'
      },
      {
        name: 'Phoenix',
        category_id: categoryMap['Beer Bar'],
        zone: 'lkmetro',
        grid_row: 3,
        grid_col: 9,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '17:00-02:00',
        description: 'Traditional beer bar with friendly staff and relaxed atmosphere.',
        status: 'approved'
      },

      // ROW 4 - Vertical Segment (3 establishments + 6 reserved)
      {
        name: 'Boom',
        category_id: categoryMap['Beer Bar'],
        zone: 'lkmetro',
        grid_row: 4,
        grid_col: 1,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '17:00-02:00',
        description: 'Lively beer bar with party atmosphere. Regular entertainment and promotions.',
        status: 'approved'
      },
      {
        name: 'Bar Fine',
        category_id: categoryMap['Beer Bar'],
        zone: 'lkmetro',
        grid_row: 4,
        grid_col: 2,
        address: 'LK Metro, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '17:00-02:00',
        description: 'Well-established beer bar with friendly service. Popular with regulars.',
        status: 'approved'
      },
      {
        name: 'Las Vegas Beer Garden',
        category_id: categoryMap['Beer Bar'],
        zone: 'lkmetro',
        grid_row: 4,
        grid_col: 3,
        address: 'Soi Diana, opposite LK Metro entrance, Pattaya',
        phone: '+66-XXX-XXX-XXX',
        opening_hours: '17:00-02:00',
        description: 'Unique complex with 10 bars, each named after a famous Las Vegas establishment. Large outdoor beer garden atmosphere.',
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
    console.log('   Row 1 (Horizontal): 9 establishments');
    console.log('   Row 2 (Horizontal): 8 establishments');
    console.log('   Row 3 (Vertical): 7 establishments');
    console.log('   Row 4 (Vertical): 3 establishments + 6 reserved spaces');
    console.log(`   Total Capacity: 33 positions (27 filled, 6 reserved)`);

    console.log('\n✅ LK Metro seed script completed successfully!');

  } catch (error) {
    console.error('\n❌ Seed script failed:', error.message);
    process.exit(1);
  }
}

runSeedScript();
