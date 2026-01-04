import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, AlertTriangle, Sparkles, FileText, MessageSquare, Loader2, Lock, KeyRound, Mail, User } from 'lucide-react';
import { useFormValidation, ValidationRules } from '../../hooks/useFormValidation';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useEmployeeSearch } from '../../hooks/useEmployees';
import { useEstablishments } from '../../hooks/useEstablishments';
import FormField from '../Common/FormField';
import { Employee, Establishment, EstablishmentCategory } from '../../types';
import notification from '../../utils/notification';
import { logger } from '../../utils/logger';
import { AccountTypeSelectionStep, CredentialsStep, EmployeePathStep, OwnerPathStep, EmployeeCreateStep, OwnerCreateStep } from './steps';
import { StepIndicator } from './components';
import { usePhotoUpload, useStepNavigation, useRegistrationSubmit } from './hooks';
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

  // Loading states (some managed by hooks now)
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

  // ============================================
  // Custom Hooks Integration
  // ============================================

  // Photo upload hook
  const { uploadPhotos, isUploading: uploadingPhotos } = usePhotoUpload({
    photos: formData.photos
  });

  // Step navigation hook
  const { handleNext, handlePrevious } = useStepNavigation({
    formData,
    currentStep,
    setCurrentStep
  });

  // Registration submit hook
  const {
    handleSubmit,
    isLoading,
    uploadingPhotos: uploadingPhotosSubmit,
    uploadingOwnershipDocs,
    submitError,
    setSubmitError
  } = useRegistrationSubmit({
    formData,
    validateForm,
    clearDraft,
    uploadPhotos,
    onSuccess: onClose
  });

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

  const handleClose = () => {
    onClose();
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
            <EmployeePathStep
              employeePath={formData.employeePath}
              onPathChange={(path) => handleInputChange('employeePath', path)}
              establishmentSearch={establishmentSearchStep2}
              onEstablishmentSearchChange={(value) => {
                setEstablishmentSearchStep2(value);
                if (selectedEstablishmentId) {
                  setSelectedEstablishmentId(null);
                }
              }}
              selectedEstablishmentId={selectedEstablishmentId}
              onEstablishmentSelect={(est) => {
                setSelectedEstablishmentId(est.id);
                setEstablishmentSearchStep2(est.name);
              }}
              onEstablishmentClear={() => setSelectedEstablishmentId(null)}
              establishments={establishments}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              searchInputRef={searchInputRef}
              isLoadingEmployees={isLoadingEmployees}
              employeeSearchResults={employeeSearchResults ?? null}
              selectedEmployee={formData.selectedEmployee}
              onEmployeeSelect={handleEmployeeSelect}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />
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
            <OwnerPathStep
              ownerPath={formData.ownerPath}
              onPathChange={(path) => handleInputChange('ownerPath', path)}
              establishmentSearch={ownerEstablishmentSearch}
              onEstablishmentSearchChange={(value) => {
                setOwnerEstablishmentSearch(value);
                if (formData.selectedEstablishmentToClaim) {
                  handleInputChange('selectedEstablishmentToClaim', null);
                }
              }}
              onEstablishmentSelect={(est) => {
                handleInputChange('selectedEstablishmentToClaim', est);
                setOwnerEstablishmentSearch(est.name);
              }}
              onEstablishmentClear={() => handleInputChange('selectedEstablishmentToClaim', null)}
              establishments={establishments}
              selectedEstablishment={formData.selectedEstablishmentToClaim}
              documents={formData.ownershipDocuments}
              onDocumentsChange={(docs) => handleInputChange('ownershipDocuments', docs)}
              documentErrors={ownershipDocErrors}
              onDocumentError={setOwnershipDocErrors}
              contactMe={formData.ownershipContactMe}
              onContactMeChange={(checked) => handleInputChange('ownershipContactMe', checked)}
              message={formData.ownershipRequestMessage}
              onMessageChange={(msg) => handleInputChange('ownershipRequestMessage', msg)}
              isLoading={isLoading}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
            />
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

          {/* STEP 4: Complete Profile - Employee Only */}
          {currentStep === 4 && formData.accountType === 'employee' && (
            <EmployeeCreateStep
              photos={formData.photos}
              onPhotosChange={(photos) => setFormData(prev => ({ ...prev, photos }))}
              photoErrors={photoErrors}
              onPhotoError={setPhotoErrors}
              employeeName={formData.employeeName}
              employeeNickname={formData.employeeNickname}
              employeeSex={formData.employeeSex}
              employeeAge={formData.employeeAge}
              employeeNationality={formData.employeeNationality}
              employeeDescription={formData.employeeDescription}
              onFieldChange={(field, value) => handleInputChange(field as keyof FormData, value as FormData[keyof FormData])}
              isFreelance={formData.isFreelance}
              freelanceNightclubIds={formData.freelanceNightclubIds}
              nightclubs={nightclubs}
              establishmentId={formData.establishmentId}
              establishmentSearch={establishmentSearchStep4}
              onEstablishmentSearchChange={(value) => {
                setEstablishmentSearchStep4(value);
                if (formData.establishmentId) {
                  handleInputChange('establishmentId', '');
                }
              }}
              onEstablishmentSelect={(est) => {
                handleInputChange('establishmentId', est.id);
                setEstablishmentSearchStep4(est.name);
              }}
              onEstablishmentClear={() => handleInputChange('establishmentId', '')}
              establishments={establishments}
              socialMedia={formData.socialMedia}
              isLoading={isLoading}
              uploadingPhotos={uploadingPhotos}
              submitError={submitError}
              onPrevious={handlePrevious}
            />
          )}

          {/* STEP 4: Owner Establishment Creation */}
          {currentStep === 4 && formData.accountType === 'establishment_owner' && (
            <OwnerCreateStep
              name={formData.newEstablishmentName}
              address={formData.newEstablishmentAddress}
              zone={formData.newEstablishmentZone}
              categoryId={formData.newEstablishmentCategoryId}
              description={formData.newEstablishmentDescription}
              phone={formData.newEstablishmentPhone}
              website={formData.newEstablishmentWebsite}
              instagram={formData.newEstablishmentInstagram}
              twitter={formData.newEstablishmentTwitter}
              tiktok={formData.newEstablishmentTiktok}
              onFieldChange={(field, value) => handleInputChange(field as keyof FormData, value as FormData[keyof FormData])}
              categories={categories}
              isLoading={isLoading}
              submitError={submitError}
              onPrevious={handlePrevious}
            />
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
