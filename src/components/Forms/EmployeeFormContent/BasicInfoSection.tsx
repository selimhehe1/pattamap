import React from 'react';
import { FileText, User, UserCog, Cake, Globe, AlertTriangle } from 'lucide-react';
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
