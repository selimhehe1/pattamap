/**
 * SocialMediaChips - Multi-select social media filter
 *
 * Extracted from SearchFilters.tsx for better maintainability.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';

interface SocialMediaChipsProps {
  selectedPlatforms: string;
  onPlatformsChange: (platforms: string) => void;
  disabled?: boolean;
}

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C' },
  { id: 'line', label: 'LINE', icon: '💬', color: '#00B900' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '📱', color: '#25D366' },
  { id: 'telegram', label: 'Telegram', icon: '✈️', color: '#0088CC' },
  { id: 'facebook', label: 'Facebook', icon: '👤', color: '#1877F2' }
] as const;

const SocialMediaChips: React.FC<SocialMediaChipsProps> = ({
  selectedPlatforms,
  onPlatformsChange,
  disabled = false
}) => {
  const { t } = useTranslation();
  const selectedList = selectedPlatforms ? selectedPlatforms.split(',') : [];

  const handleToggle = (platformId: string) => {
    const isSelected = selectedList.includes(platformId);
    let newPlatforms: string[];

    if (isSelected) {
      newPlatforms = selectedList.filter(p => p !== platformId);
    } else {
      newPlatforms = [...selectedList, platformId];
    }

    onPlatformsChange(newPlatforms.filter(Boolean).join(','));
  };

  return (
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
        {PLATFORMS.map(platform => {
          const isSelected = selectedList.includes(platform.id);

          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => handleToggle(platform.id)}
              disabled={disabled}
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
                cursor: disabled ? 'not-allowed' : 'pointer',
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
  );
};

export default SocialMediaChips;
