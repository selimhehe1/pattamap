/**
 * @vitest-environment jsdom
 */
/**
 * Tests for useFormValidation hook
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation, ValidationRules } from '../useFormValidation';

describe('useFormValidation', () => {
  interface TestFormData {
    name: string;
    email: string;
    age: number;
    password: string;
  }

  const testRules: ValidationRules<TestFormData> = {
    name: {
      required: true,
      minLength: 2,
      maxLength: 50,
      message: 'Name must be 2-50 characters',
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Invalid email format',
    },
    age: {
      required: true,
      min: 18,
      max: 100,
      message: 'Age must be between 18 and 100',
    },
    password: {
      required: true,
      minLength: 8,
      message: 'Password must be at least 8 characters',
    },
  };

  it('should return initial state with no errors', () => {
    const formData: TestFormData = {
      name: '',
      email: '',
      age: 0,
      password: '',
    };

    const { result } = renderHook(() => useFormValidation(formData, testRules));

    expect(result.current.errors).toEqual({});
    expect(result.current.touched.size).toBe(0); // touched is a Set
  });

  it('should validate required fields on blur', () => {
    const formData: TestFormData = {
      name: '',
      email: '',
      age: 0,
      password: '',
    };

    const { result } = renderHook(() => useFormValidation(formData, testRules));

    act(() => {
      result.current.handleFieldBlur('name', '');
    });

    expect(result.current.errors.name).toBeDefined();
    expect(result.current.touched.has('name')).toBe(true);
  });

  it('should validate minLength constraint', () => {
    const formData: TestFormData = {
      name: 'A', // Too short
      email: 'test@example.com',
      age: 25,
      password: '12345678',
    };

    const { result } = renderHook(() => useFormValidation(formData, testRules));

    act(() => {
      result.current.handleFieldBlur('name', 'A');
    });

    expect(result.current.errors.name).toBeDefined();
  });

  it('should validate maxLength constraint', () => {
    const formData: TestFormData = {
      name: 'A'.repeat(51), // Too long
      email: 'test@example.com',
      age: 25,
      password: '12345678',
    };

    const { result } = renderHook(() => useFormValidation(formData, testRules));

    act(() => {
      result.current.handleFieldBlur('name', 'A'.repeat(51));
    });

    expect(result.current.errors.name).toBeDefined();
  });

  it('should validate email pattern', () => {
    const formData: TestFormData = {
      name: 'John',
      email: 'invalid-email',
      age: 25,
      password: '12345678',
    };

    const { result } = renderHook(() => useFormValidation(formData, testRules));

    act(() => {
      result.current.handleFieldBlur('email', 'invalid-email');
    });

    expect(result.current.errors.email).toBeDefined();
  });

  it('should validate number min/max constraints', () => {
    const formData: TestFormData = {
      name: 'John',
      email: 'john@example.com',
      age: 15, // Too young
      password: '12345678',
    };

    const { result } = renderHook(() => useFormValidation(formData, testRules));

    act(() => {
      result.current.handleFieldBlur('age', 15);
    });

    expect(result.current.errors.age).toBeDefined();
  });

  it('should pass validation for valid data on blur', () => {
    const formData: TestFormData = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
      password: 'securepassword123',
    };

    const { result } = renderHook(() => useFormValidation(formData, testRules));

    act(() => {
      result.current.handleFieldBlur('name', 'John Doe');
      result.current.handleFieldBlur('email', 'john@example.com');
      result.current.handleFieldBlur('age', 25);
      result.current.handleFieldBlur('password', 'securepassword123');
    });

    expect(result.current.errors.name).toBeUndefined();
    expect(result.current.errors.email).toBeUndefined();
    expect(result.current.errors.age).toBeUndefined();
    expect(result.current.errors.password).toBeUndefined();
  });

  it('should validateForm and return overall validity', () => {
    const invalidFormData: TestFormData = {
      name: 'A', // Too short
      email: 'invalid',
      age: 10, // Too young
      password: '123', // Too short
    };

    const { result } = renderHook(() =>
      useFormValidation(invalidFormData, testRules)
    );

    let isValid: boolean;
    act(() => {
      isValid = result.current.validateForm();
    });

    expect(isValid!).toBe(false);
    expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);
  });

  it('should return true for valid form', () => {
    const validFormData: TestFormData = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
      password: 'securepassword123',
    };

    const { result } = renderHook(() =>
      useFormValidation(validFormData, testRules)
    );

    let isValid: boolean;
    act(() => {
      isValid = result.current.validateForm();
    });

    expect(isValid!).toBe(true);
  });

  it('should clear errors when resetValidation is called', () => {
    const formData: TestFormData = {
      name: 'A',
      email: 'invalid',
      age: 10,
      password: '123',
    };

    const { result } = renderHook(() => useFormValidation(formData, testRules));

    // First trigger some errors
    act(() => {
      result.current.validateForm();
    });

    expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

    // Reset validation
    act(() => {
      result.current.resetValidation();
    });

    expect(result.current.errors).toEqual({});
    expect(result.current.touched.size).toBe(0);
  });

  it('should support custom validation functions', () => {
    interface CustomFormData {
      confirmPassword: string;
      password: string;
    }

    const customRules: ValidationRules<CustomFormData> = {
      confirmPassword: {
        custom: (value, formData) => {
          if (value !== formData?.password) {
            return 'Passwords do not match';
          }
          return true;
        },
      },
    };

    const formData: CustomFormData = {
      password: 'password123',
      confirmPassword: 'different',
    };

    const { result } = renderHook(() =>
      useFormValidation(formData, customRules)
    );

    act(() => {
      result.current.handleFieldBlur('confirmPassword', 'different');
    });

    expect(result.current.errors.confirmPassword).toBe('Passwords do not match');
  });

  it('should set field status correctly', () => {
    const formData: TestFormData = {
      name: 'John',
      email: 'john@example.com',
      age: 25,
      password: '12345678',
    };

    const { result } = renderHook(() => useFormValidation(formData, testRules));

    // Valid field
    act(() => {
      result.current.handleFieldBlur('name', 'John');
    });
    expect(result.current.fieldStatus.name).toBe('valid');

    // Invalid field
    act(() => {
      result.current.handleFieldBlur('email', 'invalid');
    });
    expect(result.current.fieldStatus.email).toBe('invalid');
  });

  it('should use isFieldValid correctly', () => {
    const formData: TestFormData = {
      name: 'John',
      email: 'john@example.com',
      age: 25,
      password: '12345678',
    };

    const { result } = renderHook(() => useFormValidation(formData, testRules));

    // Field not touched yet - should return false
    expect(result.current.isFieldValid('name')).toBe(false);

    // Touch and validate with valid value
    act(() => {
      result.current.handleFieldBlur('name', 'John');
    });

    expect(result.current.isFieldValid('name')).toBe(true);

    // Touch and validate with invalid value
    act(() => {
      result.current.handleFieldBlur('email', 'invalid');
    });

    expect(result.current.isFieldValid('email')).toBe(false);
  });
});
