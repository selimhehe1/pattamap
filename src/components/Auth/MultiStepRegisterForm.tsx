import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Crown, AlertTriangle, Send, Sparkles, Phone, FileText, PersonStanding, Link, MapPin, Search, User, CheckCircle, MessageSquare, Cake, Globe, Loader2, Lock, KeyRound, Mail, Users, UserCog, Rocket, Lightbulb, Store, Building2, FolderOpen, Camera, BookOpen, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFormValidation, ValidationRules } from '../../hooks/useFormValidation';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useEmployeeSearch } from '../../hooks/useEmployees';
import { useEstablishments } from '../../hooks/useEstablishments';
import { useCSRF } from '../../contexts/CSRFContext';
import FormField from '../Common/FormField';
import NationalityTagsInput from '../Forms/NationalityTagsInput';
import { Employee, Establishment, EstablishmentCategory } from '../../types';
import notification from '../../utils/notification';
import { logger } from '../../utils/logger';
import { getZoneLabel, ZONE_OPTIONS } from '../../utils/constants';
import { AccountTypeSelectionStep, CredentialsStep } from './steps';
import { EstablishmentAutocomplete, PhotoUploadGrid, DocumentUploadGrid, StepIndicator } from './components';
import type { AccountType } from './steps/types';
import '../../styles/components/modals.css';
import '../../styles/components/photos.css';

interface MultiStepRegisterFormProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
  /** When true, renders without modal overlay (for use in split-screen layout) */
  embedded?: boolean;
}

interface FormData {
  // Index signature for compatibility with useFormValidation
  [key: string]: unknown;
  // Step 1
  accountType: 'regular' | 'employee' | 'establishment_owner'; // 🆕 v10.1
  // Step 2 (employee only)
  employeePath: 'claim' | 'create' | null;
  selectedEmployee: Employee | null;
  claimMessage: string;
  // Step 3 (owner only) - 🆕 v10.x REORDERED: credentials before claim/create
  ownerPath: 'claim' | 'create' | null;
  selectedEstablishmentToClaim: Establishment | null;
  ownershipDocuments: File[];
  ownershipRequestMessage: string;
  ownershipContactMe: boolean;
  // Step 4 (owner create only) - 🆕 v10.x Establishment Creation
  newEstablishmentName: string;
  newEstablishmentAddress: string;
  newEstablishmentZone: string;
  newEstablishmentCategoryId: number | null;
  newEstablishmentDescription: string;
  newEstablishmentPhone: string;
  newEstablishmentWebsite: string;
  newEstablishmentInstagram: string;
  newEstablishmentTwitter: string;
  newEstablishmentTiktok: string;
  newEstablishmentLogo: File | null;
  // Credentials (Step 2 for owner, Step 3 for others)
  pseudonym: string;
  email: string;
  password: string;
  confirmPassword: string;
  // Step 4 (employee create only) - Photos & Basic Info
  employeeName: string;
  employeeNickname: string;
  employeeAge: string;
  employeeSex: string; // 🆕 v10.x - Gender
  employeeNationality: string[] | null;
  employeeDescription: string;
  photos: File[];
  // Step 5 (employee create only) - Employment
  isFreelance: boolean;
  freelanceNightclubIds: string[];  // 🆕 v10.x - Multiple nightclubs for freelancers
  establishmentId: string;
  // Step 6 (employee create only) - Social Media
  socialMedia: {
    ig: string;
    fb: string;
    line: string;
    tg: string;
    wa: string;
  };
}

/**
 * MultiStepRegisterForm
 *
 * Progressive multi-step registration form with employee claim/create integration
 *
 * Step 1: Account Type Selection (Regular / Employee)
 * Step 2: Employee Path Selection (Claim existing / Create new) - conditional
 * Step 3: Registration Form (with claim integration if applicable)
 */
