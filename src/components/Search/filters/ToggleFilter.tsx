/**
 * ToggleFilter - Reusable toggle button filter
 *
 * Extracted from SearchFilters.tsx for better maintainability.
 * Used for: Verified Profiles, Freelance Only, Has Photos
 */

import React from 'react';
import { Check, LucideIcon } from 'lucide-react';

interface ToggleFilterProps {
  isActive: boolean;
  onToggle: () => void;
  label: string;
  icon: LucideIcon;
  activeColor?: string;
  disabled?: boolean;
  infoText?: string;
  infoIcon?: LucideIcon;
}

const ToggleFilter: React.FC<ToggleFilterProps> = ({
  isActive,
  onToggle,
  label,
  icon: Icon,
  activeColor = '#00E5FF',
  disabled = false,
  infoText,
  infoIcon: InfoIcon
}) => {
  return (
    <div className="toggle-filter-container" style={{ marginBottom: '1rem' }}>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`toggle-filter ${isActive ? 'toggle-filter-active' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          width: '100%',
          padding: '12px 16px',
          background: isActive
            ? `linear-gradient(135deg, ${activeColor}40, ${activeColor}33)`
            : 'rgba(255, 255, 255, 0.05)',
          border: isActive
            ? `2px solid ${activeColor}`
            : '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          color: isActive ? activeColor : 'rgba(255, 255, 255, 0.8)',
          fontSize: '14px',
          fontWeight: '600',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isActive ? `0 0 20px ${activeColor}4D` : 'none'
        }}
      >
        <Icon size={18} />
        <span>{label}</span>
        {isActive && (
          <Check size={16} style={{ marginLeft: 'auto' }} />
        )}
      </button>

      {/* Optional info text below toggle */}
      {isActive && infoText && (
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          background: `${activeColor}1A`,
          border: `1px solid ${activeColor}33`,
          borderRadius: '8px',
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {InfoIcon && <InfoIcon size={12} color={activeColor} />}
          {infoText}
        </div>
      )}
    </div>
  );
};

export default ToggleFilter;
