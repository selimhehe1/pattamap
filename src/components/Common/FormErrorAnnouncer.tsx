import React, { useEffect, useState, useMemo } from 'react';
import LiveRegion from './LiveRegion';

/**
 * FormErrorAnnouncer - Accessible Form Error Announcements
 *
 * Announces form validation errors to screen readers using ARIA live regions.
 * Required for WCAG 2.1 Level AA compliance.
 *
 * Features:
 * - Announces errors for touched fields only
 * - Debounces announcements to avoid rapid-fire messages
 * - Uses assertive politeness for immediate feedback
 * - Summarizes multiple errors
 *
 * @example
 * const { errors, touched } = useFormValidation(formData, rules);
 *
 * <FormErrorAnnouncer errors={errors} touched={touched} />
 *
 * @see https://www.w3.org/WAI/tutorials/forms/notifications/
 */

export interface FormErrorAnnouncerProps {
  /** Object containing field names and their error messages */
  errors: Record<string, string | undefined>;

  /** Object containing field names and their touched state */
  touched: Record<string, boolean>;

  /** Delay before announcing errors in ms (default: 500) */
  debounceDelay?: number;

  /** Custom prefix for the announcement (default: '') */
  announcePrefix?: string;

  /** Whether to announce individual errors or just count (default: true) */
  announceDetails?: boolean;

  /** Maximum number of errors to announce individually (default: 3) */
  maxErrorsToAnnounce?: number;
}

const FormErrorAnnouncer: React.FC<FormErrorAnnouncerProps> = ({
  errors,
  touched,
  debounceDelay = 500,
  announcePrefix = '',
  announceDetails = true,
  maxErrorsToAnnounce = 3,
}) => {
  const [announcement, setAnnouncement] = useState('');

  // Get only the errors for touched fields
  const touchedErrors = useMemo(() => {
    return Object.entries(errors)
      .filter(([field, error]) => touched[field] && error)
      .map(([field, error]) => ({ field, error: error as string }));
  }, [errors, touched]);

  // Create error fingerprint to detect changes
  const errorFingerprint = useMemo(() => {
    return touchedErrors.map(e => `${e.field}:${e.error}`).sort().join('|');
  }, [touchedErrors]);

  // Debounce and create announcement
  useEffect(() => {
    if (touchedErrors.length === 0) {
      setAnnouncement('');
      return;
    }

    const timer = setTimeout(() => {
      let message = announcePrefix;

      if (touchedErrors.length === 1) {
        // Single error - announce directly
        message += touchedErrors[0].error;
      } else if (announceDetails && touchedErrors.length <= maxErrorsToAnnounce) {
        // Multiple errors, few enough to list
        message += `${touchedErrors.length} errors: ${touchedErrors.map(e => e.error).join('. ')}`;
      } else {
        // Too many errors, just announce count
        message += `${touchedErrors.length} form errors. Please review the highlighted fields.`;
      }

      setAnnouncement(message);
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [errorFingerprint, touchedErrors, debounceDelay, announcePrefix, announceDetails, maxErrorsToAnnounce]);

  return (
    <LiveRegion
      message={announcement}
      politeness="assertive"
      autoClear={true}
      clearDelay={3000}
    />
  );
};

export default FormErrorAnnouncer;

/**
 * useFormErrorAnnouncement Hook
 *
 * Alternative hook-based approach for announcing form errors.
 * Use this when you need more control over announcement timing.
 *
 * @example
 * const announce = useFormErrorAnnouncement();
 *
 * const handleSubmit = () => {
 *   if (!isFormValid) {
 *     announce('Please fix the errors before submitting');
 *   }
 * };
 */
export const useFormErrorAnnouncement = () => {
  const [message, setMessage] = useState('');

  const announce = (text: string) => {
    // Clear first to ensure re-announcement of same message
    setMessage('');
    setTimeout(() => setMessage(text), 50);
  };

  const clear = () => setMessage('');

  const AnnouncerComponent = () => (
    <LiveRegion
      message={message}
      politeness="assertive"
      autoClear={true}
      clearDelay={3000}
    />
  );

  return { announce, clear, AnnouncerComponent };
};
