const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Établissements Walking Street - Distribution géographique réelle
// Category IDs: 2 = Nightclub, 4 = GoGo Bar
// ROW 1 = Côté OUEST de Walking Street (Inland/Second Road side)
// ROW 2 = Côté EST de Walking Street (Beach Road/Mer side)
const walkingStreetEstablishments = [
  // ROW 1 - SOUTH SIDE (Beach Road/Sea side) - Distribution par Sois (14 établissements)
  // Ces établissements sont du CÔTÉ SUD de Walking Street (vers la mer/plage) - EN BAS sur la carte
  { name: 'MYST Nightclub', categoryId: 2, row: 1, col: 1, address: 'Soi JP, Walking Street Area' },
  { name: 'Republic Club', categoryId: 2, row: 1, col: 2, address: 'Soi JP, Walking Street Area' },
  { name: 'Climax Gogo', categoryId: 4, row: 1, col: 4, address: 'Soi VC, Walking Street Area' },
  { name: 'X-Zone Gogo', categoryId: 4, row: 1, col: 5, address: 'Soi 16, Walking Street Area' },
  { name: 'Kiss Gogo', categoryId: 4, row: 1, col: 6, address: 'Soi 16, Walking Street Area' },
  { name: 'Dollhouse Gogo', categoryId: 4, row: 1, col: 8, address: 'Soi 15, Walking Street Area' },
  { name: 'What\'s Up Gogo', categoryId: 4, row: 1, col: 9, address: 'Soi 15, Walking Street Area' },
  { name: 'Sapphire Gogo', categoryId: 4, row: 1, col: 10, address: 'Soi 15, Walking Street Area' },
  { name: 'Showgirls Gogo', categoryId: 4, row: 1, col: 11, address: 'Soi 15, Walking Street Area' },
  { name: 'Marine 2 Disco', categoryId: 2, row: 1, col: 12, address: 'Soi Marine Plaza, Walking Street Area' },
  { name: 'Shark Club', categoryId: 4, row: 1, col: 14, address: 'Soi Diamond, Walking Street Area' },
  { name: 'Misty\'s Gogo', categoryId: 4, row: 1, col: 15, address: 'Soi Diamond, Walking Street Area' },
  { name: 'Cosmos Gogo', categoryId: 4, row: 1, col: 16, address: 'Soi Diamond, Walking Street Area' },
  { name: 'Electric Blue', categoryId: 4, row: 1, col: 18, address: 'Soi 13, Walking Street Area' },

  // ROW 2 - NORTH SIDE (Inland/Second Road side) - Distribution par Sois (13 établissements)
  // Ces établissements sont du CÔTÉ NORD de Walking Street (vers l'intérieur des terres) - EN HAUT sur la carte
  { name: 'Club Electric Blue', categoryId: 2, row: 2, col: 1, address: 'Soi JP, Walking Street Area' },
  { name: 'Champagne Gogo', categoryId: 4, row: 2, col: 3, address: 'Soi VC, Walking Street Area' },
  { name: 'Lucifer Gogo', categoryId: 4, row: 2, col: 7, address: 'Soi 15, Walking Street - Inland Side' },
  { name: 'Insomnia Nightclub', categoryId: 2, row: 2, col: 9, address: 'Walking Street, South Pattaya' },
  { name: '808 Club', categoryId: 2, row: 2, col: 11, address: 'Walking Street, South Pattaya' },
  { name: 'Mixx Discotheque', categoryId: 2, row: 2, col: 13, address: 'Walking Street, South Pattaya' },
  { name: 'Marine Disco', categoryId: 2, row: 2, col: 14, address: 'Walking Street, South Pattaya' },
  { name: 'Baccara Gogo', categoryId: 4, row: 2, col: 15, address: 'Walking Street, South Pattaya' },
  { name: 'Windmill Gogo', categoryId: 4, row: 2, col: 16, address: 'Walking Street, South Pattaya' },
  { name: 'Angelwitch Gogo', categoryId: 4, row: 2, col: 17, address: 'Walking Street, South Pattaya' },
  { name: 'Baby Gogo', categoryId: 4, row: 2, col: 18, address: 'Walking Street, South Pattaya' },
  { name: 'Hollywood Gogo', categoryId: 4, row: 2, col: 19, address: 'Soi 13/14, Walking Street Area' },
  { name: 'Striphouse Gogo', categoryId: 4, row: 2, col: 20, address: 'Soi 13, Walking Street Area' }
];

async function seedWalkingStreet() {
  console.log('🌃 Starting Walking Street seed...\n');

  for (const establishment of walkingStreetEstablishments) {
    try {
      const { data, error } = await supabase
        .from('establishments')
        .insert({
          name: establishment.name,
          category_id: establishment.categoryId,
          zone: 'walkingstreet',
          grid_row: establishment.row,
          grid_col: establishment.col,
          address: establishment.address,
          status: 'approved',
          ladydrink: '150',
          barfine: '500',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creating ${establishment.name}:`, error.message);
      } else {
        const rowLabel = establishment.row === 1 ? 'SOUTH (Beach - Bottom)' :
                        'NORTH (Inland - Top)';
        console.log(`✅ Created: ${establishment.name} - Row ${establishment.row} (${rowLabel}), Col ${establishment.col}`);
      }
    } catch (err) {
      console.error(`❌ Exception creating ${establishment.name}:`, err.message);
    }
  }

  // Vérification finale
  const { data: count } = await supabase
    .from('establishments')
    .select('id', { count: 'exact', head: true })
    .eq('zone', 'walkingstreet');

  console.log(`\n🎉 Walking Street seed complete!`);
  console.log(`📊 Total establishments in walkingstreet: ${count || 0}`);

  // Résumé par row
  const { data: byRow } = await supabase
    .from('establishments')
    .select('grid_row')
    .eq('zone', 'walkingstreet');

  const rowCounts = { 1: 0, 2: 0, 3: 0 };
  byRow?.forEach(e => rowCounts[e.grid_row] = (rowCounts[e.grid_row] || 0) + 1);

  console.log('\n📍 Distribution géographique:');
  console.log(`   Row 1 (SOUTH - Beach/Sea side - BOTTOM on map): ${rowCounts[1]} établissements`);
  console.log(`   Row 2 (NORTH - Inland/Second Road - TOP on map): ${rowCounts[2]} établissements`);
}

seedWalkingStreet()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Script failed:', err);
    process.exit(1);
  });