const MultiStepRegisterForm: React.FC<MultiStepRegisterFormProps> = ({
  onClose,
  onSwitchToLogin,
  embedded = false
}) => {
  const { t } = useTranslation();
  const { register, claimEmployeeProfile, submitOwnershipRequest } = useAuth();
  const { secureFetch } = useSecureFetch();
  const { refreshToken } = useCSRF();

  // Current step state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form data state
  const [formData, setFormData] = useState<FormData>({
    accountType: 'regular',
    employeePath: null,
    selectedEmployee: null,
    claimMessage: '',
    // 🆕 v10.x - Owner path fields
    ownerPath: null,
    selectedEstablishmentToClaim: null,
    ownershipDocuments: [],
    ownershipRequestMessage: '',
    ownershipContactMe: false,
    // 🆕 v10.x - Owner establishment creation fields
    newEstablishmentName: '',
    newEstablishmentAddress: '',
    newEstablishmentZone: '',
    newEstablishmentCategoryId: null,
    newEstablishmentDescription: '',
    newEstablishmentPhone: '',
    newEstablishmentWebsite: '',
    newEstablishmentInstagram: '',
    newEstablishmentTwitter: '',
    newEstablishmentTiktok: '',
    newEstablishmentLogo: null,
    pseudonym: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Step 4 fields
    employeeName: '',
    employeeNickname: '',
    employeeAge: '',
    employeeSex: '', // 🆕 v10.x - Gender
    employeeNationality: null,
    employeeDescription: '',
    photos: [],
    // Step 5 fields
    isFreelance: false,
    freelanceNightclubIds: [],  // 🆕 v10.x - Multiple nightclubs for freelancers
    establishmentId: '',
    // Step 6 fields
    socialMedia: {
      ig: '',
      fb: '',
      line: '',
      tg: '',
      wa: ''
    }
  });

  // Employee search state (Step 2)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Establishment autocomplete state (Step 2 - Employee)
  const [establishmentSearchStep2, setEstablishmentSearchStep2] = useState('');

  // 🆕 v10.x - Owner establishment claim state (Step 2 - Owner)
  const [ownerEstablishmentSearch, setOwnerEstablishmentSearch] = useState('');
  const [_uploadingOwnershipDocs, setUploadingOwnershipDocs] = useState(false);
  const [ownershipDocErrors, setOwnershipDocErrors] = useState<string>('');


  // Establishment autocomplete state (Step 4)
  const [establishmentSearchStep4, setEstablishmentSearchStep4] = useState('');

  // React Query hooks for establishments and employee search
  const { data: establishments = [] } = useEstablishments();

  // 🆕 v10.x - Filter nightclubs only (for freelance multi-select)
  const nightclubs = useMemo(() => {
    return establishments.filter(est => est.category?.name === 'Nightclub');
  }, [establishments]);

  const { data: employeeSearchResults, isLoading: isLoadingEmployees } = useEmployeeSearch({
    q: searchQuery || undefined,
    establishment_id: selectedEstablishmentId || undefined
  });

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [photoErrors, setPhotoErrors] = useState<string>('');
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 🆕 v10.x - Owner establishment creation states
  const [categories, setCategories] = useState<EstablishmentCategory[]>([]);
  const [_ownerLogoPreview, _setOwnerLogoPreview] = useState<string | null>(null);
  const [_uploadingOwnerLogo, _setUploadingOwnerLogo] = useState(false);

  // Validation rules for Step 3
  const validationRules: ValidationRules<FormData> = {
    pseudonym: {
      required: true,
      minLength: 3,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9_]+$/,
      message: (field, rule) => {
        if (rule === 'required') return t('register.pseudonymRequired');
        if (rule === 'minLength') return t('register.pseudonymMinLength');
        if (rule === 'maxLength') return t('register.pseudonymMaxLength');
        if (rule === 'pattern') return t('register.pseudonymPattern');
        return t('register.pseudonymInvalid');
      }
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: (field, rule) => {
        if (rule === 'required') return t('register.emailRequired');
        if (rule === 'pattern') return t('register.emailInvalid');
        return t('register.emailInvalid');
      }
    },
    password: {
      required: true,
      minLength: 8, // 🔧 FIX P1: Changed from 12 to 8 (user request)
      custom: (value) => {
        const pwd = value as string;
        if (pwd.length < 8) return true; // Let minLength handle this
        if (!/[a-z]/.test(pwd)) return t('register.passwordNeedsLowercase');
        if (!/[A-Z]/.test(pwd)) return t('register.passwordNeedsUppercase');
        if (!/[0-9]/.test(pwd)) return t('register.passwordNeedsNumber');
        if (!/[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/]/.test(pwd)) return t('register.passwordNeedsSpecial');
        return true;
      },
      message: (field, rule) => {
        if (rule === 'required') return t('register.passwordRequired');
        if (rule === 'minLength') return t('auth.passwordMinLength', { min: 8 });
        return t('register.passwordInvalid');
      }
    },
    confirmPassword: {
      required: true,
      custom: (value) => {
        if (value !== formData.password) return t('register.passwordsNoMatch');
        return true;
      },
      message: t('register.passwordsMustMatch')
    },
    claimMessage: {
      required: formData.employeePath === 'claim',
      minLength: 10,
      message: (field, rule) => {
        if (rule === 'required') return t('register.claimMessageRequired');
        if (rule === 'minLength') return t('register.claimMessageTooShort');
        return t('register.claimMessageInvalid');
      }
    }
  };

  // Initialize validation hook
  const {
    errors,
    fieldStatus,
    handleFieldChange,
    handleFieldBlur,
    validateForm
  } = useFormValidation(formData, validationRules, {
    validateOnChange: true,
    validateOnBlur: true,
    debounceDelay: 500
  });

  // Initialize auto-save hook
  const { isDraft, clearDraft, restoreDraft, lastSaved, isSaving } = useAutoSave({
    key: 'multistep-register-form-draft',
    data: formData,
    debounceMs: 2000,
    enabled: true
  });

  // Restore draft on mount
  useEffect(() => {
    if (isDraft) {
      const draft = restoreDraft();
      if (draft) {
        setFormData(draft);
        setShowDraftBanner(true);
        notification.success(t('register.draftRestoredToast'));
        // Restore step based on draft data
        if (draft.pseudonym || draft.email) {
          setCurrentStep(3);
        } else if (draft.employeePath) {
          setCurrentStep(2);
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 🆕 v10.x - Fetch categories for owner establishment creation
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/establishments/categories`);
        const data = await response.json();
        if (data.categories) {
          setCategories(data.categories);
        }
      } catch (error) {
        logger.error('Error fetching categories:', error);
      }
    };
    // Only fetch if owner account type is selected
    if (formData.accountType === 'establishment_owner') {
      fetchCategories();
    }
  }, [formData.accountType]);

  // Handle employee selection from grid
  const handleEmployeeSelect = (employee: Employee) => {
    setFormData(prev => ({ ...prev, selectedEmployee: employee }));
  };

  const handleInputChange = (fieldName: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    if (fieldName in validationRules) {
      handleFieldChange(fieldName, value);
    }
    setSubmitError('');
  };

  const handleInputBlur = (fieldName: keyof FormData, value: FormData[keyof FormData]) => {
    if (fieldName in validationRules) {
      handleFieldBlur(fieldName, value);
    }
  };

  const uploadPhotos = async (explicitCsrfToken?: string) => {
    if (formData.photos.length === 0) return [];

    setUploadingPhotos(true);
    try {
      const formDataMultipart = new FormData();
      formData.photos.forEach(photo => {
        formDataMultipart.append('images', photo);
      });

      // 🔧 CSRF FIX: Use explicit CSRF token if provided (from registration)
      // Otherwise use secureFetch which will handle token refresh
      if (explicitCsrfToken) {
        logger.debug('🛡️ Using explicit CSRF token for photo upload');

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload/images`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'X-CSRF-Token': explicitCsrfToken
          },
          body: formDataMultipart
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload photos');
        }

        return data.images.map((img: { url: string }) => img.url);
      } else {
        // Fallback to secureFetch for other cases (not during registration)
        logger.debug('🛡️ Refreshing CSRF token before photo upload...');
        await refreshToken();
        await new Promise(resolve => setTimeout(resolve, 500));

        const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/upload/images`, {
          method: 'POST',
          body: formDataMultipart
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload photos');
        }

        return data.images.map((img: { url: string }) => img.url);
      }
    } catch (error) {
      logger.error('Photo upload error:', error);
      throw error;
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleNext = () => {
    // Step 1 → Step 2
    if (currentStep === 1) {
      if (formData.accountType === 'employee') {
        // Employee: Step 2 = claim/create path selection
        setCurrentStep(2);
      } else if (formData.accountType === 'establishment_owner') {
        // 🆕 v10.x NEW FLOW: Owner Step 2 = CREDENTIALS FIRST
        setCurrentStep(2);
      } else {
        // Regular: Skip to credentials (Step 3 internally, displayed as Step 2)
        setCurrentStep(3);
      }
    }
    // Step 2 → Step 3
    else if (currentStep === 2) {
      // Employee path validation (Step 2 = path selection for employees)
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
      }
      // 🆕 v10.x NEW FLOW: Owner Step 2 = CREDENTIALS → validate then go to Step 3
      else if (formData.accountType === 'establishment_owner') {
        // Validate credentials before proceeding
        if (!formData.pseudonym.trim() || !formData.email.trim() || !formData.password || !formData.confirmPassword) {
          notification.error(t('register.fillAllFields'));
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          notification.error(t('register.passwordsDoNotMatch'));
          return;
        }
        if (formData.password.length < 8) {
          notification.error(t('register.passwordTooShort'));
          return;
        }
        // Validate password complexity
        if (!/[a-z]/.test(formData.password)) {
          notification.error(t('register.passwordNeedsLowercase'));
          return;
        }
        if (!/[A-Z]/.test(formData.password)) {
          notification.error(t('register.passwordNeedsUppercase'));
          return;
        }
        if (!/[0-9]/.test(formData.password)) {
          notification.error(t('register.passwordNeedsNumber'));
          return;
        }
        if (!/[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/]/.test(formData.password)) {
          notification.error(t('register.passwordNeedsSpecial'));
          return;
        }
        setCurrentStep(3);
      }
    }
    // Step 3 → Step 4 or submit
    else if (currentStep === 3) {
      if (formData.accountType === 'employee' && formData.employeePath === 'create') {
        // Validate credentials before proceeding to step 4
        if (!formData.pseudonym.trim() || !formData.email.trim() || !formData.password || !formData.confirmPassword) {
          notification.error(t('register.fillAllFields'));
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          notification.error(t('register.passwordsDoNotMatch'));
          return;
        }
        if (formData.password.length < 8) {
          notification.error(t('register.passwordTooShort'));
          return;
        }
        // Validate password complexity
        if (!/[a-z]/.test(formData.password)) {
          notification.error(t('register.passwordNeedsLowercase'));
          return;
        }
        if (!/[A-Z]/.test(formData.password)) {
          notification.error(t('register.passwordNeedsUppercase'));
          return;
        }
        if (!/[0-9]/.test(formData.password)) {
          notification.error(t('register.passwordNeedsNumber'));
          return;
        }
        if (!/[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/]/.test(formData.password)) {
          notification.error(t('register.passwordNeedsSpecial'));
          return;
        }
        setCurrentStep(4);
      }
      // 🆕 v10.x NEW FLOW: Owner Step 3 = claim/create path selection
      else if (formData.accountType === 'establishment_owner') {
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
        }
        // If claim → submit is handled by form onSubmit
      }
      // For claim/regular/owner, submit is handled by form onSubmit
    }
    // Step 4 → Submit (handled by form onSubmit)
  };

  const handlePrevious = () => {
    if (currentStep === 4) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (formData.accountType === 'employee' || formData.accountType === 'establishment_owner') {
        // 🆕 v10.x - Both employees and owners have Step 2
        setCurrentStep(2);
      } else {
        setCurrentStep(1);
      }
    } else if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      notification.error(t('register.fixErrorsToast'));
      return;
    }

    // 🆕 Early validation for employee fields BEFORE creating account
    // This prevents orphaned user accounts when employee profile validation fails
    if (formData.accountType === 'employee' && formData.employeePath === 'create') {
      if (!formData.employeeName.trim()) {
        notification.error(t('register.employeeNameRequired', 'Employee name is required'));
        return;
      }
      if (!formData.employeeSex) {
        notification.error(t('register.employeeSexRequired', 'Please select your sex/gender'));
        return;
      }
      if (!formData.isFreelance && !formData.establishmentId) {
        notification.error(t('register.establishmentRequired', 'Please select an establishment or enable Freelance Mode'));
        return;
      }
    }

    setIsLoading(true);

    try {
      // 🔧 CSRF FIX: Register user account and get fresh CSRF token
      const result = await register(
        formData.pseudonym,
        formData.email,
        formData.password,
        formData.accountType
      );
      const freshToken = result?.csrfToken;

      // ⚠️ Show warning if password was found in breach database
      if (result?.passwordBreached) {
        notification.warning(t('register.passwordBreachWarning', 'Your password has been found in a data breach. Consider changing it for better security.'), {
          duration: 10000 // Show longer (10 seconds)
        });
      }

      clearDraft(); // Clear draft on successful submission

      // Handle different post-registration flows
      if (formData.accountType === 'regular') {
        notification.success(t('register.accountCreated'));
        onClose();
      } else if (formData.accountType === 'establishment_owner') {
        // 🆕 v10.x - Handle owner claim or create paths
        if (formData.ownerPath === 'claim' && formData.selectedEstablishmentToClaim) {
          // Upload documents if any
          let documentUrls: string[] = [];
          if (formData.ownershipDocuments.length > 0) {
            setUploadingOwnershipDocs(true);
            try {
              const uploadFormData = new FormData();
              formData.ownershipDocuments.forEach(doc => {
                uploadFormData.append('images', doc);
              });

              const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/upload/images`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'X-CSRF-Token': freshToken || ''
                },
                body: uploadFormData
              });

              if (uploadResponse.ok) {
                const uploadData = await uploadResponse.json();
                documentUrls = uploadData.images.map((img: { url: string }) => img.url);
              }
            } catch (uploadError) {
              logger.warn('Document upload failed, continuing without documents:', uploadError);
            } finally {
              setUploadingOwnershipDocs(false);
            }
          }

          // Submit ownership request
          await submitOwnershipRequest!(
            formData.selectedEstablishmentToClaim.id,
            documentUrls,
            formData.ownershipRequestMessage || undefined,
            formData.ownershipContactMe,
            freshToken || undefined
          );

          notification.success(t('register.ownerClaimSubmitted'));
          onClose();
        } else if (formData.ownerPath === 'create') {
          // 🆕 v10.x - Create new establishment
          try {
            const establishmentData = {
              name: formData.newEstablishmentName.trim(),
              address: formData.newEstablishmentAddress.trim(),
              zone: formData.newEstablishmentZone,
              category_id: formData.newEstablishmentCategoryId,
              description: formData.newEstablishmentDescription.trim() || undefined,
              phone: formData.newEstablishmentPhone.trim() || undefined,
              website: formData.newEstablishmentWebsite.trim() || undefined,
              instagram: formData.newEstablishmentInstagram.trim() || undefined,
              twitter: formData.newEstablishmentTwitter.trim() || undefined,
              tiktok: formData.newEstablishmentTiktok.trim() || undefined
            };

            const createResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/establishments`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': freshToken || ''
              },
              body: JSON.stringify(establishmentData)
            });

            if (!createResponse.ok) {
              const errorData = await createResponse.json();
              throw new Error(errorData.error || t('register.establishmentCreationFailed'));
            }

            const createData = await createResponse.json();
            const newEstablishmentId = createData.establishment?.id;

            // Auto-submit ownership request for the new establishment
            if (newEstablishmentId) {
              await submitOwnershipRequest!(
                newEstablishmentId,
                [], // No documents needed for self-created establishment
                t('register.selfCreatedEstablishmentMessage'),
                false,
                freshToken || undefined
              );
            }

            notification.success(t('register.establishmentCreatedPending'));
            onClose();
          } catch (createError) {
            logger.error('Establishment creation failed:', createError);
            throw createError;
          }
        } else {
          // No path selected - just created account (shouldn't happen normally)
          notification.success(t('register.ownerAccountCreated'));
          onClose();
        }
      } else if (formData.employeePath === 'claim') {
        // 🔧 CSRF FIX: Use the fresh token directly (no delay needed!)
        // Claim existing profile with explicit fresh token
        await claimEmployeeProfile!(
          formData.selectedEmployee!.id,
          formData.claimMessage.trim(),
          [],
          freshToken || undefined // Pass fresh token explicitly
        );
        notification.success(t('register.claimSubmitted'));
        onClose();
      } else if (formData.employeePath === 'create') {
        // Create new profile with uploaded photos

        // Validate required employee fields
        if (!formData.employeeName.trim()) {
          throw new Error(t('register.employeeNameRequired', 'Employee name is required'));
        }
        if (!formData.employeeSex) {
          throw new Error(t('register.employeeSexRequired', 'Please select your sex/gender'));
        }
        // 🆕 Business rule: Non-freelance employees MUST have an establishment
        if (!formData.isFreelance && !formData.establishmentId) {
          throw new Error(t('register.establishmentRequired', 'Please select an establishment or enable Freelance Mode'));
        }

        notification.info(t('register.creatingEmployeeProfile'));

        // 🔧 CSRF FIX: Validate fresh token is available
        if (!freshToken) {
          throw new Error(t('register.sessionSyncError'));
        }

        // Upload photos (using fresh token from registration)
        const photoUrls = await uploadPhotos(freshToken);

        // 🆕 v10.0.2 - Use /my-profile endpoint to auto-link employee to user account
        // This endpoint creates the bidirectional link (user.linked_employee_id & employee.user_id)
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/employees/my-profile`, {
          method: 'POST',
          credentials: 'include', // Include auth cookie
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': freshToken // Use fresh token directly (type-safe now)
          },
          body: JSON.stringify({
            name: formData.employeeName,
            nickname: formData.employeeNickname || undefined,
            age: formData.employeeAge ? parseInt(formData.employeeAge) : undefined,
            sex: formData.employeeSex, // 🆕 v10.x - Gender
            nationality: formData.employeeNationality,
            description: formData.employeeDescription || undefined,
            photos: photoUrls,
            is_freelance: formData.isFreelance,
            current_establishment_id: !formData.isFreelance && formData.establishmentId ? formData.establishmentId : undefined,
            current_establishment_ids: formData.isFreelance && formData.freelanceNightclubIds.length > 0
              ? formData.freelanceNightclubIds
              : undefined,
            social_media: Object.fromEntries(
              Object.entries(formData.socialMedia).filter(([_, value]) => value.trim() !== '')
            )
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create employee profile');
        }

        notification.success(t('register.employeeProfileCreated'));
        onClose();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('register.registrationFailed');
      setSubmitError(errorMessage);
      notification.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Form content (shared between embedded and standalone modes)
  const formContent = (
    <div className={embedded ? "auth-form-register-content" : "modal-content-unified modal--large"}>
      {/* Close button only shown in standalone mode */}
      {!embedded && (
        <button
          onClick={handleClose}
          className="modal-close-btn"
          aria-label="Close"
          data-testid="close-multistep-register-modal"
        >
          ×
        </button>
      )}

        {/* Header */}
        <div className="modal-header">
          <h2 className="header-title-nightlife">
            {t('register.title')}
          </h2>
          <p className="modal-subtitle">
            {currentStep === 1 && t('register.stepSubtitle1')}
            {currentStep === 2 && t('register.stepSubtitle2')}
            {currentStep === 3 && t('register.stepSubtitle3')}
            {currentStep === 4 && t('register.stepSubtitle4')}
          </p>
        </div>

        {/* Progress Bar */}
        <StepIndicator
          currentStep={currentStep}
          accountType={formData.accountType}
          path={formData.accountType === 'employee' ? formData.employeePath : formData.ownerPath}
        />

        {/* Draft restoration banner */}
        {showDraftBanner && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,229,255,0.2))',
            border: '2px solid #00E5FF',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={20} />
              <div>
                <div style={{ color: '#00E5FF', fontSize: '14px', fontWeight: 'bold' }}>
                  {t('register.draftRestored')}
                </div>
                <div style={{ color: '#cccccc', fontSize: '12px' }}>
                  {lastSaved && t('register.draftSaved', { time: new Date(lastSaved).toLocaleTimeString() })}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                clearDraft();
                setFormData({
                  accountType: 'regular',
                  employeePath: null,
                  selectedEmployee: null,
                  claimMessage: '',
                  // 🆕 v10.x - Owner path fields
                  ownerPath: null,
                  selectedEstablishmentToClaim: null,
                  ownershipDocuments: [],
                  ownershipRequestMessage: '',
                  ownershipContactMe: false,
                  // 🆕 v10.x - Owner establishment creation fields
                  newEstablishmentName: '',
                  newEstablishmentAddress: '',
                  newEstablishmentZone: '',
                  newEstablishmentCategoryId: null,
                  newEstablishmentDescription: '',
                  newEstablishmentPhone: '',
                  newEstablishmentWebsite: '',
                  newEstablishmentInstagram: '',
                  newEstablishmentTwitter: '',
                  newEstablishmentTiktok: '',
                  newEstablishmentLogo: null,
                  pseudonym: '',
                  email: '',
                  password: '',
                  confirmPassword: '',
                  // Step 4 fields
                  employeeName: '',
                  employeeNickname: '',
                  employeeAge: '',
                  employeeSex: '', // 🆕 v10.x - Gender
                  employeeNationality: null,
                  employeeDescription: '',
                  photos: [],
                  // Step 5 fields
                  isFreelance: false,
                  freelanceNightclubIds: [],
                  establishmentId: '',
                  // Step 6 fields
                  socialMedia: {
                    ig: '',
                    fb: '',
                    line: '',
                    tg: '',
                    wa: ''
                  }
                });
                setShowDraftBanner(false);
                setCurrentStep(1);
                notification.success(t('register.draftCleared'));
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#C19A6B';
                e.currentTarget.style.color = '#C19A6B';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.color = '#ffffff';
              }}
            >
              {t('register.clearDraft')}
            </button>
          </div>
        )}

        {/* Auto-save indicator */}
        {isSaving && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '60px',
            background: 'rgba(0,0,0,0.8)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            color: '#00E5FF',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              border: '2px solid transparent',
              borderTop: '2px solid #00E5FF',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            {t('register.savingDraft')}
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="form-layout" data-testid="multistep-register-form">
          {/* STEP 1: Account Type Selection */}
          {currentStep === 1 && (
            <AccountTypeSelectionStep
              accountType={formData.accountType}
              onAccountTypeChange={(type: AccountType) => handleInputChange('accountType', type)}
              onNext={handleNext}
            />
          )}

          {/* STEP 2: Employee Path Selection (Claim or Create) */}
          {currentStep === 2 && formData.accountType === 'employee' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#C19A6B',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '10px'
              }}>
                <Rocket size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('register.choosePath')}
              </label>

              {/* Option: Claim Existing Profile */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                border: `2px solid ${formData.employeePath === 'claim' ? '#00E5FF' : 'rgba(255,255,255,0.2)'}`,
                borderRadius: '12px',
                background: formData.employeePath === 'claim'
                  ? 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,229,255,0.2))'
                  : 'rgba(0,0,0,0.3)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginBottom: '12px'
              }}>
                <input
                  type="radio"
                  name="employeePath"
                  value="claim"
                  checked={formData.employeePath === 'claim'}
                  onChange={() => handleInputChange('employeePath', 'claim')}
                  style={{ accentColor: '#00E5FF' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '15px' }}>
                    <Link size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.claimExistingProfile')}
                  </div>
                  <div style={{ color: '#cccccc', fontSize: '12px', marginTop: '4px' }}>
                    {t('register.claimExistingProfileDesc')}
                  </div>
                </div>
              </label>

              {/* Claim Search Section - Enhanced with Establishment Filter & Grid */}
              {formData.employeePath === 'claim' && (
                <div style={{ marginBottom: '16px', paddingLeft: '16px' }}>
                  {/* Establishment Filter with Autocomplete */}
                  <div style={{ marginBottom: '12px' }}>
                    <EstablishmentAutocomplete
                      value={establishmentSearchStep2}
                      onChange={(value) => {
                        setEstablishmentSearchStep2(value);
                        // Clear selection if user types
                        if (selectedEstablishmentId) {
                          setSelectedEstablishmentId(null);
                        }
                      }}
                      onSelect={(est) => {
                        setSelectedEstablishmentId(est.id);
                        setEstablishmentSearchStep2(est.name);
                      }}
                      onClear={() => setSelectedEstablishmentId(null)}
                      establishments={establishments}
                      label={t('register.filterByEstablishment')}
                      selectedId={selectedEstablishmentId}
                    />
                  </div>

                  {/* Text Search Input */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{
                      display: 'block',
                      color: '#00E5FF',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      marginBottom: '8px'
                    }}>
                      <Search size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.searchByName')}
                    </label>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('register.typeToSearch')}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontSize: '14px',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  </div>

                  {/* Employee Grid */}
                  <div style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    marginBottom: '12px',
                    padding: '8px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    {isLoadingEmployees ? (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '40px',
                        color: '#00E5FF'
                      }}>
                        <span className="loading-spinner-small-nightlife" style={{ marginRight: '10px' }} />
                        {t('register.loadingEmployees')}
                      </div>
                    ) : employeeSearchResults && employeeSearchResults.employees && employeeSearchResults.employees.length > 0 ? (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '12px'
                      }}>
                        {employeeSearchResults.employees.map((employee) => (
                          <div
                            key={employee.id}
                            onClick={() => handleEmployeeSelect(employee)}
                            style={{
                              padding: '12px',
                              background: formData.selectedEmployee?.id === employee.id
                                ? 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,229,255,0.3))'
                                : 'rgba(0,0,0,0.3)',
                              border: formData.selectedEmployee?.id === employee.id
                                ? '2px solid #00E5FF'
                                : '2px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              textAlign: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (formData.selectedEmployee?.id !== employee.id) {
                                e.currentTarget.style.borderColor = '#00E5FF';
                                e.currentTarget.style.background = 'rgba(0,229,255,0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (formData.selectedEmployee?.id !== employee.id) {
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
                              }
                            }}
                          >
                            {employee.photos && employee.photos[0] ? (
                              <img
                                src={employee.photos[0]}
                                alt={employee.name}
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  margin: '0 auto 8px'
                                }}
                              />
                            ) : (
                              <div style={{
                                width: '60px',
                                height: '60px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                margin: '0 auto 8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px'
                              }}>
                                <User size={24} />
                              </div>
                            )}
                            <div style={{
                              color: '#ffffff',
                              fontWeight: 'bold',
                              fontSize: '13px',
                              marginBottom: '4px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {employee.name}
                            </div>
                            {employee.nickname && (
                              <div style={{
                                color: '#cccccc',
                                fontSize: '11px',
                                marginBottom: '4px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                "{employee.nickname}"
                              </div>
                            )}
                            {(employee.age || employee.nationality) && (
                              <div style={{
                                color: '#999999',
                                fontSize: '10px',
                                marginTop: '4px'
                              }}>
                                {employee.age && `${employee.age}y`}
                                {employee.age && employee.nationality && ' • '}
                                {Array.isArray(employee.nationality) ? employee.nationality.join(' / ') : employee.nationality}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: '#999999',
                        fontSize: '14px'
                      }}>
                        {searchQuery || selectedEstablishmentId
                          ? t('register.noEmployeesFound')
                          : t('register.startTypingOrSelect')
                        }
                      </div>
                    )}
                  </div>

                  {/* Selected Employee Preview */}
                  {formData.selectedEmployee && (
                    <div style={{
                      padding: '12px',
                      background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,229,255,0.2))',
                      border: '2px solid #00E5FF',
                      borderRadius: '12px',
                      marginTop: '12px',
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#00E5FF', fontSize: '13px' }}>
                        <CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.selectedProfile')}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {formData.selectedEmployee.photos && formData.selectedEmployee.photos[0] && (
                          <img
                            src={formData.selectedEmployee.photos[0]}
                            alt={formData.selectedEmployee.name}
                            style={{
                              width: '50px',
                              height: '50px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                            }}
                          />
                        )}
                        <div>
                          <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}>
                            {formData.selectedEmployee.name}
                          </div>
                          {formData.selectedEmployee.nickname && (
                            <div style={{ color: '#cccccc', fontSize: '12px' }}>
                              aka "{formData.selectedEmployee.nickname}"
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Option: Create New Profile */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                border: `2px solid ${formData.employeePath === 'create' ? '#C19A6B' : 'rgba(255,255,255,0.2)'}`,
                borderRadius: '12px',
                background: formData.employeePath === 'create'
                  ? 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(193, 154, 107,0.2))'
                  : 'rgba(0,0,0,0.3)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}>
                <input
                  type="radio"
                  name="employeePath"
                  value="create"
                  checked={formData.employeePath === 'create'}
                  onChange={() => handleInputChange('employeePath', 'create')}
                  style={{ accentColor: '#C19A6B' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '15px' }}>
                    <Sparkles size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.createNewProfile')}
                  </div>
                  <div style={{ color: '#cccccc', fontSize: '12px', marginTop: '4px' }}>
                    {t('register.createNewProfileDesc')}
                  </div>
                </div>
              </label>

              {/* Navigation Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={handlePrevious}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  }}
                >
                  ← {t('register.backButton')}
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn btn--success"
                  style={{ flex: 2 }}
                >
                  {t('register.nextButton')} →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Owner Credentials */}
          {currentStep === 2 && formData.accountType === 'establishment_owner' && (
            <CredentialsStep
              credentials={{
                pseudonym: formData.pseudonym,
                email: formData.email,
                password: formData.password,
                confirmPassword: formData.confirmPassword
              }}
              errors={{
                pseudonym: errors.pseudonym,
                email: errors.email,
                password: errors.password,
                confirmPassword: errors.confirmPassword
              }}
              fieldStatus={{
                pseudonym: fieldStatus.pseudonym,
                email: fieldStatus.email,
                password: fieldStatus.password,
                confirmPassword: fieldStatus.confirmPassword
              }}
              onFieldChange={(field, value) => handleInputChange(field, value)}
              onFieldBlur={(field, value) => handleInputBlur(field, value)}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />
          )}

          {/* STEP 3: Owner Path Selection (Claim or Create) - 🆕 v10.x REORDERED */}
          {currentStep === 3 && formData.accountType === 'establishment_owner' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#C19A6B',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '10px'
              }}>
                <Crown size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('register.ownerPathTitle')}
              </label>

              {/* Option: Claim Existing Establishment */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                border: `2px solid ${formData.ownerPath === 'claim' ? '#C19A6B' : 'rgba(255,255,255,0.2)'}`,
                borderRadius: '12px',
                background: formData.ownerPath === 'claim'
                  ? 'linear-gradient(135deg, rgba(193,154,107,0.1), rgba(193,154,107,0.2))'
                  : 'rgba(0,0,0,0.3)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginBottom: '12px'
              }}>
                <input
                  type="radio"
                  name="ownerPath"
                  value="claim"
                  checked={formData.ownerPath === 'claim'}
                  onChange={() => handleInputChange('ownerPath', 'claim')}
                  style={{ accentColor: '#C19A6B' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '15px' }}>
                    <Building2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.claimExistingEstablishment')}
                  </div>
                  <div style={{ color: '#cccccc', fontSize: '12px', marginTop: '4px' }}>
                    {t('register.claimExistingEstablishmentDesc')}
                  </div>
                </div>
              </label>

              {/* Claim Establishment Section */}
              {formData.ownerPath === 'claim' && (
                <div style={{ marginBottom: '16px', paddingLeft: '16px' }}>
                  {/* Establishment Search */}
                  <div style={{ marginBottom: '12px' }}>
                    <EstablishmentAutocomplete
                      value={ownerEstablishmentSearch}
                      onChange={(value) => {
                        setOwnerEstablishmentSearch(value);
                        if (formData.selectedEstablishmentToClaim) {
                          handleInputChange('selectedEstablishmentToClaim', null);
                        }
                      }}
                      onSelect={(est) => {
                        handleInputChange('selectedEstablishmentToClaim', est);
                        setOwnerEstablishmentSearch(est.name);
                      }}
                      onClear={() => handleInputChange('selectedEstablishmentToClaim', null)}
                      establishments={establishments}
                      excludeWithOwner={true}
                      label={t('register.searchYourEstablishment')}
                      selectedId={formData.selectedEstablishmentToClaim?.id}
                    />
                  </div>

                  {/* Selected Establishment Preview */}
                  {formData.selectedEstablishmentToClaim && (
                    <div style={{
                      padding: '12px',
                      background: 'rgba(193,154,107,0.1)',
                      border: '1px solid rgba(193,154,107,0.3)',
                      borderRadius: '8px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={16} style={{ color: '#C19A6B' }} />
                        <span style={{ color: '#ffffff', fontWeight: 'bold' }}>
                          {formData.selectedEstablishmentToClaim.name}
                        </span>
                      </div>
                      {formData.selectedEstablishmentToClaim.zone && (
                        <div style={{ color: '#999999', fontSize: '12px', marginTop: '4px', marginLeft: '24px' }}>
                          <MapPin size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          {getZoneLabel(formData.selectedEstablishmentToClaim.zone)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Document Upload Section (Optional) */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      color: '#C19A6B',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      marginBottom: '8px'
                    }}>
                      <Upload size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('register.uploadOwnershipDocuments')}
                      <span style={{ color: '#999999', fontWeight: 'normal', marginLeft: '8px' }}>
                        ({t('register.optional')})
                      </span>
                    </label>
                    <DocumentUploadGrid
                      documents={formData.ownershipDocuments}
                      onChange={(docs) => handleInputChange('ownershipDocuments', docs)}
                      error={ownershipDocErrors}
                      onError={setOwnershipDocErrors}
                      description={t('register.uploadOwnershipDocumentsDesc')}
                      accentColor="#C19A6B"
                    />
                  </div>

                  {/* Contact Me Checkbox */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      padding: '12px',
                      background: formData.ownershipContactMe ? 'rgba(193,154,107,0.1)' : 'transparent',
                      border: `1px solid ${formData.ownershipContactMe ? 'rgba(193,154,107,0.3)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '8px',
                      transition: 'all 0.3s ease'
                    }}>
                      <input
                        type="checkbox"
                        checked={formData.ownershipContactMe}
                        onChange={(e) => handleInputChange('ownershipContactMe', e.target.checked)}
                        style={{ accentColor: '#C19A6B' }}
                      />
                      <div>
                        <div style={{ color: '#ffffff', fontSize: '14px' }}>
                          <Mail size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          {t('register.ownershipContactMe')}
                        </div>
                        <div style={{ color: '#999999', fontSize: '12px', marginTop: '2px' }}>
                          {t('register.ownershipContactMeDesc')}
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Message Textarea */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      color: '#C19A6B',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      marginBottom: '8px'
                    }}>
                      <MessageSquare size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('register.ownershipMessage')}
                      <span style={{ color: '#999999', fontWeight: 'normal', marginLeft: '8px' }}>
                        ({t('register.optional')})
                      </span>
                    </label>
                    <textarea
                      value={formData.ownershipRequestMessage}
                      onChange={(e) => handleInputChange('ownershipRequestMessage', e.target.value)}
                      placeholder={t('register.ownershipMessagePlaceholder')}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontSize: '14px',
                        resize: 'vertical',
                        minHeight: '80px'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Option: Create New Establishment */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                border: `2px solid ${formData.ownerPath === 'create' ? '#C19A6B' : 'rgba(255,255,255,0.2)'}`,
                borderRadius: '12px',
                background: formData.ownerPath === 'create'
                  ? 'linear-gradient(135deg, rgba(193,154,107,0.1), rgba(193,154,107,0.2))'
                  : 'rgba(0,0,0,0.3)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginBottom: '12px'
              }}>
                <input
                  type="radio"
                  name="ownerPath"
                  value="create"
                  checked={formData.ownerPath === 'create'}
                  onChange={() => handleInputChange('ownerPath', 'create')}
                  style={{ accentColor: '#C19A6B' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '15px' }}>
                    <Rocket size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.createNewEstablishment')}
                  </div>
                  <div style={{ color: '#cccccc', fontSize: '12px', marginTop: '4px' }}>
                    {t('register.createNewEstablishmentDesc')}
                  </div>
                </div>
              </label>

              {/* Navigation Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="btn btn--secondary"
                  style={{ flex: 1 }}
                >
                  ← {t('register.previousButton')}
                </button>
                {/* Claim → Submit, Create → Next to Step 4 */}
                {formData.ownerPath === 'claim' ? (
                  <button
                    type="submit"
                    disabled={!formData.selectedEstablishmentToClaim || isLoading}
                    className="btn btn--success"
                    style={{ flex: 2 }}
                  >
                    {isLoading ? (
                      <><Loader2 size={16} className="spin" style={{ marginRight: '8px' }} /> {t('register.submittingButton')}</>
                    ) : (
                      <>{t('register.registerButton')} <Send size={16} style={{ marginLeft: '8px' }} /></>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!formData.ownerPath}
                    onClick={handleNext}
                    className="btn btn--success"
                    style={{ flex: 2 }}
                  >
                    {t('register.nextButton')} →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Registration Form (Employees and Regular users only - Owners have credentials at Step 2) */}
          {currentStep === 3 && formData.accountType !== 'establishment_owner' && (
            <>
              <FormField
                label={<><User size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.pseudonymLabel')}</>}
                name="pseudonym"
                value={formData.pseudonym}
                error={errors.pseudonym}
                status={fieldStatus.pseudonym}
                onChange={(e) => handleInputChange('pseudonym', e.target.value)}
                onBlur={(e) => handleInputBlur('pseudonym', e.target.value)}
                placeholder={t('register.pseudonymPlaceholder')}
                required
                maxLength={50}
                showCounter
                helpText={t('register.pseudonymHelp')}
              />

              <FormField
                label={<><Mail size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.emailLabel')}</>}
                name="email"
                type="email"
                value={formData.email}
                error={errors.email}
                status={fieldStatus.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={(e) => handleInputBlur('email', e.target.value)}
                placeholder={t('register.emailPlaceholder')}
                required
              />

              <div style={{ position: 'relative' }}>
                <FormField
                  label={<><Lock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.passwordLabel')}</>}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  error={errors.password}
                  status={fieldStatus.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onBlur={(e) => handleInputBlur('password', e.target.value)}
                  placeholder={t('register.passwordPlaceholder')}
                  required
                  minLength={8}
                  helpText={t('register.passwordHelp')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '38px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <FormField
                  label={<><KeyRound size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.confirmPasswordLabel')}</>}
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  error={errors.confirmPassword}
                  status={fieldStatus.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  onBlur={(e) => handleInputBlur('confirmPassword', e.target.value)}
                  placeholder={t('register.confirmPasswordPlaceholder')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '38px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  aria-label={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Claim Message Field (only if claiming) */}
              {formData.employeePath === 'claim' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    color: '#C19A6B',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                  }}>
                    <MessageSquare size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.claimMessage')} *
                  </label>
                  <textarea
                    value={formData.claimMessage}
                    onChange={(e) => handleInputChange('claimMessage', e.target.value)}
                    onBlur={(e) => handleInputBlur('claimMessage', e.target.value)}
                    placeholder={t('register.claimMessagePlaceholder')}
                    rows={4}
                    required
                    minLength={10}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(0,0,0,0.4)',
                      border: `2px solid ${errors.claimMessage ? '#C19A6B' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '14px',
                      resize: 'vertical',
                    }}
                  />
                  <div style={{
                    fontSize: '12px',
                    color: formData.claimMessage.length >= 10 ? '#00E5FF' : '#cccccc',
                    marginTop: '4px',
                  }}>
                    {t('register.claimMessageMinChars', { count: formData.claimMessage.length })}
                  </div>
                  {errors.claimMessage && (
                    <div style={{ color: '#C19A6B', fontSize: '13px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={14} /> {errors.claimMessage}
                    </div>
                  )}
                </div>
              )}

              {submitError && (
                <div className="error-message-nightlife error-shake" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} /> {submitError}
                </div>
              )}

              {/* Navigation Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handlePrevious}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  }}
                >
                  ← {t('register.backButton')}
                </button>

                {/* Show "Next" for employee create path, "Submit" for others */}
                {formData.accountType === 'employee' && formData.employeePath === 'create' ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="btn btn--success"
                    style={{ flex: 2 }}
                  >
                    {t('register.nextButton')} →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`btn btn--success ${isLoading ? 'btn--loading' : ''}`}
                    style={{ flex: 2 }}
                  >
                    {isLoading ? (
                      <span className="loading-flex">
                        <span className="loading-spinner-small-nightlife"></span>
                        {t('register.creatingAccount')}
                      </span>
                    ) : (
                      <><Sparkles size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.createAccount')}</>
                    )}
                  </button>
                )}
              </div>
            </>
          )}

          {/* STEP 4: Complete Profile - Employee Only (Photos + Info + Employment + Social) */}
          {currentStep === 4 && formData.accountType === 'employee' && (
            <div style={{
              maxHeight: '500px',
              overflowY: 'auto',
              overflowX: 'hidden',
              marginBottom: '20px',
              paddingRight: '8px'
            }}>
              {/* Photos Section */}
              <div className="form-section" style={{ marginBottom: '30px' }}>
                <h3 style={{
                  color: '#00E5FF',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {t('register.photosSection')}
                </h3>

                <PhotoUploadGrid
                  photos={formData.photos}
                  onChange={(photos) => setFormData(prev => ({ ...prev, photos }))}
                  error={photoErrors}
                  onError={setPhotoErrors}
                  maxPhotos={5}
                  accentColor="#00E5FF"
                />
              </div>

              {/* Basic Info Section */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{
                  color: '#C19A6B',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {t('register.basicInfoSection')}
                </h3>

                <div className="form-input-group">
                  <label className="label-nightlife"><User size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.nameLabel')} *</label>
                  <input
                    type="text"
                    value={formData.employeeName}
                    onChange={(e) => handleInputChange('employeeName', e.target.value)}
                    className="input-nightlife"
                    placeholder={t('register.namePlaceholder')}
                    required
                  />
                </div>

                <div className="form-input-group-lg">
                  <label className="label-nightlife"><UserCog size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('register.nicknameLabel')}</label>
                  <input
                    type="text"
                    value={formData.employeeNickname}
                    onChange={(e) => handleInputChange('employeeNickname', e.target.value)}
                    className="input-nightlife"
                    placeholder={t('register.nicknamePlaceholder')}
                  />
                </div>

                {/* 🆕 v10.x - Sex/Gender Field */}
                <div className="form-input-group-lg">
                  <label className="label-nightlife"><Users size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('employee.sex.label', 'Sex')} *</label>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {[
                      { value: 'female', label: t('employee.sex.female', 'Female'), icon: '♀' },
                      { value: 'male', label: t('employee.sex.male', 'Male'), icon: '♂' },
                      { value: 'ladyboy', label: t('employee.sex.ladyboy', 'Ladyboy'), icon: '⚧' }
                    ].map(option => (
                      <label
                        key={option.value}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px 18px',
                          borderRadius: '10px',
                          border: formData.employeeSex === option.value ? '2px solid #ec4899' : '2px solid rgba(255,255,255,0.2)',
                          background: formData.employeeSex === option.value ? 'rgba(236, 72, 153, 0.15)' : 'rgba(0,0,0,0.3)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <input
                          type="radio"
                          name="employeeSex"
                          value={option.value}
                          checked={formData.employeeSex === option.value}
                          onChange={(e) => handleInputChange('employeeSex', e.target.value)}
                          style={{ display: 'none' }}
                        />
                        <span style={{ fontSize: '18px' }}>{option.icon}</span>
                        <span style={{ color: '#fff' }}>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-row-2-cols">
                  <div>
                    <label className="label-nightlife"><Cake size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.ageLabel')}</label>
                    <input
                      type="number"
                      value={formData.employeeAge}
                      onChange={(e) => handleInputChange('employeeAge', e.target.value)}
                      className="input-nightlife"
                      min="18"
                      max="80"
                      placeholder={t('register.agePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="label-nightlife"><Globe size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.nationalityLabel')}</label>
                    <NationalityTagsInput
                      value={formData.employeeNationality}
                      onChange={(nationalities) => handleInputChange('employeeNationality', nationalities)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="form-input-group">
                  <label className="label-nightlife"><FileText size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.descriptionLabel')}</label>
                  <textarea
                    value={formData.employeeDescription}
                    onChange={(e) => handleInputChange('employeeDescription', e.target.value)}
                    className="textarea-nightlife"
                    rows={4}
                    placeholder={t('register.descriptionPlaceholder')}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '2px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* Employment Mode Section */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{
                  color: '#9D4EDD',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {t('register.employmentModeSection')}
                </h3>

                {/* Freelance Mode Toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '15px',
                  background: 'rgba(157, 78, 221, 0.1)',
                  border: '2px solid rgba(157, 78, 221, 0.3)',
                  borderRadius: '12px',
                  marginBottom: '20px'
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: '500'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.isFreelance}
                      onChange={(e) => {
                        handleInputChange('isFreelance', e.target.checked);
                        if (e.target.checked) {
                          handleInputChange('establishmentId', '');
                        }
                      }}
                      style={{
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer'
                      }}
                    />
                    <span><PersonStanding size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.freelanceMode')}</span>
                  </label>
                  {formData.isFreelance && (
                    <span style={{
                      background: 'linear-gradient(45deg, #9D4EDD, #C77DFF)',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {t('register.freelanceModeActive')}
                    </span>
                  )}
                </div>

                {/* 🆕 v10.x - Freelance Nightclub Multi-Select */}
                {formData.isFreelance && (
                  <div style={{ marginBottom: '20px' }}>
                    <label className="label-nightlife">
                      <Store size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      {t('register.selectNightclubs', 'Select Nightclubs (Optional)')}
                    </label>

                    {/* Info message */}
                    <div style={{
                      marginBottom: '15px',
                      padding: '12px',
                      background: 'rgba(157, 78, 221, 0.15)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.8)'
                    }}>
                      <Lightbulb size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      {t('register.freelanceNightclubNote', 'As a freelance, you can work at multiple nightclubs simultaneously, or leave empty to be listed as a free freelance.')}
                    </div>

                    {/* Nightclub checkboxes */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      padding: '10px',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '8px'
                    }}>
                      {nightclubs.length === 0 ? (
                        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', margin: '10px 0' }}>
                          {t('register.noNightclubsAvailable', 'No nightclubs available')}
                        </p>
                      ) : (
                        nightclubs.map(nightclub => (
                          <label
                            key={nightclub.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              cursor: 'pointer',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: formData.freelanceNightclubIds.includes(nightclub.id)
                                ? 'rgba(157, 78, 221, 0.2)'
                                : 'transparent',
                              border: formData.freelanceNightclubIds.includes(nightclub.id)
                                ? '1px solid rgba(157, 78, 221, 0.5)'
                                : '1px solid transparent',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={formData.freelanceNightclubIds.includes(nightclub.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleInputChange('freelanceNightclubIds', [...formData.freelanceNightclubIds, nightclub.id]);
                                } else {
                                  handleInputChange('freelanceNightclubIds', formData.freelanceNightclubIds.filter((id: string) => id !== nightclub.id));
                                }
                              }}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ color: '#fff', flex: 1 }}>{nightclub.name}</span>
                            {nightclub.zone && (
                              <span style={{ color: '#9D4EDD', fontSize: '12px' }}>
                                <MapPin size={12} style={{ marginRight: '2px', verticalAlign: 'middle' }} />
                                {nightclub.zone}
                              </span>
                            )}
                          </label>
                        ))
                      )}
                    </div>

                    {/* Selected count indicator */}
                    {formData.freelanceNightclubIds.length > 0 && (
                      <div style={{
                        marginTop: '10px',
                        color: '#9D4EDD',
                        fontSize: '13px'
                      }}>
                        <CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {formData.freelanceNightclubIds.length} {t('register.nightclubsSelected', 'nightclub(s) selected')}
                      </div>
                    )}
                  </div>
                )}

                {/* Establishment Selector with Autocomplete - REQUIRED for non-freelance */}
                {!formData.isFreelance && (
                  <div style={{ marginBottom: '20px' }}>
                    <label className="label-nightlife">
                      <Store size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      {t('register.currentEstablishmentRequired', 'Current Establishment')} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <EstablishmentAutocomplete
                      value={establishmentSearchStep4}
                      onChange={(value) => {
                        setEstablishmentSearchStep4(value);
                        // Clear selection if user types
                        if (formData.establishmentId) {
                          handleInputChange('establishmentId', '');
                        }
                      }}
                      onSelect={(est) => {
                        handleInputChange('establishmentId', est.id);
                        setEstablishmentSearchStep4(est.name);
                      }}
                      onClear={() => handleInputChange('establishmentId', '')}
                      establishments={establishments}
                      labelColor="#9D4EDD"
                      showCategory={true}
                      selectedId={formData.establishmentId}
                    />
                  </div>
                )}
              </div>

              {/* Social Media Section */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{
                  color: '#00E5FF',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {t('register.socialMediaSection')}
                </h3>

                <div style={{
                  marginBottom: '20px',
                  padding: '12px',
                  background: 'rgba(0,229,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.8)'
                }}>
                  <Lightbulb size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('register.socialMediaNote')}
                </div>

                <div className="social-media-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '15px'
                }}>
                  <div>
                    <label className="label-nightlife"><Camera size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('register.instagramLabel')}</label>
                    <input
                      type="text"
                      value={formData.socialMedia.ig}
                      onChange={(e) => handleInputChange('socialMedia', { ...formData.socialMedia, ig: e.target.value })}
                      className="input-nightlife"
                      placeholder={t('register.instagramPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="label-nightlife"><BookOpen size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('register.facebookLabel')}</label>
                    <input
                      type="text"
                      value={formData.socialMedia.fb}
                      onChange={(e) => handleInputChange('socialMedia', { ...formData.socialMedia, fb: e.target.value })}
                      className="input-nightlife"
                      placeholder={t('register.facebookPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="label-nightlife"><MessageSquare size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.lineLabel')}</label>
                    <input
                      type="text"
                      value={formData.socialMedia.line}
                      onChange={(e) => handleInputChange('socialMedia', { ...formData.socialMedia, line: e.target.value })}
                      className="input-nightlife"
                      placeholder={t('register.linePlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="label-nightlife" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Send size={14} /> {t('register.telegramLabel')}</label>
                    <input
                      type="text"
                      value={formData.socialMedia.tg}
                      onChange={(e) => handleInputChange('socialMedia', { ...formData.socialMedia, tg: e.target.value })}
                      className="input-nightlife"
                      placeholder={t('register.telegramPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="label-nightlife" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> {t('register.whatsappLabel')}</label>
                    <input
                      type="text"
                      value={formData.socialMedia.wa}
                      onChange={(e) => handleInputChange('socialMedia', { ...formData.socialMedia, wa: e.target.value })}
                      className="input-nightlife"
                      placeholder={t('register.whatsappPlaceholder')}
                    />
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="error-message-nightlife error-shake" style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} /> {submitError}
                </div>
              )}

              {/* Navigation Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="btn btn--secondary"
                  style={{ flex: 1 }}
                >
                  ← {t('register.backButton')}
                </button>
                <button
                  type="submit"
                  disabled={isLoading || uploadingPhotos}
                  className={`btn btn--success ${isLoading ? 'btn--loading' : ''}`}
                  style={{ flex: 2 }}
                >
                  {uploadingPhotos ? (
                    <span className="loading-flex">
                      <span className="loading-spinner-small-nightlife"></span>
                      <Upload size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('register.uploadingPhotos')}
                    </span>
                  ) : isLoading ? (
                    <span className="loading-flex">
                      <span className="loading-spinner-small-nightlife"></span>
                      <Loader2 size={16} style={{ marginRight: '4px', verticalAlign: 'middle', animation: 'spin 1s linear infinite' }} />{t('register.creatingProfile')}
                    </span>
                  ) : (
                    <><Sparkles size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.createAccount')}</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Owner Establishment Creation - 🆕 v10.x */}
          {currentStep === 4 && formData.accountType === 'establishment_owner' && (
            <div style={{
              maxHeight: '500px',
              overflowY: 'auto',
              overflowX: 'hidden',
              marginBottom: '20px',
              paddingRight: '8px'
            }}>
              <h3 style={{
                color: '#C19A6B',
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Building2 size={18} /> {t('register.createEstablishmentTitle')}
              </h3>

              {/* Establishment Name */}
              <FormField
                label={<><Store size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.establishmentName')}</>}
                name="newEstablishmentName"
                value={formData.newEstablishmentName}
                onChange={(e) => handleInputChange('newEstablishmentName', e.target.value)}
                placeholder={t('register.establishmentNamePlaceholder')}
                required
                maxLength={100}
              />

              {/* Establishment Address */}
              <FormField
                label={<><MapPin size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.establishmentAddress')}</>}
                name="newEstablishmentAddress"
                value={formData.newEstablishmentAddress}
                onChange={(e) => handleInputChange('newEstablishmentAddress', e.target.value)}
                placeholder={t('register.establishmentAddressPlaceholder')}
                required
              />

              {/* Zone Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  color: '#C19A6B',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}>
                  <MapPin size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('register.establishmentZone')} *
                </label>
                <select
                  value={formData.newEstablishmentZone}
                  onChange={(e) => handleInputChange('newEstablishmentZone', e.target.value)}
                  className="input-nightlife"
                  style={{ width: '100%', cursor: 'pointer' }}
                >
                  <option value="">{t('register.selectZone')}</option>
                  {ZONE_OPTIONS.filter(z => z.value !== 'freelance').map(zone => (
                    <option key={zone.value} value={zone.value}>{zone.label}</option>
                  ))}
                </select>
              </div>

              {/* Category Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  color: '#C19A6B',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}>
                  <Crown size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('register.establishmentCategory')} *
                </label>
                <select
                  value={formData.newEstablishmentCategoryId || ''}
                  onChange={(e) => handleInputChange('newEstablishmentCategoryId', e.target.value ? Number(e.target.value) : null)}
                  className="input-nightlife"
                  style={{ width: '100%', cursor: 'pointer' }}
                >
                  <option value="">{t('register.selectCategory')}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Description (Optional) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  color: '#C19A6B',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}>
                  <BookOpen size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('register.establishmentDescription')}
                  <span style={{ color: '#999999', fontWeight: 'normal', marginLeft: '8px' }}>
                    ({t('register.optional')})
                  </span>
                </label>
                <textarea
                  value={formData.newEstablishmentDescription}
                  onChange={(e) => handleInputChange('newEstablishmentDescription', e.target.value)}
                  placeholder={t('register.establishmentDescriptionPlaceholder')}
                  rows={3}
                  className="input-nightlife"
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>

              {/* Phone (Optional) */}
              <FormField
                label={<><Phone size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.establishmentPhone')} <span style={{ color: '#999999', fontWeight: 'normal' }}>({t('register.optional')})</span></>}
                name="newEstablishmentPhone"
                value={formData.newEstablishmentPhone}
                onChange={(e) => handleInputChange('newEstablishmentPhone', e.target.value)}
                placeholder={t('register.establishmentPhonePlaceholder')}
              />

              {/* Website (Optional) */}
              <FormField
                label={<><Globe size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.establishmentWebsite')} <span style={{ color: '#999999', fontWeight: 'normal' }}>({t('register.optional')})</span></>}
                name="newEstablishmentWebsite"
                value={formData.newEstablishmentWebsite}
                onChange={(e) => handleInputChange('newEstablishmentWebsite', e.target.value)}
                placeholder="https://..."
              />

              {/* Social Media Section */}
              <div style={{
                marginTop: '20px',
                padding: '16px',
                background: 'rgba(193,154,107,0.05)',
                borderRadius: '12px',
                border: '1px solid rgba(193,154,107,0.2)'
              }}>
                <h4 style={{ color: '#C19A6B', fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} /> {t('register.socialMediaOptional')}
                </h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <FormField
                    label="Instagram"
                    name="newEstablishmentInstagram"
                    value={formData.newEstablishmentInstagram}
                    onChange={(e) => handleInputChange('newEstablishmentInstagram', e.target.value)}
                    placeholder="@username"
                  />
                  <FormField
                    label="Twitter/X"
                    name="newEstablishmentTwitter"
                    value={formData.newEstablishmentTwitter}
                    onChange={(e) => handleInputChange('newEstablishmentTwitter', e.target.value)}
                    placeholder="@username"
                  />
                  <FormField
                    label="TikTok"
                    name="newEstablishmentTiktok"
                    value={formData.newEstablishmentTiktok}
                    onChange={(e) => handleInputChange('newEstablishmentTiktok', e.target.value)}
                    placeholder="@username"
                  />
                </div>
              </div>

              {submitError && (
                <div className="error-message-nightlife error-shake" style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} /> {submitError}
                </div>
              )}

              {/* Navigation Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="btn btn--secondary"
                  style={{ flex: 1 }}
                >
                  ← {t('register.previousButton')}
                </button>
                <button
                  type="submit"
                  disabled={
                    !formData.newEstablishmentName.trim() ||
                    !formData.newEstablishmentAddress.trim() ||
                    !formData.newEstablishmentZone ||
                    !formData.newEstablishmentCategoryId ||
                    isLoading
                  }
                  className="btn btn--success"
                  style={{ flex: 2 }}
                >
                  {isLoading ? (
                    <><Loader2 size={16} className="spin" style={{ marginRight: '8px' }} /> {t('register.submittingButton')}</>
                  ) : (
                    <><Sparkles size={16} style={{ marginRight: '8px' }} /> {t('register.createAccountAndEstablishment')}</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Switch to Login */}
          <div className="auth-switch-text" style={{ marginTop: '20px' }}>
            <span className="auth-switch-label">
              {t('register.alreadyHaveAccount')}{' '}
            </span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="auth-switch-button"
            >
              {t('register.loginHere')}
            </button>
          </div>
        </form>
      </div>
  );

  // If embedded (used in split-screen layout), return just the form content
  if (embedded) {
    return formContent;
  }

  // Standalone mode: wrap in overlay
  return (
    <div className="modal-overlay-unified" role="dialog" aria-modal="true" data-testid="multistep-register-modal">
      {formContent}
    </div>
  );
};

export default MultiStepRegisterForm;
