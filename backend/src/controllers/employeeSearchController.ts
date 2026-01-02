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
import {
  parseSearchParams,
  buildEmployeeSearchQuery,
  compileAvailableFilters
} from '../utils/employeeSearchHelpers';

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
    // 1. Parse and validate all query parameters
    const params = parseSearchParams(req.query as Record<string, unknown>);

    // 2. Build and execute the database query
    const query = await buildEmployeeSearchQuery(params);
    const { data: allEmployees, error } = await query;

    if (error) {
      throw BadRequestError(error.message);
    }

    // 3. Apply post-query filters (type, category, zone, languages, photos, social media)
    const filteredEmployees = applySearchFilters(allEmployees || [], {
      type: params.type || undefined,
      category_id: params.categoryId || undefined,
      establishment_id: params.establishmentId || undefined,
      normalizedZoneFilter: params.normalizedZoneFilter,
      languages: params.languages || undefined,
      has_photos: params.hasPhotos ? 'true' : undefined,
      social_media: params.socialMedia || undefined
    });

    logger.debug(`📊 Filtered ${filteredEmployees.length} employees from ${allEmployees?.length || 0} total`);

    // 4. Apply min rating filter if specified
    let employeesToProcess = filteredEmployees;
    let totalFiltered = filteredEmployees.length;

    if (params.minRating && params.minRating > 0) {
      const { filtered } = await filterByMinRating(filteredEmployees, params.minRating);
      employeesToProcess = filtered;
      totalFiltered = filtered.length;
      logger.debug(`📊 After min_rating filter (>=${params.minRating}): ${totalFiltered} employees`);
    }

    // 5. Apply pagination
    const employees = employeesToProcess.slice(params.offset, params.offset + params.limit);

    // 6. Enrich with ratings and votes
    const employeeIds = employees?.map(emp => emp.id) || [];
    const { ratingsData, votesData } = await fetchEmployeeRatingsAndVotes(employeeIds);

    const enrichedEmployees = enrichEmployeesForSearch(
      employees || [],
      ratingsData,
      votesData,
      params.searchQuery || undefined
    );

    // 7. Apply final sorting
    const sortedEmployees = applySorting(enrichedEmployees, params.sortBy, params.sortOrder);

    // 8. Get available filter options (parallel queries)
    const availableFilters = await compileAvailableFilters();

    // 9. Build and send response
    res.json({
      employees: sortedEmployees,
      total: totalFiltered,
      page: params.page,
      limit: params.limit,
      hasMore: params.offset + params.limit < totalFiltered,
      filters: {
        ...availableFilters,
        searchQuery: params.searchQuery,
        appliedFilters: {
          nationality: params.nationality,
          age_min: params.ageMin,
          age_max: params.ageMax,
          zone: params.zone,
          establishment_id: params.establishmentId,
          category_id: params.categoryId
        }
      },
      sorting: {
        sort_by: params.sortBy,
        sort_order: params.sortOrder,
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
