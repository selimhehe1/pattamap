/**
 * Tests for MapControlsContext
 * Covers: view mode state with localStorage persistence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MapControlsProvider, useMapControls } from '../MapControlsContext';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('MapControlsContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('MapControlsProvider', () => {
    it('should provide default view mode as map when no saved preference', () => {
      const { result } = renderHook(() => useMapControls(), {
        wrapper: MapControlsProvider,
      });

      expect(result.current.viewMode).toBe('map');
    });

    it('should restore view mode from localStorage - map', () => {
      localStorageMock.getItem.mockReturnValueOnce('map');

      const { result } = renderHook(() => useMapControls(), {
        wrapper: MapControlsProvider,
      });

      expect(result.current.viewMode).toBe('map');
    });

    it('should restore view mode from localStorage - list', () => {
      localStorageMock.getItem.mockReturnValueOnce('list');

      const { result } = renderHook(() => useMapControls(), {
        wrapper: MapControlsProvider,
      });

      expect(result.current.viewMode).toBe('list');
    });

    it('should restore view mode from localStorage - employees', () => {
      localStorageMock.getItem.mockReturnValueOnce('employees');

      const { result } = renderHook(() => useMapControls(), {
        wrapper: MapControlsProvider,
      });

      expect(result.current.viewMode).toBe('employees');
    });

    it('should default to map when localStorage has invalid value', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid-mode');

      const { result } = renderHook(() => useMapControls(), {
        wrapper: MapControlsProvider,
      });

      expect(result.current.viewMode).toBe('map');
    });

    it('should change view mode to list', () => {
      const { result } = renderHook(() => useMapControls(), {
        wrapper: MapControlsProvider,
      });

      act(() => {
        result.current.setViewMode('list');
      });

      expect(result.current.viewMode).toBe('list');
    });

    it('should change view mode to employees', () => {
      const { result } = renderHook(() => useMapControls(), {
        wrapper: MapControlsProvider,
      });

      act(() => {
        result.current.setViewMode('employees');
      });

      expect(result.current.viewMode).toBe('employees');
    });

    it('should persist view mode to localStorage', () => {
      const { result } = renderHook(() => useMapControls(), {
        wrapper: MapControlsProvider,
      });

      act(() => {
        result.current.setViewMode('list');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('pattamap-view-mode', 'list');
    });

    it('should persist employees view mode to localStorage', () => {
      const { result } = renderHook(() => useMapControls(), {
        wrapper: MapControlsProvider,
      });

      act(() => {
        result.current.setViewMode('employees');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('pattamap-view-mode', 'employees');
    });
  });

  describe('useMapControls hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useMapControls());
      }).toThrow('useMapControls must be used within a MapControlsProvider');

      consoleSpy.mockRestore();
    });

    it('should return setViewMode function', () => {
      const { result } = renderHook(() => useMapControls(), {
        wrapper: MapControlsProvider,
      });

      expect(typeof result.current.setViewMode).toBe('function');
    });

    it('should allow cycling through all view modes', () => {
      const { result } = renderHook(() => useMapControls(), {
        wrapper: MapControlsProvider,
      });

      // Start at map
      expect(result.current.viewMode).toBe('map');

      // Change to list
      act(() => {
        result.current.setViewMode('list');
      });
      expect(result.current.viewMode).toBe('list');

      // Change to employees
      act(() => {
        result.current.setViewMode('employees');
      });
      expect(result.current.viewMode).toBe('employees');

      // Back to map
      act(() => {
        result.current.setViewMode('map');
      });
      expect(result.current.viewMode).toBe('map');
    });
  });
});
