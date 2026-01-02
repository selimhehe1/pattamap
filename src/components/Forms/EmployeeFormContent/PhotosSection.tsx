import React from 'react';
import { Camera, FolderOpen, Sparkles, AlertTriangle } from 'lucide-react';
import LazyImage from '../../Common/LazyImage';
import type { PhotosSectionProps } from './types';

// Icon style helper
const iconStyle = { marginRight: '6px', verticalAlign: 'middle' as const };

/**
 * PhotosSection Component
 *
 * Form section for managing employee photos:
 * - Display existing photos with remove/restore functionality
 * - Upload new photos with preview
 * - Maximum 5 photos total
 */
const PhotosSection: React.FC<PhotosSectionProps> = ({
  photos,
  existingPhotos,
  photosToRemove,
  errors,
  onPhotoChange,
  onRemovePhoto,
  onRemoveExistingPhoto,
  onRestoreExistingPhoto
}) => {
  const keptExistingCount = existingPhotos.length - photosToRemove.length;
  const totalPhotos = keptExistingCount + photos.length;

  return (
    <div className="photo-management-container">
      <h3 className="photo-management-header">
        <Camera size={16} style={iconStyle} /> Photos Management
        <span className="photo-counter-badge">
          {totalPhotos}/5
        </span>
      </h3>

      {/* Existing Photos Section */}
      {existingPhotos.length > 0 && (
        <div className="photo-section">
          <h4 className="photo-section-title">
            <Camera size={14} style={iconStyle} /> Current Photos ({keptExistingCount} kept)
          </h4>

          <div className="photo-grid">
            {existingPhotos.map((photoUrl, index) => (
              <div
                key={`existing-${index}`}
                className={`photo-item existing ${photosToRemove.includes(photoUrl) ? 'marked-for-removal' : ''}`}
              >
                <LazyImage
                  src={photoUrl}
                  alt={`Existing ${index + 1}`}
                  objectFit="cover"
                />

                {photosToRemove.includes(photoUrl) ? (
                  <button
                    type="button"
                    onClick={() => onRestoreExistingPhoto(photoUrl)}
                    className="photo-restore-btn"
                    title="Restore photo"
                  >
                    ↶
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRemoveExistingPhoto(photoUrl)}
                    className="photo-remove-btn large"
                    title="Remove photo"
                  >
                    ×
                  </button>
                )}

                {photosToRemove.includes(photoUrl) && (
                  <div className="photo-status-label removal-warning">
                    WILL BE REMOVED
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Photos Section */}
      <div className="photo-section">
        <h4 className="photo-section-title">
          <FolderOpen size={14} style={iconStyle} /> Add New Photos
        </h4>

        <div className="photo-upload-zone">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={onPhotoChange}
            className="photo-upload-input"
          />
          <div className="photo-upload-text">
            <FolderOpen size={16} style={iconStyle} /> Click or drag photos here
          </div>
          <div className="photo-upload-subtext">
            JPG, PNG, GIF up to 10MB each
          </div>
        </div>

        {errors.photos && (
          <div style={{ color: '#FF4757', fontSize: '14px', marginBottom: '15px' }}>
            <AlertTriangle size={14} style={iconStyle} /> {errors.photos}
          </div>
        )}

        {photos.length > 0 && (
          <div>
            <h5 className="photo-section-subtitle">
              <Sparkles size={14} style={iconStyle} /> New Photos to Upload ({photos.length})
            </h5>
            <div className="photo-grid">
              {photos.map((photo, index) => (
                <div key={`new-${index}`} className="photo-item new-photo">
                  <LazyImage
                    src={URL.createObjectURL(photo)}
                    alt={`New ${index + 1}`}
                    objectFit="cover"
                  />
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(index)}
                    className="photo-remove-btn"
                  >
                    ×
                  </button>
                  <div className="photo-status-label new-badge">
                    NEW
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotosSection;
