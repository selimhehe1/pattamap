import React from 'react';
import { Users, Music, Building2, MapPin, Check, AlertTriangle, Lightbulb } from 'lucide-react';
import type { FreelanceModeSectionProps } from './types';

// Icon style helper
const iconStyle = { marginRight: '6px', verticalAlign: 'middle' as const };

/**
 * FreelanceModeSection Component
 *
 * Form section for freelance mode configuration:
 * - Toggle for enabling freelance mode
 * - Multi-select nightclubs (optional)
 * - Information note about freelance working
 */
const FreelanceModeSection: React.FC<FreelanceModeSectionProps> = ({
  isFreelanceMode,
  selectedNightclubs,
  establishments,
  onFreelanceModeChange,
  onNightclubToggle
}) => {
  const nightclubs = establishments.filter(est => est.category?.name === 'Nightclub');

  return (
    <>
      {/* Freelance Mode Toggle */}
      <div className="freelance-mode-container">
        <h3 className="freelance-mode-section-title">
          <Users size={16} style={iconStyle} /> Employment Mode
        </h3>

        <div className="freelance-toggle-box">
          <label className="freelance-toggle-label">
            <input
              type="checkbox"
              checked={isFreelanceMode}
              onChange={(e) => onFreelanceModeChange(e.target.checked)}
            />
            <span><Users size={14} style={iconStyle} /> Freelance Mode</span>
          </label>
          {isFreelanceMode && (
            <span className="freelance-active-badge">
              ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Freelance Nightclubs Selector */}
      {isFreelanceMode && (
        <div className="nightclubs-selector">
          <h3 className="freelance-mode-section-title">
            <Music size={16} style={iconStyle} /> Nightclubs (Optional)
          </h3>

          <div className="uf-field">
            <label className="nightclubs-selector-label">
              <Building2 size={14} style={iconStyle} /> Select Nightclubs (you can work at multiple)
            </label>

            {nightclubs.length > 0 ? (
              <div className="nightclubs-list">
                {nightclubs.map(nightclub => (
                  <label
                    key={nightclub.id}
                    className={`nightclub-option ${selectedNightclubs.includes(nightclub.id) ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedNightclubs.includes(nightclub.id)}
                      onChange={(e) => onNightclubToggle(nightclub.id, e.target.checked)}
                    />
                    <span className="nightclub-name">
                      {nightclub.name}
                    </span>
                    {nightclub.zone && (
                      <span className="nightclub-zone">
                        <MapPin size={12} style={iconStyle} /> {nightclub.zone}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            ) : (
              <div className="nightclubs-empty-state">
                <AlertTriangle size={14} style={iconStyle} /> No nightclubs available yet. You can still register as a free freelance!
              </div>
            )}

            {selectedNightclubs.length > 0 && (
              <div className="nightclubs-selected-count">
                <Check size={14} style={iconStyle} /> {selectedNightclubs.length} nightclub(s) selected
              </div>
            )}
          </div>

          <div className="freelance-info-note">
            <Lightbulb size={14} style={iconStyle} /> <strong>Note:</strong> As a freelance, you can work at multiple nightclubs or be completely independent. Select the nightclubs where you regularly work, or leave it empty to be listed as a free freelance.
          </div>
        </div>
      )}
    </>
  );
};

export default FreelanceModeSection;
