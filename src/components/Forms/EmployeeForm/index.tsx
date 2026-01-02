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
    // Freelance warning
    showFreelanceWarning,
    warningEstablishment,
    handleConfirmFreelanceSwitch,
    handleCancelFreelanceSwitch,
    // Handlers
    handleInputChange,
    handleNationalityChange,
    handleLanguagesChange,
    handleSexChange,
    handleEstablishmentChange,
    handleFreelanceModeChange,
    addNewPhotos,
    removeNewPhoto,
    removeExistingPhoto,
    handleSubmit
  } = useEmployeeFormState({ initialData, onSubmit });

  // DEBUG: Check if all handlers are functions
  console.log('🔍 EmployeeForm DEBUG:', {
    onSubmit: typeof onSubmit,
    onCancel: typeof onCancel,
    handleInputChange: typeof handleInputChange,
    handleNationalityChange: typeof handleNationalityChange,
    handleLanguagesChange: typeof handleLanguagesChange,
    handleSexChange: typeof handleSexChange,
    handleEstablishmentChange: typeof handleEstablishmentChange,
    handleFreelanceModeChange: typeof handleFreelanceModeChange,
    addNewPhotos: typeof addNewPhotos,
    removeNewPhoto: typeof removeNewPhoto,
    removeExistingPhoto: typeof removeExistingPhoto,
    handleSubmit: typeof handleSubmit,
    formData: formData ? 'exists' : 'null',
    initialData: initialData ? 'exists' : 'null'
  });

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
            onSexChange={handleSexChange}
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

      {/* Freelance Warning Dialog */}
      {showFreelanceWarning && warningEstablishment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '2px solid #C19A6B',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '450px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{
              color: '#FFD700',
              marginBottom: '20px',
              fontSize: '20px',
              fontWeight: 'bold'
            }}>
              ⚠️ Changement vers mode Freelance
            </h3>
            <p style={{
              color: 'white',
              marginBottom: '15px',
              fontSize: '15px',
              lineHeight: '1.6'
            }}>
              Un freelance ne peut travailler <strong style={{ color: '#00E5FF' }}>qu'en Nightclub</strong>.
            </p>
            <p style={{
              color: '#ccc',
              marginBottom: '25px',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              L'association avec <strong style={{ color: '#FF6B6B' }}>{warningEstablishment.name}</strong>
              {' '}({warningEstablishment.category?.name}) sera supprimée.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleCancelFreelanceSwitch}
                style={{
                  padding: '12px 25px',
                  background: 'transparent',
                  border: '2px solid #666',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#999';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#666';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmFreelanceSwitch}
                style={{
                  padding: '12px 25px',
                  background: 'linear-gradient(45deg, #9D4EDD, #C77DFF)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(157, 78, 221, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
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
