/**
 * EmployeeFormButtons component
 * Handles submit and cancel buttons
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FormErrors } from './types';

interface EmployeeFormButtonsProps {
  isLoading: boolean;
  uploadingPhotos: boolean;
  isEditMode: boolean;
  errors: FormErrors;
  onCancel: () => void;
}

export function EmployeeFormButtons({
  isLoading,
  uploadingPhotos,
  isEditMode,
  errors,
  onCancel
}: EmployeeFormButtonsProps) {
  const { t } = useTranslation();

  return (
    <>
      {errors.submit && (
        <div className="error-message-nightlife" style={{
          background: 'rgba(255,71,87,0.1)',
          border: '1px solid rgba(255,71,87,0.3)',
          padding: '15px 20px',
          borderRadius: '12px',
          fontSize: '14px',
          backdropFilter: 'blur(10px)'
        }}>
          ⚠️ {errors.submit}
        </div>
      )}

      <div className="button-group-center">
        <button
          type="button"
          onClick={onCancel}
          className="btn-nightlife-base btn-secondary-nightlife"
          style={{
            padding: '14px 30px'
          }}
        >
          ❌ {t('employee.buttonCancel')}
        </button>

        <button
          type="submit"
          disabled={isLoading || uploadingPhotos}
          className="btn-nightlife-base btn-primary-nightlife"
          style={{
            padding: '14px 30px'
          }}
        >
          {uploadingPhotos ? (
            <span className="loading-flex">
              <span className="loading-spinner-small-nightlife"></span>
              📤 {t('employee.buttonUploadingPhotos')}
            </span>
          ) : isLoading ? (
            <span className="loading-flex">
              <span className="loading-spinner-small-nightlife"></span>
              ⏳ {t('employee.buttonSubmitting')}
            </span>
          ) : (
            isEditMode ? `💾 ${t('employee.buttonSaveChanges')}` : `✨ ${t('employee.buttonAddEmployee')}`
          )}
        </button>
      </div>
    </>
  );
}

export default EmployeeFormButtons;
