import React from 'react';
import { EstablishmentCategory } from '../../../types';
import { ZONE_OPTIONS } from '../../../utils/constants';
import { logger } from '../../../utils/logger';

interface BasicInfoFormProps {
  formData: {
    name: string;
    address: string;
    zone: string;
    category_id: string;
    description: string;
    phone: string;
    website: string;
    logo_url?: string;
  };
  categories: EstablishmentCategory[];
  errors: Record<string, string>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  // Logo upload props
  logoFile: File | null;
  onLogoChange: (file: File | null) => void;
  uploadingLogo: boolean;
}

// Zones are now imported from constants.ts for consistency

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({
  formData,
  categories,
  errors,
  onChange,
  logoFile,
  onLogoChange,
  uploadingLogo
}) => {
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Enhanced validation
      if (!file.type.startsWith('image/')) {
        alert('🖼️ Please select an image file (JPG, PNG, GIF)');
        return;
      }

      // More restrictive file size for logos (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        alert(`🚨 Logo file too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Please use an image under 2MB.`);
        return;
      }

      // Check image dimensions (optional - provide feedback)
      const img = new Image();
      img.onload = () => {
        logger.debug(`🖼️ Logo dimensions: ${img.width}x${img.height}px`);
        if (img.width > 512 || img.height > 512) {
          logger.warn('⚠️ Logo is quite large, consider resizing for better performance');
        }
      };
      img.src = URL.createObjectURL(file);
    }
    onLogoChange(file);
  };

  const removeLogo = () => {
    if (window.confirm('🗑️ Are you sure you want to remove the logo?')) {
      onLogoChange(null);
      logger.debug('🗑️ Logo removed');
    }
  };

  return (
    <div className="form-section">
      <h3 className="text-cyan-nightlife" style={{
        fontSize: '15px',
        margin: '0 0 12px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        📍 Basic Information
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <label className="label-nightlife">
            🏪 Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={onChange}
            className="input-nightlife"
            style={{
              ...(errors.name && { borderColor: '#FF4757' })
            }}
            placeholder="Ex: Ruby Club"
          />
          {errors.name && (
            <div className="error-message-nightlife">
              ⚠️ {errors.name}
            </div>
          )}
        </div>

        <div>
          <label className="label-nightlife">
            📍 Zone *
          </label>
          <select
            name="zone"
            value={formData.zone}
            onChange={onChange}
            className="select-nightlife"
            style={{
              ...(errors.zone && { borderColor: '#FF4757' })
            }}
          >
            <option value="">Sélectionnez une zone</option>
            {ZONE_OPTIONS.map(zone => (
              <option key={zone.value} value={zone.value}>{zone.label}</option>
            ))}
          </select>
          {errors.zone && (
            <div className="error-message-nightlife">
              ⚠️ {errors.zone}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label className="label-nightlife">
          📍 Address *
        </label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={onChange}
          className="input-nightlife"
          style={{
            ...(errors.address && { borderColor: '#FF4757' })
          }}
          placeholder="Ex: Soi 6, North Pattaya"
        />
        {errors.address && (
          <div className="error-message-nightlife">
            ⚠️ {errors.address}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label className="label-nightlife">
          🏷️ Category *
        </label>
        <select
          name="category_id"
          value={formData.category_id}
          onChange={onChange}
          className="select-nightlife"
          style={{
            ...(errors.category_id && { borderColor: '#FF4757' })
          }}
        >
          <option value="">Select category</option>
          {categories.map(category => (
            <option key={category.id} value={category.id.toString()}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
        {errors.category_id && (
          <div className="error-message-nightlife">
            ⚠️ {errors.category_id}
          </div>
        )}
      </div>

      {/* Logo Upload Section */}
      <div className="logo-upload-section-nightlife">
        <label className="label-nightlife">
          🖼️ Logo
        </label>

        {/* Logo Preview or Upload Zone */}
        {(formData.logo_url || logoFile) ? (
          /* Logo Preview - Clickable to change */
          <div style={{
            position: 'relative',
            display: 'inline-block',
            marginBottom: '10px'
          }}>
            <div
              onClick={() => {
                if (!uploadingLogo) {
                  const fileInput = document.getElementById('basic-logo-upload') as HTMLInputElement;
                  if (fileInput) fileInput.click();
                }
              }}
              className="logo-preview-container-nightlife"
              style={{
                position: 'relative',
                width: '120px',
                height: '120px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid #00FFFF',
                boxShadow: '0 4px 12px rgba(0,255,255,0.3)',
                cursor: uploadingLogo ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!uploadingLogo) {
                  const overlay = e.currentTarget.querySelector('.logo-hover-overlay') as HTMLElement;
                  if (overlay) overlay.style.opacity = '1';
                }
              }}
              onMouseLeave={(e) => {
                const overlay = e.currentTarget.querySelector('.logo-hover-overlay') as HTMLElement;
                if (overlay) overlay.style.opacity = '0';
              }}
            >
              <img
                src={logoFile ? URL.createObjectURL(logoFile) : formData.logo_url}
                alt="Logo preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  logger.warn('Logo preview failed to load:', e.currentTarget.src);
                  e.currentTarget.style.display = 'none';
                }}
                onLoad={(e) => {
                  logger.debug('✅ Logo preview loaded successfully');
                }}
              />

              {/* Hover Overlay */}
              {!uploadingLogo && (
                <div
                  className="logo-hover-overlay"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none'
                  }}
                >
                  <div style={{
                    color: '#00FFFF',
                    fontSize: '13px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    📸<br/>Click to<br/>change
                  </div>
                </div>
              )}

              {/* Uploading Spinner */}
              {uploadingLogo && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00FFFF',
                  fontSize: '24px'
                }}>
                  ⏳
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              id="basic-logo-upload"
              type="file"
              accept="image/*"
              onChange={handleLogoFileChange}
              disabled={uploadingLogo}
              style={{ display: 'none' }}
            />

            {/* Remove Icon - Only if logo exists - Outside clickable area */}
            {!uploadingLogo && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeLogo();
                }}
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #F44336, #D32F2F)',
                  border: '2px solid white',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  zIndex: 10,
                  boxShadow: '0 2px 8px rgba(244,67,54,0.4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.15)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(244,67,54,0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(244,67,54,0.4)';
                }}
              >
                ✕
              </button>
            )}

            {/* File info */}
            <div style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.6)',
              marginTop: '8px',
              textAlign: 'center'
            }}>
              {logoFile ? `📁 ${logoFile.name} (${(logoFile.size / 1024 / 1024).toFixed(2)} MB)` : 'Click to change logo'}
            </div>
          </div>
        ) : (
          /* Upload Zone - When no logo */
          <label style={{
            display: 'block',
            padding: '30px 20px',
            border: '2px dashed #00FFFF',
            borderRadius: '12px',
            background: 'rgba(0,255,255,0.05)',
            textAlign: 'center',
            cursor: uploadingLogo ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            marginBottom: '10px'
          }}
          onMouseEnter={(e) => {
            if (!uploadingLogo) {
              e.currentTarget.style.background = 'rgba(0,255,255,0.1)';
              e.currentTarget.style.borderColor = '#00D4AA';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0,255,255,0.05)';
            e.currentTarget.style.borderColor = '#00FFFF';
          }}
          >
            <div style={{
              fontSize: '40px',
              marginBottom: '10px'
            }}>
              {uploadingLogo ? '⏳' : '🖼️'}
            </div>
            <div style={{
              color: '#00FFFF',
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '8px'
            }}>
              {uploadingLogo ? 'Uploading logo...' : 'Click to upload logo'}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '13px'
            }}>
              JPG, PNG, GIF up to 2MB
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoFileChange}
              disabled={uploadingLogo}
              style={{ display: 'none' }}
            />
          </label>
        )}

        <div className="logo-upload-help-nightlife">
          📏 Recommended: 200x200px square, max 2MB (JPG, PNG, GIF)<br/>
          🔄 Will be automatically optimized to 64x64px for maps
        </div>

        {errors.logo_url && (
          <div className="error-message-nightlife">
            ⚠️ {errors.logo_url}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label className="label-nightlife">
          📄 Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={onChange}
          rows={3}
          className="textarea-nightlife"
          placeholder="Describe the establishment..."
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label className="label-nightlife">
            📱 Phone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={onChange}
            className="input-nightlife"
            placeholder="Ex: +66 123 456 789"
          />
        </div>

        <div>
          <label className="label-nightlife">
            🌐 Website
          </label>
          <input
            type="url"
            name="website"
            value={formData.website}
            onChange={onChange}
            className="input-nightlife"
            placeholder="https://..."
          />
        </div>
      </div>
    </div>
  );
};

export default BasicInfoForm;