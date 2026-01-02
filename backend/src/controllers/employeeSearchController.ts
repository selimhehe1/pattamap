/**
 * Employee Search Controller
 *
 * Handles employee search and autocomplete functionality.
 * Extracted from employeeController.ts to reduce complexity.
 */

import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { escapeLikeWildcards } from '../utils/validation';
import { asyncHandler, BadRequestError } from '../middleware/asyncHandler';
import {
  fetchEmployeeRatingsAndVotes,
  applySorting,
  applySearchFilters,
  filterByMinRating,
  enrichEmployeesForSearch
} from '../utils/employeeHelpers';

// 🚀 Cache in-memory simple pour suggestions
interface CacheEntry {
  suggestions: string[];
  timestamp: number;
}

const suggestionCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL
const MAX_CACHE_SIZE = 1000; // 🔧 FIX S2: Limit cache size to prevent memory leak

/**
 * 🔧 FIX S2: Simple LRU eviction - removes oldest entries when cache is full
 */
const evictOldestCacheEntries = () => {
  if (suggestionCache.size <= MAX_CACHE_SIZE) return;

  // Convert to array, sort by timestamp, keep only newest MAX_CACHE_SIZE entries
  const entries = Array.from(suggestionCache.entries())
    .sort((a, b) => b[1].timestamp - a[1].timestamp) // newest first
    .slice(0, MAX_CACHE_SIZE);

  suggestionCache.clear();
  entries.forEach(([key, value]) => suggestionCache.set(key, value));

  logger.debug(`🧹 Cache eviction: reduced to ${suggestionCache.size} entries`);
};

/**
 * Get employee name suggestions for autocomplete
 * GET /api/employees/suggestions?q=search_term
 */
export const getEmployeeNameSuggestions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { q } = req.query;
    logger.debug(`🔍 Autocomplete request: "${q}"`); // Debug log

    if (!q || typeof q !== 'string' || q.length < 1) {
      res.json({ suggestions: [] });
      return;
    }

    const searchTerm = q.trim().toLowerCase();
    const cacheKey = searchTerm;

    // 🔍 Check cache first
    const cached = suggestionCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      logger.debug(`📦 Cache HIT for "${searchTerm}"`);
      res.json({ suggestions: cached.suggestions });
      return;
    }

    logger.debug(`🔍 Cache MISS for "${searchTerm}" - Fetching from DB`);

    // 🚀 Méthode optimisée Supabase avec double requête parallèle
    // 🔧 FIX S1: Escape LIKE wildcards to prevent pattern injection
    const escapedSearchTerm = escapeLikeWildcards(searchTerm);
    const [namesQuery, nicknamesQuery] = await Promise.all([
      supabase
        .from('employees')
        .select('name')
        .eq('status', 'approved')
        .like('name', `%${escapedSearchTerm}%`)
        .not('name', 'is', null)
        .limit(8),
      supabase
        .from('employees')
        .select('nickname')
        .eq('status', 'approved')
        .like('nickname', `%${escapedSearchTerm}%`)
        .not('nickname', 'is', null)
        .limit(8)
    ]);

    if (namesQuery.error || nicknamesQuery.error) {
      logger.error('🔍 Query errors:', {
        namesError: namesQuery.error,
        nicknamesError: nicknamesQuery.error
      });
      throw BadRequestError(namesQuery.error?.message || nicknamesQuery.error?.message || 'Query error');
    }

    logger.debug(`🔍 Query results for "${searchTerm}":`, {
      namesData: namesQuery.data,
      nicknamesData: nicknamesQuery.data,
      namesCount: namesQuery.data?.length || 0,
      nicknamesCount: nicknamesQuery.data?.length || 0
    });

    // Collecte optimisée des suggestions uniques
    const suggestions = new Set<string>();

    // Ajouter noms
    namesQuery.data?.forEach(emp => {
      if (emp.name) suggestions.add(emp.name);
    });

    // Ajouter nicknames
    nicknamesQuery.data?.forEach(emp => {
      if (emp.nickname) suggestions.add(emp.nickname);
    });

    // Tri intelligent avec priorité aux matches exacts
    const sortedSuggestions: string[] = Array.from(suggestions)
      .sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aExact = aLower.startsWith(searchTerm);
        const bExact = bLower.startsWith(searchTerm);

        // Priorité 1: Match exact au début
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Priorité 2: Alphabétique
        return a.localeCompare(b);
      })
      .slice(0, 10);

    // 📦 Cache les résultats
    const finalSuggestions = sortedSuggestions;
    suggestionCache.set(cacheKey, {
      suggestions: finalSuggestions,
      timestamp: Date.now()
    });

    // 🔧 FIX S2: Evict old entries if cache is full
    evictOldestCacheEntries();

    logger.debug(`✅ Returning ${finalSuggestions.length} suggestions for "${searchTerm}"`);
    res.json({ suggestions: finalSuggestions });
});

/**
 * Advanced employee search with filters
 * GET /api/employees/search
 */
