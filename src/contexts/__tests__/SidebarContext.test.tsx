/**
 * Tests for SidebarContext
 * Covers: sidebar toggle state management
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SidebarProvider, useSidebar } from '../SidebarContext';

describe('SidebarContext', () => {
  describe('SidebarProvider', () => {
    it('should provide default sidebar state as open', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      expect(result.current.sidebarOpen).toBe(true);
    });

    it('should toggle sidebar from open to closed', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      expect(result.current.sidebarOpen).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarOpen).toBe(false);
    });

    it('should toggle sidebar from closed to open', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      // Close it first
      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarOpen).toBe(false);

      // Toggle back to open
      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarOpen).toBe(true);
    });

    it('should handle multiple toggles correctly', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      // Start open
      expect(result.current.sidebarOpen).toBe(true);

      // Toggle 5 times
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.toggleSidebar();
        });
      }

      // After odd number of toggles, should be closed
      expect(result.current.sidebarOpen).toBe(false);
    });
  });

  describe('useSidebar hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSidebar());
      }).toThrow('useSidebar must be used within a SidebarProvider');

      consoleSpy.mockRestore();
    });

    it('should return toggleSidebar function', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      expect(typeof result.current.toggleSidebar).toBe('function');
    });
  });
});

// Need to import vi for mocking
import { vi } from 'vitest';
