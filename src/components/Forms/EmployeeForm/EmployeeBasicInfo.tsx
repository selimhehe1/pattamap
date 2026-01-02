/**
 * EmployeeBasicInfo component
 * Handles name, nickname, age, nationality, and description fields
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Sparkles, UserCog, Cake, FileText, AlertTriangle, Languages } from 'lucide-react';
import NationalityTagsInput from '../NationalityTagsInput';
import LanguagesTagsInput from '../LanguagesTagsInput';
import type { InternalFormData, FormErrors } from './types';

interface EmployeeBasicInfoProps {
  formData: InternalFormData;
  errors: FormErrors;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onNationalityChange: (nationalities: string[] | null) => void;
  onLanguagesChange: (languages: string[] | null) => void;
  onSexChange: (sex: 'male' | 'female' | 'ladyboy' | '') => void;
}

export function EmployeeBasicInfo({
  formData,
  errors,
  onInputChange,
  onNationalityChange,
  onLanguagesChange,
  onSexChange
}: EmployeeBasicInfoProps) {
  const { t } = useTranslation();

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
        <User size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('employee.basicInfo')}
      </h3>

      <div className="form-grid-2col">
        {/* Name */}
        <div className="form-input-group-lg">
          <label htmlFor="employee-name" className="label-nightlife">
            <Sparkles size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('employee.nameLabel')} <span className="text-required">*</span>
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
            <span className="error-text-nightlife"><AlertTriangle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {errors.name}</span>
          )}
        </div>

        {/* Nickname */}
        <div className="form-input-group-lg">
          <label htmlFor="employee-nickname" className="label-nightlife">
            <UserCog size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('employee.nicknameLabel')}
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
            <Cake size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('employee.ageLabel')}
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

      {/* Languages Spoken */}
      <div className="form-input-group-lg">
        <label className="label-nightlife">
          <Languages size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('employee.languagesLabel', 'Languages Spoken')}
        </label>
        <LanguagesTagsInput
          value={formData.languages_spoken}
          onChange={onLanguagesChange}
        />
      </div>

      {/* Sex/Gender - Required */}
      <div className="form-input-group-lg">
        <label className="label-nightlife">
          <User size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          {t('employee.sexLabel', 'Gender')} <span className="text-required">*</span>
        </label>
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '8px',
          flexWrap: 'wrap'
        }}>
          {(['female', 'male', 'ladyboy'] as const).map((sexOption) => (
            <label
              key={sexOption}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: formData.sex === sexOption
                  ? '2px solid var(--color-cyan-nightlife)'
                  : '1px solid rgba(255,255,255,0.2)',
                background: formData.sex === sexOption
                  ? 'rgba(0, 255, 255, 0.1)'
                  : 'rgba(255,255,255,0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                type="radio"
                name="sex"
                value={sexOption}
                checked={formData.sex === sexOption}
                onChange={() => onSexChange(sexOption)}
                style={{ display: 'none' }}
              />
              <span style={{
                color: formData.sex === sexOption ? 'var(--color-cyan-nightlife)' : 'inherit',
                fontWeight: formData.sex === sexOption ? '600' : '400'
              }}>
                {t(`employee.sex.${sexOption}`, sexOption.charAt(0).toUpperCase() + sexOption.slice(1))}
              </span>
            </label>
          ))}
        </div>
        {errors.sex && (
          <span className="error-text-nightlife"><AlertTriangle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {errors.sex}</span>
        )}
      </div>

      {/* Description */}
      <div className="form-input-group-lg">
        <label htmlFor="employee-description" className="label-nightlife">
          <FileText size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('employee.descriptionLabel')}
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
