/**
 * EstablishmentAutocomplete Component
 *
 * Reusable autocomplete component for establishment selection
 * Features:
 * - Search with live filtering
 * - Grouped by zones with headers
 * - Clear button when selection active
 * - Focus/blur management
 * - Standard nightlife styling
 *
 * Used in:
 * - RequestOwnershipModal
 * - Future: Any form requiring establishment selection
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Establishment } from '../../types';
import '../../styles/layout/search-layout.css'; // For .input-nightlife and .autocomplete-dropdown-nightlife

// Custom hook for debounced value
const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

interface EstablishmentAutocompleteProps {
  value: Establishment | null;
  establishments: Establishment[];
  onChange: (establishment: Establishment | null) => void;
  placeholder?: string;
  disabled?: boolean;
  showZoneBadge?: boolean;
}

const EstablishmentAutocomplete: React.FC<EstablishmentAutocompleteProps> = ({
  value,
  establishments,
  onChange,
  placeholder,
  disabled = false,
  showZoneBadge = true
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query by 300ms for better performance with large lists
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Viewport detection: flip dropdown up when not enough space below
  useEffect(() => {
    if (showSuggestions && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 320; // 300px max-height + 20px margin
      setFlipUp(spaceBelow < dropdownHeight);
    }
  }, [showSuggestions]);

  // Zone names mapping - memoized to prevent dependency issues
  const zoneNames = useMemo<Record<string, string>>(() => ({
    soi6: 'Soi 6',
    walkingstreet: 'Walking Street',
    beachroad: 'Beach Road',
    lkmetro: 'LK Metro',
    treetown: 'Tree Town',
    soibuakhao: 'Soi Buakhao'
  }), []);

  // Sync input value with selected establishment
  useEffect(() => {
    if (value) {
      setSearchQuery(value.name);
    } else {
      setSearchQuery('');
    }
  }, [value]);

  // Filter and group establishments using debounced search for better performance
  const filteredEstablishments = useMemo(() => {
    // Show ALL establishments (not just those with zones)
    let filtered = [...establishments];

    // Apply search filter using debounced query for better performance
    if (debouncedSearchQuery.trim().length > 0 && !value) {
      const lowerQuery = debouncedSearchQuery.toLowerCase();
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
    }, {} as Record<string, Establishment[]>);

    // Sort each group alphabetically
    Object.keys(groupedByZone).forEach(zone => {
      groupedByZone[zone].sort((a, b) => a.name.localeCompare(b.name));
    });

    // Sort zones alphabetically
    const sortedZones = Object.keys(groupedByZone).sort((a, b) =>
      (zoneNames[a] || a).localeCompare(zoneNames[b] || b)
    );

    return { groupedByZone, sortedZones };
  }, [establishments, debouncedSearchQuery, value, zoneNames]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSuggestions(true);
    if (value) {
      onChange(null); // Clear selection when typing
    }
  };

  // Handle establishment selection
  const handleSelect = (establishment: Establishment) => {
    onChange(establishment);
    setSearchQuery(establishment.name);
    setShowSuggestions(false);
  };

  // Handle clear button
  const handleClear = () => {
    onChange(null);
    setSearchQuery('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const { groupedByZone, sortedZones } = filteredEstablishments;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => {
          // Delay to allow click on suggestion
          setTimeout(() => setShowSuggestions(false), 200);
        }}
        placeholder={placeholder || t('search.searchEstablishment', 'Search establishment...')}
        disabled={disabled}
        className="input-nightlife"
        style={{
          opacity: disabled ? 0.7 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
          paddingRight: value ? '40px' : '12px'
        }}
      />

      {/* Clear button */}
      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
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

      {/* Autocomplete Dropdown - Viewport-aware positioning */}
      {showSuggestions && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: flipUp ? 'auto' : '100%',
            bottom: flipUp ? '100%' : 'auto',
            left: 0,
            right: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            marginTop: flipUp ? 0 : '4px',
            marginBottom: flipUp ? '4px' : 0,
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1000,
            backdropFilter: 'blur(10px)'
          }}
        >
          {sortedZones.length === 0 ? (
            <div
              style={{
                padding: '12px 16px',
                color: '#cccccc',
                textAlign: 'center'
              }}
            >
              {t('search.noResults', 'No results found')}
            </div>
          ) : (
            sortedZones.map((zone) => (
              <div key={zone}>
                {/* Zone Header */}
                <div
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#cccccc',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1
                  }}
                >
                  📍 {zoneNames[zone] || zone}
                </div>

                {/* Establishments in this zone */}
                {groupedByZone[zone].map((establishment) => (
                  <div
                    key={establishment.id}
                    onMouseDown={(e) => {
                      // onMouseDown vs onClick to avoid conflict with onBlur
                      e.preventDefault();
                      handleSelect(establishment);
                    }}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.2s ease',
                      background: value?.id === establishment.id
                        ? 'rgba(193, 154, 107, 0.2)'
                        : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(193, 154, 107, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = value?.id === establishment.id
                        ? 'rgba(193, 154, 107, 0.2)'
                        : 'transparent';
                    }}
                  >
                    <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500 }}>
                      {establishment.name}
                    </div>
                    {showZoneBadge && establishment.address && (
                      <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginTop: '2px' }}>
                        {establishment.address}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default EstablishmentAutocomplete;
