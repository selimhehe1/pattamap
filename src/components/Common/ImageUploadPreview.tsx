import React, { useState, useEffect } from 'react';
import LazyImage from './LazyImage';

/**
 * ImageUploadPreview - File upload with immediate preview and validation
 *
 * Features:
 * - Instant preview of selected images
 * - Client-side validation (size, format)
 * - Progress indicator during upload
 * - Drag & drop support
 * - Multiple file selection
 * - Remove/reorder images
 *
 * @example
 * <ImageUploadPreview
 *   maxFiles={5}
 *   maxSizeMB={10}
 *   onFilesChange={(files) => setPhotos(files)}
 *   initialImages={employee.photos}
 * />
 */

interface ImageUploadPreviewProps {
  /** Maximum number of files */
  maxFiles?: number;
  /** Maximum file size in MB */
  maxSizeMB?: number;
  /** Accepted file types */
  acceptedTypes?: string[];
  /** Callback when files change */
  onFilesChange: (files: File[]) => void;
  /** Initial images (URLs) for edit mode */
  initialImages?: string[];
  /** Show upload progress */
  showProgress?: boolean;
  /** Custom label */
  label?: string;
  /** Is disabled */
  disabled?: boolean;
}

const ImageUploadPreview: React.FC<ImageUploadPreviewProps> = ({
  maxFiles = 5,
  maxSizeMB = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  onFilesChange,
  initialImages = [],
  showProgress = true,
  label = 'Upload Photos',
  disabled = false
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Create preview URLs from initial images
  useEffect(() => {
    if (initialImages.length > 0) {
      setPreviewUrls(initialImages);
    }
  }, [initialImages]);

  // Generate preview URLs when files change
  useEffect(() => {
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [
      ...prev.filter(url => url.startsWith('http')), // Keep initial URLs
      ...newPreviewUrls
    ]);

    // Cleanup object URLs on unmount
    return () => {
      newPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [files]);

  const validateFiles = (newFiles: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    // Check total count
    if (files.length + newFiles.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} images allowed`);
      return { valid, errors };
    }

    newFiles.forEach(file => {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Accepted: JPG, PNG, WebP`);
        return;
      }

      // Check file size
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        errors.push(`${file.name}: File too large (${sizeMB.toFixed(1)}MB). Max: ${maxSizeMB}MB`);
        return;
      }

      valid.push(file);
    });

    return { valid, errors };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const { valid, errors: validationErrors } = validateFiles(newFiles);

    setErrors(validationErrors);

    if (valid.length > 0) {
      const updatedFiles = [...files, ...valid];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);
    }

    // Reset input
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const { valid, errors: validationErrors } = validateFiles(droppedFiles);

    setErrors(validationErrors);

    if (valid.length > 0) {
      const updatedFiles = [...files, ...valid];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const removeImage = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);

    setFiles(newFiles);
    setPreviewUrls(newPreviews);
    onFilesChange(newFiles);
  };

  const totalImages = previewUrls.length;
  const canUploadMore = totalImages < maxFiles;

  return (
    <div className="image-upload-container">
      <label className="upload-label">{label}</label>

      {/* Upload Zone */}
      {canUploadMore && (
        <div
          className={`upload-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            id="image-upload-input"
            accept={acceptedTypes.join(',')}
            multiple
            onChange={handleFileSelect}
            disabled={disabled}
            style={{ display: 'none' }}
          />

          <label
            htmlFor="image-upload-input"
            className="upload-zone-label"
          >
            <div className="upload-icon">📷</div>
            <div className="upload-text">
              <strong>Click to upload</strong> or drag and drop
            </div>
            <div className="upload-hint">
              {acceptedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}
              {' '}(Max {maxSizeMB}MB each)
            </div>
            <div className="upload-counter">
              {totalImages}/{maxFiles} images
            </div>
          </label>
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="upload-errors">
          {errors.map((error, i) => (
            <div key={i} className="upload-error" role="alert">
              ⚠ {error}
            </div>
          ))}
        </div>
      )}

      {/* Preview Grid */}
      {previewUrls.length > 0 && (
        <div className="preview-grid">
          {previewUrls.map((url, index) => (
            <div key={`${url}-${index}`} className="preview-item">
              <LazyImage
                src={url}
                alt={`Preview ${index + 1}`}
                className="preview-image"
                cloudinaryPreset="galleryThumb"
                objectFit="cover"
              />

              <button
                type="button"
                className="preview-remove"
                onClick={() => removeImage(index)}
                aria-label={`Remove image ${index + 1}`}
                disabled={disabled}
              >
                ✕
              </button>

              <div className="preview-index">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        /* Container */
        .image-upload-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-bottom: 20px;
        }

        .upload-label {
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          font-weight: 600;
        }

        /* Upload Zone */
        .upload-zone {
          border: 2px dashed rgba(193, 154, 107, 0.4);
          border-radius: 12px;
          padding: 30px 20px;
          background: rgba(193, 154, 107, 0.05);
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .upload-zone:hover {
          border-color: rgba(193, 154, 107, 0.6);
          background: rgba(193, 154, 107, 0.1);
        }

        .upload-zone.dragging {
          border-color: #C19A6B;
          background: rgba(193, 154, 107, 0.15);
          transform: scale(1.02);
        }

        .upload-zone.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }

        .upload-zone-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .upload-icon {
          font-size: 48px;
          opacity: 0.7;
        }

        .upload-text {
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
        }

        .upload-text strong {
          color: #C19A6B;
          font-weight: 600;
        }

        .upload-hint {
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
        }

        .upload-counter {
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
          font-weight: 600;
          padding: 6px 12px;
          background: rgba(193, 154, 107, 0.2);
          border-radius: 20px;
        }

        /* Error Messages */
        .upload-errors {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .upload-error {
          background: rgba(255, 68, 68, 0.1);
          border: 1px solid rgba(255, 68, 68, 0.3);
          border-radius: 8px;
          padding: 10px 15px;
          color: #FF4444;
          font-size: 13px;
          animation: slideIn 0.3s ease-out;
        }

        /* Preview Grid */
        .preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 15px;
        }

        .preview-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid rgba(193, 154, 107, 0.3);
          transition: all 0.3s ease;
        }

        .preview-item:hover {
          border-color: rgba(193, 154, 107, 0.6);
          transform: scale(1.05);
          z-index: 10;
        }

        .preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-remove {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255, 68, 68, 0.9);
          border: 2px solid white;
          color: white;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          opacity: 0;
        }

        .preview-item:hover .preview-remove {
          opacity: 1;
        }

        .preview-remove:hover {
          background: rgba(255, 68, 68, 1);
          transform: scale(1.1);
        }

        .preview-index {
          position: absolute;
          bottom: 6px;
          left: 6px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(193, 154, 107, 0.9);
          color: white;
          font-size: 12px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Animations */
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Mobile Responsive */
        @media (max-width: 640px) {
          .upload-zone {
            padding: 20px 15px;
          }

          .upload-icon {
            font-size: 36px;
          }

          .upload-text {
            font-size: 13px;
            text-align: center;
          }

          .preview-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default ImageUploadPreview;
