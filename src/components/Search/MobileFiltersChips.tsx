import React, { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, Check, Gem, Image, Building2, Trash2, Star
} from 'lucide-react';
import { ZONE_OPTIONS } from '../../utils/constants';
import '../../styles/components/quick-filter-chips.css';

// Age presets for mobile
const AGE_PRESETS = [
  { label: '18-25', min: '18', max: '25' },
  { label: '26-35', min: '26', max: '35' },
  { label: '36-45', min: '36', max: '45' },
  { label: '46+', min: '46', max: '60' }
];

// Language options
const LANGUAGE_OPTIONS = [
  { code: 'Thai', flag: '🇹🇭' },
  { code: 'English', flag: '🇬🇧' },
  { code: 'Chinese', flag: '🇨🇳' },
  { code: 'Russian', flag: '🇷🇺' },
  { code: 'Korean', flag: '🇰🇷' },
  { code: 'Japanese', flag: '🇯🇵' },
  { code: 'German', flag: '🇩🇪' }
];

// Social media options
const SOCIAL_OPTIONS = [
  { id: 'instagram', label: 'IG', icon: '📸' },
  { id: 'line', label: 'LINE', icon: '💬' },
  { id: 'whatsapp', label: 'WA', icon: '📱' },
  { id: 'telegram', label: 'TG', icon: '✈️' },
  { id: 'facebook', label: 'FB', icon: '👤' }
];

// Nationality to flag mapping
const NATIONALITY_FLAGS: Record<string, string> = {
  'Thai': '🇹🇭',
  'Filipino': '🇵🇭',
  'Vietnamese': '🇻🇳',
  'Cambodian': '🇰🇭',
  'Laotian': '🇱🇦',
  'Myanmar': '🇲🇲',
  'Indonesian': '🇮🇩',
  'Chinese': '🇨🇳',
  'Russian': '🇷🇺',
  'Ukrainian': '🇺🇦',
  'Uzbek': '🇺🇿',
  'Japanese': '🇯🇵',
  'Korean': '🇰🇷'
};

interface MobileFiltersChipsProps {
  filters: {
    q: string;
    type: string;
    sex: string;
    nationality: string;
    zone: string;
    establishment_id: string;
    category_id: string;
    age_min: string;
    age_max: string;
    is_verified: string;
    languages: string;
    min_rating: string;
    has_photos: string;
    social_media: string;
  };
  availableFilters: {
    nationalities: string[];
    zones: string[];
    establishments: Array<{ id: string; name: string; zone: string }>;
    categories: Array<{ id: number; name: string; icon: string }>;
  };
  onFilterChange: (key: string, value: string) => void;
  onZoneChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onClearFilters?: () => void;
  loading: boolean;
}

/**
 * MobileFiltersChips - Full chip-based filter UI for mobile
 *
 * All filters displayed as horizontal scrollable chip rows
 * Inspired by Tinder/Airbnb mobile filter patterns
 *
 * @version 11.5
 */
