import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useCSRF } from '../../contexts/CSRFContext';
import { useAutoSave } from '../../hooks/useAutoSave';
import { Establishment, Employee, CloudinaryUploadResponse } from '../../types';
import { logger } from '../../utils/logger';
import LazyImage from '../Common/LazyImage';
import NationalityTagsInput from './NationalityTagsInput';
import '../../styles/components/modal-forms.css';
import '../../styles/components/photos.css';
import '../../styles/utilities/layout-utilities.css';
import '../../styles/components/form-components.css';

// Internal form state for social media (using abbreviations)
interface FormSocialMedia {
  ig: string;
  fb: string;
  line: string;
  tg: string;
  wa: string;
}

// Internal form data type
interface InternalFormData {
  name: string;
  nickname: string;
  age: string;
  nationality: string[] | null;
  description: string;
  social_media: FormSocialMedia;
  current_establishment_id: string;
}

// Extended form data type for submission
interface EmployeeSubmitData {
  name: string;
  nickname?: string;
  age?: number;
  nationality?: string[] | null;
  description?: string;
  photos: string[];
  social_media?: Record<string, string>;
  current_establishment_id?: string;
  is_freelance?: boolean;
}

interface EmployeeFormProps {
  onSubmit: (employeeData: EmployeeSubmitData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<Employee> & { current_establishment_id?: string };
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ onSubmit, onCancel, isLoading = false, initialData }) => {
  const { t } = useTranslation();
  const { secureFetch } = useSecureFetch();
  const { refreshToken } = useCSRF();
  const [formData, setFormData] = useState<InternalFormData>({
    name: initialData?.name || '',
    nickname: initialData?.nickname || '',
    age: initialData?.age?.toString() || '',
    nationality: initialData?.nationality || null,
    description: initialData?.description || '',
    social_media: {
      ig: initialData?.social_media?.instagram || '',
      fb: initialData?.social_media?.facebook || '',
      line: initialData?.social_media?.line || '',
      tg: initialData?.social_media?.telegram || '',
      wa: initialData?.social_media?.whatsapp || ''
    },
    // Extract current_establishment_id from current_employment array if exists
    current_establishment_id: initialData?.current_employment?.[0]?.establishment_id || initialData?.current_establishment_id || ''
  });

  const [isFreelanceMode, setIsFreelanceMode] = useState(initialData?.is_freelance || false);

  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>(initialData?.photos || []);
  const [_photosToRemove, setPhotosToRemove] = useState<string[]>([]); // Track URLs to delete
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 🏢 Establishment autocomplete state
  const [establishmentSearch, setEstablishmentSearch] = useState('');
  const [showEstablishmentSuggestions, setShowEstablishmentSuggestions] = useState(false);
  const establishmentInputRef = React.useRef<HTMLInputElement>(null);

  // 💾 Auto-save hook - Saves draft every 2 seconds after typing stops
  const { isDraft, clearDraft, restoreDraft, lastSaved, isSaving } = useAutoSave({
    key: initialData ? `employee-form-edit-${initialData.id}` : 'employee-form-new',
    data: formData,
    debounceMs: 2000,
    enabled: !isLoading, // Disable during form submission
  });

  // 🎯 Gestion du scroll du body quand le modal est ouvert
  useEffect(() => {
    document.body.classList.add('modal-open');

    // Nettoyage au démontage
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  // 💾 Restore draft on mount if exists
  useEffect(() => {
    if (!initialData && isDraft) {
      const draft = restoreDraft();
      if (draft) {
        setFormData(draft);
        logger.info('📥 Draft restored from localStorage');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  useEffect(() => {
    const fetchEstablishments = async () => {
      try {
        const isAdminContext = window.location.pathname.includes('admin');

        const endpoint = isAdminContext
          ? `${import.meta.env.VITE_API_URL}/api/admin/establishments`
          : `${import.meta.env.VITE_API_URL}/api/establishments`;

        const response = await secureFetch(endpoint);
        const data = await response.json();

        setEstablishments(data.establishments || []);
      } catch (error) {
        logger.error('Error fetching establishments:', error);
      }
    };
    fetchEstablishments();
  }, [secureFetch]);

  // 🏢 Filter establishments by search query and group by zone
  // 🆕 v10.3 - Filter nightclubs only if in freelance mode
  const filterEstablishmentsByQuery = (query: string, onlyNightclubs = false) => {
    const zoneNames: Record<string, string> = {
      soi6: 'Soi 6',
      walkingstreet: 'Walking Street',
      beachroad: 'Beach Road',
      lkmetro: 'LK Metro',
      treetown: 'Tree Town',
      soibuakhao: 'Soi Buakhao'
    };

    // Filter establishments with zone only
    let filtered = establishments.filter(est => est.zone);

    // 🆕 v10.3 - If freelance mode, show only nightclubs
    if (onlyNightclubs) {
      filtered = filtered.filter(est =>
        est.category?.name?.toLowerCase() === 'nightclub'
      );
    }

    // Apply search filter if query exists
    if (query.trim().length > 0) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(est =>
        est.name.toLowerCase().includes(lowerQuery)
      );
    }

    // Group by zone
    const groupedByZone = filtered.reduce((acc, est) => {
      const zone = est.zone || 'other';
      if (!acc[zone]) acc[zone] = [];
      acc[zone].push(est);
      return acc;
    }, {} as Record<string, typeof filtered>);

    // Sort each group alphabetically
    Object.keys(groupedByZone).forEach(zone => {
      groupedByZone[zone].sort((a, b) => a.name.localeCompare(b.name));
    });

    // Sort zones alphabetically
    const sortedZones = Object.keys(groupedByZone).sort((a, b) =>
      (zoneNames[a] || a).localeCompare(zoneNames[b] || b)
    );

    return { groupedByZone, sortedZones, zoneNames };
  };

  // 🏢 Sync establishment search input with selected establishment
  useEffect(() => {
    if (formData.current_establishment_id) {
      const selectedEst = establishments.find(
        est => est.id === formData.current_establishment_id
      );
      if (selectedEst) {
        setEstablishmentSearch(selectedEst.name);
      }
    } else {
      setEstablishmentSearch('');
    }
  }, [formData.current_establishment_id, establishments]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('social_media.')) {
      const socialField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        social_media: {
          ...prev.social_media,
          [socialField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Check total photos (existing + new) doesn't exceed 5
    if (files.length + photos.length + existingPhotoUrls.length > 5) {
      setErrors(prev => ({ ...prev, photos: t('employee.errorPhotosMax') }));
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, photos: t('employee.errorPhotosType') }));
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        setErrors(prev => ({ ...prev, photos: t('employee.errorPhotosSize') }));
        return false;
      }
      return true;
    });

    setPhotos(prev => [...prev, ...validFiles]);
    setErrors(prev => ({ ...prev, photos: '' }));
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (photoUrl: string) => {
    setExistingPhotoUrls(prev => prev.filter(url => url !== photoUrl));
    setPhotosToRemove(prev => [...prev, photoUrl]);
  };

  const uploadPhotos = async () => {
    if (photos.length === 0) return [];

    setUploadingPhotos(true);
    try {
      // 🛡️ Refresh CSRF token before upload to ensure it's fresh
      logger.debug('🛡️ Refreshing CSRF token before photo upload...');
      await refreshToken();
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for token to be stored

      const formData = new FormData();
      photos.forEach(photo => {
        formData.append('images', photo);
      });

      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/upload/images`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload photos');
      }

      return (data as CloudinaryUploadResponse).images.map((img) => img.url);
    } catch (error) {
      logger.error('Photo upload error:', error);
      throw error;
    } finally {
      setUploadingPhotos(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = t('employee.errorNameRequired');
    if (formData.age && (parseInt(formData.age) < 18 || parseInt(formData.age) > 80)) {
      newErrors.age = t('employee.errorAgeRange');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      // Upload new photos if any
      const newUploadedUrls = photos.length > 0 ? await uploadPhotos() : [];

      // Combine existing photos (minus removed ones) + newly uploaded photos
      const finalPhotoUrls = [...existingPhotoUrls, ...newUploadedUrls];

      // Map abbreviations to full names for API
      const socialMediaMap: Record<string, string> = {
        ig: 'instagram',
        fb: 'facebook',
        line: 'line',
        tg: 'telegram',
        wa: 'whatsapp'
      };

      const mappedSocialMedia: Record<string, string> = {};
      Object.entries(formData.social_media).forEach(([key, value]) => {
        if (value.trim() !== '') {
          mappedSocialMedia[socialMediaMap[key] || key] = value;
        }
      });

      const employeeData: EmployeeSubmitData = {
        name: formData.name,
        nickname: formData.nickname || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        nationality: formData.nationality,
        description: formData.description || undefined,
        photos: finalPhotoUrls,
        social_media: Object.keys(mappedSocialMedia).length > 0 ? mappedSocialMedia : undefined,
        current_establishment_id: formData.current_establishment_id || undefined
      };

      // 🆕 v10.3 - New freelance logic (migration 013)
      // Freelances can be associated with nightclubs via employment_history
      employeeData.is_freelance = isFreelanceMode;

      // If freelance with no establishment = free freelance
      if (isFreelanceMode && !employeeData.current_establishment_id) {
        delete employeeData.current_establishment_id;
      }

      await onSubmit(employeeData);

      // ✅ Clear draft after successful submission
      clearDraft();
      logger.info('🗑️ Draft cleared after successful submission');
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        submit: error instanceof Error ? error.message : 'Failed to submit form'
      }));
    }
  };

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      zIndex: 900,
      animation: 'fadeIn 0.5s ease-out',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px'
    }} role="dialog" aria-modal="true">
      <div className="modal-form-container">
          {/* Bouton fermeture sur la card */}
          <button
            onClick={onCancel}
            className="modal-close-button"
          >
            ✕
          </button>

        <div className="modal-header">
          <h2 className="header-title-nightlife">
            {initialData ? `✏️ ${t('employee.editTitle')}` : `👥 ${t('employee.addTitle')}`}
          </h2>
          <p className="modal-subtitle">
            {initialData ? t('employee.editSubtitle') : t('employee.createSubtitle')}
          </p>

          {/* Auto-save indicator */}
          {!initialData && (
            <div style={{
              fontSize: '0.75rem',
              color: isSaving ? '#00E5FF' : isDraft ? '#4ADE80' : '#6B7280',
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem'
            }}>
              {isSaving ? (
                <>⏳ {t('employee.savingDraft')}</>
              ) : isDraft && lastSaved ? (
                <>
                  ✓ {t('employee.draftSavedAt', { time: new Date(lastSaved).toLocaleTimeString() })}
                </>
              ) : (
                <>💾 {t('employee.autoSaveEnabled')}</>
              )}
            </div>
          )}
        </div>
      
        <form onSubmit={handleSubmit} className="form-layout">
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="text-cyan-nightlife" style={{
              margin: '0 0 12px 0',
              fontSize: '15px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              📝 {t('employee.basicInformation')}
            </h3>

            <div className="form-input-group">
              <label className="label-nightlife">
                👤 {t('employee.nameRequired')}
              </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input-nightlife"
                  placeholder={t('employee.namePlaceholder')}
                />
                {errors.name && (
                  <div className="error-message-nightlife">
                    ⚠️ {errors.name}
                  </div>
                )}
              </div>

              <div className="form-input-group-lg">
                <label className="label-nightlife">
                  🎭 {t('employee.nicknameLabel')}
                </label>
                <input
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleInputChange}
                  className="input-nightlife"
                  placeholder={t('employee.nicknamePlaceholder')}
                />
              </div>

              <div className="form-row-2-cols">
                <div>
                  <label className="label-nightlife">
                    🎂 {t('employee.ageLabel')}
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    className="input-nightlife"
                    min="18"
                    max="80"
                    placeholder={t('employee.agePlaceholder')}
                  />
                  {errors.age && (
                    <div className="error-message-nightlife">
                      ⚠️ {errors.age}
                    </div>
                  )}
                </div>

                <div>
                  <label className="label-nightlife">
                    🌍 {t('employee.nationalityLabel')}
                  </label>
                  <NationalityTagsInput
                    value={formData.nationality}
                    onChange={(nationalities) => {
                      setFormData(prev => ({ ...prev, nationality: nationalities }));
                    }}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="form-input-group">
                <label className="label-nightlife">
                  📝 {t('employee.descriptionLabel')}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="textarea-nightlife"
                  placeholder={t('employee.descriptionPlaceholder')}
                />
              </div>
          </div>

          {/* Photos */}
          <div className="form-section">
            <h3 className="text-cyan-nightlife" style={{
              margin: '0 0 15px 0',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {t('employee.photosTitle')}
            </h3>

            <div className="photo-upload-area" style={{ position: 'relative' }}>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoChange}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 1
                }}
              />
              <div className="text-cyan-nightlife" style={{
                fontSize: '18px',
                marginBottom: '10px'
              }}>
                📁 {t('employee.photosUploadArea')}
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '14px'
              }}>
                {t('employee.photosUploadFormats')}
              </div>
            </div>
            
            {errors.photos && (
              <div className="error-message-nightlife" style={{
                fontSize: '14px',
                marginBottom: '15px'
              }}>
                ⚠️ {errors.photos}
              </div>
            )}

            {/* Existing Photos (from database) */}
            {existingPhotoUrls.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{
                  color: '#00E5FF',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '10px'
                }}>
                  📷 {t('employee.currentPhotos', { count: existingPhotoUrls.length })}
                </h4>
                <div className="photo-preview-grid">
                  {existingPhotoUrls.map((photoUrl, index) => (
                    <div key={`existing-${index}`} className="photo-preview-item">
                      <LazyImage
                        src={photoUrl}
                        alt={`Existing photo ${index + 1} of ${formData.name || 'employee'}`}
                        className="photo-preview-image"
                        objectFit="cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingPhoto(photoUrl)}
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
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                          e.currentTarget.style.boxShadow = '0 0 15px rgba(255,71,87,0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Photos (to be uploaded) */}
            {photos.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{
                  color: '#C19A6B',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '10px'
                }}>
                  ➕ {t('employee.newPhotos', { count: photos.length })}
                </h4>
                <div className="photo-preview-grid">
                  {photos.map((photo, index) => (
                    <div key={`new-${index}`} className="photo-preview-item">
                      <LazyImage
                        src={URL.createObjectURL(photo)}
                        alt={`Photo preview ${index + 1} of employee ${formData.name || 'new employee'}`}
                        className="photo-preview-image"
                        objectFit="cover"
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
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                          e.currentTarget.style.boxShadow = '0 0 15px rgba(255,71,87,0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Freelance Mode Toggle - v10.3 */}
          <div className="form-section">
            <h3 className="text-cyan-nightlife" style={{
              margin: '0 0 15px 0',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              👯 {t('employee.employmentMode')}
            </h3>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '15px',
              background: 'rgba(157, 78, 221, 0.1)',
              border: '2px solid rgba(157, 78, 221, 0.3)',
              borderRadius: '12px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '500'
                }}>
                  <input
                    type="checkbox"
                    checked={isFreelanceMode}
                    onChange={(e) => {
                      setIsFreelanceMode(e.target.checked);
                      if (!e.target.checked) {
                        // Clear establishment when switching back to regular
                        setFormData(prev => ({ ...prev, current_establishment_id: '' }));
                      }
                    }}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer'
                    }}
                  />
                  <span>💃 {t('employee.freelanceMode')}</span>
                </label>
                {isFreelanceMode && (
                  <span style={{
                    background: 'linear-gradient(45deg, #9D4EDD, #C77DFF)',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {t('employee.freelanceModeActive')}
                  </span>
                )}
              </div>

              {/* Info about new freelance logic */}
              <div style={{
                padding: '10px',
                background: 'rgba(157, 78, 221, 0.15)',
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '13px',
                lineHeight: '1.6'
              }}>
                {isFreelanceMode ? (
                  <>
                    <strong style={{ color: '#C77DFF' }}>🌙 Nightclub Freelance:</strong>
                    <br />
                    • Can work in multiple nightclubs simultaneously
                    <br />
                    • Leave establishment empty for "free freelance"
                    <br />
                    • Select nightclub below to associate
                  </>
                ) : (
                  <>
                    <strong style={{ color: '#00E5FF' }}>🏢 Regular Employee:</strong>
                    <br />
                    • Works at one establishment (any type)
                    <br />
                    • Select establishment below (optional)
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Current Employment / Associated Nightclubs - v10.3 */}
          <div className="form-section">
            <h3 className="text-cyan-nightlife" style={{
              margin: '0 0 15px 0',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {isFreelanceMode ? (
                <>🌙 Associated Nightclubs <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'rgba(255,255,255,0.6)' }}>(Optional)</span></>
              ) : (
                <>🏢 {t('employee.currentEmployment')}</>
              )}
            </h3>

              <div className="form-input-group-lg">
                <label className="label-nightlife">
                  🏪 {t('employee.currentEstablishment')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    ref={establishmentInputRef}
                    type="text"
                    value={establishmentSearch}
                    onChange={(e) => {
                      setEstablishmentSearch(e.target.value);
                      setShowEstablishmentSuggestions(true);
                    }}
                    onFocus={() => setShowEstablishmentSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowEstablishmentSuggestions(false), 200);
                    }}
                    placeholder={t('employee.establishmentPlaceholder')}
                    className="input-nightlife"
                    style={{
                      paddingRight: formData.current_establishment_id ? '40px' : '12px'
                    }}
                  />

                  {/* Clear button */}
                  {formData.current_establishment_id && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, current_establishment_id: '' }));
                        setEstablishmentSearch('');
                        setShowEstablishmentSuggestions(false);
                      }}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#C19A6B',
                        fontSize: '20px',
                        cursor: 'pointer',
                        padding: '0',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  )}

                  {/* Autocomplete Dropdown */}
                  {showEstablishmentSuggestions && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'rgba(0, 0, 0, 0.95)',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        marginTop: '4px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        zIndex: 10,
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      {(() => {
                        const { groupedByZone, sortedZones, zoneNames } = filterEstablishmentsByQuery(establishmentSearch, isFreelanceMode);

                        if (sortedZones.length === 0) {
                          return (
                            <div
                              style={{
                                padding: '12px 16px',
                                color: '#cccccc',
                                textAlign: 'center'
                              }}
                            >
                              {t('employee.noEstablishmentsFound')}
                            </div>
                          );
                        }

                        return sortedZones.map((zone) => (
                          <div key={zone}>
                            {/* Zone Header - Gray Neutral */}
                            <div
                              style={{
                                padding: '8px 16px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#cccccc',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              📍 {zoneNames[zone] || zone}
                            </div>

                            {/* Establishments in Zone */}
                            {groupedByZone[zone].map((est) => (
                              <div
                                key={est.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setFormData(prev => ({ ...prev, current_establishment_id: est.id }));
                                  setEstablishmentSearch(est.name);
                                  setShowEstablishmentSuggestions(false);
                                }}
                                style={{
                                  padding: '12px 16px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                  transition: 'background 0.2s ease',
                                  color: formData.current_establishment_id === est.id ? '#00E5FF' : '#ffffff',
                                  fontSize: '14px'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                {est.name}{est.category?.name && ` - ${est.category.name}`}
                              </div>
                            ))}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>
          </div>

          {/* Social Media */}
          <div className="form-section">
            <h3 className="text-cyan-nightlife" style={{
              margin: '0 0 15px 0',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📱 {t('employee.socialMedia')}
            </h3>
            
            <div className="social-media-grid">
              {Object.keys(formData.social_media).map(platform => {
                const labelMap = {
                  ig: `📷 ${t('employee.instagramLabel')}`,
                  fb: `📘 ${t('employee.facebookLabel')}`,
                  line: `💬 ${t('employee.lineLabel')}`,
                  tg: `✈️ ${t('employee.telegramLabel')}`,
                  wa: `📞 ${t('employee.whatsappLabel')}`
                };

                const placeholderMap = {
                  ig: t('employee.instagramPlaceholder'),
                  fb: t('employee.facebookPlaceholder'),
                  line: t('employee.linePlaceholder'),
                  tg: t('employee.telegramPlaceholder'),
                  wa: t('employee.whatsappPlaceholder')
                };

                return (
                  <div key={platform}>
                    <label className="label-nightlife">
                      {labelMap[platform as keyof typeof labelMap]}
                    </label>
                    <input
                      type="text"
                      name={`social_media.${platform}`}
                      value={formData.social_media[platform as keyof typeof formData.social_media]}
                      onChange={handleInputChange}
                      className="input-nightlife social-media-input"
                      placeholder={placeholderMap[platform as keyof typeof placeholderMap]}
                    />
                  </div>
                );
              })}
            </div>
          </div>

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
                initialData ? `💾 ${t('employee.buttonSaveChanges')}` : `✨ ${t('employee.buttonAddEmployee')}`
              )}
            </button>
          </div>
          </form>
        </div>

        <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(30px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Animations spécifiques au formulaire */
        `}</style>
      </div>
  );
};

export default EmployeeForm;