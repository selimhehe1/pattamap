import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Store, Tag, Image as ImageIcon, Camera, RefreshCw, AlertTriangle, Loader2, Beer, Music, Sparkles, Heart, ChevronDown, Check } from 'lucide-react';
import { EstablishmentCategory } from '../../../types';
import { ZONE_OPTIONS } from '../../../utils/constants';
import { logger } from '../../../utils/logger';
import notification from '../../../utils/notification';
import LazyImage from '../../Common/LazyImage';
import '../../../styles/components/modals.css';

// Map category to Lucide icon component
const getCategoryIcon = (categoryName: string): React.ReactNode => {
  const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
    'bar': { icon: <Beer size={16} />, color: '#ff6b35' },
    'gogo bar': { icon: <Sparkles size={16} />, color: '#ff006e' },
    'massage salon': { icon: <Heart size={16} />, color: '#06ffa5' },
    'nightclub': { icon: <Music size={16} />, color: '#7b2cbf' },
  };
  const config = iconMap[categoryName.toLowerCase()];
  if (config) {
    return <span style={{ color: config.color, display: 'inline-flex' }}>{config.icon}</span>;
  }
  return <Tag size={16} style={{ color: '#888' }} />;
};

interface BasicInfoFormProps {
  formData: {
    name: string;
    address: string;
    zone: string;
    category_id: string | number;
    description: string;
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
  const { t } = useTranslation();
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    if (isCategoryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoryOpen]);

  const selectedCategory = categories.find(c => c.id.toString() === String(formData.category_id));

  const handleCategorySelect = (categoryId: string) => {
    onChange({
      target: { name: 'category_id', value: categoryId }
    } as React.ChangeEvent<HTMLSelectElement>);
    setIsCategoryOpen(false);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Enhanced validation
      if (!file.type.startsWith('image/')) {
        notification.error(t('establishment.basicInfo.logoErrorType'));
        return;
      }

      // More restrictive file size for logos (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        notification.error(t('establishment.basicInfo.logoErrorSize', { size: (file.size / 1024 / 1024).toFixed(2) }));
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
    if (window.confirm(`🗑️ ${t('establishment.basicInfo.logoRemoveConfirm')}`)) {
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
        <MapPin size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('establishment.basicInfo.sectionTitle')}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <label className="label-nightlife">
            <Store size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('establishment.basicInfo.nameLabel')} *
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
            placeholder={t('establishment.basicInfo.namePlaceholder')}
          />
          {errors.name && (
            <div className="error-message-nightlife">
              <AlertTriangle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {errors.name}
            </div>
          )}
        </div>

        <div>
          <label className="label-nightlife">
            <MapPin size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('establishment.basicInfo.zoneLabel')} *
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
            <option value="">{t('establishment.basicInfo.selectZonePlaceholder')}</option>
            {ZONE_OPTIONS.map(zone => (
              <option key={zone.value} value={zone.value}>{zone.label}</option>
            ))}
          </select>
          {errors.zone && (
            <div className="error-message-nightlife">
              <AlertTriangle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {errors.zone}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label className="label-nightlife">
          <MapPin size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('establishment.basicInfo.addressLabel')} *
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
          placeholder={t('establishment.basicInfo.addressPlaceholder')}
        />
        {errors.address && (
          <div className="error-message-nightlife">
            <AlertTriangle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {errors.address}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label className="label-nightlife">
          <Tag size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('establishment.basicInfo.categoryLabel')} *
        </label>
        {/* Custom Category Dropdown with Lucide Icons */}
        <div ref={categoryDropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className="select-nightlife"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              textAlign: 'left',
              ...(errors.category_id && { borderColor: '#FF4757' })
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedCategory ? (
                <>
                  {getCategoryIcon(selectedCategory.name)}
                  <span>{selectedCategory.name}</span>
                </>
              ) : (
                <span style={{ color: '#888' }}>{t('establishment.basicInfo.selectCategoryPlaceholder')}</span>
              )}
            </span>
            <ChevronDown
              size={18}
              style={{
                transition: 'transform 0.2s',
                transform: isCategoryOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                color: '#E879F9'
              }}
            />
          </button>

          {isCategoryOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: 'rgba(0, 0, 0, 0.95)',
              border: '2px solid rgba(232, 121, 249, 0.4)',
              borderRadius: '12px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 100,
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
            }}>
              {categories.map(category => {
                const isSelected = category.id.toString() === String(formData.category_id);
                return (
                  <div
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id.toString())}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      background: isSelected ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.2s ease',
                      color: isSelected ? '#00E5FF' : '#ffffff',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getCategoryIcon(category.name)}
                      <span>{category.name}</span>
                    </span>
                    {isSelected && <Check size={16} style={{ color: '#00E5FF' }} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {errors.category_id && (
          <div className="error-message-nightlife">
            <AlertTriangle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {errors.category_id}
          </div>
        )}
      </div>

      {/* Logo Upload Section */}
      <div className="logo-upload-section-nightlife">
        <label className="label-nightlife">
          <ImageIcon size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('establishment.basicInfo.logoLabel')}
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
              role="button" tabIndex={0} onClick={() => {
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
                border: '2px solid #00E5FF',
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
              <LazyImage
                src={logoFile ? URL.createObjectURL(logoFile) : (formData.logo_url || '')}
                alt="Logo preview"
                style={{
                  width: '100%',
                  height: '100%'
                }}
                objectFit="cover"
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
                    color: '#00E5FF',
                    fontSize: '13px',
                    fontWeight: '600',
                    textAlign: 'center',
                    lineHeight: '1.3'
                  }}>
                    <Camera size={16} /><br/>{t('establishment.basicInfo.logoClickToChange')}
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
                  color: '#00E5FF',
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
              {logoFile ? `📁 ${logoFile.name} (${(logoFile.size / 1024 / 1024).toFixed(2)} MB)` : t('establishment.basicInfo.logoClickToChangeFull')}
            </div>
          </div>
        ) : (
          /* Upload Zone - When no logo */
          <label style={{
            display: 'block',
            padding: '30px 20px',
            border: '2px dashed #00E5FF',
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
            e.currentTarget.style.borderColor = '#00E5FF';
          }}
          >
            <div style={{
              fontSize: '40px',
              marginBottom: '10px'
            }}>
              {uploadingLogo ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ImageIcon size={16} />}
            </div>
            <div style={{
              color: '#00E5FF',
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '8px'
            }}>
              {uploadingLogo ? t('establishment.basicInfo.logoUploading') : t('establishment.basicInfo.logoClickToUpload')}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '13px'
            }}>
              {t('establishment.basicInfo.logoFormats')}
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
          📏 {t('establishment.basicInfo.logoRecommendation')}<br/>
          <RefreshCw size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('establishment.basicInfo.logoOptimizationNote')}
        </div>

        {errors.logo_url && (
          <div className="error-message-nightlife">
            <AlertTriangle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {errors.logo_url}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label className="label-nightlife">
          📄 {t('establishment.basicInfo.descriptionLabel')}
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={onChange}
          rows={3}
          className="textarea-nightlife"
          placeholder={t('establishment.basicInfo.descriptionPlaceholder')}
        />
      </div>
    </div>
  );
};

export default BasicInfoForm;