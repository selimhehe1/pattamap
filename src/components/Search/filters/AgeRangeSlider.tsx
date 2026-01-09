/**
 * AgeRangeSlider - Dual range slider for age filtering
 *
 * Extracted from SearchFilters.tsx for better maintainability.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Cake, AlertTriangle } from 'lucide-react';

interface AgeRangeSliderProps {
  localAgeMin: string;
  localAgeMax: string;
  ageError: string;
  ageMinRef: React.RefObject<HTMLInputElement>;
  ageMaxRef: React.RefObject<HTMLInputElement>;
  onAgeMinChange: (value: string) => void;
  onAgeMaxChange: (value: string) => void;
  disabled?: boolean;
}

const AgeRangeSlider: React.FC<AgeRangeSliderProps> = ({
  localAgeMin,
  localAgeMax,
  ageError,
  ageMinRef,
  ageMaxRef,
  onAgeMinChange,
  onAgeMaxChange,
  disabled = false
}) => {
  const { t } = useTranslation();

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = e.target.value;
    const currentMax = Number(localAgeMax || 60);
    if (Number(newMin) <= currentMax) {
      onAgeMinChange(newMin);
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = e.target.value;
    const currentMin = Number(localAgeMin || 18);
    if (Number(newMax) >= currentMin) {
      onAgeMaxChange(newMax);
    }
  };

  return (
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

        {/* Min slider */}
        <input
          ref={ageMinRef}
          type="range"
          min="18"
          max="60"
          value={localAgeMin || '18'}
          onChange={handleMinChange}
          disabled={disabled}
          className="age-range-input age-range-min"
          data-testid="age-min-input"
          style={{
            position: 'absolute',
            width: '100%',
            height: '6px',
            background: 'transparent',
            appearance: 'none',
            WebkitAppearance: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            zIndex: 3
          }}
        />

        {/* Max slider */}
        <input
          ref={ageMaxRef}
          type="range"
          min="18"
          max="60"
          value={localAgeMax || '60'}
          onChange={handleMaxChange}
          disabled={disabled}
          className="age-range-input age-range-max"
          data-testid="age-max-input"
          style={{
            position: 'absolute',
            width: '100%',
            height: '6px',
            background: 'transparent',
            appearance: 'none',
            WebkitAppearance: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
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

      {/* Age validation error message */}
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
  );
};

export default AgeRangeSlider;
