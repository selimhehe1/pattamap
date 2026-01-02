import React from 'react';
import { Smartphone } from 'lucide-react';
import type { SocialMediaSectionProps } from './types';

// Icon style helper
const iconStyle = { marginRight: '6px', verticalAlign: 'middle' as const };

// Platform labels mapping
const PLATFORM_LABELS: Record<string, string> = {
  ig: 'Instagram',
  fb: 'Facebook',
  line: 'Line',
  tg: 'Telegram',
  wa: 'WhatsApp'
};

/**
 * SocialMediaSection Component
 *
 * Form section for entering social media usernames.
 * Supports: Instagram, Facebook, Line, Telegram, WhatsApp
 */
const SocialMediaSection: React.FC<SocialMediaSectionProps> = ({
  socialMedia,
  onChange
}) => {
  return (
    <div className="uf-section">
      <h3 className="uf-section-title">
        <Smartphone size={16} style={iconStyle} /> Social Media (Optional)
      </h3>

      <div className="uf-grid-social">
        {Object.keys(socialMedia).map(platform => {
          const label = PLATFORM_LABELS[platform] || platform;

          return (
            <div key={platform} className="uf-field">
              <label className="uf-label">
                {label}
              </label>
              <input
                type="text"
                name={`social_media.${platform}`}
                value={socialMedia[platform as keyof typeof socialMedia]}
                onChange={onChange}
                className="uf-input"
                placeholder={`${label} username`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SocialMediaSection;
