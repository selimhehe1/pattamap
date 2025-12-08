import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';
import LazyImage from '../Common/LazyImage';

interface EstablishmentLogoProps {
  establishment: {
    id: string;
    name: string;
    logo_url?: string;
  };
  onLogoUpdated: (establishmentId: string, logoUrl: string) => void;
}

const EstablishmentLogo: React.FC<EstablishmentLogoProps> = ({
  establishment,
  onLogoUpdated
}) => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError(t('establishmentLogo.errorInvalidFileType'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('establishmentLogo.errorFileTooLarge'));
      return;
    }

    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Auto-upload
    uploadLogo(file);
  };

  const uploadLogo = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      // Step 1: Upload logo to Cloudinary
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload/establishment-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error(t('establishmentLogo.errorUploadFailed'));
      }

      const uploadResult = await uploadResponse.json();
      const logoUrl = uploadResult.logo.url;

      // Step 2: Update establishment with logo URL
      const updateResponse = await fetch(`/api/establishments/${establishment.id}/logo`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ logo_url: logoUrl })
      });

      if (!updateResponse.ok) {
        throw new Error(t('establishmentLogo.errorUpdateFailed'));
      }

      await updateResponse.json(); // Consume response

      // Notify parent component
      onLogoUpdated(establishment.id, logoUrl);

      logger.debug('✅ Logo uploaded successfully:', logoUrl);

    } catch (error) {
      logger.error('Logo upload error:', error);
      setError(error instanceof Error ? error.message : t('establishmentLogo.errorUploadFailed'));
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!establishment.logo_url) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch(`/api/establishments/${establishment.id}/logo`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ logo_url: null })
      });

      if (!response.ok) {
        throw new Error(t('establishmentLogo.errorRemoveFailed'));
      }

      onLogoUpdated(establishment.id, '');
      setPreviewUrl(null);

    } catch (error) {
      logger.error('Remove logo error:', error);
      setError(error instanceof Error ? error.message : t('establishmentLogo.errorRemoveFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const currentLogoUrl = previewUrl || establishment.logo_url;

  return (
    <div style={{
      padding: '15px',
      background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
      borderRadius: '12px',
      border: '1px solid rgba(193, 154, 107,0.3)',
      marginBottom: '15px'
    }}>
      {/* Establishment Name */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{
          color: '#C19A6B',
          fontSize: '16px',
          fontWeight: 'bold',
          margin: 0,
          flex: 1
        }}>
          {establishment.name}
        </h3>

        {/* Current Logo Preview */}
        {currentLogoUrl && (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, white 45%, transparent 60%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: '10px',
            overflow: 'hidden'
          }}>
            <LazyImage
              src={currentLogoUrl}
              alt={`${establishment.name} logo`}
              cloudinaryPreset="establishmentLogo"
              objectFit="contain"
              style={{
                width: '70%',
                height: '70%',
                borderRadius: '50%'
              }}
            />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          color: '#FF4757',
          fontSize: '14px',
          marginBottom: '10px',
          padding: '8px',
          background: 'rgba(255,71,87,0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(255,71,87,0.3)'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          style={{
            padding: '8px 15px',
            background: isUploading ? '#666' : 'linear-gradient(45deg, #C19A6B, #00E5FF)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease'
          }}
        >
          {isUploading ? `⏳ ${t('establishmentLogo.buttonUploading')}` : currentLogoUrl ? `🔄 ${t('establishmentLogo.buttonChangeLogo')}` : `📷 ${t('establishmentLogo.buttonAddLogo')}`}
        </button>

        {/* Remove Button */}
        {currentLogoUrl && (
          <button
            onClick={handleRemoveLogo}
            disabled={isUploading}
            style={{
              padding: '8px 15px',
              background: isUploading ? '#666' : '#FF4757',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease'
            }}
          >
            🗑️ {t('establishmentLogo.buttonRemove')}
          </button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Upload Instructions */}
      <div style={{
        color: '#999',
        fontSize: '12px',
        marginTop: '10px',
        lineHeight: '1.4'
      }}>
        💡 {t('establishmentLogo.recommendationText')}
      </div>
    </div>
  );
};

export default EstablishmentLogo;