export const searchEmployees = asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      q: searchQuery,
      type, // 🆕 v10.3 - Employee type filter (all/freelance/regular)
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
      // 🆕 v11.0 - Advanced filters
      languages,      // Comma-separated: "Thai,English"
      min_rating,     // "1"-"5" minimum average rating
      has_photos,     // "true" - filter employees with photos
      social_media    // Comma-separated: "instagram,line,whatsapp"
    } = req.query;

    // 🔧 FIX S3: Validate and sanitize pagination parameters
    const page = Math.max(1, Number(rawPage) || 1);
    const limit = Math.min(100, Math.max(1, Number(rawLimit) || 20));

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // If zone filter is provided, filter will be applied after query (to include freelances)
    let normalizedZoneFilter: string | null = null;
    if (zone) {
      // Normalize zone for search: remove spaces and lowercase
      normalizedZoneFilter = String(zone).toLowerCase().replace(/\s+/g, '');
    }

    // Query to get all employees (with establishments or freelance)
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

    // Text search with ranking
    // 🔧 FIX S1: Escape LIKE wildcards to prevent pattern injection
    if (searchQuery) {
      const searchTerm = escapeLikeWildcards(String(searchQuery).trim());

      // Use full-text search for better relevance
      // NOTE v10.4: Nationality removed from full-text search (now TEXT[] array)
      // Exact nationality match available via nationality filter parameter below
      query = query.or(
        `name.ilike.%${searchTerm}%,nickname.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
      );
    }

    // Nationality filter (exact match in array)
    // v10.4: Nationality is now TEXT[] array, use contains operator for exact match
    if (nationality) {
      // Check if nationality array contains the specified value (case-sensitive exact match)
      query = query.contains('nationality', [nationality]);
    }

    // Age range filter
    if (age_min) {
      query = query.gte('age', Number(age_min));
    }
    if (age_max) {
      query = query.lte('age', Number(age_max));
    }

    // Verified filter (v10.3)
    if (is_verified === 'true') {
      query = query.eq('is_verified', true);
    }

    // Note: establishment_id, category_id, and zone filters are applied after query
    // to properly handle freelances (who don't have employment_history)

    // VIP-first ordering - VIP employees ALWAYS appear first (v10.3 Phase 4)
    query = query.order('is_vip', { ascending: false, nullsFirst: false });

    // Base sorting (before popularity calculations)
    if (sort_by !== 'popularity' && sort_by !== 'relevance') {
      switch (sort_by) {
        case 'name':
          query = query.order('name', { ascending: sort_order === 'asc' });
          break;
        case 'age':
          query = query.order('age', {
            ascending: sort_order === 'asc',
            nullsFirst: false
          });
          break;
        case 'nationality':
          query = query.order('nationality', {
            ascending: sort_order === 'asc',
            nullsFirst: false
          });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
      }
    }

    // Execute query (without pagination yet - will filter and paginate manually)
    const { data: allEmployees, error } = await query;

    if (error) {
      throw BadRequestError(error.message);
    }

    // ✅ Filter employees using helper function
    const filteredEmployees = applySearchFilters(allEmployees || [], {
      type: type as string,
      category_id: category_id ? Number(category_id) : undefined,
      establishment_id: establishment_id as string,
      normalizedZoneFilter,
      languages: languages as string,
      has_photos: has_photos as string,
      social_media: social_media as string
    });

    logger.debug(`📊 Filtered ${filteredEmployees.length} employees from ${allEmployees?.length || 0} total`);

    // 🆕 v11.0 - Min rating filter using helper function
    let employeesToProcess = filteredEmployees;
    let totalFiltered = filteredEmployees.length;

    if (min_rating && Number(min_rating) > 0) {
      const { filtered } = await filterByMinRating(filteredEmployees, Number(min_rating));
      employeesToProcess = filtered;
      totalFiltered = filtered.length;
      logger.debug(`📊 After min_rating filter (>=${min_rating}): ${totalFiltered} employees`);
    }

    // Manual pagination (after min_rating filter if applied)
    const employees = employeesToProcess.slice(offset, offset + limit);

    // Get ratings and votes for current page using helper function
    const employeeIds = employees?.map(emp => emp.id) || [];
    const { ratingsData, votesData } = await fetchEmployeeRatingsAndVotes(employeeIds);

    // Enrich employees with ratings, votes, and relevance score using helper
    const enrichedEmployees = enrichEmployeesForSearch(
      employees || [],
      ratingsData,
      votesData,
      searchQuery as string | undefined
    );

    // Apply sorting using helper function
    const sortedEmployees = applySorting(
      enrichedEmployees,
      sort_by as string || 'relevance',
      sort_order as string || 'desc'
    );

    // Get available filters for suggestions - PARALLELIZED for performance
    // v10.4: Nationality is now TEXT[] array, flatten to get unique values
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
      nationalitiesResult.data?.flatMap(n => Array.isArray(n.nationality) ? n.nationality : []).filter(Boolean) || []
    )).sort();

    // Get available zones
    const availableZones = Array.from(new Set(
      zonesResult.data?.map(z => z.zone?.toLowerCase().replace(/\s+/g, '')).filter(Boolean) || []
    )).sort();

    // Get available establishments with zone info
    const availableEstablishments = establishmentsResult.data || [];

    // Get available categories
    const availableCategories = categoriesResult.data || [];

    // ========================================
    // BUG #10 FIX - Standardize response structure
    // ========================================
    // Use 'employees' (consistent with GET /api/employees) instead of 'data'
    res.json({
      employees: sortedEmployees,  // Standardized field name
      total: totalFiltered,
      page: Number(page),
      limit: Number(limit),
      hasMore: offset + Number(limit) < totalFiltered,
      filters: {
        availableNationalities,
        availableZones,
        availableEstablishments,
        availableCategories,
        searchQuery: searchQuery || null,
        appliedFilters: {
          nationality,
          age_min: age_min ? Number(age_min) : null,
          age_max: age_max ? Number(age_max) : null,
          zone,
          establishment_id,
          category_id
        }
      },
      sorting: {
        sort_by,
        sort_order,
        availableSorts: [
          { value: 'relevance', label: 'Most Relevant' },
          { value: 'popularity', label: 'Most Popular' },
          { value: 'newest', label: 'Newest' },
          { value: 'oldest', label: 'Oldest' },
          { value: 'name', label: 'Name A-Z' },
          { value: 'age', label: 'Age' },
          { value: 'nationality', label: 'Nationality' }
        ]
      }
    });
});
