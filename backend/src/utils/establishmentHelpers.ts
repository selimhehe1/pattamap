/**
 * Establishment Helper Functions
 *
 * Extracted from establishmentController.ts to reduce complexity
 */

import { logger } from './logger';

// Pattaya region bounds
const PATTAYA_BOUNDS = {
  lat: { min: 12.8, max: 13.1 },
  lng: { min: 100.8, max: 101.0 }
};

// Default zone coordinates
const ZONE_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  'Soi 6': { latitude: 12.9342, longitude: 100.8779 },
  'Walking Street': { latitude: 12.9278, longitude: 100.8701 },
  'LK Metro': { latitude: 12.9389, longitude: 100.8744 },
  'Treetown': { latitude: 12.9456, longitude: 100.8822 }
};

const DEFAULT_COORDINATES = { latitude: 12.9342, longitude: 100.8779 }; // Soi 6

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
