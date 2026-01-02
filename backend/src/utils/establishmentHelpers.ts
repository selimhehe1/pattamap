/**
 * Establishment Helper Functions
 *
 * Extracted from establishmentController.ts to reduce complexity
 */

import { logger } from './logger';
import { supabase } from '../config/supabase';

// Database types for establishment queries
export interface DbEstablishmentWithLocation {
  id: string;
  name: string;
  address: string;
  zone: string;
  grid_row?: number;
  grid_col?: number;
  category_id: number;
  description?: string;
  phone?: string;
  website?: string;
  location?: string;
  opening_hours?: Record<string, unknown>;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  logo_url?: string;
  is_vip?: boolean;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  category?: { id: number; name: string }[];
}

interface EmploymentRecord {
  establishment_id: string;
  employees?: { status: string }[];
}

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

/**
 * Fetch employee counts for establishments
 */
export async function fetchEmployeeCounts(establishmentIds: string[]): Promise<{
  total: { [key: string]: number };
  approved: { [key: string]: number };
}> {
  const employeeCounts: { [key: string]: number } = {};
  const approvedEmployeeCounts: { [key: string]: number } = {};

  const { data: employmentData, error: employmentError } = await supabase
    .from('employment_history')
    .select('establishment_id, employees(status)')
    .in('establishment_id', establishmentIds)
    .eq('is_current', true);

  if (!employmentError && employmentData) {
    employmentData.forEach((emp: EmploymentRecord) => {
      const estId = emp.establishment_id;
      employeeCounts[estId] = (employeeCounts[estId] || 0) + 1;

      const employeeStatus = Array.isArray(emp.employees)
        ? emp.employees[0]?.status
        : (emp.employees as { status: string } | undefined)?.status;
      if (employeeStatus === 'approved') {
        approvedEmployeeCounts[estId] = (approvedEmployeeCounts[estId] || 0) + 1;
      }
    });
  }

  return { total: employeeCounts, approved: approvedEmployeeCounts };
}

/**
 * Fetch ownership map for establishments
 */
export async function fetchOwnershipMap(establishmentIds: string[]): Promise<{ [key: string]: boolean }> {
  const ownerMap: { [key: string]: boolean } = {};

  const { data: ownerData } = await supabase
    .from('establishment_owners')
    .select('establishment_id')
    .in('establishment_id', establishmentIds);

  if (ownerData) {
    ownerData.forEach((owner: { establishment_id: string }) => {
      ownerMap[owner.establishment_id] = true;
    });
  }

  return ownerMap;
}

/**
 * Map establishments with coordinates and extra data
 */
export function mapEstablishmentsWithExtras(
  establishments: DbEstablishmentWithLocation[],
  employeeCounts: { [key: string]: number },
  approvedCounts: { [key: string]: number },
  ownerMap: { [key: string]: boolean }
) {
  return establishments.map((est: DbEstablishmentWithLocation) => {
    let latitude = null;
    let longitude = null;

    if (est.location) {
      const coords = parsePostGISBinary(est.location, est.id);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }

    return {
      ...est,
      latitude,
      longitude,
      employee_count: employeeCounts[est.id] || 0,
      approved_employee_count: approvedCounts[est.id] || 0,
      has_owner: !!ownerMap[est.id]
    };
  });
}
