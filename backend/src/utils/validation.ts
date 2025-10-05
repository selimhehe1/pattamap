// Security validation utilities

// Input sanitization for SQL injection prevention
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Remove null bytes and trim
  return input.replace(/\0/g, '').trim();
};

// SQL injection detection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
  /(--|\/\*|\*\/|;|'|"|`)/g,
  /(script|javascript|vbscript|onload|onerror)/gi,
  /(<|>|&lt;|&gt;)/g
];

// Validate input against SQL injection
export const validateAgainstSQLInjection = (input: string): boolean => {
  if (!input || typeof input !== 'string') {
    return true; // Empty input is safe
  }

  return !SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
};

// Validate and sanitize text input
export const validateTextInput = (
  input: string,
  minLength: number = 0,
  maxLength: number = 1000,
  allowEmpty: boolean = false
): { valid: boolean; sanitized?: string; error?: string } => {

  if (!input && !allowEmpty) {
    return { valid: false, error: 'Input is required' };
  }

  if (!input && allowEmpty) {
    return { valid: true, sanitized: '' };
  }

  if (typeof input !== 'string') {
    return { valid: false, error: 'Input must be a string' };
  }

  const sanitized = sanitizeInput(input);

  if (sanitized.length < minLength) {
    return { valid: false, error: `Input must be at least ${minLength} characters` };
  }

  if (sanitized.length > maxLength) {
    return { valid: false, error: `Input must be at most ${maxLength} characters` };
  }

  if (!validateAgainstSQLInjection(sanitized)) {
    return { valid: false, error: 'Input contains invalid characters' };
  }

  return { valid: true, sanitized };
};

// Validate numeric input
export const validateNumericInput = (
  input: any,
  min?: number,
  max?: number
): { valid: boolean; value?: number; error?: string } => {

  const num = Number(input);

  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, error: 'Input must be a valid number' };
  }

  if (min !== undefined && num < min) {
    return { valid: false, error: `Number must be at least ${min}` };
  }

  if (max !== undefined && num > max) {
    return { valid: false, error: `Number must be at most ${max}` };
  }

  return { valid: true, value: num };
};

// Validate UUID format
export const validateUUID = (input: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(input);
};

// Validate email format (same as authController but centralized)
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

// Validate URL format
export const validateURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Sanitize for PostgreSQL queries (escape single quotes)
export const escapeSQLString = (input: string): string => {
  return input.replace(/'/g, "''");
};

// Validate and prepare filter parameters for safe SQL usage
export const prepareFilterParams = (params: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    // Validate key name to prevent injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      throw new Error(`Invalid parameter name: ${key}`);
    }

    if (typeof value === 'string') {
      const validation = validateTextInput(value, 0, 1000, true);
      if (!validation.valid) {
        throw new Error(`Invalid value for ${key}: ${validation.error}`);
      }
      sanitized[key] = validation.sanitized;
    } else if (typeof value === 'number') {
      const validation = validateNumericInput(value);
      if (!validation.valid) {
        throw new Error(`Invalid numeric value for ${key}: ${validation.error}`);
      }
      sanitized[key] = validation.value;
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    } else {
      throw new Error(`Unsupported parameter type for ${key}`);
    }
  }

  return sanitized;
};