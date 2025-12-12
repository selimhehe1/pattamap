/**
 * @vitest-environment jsdom
 */
/**
 * Tests for useAutoSave hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from '../useAutoSave';

// Mock logger to suppress logs during tests
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('useAutoSave', () => {
  // Store original localStorage
  const originalLocalStorage = window.localStorage;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage = {};

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: vi.fn(() => {
          mockLocalStorage = {};
        }),
      },
      writable: true,
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  interface TestFormData {
    name: string;
    email: string;
  }

  it('should not save immediately on initial mount', () => {
    const formData: TestFormData = { name: 'John', email: 'john@test.com' };

    renderHook(() =>
      useAutoSave({
        key: 'test-form',
        data: formData,
        debounceMs: 1000,
        enabled: true,
      })
    );

    // Should not save immediately (skips initial mount)
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('should save after debounce delay when data changes', () => {
    const initialData: TestFormData = { name: 'John', email: 'john@test.com' };

    const { rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          key: 'test-form',
          data,
          debounceMs: 1000,
          enabled: true,
        }),
      { initialProps: { data: initialData } }
    );

    // Change data to trigger save (since initial mount is skipped)
    const updatedData: TestFormData = { name: 'Jane', email: 'jane@test.com' };
    rerender({ data: updatedData });

    // Fast-forward past the debounce delay
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'autosave_test-form',
      JSON.stringify(updatedData)
    );
  });

  it('should not save when disabled', () => {
    const initialData: TestFormData = { name: 'John', email: 'john@test.com' };

    const { rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          key: 'test-form',
          data,
          debounceMs: 1000,
          enabled: false,
        }),
      { initialProps: { data: initialData } }
    );

    // Change data
    rerender({ data: { name: 'Jane', email: 'jane@test.com' } });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('should clear draft when clearDraft is called', async () => {
    // Pre-populate localStorage with a draft
    mockLocalStorage['autosave_test-form'] = JSON.stringify({ name: 'Saved', email: 'saved@test.com' });
    mockLocalStorage['autosave_test-form_timestamp'] = new Date().toISOString();

    const formData: TestFormData = { name: 'John', email: 'john@test.com' };

    const { result } = renderHook(() =>
      useAutoSave({
        key: 'test-form',
        data: formData,
        debounceMs: 1000,
        enabled: true,
      })
    );

    // Clear the draft
    act(() => {
      result.current.clearDraft();
    });

    expect(localStorage.removeItem).toHaveBeenCalledWith('autosave_test-form');
    expect(localStorage.removeItem).toHaveBeenCalledWith('autosave_test-form_timestamp');
  });

  it('should restore draft from localStorage', () => {
    const savedData: TestFormData = { name: 'Saved John', email: 'saved@test.com' };
    mockLocalStorage['autosave_test-form'] = JSON.stringify(savedData);
    mockLocalStorage['autosave_test-form_timestamp'] = new Date().toISOString();

    const formData: TestFormData = { name: '', email: '' };

    const { result } = renderHook(() =>
      useAutoSave({
        key: 'test-form',
        data: formData,
        debounceMs: 1000,
        enabled: true,
      })
    );

    const restored = result.current.restoreDraft();

    expect(restored).toEqual(savedData);
  });

  it('should report isDraft correctly when draft exists', () => {
    const savedData = { name: 'Test', email: 'test@test.com' };
    mockLocalStorage['autosave_test-form'] = JSON.stringify(savedData);
    mockLocalStorage['autosave_test-form_timestamp'] = new Date().toISOString();

    const formData: TestFormData = { name: '', email: '' };

    const { result } = renderHook(() =>
      useAutoSave({
        key: 'test-form',
        data: formData,
        debounceMs: 1000,
        enabled: true,
      })
    );

    expect(result.current.isDraft).toBe(true);
  });

  it('should report isDraft as false when no draft exists', () => {
    const formData: TestFormData = { name: '', email: '' };

    const { result } = renderHook(() =>
      useAutoSave({
        key: 'test-form',
        data: formData,
        debounceMs: 1000,
        enabled: true,
      })
    );

    expect(result.current.isDraft).toBe(false);
  });

  it('should handle invalid JSON in localStorage gracefully', () => {
    mockLocalStorage['autosave_test-form'] = 'invalid json';

    const formData: TestFormData = { name: 'John', email: 'john@test.com' };

    const { result } = renderHook(() =>
      useAutoSave({
        key: 'test-form',
        data: formData,
        debounceMs: 1000,
        enabled: true,
      })
    );

    // Should not crash and draft should be null when restored
    const restored = result.current.restoreDraft();
    expect(restored).toBeNull();
  });

  it('should update lastSaved timestamp after save', () => {
    const initialData: TestFormData = { name: 'John', email: 'john@test.com' };

    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          key: 'test-form',
          data,
          debounceMs: 500,
          enabled: true,
        }),
      { initialProps: { data: initialData } }
    );

    expect(result.current.lastSaved).toBeNull();

    // Change data to trigger save
    rerender({ data: { name: 'Jane', email: 'jane@test.com' } });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(result.current.lastSaved).not.toBeNull();
  });

  it('should debounce rapid data changes', () => {
    const initialData: TestFormData = { name: 'John', email: 'john@test.com' };

    const { rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          key: 'test-form',
          data,
          debounceMs: 1000,
          enabled: true,
        }),
      { initialProps: { data: initialData } }
    );

    // Rapidly change data multiple times
    rerender({ data: { name: 'J', email: 'john@test.com' } });
    act(() => { vi.advanceTimersByTime(200); });

    rerender({ data: { name: 'Ja', email: 'john@test.com' } });
    act(() => { vi.advanceTimersByTime(200); });

    rerender({ data: { name: 'Jan', email: 'john@test.com' } });
    act(() => { vi.advanceTimersByTime(200); });

    const finalData = { name: 'Jane', email: 'jane@test.com' };
    rerender({ data: finalData });

    // Should not have saved yet
    expect(localStorage.setItem).not.toHaveBeenCalled();

    // Wait for debounce
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    // Should only save the final value
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'autosave_test-form',
      JSON.stringify(finalData)
    );
  });
});
