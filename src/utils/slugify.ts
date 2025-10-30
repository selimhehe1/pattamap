/**
 * Slugify utilities for SEO-friendly URLs
 *
 * Generates URL-safe slugs from establishment/employee names
 * for better SEO and user experience.
 *
 * Examples:
 * - "Cockatoo Bar" → "cockatoo-bar"
 * - "Walking Street Ä 1" → "walking-street-a-1"
 * - "Soi 6 Beer Bar" → "soi-6-beer-bar"
 */

/**
 * Convert a string to a URL-safe slug
 *
 * Features:
 * - Lowercase
 * - Replace spaces with hyphens
 * - Remove special characters
 * - Handle accents/diacritics
 * - Trim hyphens from start/end
 * - Collapse multiple hyphens
 *
 * @param text - Text to slugify
 * @returns URL-safe slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Remove accents/diacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove all non-word chars (except hyphens and numbers)
    .replace(/[^\w\-0-9]+/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/--+/g, '-')
    // Remove hyphens from start/end
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Generate slug for an establishment
 *
 * Format: zone-name (e.g., "soi-6-cockatoo-bar")
 *
 * @param name - Establishment name
 * @param zone - Zone identifier (optional, for uniqueness)
 * @returns Slug for establishment
 */
export function generateEstablishmentSlug(
  name: string,
  zone?: string
): string {
  const nameSlug = slugify(name);

  if (zone) {
    const zoneSlug = slugify(zone);
    return `${zoneSlug}-${nameSlug}`;
  }

  return nameSlug;
}

/**
 * Generate slug for an employee
 *
 * Format: name-nationality (e.g., "sophia-thai")
 *
 * @param name - Employee name
 * @param nationality - Employee nationality (optional, for uniqueness)
 * @returns Slug for employee
 */
export function generateEmployeeSlug(
  name: string,
  nationality?: string
): string {
  const nameSlug = slugify(name);

  if (nationality) {
    const nationalitySlug = slugify(nationality);
    return `${nameSlug}-${nationalitySlug}`;
  }

  return nameSlug;
}

/**
 * Generate full establishment URL path
 *
 * Format: /bar/{zone}/{slug}
 * Example: /bar/soi-6/cockatoo-bar
 *
 * @param id - Establishment ID (for database lookup)
 * @param name - Establishment name
 * @param zone - Zone identifier
 * @returns Full URL path
 */
export function generateEstablishmentUrl(
  id: string,
  name: string,
  zone: string
): string {
  const slug = slugify(name);
  const zoneSlug = slugify(zone);

  // Include full UUID for reliable database lookup
  // Format: /bar/{zone}/{slug}-{uuid}
  return `/bar/${zoneSlug}/${slug}-${id}`;
}

/**
 * Parse establishment URL to extract ID
 *
 * Extracts the UUID from a slug like "cockatoo-bar-d9f736dd-1234-5678-9abc-def012345678"
 *
 * @param slug - URL slug with embedded UUID
 * @returns Extracted UUID or null
 */
export function parseEstablishmentId(slug: string): string | null {
  // Format: {slug}-{uuid}
  // UUID pattern: 8-4-4-4-12 hexadecimal characters with hyphens
  // Example: d9f736dd-1234-5678-9abc-def012345678
  const uuidPattern = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
  const match = slug.match(uuidPattern);

  return match ? match[1] : null;
}

/**
 * Check if two slugs are similar enough to be considered duplicates
 *
 * Useful for detecting slug collisions
 *
 * @param slug1 - First slug
 * @param slug2 - Second slug
 * @returns True if slugs are similar
 */
export function areSlugsSimil(slug1: string, slug2: string): boolean {
  return slugify(slug1) === slugify(slug2);
}

/**
 * Ensure slug uniqueness by appending number if needed
 *
 * @param slug - Base slug
 * @param existingSlugs - Array of existing slugs to check against
 * @returns Unique slug (may have number appended)
 */
export function ensureUniqueSlug(
  slug: string,
  existingSlugs: string[]
): string {
  let uniqueSlug = slug;
  let counter = 1;

  while (existingSlugs.includes(uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
}

/**
 * Zone name mappings for pretty URLs
 */
export const ZONE_SLUG_MAP: Record<string, string> = {
  soi6: 'soi-6',
  walkingstreet: 'walking-street',
  boyztown: 'boyz-town',
  treetown: 'tree-town',
  soibuakhao: 'soi-buakhao',
  beachroad: 'beach-road',
  lkmetro: 'lk-metro',
  soi78: 'soi-7-8',
  jomtiencomplex: 'jomtien-complex'
};

/**
 * Get pretty zone slug from zone identifier
 *
 * @param zone - Zone identifier (e.g., "walkingstreet")
 * @returns Pretty slug (e.g., "walking-street")
 */
export function getZoneSlug(zone: string): string {
  return ZONE_SLUG_MAP[zone.toLowerCase()] || slugify(zone);
}

/**
 * Get zone identifier from slug
 *
 * @param slug - Zone slug (e.g., "walking-street")
 * @returns Zone identifier (e.g., "walkingstreet")
 */
export function getZoneFromSlug(slug: string): string | null {
  const normalized = slugify(slug);

  for (const [zoneId, zoneSlug] of Object.entries(ZONE_SLUG_MAP)) {
    if (slugify(zoneSlug) === normalized) {
      return zoneId;
    }
  }

  return null;
}

/**
 * Validate slug format
 *
 * Checks if slug follows correct format rules
 *
 * @param slug - Slug to validate
 * @returns True if slug is valid
 */
export function isValidSlug(slug: string): boolean {
  // Slug must be:
  // - lowercase
  // - contain only letters, numbers, and hyphens
  // - not start/end with hyphen
  // - 2-100 characters
  const slugRegex = /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/;

  return slugRegex.test(slug);
}
