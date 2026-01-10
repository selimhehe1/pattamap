/**
 * Establishment Coordinates
 *
 * Coordinate validation, parsing, and PostGIS functions
 */

import { logger } from '../logger';
import { PATTAYA_BOUNDS, ZONE_COORDINATES, DEFAULT_COORDINATES } from './types';

/**
 * Validate coordinates are within acceptable ranges
 */
export function validateCoordinates(
  latitude: unknown,
  longitude: unknown
): { valid: boolean; error?: string; lat?: number; lng?: number } {
  if (latitude === undefined && longitude === undefined) {
    return { valid: true }; // No coordinates provided is valid
  }

  const lat = parseFloat(String(latitude));
  const lng = parseFloat(String(longitude));

  // Validate latitude range (-90 to 90)
  if (isNaN(lat) || lat < -90 || lat > 90) {
    return { valid: false, error: 'Invalid latitude. Must be a number between -90 and 90' };
  }

  // Validate longitude range (-180 to 180)
  if (isNaN(lng) || lng < -180 || lng > 180) {
    return { valid: false, error: 'Invalid longitude. Must be a number between -180 and 180' };
  }

  // Validate Pattaya area
  if (lat < PATTAYA_BOUNDS.lat.min || lat > PATTAYA_BOUNDS.lat.max ||
      lng < PATTAYA_BOUNDS.lng.min || lng > PATTAYA_BOUNDS.lng.max) {
    logger.warn('Coordinates outside Pattaya region', { lat, lng });
    return {
      valid: false,
      error: `Coordinates are outside Pattaya region (${PATTAYA_BOUNDS.lat.min}-${PATTAYA_BOUNDS.lat.max} lat, ${PATTAYA_BOUNDS.lng.min}-${PATTAYA_BOUNDS.lng.max} lng)`
    };
  }

  return { valid: true, lat, lng };
}

/**
 * Get coordinates for a zone or use provided coordinates
 */
export function getEstablishmentCoordinates(
  zone: string,
  latitude?: unknown,
  longitude?: unknown
): { latitude: number; longitude: number } {
  if (latitude !== undefined && longitude !== undefined) {
    return {
      latitude: parseFloat(String(latitude)),
      longitude: parseFloat(String(longitude))
    };
  }

  return ZONE_COORDINATES[zone] || DEFAULT_COORDINATES;
}

/**
 * Create PostGIS location point string
 */
export function createLocationPoint(coords: { latitude: number; longitude: number }): string {
  return `POINT(${coords.longitude} ${coords.latitude})`;
}

/**
 * Convert hex string to little-endian IEEE 754 double
 */
function hexToFloat64LE(hex: string): number {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);

  // Parse hex string in little-endian order
  for (let i = 0; i < 8; i++) {
    const byteHex = hex.substr(i * 2, 2);
    const byte = parseInt(byteHex, 16);
    view.setUint8(i, byte);
  }

  return view.getFloat64(0, true); // true = little-endian
}

/**
 * Parse PostGIS binary format to coordinates
 */
export function parsePostGISBinary(hexString: string, establishmentId?: string): {latitude: number, longitude: number} | null {
  try {
    if (!hexString || typeof hexString !== 'string') {
      return null;
    }

    // PostGIS WKB format for POINT with SRID
    // Format: endianness(1) + type(4) + SRID(4) + point(16)
    if (!hexString.startsWith('0101000020E6100000')) {
      logger.warn('PostGIS: Unknown WKB format', {
        establishmentId,
        headerHex: hexString.substring(0, 18),
        expectedHeader: '0101000020E6100000'
      });
      return null;
    }

    // Skip the header (18 chars for SRID 4326) and extract coordinates
    const coordsHex = hexString.substring(18);

    if (coordsHex.length < 32) {
      logger.warn('PostGIS: Coordinates hex too short', {
        establishmentId,
        coordsLength: coordsHex.length,
        expectedMinLength: 32
      });
      return null;
    }

    // Each coordinate is 8 bytes (16 hex chars) in little-endian IEEE 754
    const lngHex = coordsHex.substring(0, 16);
    const latHex = coordsHex.substring(16, 32);

    const longitude = hexToFloat64LE(lngHex);
    const latitude = hexToFloat64LE(latHex);

    // Validate coordinates are in reasonable range
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      logger.warn('PostGIS: Coordinates out of valid range', {
        establishmentId,
        latitude,
        longitude
      });
      return null;
    }

    return { latitude, longitude };
  } catch (error) {
    logger.error('PostGIS: Exception during binary parsing', {
      establishmentId,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}
