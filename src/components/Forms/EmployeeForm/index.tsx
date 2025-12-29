/**
 * EmployeeForm - Main orchestrator component
 *
 * Decomposed from 1,078 lines to modular components:
 * - EmployeeBasicInfo: Name, nickname, age, nationality, description
 * - EmployeePhotoUpload: Photo upload with preview
 * - EmployeeEmploymentMode: Freelance mode toggle
 * - EmployeeEstablishment: Establishment selector with autocomplete
 * - EmployeeSocialMedia: Social media fields
 * - EmployeeFormButtons: Submit/cancel buttons
 */

import React from 'react';

import { EmployeeBasicInfo } from './EmployeeBasicInfo';
import { EmployeePhotoUpload } from './EmployeePhotoUpload';
import { EmployeeEmploymentMode } from './EmployeeEmploymentMode';
import { EmployeeEstablishment } from './EmployeeEstablishment';
import { EmployeeSocialMedia } from './EmployeeSocialMedia';
import { EmployeeFormButtons } from './EmployeeFormButtons';
import { useEmployeeFormState } from './hooks/useEmployeeFormState';
import type { EmployeeFormProps } from './types';

import '../../../styles/components/form-unified.css';

export function EmployeeForm({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData
}: EmployeeFormProps) {
  const {
    formData,
    newPhotos,
    existingPhotoUrls,
    errors,
    isFreelanceMode,
    uploadingPhotos,
    handleInputChange,
    handleNationalityChange,
    handleLanguagesChange,
    handleEstablishmentChange,
    handleFreelanceModeChange,
    addNewPhotos,
    removeNewPhoto,
    removeExistingPhoto,
    handleSubmit
  } = useEmployeeFormState({ initialData, onSubmit });

  return (
    <div className="uf-container uf-animate-fade">
      <div className="uf-animate-slide">
        <form onSubmit={handleSubmit}>
          {/* Basic Info Section */}
          <EmployeeBasicInfo
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
            onNationalityChange={handleNationalityChange}
            onLanguagesChange={handleLanguagesChange}
          />

          {/* Photo Upload Section */}
          <EmployeePhotoUpload
            newPhotos={newPhotos}
            existingPhotoUrls={existingPhotoUrls}
            errors={errors}
            uploadingPhotos={uploadingPhotos}
            onNewPhotosAdd={addNewPhotos}
            onNewPhotoRemove={removeNewPhoto}
            onExistingPhotoRemove={removeExistingPhoto}
          />

          {/* Employment Mode Section */}
          <EmployeeEmploymentMode
            isFreelanceMode={isFreelanceMode}
            onModeChange={handleFreelanceModeChange}
          />

          {/* Establishment Selector */}
          <EmployeeEstablishment
            currentEstablishmentId={formData.current_establishment_id}
            isFreelanceMode={isFreelanceMode}
            onEstablishmentChange={handleEstablishmentChange}
          />

          {/* Social Media Section */}
          <EmployeeSocialMedia
            socialMedia={formData.social_media}
            onInputChange={handleInputChange}
          />

          {/* Form Buttons */}
          <EmployeeFormButtons
            isLoading={isLoading}
            uploadingPhotos={uploadingPhotos}
            isEditMode={!!initialData}
            errors={errors}
            onCancel={onCancel}
          />
        </form>
      </div>
    </div>
  );
}

// Re-export types and sub-components for flexibility
export type { EmployeeFormProps, EmployeeSubmitData, InternalFormData } from './types';
export { EmployeeBasicInfo } from './EmployeeBasicInfo';
export { EmployeePhotoUpload } from './EmployeePhotoUpload';
export { EmployeeEmploymentMode } from './EmployeeEmploymentMode';
export { EmployeeEstablishment } from './EmployeeEstablishment';
export { EmployeeSocialMedia } from './EmployeeSocialMedia';
export { EmployeeFormButtons } from './EmployeeFormButtons';

export default EmployeeForm;
