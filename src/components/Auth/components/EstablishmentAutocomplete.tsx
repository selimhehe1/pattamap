import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, MapPin } from 'lucide-react';
import { Establishment } from '../../../types';
import { getZoneLabel } from '../../../utils/constants';

interface EstablishmentAutocompleteProps {
  /** Current search value */
  value: string;
  /** Called when search value changes */
  onChange: (value: string) => void;
  /** Called when an establishment is selected */
  onSelect: (establishment: Establishment) => void;
  /** List of establishments to search through */
  establishments: Establishment[];
  /** If true, excludes establishments that already have an owner */
  excludeWithOwner?: boolean;
  /** Placeholder text for input */
  placeholder?: string;
  /** Label text (optional) */
  label?: string;
  /** Label color (default: #C19A6B) */
  labelColor?: string;
  /** Show category in dropdown items */
  showCategory?: boolean;
  /** Called when selection is cleared */
  onClear?: () => void;
  /** Currently selected establishment ID (for showing clear button) */
  selectedId?: string | null;
}

/**
 * Reusable establishment autocomplete component
 * Used in registration form for filtering establishments by zone
 */
const EstablishmentAutocomplete: React.FC<EstablishmentAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  establishments,
  excludeWithOwner = false,
  placeholder,
  label,
  labelColor = '#C19A6B',
  showCategory = false,
  onClear,
  selectedId,
}) => {
  const { t } = useTranslation();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter establishments by search query and group by zone
  const { groupedByZone, sortedZones, hasResults } = useMemo(() => {
    // Filter establishments with zone only
    let filtered = establishments.filter(est => est.zone);

    // Exclude establishments that already have an owner (for owner claim)
    if (excludeWithOwner) {
      filtered = filtered.filter(est => !est.has_owner);
    }

    // Apply search filter if query exists
    if (value.trim().length > 0) {
      const lowerQuery = value.toLowerCase();
      filtered = filtered.filter(est =>
        est.name.toLowerCase().includes(lowerQuery)
      );
    }

    // Group by zone
    const grouped = filtered.reduce((acc, est) => {
      const zone = est.zone || 'other';
      if (!acc[zone]) acc[zone] = [];
      acc[zone].push(est);
      return acc;
    }, {} as Record<string, Establishment[]>);

    // Sort each group alphabetically
    Object.keys(grouped).forEach(zone => {
      grouped[zone].sort((a, b) => a.name.localeCompare(b.name));
    });

    // Sort zones alphabetically
    const sorted = Object.keys(grouped).sort((a, b) =>
      getZoneLabel(a).localeCompare(getZoneLabel(b))
    );

    return {
      groupedByZone: grouped,
      sortedZones: sorted,
      hasResults: sorted.length > 0
    };
  }, [establishments, value, excludeWithOwner]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
  }, [onChange]);

  const handleFocus = useCallback(() => {
    setShowSuggestions(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Delay to allow click on suggestion
    setTimeout(() => setShowSuggestions(false), 200);
  }, []);

  const handleSelect = useCallback((est: Establishment) => {
    onSelect(est);
    onChange(est.name);
    setShowSuggestions(false);
  }, [onSelect, onChange]);

  const handleClear = useCallback(() => {
    onChange('');
    setShowSuggestions(false);
    onClear?.();
  }, [onChange, onClear]);

  return (
    <div style={{ position: 'relative' }}>
      {label && (
        <label style={{
          display: 'block',
          color: labelColor,
          fontSize: '13px',
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>
          <Building2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          {label}
        </label>
      )}

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder || t('register.searchEstablishments')}
        className="input-nightlife"
      />

      {/* Clear button */}
      {(value || selectedId) && (
        <button
          type="button"
          onClick={handleClear}
          style={{
            position: 'absolute',
            right: '12px',
            top: label ? '38px' : '12px',
            background: 'transparent',
            border: 'none',
            color: labelColor,
            fontSize: '18px',
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

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        hasResults ? (
          <div className="autocomplete-dropdown-nightlife">
            {sortedZones.map(zone => (
              <div key={zone}>
                {/* Zone Header */}
                <div style={{
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#cccccc',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <MapPin size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  {getZoneLabel(zone)}
                </div>
                {/* Establishments in Zone */}
                {groupedByZone[zone].map(est => (
                  <div
                    key={est.id}
                    className="autocomplete-item-nightlife"
                    style={{ fontSize: '14px' }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(est);
                    }}
                  >
                    {showCategory ? (
                      <div>
                        <div>{est.name}</div>
                        {est.category?.name && (
                          <div style={{ fontSize: '11px', color: '#999999', marginTop: '2px' }}>
                            {est.category.name}
                          </div>
                        )}
                      </div>
                    ) : (
                      est.name
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : value.trim().length > 0 ? (
          <div className="autocomplete-dropdown-nightlife" style={{ textAlign: 'center', color: '#999999' }}>
            {t('register.noEstablishmentsFound')}
          </div>
        ) : null
      )}
    </div>
  );
};

export default EstablishmentAutocomplete;
