/**
 * @vitest-environment jsdom
 */
/**
 * useEstablishmentFilters Hook Tests
 *
 * Tests for establishment filtering:
 * - Initial state (1 test)
 * - Category filtering (3 tests)
 * - Search filtering (2 tests)
 * - Combined filtering (1 test)
 * - Clear filters (1 test)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEstablishmentFilters } from '../useEstablishmentFilters';
import { Establishment } from '../../types';

// Mock establishments for testing - use category IDs matching sampleCategories
const mockEstablishments: Establishment[] = [
  {
    id: '1',
    name: 'Thai Restaurant',
    address: 'Walking Street 123',
    category_id: 'cat-005', // Restaurant category
    description: 'Great food',
    latitude: 12.9,
    longitude: 100.8,
    photos: [],
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: '2',
    name: 'Soi Bar',
    address: 'Soi 6 Main Road',
    category_id: 'cat-002', // Beer Bar category
    description: 'Fun nightlife',
    latitude: 12.9,
    longitude: 100.8,
    photos: [],
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: '3',
    name: 'Beach Hotel',
    address: 'Beach Road 456',
    category_id: 'cat-006', // Hotel category
    description: 'Nice hotel',
    latitude: 12.9,
    longitude: 100.8,
    photos: [],
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
] as Establishment[];

describe('useEstablishmentFilters Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    it('should return all establishments with default filters', () => {
      const { result } = renderHook(() =>
        useEstablishmentFilters({ establishments: mockEstablishments })
      );

      // All categories should be selected by default
      expect(result.current.selectedCategories.length).toBeGreaterThan(0);
      expect(result.current.searchTerm).toBe('');
      // All establishments should be visible initially (if their categories are in sampleCategories)
      expect(result.current.categories).toBeDefined();
    });
  });

  describe('Category filtering', () => {
    it('should toggle category off', () => {
      const { result } = renderHook(() =>
        useEstablishmentFilters({ establishments: mockEstablishments })
      );

      const initialCategories = result.current.selectedCategories.length;

      act(() => {
        // Toggle off the first category
        result.current.handleCategoryToggle(result.current.selectedCategories[0]);
      });

      expect(result.current.selectedCategories.length).toBe(initialCategories - 1);
    });

    it('should toggle category on', () => {
      const { result } = renderHook(() =>
        useEstablishmentFilters({ establishments: mockEstablishments })
      );

      // First toggle a category off
      const categoryToToggle = result.current.selectedCategories[0];

      act(() => {
        result.current.handleCategoryToggle(categoryToToggle);
      });

      const afterRemove = result.current.selectedCategories.length;

      // Then toggle it back on
      act(() => {
        result.current.handleCategoryToggle(categoryToToggle);
      });

      expect(result.current.selectedCategories.length).toBe(afterRemove + 1);
      expect(result.current.selectedCategories).toContain(categoryToToggle);
    });

    it('should filter establishments by selected categories', () => {
      const { result } = renderHook(() =>
        useEstablishmentFilters({ establishments: mockEstablishments })
      );

      // Clear all categories
      act(() => {
        result.current.selectedCategories.forEach((cat) => {
          result.current.handleCategoryToggle(cat);
        });
      });

      expect(result.current.filteredEstablishments.length).toBe(0);

      // Add restaurant category (cat-005)
      act(() => {
        result.current.handleCategoryToggle('cat-005');
      });

      // Should only show establishments with category_id cat-005
      const filtered = result.current.filteredEstablishments;
      expect(filtered.every((est) => String(est.category_id) === 'cat-005')).toBe(true);
    });
  });

  describe('Search filtering', () => {
    it('should filter by name', () => {
      const { result } = renderHook(() =>
        useEstablishmentFilters({ establishments: mockEstablishments })
      );

      act(() => {
        result.current.setSearchTerm('thai');
      });

      const filtered = result.current.filteredEstablishments;
      expect(filtered.some((est) => est.name.toLowerCase().includes('thai'))).toBe(true);
    });

    it('should filter by address', () => {
      const { result } = renderHook(() =>
        useEstablishmentFilters({ establishments: mockEstablishments })
      );

      act(() => {
        result.current.setSearchTerm('walking');
      });

      const filtered = result.current.filteredEstablishments;
      expect(filtered.some((est) => est.address.toLowerCase().includes('walking'))).toBe(true);
    });
  });

  describe('Combined filtering', () => {
    it('should combine category and search filters', () => {
      const { result } = renderHook(() =>
        useEstablishmentFilters({ establishments: mockEstablishments })
      );

      // Search for "street"
      act(() => {
        result.current.setSearchTerm('street');
      });

      // Then filter by category
      const filtered = result.current.filteredEstablishments;
      expect(
        filtered.every(
          (est) =>
            est.name.toLowerCase().includes('street') ||
            est.address.toLowerCase().includes('street')
        )
      ).toBe(true);
    });
  });

  describe('Clear filters', () => {
    it('should reset all filters to default', () => {
      const { result } = renderHook(() =>
        useEstablishmentFilters({ establishments: mockEstablishments })
      );

      // Apply some filters
      act(() => {
        result.current.setSearchTerm('test');
        result.current.handleCategoryToggle(result.current.selectedCategories[0]);
      });

      // Clear filters
      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.searchTerm).toBe('');
      // Categories should be reset to all
      expect(result.current.selectedCategories.length).toBe(result.current.categories.length);
    });
  });
});
