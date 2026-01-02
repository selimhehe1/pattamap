/**
 * Employee Search Helpers
 *
 * Helper functions for advanced employee search.
 * Extracted from employeeSearchController.ts to reduce complexity.
 */

import { supabase } from '../config/supabase';
import { logger } from './logger';
import { escapeLikeWildcards } from './validation';

// ========================================
// TYPES
// ========================================

export interface SearchParams {
  searchQuery: string | null;
  type: string | null;
  sex: string | null; // v10.x - Gender filter
  nationality: string | null;
  ageMin: number | null;
  ageMax: number | null;
  zone: string | null;
  normalizedZoneFilter: string | null;
  establishmentId: string | null;
  categoryId: number | null;
  isVerified: boolean;
  sortBy: string;
  sortOrder: string;
  page: number;
  limit: number;
  offset: number;
  languages: string | null;
  minRating: number | null;
  hasPhotos: boolean;
  socialMedia: string | null;
}

export interface AvailableFilters {
  availableNationalities: string[];
  availableZones: string[];
  availableEstablishments: Array<{ id: string; name: string; zone: string | null }>;
  availableCategories: Array<{ id: number; name: string; icon: string | null }>;
}

// ========================================
// PARSE SEARCH PARAMS
// ========================================

/**
 * Parse and validate query parameters for employee search
 */
export function parseSearchParams(query: Record<string, unknown>): SearchParams {
  const {
    q: searchQuery,
    type,
    sex, // v10.x - Gender filter
    nationality,
    age_min,
    age_max,
    zone,
    establishment_id,
    category_id,
    is_verified,
    sort_by = 'relevance',
    sort_order = 'desc',
    page: rawPage = 1,
    limit: rawLimit = 20,
    languages,
    min_rating,
    has_photos,
    social_media
  } = query;

  // Validate and sanitize pagination
  const page = Math.max(1, Number(rawPage) || 1);
  const limit = Math.min(100, Math.max(1, Number(rawLimit) || 20));
  const offset = (page - 1) * limit;

  // Normalize zone filter
  let normalizedZoneFilter: string | null = null;
  if (zone) {
    normalizedZoneFilter = String(zone).toLowerCase().replace(/\s+/g, '');
  }

  return {
    searchQuery: searchQuery ? String(searchQuery).trim() : null,
    type: type ? String(type) : null,
    sex: sex ? String(sex) : null, // v10.x - Gender filter
    nationality: nationality ? String(nationality) : null,
    ageMin: age_min ? Number(age_min) : null,
    ageMax: age_max ? Number(age_max) : null,
    zone: zone ? String(zone) : null,
    normalizedZoneFilter,
    establishmentId: establishment_id ? String(establishment_id) : null,
    categoryId: category_id ? Number(category_id) : null,
    isVerified: is_verified === 'true',
    sortBy: String(sort_by),
    sortOrder: String(sort_order),
    page,
    limit,
    offset,
    languages: languages ? String(languages) : null,
    minRating: min_rating ? Number(min_rating) : null,
    hasPhotos: has_photos === 'true',
    socialMedia: social_media ? String(social_media) : null
  };
}

// ========================================
// BUILD EMPLOYEE SEARCH QUERY
// ========================================

/**
 * Build and execute the Supabase query for employee search
 */
export async function buildEmployeeSearchQuery(params: SearchParams) {
  let query = supabase
    .from('employees')
    .select(`
      *,
      current_employment:employment_history!left(
        *,
        establishment:establishments(
          *,
          category:establishment_categories(*)
        )
      ),
      independent_position:independent_positions!left(*)
    `)
    .eq('status', 'approved');

  // Text search with wildcards escaped
  if (params.searchQuery) {
    const searchTerm = escapeLikeWildcards(params.searchQuery);
    query = query.or(
      `name.ilike.%${searchTerm}%,nickname.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
    );
  }

  // Sex/Gender filter
  if (params.sex) {
    query = query.eq('sex', params.sex);
  }

  // Nationality filter (array contains)
  if (params.nationality) {
    query = query.contains('nationality', [params.nationality]);
  }

  // Age range filter
  if (params.ageMin) {
    query = query.gte('age', params.ageMin);
  }
  if (params.ageMax) {
    query = query.lte('age', params.ageMax);
  }

  // Verified filter
  if (params.isVerified) {
    query = query.eq('is_verified', true);
  }

  // VIP-first ordering
  query = query.order('is_vip', { ascending: false, nullsFirst: false });

  // Base sorting (before popularity calculations)
  if (params.sortBy !== 'popularity' && params.sortBy !== 'relevance') {
    switch (params.sortBy) {
      case 'name':
        query = query.order('name', { ascending: params.sortOrder === 'asc' });
        break;
      case 'age':
        query = query.order('age', { ascending: params.sortOrder === 'asc', nullsFirst: false });
        break;
      case 'nationality':
        query = query.order('nationality', { ascending: params.sortOrder === 'asc', nullsFirst: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
    }
  }

  return query;
}

// ========================================
// COMPILE AVAILABLE FILTERS
// ========================================

/**
 * Fetch available filter options (nationalities, zones, establishments, categories)
 */
export async function compileAvailableFilters(): Promise<AvailableFilters> {
  const [
    nationalitiesResult,
    zonesResult,
    establishmentsResult,
    categoriesResult
  ] = await Promise.all([
    supabase
      .from('employees')
      .select('nationality')
      .eq('status', 'approved')
      .not('nationality', 'is', null),
    supabase
      .from('establishments')
      .select('zone')
      .not('zone', 'is', null),
    supabase
      .from('establishments')
      .select('id, name, zone')
      .eq('status', 'approved')
      .order('name'),
    supabase
      .from('establishment_categories')
      .select('id, name, icon')
      .order('name')
  ]);

  // Flatten nationality arrays and get unique values
  const availableNationalities = Array.from(new Set(
    nationalitiesResult.data?.flatMap(n =>
      Array.isArray(n.nationality) ? n.nationality : []
    ).filter(Boolean) || []
  )).sort();

  // Get available zones (normalized)
  const availableZones = Array.from(new Set(
    zonesResult.data?.map(z =>
      z.zone?.toLowerCase().replace(/\s+/g, '')
    ).filter(Boolean) || []
  )).sort();

  // Establishments and categories
  const availableEstablishments = establishmentsResult.data || [];
  const availableCategories = categoriesResult.data || [];

  logger.debug(`📊 Available filters: ${availableNationalities.length} nationalities, ${availableZones.length} zones`);

  return {
    availableNationalities,
    availableZones,
    availableEstablishments,
    availableCategories
  };
}
