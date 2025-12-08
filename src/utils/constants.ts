/**
 * Application-wide constants
 * Centralized configuration for zones and other constants
 */


/**
 * Zone options for dropdowns/selects
 * Uses zoneConfig as source of truth
 */
export interface ZoneOption {
  value: string;
  label: string;
}

export const ZONE_OPTIONS: ZoneOption[] = [
  { value: 'soi6', label: 'Soi 6' },
  { value: 'walkingstreet', label: 'Walking Street' },
  { value: 'lkmetro', label: 'LK Metro' },
  { value: 'treetown', label: 'Tree Town' },
  { value: 'soibuakhao', label: 'Soi Buakhao' },
  { value: 'jomtiencomplex', label: 'Jomtien Complex' },
  { value: 'boyztown', label: 'BoyzTown' },
  { value: 'soi78', label: 'Soi 7 & 8' },
  { value: 'beachroad', label: 'Beach Road' }
];

/**
 * Get zone display name from zone key
 */
export const getZoneLabel = (zoneValue: string): string => {
  const zone = ZONE_OPTIONS.find(z => z.value === zoneValue);
  return zone?.label || zoneValue;
};

/**
 * Validate if a zone value is valid
 */
export const isValidZone = (zoneValue: string): boolean => {
  return ZONE_OPTIONS.some(z => z.value === zoneValue);
};

/**
 * Get all zone values
 */
export const getAllZoneValues = (): string[] => {
  return ZONE_OPTIONS.map(z => z.value);
};

/**
 * Map configuration constants
 * Unified dimensions for all zone maps to ensure consistent UX
 */
export const MAP_CONFIG = {
  DEFAULT_HEIGHT: 600,  // Unified fallback height for all maps (px)
  MIN_HEIGHT: 400,      // Minimum height for mobile devices (px)
  MAX_HEIGHT: 800       // Maximum height for desktop (px)
} as const;
