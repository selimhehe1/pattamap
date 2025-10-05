/**
 * Script to check and fix duplicate establishment categories
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

async function checkAndFixCategories() {
  console.log('🔍 Checking for duplicate categories...\n');

  try {
    // Get all categories
    const { data: categories, error } = await supabase
      .from('establishment_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching categories:', error);
      return;
    }

    console.log(`Found ${categories.length} total categories:\n`);

    // Group by name to find duplicates
    const categoryGroups = {};
    categories.forEach(cat => {
      if (!categoryGroups[cat.name]) {
        categoryGroups[cat.name] = [];
      }
      categoryGroups[cat.name].push(cat);
    });

    // Display all categories and identify duplicates
    let hasDuplicates = false;
    Object.entries(categoryGroups).forEach(([name, cats]) => {
      if (cats.length > 1) {
        hasDuplicates = true;
        console.log(`⚠️  DUPLICATE: "${name}" - ${cats.length} entries`);
        cats.forEach(cat => {
          console.log(`   - ID: ${cat.id}, Icon: ${cat.icon}, Color: ${cat.color}`);
        });
      } else {
        console.log(`✅ "${name}" - ID: ${cats[0].id}`);
      }
    });

    if (hasDuplicates) {
      console.log('\n⚠️  Duplicates found! Recommendation: Keep the lowest ID for each category and delete the others manually in Supabase.');
      console.log('\nSQL to delete duplicates (review before executing):');
      console.log('--------------------------------------------------');

      Object.entries(categoryGroups).forEach(([name, cats]) => {
        if (cats.length > 1) {
          // Keep first (lowest ID), delete others
          const toDelete = cats.slice(1);
          toDelete.forEach(cat => {
            console.log(`DELETE FROM establishment_categories WHERE id = ${cat.id}; -- ${name}`);
          });
        }
      });
      console.log('--------------------------------------------------\n');
    } else {
      console.log('\n✅ No duplicates found!');
    }

  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  }
}

checkAndFixCategories();
