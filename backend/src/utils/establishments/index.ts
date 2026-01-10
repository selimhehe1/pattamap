/**
 * Establishments Module
 *
 * Centralized establishment helper functions for PattaMap
 *
 * Structure:
 * - types.ts:       Type definitions, interfaces, and constants
 * - coordinates.ts: Coordinate validation, parsing, PostGIS functions
 * - queries.ts:     Database fetching functions
 * - mutations.ts:   Mutation helpers (consumables, permissions)
 */

// Types and constants
export {
  DbEstablishmentWithLocation,
  EmploymentRecord,
  ConsumableInput,
  EstablishmentConsumableWithTemplate,
  EmployeeFromQuery,
  PATTAYA_BOUNDS,
  ZONE_COORDINATES,
  DEFAULT_COORDINATES
} from './types';

// Coordinates
export {
  validateCoordinates,
  getEstablishmentCoordinates,
  createLocationPoint,
  parsePostGISBinary
} from './coordinates';

// Queries
export {
  fetchEmployeeCounts,
  fetchOwnershipMap,
  mapEstablishmentsWithExtras,
  fetchNightclubFreelances,
  fetchFormattedConsumables
} from './queries';

// Mutations
export {
  checkOwnerPermissions,
  updateEstablishmentConsumables
} from './mutations';
