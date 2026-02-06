/** @vitest-environment jsdom */
/**
 * useMediaQuery Hook Tests
 *
 * Tests for the media query matching hook:
 * - Initial matchMedia value (1 test)
 * - Dynamic updates on change (1 test)
 * - useIsPortrait convenience hook (1 test)
 * - Different query strings (1 test)
 *
 * Total: 4 tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery, useIsPortrait } from '../useMediaQuery';

// We need to override the setupTests matchMedia mock with a controllable version
type ChangeHandler = (event: MediaQueryListEvent) => void;

let changeHandlers: Map<string, ChangeHandler[]>;
let matchStates: Map<string, boolean>;

function createMockMatchMedia() {
  changeHandlers = new Map();
  matchStates = new Map();

  return (query: string): MediaQueryList => {
    if (!changeHandlers.has(query)) {
      changeHandlers.set(query, []);
    }
    if (!matchStates.has(query)) {
      matchStates.set(query, false);
    }

    return {
      matches: matchStates.get(query)!,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event: string, handler: ChangeHandler) => {
        changeHandlers.get(query)!.push(handler);
      }),
      removeEventListener: vi.fn((_event: string, handler: ChangeHandler) => {
        const handlers = changeHandlers.get(query)!;
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      }),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
  };
}

function simulateMediaChange(query: string, matches: boolean) {
  matchStates.set(query, matches);
  const handlers = changeHandlers.get(query) || [];
  const event = { matches, media: query } as MediaQueryListEvent;
  handlers.forEach((handler) => handler(event));
}

describe('useMediaQuery', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMockMatchMedia(),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('returns initial matchMedia.matches value (false by default)', () => {
    const { result } = renderHook(() =>
      useMediaQuery('(min-width: 768px)')
    );

    expect(result.current).toBe(false);
  });

  it('returns true when initial matches is set to true', () => {
    matchStates.set('(min-width: 768px)', true);

    const { result } = renderHook(() =>
      useMediaQuery('(min-width: 768px)')
    );

    expect(result.current).toBe(true);
  });

  it('updates when media query change event fires', () => {
    const { result } = renderHook(() =>
      useMediaQuery('(min-width: 768px)')
    );

    expect(result.current).toBe(false);

    act(() => {
      simulateMediaChange('(min-width: 768px)', true);
    });

    expect(result.current).toBe(true);
  });

  it('useIsPortrait returns a boolean based on orientation query', () => {
    const { result } = renderHook(() => useIsPortrait());

    expect(typeof result.current).toBe('boolean');
    // Default is false since matchStates defaults to false
    expect(result.current).toBe(false);
  });
});
