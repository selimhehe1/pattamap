/**
 * Zone Configuration System
 * Extensible configuration for grid dimensions by zone
 * Allows easy modification from 15x2 to 20x2 or any other dimensions
 */

import { logger } from './logger';

export interface ZoneGridConfig {
  maxRows: number;
  maxCols: number;
  startX: number; // Starting X percentage
  endX: number;   // Ending X percentage
  startY: number; // Starting Y percentage for row 1
  endY: number;   // Ending Y percentage for last row
  name: string;
  description: string;
}

// 🎯 EXTENSIBLE ZONE CONFIGURATIONS
export const ZONE_GRID_CONFIGS: Record<string, ZoneGridConfig> = {
  soi6: {
    maxRows: 2,
    maxCols: 20,
    startX: 5,   // 5% from left (plus d'espace pour 20 colonnes)
    endX: 95,    // 95% to right (90% total width utilisé)
    startY: 25,  // Row 1 at 25% (Second Road side - closer to road)
    endY: 75,    // Row 2 at 75% (Beach Road side - closer to road)
    name: 'Soi 6',
    description: 'North Pattaya nightlife district'
  },
  walkingstreet: {
    maxRows: 30,   // 2 rows (main WS) + 28 rows (perpendicular streets: 6+2+2+6+6+6)
    maxCols: 24,   // Main Walking Street uses 24 cols, perpendicular streets use col=1
    startX: 20,    // More margin for vertical main road
    endX: 80,      // Symmetric
    startY: 5,     // Start from top (5% margin)
    endY: 95,      // End at bottom (5% margin) - maximize vertical space
    name: 'Walking Street',
    description: 'Rows 1-2: Main Walking Street × 24 cols = 48 positions | Rows 3-8: Diamond (3×2 = 6) | 9-10: Republic (1×2 = 2) | 11-12: Myst (1×2 = 2) | 13-18: Soi 15 (3×2 = 6) | 19-24: Soi 16 (3×2 = 6) | 25-30: BJ Alley (3×2 = 6) | Total: 76 positions'
  },
  lkmetro: {
    maxRows: 4,
    maxCols: 9,   // Max 9 cols (with masked positions at junction)
    startX: 25,   // Horizontal segment starts at 25%
    endX: 90,     // Extends to 90% to accommodate vertical segment
    startY: 30,   // Top margin aligned with junction
    endY: 90,     // Bottom margin for vertical segment
    name: 'LK Metro',
    description: 'L-shaped nightlife area - Masked positions at junction: Row 1 (9 cols) + Row 2 (8 cols, mask 9) + Row 3 (7 cols, mask 1-2) + Row 4 (9 cols) = 33 positions total'
  },
  treetown: {
    maxRows: 14,  // Rows 1-2: horizontal (10 cols), 3-8: left vertical (2 cols), 9-14: right vertical (2 cols)
    maxCols: 10,  // Max 10 columns for horizontal main street
    startX: 15,
    endX: 85,
    startY: 10,
    endY: 90,
    name: 'Tree Town',
    description: 'U-shaped layout: Horizontal (18, masked 2,1 & 2,10) + Left vertical (12) + Right vertical (12) = 42 positions'
  },
  soibuakhao: {
    maxRows: 2,
    maxCols: 18,
    startX: 5,
    endX: 95,
    startY: 12,
    endY: 23,
    name: 'Soi Buakhao',
    description: '1.7km vertical street (South Pattaya → Central Pattaya) with intersections: Soi Lengkee, Soi Diana (LK Metro), Soi Honey, Tree Town'
  },
  beachroad: {
    maxRows: 2,
    maxCols: 40,
    startX: 5,
    endX: 95,
    startY: 12,
    endY: 23,
    name: 'Beach Road',
    description: 'Beachfront strip from North to South Pattaya with major intersections: Soi 6, Soi 7/8, Central Pattaya, Pattayaland, Boyztown, Walking Street'
  }
};

/**
 * Get configuration for a specific zone
 */
export const getZoneConfig = (zone: string): ZoneGridConfig => {
  return ZONE_GRID_CONFIGS[zone] || ZONE_GRID_CONFIGS.soi6; // Default to soi6
};

/**
 * Calculate column spacing for a zone
 */
export const getColumnSpacing = (zone: string): number => {
  const config = getZoneConfig(zone);
  const totalWidth = config.endX - config.startX;
  return totalWidth / (config.maxCols - 1);
};

/**
 * Calculate row spacing for a zone
 */
export const getRowSpacing = (zone: string): number => {
  const config = getZoneConfig(zone);
  const totalHeight = config.endY - config.startY;
  return config.maxRows === 1 ? 0 : totalHeight / (config.maxRows - 1);
};

/**
 * Validate if a grid position is within zone bounds
 */
export const isValidGridPosition = (zone: string, row: number, col: number): boolean => {
  const config = getZoneConfig(zone);
  return row >= 1 && row <= config.maxRows && col >= 1 && col <= config.maxCols;
};

/**
 * Get all valid column numbers for a zone (for TypeScript union types)
 */
export const getValidColumns = (zone: string): number[] => {
  const config = getZoneConfig(zone);
  return Array.from({ length: config.maxCols }, (_, i) => i + 1);
};

/**
 * Get all valid row numbers for a zone
 */
export const getValidRows = (zone: string): number[] => {
  const config = getZoneConfig(zone);
  return Array.from({ length: config.maxRows }, (_, i) => i + 1);
};

/**
 * Get human-readable zone info
 */
export const getZoneInfo = (zone: string) => {
  const config = getZoneConfig(zone);
  return {
    name: config.name,
    description: config.description,
    dimensions: `${config.maxCols}×${config.maxRows}`,
    totalPositions: config.maxCols * config.maxRows
  };
};

/**
 * Debug: Log all zone configurations
 */
export const debugZoneConfigs = () => {
  logger.debug('🗺️ ZONE CONFIGURATIONS:');
  Object.entries(ZONE_GRID_CONFIGS).forEach(([zoneKey, config]) => {
    logger.debug(`  ${zoneKey.toUpperCase()}: ${config.maxCols}×${config.maxRows} grid (${config.maxCols * config.maxRows} positions)`);
    logger.debug(`    Layout: ${config.startX}%-${config.endX}% × ${config.startY}%-${config.endY}%`);
    logger.debug(`    Description: ${config.description}`);
  });
};