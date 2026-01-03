/**
 * EmployeeSocialMedia component
 * Handles social media input fields
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaInstagram, FaFacebookF, FaLine, FaTelegramPlane, FaWhatsapp } from 'react-icons/fa';
import type { FormSocialMedia } from './types';

interface EmployeeSocialMediaProps {
  socialMedia: FormSocialMedia;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SOCIAL_PLATFORMS = ['ig', 'fb', 'line', 'tg', 'wa'] as const;

export function EmployeeSocialMedia({
  socialMedia,
  onInputChange
}: EmployeeSocialMediaProps) {
  const { t } = useTranslation();

  const iconMap: Record<string, React.ReactNode> = {
    ig: <FaInstagram size={14} style={{ color: '#E4405F' }} />,
    fb: <FaFacebookF size={14} style={{ color: '#1877F2' }} />,
    line: <FaLine size={14} style={{ color: '#00C300' }} />,
    tg: <FaTelegramPlane size={14} style={{ color: '#0088cc' }} />,
    wa: <FaWhatsapp size={14} style={{ color: '#25D366' }} />
  };

  const labelMap: Record<string, string> = {
    ig: t('employee.instagramLabel'),
    fb: t('employee.facebookLabel'),
    line: t('employee.lineLabel'),
    tg: t('employee.telegramLabel'),
    wa: t('employee.whatsappLabel')
  };

  const placeholderMap: Record<string, string> = {
    ig: t('employee.instagramPlaceholder'),
    fb: t('employee.facebookPlaceholder'),
    line: t('employee.linePlaceholder'),
    tg: t('employee.telegramPlaceholder'),
    wa: t('employee.whatsappPlaceholder')
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
        📱 {t('employee.socialMedia')}
      </h3>

      <div className="social-media-grid">
        {SOCIAL_PLATFORMS.map(platform => (
          <div key={platform}>
            <label className="label-nightlife" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {iconMap[platform]}
              {labelMap[platform]}
            </label>
            <input
              type="text"
              name={`social_media.${platform}`}
              value={socialMedia[platform]}
              onChange={onInputChange}
              className="input-nightlife social-media-input"
              placeholder={placeholderMap[platform]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default EmployeeSocialMedia;
