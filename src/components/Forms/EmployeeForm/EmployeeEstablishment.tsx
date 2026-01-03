/**
 * EmployeeEstablishment component
 * Handles establishment selection with autocomplete
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Store, MapPin, Moon, Building2 } from 'lucide-react';
import { useEstablishments } from '../../../hooks';
import { getZoneLabel } from '../../../utils/constants';
import type { Establishment } from '../../../types';

interface EmployeeEstablishmentProps {
  currentEstablishmentId: string;
  isFreelanceMode: boolean;
  onEstablishmentChange: (establishmentId: string) => void;
  error?: string; // Validation error to display
}

export function EmployeeEstablishment({
  currentEstablishmentId,
  isFreelanceMode,
  onEstablishmentChange,
  error
}: EmployeeEstablishmentProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: establishments = [] } = useEstablishments();

  // Initialize search with establishment name (or clear when empty)
  useEffect(() => {
    // Clear search query when establishment is removed
    if (!currentEstablishmentId) {
      setSearchQuery('');
      return;
    }
    // Set search query to establishment name when selected
    if (establishments.length > 0) {
      const est = establishments.find((e: Establishment) => e.id === currentEstablishmentId);
      if (est) {
        setSearchQuery(est.name);
      }
    }
  }, [currentEstablishmentId, establishments]);

  const filterEstablishmentsByQuery = useCallback((query: string) => {
    // Filter establishments with zone
    let filtered = establishments.filter((est: Establishment) => est.zone);

    // In freelance mode, show only nightclubs
    if (isFreelanceMode) {
      filtered = filtered.filter((est: Establishment) =>
        est.category?.name?.toLowerCase() === 'nightclub'
      );
    }

    // Apply search filter if query exists
    if (query.trim().length > 0) {
      const search = query.toLowerCase();
      filtered = filtered.filter((est: Establishment) =>
        est.name.toLowerCase().includes(search)
      );
    }

    // Group by zone
    const groupedByZone: Record<string, Establishment[]> = {};
    filtered.forEach((est: Establishment) => {
      const zone = est.zone || 'other';
      if (!groupedByZone[zone]) {
        groupedByZone[zone] = [];
      }
      groupedByZone[zone].push(est);
    });

    // Sort zones alphabetically (using centralized getZoneLabel)
    const sortedZones = Object.keys(groupedByZone).sort((a, b) =>
      getZoneLabel(a).localeCompare(getZoneLabel(b))
    );

    return { groupedByZone, sortedZones };
  }, [establishments, isFreelanceMode]);

  const results = useMemo(
    () => filterEstablishmentsByQuery(searchQuery),
    [filterEstablishmentsByQuery, searchQuery]
  );

  const handleSelect = (est: Establishment) => {
    onEstablishmentChange(est.id);
    setSearchQuery(est.name);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    onEstablishmentChange('');
    setSearchQuery('');
    setShowSuggestions(false);
  };

  return (
    <div className="uf-section">
      <h3 className="text-cyan-nightlife" style={{
        margin: '0 0 15px 0',
        fontSize: '16px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {isFreelanceMode ? (
          <><Moon size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Associated Nightclubs <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'rgba(255,255,255,0.6)' }}>(Optional)</span></>
        ) : (
          <>
            <Building2 size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            {t('employee.currentEmployment', 'Current Establishment')}
            <span style={{ color: '#FF6B6B', marginLeft: '4px' }}>*</span>
          </>
        )}
      </h3>

      <div className="form-input-group-lg">
        <label className="label-nightlife">
          <Store size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('employee.currentEstablishment')}
        </label>
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder={t('employee.establishmentPlaceholder')}
            className="input-nightlife"
            style={{
              paddingRight: currentEstablishmentId ? '40px' : '12px'
            }}
          />

          {/* Clear button */}
          {currentEstablishmentId && (
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
              aria-label={t('common.clear')}
            >
              ×
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {showSuggestions && (
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
                zIndex: 10,
                backdropFilter: 'blur(10px)'
              }}
            >
              {results.sortedZones.length === 0 ? (
                <div
                  style={{
                    padding: '12px 16px',
                    color: '#cccccc',
                    textAlign: 'center'
                  }}
                >
                  {t('employee.noEstablishmentsFound')}
                </div>
              ) : (
                results.sortedZones.map((zone) => (
                  <div key={zone}>
                    {/* Zone Header */}
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
                      <MapPin size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {getZoneLabel(zone)}
                    </div>

                    {/* Establishments in Zone */}
                    {results.groupedByZone[zone].map((est) => (
                      <div
                        key={est.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelect(est);
                        }}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'background 0.2s ease',
                          color: currentEstablishmentId === est.id ? '#00E5FF' : '#ffffff',
                          fontSize: '14px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {est.name}{est.category?.name && ` - ${est.category.name}`}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p style={{
            color: '#FF6B6B',
            fontSize: '13px',
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            ⚠️ {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default EmployeeEstablishment;
