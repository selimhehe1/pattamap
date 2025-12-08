/**
 * Map Constants - Shared configuration for all zone maps
 *
 * Centralizes TYPE_STYLES and CATEGORY_TO_TYPE_MAP to avoid duplication
 * across CustomSoi6Map, CustomSoi78Map, CustomWalkingStreetMap, etc.
 */

/**
 * Visual styles for each establishment type
 * Used for bar colors, icons, and shadows on the map
 */
export const TYPE_STYLES = {
  gogo: { color: '#C19A6B', icon: '💃', shadow: 'rgba(193, 154, 107, 0.5)' },
  beer: { color: '#FFD700', icon: '🍺', shadow: 'rgba(255, 215, 0, 0.5)' },
  pub: { color: '#00E5FF', icon: '🍸', shadow: 'rgba(0, 255, 255, 0.5)' },
  massage: { color: '#06FFA5', icon: '💆', shadow: 'rgba(6, 255, 165, 0.5)' },
  nightclub: { color: '#7B2CBF', icon: '🎵', shadow: 'rgba(123, 44, 191, 0.5)' }
} as const;

/**
 * Bar type union
 */
export type BarType = keyof typeof TYPE_STYLES;

/**
 * Maps category IDs to bar types
 * Supports both legacy string format (cat-001) and Supabase numeric format
 */
export const CATEGORY_TO_TYPE_MAP: Record<string | number, BarType> = {
  // String keys (legacy format)
  'cat-001': 'beer',      // Bar
  'cat-002': 'gogo',      // GoGo Bar
  'cat-003': 'massage',   // Massage Salon
  'cat-004': 'nightclub', // Nightclub
  // Number keys (Supabase format)
  1: 'beer',              // Bar
  2: 'gogo',              // GoGo Bar
  3: 'massage',           // Massage Salon
  4: 'nightclub'          // Nightclub
};

/**
 * Default bar type when category is not found
 */
export const DEFAULT_BAR_TYPE: BarType = 'beer';

/**
 * Get bar type from category ID
 * @param categoryId - Category ID (string or number)
 * @returns Bar type
 */
export const getBarTypeFromCategory = (categoryId: string | number | undefined): BarType => {
  if (categoryId === undefined) return DEFAULT_BAR_TYPE;
  return CATEGORY_TO_TYPE_MAP[categoryId] || DEFAULT_BAR_TYPE;
};

/**
 * Get style for a bar type
 * @param barType - Bar type
 * @returns Style object with color, icon, and shadow
 */
export const getBarStyle = (barType: BarType) => {
  return TYPE_STYLES[barType] || TYPE_STYLES[DEFAULT_BAR_TYPE];
};

/**
 * Common Bar interface used across all map components
 */
export interface MapBar {
  id: string;
  name: string;
  type: BarType;
  position: { x: number; y: number };
  color: string;
  icon: string;
  grid_row?: number;
  grid_col?: number;
}
