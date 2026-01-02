import React from 'react';
import { FileText, User, UserCog, Cake, Globe, AlertTriangle, Users } from 'lucide-react';
import NationalityTagsInput from '../NationalityTagsInput';
import type { BasicInfoSectionProps } from './types';

// Icon style helper
const iconStyle = { marginRight: '6px', verticalAlign: 'middle' as const };

/**
 * BasicInfoSection Component
 *
 * Form section for basic employee information:
 * - Name (required)
 * - Nickname
 * - Age
 * - Nationality
 * - Description
 */
const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  formData,
  errors,
  isLoading,
  onInputChange,
  onNationalityChange
}) => {
  return (
    <div className="uf-section">
      <h3 className="uf-section-title">
        <FileText size={16} style={iconStyle} /> Basic Information
      </h3>

      <div className="uf-field">
        <label className="uf-label">
          <User size={14} style={iconStyle} /> Name *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={onInputChange}
          className="uf-input"
          placeholder="Enter full name"
        />
        {errors.name && (
          <div className="uf-error">
            <AlertTriangle size={14} style={iconStyle} /> {errors.name}
          </div>
        )}
      </div>

      <div className="uf-field">
        <label className="uf-label">
          <UserCog size={14} style={iconStyle} /> Nickname
        </label>
        <input
          type="text"
          name="nickname"
          value={formData.nickname}
          onChange={onInputChange}
          className="uf-input"
          placeholder="Nickname or stage name"
        />
      </div>

      {/* 🆕 v10.x - Sex/Gender Field */}
      <div className="uf-field">
        <label className="uf-label">
          <Users size={14} style={iconStyle} /> Sex *
        </label>
        <div className="uf-radio-group" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { value: 'female', label: 'Female', icon: '♀' },
            { value: 'male', label: 'Male', icon: '♂' },
            { value: 'ladyboy', label: 'Ladyboy', icon: '⚧' }
          ].map(option => (
            <label
              key={option.value}
              className="uf-radio-option"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: formData.sex === option.value ? '2px solid var(--accent-pink)' : '1px solid var(--border-color)',
                background: formData.sex === option.value ? 'rgba(236, 72, 153, 0.1)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                type="radio"
                name="sex"
                value={option.value}
                checked={formData.sex === option.value}
                onChange={onInputChange}
                style={{ display: 'none' }}
              />
              <span style={{ fontSize: '16px' }}>{option.icon}</span>
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {errors.sex && (
          <div className="uf-error">
            <AlertTriangle size={14} style={iconStyle} /> {errors.sex}
          </div>
        )}
      </div>

      <div className="uf-grid-2">
        <div className="uf-field">
          <label className="uf-label">
            <Cake size={14} style={iconStyle} /> Age
          </label>
          <input
            type="number"
            name="age"
            value={formData.age}
            onChange={onInputChange}
            className="uf-input"
            min="18"
            max="80"
            placeholder="Age"
          />
          {errors.age && (
            <div className="uf-error">
              <AlertTriangle size={14} style={iconStyle} /> {errors.age}
            </div>
          )}
        </div>

        <div className="uf-field">
          <label className="uf-label">
            <Globe size={14} style={iconStyle} /> Nationality
          </label>
          <NationalityTagsInput
            value={formData.nationality}
            onChange={onNationalityChange}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="uf-field">
        <label className="uf-label">
          <FileText size={14} style={iconStyle} /> Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={onInputChange}
          className="uf-textarea"
          placeholder="Brief description..."
        />
      </div>
    </div>
  );
};

export default BasicInfoSection;
