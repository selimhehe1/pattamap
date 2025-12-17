import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useFormValidation, ValidationRules } from '../../hooks/useFormValidation';
import { useAutoSave } from '../../hooks/useAutoSave';
import FormField from '../Common/FormField';
import toast from '../../utils/toast';
import '../../styles/components/modal-forms.css';

interface RegisterFormProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
  onRegisterSuccess?: (accountType: 'regular' | 'employee') => void; // 🆕 v10.0 - Callback after successful registration
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onClose, onSwitchToLogin, onRegisterSuccess }) => {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    pseudonym: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountType: 'regular' as 'regular' | 'employee' // 🆕 v10.0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [showDraftBanner, setShowDraftBanner] = useState(false);

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
      minLength: 6,
      message: (field, rule) => {
        if (rule === 'required') return t('register.passwordRequired');
        if (rule === 'minLength') return t('register.passwordMinLength');
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

  // Restore draft on mount
  useEffect(() => {
    if (isDraft) {
      const draft = restoreDraft();
      if (draft) {
        setFormData(draft);
        setShowDraftBanner(true);
        toast.success(t('register.draftRestoredToast'));
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
  };

  const handleInputBlur = (fieldName: string, value: string) => {
    handleFieldBlur(fieldName as keyof typeof formData, value);
  };

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(t('register.fixErrorsToast'));
      return;
    }

    setIsLoading(true);

    try {
      await register(
        formData.pseudonym,
        formData.email,
        formData.password,
        formData.accountType // 🆕 v10.0
      );
      clearDraft(); // Clear draft on successful submission
      toast.success(
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
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay-nightlife" data-testid="register-modal">
      <div className="modal-form-container">
        <button
          onClick={handleClose}
          className="modal-close-button"
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
                setFormData({ pseudonym: '', email: '', password: '', confirmPassword: '', accountType: 'regular' });
                setShowDraftBanner(false);
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
                  onChange={() => setFormData(prev => ({ ...prev, accountType: 'regular' }))}
                  style={{ accentColor: '#00E5FF' }}
                  data-testid="account-type-regular"
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
                  onChange={() => setFormData(prev => ({ ...prev, accountType: 'employee' }))}
                  style={{ accentColor: '#C19A6B' }}
                  data-testid="account-type-employee"
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
          </div>

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
            testId="pseudonym-input"
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
            testId="email-input"
          />

          <FormField
            label={`🔒 ${t('register.passwordLabel')}`}
            name="password"
            type="password"
            value={formData.password}
            error={errors.password}
            status={fieldStatus.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            onBlur={(e) => handleInputBlur('password', e.target.value)}
            placeholder={t('register.passwordPlaceholder')}
            required
            minLength={6}
            helpText={t('register.passwordHelp')}
            testId="register-password-input"
          />

          <FormField
            label={`🔐 ${t('register.confirmPasswordLabel')}`}
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            error={errors.confirmPassword}
            status={fieldStatus.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            onBlur={(e) => handleInputBlur('confirmPassword', e.target.value)}
            placeholder={t('register.confirmPasswordPlaceholder')}
            required
            testId="confirm-password-input"
          />

          {submitError && (
            <div className="error-message-nightlife error-shake" data-testid="register-error">
              ⚠️ {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`btn-nightlife-base btn-success-nightlife ${isLoading ? 'btn-loading' : ''}`}
            data-testid="register-button"
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