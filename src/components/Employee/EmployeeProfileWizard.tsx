import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { Employee } from '../../types';
import ClaimEmployeeModal from './ClaimEmployeeModal';
import LazyImage from '../Common/LazyImage';
import toast from '../../utils/toast';
import { logger } from '../../utils/logger';
import '../../styles/components/modal-forms.css';

interface EmployeeProfileWizardProps {
  onClose: () => void;
  onCreateProfile: () => void;
}

/**
 * EmployeeProfileWizard
 *
 * Guided onboarding wizard for users who register as employees.
 * Presents two clear paths:
 *
 * **Option A**: Claim an existing profile (someone else created it)
 * **Option B**: Create a new self-managed profile
 *
 * This wizard is automatically displayed after successful employee registration
 * to guide users through the profile setup process.
 *
 * Features:
 * - Clean, intuitive two-option interface
 * - Nightlife theme styling consistent with RegisterForm
 * - Integrates ClaimEmployeeModal for Option A
 * - Triggers parent callback for Option B (create new profile)
 *
 * @param onClose - Callback to close the wizard
 * @param onCreateProfile - Callback to trigger create profile flow
 */
const EmployeeProfileWizard: React.FC<EmployeeProfileWizardProps> = ({
  onClose,
  onCreateProfile
}) => {
  const { t } = useTranslation();
  const { secureFetch } = useSecureFetch();

  // 🆕 v10.0.2 - Employee list for Option A
  const [showEmployeesList, setShowEmployeesList] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Original state
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [preselectedEmployee, setPreselectedEmployee] = useState<Employee | null>(null);

  // 🆕 v10.0.2 - Load employees when Option A is clicked
  useEffect(() => {
    if (showEmployeesList && employees.length === 0) {
      setIsLoadingEmployees(true);
      secureFetch(`${import.meta.env.VITE_API_URL}/api/employees`)
        .then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            setEmployees(data.employees || []);
          } else {
            toast.error(t('employeeProfileWizard.errorLoadEmployees'));
          }
        })
        .catch((error) => {
          logger.error('Error loading employees:', error);
          toast.error(t('employeeProfileWizard.errorLoadEmployees'));
        })
        .finally(() => {
          setIsLoadingEmployees(false);
        });
    }
  }, [showEmployeesList, employees.length, secureFetch, t]);

  const handleOptionAClaim = () => {
    setShowEmployeesList(true); // 🆕 Show list instead of modal
  };

  const handleOptionBCreate = () => {
    onClose(); // Close wizard first
    onCreateProfile(); // Then trigger create profile flow
  };

  const handleClaimSubmitted = () => {
    setShowClaimModal(false);
    onClose(); // Close wizard after claim submitted
  };

  const handleClaimClick = (employee: Employee) => {
    setPreselectedEmployee(employee);
    setShowClaimModal(true);
  };

  const handleBackToOptions = () => {
    setShowEmployeesList(false);
    setSearchQuery('');
  };

  // Filter employees by search query (client-side)
  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(query) ||
      emp.nickname?.toLowerCase().includes(query) ||
      (Array.isArray(emp.nationality) && emp.nationality.some(nat => nat.toLowerCase().includes(query)))
    );
  });

  // If ClaimEmployeeModal is open, render it instead of wizard
  if (showClaimModal) {
    return (
      <ClaimEmployeeModal
        onClose={() => {
          setShowClaimModal(false);
          setPreselectedEmployee(null);
        }}
        onClaimSubmitted={handleClaimSubmitted}
        preselectedEmployee={preselectedEmployee || undefined} // 🆕 v10.0.2
      />
    );
  }

  // 🆕 v10.0.2 - If showing employees list, render list view
  if (showEmployeesList) {
    return (
      <div className="modal-overlay-nightlife">
        <div className="modal-form-container" style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
          <button
            onClick={onClose}
            className="modal-close-button"
            aria-label={t('employeeProfileWizard.ariaClose')}
          >
            ×
          </button>

          <div className="modal-header" style={{ marginBottom: '30px' }}>
            <h2 className="header-title-nightlife" style={{ fontSize: '28px', marginBottom: '12px' }}>
              🔍 {t('employeeProfileWizard.titleFindProfile')}
            </h2>
            <p className="modal-subtitle" style={{ fontSize: '15px' }}>
              {t('employeeProfileWizard.subtitleFindProfile')}
            </p>
          </div>

          {/* Search Bar */}
          <div style={{ marginBottom: '24px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('employeeProfileWizard.placeholderSearch')}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: 'rgba(0,0,0,0.4)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '16px',
                transition: 'all 0.3s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#00E5FF';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              }}
            />
            <div style={{ fontSize: '13px', color: '#cccccc', marginTop: '8px' }}>
              {t(filteredEmployees.length === 1 ? 'employeeProfileWizard.counterFoundSingular' : 'employeeProfileWizard.counterFoundPlural', { count: filteredEmployees.length })}
              {employees.length > 0 && ` ${t('employeeProfileWizard.counterTotal', { count: employees.length })}`}
            </div>
          </div>

          {/* Loading State */}
          {isLoadingEmployees && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#00E5FF',
              fontSize: '18px'
            }}>
              <div className="loading-spinner-small-nightlife" style={{ margin: '0 auto 16px' }} />
              {t('employeeProfileWizard.loadingEmployees')}
            </div>
          )}

          {/* Employees Grid */}
          {!isLoadingEmployees && filteredEmployees.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '2px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#00E5FF';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,229,255,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Photo */}
                  <div style={{
                    position: 'relative',
                    marginBottom: '12px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    aspectRatio: '3/4',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }}>
                    {employee.photos && employee.photos.length > 0 ? (
                      <LazyImage
                        src={employee.photos[0]}
                        alt={employee.name}
                        cloudinaryPreset="cardPreview"
                        objectFit="cover"
                        style={{ borderRadius: '12px' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '48px',
                        color: 'rgba(255,255,255,0.3)'
                      }}>
                        👤
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ color: 'white', marginBottom: '12px' }}>
                    <h3 style={{
                      margin: '0 0 6px 0',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#C19A6B'
                    }}>
                      {employee.name}
                    </h3>
                    {employee.nickname && (
                      <div style={{
                        fontSize: '13px',
                        color: '#cccccc',
                        marginBottom: '6px'
                      }}>
                        {t('employeeProfileWizard.nicknamePrefix')} "{employee.nickname}"
                      </div>
                    )}
                    <div style={{
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.7)'
                    }}>
                      {employee.age && t('employeeProfileWizard.ageLabel', { age: employee.age })}
                      {employee.age && employee.nationality && ' • '}
                      {employee.nationality}
                    </div>
                  </div>

                  {/* Claim Button */}
                  <button
                    onClick={() => handleClaimClick(employee)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,229,255,0.3))',
                      border: '2px solid #00E5FF',
                      borderRadius: '10px',
                      color: '#00E5FF',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,229,255,0.3), rgba(0,229,255,0.4))';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,229,255,0.3))';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    🔗 {t('employeeProfileWizard.buttonClaimProfile')}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoadingEmployees && filteredEmployees.length === 0 && employees.length > 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '16px'
            }}>
              😔 {t('employeeProfileWizard.emptyStateNoMatch')}
            </div>
          )}

          {/* Back Button */}
          <button
            onClick={handleBackToOptions}
            style={{
              width: '100%',
              padding: '12px 20px',
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
            ← {t('employeeProfileWizard.buttonBackToOptions')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay-nightlife">
      <div className="modal-form-container" style={{ maxWidth: '800px' }}>
        <button
          onClick={onClose}
          className="modal-close-button"
          aria-label={t('employeeProfileWizard.ariaClose')}
        >
          ×
        </button>

        <div className="modal-header" style={{ marginBottom: '40px' }}>
          <h2 className="header-title-nightlife" style={{ fontSize: '32px', marginBottom: '12px' }}>
            🎉 {t('employeeProfileWizard.titleWelcome')}
          </h2>
          <p className="modal-subtitle" style={{ fontSize: '16px', lineHeight: '1.6' }}>
            {t('employeeProfileWizard.subtitleWelcome')}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '30px',
            marginBottom: '30px',
          }}
        >
          {/* Option A: Claim Existing Profile */}
          <div
            onClick={handleOptionAClaim}
            style={{
              padding: '30px',
              background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,229,255,0.25))',
              border: '2px solid #00E5FF',
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,229,255,0.4)';
              e.currentTarget.style.borderColor = '#00E5FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleOptionAClaim();
              }
            }}
            aria-label={t('employeeProfileWizard.ariaClaimExisting')}
          >
            {/* Option Badge */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#00E5FF',
                color: '#0a0a2e',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              {t('employeeProfileWizard.optionABadge')}
            </div>

            {/* Icon */}
            <div
              style={{
                fontSize: '64px',
                marginBottom: '20px',
                lineHeight: 1,
              }}
            >
              🔗
            </div>

            {/* Title */}
            <h3
              style={{
                color: '#00E5FF',
                fontSize: '22px',
                fontWeight: 'bold',
                marginBottom: '16px',
              }}
            >
              {t('employeeProfileWizard.optionATitle')}
            </h3>

            {/* Description */}
            <p
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: '15px',
                lineHeight: '1.6',
                marginBottom: '20px',
              }}
            >
              {t('employeeProfileWizard.optionADescription')}
            </p>

            {/* Benefits List */}
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 20px 0',
                textAlign: 'left',
              }}
            >
              <li
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: '13px',
                  marginBottom: '8px',
                  paddingLeft: '24px',
                  position: 'relative',
                }}
              >
                <span style={{ position: 'absolute', left: 0 }}>✓</span>
                {t('employeeProfileWizard.optionABenefit1')}
              </li>
              <li
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: '13px',
                  marginBottom: '8px',
                  paddingLeft: '24px',
                  position: 'relative',
                }}
              >
                <span style={{ position: 'absolute', left: 0 }}>✓</span>
                {t('employeeProfileWizard.optionABenefit2')}
              </li>
              <li
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: '13px',
                  paddingLeft: '24px',
                  position: 'relative',
                }}
              >
                <span style={{ position: 'absolute', left: 0 }}>✓</span>
                {t('employeeProfileWizard.optionABenefit3')}
              </li>
            </ul>

            {/* CTA */}
            <div
              style={{
                color: '#00E5FF',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>{t('employeeProfileWizard.optionACTA')}</span>
              <span>→</span>
            </div>
          </div>

          {/* Option B: Create New Profile */}
          <div
            onClick={handleOptionBCreate}
            style={{
              padding: '30px',
              background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(193, 154, 107,0.25))',
              border: '2px solid #C19A6B',
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(193, 154, 107,0.4)';
              e.currentTarget.style.borderColor = '#C19A6B';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleOptionBCreate();
              }
            }}
            aria-label={t('employeeProfileWizard.ariaCreateNew')}
          >
            {/* Option Badge */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#C19A6B',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              {t('employeeProfileWizard.optionBBadge')}
            </div>

            {/* Icon */}
            <div
              style={{
                fontSize: '64px',
                marginBottom: '20px',
                lineHeight: 1,
              }}
            >
              ✨
            </div>

            {/* Title */}
            <h3
              style={{
                color: '#C19A6B',
                fontSize: '22px',
                fontWeight: 'bold',
                marginBottom: '16px',
              }}
            >
              {t('employeeProfileWizard.optionBTitle')}
            </h3>

            {/* Description */}
            <p
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: '15px',
                lineHeight: '1.6',
                marginBottom: '20px',
              }}
            >
              {t('employeeProfileWizard.optionBDescription')}
            </p>

            {/* Benefits List */}
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 20px 0',
                textAlign: 'left',
              }}
            >
              <li
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: '13px',
                  marginBottom: '8px',
                  paddingLeft: '24px',
                  position: 'relative',
                }}
              >
                <span style={{ position: 'absolute', left: 0 }}>✓</span>
                {t('employeeProfileWizard.optionBBenefit1')}
              </li>
              <li
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: '13px',
                  marginBottom: '8px',
                  paddingLeft: '24px',
                  position: 'relative',
                }}
              >
                <span style={{ position: 'absolute', left: 0 }}>✓</span>
                {t('employeeProfileWizard.optionBBenefit2')}
              </li>
              <li
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: '13px',
                  paddingLeft: '24px',
                  position: 'relative',
                }}
              >
                <span style={{ position: 'absolute', left: 0 }}>✓</span>
                {t('employeeProfileWizard.optionBBenefit3')}
              </li>
            </ul>

            {/* CTA */}
            <div
              style={{
                color: '#C19A6B',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>{t('employeeProfileWizard.optionBCTA')}</span>
              <span>→</span>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div
          style={{
            padding: '20px',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: '1.6',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>💡</span>
            <div>
              <strong style={{ color: '#FFD700', display: 'block', marginBottom: '8px' }}>
                {t('employeeProfileWizard.infoBoxQuestion')}
              </strong>
              <p style={{ margin: 0 }}>
                {t('employeeProfileWizard.infoBoxOptionA')}
              </p>
              <p style={{ margin: '8px 0 0 0' }}>
                {t('employeeProfileWizard.infoBoxOptionB')}
              </p>
            </div>
          </div>
        </div>

        {/* Skip Button */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '8px 16px',
              transition: 'color 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
            }}
          >
            {t('employeeProfileWizard.buttonSkip')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfileWizard;
