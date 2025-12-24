import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFormValidation, ValidationRules } from '../../hooks/useFormValidation';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useEmployeeSearch } from '../../hooks/useEmployees';
import { useEstablishments } from '../../hooks/useEstablishments';
import { useCSRF } from '../../contexts/CSRFContext';
import FormField from '../Common/FormField';
import LazyImage from '../Common/LazyImage';
import NationalityTagsInput from '../Forms/NationalityTagsInput';
import { Employee } from '../../types';
import toast from '../../utils/toast';
import { logger } from '../../utils/logger';
import '../../styles/components/modal-forms.css';
import '../../styles/components/photos.css';

interface MultiStepRegisterFormProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
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
  // Step 3
  pseudonym: string;
  email: string;
  password: string;
  confirmPassword: string;
  // Step 4 (employee create only) - Photos & Basic Info
  employeeName: string;
  employeeNickname: string;
  employeeAge: string;
  employeeNationality: string[] | null;
  employeeDescription: string;
  photos: File[];
  // Step 5 (employee create only) - Employment
  isFreelance: boolean;
  freelanceZone: string;
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
  onSwitchToLogin
}) => {
  const { t } = useTranslation();
  const { register, claimEmployeeProfile } = useAuth();
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
    pseudonym: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Step 4 fields
    employeeName: '',
    employeeNickname: '',
    employeeAge: '',
    employeeNationality: null,
    employeeDescription: '',
    photos: [],
    // Step 5 fields
    isFreelance: false,
    freelanceZone: '',
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

  // Establishment autocomplete state (Step 2)
  const [establishmentSearchStep2, setEstablishmentSearchStep2] = useState('');
  const [showSuggestionsStep2, setShowSuggestionsStep2] = useState(false);
  const establishmentInputRefStep2 = useRef<HTMLInputElement>(null);

  // Establishment autocomplete state (Step 4)
  const [establishmentSearchStep4, setEstablishmentSearchStep4] = useState('');
  const [showSuggestionsStep4, setShowSuggestionsStep4] = useState(false);
  const establishmentInputRefStep4 = useRef<HTMLInputElement>(null);

  // React Query hooks for establishments and employee search
  const { data: establishments = [] } = useEstablishments();

  // Filter establishments by search query and group by zone
  const filterEstablishmentsByQuery = (query: string) => {
    const zoneNames: Record<string, string> = {
      soi6: 'Soi 6',
      walkingstreet: 'Walking Street',
      beachroad: 'Beach Road',
      lkmetro: 'LK Metro',
      treetown: 'Tree Town',
      soibuakhao: 'Soi Buakhao'
    };

    // Filter establishments with zone only
    let filtered = establishments.filter(est => est.zone);

    // Apply search filter if query exists
    if (query.trim().length > 0) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(est =>
        est.name.toLowerCase().includes(lowerQuery)
      );
    }

    // Group by zone
    const groupedByZone = filtered.reduce((acc, est) => {
      const zone = est.zone || 'other';
      if (!acc[zone]) acc[zone] = [];
      acc[zone].push(est);
      return acc;
    }, {} as Record<string, typeof establishments>);

    // Sort each group alphabetically
    Object.keys(groupedByZone).forEach(zone => {
      groupedByZone[zone].sort((a, b) => a.name.localeCompare(b.name));
    });

    // Sort zones alphabetically
    const sortedZones = Object.keys(groupedByZone).sort((a, b) =>
      (zoneNames[a] || a).localeCompare(zoneNames[b] || b)
    );

    return { groupedByZone, sortedZones, zoneNames };
  };
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
        toast.success(t('register.draftRestoredToast'));
        // Restore step based on draft data
        if (draft.pseudonym || draft.email) {
          setCurrentStep(3);
        } else if (draft.employeePath) {
          setCurrentStep(2);
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Photo handling functions
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length + formData.photos.length > 5) {
      setPhotoErrors(t('register.photosMaxError'));
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setPhotoErrors(t('register.photosTypeError'));
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        setPhotoErrors(t('register.photosSizeError'));
        return false;
      }
      return true;
    });

    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...validFiles]
    }));
    setPhotoErrors('');
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
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
    // Step 1 → Step 2 or 3
    if (currentStep === 1) {
      if (formData.accountType === 'employee') {
        setCurrentStep(2);
      } else {
        setCurrentStep(3);
      }
    }
    // Step 2 → Step 3
    else if (currentStep === 2) {
      if (!formData.employeePath) {
        toast.error(t('register.selectPathFirst'));
        return;
      }
      if (formData.employeePath === 'claim' && !formData.selectedEmployee) {
        toast.error(t('register.selectEmployeeFirst'));
        return;
      }
      setCurrentStep(3);
    }
    // Step 3 → Step 4 (if employee create) or submit (if claim/regular)
    else if (currentStep === 3) {
      if (formData.accountType === 'employee' && formData.employeePath === 'create') {
        setCurrentStep(4);
      }
      // For claim/regular, submit is handled by form onSubmit
    }
    // Step 4 → Submit (handled by form onSubmit)
  };

  const handlePrevious = () => {
    if (currentStep === 4) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (formData.accountType === 'employee') {
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
      toast.error(t('register.fixErrorsToast'));
      return;
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
        toast.warning(t('register.passwordBreachWarning', 'Your password has been found in a data breach. Consider changing it for better security.'), {
          duration: 10000 // Show longer (10 seconds)
        });
      }

      clearDraft(); // Clear draft on successful submission

      // Handle different post-registration flows
      if (formData.accountType === 'regular') {
        toast.success(t('register.accountCreated'));
        onClose();
      } else if (formData.accountType === 'establishment_owner') { // 🆕 v10.1
        toast.success(t('register.ownerAccountCreated'));
        onClose();
      } else if (formData.employeePath === 'claim') {
        // 🔧 CSRF FIX: Use the fresh token directly (no delay needed!)
        // Claim existing profile with explicit fresh token
        await claimEmployeeProfile!(
          formData.selectedEmployee!.id,
          formData.claimMessage.trim(),
          [],
          freshToken || undefined // Pass fresh token explicitly
        );
        toast.success(t('register.claimSubmitted'));
        onClose();
      } else if (formData.employeePath === 'create') {
        // Create new profile with uploaded photos
        toast.info(t('register.creatingEmployeeProfile'));

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
            nationality: formData.employeeNationality,
            description: formData.employeeDescription || undefined,
            photos: photoUrls,
            is_freelance: formData.isFreelance,
            freelance_zone: formData.isFreelance ? formData.freelanceZone : undefined,
            current_establishment_id: !formData.isFreelance && formData.establishmentId ? formData.establishmentId : undefined,
            social_media: Object.fromEntries(
              Object.entries(formData.socialMedia).filter(([_, value]) => value.trim() !== '')
            )
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create employee profile');
        }

        toast.success(t('register.employeeProfileCreated'));
        onClose();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('register.registrationFailed');
      setSubmitError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate total steps dynamically
  const totalSteps =
    formData.accountType === 'employee' && formData.employeePath === 'create' ? 4 :
    formData.accountType === 'employee' && formData.employeePath === 'claim' ? 3 :
    formData.accountType === 'employee' ? 3 : // Not yet selected path
    2; // regular or establishment_owner

  // Calculate display step for progress indicator (FIX BUG-001: "Step 3 of 2")
  // For non-employees, internal currentStep 3 should display as Step 2
  const displayStep = formData.accountType === 'employee'
    ? currentStep
    : (currentStep === 1 ? 1 : 2);

  // Progress percentage
  const _progressPercentage = totalSteps === 4
    ? (currentStep / 4) * 100
    : totalSteps === 3
    ? (currentStep / 3) * 100
    : currentStep === 1 ? 50 : 100;

  return (
    <div className="modal-overlay-nightlife" data-testid="multistep-register-modal">
      <div className="modal-form-container" style={{ maxWidth: '700px' }}>
        <button
          onClick={handleClose}
          className="modal-close-button"
          aria-label="Close"
          data-testid="close-multistep-register-modal"
        >
          ×
        </button>

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
        <div style={{ marginBottom: '30px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            {/* Step indicators */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
              {/* Step 1 */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: currentStep >= 1 ? '#00E5FF' : 'rgba(255,255,255,0.2)',
                color: currentStep >= 1 ? '#0a0a2e' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}>
                1
              </div>
              <div style={{
                flex: 1,
                height: '4px',
                background: currentStep >= 2 ? '#00E5FF' : 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
                transition: 'all 0.3s ease'
              }} />

              {/* Step 2 (employee only) */}
              {formData.accountType === 'employee' && (
                <>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: currentStep >= 2 ? '#C19A6B' : 'rgba(255,255,255,0.2)',
                    color: currentStep >= 2 ? '#ffffff' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                  }}>
                    2
                  </div>
                  <div style={{
                    flex: 1,
                    height: '4px',
                    background: currentStep >= 3 ? '#C19A6B' : 'rgba(255,255,255,0.2)',
                    borderRadius: '2px',
                    transition: 'all 0.3s ease'
                  }} />
                </>
              )}

              {/* Step 3 (or Step 2 for non-employee) */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: currentStep >= (formData.accountType === 'employee' ? 3 : 2) ? '#00E5FF' : 'rgba(255,255,255,0.2)',
                color: currentStep >= (formData.accountType === 'employee' ? 3 : 2) ? '#0a0a2e' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}>
                {formData.accountType === 'employee' ? '3' : '2'}
              </div>

              {/* Step 4 (create path only) */}
              {formData.accountType === 'employee' && formData.employeePath === 'create' && (
                <>
                  <div style={{
                    flex: 1,
                    height: '4px',
                    background: currentStep >= 4 ? '#9D4EDD' : 'rgba(255,255,255,0.2)',
                    borderRadius: '2px',
                    transition: 'all 0.3s ease'
                  }} />
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: currentStep >= 4 ? '#9D4EDD' : 'rgba(255,255,255,0.2)',
                    color: currentStep >= 4 ? '#ffffff' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                  }}>
                    4
                  </div>
                </>
              )}
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#cccccc', textAlign: 'center' }}>
            {t('register.stepProgress', { current: displayStep, total: totalSteps })}
          </div>
        </div>

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
              <span style={{ fontSize: '20px' }}>📝</span>
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
                  pseudonym: '',
                  email: '',
                  password: '',
                  confirmPassword: '',
                  // Step 4 fields
                  employeeName: '',
                  employeeNickname: '',
                  employeeAge: '',
                  employeeNationality: null,
                  employeeDescription: '',
                  photos: [],
                  // Step 5 fields
                  isFreelance: false,
                  freelanceZone: '',
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
                toast.success(t('register.draftCleared'));
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
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#00E5FF',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '10px'
              }}>
                🎭 {t('register.accountType')}
              </label>
              <div style={{
                display: 'flex',
                gap: '15px',
                flexWrap: 'wrap'
              }}>
                <label style={{
                  flex: '1 1 calc(50% - 8px)',
                  minWidth: '200px',
                  padding: '15px',
                  border: `2px solid ${formData.accountType === 'regular' ? '#00E5FF' : 'rgba(255,255,255,0.2)'}`,
                  borderRadius: '12px',
                  background: formData.accountType === 'regular'
                    ? 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,229,255,0.2))'
                    : 'rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <input
                    type="radio"
                    name="accountType"
                    value="regular"
                    checked={formData.accountType === 'regular'}
                    onChange={() => handleInputChange('accountType', 'regular')}
                    style={{ accentColor: '#00E5FF' }}
                  />
                  <div>
                    <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '15px' }}>
                      👥 {t('register.regularUser')}
                    </div>
                    <div style={{ color: '#cccccc', fontSize: '12px', marginTop: '4px' }}>
                      {t('register.regularUserDesc')}
                    </div>
                  </div>
                </label>

                <label style={{
                  flex: '1 1 calc(50% - 8px)',
                  minWidth: '200px',
                  padding: '15px',
                  border: `2px solid ${formData.accountType === 'employee' ? '#C19A6B' : 'rgba(255,255,255,0.2)'}`,
                  borderRadius: '12px',
                  background: formData.accountType === 'employee'
                    ? 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(193, 154, 107,0.2))'
                    : 'rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <input
                    type="radio"
                    name="accountType"
                    value="employee"
                    checked={formData.accountType === 'employee'}
                    onChange={() => handleInputChange('accountType', 'employee')}
                    style={{ accentColor: '#C19A6B' }}
                  />
                  <div>
                    <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '15px' }}>
                      💃 {t('register.employeeUser')}
                    </div>
                    <div style={{ color: '#cccccc', fontSize: '12px', marginTop: '4px' }}>
                      {t('register.employeeUserDesc')}
                    </div>
                  </div>
                </label>

                <label style={{
                  flex: '1 1 calc(50% - 8px)',
                  minWidth: '200px',
                  padding: '15px',
                  border: `2px solid ${formData.accountType === 'establishment_owner' ? '#FFD700' : 'rgba(255,255,255,0.2)'}`,
                  borderRadius: '12px',
                  background: formData.accountType === 'establishment_owner'
                    ? 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,215,0,0.2))'
                    : 'rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <input
                    type="radio"
                    name="accountType"
                    value="establishment_owner"
                    checked={formData.accountType === 'establishment_owner'}
                    onChange={() => handleInputChange('accountType', 'establishment_owner')}
                    style={{ accentColor: '#FFD700' }}
                  />
                  <div>
                    <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '15px' }}>
                      🏆 {t('register.establishmentOwner')}
                    </div>
                    <div style={{ color: '#cccccc', fontSize: '12px', marginTop: '4px' }}>
                      {t('register.establishmentOwnerDesc')}
                    </div>
                  </div>
                </label>
              </div>

              {/* Info banner for employee accounts */}
              {formData.accountType === 'employee' && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(193, 154, 107,0.15))',
                  border: '1px solid rgba(193, 154, 107,0.3)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#ffffff',
                  lineHeight: '1.5'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#C19A6B' }}>
                    ✨ {t('register.employeeBenefitsTitle')}
                  </div>
                  <ul style={{ margin: '0', paddingLeft: '20px' }}>
                    <li>{t('register.employeeBenefit1')}</li>
                    <li>{t('register.employeeBenefit2')}</li>
                    <li>{t('register.employeeBenefit3')}</li>
                    <li>{t('register.employeeBenefit4')}</li>
                  </ul>
                </div>
              )}

              {/* 🆕 v10.1 - Info banner for establishment owner accounts */}
              {formData.accountType === 'establishment_owner' && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,215,0,0.15))',
                  border: '1px solid rgba(255,215,0,0.3)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#ffffff',
                  lineHeight: '1.5'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#FFD700' }}>
                    🏆 {t('register.ownerBenefitsTitle')}
                  </div>
                  <ul style={{ margin: '0', paddingLeft: '20px' }}>
                    <li>{t('register.ownerBenefit1')}</li>
                    <li>{t('register.ownerBenefit2')}</li>
                    <li>{t('register.ownerBenefit3')}</li>
                    <li>{t('register.ownerBenefit4')}</li>
                  </ul>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#cccccc', fontStyle: 'italic' }}>
                    ⚠️ {t('register.ownerApprovalNote')}
                  </div>
                </div>
              )}

              {/* Next Button */}
              <button
                type="button"
                onClick={handleNext}
                className="btn btn--success"
                style={{ marginTop: '20px' }}
              >
                {t('register.nextButton')} →
              </button>
            </div>
          )}

          {/* STEP 2: Employee Path Selection (Claim or Create) */}
          {currentStep === 2 && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#C19A6B',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '10px'
              }}>
                🚀 {t('register.choosePath')}
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
                    🔗 {t('register.claimExistingProfile')}
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
                  <div style={{ marginBottom: '12px', position: 'relative' }}>
                    <label style={{
                      display: 'block',
                      color: '#C19A6B',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      marginBottom: '8px'
                    }}>
                      🏢 {t('register.filterByEstablishment')}
                    </label>
                    <input
                      ref={establishmentInputRefStep2}
                      type="text"
                      value={establishmentSearchStep2}
                      onChange={(e) => {
                        setEstablishmentSearchStep2(e.target.value);
                        setShowSuggestionsStep2(true);
                        // Clear selection if user types
                        if (selectedEstablishmentId) {
                          setSelectedEstablishmentId(null);
                        }
                      }}
                      onFocus={() => setShowSuggestionsStep2(true)}
                      onBlur={() => {
                        // Delay to allow click on suggestion
                        setTimeout(() => setShowSuggestionsStep2(false), 200);
                      }}
                      placeholder={t('register.searchEstablishments')}
                      className="input-nightlife"
                    />

                    {/* Clear button */}
                    {(establishmentSearchStep2 || selectedEstablishmentId) && (
                      <button
                        type="button"
                        onClick={() => {
                          setEstablishmentSearchStep2('');
                          setSelectedEstablishmentId(null);
                          setShowSuggestionsStep2(false);
                        }}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '38px',
                          background: 'transparent',
                          border: 'none',
                          color: '#C19A6B',
                          fontSize: '18px',
                          cursor: 'pointer',
                          padding: '0',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    )}

                    {/* Suggestions Dropdown */}
                    {showSuggestionsStep2 && (() => {
                      const { groupedByZone, sortedZones, zoneNames } = filterEstablishmentsByQuery(establishmentSearchStep2);
                      const hasResults = sortedZones.length > 0;

                      return hasResults ? (
                        <div className="autocomplete-dropdown-nightlife">
                          {sortedZones.map(zone => (
                            <div key={zone}>
                              {/* Zone Header */}
                              <div style={{
                                padding: '8px 16px',
                                background: 'rgba(255,255,255,0.05)',
                                color: '#cccccc',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                borderBottom: '1px solid rgba(255,255,255,0.1)'
                              }}>
                                📍 {zoneNames[zone] || zone}
                              </div>
                              {/* Establishments in Zone */}
                              {groupedByZone[zone].map(est => (
                                <div
                                  key={est.id}
                                  className="autocomplete-item-nightlife"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setSelectedEstablishmentId(est.id);
                                    setEstablishmentSearchStep2(est.name);
                                    setShowSuggestionsStep2(false);
                                  }}
                                >
                                  {est.name}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : establishmentSearchStep2.trim().length > 0 ? (
                        <div className="autocomplete-dropdown-nightlife" style={{ textAlign: 'center', color: '#999999' }}>
                          {t('register.noEstablishmentsFound')}
                        </div>
                      ) : null;
                    })()}
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
                      🔍 {t('register.searchByName')}
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
                                👤
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
                        ✅ {t('register.selectedProfile')}
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
                    ✨ {t('register.createNewProfile')}
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

          {/* STEP 3: Registration Form */}
          {currentStep === 3 && (
            <>
              <FormField
                label={`👤 ${t('register.pseudonymLabel')}`}
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
                label={`📧 ${t('register.emailLabel')}`}
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
                  label={`🔒 ${t('register.passwordLabel')}`}
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
                  label={`🔐 ${t('register.confirmPasswordLabel')}`}
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
                    💬 {t('register.claimMessage')} *
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
                    <div style={{ color: '#C19A6B', fontSize: '13px', marginTop: '4px' }}>
                      ⚠️ {errors.claimMessage}
                    </div>
                  )}
                </div>
              )}

              {submitError && (
                <div className="error-message-nightlife error-shake">
                  ⚠️ {submitError}
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
                      `✨ ${t('register.createAccount')}`
                    )}
                  </button>
                )}
              </div>
            </>
          )}

          {/* STEP 4: Complete Profile (Photos + Info + Employment + Social) */}
          {currentStep === 4 && (
            <div style={{
              maxHeight: '500px',
              overflowY: 'auto',
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

                <div className="photo-upload-area" style={{
                  position: 'relative',
                  padding: '30px',
                  border: '2px dashed rgba(0,229,255,0.5)',
                  borderRadius: '12px',
                  background: 'rgba(0,229,255,0.05)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoChange}
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer',
                      left: 0,
                      top: 0
                    }}
                  />
                  <div style={{ color: '#00E5FF', fontSize: '18px', marginBottom: '10px' }}>
                    📁 {t('register.photosUploadArea')}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
                    {t('register.photosUploadFormats')}
                  </div>
                </div>

                {photoErrors && (
                  <div style={{
                    color: '#C19A6B',
                    fontSize: '14px',
                    marginTop: '10px'
                  }}>
                    ⚠️ {photoErrors}
                  </div>
                )}

                {formData.photos.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: '12px',
                    marginTop: '15px'
                  }}>
                    {formData.photos.map((photo, index) => (
                      <div key={index} style={{ position: 'relative' }}>
                        <LazyImage
                          src={URL.createObjectURL(photo)}
                          alt={`Photo ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '8px'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            background: 'linear-gradient(45deg, #FF4757, #C19A6B)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '25px',
                            height: '25px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  <label className="label-nightlife">👤 {t('register.nameLabel')} *</label>
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
                  <label className="label-nightlife">🎭 {t('register.nicknameLabel')}</label>
                  <input
                    type="text"
                    value={formData.employeeNickname}
                    onChange={(e) => handleInputChange('employeeNickname', e.target.value)}
                    className="input-nightlife"
                    placeholder={t('register.nicknamePlaceholder')}
                  />
                </div>

                <div className="form-row-2-cols">
                  <div>
                    <label className="label-nightlife">🎂 {t('register.ageLabel')}</label>
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
                    <label className="label-nightlife">🌍 {t('register.nationalityLabel')}</label>
                    <NationalityTagsInput
                      value={formData.employeeNationality}
                      onChange={(nationalities) => handleInputChange('employeeNationality', nationalities)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="form-input-group">
                  <label className="label-nightlife">📝 {t('register.descriptionLabel')}</label>
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
                    <span>💃 {t('register.freelanceMode')}</span>
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

                {/* Freelance Zone Selector */}
                {formData.isFreelance && (
                  <div style={{ marginBottom: '20px' }}>
                    <label className="label-nightlife">📍 {t('register.selectZone')} *</label>
                    <select
                      value={formData.freelanceZone}
                      onChange={(e) => handleInputChange('freelanceZone', e.target.value)}
                      className="select-nightlife"
                      required
                    >
                      <option value="">{t('register.selectZonePlaceholder')}</option>
                      <option value="soi6">{t('register.zones.soi6')}</option>
                      <option value="walkingstreet">{t('register.zones.walkingstreet')}</option>
                      <option value="lkmetro">{t('register.zones.lkmetro')}</option>
                      <option value="treetown">{t('register.zones.treetown')}</option>
                      <option value="soibuakhao">{t('register.zones.soibuakhao')}</option>
                      <option value="beachroad">{t('register.zones.beachroad')}</option>
                    </select>
                    <div style={{
                      marginTop: '10px',
                      padding: '12px',
                      background: 'rgba(157, 78, 221, 0.15)',
                      borderRadius: '8px',
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: '13px'
                    }}>
                      💡 {t('register.freelanceNote')}
                    </div>
                  </div>
                )}

                {/* Establishment Selector with Autocomplete */}
                {!formData.isFreelance && (
                  <div style={{ marginBottom: '20px', position: 'relative' }}>
                    <label className="label-nightlife">🏪 {t('register.currentEstablishment')}</label>
                    <input
                      ref={establishmentInputRefStep4}
                      type="text"
                      value={establishmentSearchStep4}
                      onChange={(e) => {
                        setEstablishmentSearchStep4(e.target.value);
                        setShowSuggestionsStep4(true);
                        // Clear selection if user types
                        if (formData.establishmentId) {
                          handleInputChange('establishmentId', '');
                        }
                      }}
                      onFocus={() => setShowSuggestionsStep4(true)}
                      onBlur={() => {
                        // Delay to allow click on suggestion
                        setTimeout(() => setShowSuggestionsStep4(false), 200);
                      }}
                      placeholder={t('register.searchEstablishments')}
                      className="input-nightlife"
                    />

                    {/* Clear button */}
                    {(establishmentSearchStep4 || formData.establishmentId) && (
                      <button
                        type="button"
                        onClick={() => {
                          setEstablishmentSearchStep4('');
                          handleInputChange('establishmentId', '');
                          setShowSuggestionsStep4(false);
                        }}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '38px',
                          background: 'transparent',
                          border: 'none',
                          color: '#9D4EDD',
                          fontSize: '18px',
                          cursor: 'pointer',
                          padding: '0',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    )}

                    {/* Suggestions Dropdown */}
                    {showSuggestionsStep4 && (() => {
                      const { groupedByZone, sortedZones, zoneNames } = filterEstablishmentsByQuery(establishmentSearchStep4);
                      const hasResults = sortedZones.length > 0;

                      return hasResults ? (
                        <div className="autocomplete-dropdown-nightlife">
                          {sortedZones.map(zone => (
                            <div key={zone}>
                              {/* Zone Header */}
                              <div style={{
                                padding: '8px 16px',
                                background: 'rgba(255,255,255,0.05)',
                                color: '#cccccc',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                borderBottom: '1px solid rgba(255,255,255,0.1)'
                              }}>
                                📍 {zoneNames[zone] || zone}
                              </div>
                              {/* Establishments in Zone */}
                              {groupedByZone[zone].map(est => (
                                <div
                                  key={est.id}
                                  className="autocomplete-item-nightlife"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleInputChange('establishmentId', est.id);
                                    setEstablishmentSearchStep4(est.name);
                                    setShowSuggestionsStep4(false);
                                  }}
                                >
                                  <div>
                                    <div>{est.name}</div>
                                    {est.category?.name && (
                                      <div style={{ fontSize: '11px', color: '#999999', marginTop: '2px' }}>
                                        {est.category.name}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : establishmentSearchStep4.trim().length > 0 ? (
                        <div className="autocomplete-dropdown-nightlife" style={{ textAlign: 'center', color: '#999999' }}>
                          {t('register.noEstablishmentsFound')}
                        </div>
                      ) : null;
                    })()}
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
                  💡 {t('register.socialMediaNote')}
                </div>

                <div className="social-media-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '15px'
                }}>
                  <div>
                    <label className="label-nightlife">📷 {t('register.instagramLabel')}</label>
                    <input
                      type="text"
                      value={formData.socialMedia.ig}
                      onChange={(e) => handleInputChange('socialMedia', { ...formData.socialMedia, ig: e.target.value })}
                      className="input-nightlife"
                      placeholder={t('register.instagramPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="label-nightlife">📘 {t('register.facebookLabel')}</label>
                    <input
                      type="text"
                      value={formData.socialMedia.fb}
                      onChange={(e) => handleInputChange('socialMedia', { ...formData.socialMedia, fb: e.target.value })}
                      className="input-nightlife"
                      placeholder={t('register.facebookPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="label-nightlife">💬 {t('register.lineLabel')}</label>
                    <input
                      type="text"
                      value={formData.socialMedia.line}
                      onChange={(e) => handleInputChange('socialMedia', { ...formData.socialMedia, line: e.target.value })}
                      className="input-nightlife"
                      placeholder={t('register.linePlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="label-nightlife">✈️ {t('register.telegramLabel')}</label>
                    <input
                      type="text"
                      value={formData.socialMedia.tg}
                      onChange={(e) => handleInputChange('socialMedia', { ...formData.socialMedia, tg: e.target.value })}
                      className="input-nightlife"
                      placeholder={t('register.telegramPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="label-nightlife">📞 {t('register.whatsappLabel')}</label>
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
                <div className="error-message-nightlife error-shake" style={{ marginTop: '15px' }}>
                  ⚠️ {submitError}
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
                      📤 {t('register.uploadingPhotos')}
                    </span>
                  ) : isLoading ? (
                    <span className="loading-flex">
                      <span className="loading-spinner-small-nightlife"></span>
                      ⏳ {t('register.creatingProfile')}
                    </span>
                  ) : (
                    `✨ ${t('register.createAccount')}`
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
    </div>
  );
};

export default MultiStepRegisterForm;
