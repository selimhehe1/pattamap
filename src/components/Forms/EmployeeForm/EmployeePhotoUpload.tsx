/**
 * EmployeePhotoUpload component
 * Handles photo upload UI, preview grid, and removal
 *
 * Note: Actual upload to Cloudinary happens on form submit
 * This component handles local File selection and URL display
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, AlertTriangle } from 'lucide-react';
import type { FormErrors } from './types';

interface EmployeePhotoUploadProps {
  // New photos (File objects, not yet uploaded)
  newPhotos: File[];
  // Existing photo URLs (from database)
  existingPhotoUrls: string[];
  errors: FormErrors;
  uploadingPhotos: boolean;
  maxPhotos?: number;
  onNewPhotosAdd: (files: File[]) => void;
  onNewPhotoRemove: (index: number) => void;
  onExistingPhotoRemove: (url: string) => void;
}

const DEFAULT_MAX_PHOTOS = 10;

export function EmployeePhotoUpload({
  newPhotos,
  existingPhotoUrls,
  errors,
  uploadingPhotos,
  maxPhotos = DEFAULT_MAX_PHOTOS,
  onNewPhotosAdd,
  onNewPhotoRemove,
  onExistingPhotoRemove
}: EmployeePhotoUploadProps) {
  const { t } = useTranslation();

  const totalPhotos = existingPhotoUrls.length + newPhotos.length;
  const canAddMore = totalPhotos < maxPhotos;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - totalPhotos;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    if (filesToAdd.length === 0) {
      return;
    }

    onNewPhotosAdd(filesToAdd);

    // Reset file input
    e.target.value = '';
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
        <Camera size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('employee.photos')} <span className="text-required">*</span>
        <span style={{
          fontSize: '12px',
          fontWeight: 'normal',
          color: 'rgba(255,255,255,0.6)'
        }}>
          ({totalPhotos}/{maxPhotos})
        </span>
      </h3>

      {/* Upload Zone */}
      <div
        className="photo-upload-zone"
        style={{
          border: `2px dashed ${errors.photos ? '#ff4757' : 'rgba(255,255,255,0.3)'}`,
          borderRadius: '12px',
          padding: '30px',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.05)',
          marginBottom: '15px',
          cursor: !canAddMore ? 'not-allowed' : 'pointer',
          opacity: !canAddMore ? 0.5 : 1
        }}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          disabled={uploadingPhotos || !canAddMore}
          style={{ display: 'none' }}
          id="photo-upload-input"
        />
        <label
          htmlFor="photo-upload-input"
          style={{
            cursor: !canAddMore ? 'not-allowed' : 'pointer',
            display: 'block'
          }}
        >
          {uploadingPhotos ? (
            <div>
              <span className="loading-spinner-small-nightlife" style={{ marginRight: '10px' }} />
              {t('employee.uploadingPhotos')}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}><Camera size={40} /></div>
              <div style={{ color: 'rgba(255,255,255,0.8)' }}>
                {t('employee.clickToUpload')}
              </div>
              <div style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.5)',
                marginTop: '5px'
              }}>
                {t('employee.maxPhotosInfo', { max: maxPhotos })}
              </div>
            </div>
          )}
        </label>
      </div>

      {errors.photos && (
        <span className="error-text-nightlife" style={{ display: 'block', marginBottom: '10px' }}>
          <AlertTriangle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {errors.photos}
        </span>
      )}

      {/* Photo Preview Grid */}
      {(existingPhotoUrls.length > 0 || newPhotos.length > 0) && (
        <div
          className="photo-preview-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '10px'
          }}
        >
          {/* Existing Photos (URLs) */}
          {existingPhotoUrls.map((url, index) => (
            <PhotoPreviewItem
              key={`existing-${url}`}
              src={url}
              isMain={index === 0 && newPhotos.length === 0}
              onRemove={() => onExistingPhotoRemove(url)}
              t={t}
            />
          ))}

          {/* New Photos (Files) */}
          {newPhotos.map((file, index) => (
            <PhotoPreviewItem
              key={`new-${index}-${file.name}`}
              src={URL.createObjectURL(file)}
              isMain={existingPhotoUrls.length === 0 && index === 0}
              onRemove={() => onNewPhotoRemove(index)}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PhotoPreviewItemProps {
  src: string;
  isMain: boolean;
  onRemove: () => void;
  t: (key: string) => string;
}

function PhotoPreviewItem({ src, isMain, onRemove, t }: PhotoPreviewItemProps) {
  return (
    <div
      style={{
        position: 'relative',
        paddingBottom: '100%',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'rgba(0,0,0,0.3)'
      }}
    >
      <img
        src={src}
        alt=""
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
      <button
        type="button"
        onClick={onRemove}
        style={{
          position: 'absolute',
          top: '5px',
          right: '5px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'rgba(255,71,87,0.9)',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px'
        }}
        aria-label={t('employee.removePhoto')}
      >
        ×
      </button>
      {isMain && (
        <span
          style={{
            position: 'absolute',
            bottom: '5px',
            left: '5px',
            background: 'rgba(0,229,255,0.9)',
            color: 'black',
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          {t('employee.mainPhoto')}
        </span>
      )}
    </div>
  );
}

export default EmployeePhotoUpload;
