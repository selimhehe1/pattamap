import React, { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Rocket, Link, Sparkles, Search, User, CheckCircle } from 'lucide-react';
import { Employee, Establishment } from '../../../types';
import { EstablishmentAutocomplete } from '../components';
import type { EmployeePath, EmployeeSearchResults } from './types';

interface EmployeePathStepProps {
  // Path selection
  employeePath: EmployeePath;
  onPathChange: (path: EmployeePath) => void;

  // Establishment search (for filtering employees)
  establishmentSearch: string;
  onEstablishmentSearchChange: (value: string) => void;
  selectedEstablishmentId: string | null;
  onEstablishmentSelect: (est: Establishment) => void;
  onEstablishmentClear: () => void;
  establishments: Establishment[];

  // Employee search
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;

  // Employee results
  isLoadingEmployees: boolean;
  employeeSearchResults: EmployeeSearchResults | null;

  // Selected employee
  selectedEmployee: Employee | null;
  onEmployeeSelect: (employee: Employee) => void;

  // Navigation
  onPrevious: () => void;
  onNext: () => void;
}

/**
 * EmployeePathStep - Step 2 for Employee registration
 *
 * Allows the user to choose between:
 * - Claiming an existing employee profile
 * - Creating a new employee profile
 */
const EmployeePathStep: React.FC<EmployeePathStepProps> = ({
  employeePath,
  onPathChange,
  establishmentSearch,
  onEstablishmentSearchChange,
  selectedEstablishmentId,
  onEstablishmentSelect,
  onEstablishmentClear,
  establishments,
  searchQuery,
  onSearchQueryChange,
  searchInputRef,
  isLoadingEmployees,
  employeeSearchResults,
  selectedEmployee,
  onEmployeeSelect,
  onPrevious,
  onNext,
}) => {
  const { t } = useTranslation();

  return (
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
        border: `2px solid ${employeePath === 'claim' ? '#00E5FF' : 'rgba(255,255,255,0.2)'}`,
        borderRadius: '12px',
        background: employeePath === 'claim'
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
          checked={employeePath === 'claim'}
          onChange={() => onPathChange('claim')}
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

      {/* Claim Search Section */}
      {employeePath === 'claim' && (
        <div style={{ marginBottom: '16px', paddingLeft: '16px' }}>
          {/* Establishment Filter */}
          <div style={{ marginBottom: '12px' }}>
            <EstablishmentAutocomplete
              value={establishmentSearch}
              onChange={onEstablishmentSearchChange}
              onSelect={onEstablishmentSelect}
              onClear={onEstablishmentClear}
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
              onChange={(e) => onSearchQueryChange(e.target.value)}
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
            ) : employeeSearchResults?.employees?.length ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '10px'
              }}>
                {employeeSearchResults.employees.map((employee) => (
                  <EmployeeCard
                    key={employee.id}
                    employee={employee}
                    isSelected={selectedEmployee?.id === employee.id}
                    onSelect={() => onEmployeeSelect(employee)}
                  />
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
          {selectedEmployee && (
            <SelectedEmployeePreview employee={selectedEmployee} />
          )}
        </div>
      )}

      {/* Option: Create New Profile */}
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        border: `2px solid ${employeePath === 'create' ? '#C19A6B' : 'rgba(255,255,255,0.2)'}`,
        borderRadius: '12px',
        background: employeePath === 'create'
          ? 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(193, 154, 107,0.2))'
          : 'rgba(0,0,0,0.3)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
      }}>
        <input
          type="radio"
          name="employeePath"
          value="create"
          checked={employeePath === 'create'}
          onChange={() => onPathChange('create')}
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
          onClick={onPrevious}
          className="btn btn--secondary"
          style={{ flex: 1 }}
        >
          ← {t('register.backButton')}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="btn btn--success"
          style={{ flex: 2 }}
        >
          {t('register.nextButton')} →
        </button>
      </div>
    </div>
  );
};

// ============================================
// Sub-components
// ============================================

interface EmployeeCardProps {
  employee: Employee;
  isSelected: boolean;
  onSelect: () => void;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, isSelected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: '8px',
        background: isSelected
          ? 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,229,255,0.3))'
          : 'rgba(0,0,0,0.3)',
        border: isSelected
          ? '2px solid #00E5FF'
          : '2px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        textAlign: 'center'
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#00E5FF';
          e.currentTarget.style.background = 'rgba(0,229,255,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
        }
      }}
    >
      {employee.photos?.[0] ? (
        <img
          src={employee.photos[0]}
          alt={employee.name}
          style={{
            width: '56px',
            height: '56px',
            objectFit: 'cover',
            borderRadius: '8px',
            margin: '0 auto 6px'
          }}
        />
      ) : (
        <div style={{
          width: '56px',
          height: '56px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '8px',
          margin: '0 auto 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <User size={22} />
        </div>
      )}
      <div style={{
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: '12px',
        marginBottom: '2px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {employee.name}
      </div>
      {employee.nickname && (
        <div style={{
          color: '#cccccc',
          fontSize: '10px',
          marginBottom: '2px',
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
          fontSize: '9px',
          marginTop: '2px'
        }}>
          {employee.age && `${employee.age}y`}
          {employee.age && employee.nationality && ' • '}
          {Array.isArray(employee.nationality) ? employee.nationality.join(' / ') : employee.nationality}
        </div>
      )}
    </div>
  );
};

interface SelectedEmployeePreviewProps {
  employee: Employee;
}

const SelectedEmployeePreview: React.FC<SelectedEmployeePreviewProps> = ({ employee }) => {
  const { t } = useTranslation();

  return (
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
        {employee.photos?.[0] && (
          <img
            src={employee.photos[0]}
            alt={employee.name}
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
            {employee.name}
          </div>
          {employee.nickname && (
            <div style={{ color: '#cccccc', fontSize: '12px' }}>
              aka "{employee.nickname}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeePathStep;
