import React, { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, Check, Gem, Image, Building2, Trash2, Star,
  ChevronDown, User, MapPin, Sparkles, Zap, SlidersHorizontal
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

// Filter Accordion Component
interface FilterAccordionProps {
  title: string;
  icon: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const FilterAccordion: React.FC<FilterAccordionProps> = ({
  title, icon, defaultExpanded = false, children
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="filter-accordion">
      <button
        type="button"
        className={`filter-accordion__header ${isExpanded ? 'filter-accordion__header--expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="filter-accordion__icon">{icon}</span>
        <span className="filter-accordion__title">{title}</span>
        <ChevronDown size={18} className="filter-accordion__chevron" />
      </button>
      <div className={`filter-accordion__content ${isExpanded ? 'filter-accordion__content--expanded' : ''}`}>
        <div className="filter-accordion__inner">
          {children}
        </div>
      </div>
    </div>
  );
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
 * v12.0 - Fix scroll on click, overflow, establishment zone filtering
 *
 * @version 12.0
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
      {/* Clear All Button - En premier */}
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

      {/* ============================================
         MASTER ACCORDION: FILTRER
         Contains all sub-accordions
         ============================================ */}
      <FilterAccordion
        title={t('search.sections.filters', 'Filtrer')}
        icon={<SlidersHorizontal size={18} />}
        defaultExpanded={false}
      >
        {/* ============================================
           ACCORDION: RECHERCHE
           Name input
           ============================================ */}
        <FilterAccordion
          title={t('search.sections.search', 'Recherche')}
          icon={<Search size={18} />}
          defaultExpanded={false}
        >
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
      </FilterAccordion>

      {/* ============================================
         ACCORDION: RAPIDE
         Verified, Freelance, Photos
         ============================================ */}
      <FilterAccordion
        title={t('search.sections.quick', 'Rapide')}
        icon={<Zap size={18} />}
        defaultExpanded={false}
      >
        <div className="chip-row">
          <div className="chip-row-content">
            <button
              type="button"
              className={`quick-filter-chip ${isVerified ? 'quick-filter-chip--active' : ''}`}
              onClick={(e) => { e.preventDefault(); onFilterChange('is_verified', isVerified ? '' : 'true'); }}
              disabled={loading}
            >
              <span className="quick-filter-chip__icon"><Check size={14} /></span>
              <span>{t('search.verified', 'Verified')}</span>
            </button>

            <button
              type="button"
              className={`quick-filter-chip ${isFreelance ? 'quick-filter-chip--active' : ''}`}
              onClick={(e) => { e.preventDefault(); onFilterChange('type', isFreelance ? 'all' : 'freelance'); }}
              disabled={loading}
            >
              <span className="quick-filter-chip__icon"><Gem size={14} /></span>
              <span>{t('search.freelances', 'Freelance')}</span>
            </button>

            <button
              type="button"
              className={`quick-filter-chip ${hasPhotos ? 'quick-filter-chip--active' : ''}`}
              onClick={(e) => { e.preventDefault(); onFilterChange('has_photos', hasPhotos ? '' : 'true'); }}
              disabled={loading}
            >
              <span className="quick-filter-chip__icon"><Image size={14} /></span>
              <span>{t('search.photos', 'Photos')}</span>
            </button>
          </div>
        </div>
      </FilterAccordion>

      {/* ============================================
         ACCORDION 1: PROFIL
         Gender, Age, Nationality
         ============================================ */}
      <FilterAccordion
        title={t('search.sections.profile', 'Profil')}
        icon={<User size={18} />}
        defaultExpanded={false}
      >
        {/* Gender */}
        <div className="chip-row">
          <span className="chip-row-label">{t('search.gender', 'Gender')}</span>
          <div className="chip-row-content">
            <button
              type="button"
              className={`quick-filter-chip quick-filter-chip--gender ${currentSex === 'female' ? 'quick-filter-chip--active' : ''}`}
              onClick={(e) => { e.preventDefault(); onFilterChange('sex', currentSex === 'female' ? '' : 'female'); }}
              disabled={loading}
            >
              <span className="quick-filter-chip__icon">♀</span>
            </button>
            <button
              type="button"
              className={`quick-filter-chip quick-filter-chip--gender ${currentSex === 'male' ? 'quick-filter-chip--active' : ''}`}
              onClick={(e) => { e.preventDefault(); onFilterChange('sex', currentSex === 'male' ? '' : 'male'); }}
              disabled={loading}
            >
              <span className="quick-filter-chip__icon">♂</span>
            </button>
            <button
              type="button"
              className={`quick-filter-chip quick-filter-chip--gender ${currentSex === 'ladyboy' ? 'quick-filter-chip--active' : ''}`}
              onClick={(e) => { e.preventDefault(); onFilterChange('sex', currentSex === 'ladyboy' ? '' : 'ladyboy'); }}
              disabled={loading}
            >
              <span className="quick-filter-chip__icon">⚧</span>
            </button>
          </div>
        </div>

        {/* Age Presets */}
        <div className="chip-row">
          <span className="chip-row-label">{t('search.age', 'Age')}</span>
          <div className="chip-row-content">
            {AGE_PRESETS.map(preset => {
              const isActive = currentAgePreset?.label === preset.label;
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={`quick-filter-chip quick-filter-chip--age ${isActive ? 'quick-filter-chip--active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleAgePresetToggle(preset); }}
                  disabled={loading}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Nationality */}
        {availableFilters.nationalities.length > 0 && (
          <div className="chip-row">
            <span className="chip-row-label">{t('search.nationality', 'Nationality')}</span>
            <div className="chip-row-content">
              {availableFilters.nationalities.slice(0, 15).map(nat => {
                const isActive = filters.nationality === nat;
                const flag = NATIONALITY_FLAGS[nat] || '🌍';
                return (
                  <button
                    key={nat}
                    type="button"
                    className={`quick-filter-chip quick-filter-chip--nationality ${isActive ? 'quick-filter-chip--active' : ''}`}
                    onClick={(e) => { e.preventDefault(); onFilterChange('nationality', isActive ? '' : nat); }}
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
      </FilterAccordion>

      {/* ============================================
         ACCORDION 2: LOCALISATION
         Zone, Category, Establishment
         ============================================ */}
      <FilterAccordion
        title={t('search.sections.location', 'Localisation')}
        icon={<MapPin size={18} />}
      >
        {/* Zone */}
        <div className="chip-row">
          <span className="chip-row-label">{t('search.zone', 'Zone')}</span>
          <div className="chip-row-content">
            {ZONE_OPTIONS.filter(z => z.value && z.value !== 'freelance').map(zone => {
              const isActive = filters.zone === zone.value;
              return (
                <button
                  key={zone.value}
                  type="button"
                  className={`quick-filter-chip quick-filter-chip--zone ${isActive ? 'quick-filter-chip--active' : ''}`}
                  onClick={(e) => { e.preventDefault(); onZoneChange(isActive ? '' : zone.value); }}
                  disabled={loading}
                >
                  {zone.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category */}
        {availableFilters.categories.length > 0 && (
          <div className="chip-row">
            <span className="chip-row-label">{t('search.type', 'Type')}</span>
            <div className="chip-row-content">
              {availableFilters.categories.map(cat => {
                const isActive = filters.category_id === String(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`quick-filter-chip quick-filter-chip--category ${isActive ? 'quick-filter-chip--active' : ''}`}
                    onClick={(e) => { e.preventDefault(); onFilterChange('category_id', isActive ? '' : String(cat.id)); }}
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

        {/* Establishment Dropdown */}
        {!isFreelance && (
          <div className="chip-row">
            <span className="chip-row-label">{t('search.establishment', 'Establishment')}</span>
            <div className="mobile-establishment-container">
              <Building2 size={16} className="mobile-establishment-icon" />
              <select
                value={filters.establishment_id}
                onChange={(e) => onFilterChange('establishment_id', e.target.value)}
                disabled={loading}
                className="mobile-establishment-select"
              >
                <option value="">{t('search.allEstablishments', 'All establishments')}</option>
                {filters.zone ? (
                  // Zone selected: show only that zone's establishments
                  availableFilters.establishments
                    .filter(est => est.zone === filters.zone)
                    .map(est => (
                      <option key={est.id} value={est.id}>{est.name}</option>
                    ))
                ) : (
                  // No zone: group by zone with optgroup
                  Object.entries(
                    availableFilters.establishments.reduce((acc, est) => {
                      const zone = est.zone || 'Other';
                      if (!acc[zone]) acc[zone] = [];
                      acc[zone].push(est);
                      return acc;
                    }, {} as Record<string, typeof availableFilters.establishments>)
                  ).map(([zone, ests]) => (
                    <optgroup key={zone} label={zone}>
                      {ests.map(est => (
                        <option key={est.id} value={est.id}>{est.name}</option>
                      ))}
                    </optgroup>
                  ))
                )}
              </select>
            </div>
          </div>
        )}
      </FilterAccordion>

      {/* ============================================
         ACCORDION 3: QUALITÉ
         Rating, Languages, Social Media
         ============================================ */}
      <FilterAccordion
        title={t('search.sections.quality', 'Qualité')}
        icon={<Sparkles size={18} />}
      >
        {/* Rating */}
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
                  onClick={(e) => { e.preventDefault(); onFilterChange('min_rating', isActive ? '' : String(stars)); }}
                  disabled={loading}
                >
                  <Star size={14} className="chip-star" fill={isActive ? '#FFD700' : 'none'} />
                  <span>{stars}+</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Languages */}
        <div className="chip-row">
          <span className="chip-row-label">{t('search.languages', 'Languages')}</span>
          <div className="chip-row-content">
            {LANGUAGE_OPTIONS.map(lang => {
              const isActive = selectedLanguages.includes(lang.code);
              return (
                <button
                  key={lang.code}
                  type="button"
                  className={`quick-filter-chip ${isActive ? 'quick-filter-chip--active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleLanguageToggle(lang.code); }}
                  disabled={loading}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.code}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Social Media */}
        <div className="chip-row">
          <span className="chip-row-label">{t('search.social', 'Social')}</span>
          <div className="chip-row-content">
            {SOCIAL_OPTIONS.map(platform => {
              const isActive = selectedSocial.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  type="button"
                  className={`quick-filter-chip ${isActive ? 'quick-filter-chip--active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSocialToggle(platform.id); }}
                  disabled={loading}
                >
                  <span>{platform.icon}</span>
                  <span>{platform.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        </FilterAccordion>
      </FilterAccordion>
    </div>
  );
});

MobileFiltersChips.displayName = 'MobileFiltersChips';

export default MobileFiltersChips;
