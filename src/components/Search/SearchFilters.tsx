import React from 'react';
import { getZoneLabel } from '../../utils/constants';
import { logger } from '../../utils/logger';

// Development logging helper
const isDev = process.env.NODE_ENV === 'development';
const debugLog = (message: string, data?: any) => {
  if (isDev) logger.debug(message, data);
};

export interface FilterValues {
  query: string;
  nationality: string;
  zone: string;
  establishment_id: string;
  category_id: string;
  age_min: string;
  age_max: string;
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
  // 🚀 État unifié pour autocomplétion optimisée
  const [autocompleteState, setAutocompleteState] = React.useState({
    suggestions: [] as string[],
    visible: false,
    loading: false
  });

  // 🎯 États locaux pour champs age (éviter perte focus)
  const [localAgeMin, setLocalAgeMin] = React.useState(filters.age_min);
  const [localAgeMax, setLocalAgeMax] = React.useState(filters.age_max);

  // 🎯 Références pour gestion focus et requêtes
  const inputRef = React.useRef<HTMLInputElement>(null);
  const ageMinRef = React.useRef<HTMLInputElement>(null);
  const ageMaxRef = React.useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = React.useRef<number | undefined>(undefined);
  const ageDebounceTimeoutRef = React.useRef<number | undefined>(undefined);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const wasTypingRef = React.useRef<boolean>(false);
  const wasTypingAgeRef = React.useRef<{ min: boolean; max: boolean }>({ min: false, max: false });
  // Sort options
  const sortOptions = [
    { value: 'relevance', label: '🎯 Relevance' },
    { value: 'popularity', label: '⭐ Popularity' },
    { value: 'newest', label: '🆕 Newest First' },
    { value: 'oldest', label: '📅 Oldest First' },
    { value: 'name', label: '📝 Name A-Z' }
  ];

  // 🚀 Styles supprimés - remplacés par CSS pur .input-nightlife et .select-nightlife

  // 🎯 Synchronisation des états locaux age avec props
  React.useEffect(() => {
    setLocalAgeMin(filters.age_min);
  }, [filters.age_min]);

  React.useEffect(() => {
    setLocalAgeMax(filters.age_max);
  }, [filters.age_max]);

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

  // 🎯 Hook pour restaurer le focus des champs age
  React.useEffect(() => {
    if (wasTypingAgeRef.current.min && !loading && ageMinRef.current && document.activeElement !== ageMinRef.current) {
      const timeoutId = setTimeout(() => {
        if (ageMinRef.current && wasTypingAgeRef.current.min) {
          ageMinRef.current.focus();
          const length = ageMinRef.current.value.length;
          ageMinRef.current.setSelectionRange(length, length);
        }
      }, 10);
      return () => clearTimeout(timeoutId);
    }
  }, [loading]);

  React.useEffect(() => {
    if (wasTypingAgeRef.current.max && !loading && ageMaxRef.current && document.activeElement !== ageMaxRef.current) {
      const timeoutId = setTimeout(() => {
        if (ageMaxRef.current && wasTypingAgeRef.current.max) {
          ageMaxRef.current.focus();
          const length = ageMaxRef.current.value.length;
          ageMaxRef.current.setSelectionRange(length, length);
        }
      }, 10);
      return () => clearTimeout(timeoutId);
    }
  }, [loading]);

