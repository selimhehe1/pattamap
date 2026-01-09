/**
 * LanguageChips - Multi-select language filter chips
 *
 * Extracted from SearchFilters.tsx for better maintainability.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

interface LanguageChipsProps {
  selectedLanguages: string;
  onLanguagesChange: (languages: string) => void;
  disabled?: boolean;
}

const LANGUAGES = [
  { code: 'Thai', flag: '🇹🇭' },
  { code: 'English', flag: '🇬🇧' },
  { code: 'Chinese', flag: '🇨🇳' },
  { code: 'Russian', flag: '🇷🇺' },
  { code: 'Korean', flag: '🇰🇷' },
  { code: 'Japanese', flag: '🇯🇵' },
  { code: 'German', flag: '🇩🇪' }
] as const;

const LanguageChips: React.FC<LanguageChipsProps> = ({
  selectedLanguages,
  onLanguagesChange,
  disabled = false
}) => {
  const { t } = useTranslation();
  const selectedList = selectedLanguages ? selectedLanguages.split(',') : [];

  const handleToggle = (langCode: string) => {
    const isSelected = selectedList.includes(langCode);
    let newLanguages: string[];

    if (isSelected) {
      newLanguages = selectedList.filter(l => l !== langCode);
    } else {
      newLanguages = [...selectedList, langCode];
    }

    onLanguagesChange(newLanguages.filter(Boolean).join(','));
  };

  return (
    <div className="filter-section">
      <label className="label-nightlife filter-label-with-icon">
        <Languages size={20} /> {t('search.languages', 'Languages')}
      </label>
      <div className="language-chips-container" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '8px'
      }}>
        {LANGUAGES.map(lang => {
          const isSelected = selectedList.includes(lang.code);

          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleToggle(lang.code)}
              disabled={disabled}
              className={`language-chip ${isSelected ? 'language-chip-active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(232, 121, 249, 0.3), rgba(0, 229, 255, 0.2))'
                  : 'rgba(255, 255, 255, 0.05)',
                border: isSelected
                  ? '2px solid #E879F9'
                  : '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '20px',
                color: isSelected ? '#E879F9' : 'rgba(255, 255, 255, 0.8)',
                fontSize: '13px',
                fontWeight: isSelected ? '600' : '500',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 0 15px rgba(232, 121, 249, 0.3)' : 'none'
              }}
            >
              <span>{lang.flag}</span>
              <span>{lang.code}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageChips;
