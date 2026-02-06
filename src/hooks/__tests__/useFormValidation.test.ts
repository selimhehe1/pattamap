/** @vitest-environment jsdom */
/**
 * useFormValidation Hook Tests
 *
 * Tests for the form validation hook:
 * - Required field validation (3 tests)
 * - String length validation (2 tests)
 * - Number range validation (2 tests)
 * - Pattern validation (1 test)
 * - Custom validation (2 tests)
 * - Full form validation (2 tests)
 * - Field blur behavior (1 test)
 * - Reset behavior (1 test)
 * - isFormValid computed property (1 test)
 *
 * Total: 15 tests
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation, type ValidationRules } from '../useFormValidation';

interface TestForm {
  name: string;
  email: string;
  age: number | string;
  bio: string;
}

const defaultFormData: TestForm = {
  name: '',
  email: '',
  age: '',
  bio: '',
};

const defaultRules: ValidationRules<TestForm> = {
  name: { required: true, minLength: 2, maxLength: 50 },
  email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  age: { min: 18, max: 120 },
  bio: { maxLength: 200 },
};

describe('useFormValidation', () => {
  // ==========================================
  // Required validation
  // ==========================================
  describe('required validation', () => {
    it('returns error for empty string on required field', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      const error = result.current.validateField('name', '');
      expect(error).toBe('name is required');
    });

    it('returns error for null on required field', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      const error = result.current.validateField('name', null);
      expect(error).toBe('name is required');
    });

    it('returns error for undefined on required field', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      const error = result.current.validateField('name', undefined);
      expect(error).toBe('name is required');
    });
  });

  // ==========================================
  // String length validation
  // ==========================================
  describe('minLength validation', () => {
    it('returns error when string is shorter than minLength', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      const error = result.current.validateField('name', 'A');
      expect(error).toBe('name must be at least 2 characters');
    });

    it('returns null when string meets minLength', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      const error = result.current.validateField('name', 'AB');
      expect(error).toBeNull();
    });
  });

  describe('maxLength validation', () => {
    it('returns error when string exceeds maxLength', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      const error = result.current.validateField('bio', 'x'.repeat(201));
      expect(error).toBe('bio must be at most 200 characters');
    });

    it('returns null when string is within maxLength', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      const error = result.current.validateField('bio', 'A short bio');
      expect(error).toBeNull();
    });
  });

  // ==========================================
  // Number range validation
  // ==========================================
  describe('min/max number validation', () => {
    it('returns error when number is below min', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      const error = result.current.validateField('age', 10);
      expect(error).toBe('age must be at least 18');
    });

    it('returns error when number exceeds max', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      const error = result.current.validateField('age', 150);
      expect(error).toBe('age must be at most 120');
    });

    it('returns null when number is within range', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      const error = result.current.validateField('age', 25);
      expect(error).toBeNull();
    });
  });

  // ==========================================
  // Pattern validation
  // ==========================================
  describe('pattern validation', () => {
    it('returns error when value does not match pattern', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      const error = result.current.validateField('email', 'not-an-email');
      expect(error).toBe('email format is invalid');
    });

    it('returns null when value matches pattern', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      const error = result.current.validateField('email', 'user@example.com');
      expect(error).toBeNull();
    });
  });

  // ==========================================
  // Custom validation
  // ==========================================
  describe('custom validation', () => {
    it('returns error string from custom validator', () => {
      const rules: ValidationRules<TestForm> = {
        name: {
          custom: (_value) => 'Custom error message',
        },
      };

      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, rules)
      );

      const error = result.current.validateField('name', 'test');
      expect(error).toBe('Custom error message');
    });

    it('returns default error when custom validator returns false', () => {
      const rules: ValidationRules<TestForm> = {
        name: {
          custom: () => false,
        },
      };

      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, rules)
      );

      const error = result.current.validateField('name', 'test');
      expect(error).toBe('name is invalid');
    });

    it('returns null when custom validator returns true', () => {
      const rules: ValidationRules<TestForm> = {
        name: {
          custom: () => true,
        },
      };

      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, rules)
      );

      const error = result.current.validateField('name', 'test');
      expect(error).toBeNull();
    });
  });

  // ==========================================
  // Full form validation
  // ==========================================
  describe('validateForm', () => {
    it('returns false when form has errors', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateForm();
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.name).toBeDefined();
      expect(result.current.errors.email).toBeDefined();
    });

    it('returns true when all fields are valid', () => {
      const validData: TestForm = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        bio: 'A short bio',
      };

      const { result } = renderHook(() =>
        useFormValidation(validData, defaultRules)
      );

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateForm();
      });

      expect(isValid!).toBe(true);
      expect(result.current.errors.name).toBeUndefined();
      expect(result.current.errors.email).toBeUndefined();
    });
  });

  // ==========================================
  // handleFieldBlur
  // ==========================================
  describe('handleFieldBlur', () => {
    it('validates immediately on blur and sets error', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      act(() => {
        result.current.handleFieldBlur('name', '');
      });

      expect(result.current.errors.name).toBe('name is required');
      expect(result.current.fieldStatus.name).toBe('invalid');
    });

    it('sets valid status on blur when field passes validation', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      act(() => {
        result.current.handleFieldBlur('name', 'John');
      });

      expect(result.current.errors.name).toBeUndefined();
      expect(result.current.fieldStatus.name).toBe('valid');
    });
  });

  // ==========================================
  // resetValidation
  // ==========================================
  describe('resetValidation', () => {
    it('clears all errors, touched state, and field status', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      // First, create some validation state
      act(() => {
        result.current.handleFieldBlur('name', '');
        result.current.handleFieldBlur('email', 'bad');
      });

      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

      // Now reset
      act(() => {
        result.current.resetValidation();
      });

      expect(result.current.errors).toEqual({});
      expect(result.current.touched.size).toBe(0);
      expect(result.current.fieldStatus).toEqual({});
    });
  });

  // ==========================================
  // isFormValid computed property
  // ==========================================
  describe('isFormValid', () => {
    it('reflects current error state', () => {
      const validData: TestForm = {
        name: 'Jane',
        email: 'jane@example.com',
        age: 25,
        bio: '',
      };

      const { result } = renderHook(() =>
        useFormValidation(validData, defaultRules)
      );

      // Before any validation, no errors exist in state so isFormValid is true
      expect(result.current.isFormValid).toBe(true);

      // After validating with errors, it should be false
      act(() => {
        result.current.handleFieldBlur('name', '');
      });

      expect(result.current.isFormValid).toBe(false);
    });
  });

  // ==========================================
  // isFieldValid
  // ==========================================
  describe('isFieldValid', () => {
    it('returns true only when field is touched and has no error', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      // Not touched yet - should be false
      expect(result.current.isFieldValid('name')).toBe(false);

      // Touch with valid value
      act(() => {
        result.current.handleFieldBlur('name', 'John');
      });

      expect(result.current.isFieldValid('name')).toBe(true);
    });

    it('returns false when field is touched but has error', () => {
      const { result } = renderHook(() =>
        useFormValidation(defaultFormData, defaultRules)
      );

      act(() => {
        result.current.handleFieldBlur('name', '');
      });

      expect(result.current.isFieldValid('name')).toBe(false);
    });
  });
});
