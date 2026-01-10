/**
 * Migration Script: Migrate existing users to Supabase Auth
 *
 * This script migrates users from the legacy authentication system to Supabase Auth.
 * It preserves their existing bcrypt password hashes so users can continue using
 * their current passwords.
 *
 * Usage:
 *   npx ts-node src/scripts/migrateUsersToSupabaseAuth.ts
 *
 * Options:
 *   --dry-run    Preview what would be migrated without making changes
 *   --batch=N    Process N users at a time (default: 10)
 *   --user=ID    Migrate a specific user by ID
 */

import dotenv from 'dotenv';
dotenv.config();

import { supabase } from '../config/supabase';
import { createSupabaseUserWithHash, getSupabaseUserByEmail } from '../config/supabaseAuth';
import { logger } from '../utils/logger';

interface LegacyUser {
  id: string;
  email: string;
  pseudonym: string;
  password_hash: string | null;
  role: string;
  auth_id: string | null;
  created_at: string;
}

interface MigrationResult {
  userId: string;
  email: string;
  status: 'success' | 'skipped' | 'error';
  reason?: string;
  authId?: string;
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchSizeArg = args.find(a => a.startsWith('--batch='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 10;
const userIdArg = args.find(a => a.startsWith('--user='));
const specificUserId = userIdArg ? userIdArg.split('=')[1] : null;

async function migrateUser(user: LegacyUser): Promise<MigrationResult> {
  const result: MigrationResult = {
    userId: user.id,
    email: user.email,
    status: 'error'
  };

  try {
    // Skip if already migrated
    if (user.auth_id) {
      result.status = 'skipped';
      result.reason = 'Already has auth_id';
      result.authId = user.auth_id;
      return result;
    }

    // Skip if no password hash (OAuth-only users from future)
    if (!user.password_hash) {
      result.status = 'skipped';
      result.reason = 'No password hash (OAuth user)';
      return result;
    }

    // Check if user already exists in Supabase Auth by email
    const existingAuthUser = await getSupabaseUserByEmail(user.email);
    if (existingAuthUser) {
      // Link existing Supabase Auth user
      if (!isDryRun) {
        const { error } = await supabase
          .from('users')
          .update({ auth_id: existingAuthUser.id })
          .eq('id', user.id);

        if (error) {
          result.status = 'error';
          result.reason = `Failed to link existing auth user: ${error.message}`;
          return result;
        }
      }

      result.status = 'success';
      result.reason = 'Linked to existing Supabase Auth user';
      result.authId = existingAuthUser.id;
      return result;
    }

    // Create new Supabase Auth user with existing password hash
    if (isDryRun) {
      result.status = 'success';
      result.reason = 'Would create new Supabase Auth user (dry run)';
      return result;
    }

    const supabaseUser = await createSupabaseUserWithHash(
      user.email,
      user.password_hash,
      {
        pseudonym: user.pseudonym,
        legacy_user_id: user.id,
        migrated_at: new Date().toISOString()
      }
    );

    if (!supabaseUser) {
      result.status = 'error';
      result.reason = 'Failed to create Supabase Auth user';
      return result;
    }

    // Update user with new auth_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ auth_id: supabaseUser.id })
      .eq('id', user.id);

    if (updateError) {
      result.status = 'error';
      result.reason = `Created auth user but failed to update: ${updateError.message}`;
      result.authId = supabaseUser.id;
      return result;
    }

    result.status = 'success';
    result.reason = 'Created new Supabase Auth user';
    result.authId = supabaseUser.id;
    return result;

  } catch (error) {
    result.status = 'error';
    result.reason = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

async function runMigration() {
  console.log('====================================');
  console.log('Supabase Auth Migration Script');
  console.log('====================================');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`Batch size: ${batchSize}`);
  if (specificUserId) {
    console.log(`Specific user: ${specificUserId}`);
  }
  console.log('');

  // Fetch users to migrate
  let query = supabase
    .from('users')
    .select('id, email, pseudonym, password_hash, role, auth_id, created_at')
    .is('auth_id', null); // Only users without auth_id

  if (specificUserId) {
    query = supabase
      .from('users')
      .select('id, email, pseudonym, password_hash, role, auth_id, created_at')
      .eq('id', specificUserId);
  }

  const { data: users, error: fetchError } = await query;

  if (fetchError) {
    logger.error('Failed to fetch users:', fetchError);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('No users to migrate.');
    process.exit(0);
  }

  console.log(`Found ${users.length} user(s) to process\n`);

  const results: MigrationResult[] = [];
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // Process in batches
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)}...`);

    for (const user of batch) {
      const result = await migrateUser(user as LegacyUser);
      results.push(result);

      const statusIcon = result.status === 'success' ? '✓' : result.status === 'skipped' ? '○' : '✗';
      console.log(`  ${statusIcon} ${user.email}: ${result.reason || result.status}`);

      if (result.status === 'success') successCount++;
      else if (result.status === 'skipped') skipCount++;
      else errorCount++;

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Pause between batches
    if (i + batchSize < users.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log('\n====================================');
  console.log('Migration Summary');
  console.log('====================================');
  console.log(`Total processed: ${results.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Skipped: ${skipCount}`);
  console.log(`Errors: ${errorCount}`);

  if (errorCount > 0) {
    console.log('\nErrors:');
    results
      .filter(r => r.status === 'error')
      .forEach(r => console.log(`  - ${r.email}: ${r.reason}`));
  }

  if (isDryRun) {
    console.log('\n⚠️  This was a DRY RUN. No changes were made.');
    console.log('   Run without --dry-run to perform the migration.');
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

// Run the migration
runMigration().catch(error => {
  logger.error('Migration failed:', error);
  process.exit(1);
});
