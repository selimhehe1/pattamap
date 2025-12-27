/**
 * EmployeeFormButtons component
 * Handles submit and cancel buttons
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X, Save, Sparkles } from 'lucide-react';
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
        <div className="uf-error-box">
          <AlertTriangle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {errors.submit}
        </div>
      )}

      <div className="uf-actions">
        <button
          type="button"
          onClick={onCancel}
          className="uf-btn uf-btn-cancel"
        >
          <X size={14} /> {t('employee.buttonCancel')}
        </button>

        <button
          type="submit"
          disabled={isLoading || uploadingPhotos}
          className="uf-btn uf-btn-submit"
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
            isEditMode ? <><Save size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('employee.buttonSaveChanges')}</> : <><Sparkles size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('employee.buttonAddEmployee')}</>
          )}
        </button>
      </div>
    </>
  );
}

export default EmployeeFormButtons;
