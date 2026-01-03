import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { Employee } from '../../types';
import ClaimEmployeeModal from './ClaimEmployeeModal';
import LazyImage from '../Common/LazyImage';
import notification from '../../utils/notification';
import { logger } from '../../utils/logger';
import {
  Search,
  User,
  Link,
  Frown,
  PartyPopper,
  Sparkles,
  Check,
  Lightbulb
} from 'lucide-react';
import '../../styles/components/modals.css';
import '../../styles/components/employee-wizard.css';

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
            notification.error(t('employeeProfileWizard.errorLoadEmployees'));
          }
        })
        .catch((error) => {
          logger.error('Error loading employees:', error);
          notification.error(t('employeeProfileWizard.errorLoadEmployees'));
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
      <div className="modal-overlay-unified" role="dialog" aria-modal="true">
        <div className="modal-content-unified modal--large" style={{ maxHeight: '90vh', overflow: 'auto' }}>
          <button
            onClick={onClose}
            className="modal-close-btn"
            aria-label={t('employeeProfileWizard.ariaClose')}
          >
            ×
          </button>

          <div className="wizard-header wizard-header--compact">
            <h2 className="header-title-nightlife wizard-title wizard-title--compact">
              <Search size={24} />
              {t('employeeProfileWizard.titleFindProfile')}
            </h2>
            <p className="modal-subtitle wizard-subtitle">
              {t('employeeProfileWizard.subtitleFindProfile')}
            </p>
          </div>

          {/* Search Bar */}
          <div className="wizard-search-container">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('employeeProfileWizard.placeholderSearch')}
              className="wizard-search-input"
            />
            <div className="wizard-search-count">
              {t(filteredEmployees.length === 1 ? 'employeeProfileWizard.counterFoundSingular' : 'employeeProfileWizard.counterFoundPlural', { count: filteredEmployees.length })}
              {employees.length > 0 && ` ${t('employeeProfileWizard.counterTotal', { count: employees.length })}`}
            </div>
          </div>

          {/* Loading State */}
          {isLoadingEmployees && (
            <div className="wizard-loading">
              <div className="loading-spinner-small-nightlife" />
              {t('employeeProfileWizard.loadingEmployees')}
            </div>
          )}

          {/* Employees Grid */}
          {!isLoadingEmployees && filteredEmployees.length > 0 && (
            <div className="wizard-employees-grid">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="wizard-employee-card"
                >
                  {/* Photo */}
                  <div className="wizard-employee-photo">
                    {employee.photos && employee.photos.length > 0 ? (
                      <LazyImage
                        src={employee.photos[0]}
                        alt={employee.name}
                        cloudinaryPreset="cardPreview"
                        objectFit="cover"
                      />
                    ) : (
                      <div className="wizard-employee-photo-placeholder">
                        <User size={48} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="wizard-employee-info">
                    <h3 className="wizard-employee-name">
                      {employee.name}
                    </h3>
                    {employee.nickname && (
                      <div className="wizard-employee-nickname">
                        {t('employeeProfileWizard.nicknamePrefix')} "{employee.nickname}"
                      </div>
                    )}
                    <div className="wizard-employee-details">
                      {employee.age && t('employeeProfileWizard.ageLabel', { age: employee.age })}
                      {employee.age && employee.nationality && ' • '}
                      {employee.nationality}
                    </div>
                  </div>

                  {/* Claim Button */}
                  <button
                    onClick={() => handleClaimClick(employee)}
                    className="wizard-claim-btn"
                  >
                    <Link size={13} />
                    {t('employeeProfileWizard.buttonClaimProfile')}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoadingEmployees && filteredEmployees.length === 0 && employees.length > 0 && (
            <div className="wizard-empty-state">
              <Frown size={16} />
              {t('employeeProfileWizard.emptyStateNoMatch')}
            </div>
          )}

          {/* Back Button */}
          <button
            onClick={handleBackToOptions}
            className="wizard-back-btn"
          >
            ← {t('employeeProfileWizard.buttonBackToOptions')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay-unified" role="dialog" aria-modal="true">
      <div className="modal-content-unified modal--large">
        <button
          onClick={onClose}
          className="modal-close-btn"
          aria-label={t('employeeProfileWizard.ariaClose')}
        >
          ×
        </button>

        <div className="wizard-header">
          <h2 className="header-title-nightlife wizard-title">
            <PartyPopper size={28} />
            {t('employeeProfileWizard.titleWelcome')}
          </h2>
          <p className="modal-subtitle wizard-subtitle">
            {t('employeeProfileWizard.subtitleWelcome')}
          </p>
        </div>

        <div className="wizard-options-grid">
          {/* Option A: Claim Existing Profile */}
          <div
            onClick={handleOptionAClaim}
            className="wizard-option-card wizard-option-card--claim"
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
            <div className="wizard-option-badge wizard-option-badge--cyan">
              {t('employeeProfileWizard.optionABadge')}
            </div>

            {/* Icon */}
            <div className="wizard-option-icon">
              <Link size={64} />
            </div>

            {/* Title */}
            <h3 className="wizard-option-title wizard-option-title--cyan">
              {t('employeeProfileWizard.optionATitle')}
            </h3>

            {/* Description */}
            <p className="wizard-option-description">
              {t('employeeProfileWizard.optionADescription')}
            </p>

            {/* Benefits List */}
            <ul className="wizard-benefits-list">
              <li className="wizard-benefits-item">
                <Check size={12} />
                {t('employeeProfileWizard.optionABenefit1')}
              </li>
              <li className="wizard-benefits-item">
                <Check size={12} />
                {t('employeeProfileWizard.optionABenefit2')}
              </li>
              <li className="wizard-benefits-item">
                <Check size={12} />
                {t('employeeProfileWizard.optionABenefit3')}
              </li>
            </ul>

            {/* CTA */}
            <div className="wizard-option-cta wizard-option-cta--cyan">
              <span>{t('employeeProfileWizard.optionACTA')}</span>
              <span>→</span>
            </div>
          </div>

          {/* Option B: Create New Profile */}
          <div
            onClick={handleOptionBCreate}
            className="wizard-option-card wizard-option-card--create"
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
            <div className="wizard-option-badge wizard-option-badge--gold">
              {t('employeeProfileWizard.optionBBadge')}
            </div>

            {/* Icon */}
            <div className="wizard-option-icon">
              <Sparkles size={64} />
            </div>

            {/* Title */}
            <h3 className="wizard-option-title wizard-option-title--gold">
              {t('employeeProfileWizard.optionBTitle')}
            </h3>

            {/* Description */}
            <p className="wizard-option-description">
              {t('employeeProfileWizard.optionBDescription')}
            </p>

            {/* Benefits List */}
            <ul className="wizard-benefits-list">
              <li className="wizard-benefits-item">
                <Check size={12} />
                {t('employeeProfileWizard.optionBBenefit1')}
              </li>
              <li className="wizard-benefits-item">
                <Check size={12} />
                {t('employeeProfileWizard.optionBBenefit2')}
              </li>
              <li className="wizard-benefits-item">
                <Check size={12} />
                {t('employeeProfileWizard.optionBBenefit3')}
              </li>
            </ul>

            {/* CTA */}
            <div className="wizard-option-cta wizard-option-cta--gold">
              <span>{t('employeeProfileWizard.optionBCTA')}</span>
              <span>→</span>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="wizard-info-box">
          <div className="wizard-info-box-content">
            <Lightbulb size={20} color="#FFD700" />
            <div>
              <strong className="wizard-info-box-title">
                {t('employeeProfileWizard.infoBoxQuestion')}
              </strong>
              <p>{t('employeeProfileWizard.infoBoxOptionA')}</p>
              <p>{t('employeeProfileWizard.infoBoxOptionB')}</p>
            </div>
          </div>
        </div>

        {/* Skip Button */}
        <div className="wizard-skip-container">
          <button onClick={onClose} className="wizard-skip-btn">
            {t('employeeProfileWizard.buttonSkip')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfileWizard;
