/**
 * Employee Search Helpers Tests
 *
 * Tests for advanced employee search helper functions:
 * - parseSearchParams
 * - buildEmployeeSearchQuery
 * - compileAvailableFilters
 */

import {
  parseSearchParams,
  buildEmployeeSearchQuery,
  compileAvailableFilters,
  SearchParams
} from '../employeeSearchHelpers';
import { supabase } from '../../config/supabase';

// Mock dependencies
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

jest.mock('../validation', () => ({
  escapeLikeWildcards: jest.fn((str) => str.replace(/[%_\\]/g, '\\$&'))
}));

describe('Employee Search Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // parseSearchParams Tests
  // ========================================
  describe('parseSearchParams', () => {
    it('should return default values when no params provided', () => {
      const result = parseSearchParams({});

      expect(result).toEqual({
        searchQuery: null,
        type: null,
        nationality: null,
        ageMin: null,
        ageMax: null,
        zone: null,
        normalizedZoneFilter: null,
        establishmentId: null,
        categoryId: null,
        isVerified: false,
        sortBy: 'relevance',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
        offset: 0,
        languages: null,
        minRating: null,
        hasPhotos: false,
        socialMedia: null
      });
    });

    it('should parse search query', () => {
      const result = parseSearchParams({ q: '  test search  ' });

      expect(result.searchQuery).toBe('test search');
    });

    it('should parse type filter', () => {
      const result = parseSearchParams({ type: 'freelance' });

      expect(result.type).toBe('freelance');
    });

    it('should parse nationality filter', () => {
      const result = parseSearchParams({ nationality: 'Thai' });

      expect(result.nationality).toBe('Thai');
    });

    it('should parse age range filters', () => {
      const result = parseSearchParams({ age_min: '20', age_max: '30' });

      expect(result.ageMin).toBe(20);
      expect(result.ageMax).toBe(30);
    });

    it('should parse zone filter and normalize it', () => {
      const result = parseSearchParams({ zone: 'Soi 6' });

      expect(result.zone).toBe('Soi 6');
      expect(result.normalizedZoneFilter).toBe('soi6');
    });

    it('should parse establishment_id filter', () => {
      const result = parseSearchParams({ establishment_id: 'est-123' });

      expect(result.establishmentId).toBe('est-123');
    });

    it('should parse category_id filter', () => {
      const result = parseSearchParams({ category_id: '5' });

      expect(result.categoryId).toBe(5);
    });

    it('should parse is_verified filter', () => {
      const result = parseSearchParams({ is_verified: 'true' });

      expect(result.isVerified).toBe(true);
    });

    it('should not set isVerified for non-true values', () => {
      expect(parseSearchParams({ is_verified: 'false' }).isVerified).toBe(false);
      expect(parseSearchParams({ is_verified: '1' }).isVerified).toBe(false);
      expect(parseSearchParams({ is_verified: 'yes' }).isVerified).toBe(false);
    });

    it('should parse sort options', () => {
      const result = parseSearchParams({ sort_by: 'name', sort_order: 'asc' });

      expect(result.sortBy).toBe('name');
      expect(result.sortOrder).toBe('asc');
    });

    it('should parse pagination with valid values', () => {
      const result = parseSearchParams({ page: '3', limit: '50' });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(100); // (3-1) * 50
    });

    it('should enforce minimum page of 1', () => {
      const result = parseSearchParams({ page: '0' });

      expect(result.page).toBe(1);
      expect(result.offset).toBe(0);
    });

    it('should enforce minimum page of 1 for negative values', () => {
      const result = parseSearchParams({ page: '-5' });

      expect(result.page).toBe(1);
    });

    it('should enforce maximum limit of 100', () => {
      const result = parseSearchParams({ limit: '200' });

      expect(result.limit).toBe(100);
    });

    it('should use default limit when 0 is provided (falsy value)', () => {
      const result = parseSearchParams({ limit: '0' });

      // 0 is falsy, so it falls back to default 20
      expect(result.limit).toBe(20);
    });

    it('should enforce minimum limit of 1 for negative values', () => {
      const result = parseSearchParams({ limit: '-5' });

      expect(result.limit).toBe(1);
    });

    it('should handle invalid page/limit values', () => {
      const result = parseSearchParams({ page: 'invalid', limit: 'invalid' });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should parse languages filter', () => {
      const result = parseSearchParams({ languages: 'en,th' });

      expect(result.languages).toBe('en,th');
    });

    it('should parse min_rating filter', () => {
      const result = parseSearchParams({ min_rating: '4.5' });

      expect(result.minRating).toBe(4.5);
    });

    it('should parse has_photos filter', () => {
      const result = parseSearchParams({ has_photos: 'true' });

      expect(result.hasPhotos).toBe(true);
    });

    it('should parse social_media filter', () => {
      const result = parseSearchParams({ social_media: 'instagram' });

      expect(result.socialMedia).toBe('instagram');
    });

    it('should handle all params together', () => {
      const result = parseSearchParams({
        q: 'test',
        type: 'freelance',
        nationality: 'Thai',
        age_min: '20',
        age_max: '30',
        zone: 'Walking Street',
        establishment_id: 'est-123',
        category_id: '3',
        is_verified: 'true',
        sort_by: 'popularity',
        sort_order: 'desc',
        page: '2',
        limit: '10',
        languages: 'en',
        min_rating: '4',
        has_photos: 'true',
        social_media: 'line'
      });

      expect(result.searchQuery).toBe('test');
      expect(result.type).toBe('freelance');
      expect(result.nationality).toBe('Thai');
      expect(result.ageMin).toBe(20);
      expect(result.ageMax).toBe(30);
      expect(result.zone).toBe('Walking Street');
      expect(result.normalizedZoneFilter).toBe('walkingstreet');
      expect(result.establishmentId).toBe('est-123');
      expect(result.categoryId).toBe(3);
      expect(result.isVerified).toBe(true);
      expect(result.sortBy).toBe('popularity');
      expect(result.sortOrder).toBe('desc');
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(10);
      expect(result.languages).toBe('en');
      expect(result.minRating).toBe(4);
      expect(result.hasPhotos).toBe(true);
      expect(result.socialMedia).toBe('line');
    });
  });

  // ========================================
  // buildEmployeeSearchQuery Tests
  // ========================================
  describe('buildEmployeeSearchQuery', () => {
    let mockQueryBuilder: {
      select: jest.Mock;
      eq: jest.Mock;
      or: jest.Mock;
      contains: jest.Mock;
      gte: jest.Mock;
      lte: jest.Mock;
      order: jest.Mock;
    };

    beforeEach(() => {
      mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis()
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);
    });

    const defaultParams: SearchParams = {
      searchQuery: null,
      type: null,
      nationality: null,
      ageMin: null,
      ageMax: null,
      zone: null,
      normalizedZoneFilter: null,
      establishmentId: null,
      categoryId: null,
      isVerified: false,
      sortBy: 'relevance',
      sortOrder: 'desc',
      page: 1,
      limit: 20,
      offset: 0,
      languages: null,
      minRating: null,
      hasPhotos: false,
      socialMedia: null
    };

    it('should query employees table with approved status', async () => {
      await buildEmployeeSearchQuery(defaultParams);

      expect(supabase.from).toHaveBeenCalledWith('employees');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'approved');
    });

    it('should include select with relationships', async () => {
      await buildEmployeeSearchQuery(defaultParams);

      expect(mockQueryBuilder.select).toHaveBeenCalled();
      const selectArg = mockQueryBuilder.select.mock.calls[0][0];
      expect(selectArg).toContain('current_employment');
      expect(selectArg).toContain('independent_position');
    });

    it('should apply search query filter when provided', async () => {
      await buildEmployeeSearchQuery({ ...defaultParams, searchQuery: 'test' });

      expect(mockQueryBuilder.or).toHaveBeenCalled();
      const orArg = mockQueryBuilder.or.mock.calls[0][0];
      expect(orArg).toContain('name.ilike.%test%');
      expect(orArg).toContain('nickname.ilike.%test%');
      expect(orArg).toContain('description.ilike.%test%');
    });

    it('should escape special characters in search query', async () => {
      await buildEmployeeSearchQuery({ ...defaultParams, searchQuery: 'test%user' });

      expect(mockQueryBuilder.or).toHaveBeenCalled();
      const orArg = mockQueryBuilder.or.mock.calls[0][0];
      // The escapeLikeWildcards mock escapes % to \%
      expect(orArg).toContain('test\\%user');
    });

    it('should apply nationality filter when provided', async () => {
      await buildEmployeeSearchQuery({ ...defaultParams, nationality: 'Thai' });

      expect(mockQueryBuilder.contains).toHaveBeenCalledWith('nationality', ['Thai']);
    });

    it('should apply age min filter when provided', async () => {
      await buildEmployeeSearchQuery({ ...defaultParams, ageMin: 20 });

      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('age', 20);
    });

    it('should apply age max filter when provided', async () => {
      await buildEmployeeSearchQuery({ ...defaultParams, ageMax: 30 });

      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('age', 30);
    });

    it('should apply both age filters when provided', async () => {
      await buildEmployeeSearchQuery({ ...defaultParams, ageMin: 20, ageMax: 30 });

      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('age', 20);
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('age', 30);
    });

    it('should apply is_verified filter when true', async () => {
      await buildEmployeeSearchQuery({ ...defaultParams, isVerified: true });

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('is_verified', true);
    });

    it('should not apply is_verified filter when false', async () => {
      await buildEmployeeSearchQuery({ ...defaultParams, isVerified: false });

      // Only called for status='approved', not for is_verified
      expect(mockQueryBuilder.eq).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'approved');
    });

    it('should always order by VIP status first', async () => {
      await buildEmployeeSearchQuery(defaultParams);

      expect(mockQueryBuilder.order).toHaveBeenCalledWith('is_vip', {
        ascending: false,
        nullsFirst: false
      });
    });

    it('should apply name sort when sortBy is name', async () => {
      await buildEmployeeSearchQuery({ ...defaultParams, sortBy: 'name', sortOrder: 'asc' });

      expect(mockQueryBuilder.order).toHaveBeenCalledWith('name', { ascending: true });
    });

    it('should apply age sort when sortBy is age', async () => {
      await buildEmployeeSearchQuery({ ...defaultParams, sortBy: 'age', sortOrder: 'desc' });

      expect(mockQueryBuilder.order).toHaveBeenCalledWith('age', {
        ascending: false,
        nullsFirst: false
      });
    });

    it('should apply nationality sort when sortBy is nationality', async () => {
      await buildEmployeeSearchQuery({ ...defaultParams, sortBy: 'nationality', sortOrder: 'asc' });

      expect(mockQueryBuilder.order).toHaveBeenCalledWith('nationality', {
        ascending: true,
        nullsFirst: false
      });
    });

    it('should apply newest sort when sortBy is newest', async () => {
      await buildEmployeeSearchQuery({ ...defaultParams, sortBy: 'newest' });

      expect(mockQueryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should apply oldest sort when sortBy is oldest', async () => {
      await buildEmployeeSearchQuery({ ...defaultParams, sortBy: 'oldest' });

      expect(mockQueryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: true });
    });

    it('should not apply additional sort for popularity', async () => {
      await buildEmployeeSearchQuery({ ...defaultParams, sortBy: 'popularity' });

      // Only VIP sort should be applied
      expect(mockQueryBuilder.order).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('is_vip', expect.any(Object));
    });

    it('should not apply additional sort for relevance', async () => {
      await buildEmployeeSearchQuery({ ...defaultParams, sortBy: 'relevance' });

      // Only VIP sort should be applied
      expect(mockQueryBuilder.order).toHaveBeenCalledTimes(1);
    });

    it('should apply all filters together', async () => {
      await buildEmployeeSearchQuery({
        ...defaultParams,
        searchQuery: 'test',
        nationality: 'Thai',
        ageMin: 20,
        ageMax: 30,
        isVerified: true,
        sortBy: 'name',
        sortOrder: 'asc'
      });

      expect(mockQueryBuilder.or).toHaveBeenCalled();
      expect(mockQueryBuilder.contains).toHaveBeenCalledWith('nationality', ['Thai']);
      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('age', 20);
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('age', 30);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('is_verified', true);
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('name', { ascending: true });
    });
  });

  // ========================================
  // compileAvailableFilters Tests
  // ========================================
  describe('compileAvailableFilters', () => {
    it('should fetch and compile all filter options', async () => {
      const mockNationalities = {
        data: [
          { nationality: ['Thai', 'Cambodian'] },
          { nationality: ['Thai'] },
          { nationality: ['Japanese'] }
        ],
        error: null
      };

      const mockZones = {
        data: [
          { zone: 'Soi 6' },
          { zone: 'Walking Street' },
          { zone: 'Soi 6' } // duplicate
        ],
        error: null
      };

      const mockEstablishments = {
        data: [
          { id: 'est-1', name: 'Club A', zone: 'Soi 6' },
          { id: 'est-2', name: 'Club B', zone: 'Walking Street' }
        ],
        error: null
      };

      const mockCategories = {
        data: [
          { id: 1, name: 'Nightclub', icon: '🎉' },
          { id: 2, name: 'Bar', icon: '🍺' }
        ],
        error: null
      };

      // Mock different queries for different tables
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue(mockNationalities)
              })
            })
          };
        }
        if (table === 'establishments') {
          return {
            select: jest.fn().mockImplementation((fields: string) => {
              if (fields === 'zone') {
                return {
                  not: jest.fn().mockResolvedValue(mockZones)
                };
              }
              return {
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue(mockEstablishments)
                })
              };
            })
          };
        }
        if (table === 'establishment_categories') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue(mockCategories)
            })
          };
        }
        return {
          select: jest.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      const result = await compileAvailableFilters();

      // Check nationalities are unique and sorted
      expect(result.availableNationalities).toEqual(['Cambodian', 'Japanese', 'Thai']);

      // Check zones are unique, normalized, and sorted
      expect(result.availableZones).toEqual(['soi6', 'walkingstreet']);

      // Check establishments
      expect(result.availableEstablishments).toHaveLength(2);
      expect(result.availableEstablishments[0].name).toBe('Club A');

      // Check categories
      expect(result.availableCategories).toHaveLength(2);
      expect(result.availableCategories[0].name).toBe('Nightclub');
    });

    it('should handle null data responses', async () => {
      (supabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({ data: null, error: null }),
            order: jest.fn().mockResolvedValue({ data: null, error: null })
          }),
          not: jest.fn().mockResolvedValue({ data: null, error: null }),
          order: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      }));

      const result = await compileAvailableFilters();

      expect(result.availableNationalities).toEqual([]);
      expect(result.availableZones).toEqual([]);
      expect(result.availableEstablishments).toEqual([]);
      expect(result.availableCategories).toEqual([]);
    });

    it('should handle empty arrays', async () => {
      (supabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({ data: [], error: null }),
            order: jest.fn().mockResolvedValue({ data: [], error: null })
          }),
          not: jest.fn().mockResolvedValue({ data: [], error: null }),
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        })
      }));

      const result = await compileAvailableFilters();

      expect(result.availableNationalities).toEqual([]);
      expect(result.availableZones).toEqual([]);
      expect(result.availableEstablishments).toEqual([]);
      expect(result.availableCategories).toEqual([]);
    });

    it('should filter out null zones', async () => {
      const mockZones = {
        data: [
          { zone: 'Soi 6' },
          { zone: null },
          { zone: 'Walking Street' }
        ],
        error: null
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'establishments') {
          return {
            select: jest.fn().mockImplementation((fields: string) => {
              if (fields === 'zone') {
                return {
                  not: jest.fn().mockResolvedValue(mockZones)
                };
              }
              return {
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: [], error: null })
                })
              };
            })
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ data: [], error: null })
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        };
      });

      const result = await compileAvailableFilters();

      expect(result.availableZones).toEqual(['soi6', 'walkingstreet']);
    });

    it('should handle non-array nationality values', async () => {
      const mockNationalities = {
        data: [
          { nationality: 'Thai' }, // non-array
          { nationality: ['Japanese'] }
        ],
        error: null
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue(mockNationalities)
              })
            })
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({ data: [], error: null }),
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null })
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        };
      });

      const result = await compileAvailableFilters();

      // Non-array nationality should be filtered out
      expect(result.availableNationalities).toEqual(['Japanese']);
    });
  });
});
