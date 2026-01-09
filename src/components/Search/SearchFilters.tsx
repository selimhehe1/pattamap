import React from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, Trash2, Check, Building2,
  Globe, MapPin, Tag,
  Loader2, Pencil, Lightbulb,
  // v11.0 - New filter icons
  Image, User, Sparkles,
  // v11.1 - Freelance toggle
  Briefcase
} from 'lucide-react';
import { getZoneLabel, ZONE_OPTIONS } from '../../utils/constants';
import { logger } from '../../utils/logger';
import FilterSection from './FilterSection';
import CustomSelect from '../Common/CustomSelect';
import MobileFiltersChips from './MobileFiltersChips';
// v12.0 - Extracted filter sub-components
import {
  AgeRangeSlider,
  GenderChips,
  LanguageChips,
  RatingFilter,
  ToggleFilter,
  SocialMediaChips
} from './filters';
import { useAgeRange } from '../../hooks/useAgeRange';
import '../../styles/layout/search-layout.css';
import '../../styles/components/quick-filter-chips.css';

// Development logging helper
const isDev = process.env.NODE_ENV === 'development';
const debugLog = (message: string, data?: unknown) => {
  if (isDev) logger.debug(message, data);
};

export interface FilterValues {
  q: string; // Query text search (matches API parameter)
  type: string; // 🆕 v10.3 - Employee type (all/freelance/regular)
  sex: string; // 🆕 v10.x - Gender filter (female/male/ladyboy)
  nationality: string;
  zone: string;
  establishment_id: string;
  category_id: string;
  age_min: string;
  age_max: string;
  is_verified: string; // 🆕 v10.2 - Verified filter
  sort_by: string;
  sort_order: string;
  // 🆕 v11.0 - Advanced filters
  languages: string;      // Comma-separated: "Thai,English,Chinese"
  min_rating: string;     // "1"-"5" minimum average rating
  has_photos: string;     // "true" | "" - filter employees with photos
  social_media: string;   // Comma-separated: "instagram,line,whatsapp"
}

interface SearchFiltersProps {
  filters: FilterValues;
  availableFilters: {
    nationalities: string[];
    zones: string[];
    establishments: Array<{ id: string; name: string; zone: string; }>;
    categories: Array<{ id: number; name: string; icon: string; }>;
  };
  onFilterChange: (key: string, value: string) => void;
  onZoneChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onClearFilters?: () => void;
  loading: boolean;
  isTyping: boolean;
}

