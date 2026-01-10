/**
 * Employee Validation
 *
 * Validation functions for employee data
 */

/**
 * Validate nationality array format
 */
export function validateNationalityArray(
  nationality: unknown
): { valid: boolean; error?: string } {
  if (nationality === undefined || nationality === null) {
    return { valid: true };
  }

  if (!Array.isArray(nationality)) {
    return { valid: false, error: 'Nationality must be an array' };
  }

  if (nationality.length === 0) {
    return { valid: false, error: 'Nationality array cannot be empty (omit field to remove nationality)' };
  }

  if (nationality.length > 2) {
    return { valid: false, error: 'Maximum 2 nationalities allowed (for half/mixed heritage)' };
  }

  for (const nat of nationality) {
    if (typeof nat !== 'string' || nat.trim().length === 0) {
      return { valid: false, error: 'Each nationality must be a non-empty string' };
    }
  }

  return { valid: true };
}
