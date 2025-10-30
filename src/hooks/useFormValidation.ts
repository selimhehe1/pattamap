import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * useFormValidation - Hook for real-time form validation
 *
 * Provides:
 * - Real-time validation (onChange with debounce + onBlur)
 * - Visual indicators (✓ valid / ✗ invalid)
 * - Contextual error messages
 * - Field-level validation status
 *
 * @example
 * const { errors, touched, validateField, validateForm, isValid } = useFormValidation(
 *   formData,
 *   {
 *     name: {
 *       required: true,
 *       minLength: 2,
 *       pattern: /^[a-zA-Z\s]+$/,
 *       message: 'Name must be at least 2 letters'
 *     }
 *   }
 * );
 */

export type ValidationRule = {
  /** Field is required */
  required?: boolean;
  /** Minimum length for strings */
  minLength?: number;
  /** Maximum length for strings */
  maxLength?: number;
  /** Minimum value for numbers */
  min?: number;
  /** Maximum value for numbers */
  max?: number;
  /** Regex pattern to match */
  pattern?: RegExp;
  /** Custom validation function */
  custom?: (value: any, formData?: any) => boolean | string;
  /** Error message (can be function for dynamic messages) */
  message?: string | ((field: string, rule: string, value: any) => string);
};

export type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule;
};

export type ValidationErrors<T> = {
  [K in keyof T]?: string;
};

export type FieldStatus<T> = {
  [K in keyof T]?: 'valid' | 'invalid' | 'validating' | 'untouched';
};

