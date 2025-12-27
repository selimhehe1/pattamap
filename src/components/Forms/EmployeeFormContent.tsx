import React, { useState, useEffect } from 'react';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useAuth } from '../../contexts/AuthContext';
import { Establishment, Employee, CloudinaryUploadResponse } from '../../types';
import { logger } from '../../utils/logger';
import LazyImage from '../Common/LazyImage';
import NationalityTagsInput from './NationalityTagsInput';
import { Pencil, Sparkles, Users, FileText, User, AlertTriangle, UserCog, Cake, Globe, Camera, FolderOpen, Music, Building2, MapPin, Check, Lightbulb, Store, Smartphone, X, Upload, Loader2, Save } from 'lucide-react';
import '../../styles/components/employee-form.css';

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

// Extended form data type for submission (includes freelance fields)
interface EmployeeSubmitData {
  name: string;
  nickname?: string;
  age?: number;
  nationality?: string[] | null;
  description?: string;
  photos: string[];
  social_media?: Record<string, string>;
  current_establishment_id?: string;
  current_establishment_ids?: string[];
  is_freelance?: boolean;
}

interface EmployeeFormContentProps {
  onSubmit: (employeeData: EmployeeSubmitData) => void;
  onClose?: () => void; // Optional - injected by openModal
  isLoading?: boolean;
  initialData?: Partial<Employee> & { current_establishment_id?: string };
  isSelfProfile?: boolean; // 🆕 v10.0 - Self-managed employee profile mode
}

