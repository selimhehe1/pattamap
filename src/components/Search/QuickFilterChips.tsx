import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Gem } from 'lucide-react';
import '../../styles/components/quick-filter-chips.css';

interface QuickFilterChipsProps {
  filters: {
    is_verified: string;
    type: string;
    sex: string;
  };
  onFilterChange: (key: string, value: string) => void;
}

/**
 * QuickFilterChips - Horizontal scrollable filter chips for mobile
 *
 * Displays the most commonly used filters as tappable chips:
 * - Verified profiles
 * - Freelance type
 * - Gender (Female/Male/Ladyboy)
 *
 * @version 11.4
 */
const QuickFilterChips: React.FC<QuickFilterChipsProps> = memo(({
  filters,
  onFilterChange
}) => {
  const { t } = useTranslation();

  const isVerified = filters.is_verified === 'true';
  const isFreelance = filters.type === 'freelance';
  const currentSex = filters.sex;

  const handleVerifiedToggle = () => {
    onFilterChange('is_verified', isVerified ? '' : 'true');
  };

  const handleFreelanceToggle = () => {
    onFilterChange('type', isFreelance ? 'all' : 'freelance');
  };

  const handleSexToggle = (sex: string) => {
    onFilterChange('sex', currentSex === sex ? '' : sex);
  };

  return (
    <div className="quick-filter-chips" role="group" aria-label={t('search.quickFilters', 'Quick filters')}>
      {/* Verified chip */}
      <button
        type="button"
        className={`quick-filter-chip ${isVerified ? 'quick-filter-chip--active' : ''}`}
        onClick={handleVerifiedToggle}
        aria-pressed={isVerified}
        aria-label={t('search.verified', 'Verified')}
      >
        <span className="quick-filter-chip__icon">
          <Check size={14} />
        </span>
        <span>{t('search.verified', 'Verified')}</span>
      </button>

      {/* Freelance chip */}
      <button
        type="button"
        className={`quick-filter-chip ${isFreelance ? 'quick-filter-chip--active' : ''}`}
        onClick={handleFreelanceToggle}
        aria-pressed={isFreelance}
        aria-label={t('search.freelances', 'Freelance')}
      >
        <span className="quick-filter-chip__icon">
          <Gem size={14} />
        </span>
        <span>{t('search.freelances', 'Freelance')}</span>
      </button>

      {/* Gender chips */}
      <button
        type="button"
        className={`quick-filter-chip quick-filter-chip--gender ${currentSex === 'female' ? 'quick-filter-chip--active' : ''}`}
        onClick={() => handleSexToggle('female')}
        aria-pressed={currentSex === 'female'}
        aria-label={t('employee.sex.female', 'Female')}
      >
        <span className="quick-filter-chip__icon" aria-hidden="true">&#9792;</span>
      </button>

      <button
        type="button"
        className={`quick-filter-chip quick-filter-chip--gender ${currentSex === 'male' ? 'quick-filter-chip--active' : ''}`}
        onClick={() => handleSexToggle('male')}
        aria-pressed={currentSex === 'male'}
        aria-label={t('employee.sex.male', 'Male')}
      >
        <span className="quick-filter-chip__icon" aria-hidden="true">&#9794;</span>
      </button>

      <button
        type="button"
        className={`quick-filter-chip quick-filter-chip--gender ${currentSex === 'ladyboy' ? 'quick-filter-chip--active' : ''}`}
        onClick={() => handleSexToggle('ladyboy')}
        aria-pressed={currentSex === 'ladyboy'}
        aria-label={t('employee.sex.ladyboy', 'Ladyboy')}
      >
        <span className="quick-filter-chip__icon" aria-hidden="true">&#9895;</span>
      </button>
    </div>
  );
});

QuickFilterChips.displayName = 'QuickFilterChips';

export default QuickFilterChips;
