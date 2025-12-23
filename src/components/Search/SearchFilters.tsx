import React from 'react';
import { useTranslation } from 'react-i18next';
import { getZoneLabel } from '../../utils/constants';
import { logger } from '../../utils/logger';
import '../../styles/layout/search-layout.css';

// Development logging helper
const isDev = process.env.NODE_ENV === 'development';
const debugLog = (message: string, data?: any) => {
  if (isDev) logger.debug(message, data);
};

export interface FilterValues {
  q: string; // Query text search (matches API parameter)
  type: string; // 🆕 v10.3 - Employee type (all/freelance/regular)
  nationality: string;
  zone: string;
  establishment_id: string;
  category_id: string;
  age_min: string;
  age_max: string;
  is_verified: string; // 🆕 v10.2 - Verified filter
  sort_by: string;
  sort_order: string;
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

  // 🎯 États locaux pour champs age (éviter perte focus)
  const [localAgeMin, setLocalAgeMin] = React.useState(filters.age_min);
  const [localAgeMax, setLocalAgeMax] = React.useState(filters.age_max);

  // 🎯 État local pour search query (instant feedback, 0ms lag)
  const [localQuery, setLocalQuery] = React.useState(filters.q);

  // 📱 Mobile filters collapse state
  const [isMobile, setIsMobile] = React.useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false);

  // ⚠️ Age validation error state
  const [ageError, setAgeError] = React.useState<string>('');

  // 🎯 Références pour gestion focus et requêtes
  const inputRef = React.useRef<HTMLInputElement>(null);
  const ageMinRef = React.useRef<HTMLInputElement>(null);
  const ageMaxRef = React.useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = React.useRef<number | undefined>(undefined);
  const ageDebounceTimeoutRef = React.useRef<number | undefined>(undefined);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const wasTypingRef = React.useRef<boolean>(false);
  const wasTypingAgeRef = React.useRef<{ min: boolean; max: boolean }>({ min: false, max: false });

  // 🎯 Refs to track latest age values without causing effect re-runs (fix infinite loop)
  const localAgeMinRef = React.useRef<string>(localAgeMin);
  const localAgeMaxRef = React.useRef<string>(localAgeMax);

  // 🏢 Establishment autocomplete state
  const [establishmentSearch, setEstablishmentSearch] = React.useState('');
  const [showEstablishmentSuggestions, setShowEstablishmentSuggestions] = React.useState(false);
  const establishmentInputRef = React.useRef<HTMLInputElement>(null);

  // 🏢 Filter establishments by search query and group by zone
  const filterEstablishmentsByQuery = React.useCallback((query: string) => {
    const zoneNames: Record<string, string> = {
      soi6: 'Soi 6',
      walkingstreet: 'Walking Street',
      beachroad: 'Beach Road',
      lkmetro: 'LK Metro',
      treetown: 'Tree Town',
      soibuakhao: 'Soi Buakhao'
    };

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

    // Sort zones alphabetically
    const sortedZones = Object.keys(groupedByZone).sort((a, b) =>
      (zoneNames[a] || a).localeCompare(zoneNames[b] || b)
    );

    return { groupedByZone, sortedZones, zoneNames };
  }, [filters.zone, availableFilters.establishments]);

  // Sort options - Using translations
  const sortOptions = React.useMemo(() => [
    { value: 'relevance', label: `🎯 ${t('search.sortOptions.relevance')}` },
    { value: 'vip', label: `👑 ${t('search.sortOptions.vip')}` },
    { value: 'popularity', label: `⭐ ${t('search.sortOptions.popular')}` },
    { value: 'newest', label: `🆕 ${t('search.sortOptions.newest')}` },
    { value: 'oldest', label: `📅 ${t('search.sortOptions.oldest')}` },
    { value: 'name', label: `📝 ${t('search.sortOptions.name')}` }
  ], [t]);

  // 🚀 Styles supprimés - remplacés par CSS pur .input-nightlife et .select-nightlife

  // 🎯 CONSOLIDATED: Sync all local states with parent props in one effect
  // This reduces re-renders from 5 separate effects to 1
  React.useEffect(() => {
    // Sync age values
    setLocalAgeMin(filters.age_min);
    setLocalAgeMax(filters.age_max);
    // Sync search query
    setLocalQuery(filters.q);
    // Keep refs in sync for cleanup (no state update needed)
    localAgeMinRef.current = filters.age_min;
    localAgeMaxRef.current = filters.age_max;
  }, [filters.age_min, filters.age_max, filters.q]);

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

  // 🎯 CONSOLIDATED: Hook pour restaurer le focus des champs age (2 effects → 1)
  React.useEffect(() => {
    if (!loading) {
      // Focus age min if user was typing
      if (wasTypingAgeRef.current.min && ageMinRef.current && document.activeElement !== ageMinRef.current) {
        const timeoutId = setTimeout(() => {
          if (ageMinRef.current && wasTypingAgeRef.current.min) {
            ageMinRef.current.focus();
          }
        }, 10);
        return () => clearTimeout(timeoutId);
      }
      // Focus age max if user was typing
      if (wasTypingAgeRef.current.max && ageMaxRef.current && document.activeElement !== ageMaxRef.current) {
        const timeoutId = setTimeout(() => {
          if (ageMaxRef.current && wasTypingAgeRef.current.max) {
            ageMaxRef.current.focus();
          }
        }, 10);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [loading]);

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
    setLocalAgeMin('');
    setLocalAgeMax('');
    wasTypingRef.current = false;
    wasTypingAgeRef.current = { min: false, max: false };

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

  // 🚀 OPTIMIZED: Single debounce (in SearchPage) - NO double debouncing
  // Local state updates immediately, parent handles the debounce
  const handleSearchInputChange = React.useCallback((value: string) => {
    // ✅ Update local state IMMEDIATELY (0ms lag - instant visual feedback)
    setLocalQuery(value);

    // 🎯 Marquer que l'utilisateur est en train de taper
    wasTypingRef.current = true;

    // ✅ DIRECT call to parent - SearchPage handles the debounce (150ms)
    // NO additional debounce here to avoid double debouncing
    onQueryChange(value);

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

    // 🎯 REDUCED from 300ms to 200ms - suggestions appear faster
    // This is independent of search, just for autocomplete dropdown
    debounceTimeoutRef.current = window.setTimeout(() => {
      fetchSuggestions(value);
    }, 200);
  }, [onQueryChange]);

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

  // 🎯 Handlers pour champs age avec debouncing et focus management - Optimized for scheduler
  const handleAgeMinChange = React.useCallback((value: string) => {
    wasTypingAgeRef.current.min = true;
    setLocalAgeMin(value);

    // ⚠️ Age validation (18-60 years)
    if (value !== '' && value !== '0') {
      const age = parseInt(value, 10);
      if (isNaN(age) || age < 18 || age > 60) {
        setAgeError(t('search.ageValidation.outOfRange'));
        return; // Don't update parent if invalid
      }
    }

    // Clear error if valid
    setAgeError('');

    // Clear previous timeout
    if (ageDebounceTimeoutRef.current) {
      clearTimeout(ageDebounceTimeoutRef.current);
    }

    // Debounced update to parent with longer delay to avoid scheduler violations
    ageDebounceTimeoutRef.current = window.setTimeout(() => {
      onFilterChange('age_min', value);
      wasTypingAgeRef.current.min = false;
    }, 500); // 🎯 Increased from 300ms to 500ms
  }, [onFilterChange, t]);

  const handleAgeMaxChange = React.useCallback((value: string) => {
    wasTypingAgeRef.current.max = true;
    setLocalAgeMax(value);

    // ⚠️ Age validation (18-60 years)
    if (value !== '' && value !== '0') {
      const age = parseInt(value, 10);
      if (isNaN(age) || age < 18 || age > 60) {
        setAgeError(t('search.ageValidation.outOfRange'));
        return; // Don't update parent if invalid
      }
    }

    // Clear error if valid
    setAgeError('');

    // Clear previous timeout
    if (ageDebounceTimeoutRef.current) {
      clearTimeout(ageDebounceTimeoutRef.current);
    }

    // Debounced update to parent with longer delay to avoid scheduler violations
    ageDebounceTimeoutRef.current = window.setTimeout(() => {
      onFilterChange('age_max', value);
      wasTypingAgeRef.current.max = false;
    }, 500); // 🎯 Increased from 300ms to 500ms
  }, [onFilterChange, t]);

  // ✅ Cleanup debounce on unmount - Flush pending age values to avoid data loss
  // 🐛 FIX: Use refs instead of state in deps to prevent infinite loop
  React.useEffect(() => {
    return () => {
      if (ageDebounceTimeoutRef.current) {
        clearTimeout(ageDebounceTimeoutRef.current);
        // Flush pending values immediately before unmount (only non-empty values)
        // Use refs to access latest values without causing effect re-runs
        if (wasTypingAgeRef.current.min && localAgeMinRef.current !== '') {
          onFilterChange('age_min', localAgeMinRef.current);
        }
        if (wasTypingAgeRef.current.max && localAgeMaxRef.current !== '') {
          onFilterChange('age_max', localAgeMaxRef.current);
        }
      }
    };
  }, [onFilterChange]); // ✅ Only onFilterChange in deps - prevents infinite loop

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

  return (
    <div className="search-filters-fixed-nightlife" data-testid="search-filters">
      {/* Mobile Toggle Button */}
      {isMobile && (
        <button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className={`search-filters-toggle-btn ${isFiltersOpen ? 'search-filters-toggle-btn--expanded' : ''}`}
          aria-expanded={isFiltersOpen}
          data-testid="mobile-filters-toggle"
        >
          <span>
            🔍 {t('search.filters')}
            {activeFiltersCount > 0 && ` (${activeFiltersCount})`}
          </span>
          <span style={{
            fontSize: '20px',
            transform: isFiltersOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
          }}>
            ▼
          </span>
        </button>
      )}

      {/* Filters Content - Collapsible on mobile */}
      <div className={`filters-content ${isMobile && !isFiltersOpen ? 'filters-content--closed' : ''}`}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px'
        }}>
          <h3 className="header-title-nightlife">
            🔍 {t('search.filters')}
          </h3>

          {activeFiltersCount > 0 && (
            <button
              onClick={handleClearFilters}
              disabled={loading}
              className="btn-clear-filters-nightlife"
              data-testid="clear-filters"
            >
              🗑️ {t('search.clearFiltersWithCount', { count: activeFiltersCount })}
            </button>
          )}
      </div>

      {/* Verified Filter - PRIORITAIRE - v10.3 Enhanced */}
      <div style={{ marginBottom: '25px' }}>
        <button
          type="button"
          onClick={() => onFilterChange('is_verified', filters.is_verified === 'true' ? '' : 'true')}
          disabled={loading}
          className={`verified-filter-nightlife ${filters.is_verified === 'true' ? 'verified-filter-active' : ''} ${loading ? 'verified-filter-disabled' : ''}`}
          data-testid="verified-filter"
        >
          <span className={`verified-badge-icon-nightlife ${filters.is_verified === 'true' ? 'verified-badge-icon-active' : 'verified-badge-icon-inactive'}`}>
            ✓
          </span>
          <span className={`verified-filter-text-nightlife ${filters.is_verified === 'true' ? 'verified-filter-text-active' : ''}`}>
            {t('search.verifiedOnly', 'Verified Profiles Only')}
          </span>
        </button>
      </div>

      {/* Employee Type Filter - 🆕 v10.3 - Freelance vs Regular */}
      <div style={{ marginBottom: '20px' }}>
        <label className="label-nightlife">
          👤 {t('search.employeeType')}
        </label>
        <select
          value={filters.type}
          onChange={(e) => onFilterChange('type', e.target.value)}
          disabled={loading}
          className="select-nightlife"
          data-testid="type-filter"
        >
          <option value="all" style={{ background: '#1a1a2e', color: '#ffffff' }}>
            {t('search.allEmployeeTypes')}
          </option>
          <option value="freelance" style={{ background: '#1a1a2e', color: '#ffffff' }}>
            💎 {t('search.freelances')}
          </option>
          <option value="regular" style={{ background: '#1a1a2e', color: '#ffffff' }}>
            🏢 {t('search.regularEmployees')}
          </option>
        </select>
      </div>

      {/* Search Query with Autocomplete */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <label className="label-nightlife">
            🔎 {t('search.searchName')}
          </label>
          {isTyping && (
            <span style={{
              fontSize: '12px',
              color: '#00E5FF',
              background: 'rgba(0,255,255,0.1)',
              padding: '2px 6px',
              borderRadius: '8px',
              border: '1px solid rgba(0,255,255,0.3)',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>
              ✏️ {t('search.typing')}
            </span>
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => handleSearchInputChange(e.target.value)}
          placeholder={t('search.enterName')}
          disabled={loading}
          className="input-nightlife"
          data-testid="search-input"
          onFocus={() => {
            // Réafficher suggestions si disponibles
            if (autocompleteState.suggestions.length > 0) {
              setAutocompleteState(prev => ({
                ...prev,
                visible: true
              }));
            }
          }}
          onBlur={() => {
            // 🎯 Délai réduit pour meilleure UX
            setTimeout(() => {
              setAutocompleteState(prev => ({
                ...prev,
                visible: false
              }));
            }, 150); // 150ms vs 200ms
          }}
        />

        {/* 🚀 Autocomplete Suggestions Optimisées */}
        {autocompleteState.visible && autocompleteState.suggestions.length > 0 && (
          <div className="autocomplete-dropdown-nightlife">
            {autocompleteState.suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="autocomplete-item-nightlife"
                onMouseDown={(e) => {
                  // 🎯 onMouseDown vs onClick pour éviter conflit avec onBlur
                  e.preventDefault();
                  handleSuggestionClick(suggestion);
                }}
              >
                <span className="suggestion-text">{suggestion}</span>
              </div>
            ))}
          </div>
        )}

        {/* 🔄 Loading indicator optimisé */}
        {autocompleteState.loading && (
          <div className="autocomplete-loading-nightlife">
            <span className="loading-spinner">🔄</span>
          </div>
        )}
      </div>

      {/* Age Range */}
      <div style={{ marginBottom: '20px' }}>
        <label className="label-nightlife">
          🎂 {t('search.ageRange')}
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            ref={ageMinRef}
            type="number"
            value={localAgeMin}
            onChange={(e) => handleAgeMinChange(e.target.value)}
            placeholder={t('search.ageMin')}
            min="18"
            max="60"
            disabled={loading}
            className="input-nightlife"
            data-testid="age-min-input"
          />
          <input
            ref={ageMaxRef}
            type="number"
            value={localAgeMax}
            onChange={(e) => handleAgeMaxChange(e.target.value)}
            placeholder={t('search.ageMax')}
            min="18"
            max="60"
            disabled={loading}
            className="input-nightlife"
            data-testid="age-max-input"
          />
        </div>

        {/* ⚠️ Age validation error message */}
        {ageError && (
          <div style={{
            marginTop: '8px',
            padding: '10px 12px',
            background: 'rgba(255, 71, 87, 0.1)',
            border: '1px solid rgba(255, 71, 87, 0.4)',
            borderRadius: 'var(--border-radius-lg)',
            color: 'var(--color-error)',
            fontSize: 'var(--font-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span>{ageError}</span>
          </div>
        )}

        {/* 💡 Age range info (always visible) */}
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          background: 'rgba(193, 154, 107, 0.1)',
          border: '1px solid rgba(193, 154, 107, 0.3)',
          borderRadius: 'var(--border-radius-lg)',
          color: 'var(--color-primary)',
          fontSize: 'var(--font-xs)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '14px' }}>💡</span>
          <span>{t('search.ageValidation.minimum')} - {t('search.ageValidation.maximum')}</span>
        </div>
      </div>

      {/* Nationality */}
      <div style={{ marginBottom: '20px' }}>
        <label className="label-nightlife">
          🌍 {t('search.nationality')}
        </label>
        <select
          value={filters.nationality}
          onChange={(e) => onFilterChange('nationality', e.target.value)}
          disabled={loading}
          className="select-nightlife"
          data-testid="nationality-filter"
        >
          <option value="">{t('search.allNationalities')}</option>
          {availableFilters.nationalities.map(nationality => (
            <option key={nationality} value={nationality} style={{ background: '#1a1a2e', color: '#ffffff' }}>
              {nationality}
            </option>
          ))}
        </select>
      </div>

      {/* Zone */}
      <div style={{ marginBottom: '20px' }}>
        <label className="label-nightlife">
          📍 {t('search.zone')}
        </label>
        <select
          value={filters.zone}
          onChange={(e) => handleZoneChangeInternal(e.target.value)}
          disabled={loading}
          className="select-nightlife"
          data-testid="zone-filter"
        >
          <option value="">{t('search.allZones')}</option>
          {availableFilters.zones.map(zone => (
            <option key={zone} value={zone} style={{ background: '#1a1a2e', color: '#ffffff' }}>
              {getZoneLabel(zone)}
            </option>
          ))}
        </select>
      </div>

      {/* Establishment Type */}
      <div style={{ marginBottom: '20px' }}>
        <label className="label-nightlife">
          🏷️ {t('search.establishmentType')}
        </label>
        <select
          value={filters.category_id}
          onChange={(e) => onFilterChange('category_id', e.target.value)}
          disabled={loading}
          className="select-nightlife"
          data-testid="category-filter"
        >
          <option value="">{t('search.allTypes')}</option>
          {availableFilters.categories.map(category => (
            <option key={category.id} value={category.id} style={{ background: '#1a1a2e', color: '#ffffff' }}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Establishment */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <label className="label-nightlife">
          🏢 {t('search.establishment')}
        </label>
        <div style={{ position: 'relative' }}>
          <input
            ref={establishmentInputRef}
            type="text"
            value={establishmentSearch}
            onChange={(e) => {
              setEstablishmentSearch(e.target.value);
              setShowEstablishmentSuggestions(true);
            }}
            onFocus={() => setShowEstablishmentSuggestions(true)}
            onBlur={() => {
              setTimeout(() => setShowEstablishmentSuggestions(false), 200);
            }}
            placeholder={t('search.allEstablishments')}
            disabled={loading}
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
                color: '#C19A6B',
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

          {/* Autocomplete Dropdown */}
          {showEstablishmentSuggestions && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'rgba(0, 0, 0, 0.95)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                marginTop: '4px',
                maxHeight: '300px',
                overflowY: 'auto',
                zIndex: 1000, // ✅ Increased from 10 to 1000 (standard for dropdowns)
                backdropFilter: 'blur(10px)'
              }}
            >
              {(() => {
                const { groupedByZone, sortedZones, zoneNames } = filteredEstablishments;

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
                      📍 {zoneNames[zone] || zone}
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
            </div>
          )}
        </div>
      </div>

      {/* Sort Options */}
      <div style={{ marginBottom: '20px' }}>
        <label className="label-nightlife">
          📊 {t('search.sortBy')}
        </label>
        <select
          value={filters.sort_by}
          onChange={(e) => onFilterChange('sort_by', e.target.value)}
          disabled={loading}
          className="select-nightlife"
          data-testid="sort-filter"
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value} style={{ background: '#1a1a2e', color: '#ffffff' }}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="loading-indicator-nightlife">
            🔄 {t('search.searching')}
          </div>
        )}
      </div>
      {/* End Filters Content */}
    </div>
  );
});

SearchFilters.displayName = 'SearchFilters';

export default SearchFilters;