/**
 * Supabase Auth Configuration
 *
 * This module provides authentication utilities for verifying Supabase Auth tokens
 * and performing admin operations on auth.users.
 */

import { createClient, User as SupabaseUser } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

// Use service key for admin operations (creating users, verifying tokens)
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('[SupabaseAuth] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

// Admin client with service key for backend operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Verify a Supabase Auth JWT token
 * Returns the user if valid, null otherwise
 */
export async function verifySupabaseToken(token: string): Promise<SupabaseUser | null> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error) {
      logger.debug('[SupabaseAuth] Token verification failed:', error.message);
      return null;
    }

    if (!user) {
      logger.debug('[SupabaseAuth] No user found for token');
      return null;
    }

    logger.debug('[SupabaseAuth] Token verified for user:', user.id);
    return user;
  } catch (error) {
    logger.error('[SupabaseAuth] Token verification error:', error);
    return null;
  }
}

/**
 * Get user by email from auth.users
 */
export async function getSupabaseUserByEmail(email: string): Promise<SupabaseUser | null> {
  try {
    // List users and find by email (admin API)
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      logger.error('[SupabaseAuth] List users failed:', error);
      return null;
    }

    const user = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    return user || null;
  } catch (error) {
    logger.error('[SupabaseAuth] Get user by email error:', error);
    return null;
  }
}

/**
 * Create a user in Supabase Auth with an existing bcrypt password hash
 * Used for migrating existing users to Supabase Auth
 *
 * Note: Supabase Admin API accepts bcrypt hashes via the password_hash parameter
 * Format: $2a$, $2b$, or $2y$ bcrypt hashes are supported
 */
export async function createSupabaseUserWithHash(
  email: string,
  passwordHash: string,
  metadata: Record<string, unknown> = {}
): Promise<SupabaseUser | null> {
  try {
    // Use password_hash parameter for importing bcrypt hashes
    // This is different from 'password' which expects plaintext
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password_hash: passwordHash, // Bcrypt hash from existing system
      email_confirm: true, // Mark as confirmed for migrated users
      user_metadata: metadata
    } as Parameters<typeof supabaseAdmin.auth.admin.createUser>[0]);

    if (error) {
      logger.error('[SupabaseAuth] Create user failed:', error);
      return null;
    }

    logger.info('[SupabaseAuth] User created:', data.user.id);
    return data.user;
  } catch (error) {
    logger.error('[SupabaseAuth] Create user error:', error);
    return null;
  }
}

/**
 * Update user metadata in Supabase Auth
 */
export async function updateSupabaseUserMetadata(
  userId: string,
  metadata: Record<string, unknown>
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: metadata
    });

    if (error) {
      logger.error('[SupabaseAuth] Update metadata failed:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('[SupabaseAuth] Update metadata error:', error);
    return false;
  }
}

export type { SupabaseUser };