export function useFormValidation<T extends Record<string, any>>(
  formData: T,
  rules: ValidationRules<T>,
  options: {
    /** Validate on change (with debounce) */
    validateOnChange?: boolean;
    /** Validate on blur */
    validateOnBlur?: boolean;
    /** Debounce delay for onChange validation (ms) */
    debounceDelay?: number;
  } = {}
) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    debounceDelay = 500
  } = options;

  const [errors, setErrors] = useState<ValidationErrors<T>>({});
  const [touched, setTouched] = useState<Set<keyof T>>(new Set());
  const [fieldStatus, setFieldStatus] = useState<FieldStatus<T>>({});

  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  /**
   * Validate a single field
   */
  const validateField = useCallback((fieldName: keyof T, value: any): string | null => {
    const fieldRules = rules[fieldName];
    if (!fieldRules) return null;

    // Required check
    if (fieldRules.required) {
      if (value === '' || value === null || value === undefined) {
        return typeof fieldRules.message === 'function'
          ? fieldRules.message(String(fieldName), 'required', value)
          : fieldRules.message || `${String(fieldName)} is required`;
      }
    }

    // Skip other validations if empty and not required
    if (!fieldRules.required && (value === '' || value === null || value === undefined)) {
      return null;
    }

    // MinLength check
    if (fieldRules.minLength !== undefined && typeof value === 'string') {
      if (value.length < fieldRules.minLength) {
        return typeof fieldRules.message === 'function'
          ? fieldRules.message(String(fieldName), 'minLength', value)
          : fieldRules.message || `${String(fieldName)} must be at least ${fieldRules.minLength} characters`;
      }
    }

    // MaxLength check
    if (fieldRules.maxLength !== undefined && typeof value === 'string') {
      if (value.length > fieldRules.maxLength) {
        return typeof fieldRules.message === 'function'
          ? fieldRules.message(String(fieldName), 'maxLength', value)
          : fieldRules.message || `${String(fieldName)} must be at most ${fieldRules.maxLength} characters`;
      }
    }

    // Min value check
    if (fieldRules.min !== undefined) {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (!isNaN(numValue) && numValue < fieldRules.min) {
        return typeof fieldRules.message === 'function'
          ? fieldRules.message(String(fieldName), 'min', value)
          : fieldRules.message || `${String(fieldName)} must be at least ${fieldRules.min}`;
      }
    }

    // Max value check
    if (fieldRules.max !== undefined) {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (!isNaN(numValue) && numValue > fieldRules.max) {
        return typeof fieldRules.message === 'function'
          ? fieldRules.message(String(fieldName), 'max', value)
          : fieldRules.message || `${String(fieldName)} must be at most ${fieldRules.max}`;
      }
    }

    // Pattern check
    if (fieldRules.pattern && typeof value === 'string') {
      if (!fieldRules.pattern.test(value)) {
        return typeof fieldRules.message === 'function'
          ? fieldRules.message(String(fieldName), 'pattern', value)
          : fieldRules.message || `${String(fieldName)} format is invalid`;
      }
    }

    // Custom validation
    if (fieldRules.custom) {
      const result = fieldRules.custom(value, formData);
      if (typeof result === 'string') {
        return result;
      }
      if (result === false) {
        return typeof fieldRules.message === 'function'
          ? fieldRules.message(String(fieldName), 'custom', value)
          : fieldRules.message || `${String(fieldName)} is invalid`;
      }
    }

    return null;
  }, [rules, formData]);

  /**
   * Validate entire form
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors<T> = {};
    let isValid = true;

    Object.keys(rules).forEach((fieldName) => {
      const error = validateField(fieldName as keyof T, formData[fieldName as keyof T]);
      if (error) {
        newErrors[fieldName as keyof T] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [rules, formData, validateField]);

  /**
   * Handle field change (with debounce)
   */
  const handleFieldChange = useCallback((fieldName: keyof T, value: any) => {
    if (!validateOnChange) return;

    // Mark as touched
    setTouched(prev => new Set(prev).add(fieldName));

    // Clear existing debounce timer
    if (debounceTimers.current[String(fieldName)]) {
      clearTimeout(debounceTimers.current[String(fieldName)]);
    }

    // Set validating status
    setFieldStatus(prev => ({ ...prev, [fieldName]: 'validating' }));

    // Debounce validation
    debounceTimers.current[String(fieldName)] = setTimeout(() => {
      const error = validateField(fieldName, value);

      setErrors(prev => ({
        ...prev,
        [fieldName]: error || undefined
      }));

      setFieldStatus(prev => ({
        ...prev,
        [fieldName]: error ? 'invalid' : 'valid'
      }));
    }, debounceDelay);
  }, [validateOnChange, validateField, debounceDelay]);

  /**
   * Handle field blur
   */
  const handleFieldBlur = useCallback((fieldName: keyof T, value: any) => {
    if (!validateOnBlur) return;

    // Mark as touched
    setTouched(prev => new Set(prev).add(fieldName));

    // Immediate validation on blur
    const error = validateField(fieldName, value);

    setErrors(prev => ({
      ...prev,
      [fieldName]: error || undefined
    }));

    setFieldStatus(prev => ({
      ...prev,
      [fieldName]: error ? 'invalid' : 'valid'
    }));
  }, [validateOnBlur, validateField]);

  /**
   * Reset validation state
   */
  const resetValidation = useCallback(() => {
    setErrors({});
    setTouched(new Set());
    setFieldStatus({});

    // Clear all debounce timers
    Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    debounceTimers.current = {};
  }, []);

  /**
   * Check if field is valid
   */
  const isFieldValid = useCallback((fieldName: keyof T): boolean => {
    return !errors[fieldName] && touched.has(fieldName);
  }, [errors, touched]);

  /**
   * Check if entire form is valid
   */
  const isFormValid = useCallback((): boolean => {
    return Object.keys(rules).every(fieldName =>
      !errors[fieldName as keyof T]
    );
  }, [rules, errors]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  return {
    errors,
    touched,
    fieldStatus,
    validateField,
    validateForm,
    handleFieldChange,
    handleFieldBlur,
    resetValidation,
    isFieldValid,
    isFormValid: isFormValid()
  };
}

export default useFormValidation;