const SearchFilters: React.FC<SearchFiltersProps> = React.memo(({
  filters,
  availableFilters,
  onFilterChange,
  onZoneChange,
  onQueryChange,
  onClearFilters,
  loading,
  isTyping
}) => {
  const { t } = useTranslation();

  // 🚀 État unifié pour autocomplétion optimisée
  const [autocompleteState, setAutocompleteState] = React.useState({
    suggestions: [] as string[],
    visible: false,
    loading: false
  });

  // 🎯 v12.0 - Age range hook (replaces local state + handlers)
  const {
    localAgeMin,
    localAgeMax,
    ageError,
    ageMinRef,
    ageMaxRef,
    handleAgeMinChange,
    handleAgeMaxChange,
    resetAgeRange
  } = useAgeRange(filters.age_min, filters.age_max, onFilterChange);

  // 🎯 État local pour search query (instant feedback, 0ms lag)
  const [localQuery, setLocalQuery] = React.useState(filters.q);

  // 📱 Mobile filters collapse state
  const [isMobile, setIsMobile] = React.useState(false);
  const [_isFiltersOpen, setIsFiltersOpen] = React.useState(false);

  // 🎯 Références pour gestion focus et requêtes
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = React.useRef<number | undefined>(undefined);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const wasTypingRef = React.useRef<boolean>(false);

  // 🏢 Establishment autocomplete state
  const [establishmentSearch, setEstablishmentSearch] = React.useState('');
  const [showEstablishmentSuggestions, setShowEstablishmentSuggestions] = React.useState(false);
  const establishmentInputRef = React.useRef<HTMLInputElement>(null);
  // 🎯 Phase 3.3: Dropdown position state for fixed positioning (escapes sidebar overflow)
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0, width: 0 });

  // 🏢 Filter establishments by search query and group by zone
  const filterEstablishmentsByQuery = React.useCallback((query: string) => {
    // Filter establishments by selected zone if any
    let filtered = filters.zone
      ? availableFilters.establishments.filter(est => est.zone === filters.zone)
      : availableFilters.establishments.filter(est => est.zone);

    // Apply search filter if query exists
    if (query.trim().length > 0) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(est =>
        est.name.toLowerCase().includes(lowerQuery)
      );
    }

    // Group by zone
    const groupedByZone = filtered.reduce((acc, est) => {
      const zone = est.zone || 'other';
      if (!acc[zone]) acc[zone] = [];
      acc[zone].push(est);
      return acc;
    }, {} as Record<string, typeof filtered>);

    // Sort each group alphabetically
    Object.keys(groupedByZone).forEach(zone => {
      groupedByZone[zone].sort((a, b) => a.name.localeCompare(b.name));
    });

    // Sort zones alphabetically (using centralized getZoneLabel)
    const sortedZones = Object.keys(groupedByZone).sort((a, b) =>
      getZoneLabel(a).localeCompare(getZoneLabel(b))
    );

    return { groupedByZone, sortedZones };
  }, [filters.zone, availableFilters.establishments]);


  // 🎯 Sync search query with parent props
  // Age sync is now handled by useAgeRange hook
  React.useEffect(() => {
    setLocalQuery(filters.q);
  }, [filters.q]);

  // 📱 Detect mobile viewport and update state
  React.useEffect(() => {
    const mobileMediaQuery = window.matchMedia('(max-width: 48rem)'); // 768px

    const handleMobileChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const isMobileViewport = e.matches;
      setIsMobile(isMobileViewport);
      // On desktop, always keep filters open
      if (!isMobileViewport) {
        setIsFiltersOpen(true);
      } else {
        // On mobile, default to closed
        setIsFiltersOpen(false);
      }
    };

    // Initial check
    handleMobileChange(mobileMediaQuery);

    // Add listener for changes
    mobileMediaQuery.addEventListener('change', handleMobileChange);

    return () => {
      mobileMediaQuery.removeEventListener('change', handleMobileChange);
    };
  }, []);

  // 🎯 Hook pour restaurer le focus après re-renders
  React.useEffect(() => {
    // Restaurer le focus seulement si l'utilisateur était en train de taper
    // et qu'on n'est pas en loading (pour éviter de gêner l'utilisateur)
    if (wasTypingRef.current && !loading && inputRef.current && document.activeElement !== inputRef.current) {
      // Utiliser setTimeout pour éviter les conflits avec les autres re-renders
      const timeoutId = setTimeout(() => {
        if (inputRef.current && wasTypingRef.current) {
          inputRef.current.focus();
          // Placer le curseur à la fin du texte
          const length = inputRef.current.value.length;
          inputRef.current.setSelectionRange(length, length);
        }
      }, 10);

      return () => clearTimeout(timeoutId);
    }
  }, [isTyping, loading]);

  // Note: Age focus restoration is now handled by useAgeRange hook

  // 🏢 Sync establishment search input with selected establishment
  React.useEffect(() => {
    if (filters.establishment_id) {
      const selectedEst = availableFilters.establishments.find(
        est => est.id === filters.establishment_id
      );
      if (selectedEst) {
        setEstablishmentSearch(selectedEst.name);
      }
    } else {
      setEstablishmentSearch('');
    }
  }, [filters.establishment_id, availableFilters.establishments]);

  // Clear all filters - use the optimized parent function
  const handleClearFilters = () => {
    // ✅ Clear all local states immediately for instant UI feedback
    setLocalQuery('');
    wasTypingRef.current = false;

    // ✅ v12.0 - Reset age via hook
    resetAgeRange();

    // ✅ Reset establishment search states
    setEstablishmentSearch('');
    setShowEstablishmentSuggestions(false);

    // ✅ Reset autocomplete states
    setAutocompleteState({
      suggestions: [],
      visible: false,
      loading: false
    });

    if (onClearFilters) {
      onClearFilters();
    } else {
      // Fallback to old method if prop not provided
      onQueryChange('');
      onFilterChange('nationality', '');
      onFilterChange('zone', '');
      onFilterChange('establishment_id', '');
      onFilterChange('age_min', '');
      onFilterChange('age_max', '');
      onFilterChange('sort_by', 'relevance');
      onFilterChange('sort_order', 'desc');
    }
  };

  // 🚀 Fetch optimisé avec cancel et cache intelligent
  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setAutocompleteState({
        suggestions: [],
        visible: false,
        loading: false
      });
      return;
    }

    // 📡 Cancel requête précédente si en cours
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Nouveau controller pour cette requête
    abortControllerRef.current = new AbortController();

    setAutocompleteState(prev => ({
      ...prev,
      loading: true
    }));

    try {
      debugLog(`🔍 Fetching suggestions for "${query}"`);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/employees/suggestions/names?q=${encodeURIComponent(query)}`,
        {
          signal: abortControllerRef.current.signal
          // Browser handles caching automatically for GET requests
        }
      );

      if (response.ok) {
        const data = await response.json();
        debugLog(`📦 Received ${data.suggestions?.length || 0} suggestions`);

        setAutocompleteState({
          suggestions: data.suggestions || [],
          visible: (data.suggestions?.length || 0) > 0,
          loading: false
        });
      } else {
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        logger.error('❌ Error fetching suggestions:', error);
        setAutocompleteState({
          suggestions: [],
          visible: false,
          loading: false
        });
      }
      // Si AbortError, on ignore - c'est normal
    }
  };

  // 🚀 Phase 3.5: Search on Enter/Blur only - NO freeze while typing
  // Local state updates immediately, API call only on Enter or Blur
  const handleSearchInputChange = React.useCallback((value: string) => {
    // ✅ Update local state IMMEDIATELY (0ms lag - instant visual feedback)
    setLocalQuery(value);

    // 🎯 Marquer que l'utilisateur est en train de taper
    wasTypingRef.current = true;

    // ❌ REMOVED: No longer calling onQueryChange on every keystroke
    // This was causing 1-second freezes due to API calls

    // Cancel previous autocomplete fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Cancel autocomplete timeout précédent
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Reset suggestions immédiatement si input vide (fast path)
    if (value.length < 2) {
      setAutocompleteState({
        suggestions: [],
        visible: false,
        loading: false
      });
      return;
    }

    // 🎯 Autocomplete suggestions still work (independent of search)
    debounceTimeoutRef.current = window.setTimeout(() => {
      fetchSuggestions(value);
    }, 200);
  }, []);

  // 🚀 Phase 3.5: Search on Enter key
  const handleSearchKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onQueryChange(localQuery);
    }
  }, [onQueryChange, localQuery]);

  // 🚀 Phase 3.5: Search on blur (only if value changed)
  const handleSearchBlur = React.useCallback(() => {
    // Trigger search if query changed
    if (localQuery !== filters.q) {
      onQueryChange(localQuery);
    }
    // Hide autocomplete after a small delay (for click events)
    setTimeout(() => {
      setAutocompleteState(prev => ({ ...prev, visible: false }));
    }, 150);
  }, [localQuery, filters.q, onQueryChange]);

  // 🎯 Gestion optimisée de sélection - Scheduler optimized
  const handleSuggestionClick = React.useCallback((suggestion: string) => {
    // Use requestAnimationFrame for smooth UI updates
    requestAnimationFrame(() => {
      onQueryChange(suggestion);
      setAutocompleteState({
        suggestions: [],
        visible: false,
        loading: false
      });
    });
  }, [onQueryChange]);

  // Note: Age handlers are now provided by useAgeRange hook

  // Count active filters - Memoized to prevent recalculation on every render
  // ✅ Exclude default values to prevent showing "Clear (1)" when no real filters active
  const activeFiltersCount = React.useMemo(() =>
    Object.entries(filters).filter(([key, value]) => {
      // Exclude sort fields (not user-facing filters)
      if (key === 'sort_by' || key === 'sort_order') return false;

      // Exclude empty/falsy values
      if (!value || !value.trim()) return false;

      // ✅ Exclude default value 'all' for type filter
      if (key === 'type' && value === 'all') return false;

      return true;
    }).length,
    [filters]
  );

  // 🆕 v11.0 - Count active filters per section for badges
  const sectionFilterCounts = React.useMemo(() => ({
    search: [filters.q, filters.zone, filters.establishment_id, filters.category_id].filter(Boolean).length,
    profile: [filters.age_min, filters.age_max, filters.sex, filters.nationality, filters.languages].filter(Boolean).length,
    quality: [
      filters.is_verified,
      filters.min_rating,
      filters.has_photos,
      filters.social_media
    ].filter(Boolean).length,
    sort: filters.sort_by !== 'relevance' ? 1 : 0
  }), [filters]);

  // ✅ Handle zone change with immediate establishment reset (fixes visual desync)
  const handleZoneChangeInternal = React.useCallback((zoneValue: string) => {
    // Reset establishment search state immediately (before parent update)
    setEstablishmentSearch('');
    setShowEstablishmentSuggestions(false);
    // Notify parent
    onZoneChange(zoneValue);
  }, [onZoneChange]);

  // 🏢 Memoized filtered establishments (moved outside conditional render)
  const filteredEstablishments = React.useMemo(() => {
    return filterEstablishmentsByQuery(establishmentSearch);
  }, [establishmentSearch, filterEstablishmentsByQuery]);

  // 🎯 Phase 3.3: Calculate dropdown position for fixed positioning
  const updateDropdownPosition = React.useCallback(() => {
    if (establishmentInputRef.current) {
      const rect = establishmentInputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4, // 4px margin below input
        left: rect.left,
        width: rect.width
      });
    }
  }, []);

  // 🎯 Phase 3.3 fix: Continuously update dropdown position while visible
  // Uses requestAnimationFrame loop for smooth tracking
  React.useLayoutEffect(() => {
    if (!showEstablishmentSuggestions || !establishmentInputRef.current) return;

    let rafId: number | null = null;
    let isRunning = true;

    // Continuously update position while dropdown is visible
    const updatePosition = () => {
      if (!isRunning || !establishmentInputRef.current) return;

      const rect = establishmentInputRef.current.getBoundingClientRect();
      setDropdownPosition(prev => {
        // Only update if position actually changed (avoid unnecessary re-renders)
        const newTop = rect.bottom + 4;
        const newLeft = rect.left;
        const newWidth = rect.width;

        if (prev.top !== newTop || prev.left !== newLeft || prev.width !== newWidth) {
          return { top: newTop, left: newLeft, width: newWidth };
        }
        return prev;
      });

      // Continue the loop
      rafId = requestAnimationFrame(updatePosition);
    };

    // Start the animation loop
    rafId = requestAnimationFrame(updatePosition);

    return () => {
      isRunning = false;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [showEstablishmentSuggestions]);

  return (
    <div className="search-filters-fixed-nightlife" data-testid="search-filters">
      {/* ============================================
         MOBILE: Full Chips Filter UI (v11.5)
         All filters as horizontal scrollable chips
         ============================================ */}
      {isMobile ? (
        <MobileFiltersChips
          filters={filters}
          availableFilters={availableFilters}
          onFilterChange={onFilterChange}
          onZoneChange={onZoneChange}
          onQueryChange={onQueryChange}
          onClearFilters={onClearFilters}
          loading={loading}
        />
      ) : (
      <>
      {/* Filters Content - Desktop only */}
      <div className="filters-content">
        {/* Header - Desktop only */}
        <div className="filter-header">
          <h3 className="header-title-nightlife filter-label-with-icon">
            <Search size={18} /> {t('search.filters')}
          </h3>

          {activeFiltersCount > 0 && (
            <button
              onClick={handleClearFilters}
              disabled={loading}
              className="btn-clear-filters-nightlife"
              data-testid="clear-filters"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Trash2 size={14} /> {t('search.clearFiltersWithCount', { count: activeFiltersCount })}
            </button>
          )}
        </div>

      {/* ============================================
         SEARCH NAME - Direct (v11.1 fix #1)
         Placed outside FilterSection for cleaner UX
         ============================================ */}
      <div className="filter-section search-name-standalone" style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <div className="filter-label-with-icon" style={{ marginBottom: '0.5rem' }}>
          <label className="label-nightlife filter-label-with-icon">
            <Search size={18} /> {t('search.searchName')}
          </label>
          {isTyping && (
            <span style={{
              fontSize: '11px',
              color: '#00E5FF',
              background: 'rgba(0,255,255,0.1)',
              padding: '2px 6px',
              borderRadius: '8px',
              border: '1px solid rgba(0,255,255,0.3)',
              animation: 'pulse 1.5s ease-in-out infinite',
              marginLeft: '8px'
            }}>
              <Pencil size={10} /> {t('search.typing')}
            </span>
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => handleSearchInputChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          onBlur={handleSearchBlur}
          placeholder={t('search.enterName')}
          disabled={loading}
          className="input-nightlife"
          data-testid="search-input"
          style={{
            background: 'linear-gradient(135deg, rgba(232, 121, 249, 0.08), rgba(0, 229, 255, 0.05))',
            borderColor: 'rgba(232, 121, 249, 0.4)'
          }}
          onFocus={() => {
            if (autocompleteState.suggestions.length > 0) {
              setAutocompleteState(prev => ({ ...prev, visible: true }));
            }
          }}
        />

        {/* Autocomplete Suggestions */}
        {autocompleteState.visible && autocompleteState.suggestions.length > 0 && (
          <div className="autocomplete-dropdown-nightlife">
            {autocompleteState.suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="autocomplete-item-nightlife"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSuggestionClick(suggestion);
                }}
              >
                <span className="suggestion-text">{suggestion}</span>
              </div>
            ))}
          </div>
        )}

        {autocompleteState.loading && (
          <div className="autocomplete-loading-nightlife">
            <span className="loading-spinner"><Loader2 size={16} className="spin" /></span>
          </div>
        )}
      </div>

      {/* Divider line after search */}
      <div style={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(232, 121, 249, 0.3), transparent)',
        marginBottom: '1rem'
      }} />

      {/* Verified Profiles Toggle - v12.0 extracted component */}
      <ToggleFilter
        isActive={filters.is_verified === 'true'}
        onToggle={() => onFilterChange('is_verified', filters.is_verified === 'true' ? '' : 'true')}
        label={t('search.verifiedOnly', 'Verified Profiles Only')}
        icon={Check}
        activeColor="#00E5FF"
        disabled={loading}
      />

      {/* Freelance Toggle - v12.0 extracted component */}
      <ToggleFilter
        isActive={filters.type === 'freelance'}
        onToggle={() => {
          const newType = filters.type === 'freelance' ? 'all' : 'freelance';
          onFilterChange('type', newType);
          // Reset establishment when switching to freelance
          if (newType === 'freelance') {
            onFilterChange('establishment_id', '');
          }
        }}
        label={t('search.freelanceOnly', 'Freelance Only')}
        icon={Briefcase}
        activeColor="#E879F9"
        disabled={loading}
        infoText={t('search.freelanceInfo', 'Freelancers work independently or in nightclubs')}
        infoIcon={Lightbulb}
      />

      {/* ============================================
         SECTION 2: PROFIL (Profile)
         ============================================ */}
      <FilterSection
        title={t('search.sections.profile', 'Profile')}
        icon={<User size={18} />}
        defaultExpanded={true}
        activeCount={sectionFilterCounts.profile}
      >
      {/* Age Range - v12.0 extracted component */}
      <AgeRangeSlider
        localAgeMin={localAgeMin}
        localAgeMax={localAgeMax}
        ageError={ageError}
        ageMinRef={ageMinRef}
        ageMaxRef={ageMaxRef}
        onAgeMinChange={handleAgeMinChange}
        onAgeMaxChange={handleAgeMaxChange}
        disabled={loading}
      />

      {/* Gender Filter - v12.0 extracted component */}
      <GenderChips
        selectedGender={filters.sex}
        onGenderChange={(gender) => onFilterChange('sex', gender)}
        disabled={loading}
      />

      {/* Nationality - Phase 3.4: Custom styled dropdown */}
      <div className="filter-section">
        <label className="label-nightlife filter-label-with-icon">
          <Globe size={20} /> {t('search.nationality')}
        </label>
        <CustomSelect
          value={filters.nationality}
          onChange={(value) => onFilterChange('nationality', value)}
          disabled={loading}
          placeholder={t('search.allNationalities')}
          testId="nationality-filter"
          options={[
            { value: '', label: t('search.allNationalities') },
            ...availableFilters.nationalities.map(nationality => ({
              value: nationality,
              label: nationality
            }))
          ]}
        />
      </div>
      </FilterSection>

      {/* ============================================
         SECTION 3: LOCALISATION (Location)
         ============================================ */}
      <FilterSection
        title={t('search.sections.location', 'Location')}
        icon={<MapPin size={18} />}
        defaultExpanded={true}
        activeCount={[filters.zone, filters.establishment_id, filters.category_id].filter(Boolean).length}
      >
      {/* Zone - Phase 3.4: Custom styled dropdown */}
      <div className="filter-section">
        <label className="label-nightlife filter-label-with-icon">
          <MapPin size={20} /> {t('search.zone')}
        </label>
        <CustomSelect
          value={filters.zone}
          onChange={(value) => handleZoneChangeInternal(value)}
          disabled={loading}
          placeholder={t('search.allZones')}
          testId="zone-filter"
          options={[
            { value: '', label: t('search.allZones') },
            ...ZONE_OPTIONS.filter(z => z.value !== 'freelance').map(zone => ({
              value: zone.value,
              label: zone.label
            }))
          ]}
        />
      </div>

      {/* Establishment Type - Phase 3.4: Custom styled dropdown */}
      <div className="filter-section">
        <label className="label-nightlife filter-label-with-icon">
          <Tag size={20} /> {t('search.establishmentType')}
        </label>
        <CustomSelect
          value={filters.category_id}
          onChange={(value) => onFilterChange('category_id', value)}
          disabled={loading}
          placeholder={t('search.allTypes')}
          testId="category-filter"
          options={[
            { value: '', label: t('search.allTypes') },
            ...availableFilters.categories.map(category => ({
              value: String(category.id),
              label: `${category.icon} ${category.name}`
            }))
          ]}
        />
      </div>

      {/* Establishment - Disabled when Freelance is ON (v11.1 fix #3 & #4) */}
      <div className="filter-section" style={{
        position: 'relative',
        overflow: 'visible', /* Phase 3.3: Allow dropdown to extend outside sidebar */
        opacity: filters.type === 'freelance' ? 0.5 : 1,
        pointerEvents: filters.type === 'freelance' ? 'none' : 'auto',
        transition: 'opacity 0.2s ease'
      }}>
        <label className="label-nightlife filter-label-with-icon" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} /> {t('search.establishment')}
          </span>
          {filters.type === 'freelance' && (
            <span style={{
              fontSize: '10px',
              color: '#E879F9',
              background: 'rgba(232, 121, 249, 0.15)',
              padding: '2px 8px',
              borderRadius: '10px'
            }}>
              {t('search.freelanceMode', 'Freelance')}
            </span>
          )}
        </label>
        <div style={{ position: 'relative' }}>
          <input
            ref={establishmentInputRef}
            type="text"
            value={establishmentSearch}
            onChange={(e) => {
              setEstablishmentSearch(e.target.value);
              updateDropdownPosition();
              setShowEstablishmentSuggestions(true);
            }}
            onFocus={() => {
              updateDropdownPosition();
              setShowEstablishmentSuggestions(true);
            }}
            onBlur={() => {
              setTimeout(() => setShowEstablishmentSuggestions(false), 200);
            }}
            placeholder={filters.type === 'freelance' ? t('search.freelanceNoEstablishment', 'N/A - Freelance mode') : t('search.allEstablishments')}
            disabled={loading || filters.type === 'freelance'}
            className="input-nightlife"
            data-testid="establishment-filter"
            style={{
              paddingRight: filters.establishment_id ? '40px' : '12px'
            }}
          />

          {/* Clear button */}
          {filters.establishment_id && (
            <button
              type="button"
              onClick={() => {
                onFilterChange('establishment_id', '');
                setEstablishmentSearch('');
                setShowEstablishmentSuggestions(false);
              }}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#E879F9',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          )}

          {/* Autocomplete Dropdown - Phase 3.3: Portal to escape sidebar overflow */}
          {showEstablishmentSuggestions && ReactDOM.createPortal(
            <div
              style={{
                position: 'fixed',
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width || 278,
                background: 'rgba(0, 0, 0, 0.95)',
                border: '2px solid rgba(232, 121, 249, 0.4)',
                borderRadius: '12px',
                maxHeight: '300px',
                overflowY: 'auto',
                zIndex: 9999,
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
              }}
            >
              {(() => {
                const { groupedByZone, sortedZones } = filteredEstablishments;

                if (sortedZones.length === 0) {
                  return (
                    <div
                      style={{
                        padding: '12px 16px',
                        color: '#cccccc',
                        textAlign: 'center'
                      }}
                    >
                      {t('search.noResults')}
                    </div>
                  );
                }

                return sortedZones.map((zone) => (
                  <div key={zone}>
                    {/* Zone Header - Gray Neutral */}
                    <div
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: '#cccccc',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {getZoneLabel(zone)}</span>
                    </div>

                    {/* Establishments in Zone */}
                    {groupedByZone[zone].map((est) => (
                      <div
                        key={est.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onFilterChange('establishment_id', est.id);
                          setEstablishmentSearch(est.name);
                          setShowEstablishmentSuggestions(false);
                        }}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'background 0.2s ease',
                          color: filters.establishment_id === est.id ? '#00E5FF' : '#ffffff',
                          fontSize: '14px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {est.name}
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </div>,
            document.body
          )}
        </div>
      </div>

      </FilterSection>

      {/* ============================================
         SECTION 4: QUALITÉ (Quality & Preferences)
         ============================================ */}
      <FilterSection
        title={t('search.sections.quality', 'Quality')}
        icon={<Sparkles size={18} />}
        defaultExpanded={true}
        activeCount={sectionFilterCounts.quality}
      >
      {/* Languages Filter - v12.0 extracted component */}
      <LanguageChips
        selectedLanguages={filters.languages}
        onLanguagesChange={(languages) => onFilterChange('languages', languages)}
        disabled={loading}
      />

      {/* Rating Filter - v12.0 extracted component */}
      <RatingFilter
        minRating={filters.min_rating}
        onRatingChange={(rating) => onFilterChange('min_rating', rating)}
        disabled={loading}
      />

      {/* Has Photos Filter - v12.0 extracted component */}
      <ToggleFilter
        isActive={filters.has_photos === 'true'}
        onToggle={() => onFilterChange('has_photos', filters.has_photos === 'true' ? '' : 'true')}
        label={t('search.hasPhotos', 'With Photos Only')}
        icon={Image}
        activeColor="#00E5FF"
        disabled={loading}
      />

      {/* Social Media Filter - v12.0 extracted component */}
      <SocialMediaChips
        selectedPlatforms={filters.social_media}
        onPlatformsChange={(platforms) => onFilterChange('social_media', platforms)}
        disabled={loading}
      />
      </FilterSection>

      {/* Sort removed from filters - now in SearchPage near cards (v11.1 fix #5) */}

        {/* Loading Indicator */}
        {loading && (
          <div className="loading-indicator-nightlife" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={16} className="spin" /> {t('search.searching')}
          </div>
        )}
      </div>
      {/* End Filters Content - Desktop */}
      </>
      )}
    </div>
  );
});

SearchFilters.displayName = 'SearchFilters';

export default SearchFilters;