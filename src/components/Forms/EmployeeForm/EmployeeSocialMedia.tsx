/**
 * EmployeeSocialMedia component
 * Handles social media input fields
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
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

  const labelMap: Record<string, string> = {
    ig: `📷 ${t('employee.instagramLabel')}`,
    fb: `📘 ${t('employee.facebookLabel')}`,
    line: t('employee.lineLabel'),
    tg: t('employee.telegramLabel'),
    wa: `📞 ${t('employee.whatsappLabel')}`
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
            <label className="label-nightlife">
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
