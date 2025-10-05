// Script to apply grid system migration to Supabase database
// Run with: node scripts/apply-grid-migration.js

const fs = require('fs');
const path = require('path');

// Read the migration file
const migrationPath = path.join(__dirname, '../src/database/migration_grid_system.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('🔧 Grid System Migration Script');
console.log('================================');
console.log('');
console.log('📋 This script will apply the grid system migration to your Supabase database.');
console.log('');
console.log('📝 Migration includes:');
console.log('   - Add zone, grid_row, grid_col columns to establishments table');
console.log('   - Add constraints and indexes for grid system');
console.log('   - Populate Soi 6 with 30 establishments in 15x2 grid layout');
console.log('   - Remove old Soi 6 data and replace with organized grid');
console.log('');
console.log('⚠️  WARNING: This will DELETE existing Soi 6 establishments!');
console.log('');
console.log('🚀 To apply this migration:');
console.log('   1. Open your Supabase Dashboard');
console.log('   2. Go to SQL Editor');
console.log('   3. Copy and paste the SQL below');
console.log('   4. Execute the query');
console.log('');
console.log('=' * 60);
console.log(migrationSQL);
console.log('=' * 60);
console.log('');
console.log('✅ After migration, restart your backend server to test the grid system!');