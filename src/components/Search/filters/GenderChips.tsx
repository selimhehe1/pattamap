/**
 * GenderChips - Gender selection chips filter
 *
 * Extracted from SearchFilters.tsx for better maintainability.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';

interface GenderChipsProps {
  selectedGender: string;
  onGenderChange: (gender: string) => void;
  disabled?: boolean;
}

const GENDERS = [
  { value: 'female', icon: '♀' },
  { value: 'male', icon: '♂' },
  { value: 'ladyboy', icon: '⚧' }
] as const;

const GenderChips: React.FC<GenderChipsProps> = ({
  selectedGender,
  onGenderChange,
  disabled = false
}) => {
  const { t } = useTranslation();

  return (
    <div className="filter-section">
      <label className="label-nightlife filter-label-with-icon">
        <User size={20} /> {t('search.gender', 'Gender')}
      </label>
      <div className="gender-chips-container" style={{
        display: 'flex',
        flexWrap: 'nowrap',
        gap: '8px',
        marginTop: '8px'
      }}>
        {GENDERS.map(gender => {
          const isSelected = selectedGender === gender.value;
          const label = t(`employee.sex.${gender.value}`, gender.value);

          return (
            <button
              key={gender.value}
              type="button"
              title={label}
              onClick={() => {
                // Toggle: if clicking on current selection, clear it
                onGenderChange(isSelected ? '' : gender.value);
              }}
              disabled={disabled}
              className={`gender-chip ${isSelected ? 'gender-chip-active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 16px',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(232, 121, 249, 0.3), rgba(168, 85, 247, 0.2))'
                  : 'rgba(255, 255, 255, 0.05)',
                border: isSelected
                  ? '2px solid #E879F9'
                  : '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: isSelected ? '#E879F9' : 'rgba(255, 255, 255, 0.8)',
                fontSize: '20px',
                fontWeight: isSelected ? '600' : '500',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 0 15px rgba(232, 121, 249, 0.3)' : 'none',
                flex: '1 1 auto',
                minWidth: '50px'
              }}
            >
              <span>{gender.icon}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GenderChips;
