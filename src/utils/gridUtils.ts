import { GridPosition, VisualPosition, Establishment } from '../types';
import { getZoneConfig, getColumnSpacing, getRowSpacing } from './zoneConfig';
import { logger } from './logger';

/**
 * Converts grid position (row, col) to visual position (x%, y%)
 * Uses extensible zone configuration system
 */
export const gridToVisualPosition = (gridPos: GridPosition, zone: string = 'soi6'): VisualPosition => {
  const { row, col } = gridPos;
  const config = getZoneConfig(zone);
  const colSpacing = getColumnSpacing(zone);
  const rowSpacing = getRowSpacing(zone);

  // Calculate X position based on zone config
  const x = config.startX + ((col - 1) * colSpacing);

  // Calculate Y position based on zone config
  const y = config.startY + ((row - 1) * rowSpacing);

  return { x, y };
};

/**
 * Converts visual position back to grid position
 * for reverse mapping or validation
 */
export const visualToGridPosition = (visualPos: VisualPosition, zone: string = 'soi6'): GridPosition | null => {
  const { x, y } = visualPos;
  const config = getZoneConfig(zone);
  const colSpacing = getColumnSpacing(zone);
  const rowSpacing = getRowSpacing(zone);

  logger.debug('🔄 visualToGridPosition:', {
    input: { x, y },
    config: { startX: config.startX, startY: config.startY, maxRows: config.maxRows, maxCols: config.maxCols },
    spacing: { colSpacing, rowSpacing }
  });

  // Determine row based on y position with improved logic
  let row = 1;
  let minDistance = Math.abs(y - config.startY);

  for (let r = 1; r <= config.maxRows; r++) {
    const rowY = config.startY + ((r - 1) * rowSpacing);
    const distance = Math.abs(y - rowY);
    logger.debug(`📐 Row ${r}: y=${rowY}, distance=${distance}`);
    if (distance < minDistance) {
      minDistance = distance;
      row = r;
    }
  }

  // Determine column based on x position with improved tolerance
  const colFloat = ((x - config.startX) / colSpacing) + 1;
  const col = Math.round(colFloat);

  logger.debug('📊 Column calculation:', {
    colFloat,
    roundedCol: col,
    formula: `((${x} - ${config.startX}) / ${colSpacing}) + 1 = ${colFloat}`
  });

  // Validate position range with tolerance
  const tolerance = 0.5; // Allow some tolerance for better UX
  if (row < 1 || row > config.maxRows || col < (1 - tolerance) || col > (config.maxCols + tolerance)) {
    logger.debug('❌ Position out of bounds:', { row, col, bounds: { maxRows: config.maxRows, maxCols: config.maxCols } });
    return null;
  }

  // Clamp column to valid range
  const clampedCol = Math.max(1, Math.min(config.maxCols, col));

  const result = { row: row as 1 | 2, col: clampedCol as GridPosition['col'] };
  logger.debug('✅ Final grid position:', result);

  return result;
};

/**
 * Gets next available grid position for new establishments
 */
export const getNextAvailableGridPosition = (
  existingEstablishments: Establishment[],
  zone: string
): GridPosition | null => {
  const config = getZoneConfig(zone);

  // Get all occupied positions for this zone
  const occupiedPositions = new Set<string>();

  existingEstablishments
    .filter(est => est.zone === zone && est.grid_row && est.grid_col)
    .forEach(est => {
      occupiedPositions.add(`${est.grid_row}-${est.grid_col}`);
    });

  // Find first available position (row by row)
  for (let row = 1; row <= config.maxRows; row++) {
    for (let col = 1; col <= config.maxCols; col++) {
      const posKey = `${row}-${col}`;
      if (!occupiedPositions.has(posKey)) {
        return { row: row as 1 | 2, col: col as GridPosition['col'] };
      }
    }
  }

  return null; // Grid is full
};

/**
 * Validates if a grid position is valid and available
 */
export const isValidGridPositionInZone = (
  gridPos: GridPosition,
  existingEstablishments: Establishment[],
  zone: string,
  excludeEstablishmentId?: string
): boolean => {
  const { row, col } = gridPos;
  const config = getZoneConfig(zone);

  // Check bounds
  if (row < 1 || row > config.maxRows || col < 1 || col > config.maxCols) {
    return false;
  }

  // Check if position is already occupied
  const isOccupied = existingEstablishments.some(est =>
    est.zone === zone &&
    est.grid_row === row &&
    est.grid_col === col &&
    est.id !== excludeEstablishmentId // Allow current establishment to keep its position
  );

  return !isOccupied;
};

/**
 * Maps establishment category to bar type for visual representation
 */
export const categoryToBarType = (categoryId: string | number): 'gogo' | 'beer' | 'pub' | 'nightclub' | 'massage' => {
  const categoryMap: { [key: string | number]: 'gogo' | 'beer' | 'pub' | 'nightclub' | 'massage' } = {
    // String keys (old format)
    'cat-001': 'beer',      // Bar
    'cat-002': 'gogo',      // GoGo Bar
    'cat-003': 'massage',   // Massage Salon
    'cat-004': 'nightclub', // Nightclub
    // Number keys (Supabase format) - Updated to match new schema
    1: 'beer',              // Bar
    2: 'gogo',              // GoGo Bar
    3: 'massage',           // Massage Salon
    4: 'nightclub'          // Nightclub
    // Removed: Beer Bar (5), Club (6), Restaurant Bar (7) - no longer in schema
  };

  return categoryMap[categoryId] || 'beer'; // Default fallback
};

/**
 * Gets the appropriate color and icon for a bar type
 */
export const getBarTypeStyle = (type: 'gogo' | 'beer' | 'pub' | 'nightclub' | 'massage') => {
  const typeStyles = {
    gogo: { color: '#FF1B8D', icon: '💃' },
    beer: { color: '#FFD700', icon: '🍺' },
    pub: { color: '#8B4513', icon: '👑' },
    nightclub: { color: '#9B5DE5', icon: '🎵' },
    massage: { color: '#00F5FF', icon: '💆' }
  };

  return typeStyles[type];
};

/**
 * Converts establishment to visual bar object for map rendering
 */
export const establishmentToVisualBar = (establishment: Establishment) => {
  const barType = categoryToBarType(establishment.category_id);
  const style = getBarTypeStyle(barType);
  const zone = establishment.zone || 'soi6';

  // Use grid position if available, otherwise fallback to legacy system
  let visualPosition: VisualPosition;

  if (establishment.grid_row && establishment.grid_col) {
    visualPosition = gridToVisualPosition({
      row: establishment.grid_row as 1 | 2,
      col: establishment.grid_col as GridPosition['col']
    }, zone);
  } else {
    // Fallback: auto-generate position based on zone config
    const config = getZoneConfig(zone);
    visualPosition = {
      x: config.startX + (config.endX - config.startX) / 2,
      y: config.startY + (config.endY - config.startY) / 2
    }; // Default center position for zone
  }

  return {
    id: establishment.id,
    name: establishment.name,
    type: barType,
    position: visualPosition, // Always defined by gridToVisualPosition or fallback
    color: style.color,
    icon: style.icon,
    description: establishment.description || 'Establishment from database',
    category: establishment.category
  };
};