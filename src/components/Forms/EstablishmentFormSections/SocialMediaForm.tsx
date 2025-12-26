import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react';
import { FaInstagram, FaTiktok } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

interface SocialMediaFormProps {
  formData: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
  onSocialMediaChange: (platform: 'instagram' | 'twitter' | 'tiktok', value: string) => void;
}

const SocialMediaForm: React.FC<SocialMediaFormProps> = ({
  formData,
  onSocialMediaChange
}) => {
  const { t } = useTranslation();

  // Styles pour les inputs avec couleurs branding des plateformes
  const getInputStyle = (platform: 'instagram' | 'twitter' | 'tiktok', _value: string) => {
    const borderColors = {
      instagram: 'rgba(225, 48, 108, 0.3)', // Instagram gradient rose
      twitter: 'rgba(29, 155, 240, 0.3)', // Twitter blue
      tiktok: 'rgba(254, 44, 85, 0.3)' // TikTok red/pink
    };

    return {
      flex: 1,
      padding: '10px 12px 10px 42px', // Extra padding left for icon
      background: '#1a1a1a',
      border: `2px solid ${borderColors[platform]}`,
      borderRadius: '8px',
      fontSize: '14px',
      color: 'white',
      outline: 'none',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)',
      boxSizing: 'border-box' as const
    };
  };

  const getFocusColor = (platform: 'instagram' | 'twitter' | 'tiktok') => {
    const focusColors = {
      instagram: '#E1306C', // Instagram rose
      twitter: '#1DA1F2', // Twitter blue
      tiktok: '#FE2C55' // TikTok red
    };
    return focusColors[platform];
  };

  const getIcon = (platform: 'instagram' | 'twitter' | 'tiktok') => {
    const icons = {
      instagram: <FaInstagram />,
      twitter: <FaXTwitter />,
      tiktok: <FaTiktok />
    };
    return icons[platform];
  };

  const getPlaceholder = (platform: 'instagram' | 'twitter' | 'tiktok') => {
    const placeholders = {
      instagram: 'https://instagram.com/your_bar',
      twitter: 'https://x.com/your_bar',
      tiktok: 'https://tiktok.com/@your_bar'
    };
    return placeholders[platform];
  };

  const _getPlatformName = (platform: 'instagram' | 'twitter' | 'tiktok') => {
    const names = {
      instagram: 'Instagram',
      twitter: 'X (Twitter)',
      tiktok: 'TikTok'
    };
    return names[platform];
  };

  return (
    <div style={{ marginBottom: '15px' }}>
      <h3 className="text-cyan-nightlife" style={{
        margin: '0 0 12px 0',
        fontSize: '15px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        🌐 {t('establishment.socialMedia.sectionTitle')}
      </h3>

      {/* Instagram */}
      <div style={{ marginBottom: '12px' }}>
        <label className="label-nightlife" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '6px'
        }}>
          {getIcon('instagram')} Instagram
        </label>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '18px',
            pointerEvents: 'none',
            zIndex: 1
          }}>
            {getIcon('instagram')}
          </span>
          <input
            type="url"
            value={formData.instagram || ''}
            onChange={(e) => onSocialMediaChange('instagram', e.target.value)}
            style={getInputStyle('instagram', formData.instagram || '')}
            onFocus={(e) => {
              e.target.style.borderColor = getFocusColor('instagram');
              e.target.style.boxShadow = `0 0 15px ${getFocusColor('instagram')}40`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(225, 48, 108, 0.3)';
              e.target.style.boxShadow = 'none';
            }}
            placeholder={getPlaceholder('instagram')}
          />
        </div>
      </div>

      {/* Twitter/X */}
      <div style={{ marginBottom: '12px' }}>
        <label className="label-nightlife" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '6px'
        }}>
          {getIcon('twitter')} X (Twitter)
        </label>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '18px',
            pointerEvents: 'none',
            zIndex: 1
          }}>
            {getIcon('twitter')}
          </span>
          <input
            type="url"
            value={formData.twitter || ''}
            onChange={(e) => onSocialMediaChange('twitter', e.target.value)}
            style={getInputStyle('twitter', formData.twitter || '')}
            onFocus={(e) => {
              e.target.style.borderColor = getFocusColor('twitter');
              e.target.style.boxShadow = `0 0 15px ${getFocusColor('twitter')}40`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(29, 155, 240, 0.3)';
              e.target.style.boxShadow = 'none';
            }}
            placeholder={getPlaceholder('twitter')}
          />
        </div>
      </div>

      {/* TikTok */}
      <div style={{ marginBottom: '12px' }}>
        <label className="label-nightlife" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '6px'
        }}>
          {getIcon('tiktok')} TikTok
        </label>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '18px',
            pointerEvents: 'none',
            zIndex: 1
          }}>
            {getIcon('tiktok')}
          </span>
          <input
            type="url"
            value={formData.tiktok || ''}
            onChange={(e) => onSocialMediaChange('tiktok', e.target.value)}
            style={getInputStyle('tiktok', formData.tiktok || '')}
            onFocus={(e) => {
              e.target.style.borderColor = getFocusColor('tiktok');
              e.target.style.boxShadow = `0 0 15px ${getFocusColor('tiktok')}40`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(254, 44, 85, 0.3)';
              e.target.style.boxShadow = 'none';
            }}
            placeholder={getPlaceholder('tiktok')}
          />
        </div>
      </div>

      {/* Info box */}
      <div style={{
        marginTop: '12px',
        padding: '10px',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        fontSize: '12px',
        color: 'var(--nightlife-secondary)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0,255,255,0.3)'
      }}>
        <Lightbulb size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('establishment.socialMedia.tipText')}
      </div>
    </div>
  );
};

export default SocialMediaForm;
