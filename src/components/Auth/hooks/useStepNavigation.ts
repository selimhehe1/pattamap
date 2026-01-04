import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import notification from '../../../utils/notification';
import { Employee, Establishment } from '../../../types';
import type { AvailabilityStatus } from '../../../hooks/useAvailabilityCheck';

// Password validation patterns
const PASSWORD_PATTERNS = {
  lowercase: /[a-z]/,
  uppercase: /[A-Z]/,
  number: /[0-9]/,
  special: /[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/]/
};

interface FormDataForNavigation {
  accountType: 'regular' | 'employee' | 'establishment_owner';
  employeePath: 'claim' | 'create' | null;
  selectedEmployee: Employee | null;
  ownerPath: 'claim' | 'create' | null;
  selectedEstablishmentToClaim: Establishment | null;
  pseudonym: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface UseStepNavigationOptions {
  formData: FormDataForNavigation;
  currentStep: 1 | 2 | 3 | 4;
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
  availabilityStatus?: {
    pseudonym: AvailabilityStatus;
    email: AvailabilityStatus;
  };
}

interface UseStepNavigationReturn {
  handleNext: () => void;
  handlePrevious: () => void;
}

/**
 * Validates password complexity requirements
 */
function validatePasswordComplexity(password: string, t: (key: string) => string): string | null {
  if (!PASSWORD_PATTERNS.lowercase.test(password)) {
    return t('register.passwordNeedsLowercase');
  }
  if (!PASSWORD_PATTERNS.uppercase.test(password)) {
    return t('register.passwordNeedsUppercase');
  }
  if (!PASSWORD_PATTERNS.number.test(password)) {
    return t('register.passwordNeedsNumber');
  }
  if (!PASSWORD_PATTERNS.special.test(password)) {
    return t('register.passwordNeedsSpecial');
  }
  return null;
}

/**
 * Validates credentials (pseudonym, email, password)
 */
function validateCredentials(
  formData: FormDataForNavigation,
  t: (key: string) => string
): string | null {
  if (!formData.pseudonym.trim() || !formData.email.trim() || !formData.password || !formData.confirmPassword) {
    return t('register.fillAllFields');
  }
  if (formData.password !== formData.confirmPassword) {
    return t('register.passwordsDoNotMatch');
  }
  if (formData.password.length < 8) {
    return t('register.passwordTooShort');
  }
  return validatePasswordComplexity(formData.password, t);
}

/**
 * Custom hook for handling step navigation in the registration form
 *
 * Handles all step transitions with appropriate validations:
 * - Step 1 → 2: Account type determines next step
 * - Step 2 → 3: Path selection or credentials validation
 * - Step 3 → 4: Credentials validation or path validation
 * - Step 4: Submit handled by form
 */
export function useStepNavigation({
  formData,
  currentStep,
  setCurrentStep,
  availabilityStatus
}: UseStepNavigationOptions): UseStepNavigationReturn {
  const { t } = useTranslation();

  /**
   * Check if credentials availability allows proceeding
   * Returns error message if blocked, null if OK
   */
  const checkAvailabilityBlock = (): string | null => {
    if (availabilityStatus?.pseudonym === 'taken') {
      return t('register.pseudonymTaken', 'This pseudonym is already taken');
    }
    if (availabilityStatus?.email === 'taken') {
      return t('register.emailTaken', 'This email is already registered');
    }
    return null;
  };

  const handleNext = useCallback(() => {
    // Step 1 → Step 2
    if (currentStep === 1) {
      if (formData.accountType === 'employee') {
        // Employee: Step 2 = claim/create path selection
        setCurrentStep(2);
      } else if (formData.accountType === 'establishment_owner') {
        // Owner Step 2 = CREDENTIALS FIRST
        setCurrentStep(2);
      } else {
        // Regular: Skip to credentials (Step 3 internally, displayed as Step 2)
        setCurrentStep(3);
      }
      return;
    }

    // Step 2 → Step 3
    if (currentStep === 2) {
      // Employee path validation
      if (formData.accountType === 'employee') {
        if (!formData.employeePath) {
          notification.error(t('register.selectPathFirst'));
          return;
        }
        if (formData.employeePath === 'claim' && !formData.selectedEmployee) {
          notification.error(t('register.selectEmployeeFirst'));
          return;
        }
        setCurrentStep(3);
        return;
      }

      // Owner Step 2 = CREDENTIALS → validate then go to Step 3
      if (formData.accountType === 'establishment_owner') {
        // Check availability first
        const availabilityError = checkAvailabilityBlock();
        if (availabilityError) {
          notification.error(availabilityError);
          return;
        }
        const credentialError = validateCredentials(formData, t);
        if (credentialError) {
          notification.error(credentialError);
          return;
        }
        setCurrentStep(3);
        return;
      }
    }

    // Step 3 → Step 4 or submit
    if (currentStep === 3) {
      // Employee create path: validate credentials then go to step 4
      if (formData.accountType === 'employee' && formData.employeePath === 'create') {
        // Check availability first
        const availabilityError = checkAvailabilityBlock();
        if (availabilityError) {
          notification.error(availabilityError);
          return;
        }
        const credentialError = validateCredentials(formData, t);
        if (credentialError) {
          notification.error(credentialError);
          return;
        }
        setCurrentStep(4);
        return;
      }

      // Owner Step 3 = claim/create path selection
      if (formData.accountType === 'establishment_owner') {
        if (!formData.ownerPath) {
          notification.error(t('register.selectPathFirst'));
          return;
        }
        if (formData.ownerPath === 'claim' && !formData.selectedEstablishmentToClaim) {
          notification.error(t('register.selectEstablishmentFirst'));
          return;
        }
        if (formData.ownerPath === 'create') {
          // Go to Step 4 for establishment creation form
          setCurrentStep(4);
          return;
        }
        // If claim → submit is handled by form onSubmit
      }
      // For claim/regular/owner, submit is handled by form onSubmit
    }
    // Step 4 → Submit (handled by form onSubmit)
  }, [currentStep, formData, setCurrentStep, t, availabilityStatus]);

  const handlePrevious = useCallback(() => {
    if (currentStep === 4) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (formData.accountType === 'employee' || formData.accountType === 'establishment_owner') {
        // Both employees and owners have Step 2
        setCurrentStep(2);
      } else {
        setCurrentStep(1);
      }
    } else if (currentStep === 2) {
      setCurrentStep(1);
    }
  }, [currentStep, formData.accountType, setCurrentStep]);

  return {
    handleNext,
    handlePrevious
  };
}

export default useStepNavigation;