  // Clear all filters - use the optimized parent function
  const handleClearFilters = () => {
    // Clear local age states immediately for instant UI feedback
    setLocalAgeMin('');
    setLocalAgeMax('');
    wasTypingAgeRef.current = { min: false, max: false };

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
        `${process.env.REACT_APP_API_URL}/api/employees/suggestions/names?q=${encodeURIComponent(query)}`,
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'Cache-Control': 'max-age=300' // 5 min cache browser
          }
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
    } catch (error: any) {
      if (error.name !== 'AbortError') {
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

  // 🚀 Debouncing intelligent optimisé (200ms pour suggestions) - Optimized for scheduler
  const handleSearchInputChange = React.useCallback((value: string) => {
    // 🎯 Marquer que l'utilisateur est en train de taper
    wasTypingRef.current = true;

    // 🚀 Use requestIdleCallback for non-urgent operations
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // Cancel requête en cours si changement rapide
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 0);
    }

    // Utilise la nouvelle fonction optimisée du parent
    onQueryChange(value);

    // Cancel timeout précédent
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

    // Nouveau timeout avec délai optimisé pour suggestions
    debounceTimeoutRef.current = window.setTimeout(() => {
      fetchSuggestions(value);
    }, 300); // 🎯 Increased from 200ms to 300ms to reduce scheduler violations
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

    // Clear previous timeout
    if (ageDebounceTimeoutRef.current) {
      clearTimeout(ageDebounceTimeoutRef.current);
    }

    // Debounced update to parent with longer delay to avoid scheduler violations
    ageDebounceTimeoutRef.current = window.setTimeout(() => {
      onFilterChange('age_min', value);
      wasTypingAgeRef.current.min = false;
    }, 500); // 🎯 Increased from 300ms to 500ms
  }, [onFilterChange]);

  const handleAgeMaxChange = React.useCallback((value: string) => {
    wasTypingAgeRef.current.max = true;
    setLocalAgeMax(value);

    // Clear previous timeout
    if (ageDebounceTimeoutRef.current) {
      clearTimeout(ageDebounceTimeoutRef.current);
    }

    // Debounced update to parent with longer delay to avoid scheduler violations
    ageDebounceTimeoutRef.current = window.setTimeout(() => {
      onFilterChange('age_max', value);
      wasTypingAgeRef.current.max = false;
    }, 500); // 🎯 Increased from 300ms to 500ms
  }, [onFilterChange]);

  // Count active filters - Memoized to prevent recalculation on every render
  const activeFiltersCount = React.useMemo(() =>
    Object.entries(filters).filter(([key, value]) =>
      key !== 'sort_by' && key !== 'sort_order' && value && value.trim()
    ).length,
    [filters]
  );

  return (
    <div className="search-filters-fixed-nightlife">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '25px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: 'bold',
          background: 'linear-gradient(45deg, #FF1B8D, #FFD700)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 20px rgba(255,27,141,0.3)'
        }}>
          🔍 Search Filters
        </h3>

        {activeFiltersCount > 0 && (
          <button
            onClick={handleClearFilters}
            disabled={loading}
            style={{
              padding: '6px 12px',
              border: '1px solid rgba(255,71,87,0.5)',
              background: 'rgba(255,71,87,0.1)',
              color: '#FF4757',
              borderRadius: '15px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              opacity: loading ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(255,71,87,0.2)';
                e.currentTarget.style.borderColor = '#FF4757';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(255,71,87,0.1)';
                e.currentTarget.style.borderColor = 'rgba(255,71,87,0.5)';
              }
            }}
          >
            🗑️ Clear ({activeFiltersCount})
          </button>
        )}
      </div>

      {/* Search Query with Autocomplete */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <label className="label-nightlife">
            🔎 Search Name
          </label>
          {isTyping && (
            <span style={{
              fontSize: '12px',
              color: '#00FFFF',
              background: 'rgba(0,255,255,0.1)',
              padding: '2px 6px',
              borderRadius: '8px',
              border: '1px solid rgba(0,255,255,0.3)',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>
              ✏️ Typing...
            </span>
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={filters.query}
          onChange={(e) => handleSearchInputChange(e.target.value)}
          placeholder="Enter employee name..."
          disabled={loading}
          className="input-nightlife"
          style={{
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'text'
          }}
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
          🎂 Age Range
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            ref={ageMinRef}
            type="number"
            value={localAgeMin}
            onChange={(e) => handleAgeMinChange(e.target.value)}
            placeholder="Min"
            min="18"
            max="60"
            disabled={loading}
            className="input-nightlife"
            style={{
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'text'
            }}
          />
          <input
            ref={ageMaxRef}
            type="number"
            value={localAgeMax}
            onChange={(e) => handleAgeMaxChange(e.target.value)}
            placeholder="Max"
            min="18"
            max="60"
            disabled={loading}
            className="input-nightlife"
            style={{
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'text'
            }}
          />
        </div>
      </div>

      {/* Nationality */}
      <div style={{ marginBottom: '20px' }}>
        <label className="label-nightlife">
          🌍 Nationality
        </label>
        <select
          value={filters.nationality}
          onChange={(e) => onFilterChange('nationality', e.target.value)}
          disabled={loading}
          className="select-nightlife"
          style={{
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          <option value="">All Nationalities</option>
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
          📍 Zone
        </label>
        <select
          value={filters.zone}
          onChange={(e) => onZoneChange(e.target.value)}
          disabled={loading}
          className="select-nightlife"
          style={{
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          <option value="">All Zones</option>
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
          🏷️ Establishment Type
        </label>
        <select
          value={filters.category_id}
          onChange={(e) => onFilterChange('category_id', e.target.value)}
          disabled={loading}
          className="select-nightlife"
          style={{
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          <option value="">All Types</option>
          {availableFilters.categories.map(category => (
            <option key={category.id} value={category.id} style={{ background: '#1a1a2e', color: '#ffffff' }}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Establishment */}
      <div style={{ marginBottom: '20px' }}>
        <label className="label-nightlife">
          🏢 Establishment
        </label>
        <select
          value={filters.establishment_id}
          onChange={(e) => onFilterChange('establishment_id', e.target.value)}
          disabled={loading}
          className="select-nightlife"
          style={{
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          <option value="">All Establishments</option>
          {React.useMemo(() => {
            // Filter establishments by selected zone if any
            const filteredEstablishments = filters.zone
              ? availableFilters.establishments.filter(est => est.zone === filters.zone)
              : availableFilters.establishments;

            // Group establishments by zone
            const groupedByZone = filteredEstablishments.reduce((acc, est) => {
              const zone = est.zone || 'Other';
              if (!acc[zone]) acc[zone] = [];
              acc[zone].push(est);
              return acc;
            }, {} as Record<string, typeof filteredEstablishments>);

            // Render grouped options
            return Object.entries(groupedByZone)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([zone, establishments]) => (
                <optgroup key={zone} label={`📍 ${zone.charAt(0).toUpperCase() + zone.slice(1)}`}>
                  {establishments.map(establishment => (
                    <option key={establishment.id} value={establishment.id} style={{ background: '#1a1a2e', color: '#ffffff' }}>
                      {establishment.name}
                    </option>
                  ))}
                </optgroup>
              ));
          }, [filters.zone, availableFilters.establishments])}
        </select>
      </div>

      {/* Sort Options */}
      <div style={{ marginBottom: '20px' }}>
        <label className="label-nightlife">
          📊 Sort By
        </label>
        <select
          value={filters.sort_by}
          onChange={(e) => onFilterChange('sort_by', e.target.value)}
          disabled={loading}
          className="select-nightlife"
          style={{
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
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
        <div style={{
          textAlign: 'center',
          padding: '15px',
          background: 'rgba(255,27,141,0.1)',
          border: '1px solid rgba(255,27,141,0.3)',
          borderRadius: '12px',
          color: '#FF1B8D',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          🔄 Searching...
        </div>
      )}
    </div>
  );
});

SearchFilters.displayName = 'SearchFilters';

export default SearchFilters;