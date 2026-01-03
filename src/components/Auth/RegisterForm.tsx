import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, User, Lock, AlertTriangle, FileText, PersonStanding, Sparkles, Mail, KeyRound, Check, Loader2, Users, UserCog, Camera, Upload, X } from 'lucide-react';
import UserAvatar from '../Common/UserAvatar';
import { useAuth } from '../../contexts/AuthContext';
import { useFormValidation, ValidationRules } from '../../hooks/useFormValidation';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useAvailabilityCheck } from '../../hooks/useAvailabilityCheck';
import FormField from '../Common/FormField';
import notification from '../../utils/notification';
import '../../styles/components/modals.css';

interface RegisterFormProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
  onRegisterSuccess?: (accountType: 'regular' | 'employee') => void; // 🆕 v10.0 - Callback after successful registration
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onClose, onSwitchToLogin, onRegisterSuccess }) => {
  const { t } = useTranslation();
  const { register } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    pseudonym: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountType: 'regular' as 'regular' | 'employee' // 🆕 v10.0
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation rules with debounce
  const validationRules: ValidationRules<typeof formData> = {
    pseudonym: {
      required: true,
      minLength: 3,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9_]+$/,
      message: (field, rule, _value) => {
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
    key: 'register-form-draft',
    data: formData,
    debounceMs: 2000,
    enabled: true
  });

  // 🔧 Phase 9: Real-time availability check
  const pseudonymAvailability = useAvailabilityCheck('pseudonym');
  const emailAvailability = useAvailabilityCheck('email');

  // Restore draft on mount
  useEffect(() => {
    if (isDraft) {
      const draft = restoreDraft();
      if (draft) {
        setFormData(draft);
        setShowDraftBanner(true);
        notification.success(t('register.draftRestoredToast'));
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    handleFieldChange(fieldName as keyof typeof formData, value);
    setSubmitError('');

    // 🔧 Phase 9: Trigger availability check
    if (fieldName === 'pseudonym') {
      pseudonymAvailability.checkAvailability(value);
    } else if (fieldName === 'email') {
      emailAvailability.checkAvailability(value);
    }
  };

  const handleInputBlur = (fieldName: string, value: string) => {
    handleFieldBlur(fieldName as keyof typeof formData, value);
  };

  const handleClose = () => {
    onClose();
  };

  // 🔧 Phase 9: Helper to render availability feedback
  const renderAvailabilityFeedback = (
    status: 'idle' | 'checking' | 'available' | 'taken' | 'error' | 'invalid',
    message: string | null
  ) => {
    if (status === 'idle') return null;

    const styles: Record<string, React.CSSProperties> = {
      checking: { color: '#00E5FF', fontSize: '12px', marginTop: '4px' },
      available: { color: '#4CAF50', fontSize: '12px', marginTop: '4px' },
      taken: { color: '#FF5252', fontSize: '12px', marginTop: '4px' },
      invalid: { color: '#FF9800', fontSize: '12px', marginTop: '4px' },
      error: { color: '#FF9800', fontSize: '12px', marginTop: '4px' },
    };

    const icons: Record<string, React.ReactNode> = {
      checking: <Loader2 size={12} style={{ marginRight: '4px', verticalAlign: 'middle', animation: 'spin 1s linear infinite' }} />,
      available: <Check size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />,
      taken: <AlertTriangle size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />,
      invalid: <AlertTriangle size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />,
      error: <AlertTriangle size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />,
    };

    return (
      <div style={styles[status]}>
        {icons[status]}{message}
      </div>
    );
  };

  // Avatar handling
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      notification.error(t('register.avatarInvalidType', 'Please select a JPEG, PNG or WebP image'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notification.error(t('register.avatarTooLarge', 'Image must be less than 5MB'));
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleRemoveAvatar = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(null);
    setAvatarPreview('');
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      notification.error(t('register.fixErrorsToast'));
      return;
    }

    // 🔧 Phase 9: Block submit if pseudonym or email is taken
    if (pseudonymAvailability.status === 'taken') {
      notification.error(t('register.pseudonymTaken'));
      return;
    }
    if (emailAvailability.status === 'taken') {
      notification.error(t('register.emailTaken'));
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Register user
      const result = await register(
        formData.pseudonym,
        formData.email,
        formData.password,
        formData.accountType // 🆕 v10.0
      );

      // Step 2: Upload avatar if provided (after successful registration)
      if (avatarFile) {
        try {
          const avatarFormData = new FormData();
          avatarFormData.append('file', avatarFile);

          await fetch(
            `${import.meta.env.VITE_API_URL}/api/upload/avatar`,
            {
              method: 'POST',
              credentials: 'include',
              body: avatarFormData
            }
          );
          // Avatar upload is optional - don't fail registration if it fails
        } catch (avatarError) {
          console.error('Avatar upload failed:', avatarError);
          // Continue with registration success even if avatar upload fails
        }
      }

      // ⚠️ Show warning if password was found in breach database
      if (result?.passwordBreached) {
        notification.warning(t('register.passwordBreachWarning', 'Your password has been found in a data breach. Consider changing it for better security.'), {
          duration: 10000 // Show longer (10 seconds)
        });
      }

      clearDraft(); // Clear draft on successful submission
      handleRemoveAvatar(); // Clean up avatar preview
      notification.success(
        formData.accountType === 'employee'
          ? t('register.employeeAccountCreated')
          : t('register.accountCreated')
      );

      // 🆕 v10.0 - Call onRegisterSuccess callback if provided (for employee wizard)
      if (onRegisterSuccess) {
        onRegisterSuccess(formData.accountType);
      } else {
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

  return (
    <div className="modal-overlay-unified" role="dialog" aria-modal="true" data-testid="register-modal">
      <div className="modal-content-unified modal--medium">
        <button
          onClick={handleClose}
          className="modal-close-btn"
          aria-label="Close"
          data-testid="close-register-modal"
        >
          ×
        </button>

        <div className="modal-header">
          <h2 className="header-title-nightlife">
            {t('register.title')}
          </h2>
          <p className="modal-subtitle">
            {t('register.subtitle')}
          </p>
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
                setFormData({ pseudonym: '', email: '', password: '', confirmPassword: '', accountType: 'regular' });
                setShowDraftBanner(false);
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

        <form onSubmit={handleSubmit} className="form-layout" data-testid="register-form">
          {/* 🆕 v10.0 - Account Type Selection */}
          <div style={{ marginBottom: '20px' }} data-testid="account-type-section">
            <label style={{
              display: 'block',
              color: '#00E5FF',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '10px'
            }}>
              <UserCog size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('register.accountType')}
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
                  onChange={() => setFormData(prev => ({ ...prev, accountType: 'regular' }))}
                  style={{ accentColor: '#00E5FF' }}
                  data-testid="account-type-regular"
                />
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '15px' }}>
                    <Users size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('register.regularUser')}
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
                  onChange={() => setFormData(prev => ({ ...prev, accountType: 'employee' }))}
                  style={{ accentColor: '#C19A6B' }}
                  data-testid="account-type-employee"
                />
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '15px' }}>
                    <PersonStanding size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.employeeUser')}
                  </div>
                  <div style={{ color: '#cccccc', fontSize: '12px', marginTop: '4px' }}>
                    {t('register.employeeUserDesc')}
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
                  <Sparkles size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.employeeBenefitsTitle')}
                </div>
                <ul style={{ margin: '0', paddingLeft: '20px' }}>
                  <li>{t('register.employeeBenefit1')}</li>
                  <li>{t('register.employeeBenefit2')}</li>
                  <li>{t('register.employeeBenefit3')}</li>
                  <li>{t('register.employeeBenefit4')}</li>
                </ul>
              </div>
            )}
          </div>

          {/* Avatar Upload Section (Optional) */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#E879F9',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '10px'
            }}>
              <Camera size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              {t('register.avatarLabel', 'Profile Photo')}
              <span style={{ color: '#888', fontWeight: 'normal', fontSize: '12px', marginLeft: '6px' }}>
                ({t('register.optional', 'optional')})
              </span>
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Avatar Preview */}
              <UserAvatar
                user={{
                  pseudonym: formData.pseudonym || 'User',
                  avatar_url: avatarPreview || null
                }}
                size="lg"
                showBorder={true}
              />

              {/* Upload Zone or Remove Button */}
              <div style={{ flex: 1 }}>
                {!avatarPreview ? (
                  <div
                    onClick={() => avatarInputRef.current?.click()}
                    style={{
                      border: '2px dashed #444',
                      borderRadius: '12px',
                      padding: '20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      background: 'rgba(232,121,249,0.05)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#E879F9';
                      e.currentTarget.style.background = 'rgba(232,121,249,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#444';
                      e.currentTarget.style.background = 'rgba(232,121,249,0.05)';
                    }}
                  >
                    <Upload size={24} style={{ color: '#E879F9', marginBottom: '8px' }} />
                    <p style={{ color: '#fff', fontSize: '13px', margin: 0 }}>
                      {t('register.clickToUpload', 'Click to upload')}
                    </p>
                    <p style={{ color: '#666', fontSize: '11px', margin: '4px 0 0' }}>
                      {t('register.avatarFormats', 'JPEG, PNG, WebP (max 5MB)')}
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      background: 'transparent',
                      border: '1px solid #ef4444',
                      borderRadius: '8px',
                      color: '#ef4444',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <X size={16} />
                    {t('register.removePhoto', 'Remove photo')}
                  </button>
                )}
              </div>
            </div>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
          </div>

          <div>
            <FormField
              label={<><User size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />{t('register.pseudonymLabel')}</>}
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
              testId="pseudonym-input"
            />
            {renderAvailabilityFeedback(pseudonymAvailability.status, pseudonymAvailability.message)}
          </div>

          <div>
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
              testId="email-input"
            />
            {renderAvailabilityFeedback(emailAvailability.status, emailAvailability.message)}
          </div>

          <div style={{ position: 'relative' }}>
            <FormField
              label={<><Lock size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />{t('register.passwordLabel')}</>}
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
              testId="register-password-input"
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
              data-testid="toggle-password-visibility"
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
              testId="confirm-password-input"
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
              data-testid="toggle-confirm-password-visibility"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {submitError && (
            <div className="error-message-nightlife error-shake" data-testid="register-error">
              <AlertTriangle size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`btn btn--success ${isLoading ? 'btn--loading' : ''}`}
            data-testid="register-button"
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

          <div className="auth-switch-text">
            <span className="auth-switch-label">
              {t('register.alreadyHaveAccount')}{' '}
            </span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="auth-switch-button"
              data-testid="login-link"
            >
              {t('register.loginHere')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default RegisterForm;