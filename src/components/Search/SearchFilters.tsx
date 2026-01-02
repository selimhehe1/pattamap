import React from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, ChevronDown, Trash2, Check, Building2,
  Cake, Globe, MapPin, Tag,
  Loader2, Pencil, Lightbulb, AlertTriangle,
  // v11.0 - New filter icons
  Languages, Star, Image, MessageCircle, User, Sparkles,
  // v11.1 - Freelance toggle
  Briefcase
} from 'lucide-react';
import { getZoneLabel, ZONE_OPTIONS } from '../../utils/constants';
import { logger } from '../../utils/logger';
import FilterSection from './FilterSection';
import CustomSelect from '../Common/CustomSelect';
import '../../styles/layout/search-layout.css';

// Development logging helper
const isDev = process.env.NODE_ENV === 'development';
const debugLog = (message: string, data?: unknown) => {
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

  // 🆕 v11.0 - Count active filters per section for badges
  const sectionFilterCounts = React.useMemo(() => ({
    search: [filters.q, filters.zone, filters.establishment_id, filters.category_id].filter(Boolean).length,
    profile: [filters.age_min, filters.age_max, filters.nationality, filters.languages].filter(Boolean).length,
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
      {/* Mobile Toggle Button */}
      {isMobile && (
        <button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className={`search-filters-toggle-btn ${isFiltersOpen ? 'search-filters-toggle-btn--expanded' : ''}`}
          aria-expanded={isFiltersOpen}
          data-testid="mobile-filters-toggle"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={16} /> {t('search.filters')}
            {activeFiltersCount > 0 && ` (${activeFiltersCount})`}
          </span>
          <span style={{
            transform: isFiltersOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
            display: 'flex'
          }}>
            <ChevronDown size={20} />
          </span>
        </button>
      )}

      {/* Filters Content - Collapsible on mobile */}
      <div className={`filters-content ${isMobile && !isFiltersOpen ? 'filters-content--closed' : ''}`}>
        {/* Header */}
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

      {/* ============================================
         FREELANCE TOGGLE - Separate (v11.1 fix #3)
         Business logic: Freelancers can only work in
         nightclubs or nowhere (no establishment)
         ============================================ */}
      <div className="freelance-toggle-container" style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => {
            const newType = filters.type === 'freelance' ? 'all' : 'freelance';
            onFilterChange('type', newType);
            // Reset establishment when switching to freelance
            if (newType === 'freelance') {
              onFilterChange('establishment_id', '');
            }
          }}
          disabled={loading}
          className={`freelance-toggle ${filters.type === 'freelance' ? 'freelance-toggle-active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            padding: '12px 16px',
            background: filters.type === 'freelance'
              ? 'linear-gradient(135deg, rgba(232, 121, 249, 0.25), rgba(168, 85, 247, 0.2))'
              : 'rgba(255, 255, 255, 0.05)',
            border: filters.type === 'freelance'
              ? '2px solid #E879F9'
              : '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            color: filters.type === 'freelance' ? '#E879F9' : 'rgba(255, 255, 255, 0.8)',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filters.type === 'freelance' ? '0 0 20px rgba(232, 121, 249, 0.3)' : 'none'
          }}
        >
          <Briefcase size={18} />
          <span>{t('search.freelanceOnly', 'Freelance Only')}</span>
          {filters.type === 'freelance' && (
            <Check size={16} style={{ marginLeft: 'auto' }} />
          )}
        </button>
        {filters.type === 'freelance' && (
          <div style={{
            marginTop: '8px',
            padding: '8px 12px',
            background: 'rgba(232, 121, 249, 0.1)',
            border: '1px solid rgba(232, 121, 249, 0.2)',
            borderRadius: '8px',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Lightbulb size={12} color="#E879F9" />
            {t('search.freelanceInfo', 'Freelancers work independently or in nightclubs')}
          </div>
        )}
      </div>

      {/* ============================================
         SECTION 2: PROFIL (Profile)
         ============================================ */}
      <FilterSection
        title={t('search.sections.profile', 'Profile')}
        icon={<User size={18} />}
        defaultExpanded={true}
        activeCount={sectionFilterCounts.profile}
      >
      {/* Age Range - Dual Slider (v11.1 fix #2) */}
      <div className="filter-group">
        <label className="label-nightlife filter-label-with-icon" style={{ marginBottom: '12px' }}>
          <Cake size={18} /> {t('search.ageRange')}
        </label>

        {/* Age value display */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          padding: '8px 12px',
          background: 'rgba(232, 121, 249, 0.1)',
          borderRadius: '10px',
          border: '1px solid rgba(232, 121, 249, 0.2)'
        }}>
          <span style={{ color: '#E879F9', fontSize: '14px', fontWeight: '600' }}>
            {localAgeMin || '18'}
          </span>
          <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
            {t('search.yearsOld', 'years')}
          </span>
          <span style={{ color: '#00E5FF', fontSize: '14px', fontWeight: '600' }}>
            {localAgeMax || '60'}
          </span>
        </div>

        {/* Dual Range Slider Container */}
        <div className="age-range-slider" style={{
          position: 'relative',
          height: '40px',
          display: 'flex',
          alignItems: 'center'
        }}>
          {/* Track background */}
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '6px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '3px'
          }} />

          {/* Active track (colored portion between thumbs) */}
          <div style={{
            position: 'absolute',
            height: '6px',
            background: 'linear-gradient(90deg, #E879F9, #00E5FF)',
            borderRadius: '3px',
            left: `${((Number(localAgeMin || 18) - 18) / (60 - 18)) * 100}%`,
            right: `${100 - ((Number(localAgeMax || 60) - 18) / (60 - 18)) * 100}%`,
            boxShadow: '0 0 10px rgba(232, 121, 249, 0.5)'
          }} />

          {/* Min slider - Phase 3.1: pointer-events gérés par CSS */}
          <input
            ref={ageMinRef}
            type="range"
            min="18"
            max="60"
            value={localAgeMin || '18'}
            onChange={(e) => {
              const newMin = e.target.value;
              const currentMax = Number(localAgeMax || 60);
              // Prevent min from exceeding max
              if (Number(newMin) <= currentMax) {
                handleAgeMinChange(newMin);
              }
            }}
            disabled={loading}
            className="age-range-input age-range-min"
            data-testid="age-min-input"
            style={{
              position: 'absolute',
              width: '100%',
              height: '6px',
              background: 'transparent',
              appearance: 'none',
              WebkitAppearance: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              zIndex: 3
            }}
          />

          {/* Max slider - Phase 3.1: pointer-events gérés par CSS */}
          <input
            ref={ageMaxRef}
            type="range"
            min="18"
            max="60"
            value={localAgeMax || '60'}
            onChange={(e) => {
              const newMax = e.target.value;
              const currentMin = Number(localAgeMin || 18);
              // Prevent max from going below min
              if (Number(newMax) >= currentMin) {
                handleAgeMaxChange(newMax);
              }
            }}
            disabled={loading}
            className="age-range-input age-range-max"
            data-testid="age-max-input"
            style={{
              position: 'absolute',
              width: '100%',
              height: '6px',
              background: 'transparent',
              appearance: 'none',
              WebkitAppearance: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              zIndex: 2
            }}
          />
        </div>

        {/* Min/Max labels */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.4)',
          marginTop: '4px'
        }}>
          <span>18</span>
          <span>60</span>
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
            <AlertTriangle size={16} />
            <span>{ageError}</span>
          </div>
        )}
      </div>

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
      {/* Languages Filter - Multi-select chips */}
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
          {[
            { code: 'Thai', flag: '🇹🇭' },
            { code: 'English', flag: '🇬🇧' },
            { code: 'Chinese', flag: '🇨🇳' },
            { code: 'Russian', flag: '🇷🇺' },
            { code: 'Korean', flag: '🇰🇷' },
            { code: 'Japanese', flag: '🇯🇵' },
            { code: 'German', flag: '🇩🇪' }
          ].map(lang => {
            const selectedLanguages = filters.languages ? filters.languages.split(',') : [];
            const isSelected = selectedLanguages.includes(lang.code);

            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  let newLanguages: string[];
                  if (isSelected) {
                    newLanguages = selectedLanguages.filter(l => l !== lang.code);
                  } else {
                    newLanguages = [...selectedLanguages, lang.code];
                  }
                  onFilterChange('languages', newLanguages.filter(Boolean).join(','));
                }}
                disabled={loading}
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
                  cursor: loading ? 'not-allowed' : 'pointer',
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

      {/* Rating Filter - Star slider */}
      <div className="filter-section">
        <label className="label-nightlife filter-label-with-icon">
          <Star size={20} /> {t('search.minRating', 'Minimum Rating')}
        </label>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '8px'
        }}>
          <div style={{
            display: 'flex',
            gap: '4px'
          }}>
            {[1, 2, 3, 4, 5].map(star => {
              const currentRating = filters.min_rating ? Number(filters.min_rating) : 0;
              const isActive = star <= currentRating;

              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => {
                    // Toggle: if clicking on current rating, clear it
                    if (currentRating === star) {
                      onFilterChange('min_rating', '');
                    } else {
                      onFilterChange('min_rating', String(star));
                    }
                  }}
                  disabled={loading}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    padding: '4px',
                    transition: 'transform 0.2s ease'
                  }}
                  title={`${star} ${t('search.starsOrMore', 'stars or more')}`}
                >
                  <Star
                    size={24}
                    fill={isActive ? '#FFD700' : 'transparent'}
                    color={isActive ? '#FFD700' : 'rgba(255, 255, 255, 0.3)'}
                    style={{
                      filter: isActive ? 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.5))' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  />
                </button>
              );
            })}
          </div>
          {filters.min_rating && (
            <span style={{
              fontSize: '13px',
              color: '#FFD700',
              fontWeight: '600'
            }}>
              {filters.min_rating}+ {t('search.stars', 'stars')}
            </span>
          )}
        </div>
      </div>

      {/* Has Photos Filter - Toggle */}
      <div className="filter-section">
        <button
          type="button"
          onClick={() => onFilterChange('has_photos', filters.has_photos === 'true' ? '' : 'true')}
          disabled={loading}
          className={`photos-filter-toggle ${filters.has_photos === 'true' ? 'photos-filter-active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            padding: '12px 16px',
            background: filters.has_photos === 'true'
              ? 'linear-gradient(135deg, rgba(0, 229, 255, 0.2), rgba(0, 229, 255, 0.1))'
              : 'rgba(255, 255, 255, 0.05)',
            border: filters.has_photos === 'true'
              ? '2px solid #00E5FF'
              : '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            color: filters.has_photos === 'true' ? '#00E5FF' : 'rgba(255, 255, 255, 0.8)',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filters.has_photos === 'true' ? '0 0 20px rgba(0, 229, 255, 0.3)' : 'none'
          }}
        >
          <Image size={20} />
          <span>{t('search.hasPhotos', 'With Photos Only')}</span>
          {filters.has_photos === 'true' && (
            <Check size={16} style={{ marginLeft: 'auto' }} />
          )}
        </button>
      </div>

      {/* Social Media Filter - Checkboxes */}
      <div className="filter-section">
        <label className="label-nightlife filter-label-with-icon">
          <MessageCircle size={20} /> {t('search.socialMedia', 'Social Media')}
        </label>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '8px'
        }}>
          {[
            { id: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C' },
            { id: 'line', label: 'LINE', icon: '💬', color: '#00B900' },
            { id: 'whatsapp', label: 'WhatsApp', icon: '📱', color: '#25D366' },
            { id: 'telegram', label: 'Telegram', icon: '✈️', color: '#0088CC' },
            { id: 'facebook', label: 'Facebook', icon: '👤', color: '#1877F2' }
          ].map(platform => {
            const selectedPlatforms = filters.social_media ? filters.social_media.split(',') : [];
            const isSelected = selectedPlatforms.includes(platform.id);

            return (
              <button
                key={platform.id}
                type="button"
                onClick={() => {
                  let newPlatforms: string[];
                  if (isSelected) {
                    newPlatforms = selectedPlatforms.filter(p => p !== platform.id);
                  } else {
                    newPlatforms = [...selectedPlatforms, platform.id];
                  }
                  onFilterChange('social_media', newPlatforms.filter(Boolean).join(','));
                }}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  background: isSelected
                    ? `linear-gradient(135deg, ${platform.color}33, ${platform.color}22)`
                    : 'rgba(255, 255, 255, 0.05)',
                  border: isSelected
                    ? `2px solid ${platform.color}`
                    : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  color: isSelected ? platform.color : 'rgba(255, 255, 255, 0.8)',
                  fontSize: '12px',
                  fontWeight: isSelected ? '600' : '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? `0 0 12px ${platform.color}44` : 'none'
                }}
              >
                <span>{platform.icon}</span>
                <span>{platform.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      </FilterSection>

      {/* Sort removed from filters - now in SearchPage near cards (v11.1 fix #5) */}

        {/* Loading Indicator */}
        {loading && (
          <div className="loading-indicator-nightlife" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={16} className="spin" /> {t('search.searching')}
          </div>
        )}
      </div>
      {/* End Filters Content */}
    </div>
  );
});

SearchFilters.displayName = 'SearchFilters';

export default SearchFilters;