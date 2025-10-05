import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { Establishment } from '../../types';
import { logger } from '../../utils/logger';

interface EmployeeFormProps {
  onSubmit: (employeeData: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: any;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ onSubmit, onCancel, isLoading = false, initialData }) => {
  const { token } = useAuth();
  const { secureFetch } = useSecureFetch();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    nickname: initialData?.nickname || '',
    age: initialData?.age?.toString() || '',
    nationality: initialData?.nationality || '',
    description: initialData?.description || '',
    social_media: {
      ig: initialData?.social_media?.instagram || '',
      fb: initialData?.social_media?.facebook || '',
      line: initialData?.social_media?.line || '',
      tg: initialData?.social_media?.telegram || '',
      wa: initialData?.social_media?.whatsapp || ''
    },
    current_establishment_id: initialData?.current_establishment_id || ''
  });

  const [isFreelanceMode, setIsFreelanceMode] = useState(false);
  const [freelancePosition, setFreelancePosition] = useState({
    grid_row: 1,
    grid_col: 1
  });
  
  const [photos, setPhotos] = useState<File[]>([]);
  // const [photoUrls, setPhotoUrls] = useState<string[]>([]);  // TODO: Implement photo preview
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 🎯 Gestion du scroll du body quand le modal est ouvert
  useEffect(() => {
    document.body.classList.add('modal-open');

    // Nettoyage au démontage
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  useEffect(() => {
    fetchEstablishments();
  }, []);


  const fetchEstablishments = async () => {
    try {
      const isAdminContext = window.location.pathname.includes('admin');

      const endpoint = isAdminContext
        ? `${process.env.REACT_APP_API_URL}/api/admin/establishments`
        : `${process.env.REACT_APP_API_URL}/api/establishments`;

      const response = await secureFetch(endpoint);
      const data = await response.json();

      setEstablishments(data.establishments || []);
    } catch (error) {
      logger.error('Error fetching establishments:', error);
    }
  };

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
    
    if (files.length + photos.length > 5) {
      setErrors(prev => ({ ...prev, photos: 'Maximum 5 photos allowed' }));
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, photos: 'Only image files are allowed' }));
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        setErrors(prev => ({ ...prev, photos: 'Images must be smaller than 10MB' }));
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

  const uploadPhotos = async () => {
    if (photos.length === 0) return [];

    setUploadingPhotos(true);
    try {
      const formData = new FormData();
      photos.forEach(photo => {
        formData.append('images', photo);
      });

      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/upload/images`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload photos');
      }

      return data.images.map((img: any) => img.url);
    } catch (error) {
      logger.error('Photo upload error:', error);
      throw error;
    } finally {
      setUploadingPhotos(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (formData.age && (parseInt(formData.age) < 18 || parseInt(formData.age) > 80)) {
      newErrors.age = 'Age must be between 18 and 80';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const uploadedPhotoUrls = photos.length > 0 ? await uploadPhotos() : (initialData?.photos || []);

      const employeeData: any = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : undefined,
        photos: uploadedPhotoUrls,
        social_media: Object.fromEntries(
          Object.entries(formData.social_media).filter(([_, value]) => value.trim() !== '')
        )
      };

      // Add freelance position if in freelance mode
      if (isFreelanceMode) {
        employeeData.freelance_position = freelancePosition;
        delete employeeData.current_establishment_id; // Remove establishment if in freelance mode
      }

      onSubmit(employeeData);
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
    }}>
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
            {initialData ? '✏️ Edit Employee' : '👥 Add New Employee'}
          </h2>
          <p className="modal-subtitle">
            {initialData ? 'Propose changes to employee profile' : 'Create a new employee profile'}
          </p>
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
              📝 Basic Information
            </h3>
            
            <div className="form-input-group">
              <label className="label-nightlife">
                👤 Name *
              </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input-nightlife"
                  placeholder="Enter full name"
                />
                {errors.name && (
                  <div className="error-message-nightlife">
                    ⚠️ {errors.name}
                  </div>
                )}
              </div>

              <div className="form-input-group-lg">
                <label className="label-nightlife">
                  🎭 Nickname
                </label>
                <input
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleInputChange}
                  className="input-nightlife"
                  placeholder="Nickname or stage name"
                />
              </div>

              <div className="form-row-2-cols">
                <div>
                  <label className="label-nightlife">
                    🎂 Age
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    className="input-nightlife"
                    min="18"
                    max="80"
                    placeholder="Age"
                  />
                  {errors.age && (
                    <div className="error-message-nightlife">
                      ⚠️ {errors.age}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="label-nightlife">
                    🌍 Nationality
                  </label>
                  <input
                    type="text"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleInputChange}
                    className="input-nightlife"
                    placeholder="e.g., Thai, Filipino"
                  />
                </div>
              </div>

              <div className="form-input-group">
                <label className="label-nightlife">
                  📝 Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="textarea-nightlife"
                  placeholder="Brief description..."
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
              📸 Photos * (Max 5)
            </h3>
            
            <div className="photo-upload-area">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoChange}
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: '100%',
                  height: '100%',
                  cursor: 'pointer'
                }}
              />
              <div className="text-cyan-nightlife" style={{
                fontSize: '18px',
                marginBottom: '10px'
              }}>
                📁 Click or drag photos here
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '14px'
              }}>
                JPG, PNG, GIF up to 10MB each
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
            
            {photos.length > 0 && (
              <div className="photo-preview-grid">
                {photos.map((photo, index) => (
                  <div key={index} className="photo-preview-item">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Photo preview ${index + 1} of employee ${formData.name || 'new employee'}`}
                      className="photo-preview-image"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        background: 'linear-gradient(45deg, #FF4757, #FF1B8D)',
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
            )}
          </div>

          {/* Freelance Mode Toggle */}
          <div className="form-section">
            <h3 className="text-cyan-nightlife" style={{
              margin: '0 0 15px 0',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              👯 Employment Mode
            </h3>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              padding: '15px',
              background: 'rgba(157, 78, 221, 0.1)',
              border: '2px solid rgba(157, 78, 221, 0.3)',
              borderRadius: '12px'
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
                    if (e.target.checked) {
                      setFormData(prev => ({ ...prev, current_establishment_id: '' }));
                    }
                  }}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer'
                  }}
                />
                <span>💃 Freelance Mode (Beach Road)</span>
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
                  ACTIVE
                </span>
              )}
            </div>
          </div>

          {/* Freelance Position Selector */}
          {isFreelanceMode && (
            <div className="form-section">
              <h3 className="text-cyan-nightlife" style={{
                margin: '0 0 15px 0',
                fontSize: '16px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📍 Beach Road Position
              </h3>

              <div className="form-row-2-cols">
                <div>
                  <label className="label-nightlife">
                    📊 Row (1-2)
                  </label>
                  <select
                    value={freelancePosition.grid_row}
                    onChange={(e) => setFreelancePosition(prev => ({ ...prev, grid_row: parseInt(e.target.value) }))}
                    className="select-nightlife"
                  >
                    <option value={1} className="select-option-dark">Row 1 (North Side)</option>
                    <option value={2} className="select-option-dark">Row 2 (South Side)</option>
                  </select>
                </div>

                <div>
                  <label className="label-nightlife">
                    📍 Column (1-40)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={freelancePosition.grid_col}
                    onChange={(e) => setFreelancePosition(prev => ({ ...prev, grid_col: parseInt(e.target.value) || 1 }))}
                    className="input-nightlife"
                    placeholder="Position along road"
                  />
                </div>
              </div>

              <div style={{
                marginTop: '15px',
                padding: '12px',
                background: 'rgba(157, 78, 221, 0.15)',
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '13px'
              }}>
                💡 Position: Row {freelancePosition.grid_row}, Column {freelancePosition.grid_col}
              </div>
            </div>
          )}

          {/* Current Employment */}
          {!isFreelanceMode && (
            <div className="form-section">
              <h3 className="text-cyan-nightlife" style={{
                margin: '0 0 15px 0',
                fontSize: '16px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🏢 Current Employment (Optional)
              </h3>

              <div className="form-input-group-lg">
                <label className="label-nightlife">
                  🏪 Current Establishment
                </label>
                <select
                  name="current_establishment_id"
                  value={formData.current_establishment_id}
                  onChange={handleInputChange}
                  className="select-nightlife"
                >
                  <option value="" className="select-option-dark">Select establishment</option>
                  {(() => {
                    // Zone name mapping
                    const zoneNames: Record<string, string> = {
                      soi6: 'Soi 6',
                      walkingstreet: 'Walking Street',
                      beachroad: 'Beach Road',
                      lkmetro: 'LK Metro',
                      treetown: 'Tree Town',
                      soibuakhao: 'Soi Buakhao',
                      jomtiencomplex: 'Jomtien Complex',
                      boyztown: 'BoyzTown',
                      soi78: 'Soi 7 & 8'
                    };

                    // Filter establishments with zone only
                    const establishmentsWithZone = establishments.filter(est => est.zone);

                    // Group by zone
                    const groupedByZone = establishmentsWithZone.reduce((acc, est) => {
                      const zone = est.zone || 'other';
                      if (!acc[zone]) acc[zone] = [];
                      acc[zone].push(est);
                      return acc;
                    }, {} as Record<string, typeof establishments>);

                    // Sort each group alphabetically
                    Object.keys(groupedByZone).forEach(zone => {
                      groupedByZone[zone].sort((a, b) => a.name.localeCompare(b.name));
                    });

                    // Sort zones alphabetically
                    const sortedZones = Object.keys(groupedByZone).sort((a, b) =>
                      (zoneNames[a] || a).localeCompare(zoneNames[b] || b)
                    );

                    return sortedZones.map(zone => (
                      <optgroup
                        key={zone}
                        label={zoneNames[zone] || zone}
                        className="select-optgroup-dark"
                      >
                        {groupedByZone[zone].map(est => (
                          <option
                            key={est.id}
                            value={est.id}
                            className="select-option-dark"
                          >
                            {est.name} - {est.category?.name}
                          </option>
                        ))}
                      </optgroup>
                    ));
                  })()}
                </select>
              </div>
            </div>
          )}

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
              📱 Social Media (Optional)
            </h3>
            
            <div className="social-media-grid">
              {Object.keys(formData.social_media).map(platform => {
                const labels = {
                  ig: '📷 Instagram',
                  fb: '📘 Facebook',
                  line: '💬 Line',
                  tg: '✈️ Telegram',
                  wa: '📞 WhatsApp'
                };
                
                return (
                  <div key={platform}>
                    <label className="label-nightlife">
                      {labels[platform as keyof typeof labels]}
                    </label>
                    <input
                      type="text"
                      name={`social_media.${platform}`}
                      value={formData.social_media[platform as keyof typeof formData.social_media]}
                      onChange={handleInputChange}
                      className="input-nightlife social-media-input"
                      placeholder={`${labels[platform as keyof typeof labels].split(' ')[1]} username`}
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
              ❌ Cancel
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
                  📤 Uploading Photos...
                </span>
              ) : isLoading ? (
                <span className="loading-flex">
                  <span className="loading-spinner-small-nightlife"></span>
                  ⏳ Submitting...
                </span>
              ) : (
                initialData ? '💾 Save Changes' : '✨ Add Employee'
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