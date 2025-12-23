/**
 * Image Accessibility Validation Utilities
 *
 * Utilities for validating alt text quality and ensuring images
 * meet accessibility standards (WCAG 2.1 AA).
 *
 * @see https://www.w3.org/WAI/tutorials/images/
 */

import { logger } from './logger';

/**
 * Alt text validation result
 */
export interface AltTextValidationResult {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
}

/**
 * Common problematic alt text patterns
 */
const PROBLEMATIC_PATTERNS = [
  { pattern: /^image$/i, message: 'Alt text should not be just "image"' },
  { pattern: /^photo$/i, message: 'Alt text should not be just "photo"' },
  { pattern: /^picture$/i, message: 'Alt text should not be just "picture"' },
  { pattern: /^img$/i, message: 'Alt text should not be just "img"' },
  { pattern: /^icon$/i, message: 'Alt text should not be just "icon"' },
  { pattern: /^graphic$/i, message: 'Alt text should not be just "graphic"' },
  { pattern: /^untitled$/i, message: 'Alt text should not be "untitled"' },
  { pattern: /^screenshot$/i, message: 'Alt text should describe what the screenshot shows' },
  { pattern: /^image of/i, message: 'Alt text should not start with "image of" - describe the content directly' },
  { pattern: /^picture of/i, message: 'Alt text should not start with "picture of" - describe the content directly' },
  { pattern: /^photo of/i, message: 'Alt text should not start with "photo of" - describe the content directly' },
  { pattern: /^graphic of/i, message: 'Alt text should not start with "graphic of" - describe the content directly' },
  { pattern: /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i, message: 'Alt text should not include file extension' },
  { pattern: /^dsc\d+$/i, message: 'Alt text appears to be a camera filename - provide a meaningful description' },
  { pattern: /^img_\d+$/i, message: 'Alt text appears to be a filename - provide a meaningful description' },
  { pattern: /^https?:\/\//i, message: 'Alt text should not be a URL' },
];

/**
 * Minimum and maximum alt text length recommendations
 */
const ALT_TEXT_MIN_LENGTH = 5;
const ALT_TEXT_MAX_LENGTH = 125;

/**
 * Validates alt text quality and returns warnings/suggestions
 *
 * @param altText - The alt text to validate
 * @param options - Validation options
 * @returns Validation result with warnings and suggestions
 */
export function validateAltText(
  altText: string | undefined | null,
  options: {
    isDecorative?: boolean;
    isLogo?: boolean;
    isAvatar?: boolean;
    contextHint?: string;
  } = {}
): AltTextValidationResult {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Handle decorative images
  if (options.isDecorative) {
    if (altText && altText.trim() !== '') {
      warnings.push('Decorative images should have empty alt text (alt="")');
    }
    return { isValid: true, warnings, suggestions };
  }

  // Check for missing alt text
  if (!altText || altText.trim() === '') {
    warnings.push('Alt text is required for non-decorative images');

    if (options.isLogo) {
      suggestions.push('For logos, describe the company/brand name, e.g., "PattaMap logo"');
    } else if (options.isAvatar) {
      suggestions.push('For avatars, include the person\'s name if known, e.g., "Profile photo of Jane Doe"');
    } else {
      suggestions.push('Describe what the image shows and its purpose in context');
    }

    return { isValid: false, warnings, suggestions };
  }

  const trimmedAlt = altText.trim();

  // Check for problematic patterns
  for (const { pattern, message } of PROBLEMATIC_PATTERNS) {
    if (pattern.test(trimmedAlt)) {
      warnings.push(message);
    }
  }

  // Check length
  if (trimmedAlt.length < ALT_TEXT_MIN_LENGTH) {
    warnings.push(`Alt text is very short (${trimmedAlt.length} chars). Consider adding more detail.`);
    suggestions.push('Good alt text typically describes the content and purpose of the image');
  }

  if (trimmedAlt.length > ALT_TEXT_MAX_LENGTH) {
    warnings.push(`Alt text is too long (${trimmedAlt.length} chars). Keep it under ${ALT_TEXT_MAX_LENGTH} characters.`);
    suggestions.push('For complex images, consider using a figure with figcaption or a longer description elsewhere');
  }

  // Check for redundant phrases
  if (/^(a|an|the)\s/i.test(trimmedAlt)) {
    suggestions.push('Starting with articles (a, an, the) is fine, but often unnecessary');
  }

  // Logo-specific validation
  if (options.isLogo) {
    if (!/logo/i.test(trimmedAlt)) {
      suggestions.push('Consider including "logo" in the alt text for brand images');
    }
  }

  // Avatar-specific validation
  if (options.isAvatar) {
    if (!/(profile|photo|avatar|picture)/i.test(trimmedAlt)) {
      suggestions.push('Consider indicating this is a profile photo or avatar');
    }
  }

  const isValid = warnings.length === 0;

  return { isValid, warnings, suggestions };
}

/**
 * Logs alt text validation results in development
 *
 * @param componentName - Name of the component for logging
 * @param src - Image source URL (for identification)
 * @param result - Validation result
 */
export function logAltTextValidation(
  componentName: string,
  src: string,
  result: AltTextValidationResult
): void {
  if (process.env.NODE_ENV !== 'development') return;

  if (!result.isValid || result.warnings.length > 0) {
    const srcPreview = src?.substring(0, 50) || 'unknown';

    if (!result.isValid) {
      logger.warn(
        `[${componentName}] Accessibility issue: ${result.warnings.join('; ')}. ` +
        `Suggestions: ${result.suggestions.join('; ')}. ` +
        `Image: ${srcPreview}...`
      );
    } else if (result.warnings.length > 0) {
      logger.debug(
        `[${componentName}] Alt text improvement suggestions: ${result.warnings.join('; ')}. ` +
        `Image: ${srcPreview}...`
      );
    }
  }
}

/**
 * Generates a suggested alt text based on context
 *
 * @param context - Context information for generating alt text
 * @returns Suggested alt text
 */
export function suggestAltText(context: {
  type: 'employee' | 'establishment' | 'logo' | 'avatar' | 'gallery';
  name?: string;
  additionalInfo?: string;
}): string {
  const { type, name, additionalInfo } = context;

  switch (type) {
    case 'employee':
      if (name) {
        return additionalInfo
          ? `${name} - ${additionalInfo}`
          : `Profile photo of ${name}`;
      }
      return 'Employee profile photo';

    case 'establishment':
      if (name) {
        return additionalInfo
          ? `${name} - ${additionalInfo}`
          : `Photo of ${name} establishment`;
      }
      return 'Establishment photo';

    case 'logo':
      if (name) {
        return `${name} logo`;
      }
      return 'Company logo';

    case 'avatar':
      if (name) {
        return `Profile picture of ${name}`;
      }
      return 'User profile picture';

    case 'gallery':
      if (additionalInfo) {
        return additionalInfo;
      }
      return 'Gallery image';

    default:
      return '';
  }
}

/**
 * Hook-friendly function to get alt text or generate suggestion
 *
 * @param providedAlt - User-provided alt text
 * @param fallbackContext - Context for generating fallback
 * @returns Alt text to use
 */
export function getAltTextWithFallback(
  providedAlt: string | undefined | null,
  fallbackContext: {
    type: 'employee' | 'establishment' | 'logo' | 'avatar' | 'gallery';
    name?: string;
    additionalInfo?: string;
  }
): string {
  if (providedAlt && providedAlt.trim() !== '') {
    return providedAlt.trim();
  }

  return suggestAltText(fallbackContext);
}

export default {
  validateAltText,
  logAltTextValidation,
  suggestAltText,
  getAltTextWithFallback,
};
