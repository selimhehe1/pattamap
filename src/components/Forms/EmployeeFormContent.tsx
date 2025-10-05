import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { Establishment } from '../../types';
import { logger } from '../../utils/logger';

interface EmployeeFormContentProps {
  onSubmit: (employeeData: any) => void;
  onClose: () => void;
  isLoading?: boolean;
  initialData?: any;
}

const EmployeeFormContent: React.FC<EmployeeFormContentProps> = ({
  onSubmit,
  onClose,
  isLoading = false,
  initialData
}) => {
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

  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>(initialData?.photos || []);
  const [photosToRemove, setPhotosToRemove] = useState<string[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchEstablishments();
  }, []);

  // Initialize existing photos when initialData changes
  useEffect(() => {
    if (initialData?.photos) {
      setExistingPhotos(initialData.photos);
    }
  }, [initialData]);

  const fetchEstablishments = async () => {
    try {
      // Vérifier si on est dans un contexte admin via le token
      const token = localStorage.getItem('token');
      const isAdminContext = token && window.location.pathname.includes('admin');

      const endpoint = isAdminContext
        ? `${process.env.REACT_APP_API_URL}/api/admin/establishments`
        : `${process.env.REACT_APP_API_URL}/api/establishments`;

      const headers: HeadersInit = isAdminContext && token
        ? { 'Authorization': `Bearer ${token}` }
        : {};

      const response = await fetch(endpoint, { headers });
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

    // Calculate total photos: existing (not removed) + current new + new files
    const currentExistingCount = existingPhotos.length - photosToRemove.length;
    const totalAfterAdding = currentExistingCount + photos.length + files.length;

    if (totalAfterAdding > 5) {
      setErrors(prev => ({ ...prev, photos: `Maximum 5 photos. Remove some photos first.` }));
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

  const removeExistingPhoto = (photoUrl: string) => {
    setPhotosToRemove(prev => [...prev, photoUrl]);
  };

  const restoreExistingPhoto = (photoUrl: string) => {
    setPhotosToRemove(prev => prev.filter(url => url !== photoUrl));
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
      // Upload new photos if any
      const uploadedPhotoUrls = photos.length > 0 ? await uploadPhotos() : [];

      // Combine existing photos (minus removed ones) with newly uploaded photos
      const keptExistingPhotos = existingPhotos.filter(url => !photosToRemove.includes(url));
      const finalPhotoUrls = [...keptExistingPhotos, ...uploadedPhotoUrls];

      const employeeData = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : undefined,
        photos: finalPhotoUrls,
        social_media: Object.fromEntries(
          Object.entries(formData.social_media).filter(([_, value]) => value.trim() !== '')
        )
      };

      onSubmit(employeeData);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        submit: error instanceof Error ? error.message : 'Failed to submit form'
      }));
    }
  };

  return (
    <div style={{ padding: '30px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          margin: '0 0 10px 0',
          background: 'linear-gradient(45deg, #FF1B8D, #FFD700)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: '"Orbitron", monospace'
        }}>
          {initialData ? '✏️ Edit Employee' : '👥 Add New Employee'}
        </h2>
        <p style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: '16px',
          margin: 0
        }}>
          {initialData ? 'Propose changes to employee profile' : 'Create a new employee profile'}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Basic Information */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{
            color: '#00FFFF',
            margin: '0 0 20px 0',
            fontSize: '18px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📝 Basic Information
          </h3>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#FFD700',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              👤 Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '12px 15px',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(255,27,141,0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px'
              }}
              placeholder="Enter full name"
            />
            {errors.name && (
              <div style={{ color: '#FF4757', fontSize: '14px', marginTop: '5px' }}>
                ⚠️ {errors.name}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#FFD700',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              🎭 Nickname
            </label>
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '12px 15px',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(255,27,141,0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px'
              }}
              placeholder="Nickname or stage name"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{
                display: 'block',
                color: '#FFD700',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                🎂 Age
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,27,141,0.3)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '16px'
                }}
                min="18"
                max="80"
                placeholder="Age"
              />
              {errors.age && (
                <div style={{ color: '#FF4757', fontSize: '14px', marginTop: '5px' }}>
                  ⚠️ {errors.age}
                </div>
              )}
            </div>

            <div>
              <label style={{
                display: 'block',
                color: '#FFD700',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                🌍 Nationality
              </label>
              <input
                type="text"
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,27,141,0.3)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '16px'
                }}
                placeholder="e.g., Thai, Filipino"
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#FFD700',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              📝 Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '12px 15px',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(255,27,141,0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                minHeight: '100px',
                resize: 'vertical'
              }}
              placeholder="Brief description..."
            />
          </div>
        </div>

        {/* Photos */}
        <div className="photo-management-container">
          <h3 className="photo-management-header">
            📸 Photos Management
            <span className="photo-counter-badge">
              {existingPhotos.length - photosToRemove.length + photos.length}/5
            </span>
          </h3>

          {/* Existing Photos Section */}
          {existingPhotos.length > 0 && (
            <div className="photo-section">
              <h4 className="photo-section-title">
                📷 Current Photos ({existingPhotos.length - photosToRemove.length} kept)
              </h4>

              <div className="photo-grid">
                {existingPhotos.map((photoUrl, index) => (
                  <div
                    key={`existing-${index}`}
                    className={`photo-item existing ${photosToRemove.includes(photoUrl) ? 'marked-for-removal' : ''}`}
                  >
                    <img
                      src={photoUrl}
                      alt={`Existing ${index + 1}`}
                    />

                    {photosToRemove.includes(photoUrl) ? (
                      <button
                        type="button"
                        onClick={() => restoreExistingPhoto(photoUrl)}
                        className="photo-restore-btn"
                        title="Restore photo"
                      >
                        ↶
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeExistingPhoto(photoUrl)}
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
              📁 Add New Photos
            </h4>

            <div className="photo-upload-zone">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoChange}
                className="photo-upload-input"
              />
              <div className="photo-upload-text">
                📁 Click or drag photos here
              </div>
              <div className="photo-upload-subtext">
                JPG, PNG, GIF up to 10MB each
              </div>
            </div>

            {errors.photos && (
              <div style={{ color: '#FF4757', fontSize: '14px', marginBottom: '15px' }}>
                ⚠️ {errors.photos}
              </div>
            )}

            {photos.length > 0 && (
              <div>
                <h5 className="photo-section-subtitle">
                  🆕 New Photos to Upload ({photos.length})
                </h5>
                <div className="photo-grid">
                  {photos.map((photo, index) => (
                    <div key={`new-${index}`} className="photo-item new-photo">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`New ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
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

        {/* Current Employment */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{
            color: '#00FFFF',
            margin: '0 0 20px 0',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            🏢 Current Employment (Optional)
          </h3>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#FFD700',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              🏪 Current Establishment
            </label>
            <select
              name="current_establishment_id"
              value={formData.current_establishment_id}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '12px 15px',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(255,27,141,0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px'
              }}
            >
              <option value="" style={{ background: '#1a1a1a', color: 'white' }}>Select establishment</option>
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
                    style={{ background: '#2a2a2a', color: '#999999' }}
                  >
                    {groupedByZone[zone].map(est => (
                      <option
                        key={est.id}
                        value={est.id}
                        style={{ background: '#1a1a1a', color: 'white', paddingLeft: '20px' }}
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

        {/* Social Media */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{
            color: '#00FFFF',
            margin: '0 0 20px 0',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            📱 Social Media (Optional)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
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
                  <label style={{
                    display: 'block',
                    color: '#FFD700',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '8px'
                  }}>
                    {labels[platform as keyof typeof labels]}
                  </label>
                  <input
                    type="text"
                    name={`social_media.${platform}`}
                    value={formData.social_media[platform as keyof typeof formData.social_media]}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '2px solid rgba(255,27,141,0.3)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '16px'
                    }}
                    placeholder={`${labels[platform as keyof typeof labels].split(' ')[1]} username`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {errors.submit && (
          <div style={{
            background: 'rgba(255,71,87,0.1)',
            border: '1px solid rgba(255,71,87,0.3)',
            padding: '15px 20px',
            borderRadius: '12px',
            fontSize: '14px',
            color: '#FF4757',
            marginBottom: '30px'
          }}>
            ⚠️ {errors.submit}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '15px 30px',
              background: 'transparent',
              border: '2px solid #00FFFF',
              color: '#00FFFF',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            ❌ Cancel
          </button>

          <button
            type="submit"
            disabled={isLoading || uploadingPhotos}
            style={{
              padding: '15px 30px',
              background: 'linear-gradient(45deg, #FF1B8D, #FFD700)',
              border: 'none',
              color: 'white',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isLoading || uploadingPhotos ? 'not-allowed' : 'pointer',
              opacity: isLoading || uploadingPhotos ? 0.7 : 1,
              transition: 'all 0.3s ease'
            }}
          >
            {uploadingPhotos ? (
              '📤 Uploading Photos...'
            ) : isLoading ? (
              '⏳ Submitting...'
            ) : (
              initialData ? '💾 Save Changes' : '✨ Add Employee'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeFormContent;