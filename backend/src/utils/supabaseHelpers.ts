/**
 * Unwrap Supabase foreign key relations that may be returned as arrays.
 *
 * When using `.select('*, relation(*)')`, Supabase sometimes returns
 * the joined relation as a single-element array instead of an object.
 * This utility normalizes both cases to a single object.
 */
export function unwrapSupabaseRelation<T>(data: T | T[]): T {
  return Array.isArray(data) ? data[0] : data;
}