const MobileFiltersChips: React.FC<MobileFiltersChipsProps> = memo(({
  filters,
  availableFilters,
  onFilterChange,
  onZoneChange,
  onQueryChange,
  onClearFilters,
  loading
}) => {
  const { t } = useTranslation();
  const [localQuery, setLocalQuery] = useState(filters.q);

  // Derived states
  const isVerified = filters.is_verified === 'true';
  const isFreelance = filters.type === 'freelance';
  const hasPhotos = filters.has_photos === 'true';
  const currentSex = filters.sex;
  const selectedLanguages = filters.languages ? filters.languages.split(',') : [];
  const selectedSocial = filters.social_media ? filters.social_media.split(',') : [];
  const currentRating = filters.min_rating ? Number(filters.min_rating) : 0;

  // Check if current age matches a preset
  const currentAgePreset = AGE_PRESETS.find(
    p => p.min === filters.age_min && p.max === filters.age_max
  );

  // Count active filters
  const activeFiltersCount = React.useMemo(() =>
    Object.entries(filters).filter(([key, value]) => {
      if (key === 'sort_by' || key === 'sort_order') return false;
      if (!value || !value.trim()) return false;
      if (key === 'type' && value === 'all') return false;
      return true;
    }).length,
    [filters]
  );

  // Handlers
  const handleSearchBlur = useCallback(() => {
    if (localQuery !== filters.q) {
      onQueryChange(localQuery);
    }
  }, [localQuery, filters.q, onQueryChange]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onQueryChange(localQuery);
    }
  }, [localQuery, onQueryChange]);

  const handleAgePresetToggle = useCallback((preset: typeof AGE_PRESETS[0]) => {
    const isActive = filters.age_min === preset.min && filters.age_max === preset.max;
    if (isActive) {
      onFilterChange('age_min', '');
      onFilterChange('age_max', '');
    } else {
      onFilterChange('age_min', preset.min);
      onFilterChange('age_max', preset.max);
    }
  }, [filters.age_min, filters.age_max, onFilterChange]);

  const handleLanguageToggle = useCallback((langCode: string) => {
    let newLanguages: string[];
    if (selectedLanguages.includes(langCode)) {
      newLanguages = selectedLanguages.filter(l => l !== langCode);
    } else {
      newLanguages = [...selectedLanguages, langCode];
    }
    onFilterChange('languages', newLanguages.filter(Boolean).join(','));
  }, [selectedLanguages, onFilterChange]);

  const handleSocialToggle = useCallback((platformId: string) => {
    let newPlatforms: string[];
    if (selectedSocial.includes(platformId)) {
      newPlatforms = selectedSocial.filter(p => p !== platformId);
    } else {
      newPlatforms = [...selectedSocial, platformId];
    }
    onFilterChange('social_media', newPlatforms.filter(Boolean).join(','));
  }, [selectedSocial, onFilterChange]);

  const handleClearAll = useCallback(() => {
    setLocalQuery('');
    if (onClearFilters) {
      onClearFilters();
    }
  }, [onClearFilters]);

  return (
    <div className="mobile-filters-chips">
      {/* Search Input */}
      <div className="mobile-search-container">
        <Search size={16} className="mobile-search-input-icon" />
        <input
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onBlur={handleSearchBlur}
          onKeyDown={handleSearchKeyDown}
          placeholder={t('search.enterName')}
          disabled={loading}
          className="mobile-search-input"
        />
      </div>

      {/* Clear All Button */}
      {activeFiltersCount > 0 && (
        <button
          onClick={handleClearAll}
          disabled={loading}
          className="mobile-clear-filters-btn"
        >
          <Trash2 size={14} />
          {t('search.clearAll', 'Clear all')} ({activeFiltersCount})
        </button>
      )}

      {/* Row 1: Quick Toggles */}
      <div className="chip-row">
        <div className="chip-row-content">
          <button
            type="button"
            className={`quick-filter-chip ${isVerified ? 'quick-filter-chip--active' : ''}`}
            onClick={() => onFilterChange('is_verified', isVerified ? '' : 'true')}
            disabled={loading}
          >
            <span className="quick-filter-chip__icon"><Check size={14} /></span>
            <span>{t('search.verified', 'Verified')}</span>
          </button>

          <button
            type="button"
            className={`quick-filter-chip ${isFreelance ? 'quick-filter-chip--active' : ''}`}
            onClick={() => onFilterChange('type', isFreelance ? 'all' : 'freelance')}
            disabled={loading}
          >
            <span className="quick-filter-chip__icon"><Gem size={14} /></span>
            <span>{t('search.freelances', 'Freelance')}</span>
          </button>

          <button
            type="button"
            className={`quick-filter-chip ${hasPhotos ? 'quick-filter-chip--active' : ''}`}
            onClick={() => onFilterChange('has_photos', hasPhotos ? '' : 'true')}
            disabled={loading}
          >
            <span className="quick-filter-chip__icon"><Image size={14} /></span>
            <span>{t('search.photos', 'Photos')}</span>
          </button>
        </div>
      </div>

      {/* Row 2: Gender */}
      <div className="chip-row">
        <span className="chip-row-label">{t('search.gender', 'Gender')}</span>
        <div className="chip-row-content">
          <button
            type="button"
            className={`quick-filter-chip quick-filter-chip--gender ${currentSex === 'female' ? 'quick-filter-chip--active' : ''}`}
            onClick={() => onFilterChange('sex', currentSex === 'female' ? '' : 'female')}
            disabled={loading}
          >
            <span className="quick-filter-chip__icon">♀</span>
          </button>

          <button
            type="button"
            className={`quick-filter-chip quick-filter-chip--gender ${currentSex === 'male' ? 'quick-filter-chip--active' : ''}`}
            onClick={() => onFilterChange('sex', currentSex === 'male' ? '' : 'male')}
            disabled={loading}
          >
            <span className="quick-filter-chip__icon">♂</span>
          </button>

          <button
            type="button"
            className={`quick-filter-chip quick-filter-chip--gender ${currentSex === 'ladyboy' ? 'quick-filter-chip--active' : ''}`}
            onClick={() => onFilterChange('sex', currentSex === 'ladyboy' ? '' : 'ladyboy')}
            disabled={loading}
          >
            <span className="quick-filter-chip__icon">⚧</span>
          </button>
        </div>
      </div>

      {/* Row 3: Age Presets */}
      <div className="chip-row">
        <span className="chip-row-label">{t('search.age', 'Age')}</span>
        <div className="chip-row-content chip-row-scrollable">
          {AGE_PRESETS.map(preset => {
            const isActive = currentAgePreset?.label === preset.label;
            return (
              <button
                key={preset.label}
                type="button"
                className={`quick-filter-chip quick-filter-chip--age ${isActive ? 'quick-filter-chip--active' : ''}`}
                onClick={() => handleAgePresetToggle(preset)}
                disabled={loading}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 4: Zone */}
      <div className="chip-row">
        <span className="chip-row-label">{t('search.zone', 'Zone')}</span>
        <div className="chip-row-content chip-row-scrollable">
          {ZONE_OPTIONS.filter(z => z.value && z.value !== 'freelance').map(zone => {
            const isActive = filters.zone === zone.value;
            return (
              <button
                key={zone.value}
                type="button"
                className={`quick-filter-chip quick-filter-chip--zone ${isActive ? 'quick-filter-chip--active' : ''}`}
                onClick={() => onZoneChange(isActive ? '' : zone.value)}
                disabled={loading}
              >
                {zone.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 5: Category */}
      {availableFilters.categories.length > 0 && (
        <div className="chip-row">
          <span className="chip-row-label">{t('search.type', 'Type')}</span>
          <div className="chip-row-content chip-row-scrollable">
            {availableFilters.categories.map(cat => {
              const isActive = filters.category_id === String(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`quick-filter-chip quick-filter-chip--category ${isActive ? 'quick-filter-chip--active' : ''}`}
                  onClick={() => onFilterChange('category_id', isActive ? '' : String(cat.id))}
                  disabled={loading}
                >
                  <span className="chip-emoji">{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Row 6: Nationality */}
      {availableFilters.nationalities.length > 0 && (
        <div className="chip-row">
          <span className="chip-row-label">{t('search.nationality', 'Nationality')}</span>
          <div className="chip-row-content chip-row-scrollable">
            {availableFilters.nationalities.slice(0, 15).map(nat => {
              const isActive = filters.nationality === nat;
              const flag = NATIONALITY_FLAGS[nat] || '🌍';
              return (
                <button
                  key={nat}
                  type="button"
                  className={`quick-filter-chip quick-filter-chip--nationality ${isActive ? 'quick-filter-chip--active' : ''}`}
                  onClick={() => onFilterChange('nationality', isActive ? '' : nat)}
                  disabled={loading}
                >
                  <span className="chip-flag">{flag}</span>
                  <span>{nat}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Row 7: Rating */}
      <div className="chip-row">
        <span className="chip-row-label">{t('search.rating', 'Rating')}</span>
        <div className="chip-row-content">
          {[1, 2, 3, 4, 5].map(stars => {
            const isActive = currentRating === stars;
            return (
              <button
                key={stars}
                type="button"
                className={`quick-filter-chip quick-filter-chip--rating ${isActive ? 'quick-filter-chip--active' : ''}`}
                onClick={() => onFilterChange('min_rating', isActive ? '' : String(stars))}
                disabled={loading}
              >
                <Star size={14} className="chip-star" fill={isActive ? '#FFD700' : 'none'} />
                <span>{stars}+</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="chip-divider" />

      {/* Row 8: Establishment Input (too many options for chips) */}
      {!isFreelance && (
        <div className="mobile-establishment-container">
          <Building2 size={16} className="mobile-establishment-icon" />
          <input
            type="text"
            placeholder={t('search.establishment', 'Establishment')}
            disabled={loading}
            className="mobile-establishment-input"
            value={filters.establishment_id ?
              availableFilters.establishments.find(e => e.id === filters.establishment_id)?.name || ''
              : ''
            }
            readOnly
            onClick={() => {
              // Could open a modal/drawer for establishment selection
              // For now, this is just a placeholder
            }}
          />
        </div>
      )}

      {/* Row 9: Languages */}
      <div className="chip-row">
        <span className="chip-row-label">{t('search.languages', 'Languages')}</span>
        <div className="chip-row-content chip-row-scrollable">
          {LANGUAGE_OPTIONS.map(lang => {
            const isActive = selectedLanguages.includes(lang.code);
            return (
              <button
                key={lang.code}
                type="button"
                className={`quick-filter-chip ${isActive ? 'quick-filter-chip--active' : ''}`}
                onClick={() => handleLanguageToggle(lang.code)}
                disabled={loading}
              >
                <span>{lang.flag}</span>
                <span>{lang.code}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 10: Social Media */}
      <div className="chip-row">
        <span className="chip-row-label">{t('search.social', 'Social')}</span>
        <div className="chip-row-content chip-row-scrollable">
          {SOCIAL_OPTIONS.map(platform => {
            const isActive = selectedSocial.includes(platform.id);
            return (
              <button
                key={platform.id}
                type="button"
                className={`quick-filter-chip ${isActive ? 'quick-filter-chip--active' : ''}`}
                onClick={() => handleSocialToggle(platform.id)}
                disabled={loading}
              >
                <span>{platform.icon}</span>
                <span>{platform.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

MobileFiltersChips.displayName = 'MobileFiltersChips';

export default MobileFiltersChips;
