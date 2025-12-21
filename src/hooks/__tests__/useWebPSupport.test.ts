/**
 * @vitest-environment jsdom
 */
/**
 * useWebPSupport Hook Tests
 *
 * Tests for WebP browser support detection:
 * - Cached result (2 tests)
 * - Detection (2 tests)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWebPSupport } from '../useWebPSupport';

// Create a mock Image class that does nothing
class NoOpImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  height = 0;
}

describe('useWebPSupport Hook', () => {
  const originalImage = global.Image;
  let sessionStorageData: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageData = {};

    // Properly mock sessionStorage with actual storage behavior
    (global.sessionStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => sessionStorageData[key] ?? null
    );
    (global.sessionStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string, value: string) => {
        sessionStorageData[key] = value;
      }
    );
    (global.sessionStorage.clear as ReturnType<typeof vi.fn>).mockImplementation(() => {
      sessionStorageData = {};
    });

    // Prevent any Image detection from running by default
    global.Image = NoOpImage as unknown as typeof Image;
  });

  afterEach(() => {
    sessionStorageData = {};
    vi.restoreAllMocks();
    global.Image = originalImage;
  });

  describe('Cached result', () => {
    it('should return cached true value from sessionStorage', () => {
      sessionStorageData['webp-support'] = 'true';

      const { result } = renderHook(() => useWebPSupport());

      expect(result.current).toBe(true);
    });

    it('should return cached false value from sessionStorage', () => {
      sessionStorageData['webp-support'] = 'false';

      const { result } = renderHook(() => useWebPSupport());

      expect(result.current).toBe(false);
    });
  });

  describe('Detection', () => {
    it('should detect WebP support when image loads successfully', async () => {
      // Mock Image class to simulate successful WebP load
      class MockWebPSupportedImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        height = 2; // WebP test image has height 2
        private _src = '';

        get src() {
          return this._src;
        }

        set src(value: string) {
          this._src = value;
          // Trigger onload asynchronously after src is set
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 10);
        }
      }

      global.Image = MockWebPSupportedImage as unknown as typeof Image;

      const { result } = renderHook(() => useWebPSupport());

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      expect(sessionStorageData['webp-support']).toBe('true');
    });

    it('should detect no WebP support when image fails to load', async () => {
      // Mock Image class to simulate failed WebP load
      class MockWebPNotSupportedImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        height = 0; // Failed load has height 0
        private _src = '';

        get src() {
          return this._src;
        }

        set src(value: string) {
          this._src = value;
          // Trigger onerror asynchronously after src is set
          setTimeout(() => {
            if (this.onerror) this.onerror();
          }, 10);
        }
      }

      global.Image = MockWebPNotSupportedImage as unknown as typeof Image;

      const { result } = renderHook(() => useWebPSupport());

      await waitFor(() => {
        expect(sessionStorageData['webp-support']).toBe('false');
      });

      expect(result.current).toBe(false);
    });
  });
});
