/**
 * Tests for ThemeContext
 * Covers: theme toggle, localStorage persistence, system preference detection
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';

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

// Mock matchMedia
const createMatchMediaMock = (matches: boolean) => ({
  matches,
  media: '(prefers-color-scheme: dark)',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();

    // Default to dark system preference
    window.matchMedia = vi.fn().mockImplementation(() => createMatchMediaMock(true));

    // Mock document methods
    document.documentElement.classList.add = vi.fn();
    document.documentElement.classList.remove = vi.fn();
    document.body.setAttribute = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ThemeProvider', () => {
    it('should default to dark theme when no saved preference and system prefers dark', () => {
      window.matchMedia = vi.fn().mockImplementation(() => createMatchMediaMock(true));

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe('dark');
    });

    it('should default to light theme when system prefers light', () => {
      window.matchMedia = vi.fn().mockImplementation(() => createMatchMediaMock(false));

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe('light');
    });

    it('should restore theme from localStorage - dark', () => {
      localStorageMock.getItem.mockReturnValue('dark');

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe('dark');
    });

    it('should restore theme from localStorage - light', () => {
      localStorageMock.getItem.mockReturnValue('light');

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe('light');
    });

    it('should ignore invalid localStorage value', () => {
      localStorageMock.getItem.mockReturnValue('invalid-theme');
      window.matchMedia = vi.fn().mockImplementation(() => createMatchMediaMock(true));

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // Should fall back to system preference (dark)
      expect(result.current.theme).toBe('dark');
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from dark to light', () => {
      localStorageMock.getItem.mockReturnValue('dark');

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe('dark');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
    });

    it('should toggle from light to dark', () => {
      localStorageMock.getItem.mockReturnValue('light');

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe('light');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('dark');
    });

    it('should persist toggled theme to localStorage', () => {
      localStorageMock.getItem.mockReturnValue('dark');

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.toggleTheme();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme-preference', 'light');
    });

    it('should handle multiple toggles correctly', () => {
      localStorageMock.getItem.mockReturnValue('dark');

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // Start dark
      expect(result.current.theme).toBe('dark');

      // Toggle 4 times (even number = back to original)
      for (let i = 0; i < 4; i++) {
        act(() => {
          result.current.toggleTheme();
        });
      }

      expect(result.current.theme).toBe('dark');
    });
  });

  describe('setTheme', () => {
    it('should set theme to light explicitly', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
    });

    it('should set theme to dark explicitly', () => {
      localStorageMock.getItem.mockReturnValue('light');

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
    });

    it('should persist explicitly set theme to localStorage', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('light');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme-preference', 'light');
    });

    it('should set isSystemPreference to false when theme is set explicitly', () => {
      // Start with no saved preference (system preference mode)
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // Initially using system preference
      expect(result.current.isSystemPreference).toBe(true);

      // Set theme explicitly
      act(() => {
        result.current.setTheme('light');
      });

      // No longer using system preference
      expect(result.current.isSystemPreference).toBe(false);
    });
  });

  describe('isSystemPreference', () => {
    it('should be true when no saved preference exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.isSystemPreference).toBe(true);
    });

    it('should be false when saved preference exists', () => {
      localStorageMock.getItem.mockReturnValue('dark');

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.isSystemPreference).toBe(false);
    });
  });

  describe('useTheme hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });

    it('should return all required properties', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current).toHaveProperty('theme');
      expect(result.current).toHaveProperty('toggleTheme');
      expect(result.current).toHaveProperty('setTheme');
      expect(result.current).toHaveProperty('isSystemPreference');
    });
  });

  describe('DOM updates', () => {
    it('should apply theme to document body', () => {
      localStorageMock.getItem.mockReturnValue('dark');

      renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(document.body.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });

    it('should add transitioning class during theme change', () => {
      vi.useFakeTimers();
      localStorageMock.getItem.mockReturnValue('dark');

      renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('theme-transitioning');
    });
  });
});
