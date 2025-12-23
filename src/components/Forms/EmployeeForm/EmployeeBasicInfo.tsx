/**
 * EmployeeBasicInfo component
 * Handles name, nickname, age, nationality, and description fields
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import NationalityTagsInput from '../NationalityTagsInput';
import type { InternalFormData, FormErrors } from './types';

interface EmployeeBasicInfoProps {
  formData: InternalFormData;
  errors: FormErrors;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onNationalityChange: (nationalities: string[] | null) => void;
}

export function EmployeeBasicInfo({
  formData,
  errors,
  onInputChange,
  onNationalityChange
}: EmployeeBasicInfoProps) {
  const { t } = useTranslation();

  return (
    <div className="form-section">
      <h3 className="text-cyan-nightlife" style={{
        margin: '0 0 15px 0',
        fontSize: '16px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        👤 {t('employee.basicInfo')}
      </h3>

      <div className="form-grid-2col">
        {/* Name */}
        <div className="form-input-group-lg">
          <label htmlFor="employee-name" className="label-nightlife">
            ✨ {t('employee.nameLabel')} <span className="text-required">*</span>
          </label>
          <input
            id="employee-name"
            type="text"
            name="name"
            value={formData.name}
            onChange={onInputChange}
            required
            className={`input-nightlife ${errors.name ? 'input-error' : ''}`}
            placeholder={t('employee.namePlaceholder')}
          />
          {errors.name && (
            <span className="error-text-nightlife">⚠️ {errors.name}</span>
          )}
        </div>

        {/* Nickname */}
        <div className="form-input-group-lg">
          <label htmlFor="employee-nickname" className="label-nightlife">
            🎭 {t('employee.nicknameLabel')}
          </label>
          <input
            id="employee-nickname"
            type="text"
            name="nickname"
            value={formData.nickname}
            onChange={onInputChange}
            className="input-nightlife"
            placeholder={t('employee.nicknamePlaceholder')}
          />
        </div>
      </div>

      <div className="form-grid-2col">
        {/* Age */}
        <div className="form-input-group-lg">
          <label htmlFor="employee-age" className="label-nightlife">
            🎂 {t('employee.ageLabel')}
          </label>
          <input
            id="employee-age"
            type="number"
            name="age"
            value={formData.age}
            onChange={onInputChange}
            min="18"
            max="99"
            className="input-nightlife"
            placeholder={t('employee.agePlaceholder')}
          />
        </div>

        {/* Nationality */}
        <div className="form-input-group-lg">
          <label className="label-nightlife">
            🌍 {t('employee.nationalityLabel')}
          </label>
          <NationalityTagsInput
            value={formData.nationality}
            onChange={onNationalityChange}
          />
        </div>
      </div>

      {/* Description */}
      <div className="form-input-group-lg">
        <label htmlFor="employee-description" className="label-nightlife">
          📝 {t('employee.descriptionLabel')}
        </label>
        <textarea
          id="employee-description"
          name="description"
          value={formData.description}
          onChange={onInputChange}
          className="textarea-nightlife"
          rows={3}
          placeholder={t('employee.descriptionPlaceholder')}
          style={{ resize: 'vertical', minHeight: '80px' }}
        />
      </div>
    </div>
  );
}

export default EmployeeBasicInfo;
