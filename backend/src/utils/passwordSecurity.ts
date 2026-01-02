/**
 * Password Security Utilities
 *
 * Provides password validation and breach checking using HaveIBeenPwned API
 */

import crypto from 'crypto';
import { logger } from './logger';

/**
 * 🔒 SECURITY FIX: HaveIBeenPwned Breach Check (CVSS 6.5)
 *
 * Checks if password has been exposed in known data breaches
 * using the HaveIBeenPwned Passwords API (k-Anonymity model)
 *
 * How it works:
 * 1. Hash password with SHA-1
 * 2. Send first 5 chars of hash to API (privacy-preserving)
 * 3. API returns all hashes starting with those 5 chars
 * 4. Check if full hash is in the response
 *
 * Privacy: Password never sent to API, only partial hash
 *
 * @param password - Password to check
 * @returns true if password found in breach database
 */
export const checkPasswordBreach = async (password: string): Promise<boolean> => {
  try {
    // SHA-1 hash the password
    const sha1Hash = crypto
      .createHash('sha1')
      .update(password)
      .digest('hex')
      .toUpperCase();

    // k-Anonymity: Send only first 5 characters
    const hashPrefix = sha1Hash.substring(0, 5);
    const hashSuffix = sha1Hash.substring(5);

    // Query HaveIBeenPwned API (range search)
    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${hashPrefix}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'PattaMap-PasswordChecker/1.0',
          'Add-Padding': 'true' // HIBP padding for additional privacy
        }
      }
    );

    if (!response.ok) {
      // If API fails, log but don't block registration
      // (fail-open for availability, but log for monitoring)
      logger.warn('HaveIBeenPwned API request failed', {
        status: response.status,
        statusText: response.statusText
      });
      return false; // Don't block on API failure
    }

    const hashList = await response.text();

    // Check if our hash suffix appears in the response
    // Format: "SUFFIX:COUNT\r\n" (e.g., "003D68EB55068C33ACE09247EE4C639306B:3")
    const isBreached = hashList
      .split('\r\n')
      .some(line => line.startsWith(hashSuffix));

    if (isBreached) {
      logger.warn('Password found in breach database', {
        hashPrefix, // Safe to log (only 5 chars)
        // DO NOT log full hash or password
      });
    }

    return isBreached;

  } catch (error) {
    // If check fails (network error, etc.), log but don't block
    logger.error('Password breach check failed', error);
    return false; // Fail-open for user convenience
  }
};
