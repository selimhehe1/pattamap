import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, AlertTriangle } from 'lucide-react';
import LazyImage from '../../Common/LazyImage';

interface PhotoUploadGridProps {
  /** Array of photo files */
  photos: File[];
  /** Callback when photos change */
  onChange: (photos: File[]) => void;
  /** Maximum number of photos allowed */
  maxPhotos?: number;
  /** Maximum file size in MB */
  maxFileSizeMB?: number;
  /** Error message to display */
  error?: string;
  /** Callback when error changes */
  onError?: (error: string) => void;
  /** Accent color for styling */
  accentColor?: string;
}

/**
 * Reusable photo upload grid component
 * Supports drag & drop, file validation, and preview grid
 */
const PhotoUploadGrid: React.FC<PhotoUploadGridProps> = ({
  photos,
  onChange,
  maxPhotos = 5,
  maxFileSizeMB = 10,
  error,
  onError,
  accentColor = '#00E5FF',
}) => {
  const { t } = useTranslation();

  // Generate preview URLs for photos
  const previews = useMemo(() => {
    return photos.map(photo => URL.createObjectURL(photo));
  }, [photos]);

  // Cleanup URLs when component unmounts or photos change
  React.useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length + photos.length > maxPhotos) {
      onError?.(t('register.photosMaxError'));
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        onError?.(t('register.photosTypeError'));
        return false;
      }
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        onError?.(t('register.photosSizeError'));
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      onChange([...photos, ...validFiles]);
      onError?.('');
    }

    // Reset input to allow selecting same file again
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* Upload Area */}
      <div
        className="photo-upload-area"
        style={{
          position: 'relative',
          padding: '30px',
          border: `2px dashed ${accentColor}80`,
          borderRadius: '12px',
          background: `${accentColor}0D`,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          style={{
            position: 'absolute',
            opacity: 0,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
            left: 0,
            top: 0,
          }}
        />
        <div
          style={{
            color: accentColor,
            fontSize: '18px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <FolderOpen size={18} /> {t('register.photosUploadArea')}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
          {t('register.photosUploadFormats')}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            color: '#C19A6B',
            fontSize: '14px',
            marginTop: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '12px',
            marginTop: '15px',
          }}
        >
          {photos.map((photo, index) => (
            <div key={index} style={{ position: 'relative' }}>
              <LazyImage
                src={previews[index]}
                alt={`Photo ${index + 1}`}
                style={{
                  width: '100%',
                  height: '120px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                }}
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  background: 'linear-gradient(45deg, #FF4757, #C19A6B)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '25px',
                  height: '25px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUploadGrid;