const EmployeeFormContent: React.FC<EmployeeFormContentProps> = ({
  onSubmit,
  onClose = () => {},
  isLoading = false,
  initialData,
  isSelfProfile = false // 🆕 v10.0
}) => {
  const { secureFetch } = useSecureFetch();
  const { user } = useAuth();
  // Icon style helper
  const iconStyle = { marginRight: '6px', verticalAlign: 'middle' as const };

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
    current_establishment_id: initialData?.current_establishment_id || ''
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>(initialData?.photos || []);
  const [photosToRemove, setPhotosToRemove] = useState<string[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Freelance Mode (v10.3: multi-nightclub support)
  const [isFreelanceMode, setIsFreelanceMode] = useState(false);
  const [selectedNightclubs, setSelectedNightclubs] = useState<string[]>([]);

  useEffect(() => {
    const fetchEstablishments = async () => {
      try {
        // SECURITY FIX: Use useAuth instead of localStorage token
        // Check if user is admin/moderator via AuthContext
        const isAdminContext = user && ['admin', 'moderator'].includes(user.role) &&
                              window.location.pathname.includes('admin');

        const endpoint = isAdminContext
          ? `${import.meta.env.VITE_API_URL}/api/admin/establishments`
          : `${import.meta.env.VITE_API_URL}/api/establishments`;

        // SECURITY FIX: Use secureFetch (httpOnly cookies) instead of Bearer token
        const response = await secureFetch(endpoint);
        const data = await response.json();

        setEstablishments(data.establishments || []);
      } catch (error) {
        logger.error('Error fetching establishments:', error);
      }
    };
    fetchEstablishments();
  }, [secureFetch, user]);

  // Initialize existing photos when initialData changes
  useEffect(() => {
    if (initialData?.photos) {
      setExistingPhotos(initialData.photos);
    }
  }, [initialData]);

  // Initialize freelance mode from initialData
  useEffect(() => {
    if (initialData?.is_freelance) {
      setIsFreelanceMode(true);
      // v10.3: Load associated nightclubs if any
      if (initialData?.current_employment) {
        const nightclubIds = initialData.current_employment
          .filter((emp) => emp.establishment?.category?.name === 'Nightclub')
          .map((emp) => emp.establishment_id);
        setSelectedNightclubs(nightclubIds);
      }
    }
  }, [initialData]);

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

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (formData.age && (parseInt(formData.age) < 18 || parseInt(formData.age) > 80)) {
      newErrors.age = 'Age must be between 18 and 80';
    }
    // v10.3: Freelances can be "free" (no nightclub) or associated with nightclubs
    // No validation needed for selectedNightclubs - it's optional

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

      // v10.3: Handle freelance mode with multi-nightclub support
      if (isFreelanceMode) {
        employeeData.is_freelance = true;
        if (selectedNightclubs.length > 0) {
          employeeData.current_establishment_ids = selectedNightclubs;
        }
        delete employeeData.current_establishment_id; // Remove single establishment if in freelance mode
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
    <div className="employee-form-container">
      {/* Header */}
      <div className="employee-form-header">
        <h2 className="employee-form-title">
          {initialData
            ? <><Pencil size={18} style={iconStyle} /> Edit Employee</>
            : isSelfProfile
              ? <><Sparkles size={18} style={iconStyle} /> Create Your Profile</>
              : <><Users size={18} style={iconStyle} /> Add New Employee</>}
        </h2>
        <p className="employee-form-subtitle">
          {initialData
            ? 'Propose changes to employee profile'
            : isSelfProfile
              ? 'Set up your self-managed employee profile'
              : 'Create a new employee profile'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="employee-form-section">
          <h3 className="employee-form-section-title">
            <FileText size={16} style={iconStyle} /> Basic Information
          </h3>

          <div className="employee-form-field">
            <label className="employee-form-label">
              <User size={14} style={iconStyle} /> Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="employee-form-input"
              placeholder="Enter full name"
            />
            {errors.name && (
              <div className="employee-form-error">
                <AlertTriangle size={14} style={iconStyle} /> {errors.name}
              </div>
            )}
          </div>

          <div className="employee-form-field">
            <label className="employee-form-label">
              <UserCog size={14} style={iconStyle} /> Nickname
            </label>
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleInputChange}
              className="employee-form-input"
              placeholder="Nickname or stage name"
            />
          </div>

          <div className="employee-form-grid-2">
            <div className="employee-form-field">
              <label className="employee-form-label">
                <Cake size={14} style={iconStyle} /> Age
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                className="employee-form-input"
                min="18"
                max="80"
                placeholder="Age"
              />
              {errors.age && (
                <div className="employee-form-error">
                  <AlertTriangle size={14} style={iconStyle} /> {errors.age}
                </div>
              )}
            </div>

            <div className="employee-form-field">
              <label className="employee-form-label">
                <Globe size={14} style={iconStyle} /> Nationality
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

          <div className="employee-form-field">
            <label className="employee-form-label">
              <FileText size={14} style={iconStyle} /> Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="employee-form-textarea"
              placeholder="Brief description..."
            />
          </div>
        </div>

        {/* Photos */}
        <div className="photo-management-container">
          <h3 className="photo-management-header">
            <Camera size={16} style={iconStyle} /> Photos Management
            <span className="photo-counter-badge">
              {existingPhotos.length - photosToRemove.length + photos.length}/5
            </span>
          </h3>

          {/* Existing Photos Section */}
          {existingPhotos.length > 0 && (
            <div className="photo-section">
              <h4 className="photo-section-title">
                <Camera size={14} style={iconStyle} /> Current Photos ({existingPhotos.length - photosToRemove.length} kept)
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
              <FolderOpen size={14} style={iconStyle} /> Add New Photos
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

        {/* Freelance Mode Toggle */}
        <div className="freelance-mode-container">
          <h3 className="freelance-mode-section-title">
            <Users size={16} style={iconStyle} /> Employment Mode
          </h3>

          <div className="freelance-toggle-box">
            <label className="freelance-toggle-label">
              <input
                type="checkbox"
                checked={isFreelanceMode}
                onChange={(e) => {
                  setIsFreelanceMode(e.target.checked);
                  if (e.target.checked) {
                    setFormData(prev => ({ ...prev, current_establishment_id: '' }));
                  } else {
                    setSelectedNightclubs([]);
                  }
                }}
              />
              <span><Users size={14} style={iconStyle} /> Freelance Mode</span>
            </label>
            {isFreelanceMode && (
              <span className="freelance-active-badge">
                ACTIVE
              </span>
            )}
          </div>
        </div>

        {/* Freelance Nightclubs Selector (v10.3) */}
        {isFreelanceMode && (
          <div className="nightclubs-selector">
            <h3 className="freelance-mode-section-title">
              <Music size={16} style={iconStyle} /> Nightclubs (Optional)
            </h3>

            <div className="employee-form-field">
              <label className="nightclubs-selector-label">
                <Building2 size={14} style={iconStyle} /> Select Nightclubs (you can work at multiple)
              </label>

              {/* Filter nightclubs only */}
              {establishments.filter(est => est.category?.name === 'Nightclub').length > 0 ? (
                <div className="nightclubs-list">
                  {establishments
                    .filter(est => est.category?.name === 'Nightclub')
                    .map(nightclub => (
                      <label
                        key={nightclub.id}
                        className={`nightclub-option ${selectedNightclubs.includes(nightclub.id) ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedNightclubs.includes(nightclub.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedNightclubs(prev => [...prev, nightclub.id]);
                            } else {
                              setSelectedNightclubs(prev => prev.filter(id => id !== nightclub.id));
                            }
                          }}
                        />
                        <span className="nightclub-name">
                          {nightclub.name}
                        </span>
                        {nightclub.zone && (
                          <span className="nightclub-zone">
                            <MapPin size={12} style={iconStyle} /> {nightclub.zone}
                          </span>
                        )}
                      </label>
                    ))}
                </div>
              ) : (
                <div className="nightclubs-empty-state">
                  <AlertTriangle size={14} style={iconStyle} /> No nightclubs available yet. You can still register as a free freelance!
                </div>
              )}

              {selectedNightclubs.length > 0 && (
                <div className="nightclubs-selected-count">
                  <Check size={14} style={iconStyle} /> {selectedNightclubs.length} nightclub(s) selected
                </div>
              )}
            </div>

            <div className="freelance-info-note">
              <Lightbulb size={14} style={iconStyle} /> <strong>Note:</strong> As a freelance, you can work at multiple nightclubs or be completely independent. Select the nightclubs where you regularly work, or leave it empty to be listed as a free freelance.
            </div>
          </div>
        )}

        {/* Current Employment */}
        {!isFreelanceMode && (
          <div className="employee-form-section">
          <h3 className="employee-form-section-title">
            <Building2 size={16} style={iconStyle} /> Current Employment (Optional)
          </h3>

          <div className="employee-form-field">
            <label className="employee-form-label">
              <Store size={14} style={iconStyle} /> Current Establishment
            </label>
            <select
              name="current_establishment_id"
              value={formData.current_establishment_id}
              onChange={handleInputChange}
              className="employee-form-select"
            >
              <option value="">Select establishment</option>
              {(() => {
                // Zone name mapping
                const zoneNames: Record<string, string> = {
                  soi6: 'Soi 6',
                  walkingstreet: 'Walking Street',
                  beachroad: 'Beach Road',
                  lkmetro: 'LK Metro',
                  treetown: 'Tree Town',
                  soibuakhao: 'Soi Buakhao'
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
                  >
                    {groupedByZone[zone].map(est => (
                      <option
                        key={est.id}
                        value={est.id}
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
        <div className="employee-form-section">
          <h3 className="employee-form-section-title">
            <Smartphone size={16} style={iconStyle} /> Social Media (Optional)
          </h3>

          <div className="employee-form-grid-social">
            {Object.keys(formData.social_media).map(platform => {
              const labels = {
                ig: 'Instagram',
                fb: 'Facebook',
                line: 'Line',
                tg: 'Telegram',
                wa: 'WhatsApp'
              };

              return (
                <div key={platform} className="employee-form-field">
                  <label className="employee-form-label">
                    {labels[platform as keyof typeof labels]}
                  </label>
                  <input
                    type="text"
                    name={`social_media.${platform}`}
                    value={formData.social_media[platform as keyof typeof formData.social_media]}
                    onChange={handleInputChange}
                    className="employee-form-input"
                    placeholder={`${labels[platform as keyof typeof labels].split(' ')[1]} username`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {errors.submit && (
          <div className="employee-form-error-box">
            <AlertTriangle size={14} style={iconStyle} /> {errors.submit}
          </div>
        )}

        {/* Action Buttons */}
        <div className="employee-form-actions">
          <button
            type="button"
            onClick={onClose}
            className="employee-form-btn employee-form-btn-cancel"
          >
            <X size={14} style={iconStyle} /> Cancel
          </button>

          <button
            type="submit"
            disabled={isLoading || uploadingPhotos}
            className="employee-form-btn employee-form-btn-submit"
          >
            {uploadingPhotos ? (
              <><Upload size={14} style={iconStyle} /> Uploading Photos...</>
            ) : isLoading ? (
              <><Loader2 size={14} style={{ ...iconStyle, animation: 'spin 1s linear infinite' }} /> Submitting...</>
            ) : (
              initialData ? <><Save size={14} style={iconStyle} /> Save Changes</> : <><Sparkles size={14} style={iconStyle} /> Add Employee</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeFormContent;