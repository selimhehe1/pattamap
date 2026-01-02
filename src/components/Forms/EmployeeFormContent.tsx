import React, { useState, useEffect } from 'react';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useAuth } from '../../contexts/AuthContext';
import { Establishment, Employee, CloudinaryUploadResponse } from '../../types';
import { logger } from '../../utils/logger';
import { Pencil, Sparkles, Users, AlertTriangle, X, Upload, Loader2, Save } from 'lucide-react';
import '../../styles/components/form-unified.css';

// Sub-components
import {
  BasicInfoSection,
  PhotosSection,
  FreelanceModeSection,
  EstablishmentSection,
  SocialMediaSection,
  FreelanceWarningModal
} from './EmployeeFormContent/index';
import type { InternalFormData, EmployeeSubmitData } from './EmployeeFormContent/types';

/**
 * EmployeeFormContent Component (v10.5 - Refactored)
 *
 * Form for creating/editing employee profiles.
 * Features:
 * - Basic information (name, age, nationality, description)
 * - Photo management (upload, remove, restore)
 * - Freelance mode with multi-nightclub support
 * - Social media links
 */

interface EmployeeFormContentProps {
  onSubmit: (employeeData: EmployeeSubmitData) => void;
  onClose?: () => void;
  isLoading?: boolean;
  initialData?: Partial<Employee> & { current_establishment_id?: string };
  isSelfProfile?: boolean;
}

const EmployeeFormContent: React.FC<EmployeeFormContentProps> = ({
  onSubmit,
  onClose = () => {},
  isLoading = false,
  initialData,
  isSelfProfile = false
}) => {
  const { secureFetch } = useSecureFetch();
  const { user } = useAuth();
  const iconStyle = { marginRight: '6px', verticalAlign: 'middle' as const };

  // Form data state
  const [formData, setFormData] = useState<InternalFormData>({
    name: initialData?.name || '',
    nickname: initialData?.nickname || '',
    age: initialData?.age?.toString() || '',
    sex: initialData?.sex || '', // 🆕 v10.x - Gender
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

  // Photo management state
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>(initialData?.photos || []);
  const [photosToRemove, setPhotosToRemove] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Establishments state
  const [establishments, setEstablishments] = useState<Establishment[]>([]);

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Freelance mode state
  const [isFreelanceMode, setIsFreelanceMode] = useState(false);
  const [selectedNightclubs, setSelectedNightclubs] = useState<string[]>([]);
  const [showFreelanceWarning, setShowFreelanceWarning] = useState(false);
  const [warningEstablishment, setWarningEstablishment] = useState<Establishment | null>(null);

  // Fetch establishments
  useEffect(() => {
    const fetchEstablishments = async () => {
      try {
        const isAdminContext = user && ['admin', 'moderator'].includes(user.role) &&
                              window.location.pathname.includes('admin');

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
  }, [secureFetch, user]);

  // Initialize existing photos
  useEffect(() => {
    if (initialData?.photos) {
      setExistingPhotos(initialData.photos);
    }
  }, [initialData]);

  // Initialize freelance mode
  useEffect(() => {
    if (initialData?.is_freelance) {
      setIsFreelanceMode(true);
      if (initialData?.current_employment) {
        const nightclubIds = initialData.current_employment
          .filter((emp) => emp.establishment?.category?.name === 'Nightclub')
          .map((emp) => emp.establishment_id);
        setSelectedNightclubs(nightclubIds);
      }
    }
  }, [initialData]);

  // ============================================
  // Form handlers
  // ============================================

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name.startsWith('social_media.')) {
      const socialField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        social_media: { ...prev.social_media, [socialField]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleNationalityChange = (nationalities: string[] | null) => {
    setFormData(prev => ({ ...prev, nationality: nationalities }));
  };

  // ============================================
  // Photo handlers
  // ============================================

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const currentExistingCount = existingPhotos.length - photosToRemove.length;
    const totalAfterAdding = currentExistingCount + photos.length + files.length;

    if (totalAfterAdding > 5) {
      setErrors(prev => ({ ...prev, photos: `Maximum 5 photos. Remove some photos first.` }));
      return;
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, photos: 'Only image files are allowed' }));
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
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

  // ============================================
  // Freelance mode handlers
  // ============================================

  const handleFreelanceModeChange = (checked: boolean) => {
    if (checked && formData.current_establishment_id) {
      const currentEst = establishments.find(e => e.id === formData.current_establishment_id);

      if (currentEst) {
        if (currentEst.category?.name === 'Nightclub') {
          setIsFreelanceMode(true);
          setSelectedNightclubs([currentEst.id]);
          setFormData(prev => ({ ...prev, current_establishment_id: '' }));
          return;
        } else {
          setWarningEstablishment(currentEst);
          setShowFreelanceWarning(true);
          return;
        }
      }
    }

    setIsFreelanceMode(checked);
    if (!checked) {
      setSelectedNightclubs([]);
    }
  };

  const handleNightclubToggle = (nightclubId: string, checked: boolean) => {
    if (checked) {
      setSelectedNightclubs(prev => [...prev, nightclubId]);
    } else {
      setSelectedNightclubs(prev => prev.filter(id => id !== nightclubId));
    }
  };

  const handleConfirmFreelanceSwitch = () => {
    setIsFreelanceMode(true);
    setFormData(prev => ({ ...prev, current_establishment_id: '' }));
    setShowFreelanceWarning(false);
    setWarningEstablishment(null);
  };

  const handleCancelFreelanceSwitch = () => {
    setShowFreelanceWarning(false);
    setWarningEstablishment(null);
  };

  // ============================================
  // Upload and submit
  // ============================================

  const uploadPhotos = async (): Promise<string[]> => {
    if (photos.length === 0) return [];

    setUploadingPhotos(true);
    try {
      const formDataUpload = new FormData();
      photos.forEach(photo => {
        formDataUpload.append('images', photo);
      });

      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/upload/images`, {
        method: 'POST',
        body: formDataUpload
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.sex) newErrors.sex = 'Sex is required'; // 🆕 v10.x - Gender validation
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
      const uploadedPhotoUrls = photos.length > 0 ? await uploadPhotos() : [];
      const keptExistingPhotos = existingPhotos.filter(url => !photosToRemove.includes(url));
      const finalPhotoUrls = [...keptExistingPhotos, ...uploadedPhotoUrls];

      // Map abbreviations to full names for API
      const socialMediaMap: Record<string, string> = {
        ig: 'instagram', fb: 'facebook', line: 'line', tg: 'telegram', wa: 'whatsapp'
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
        sex: formData.sex as 'male' | 'female' | 'ladyboy', // 🆕 v10.x - Gender
        nationality: formData.nationality,
        description: formData.description || undefined,
        photos: finalPhotoUrls,
        social_media: Object.keys(mappedSocialMedia).length > 0 ? mappedSocialMedia : undefined,
        current_establishment_id: formData.current_establishment_id || undefined
      };

      if (isFreelanceMode) {
        employeeData.is_freelance = true;
        if (selectedNightclubs.length > 0) {
          employeeData.current_establishment_ids = selectedNightclubs;
        }
        delete employeeData.current_establishment_id;
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
    <div className="uf-container">
      {/* Header */}
      <div className="uf-header">
        <h2 className="uf-title">
          {initialData
            ? <><Pencil size={18} style={iconStyle} /> Edit Employee</>
            : isSelfProfile
              ? <><Sparkles size={18} style={iconStyle} /> Create Your Profile</>
              : <><Users size={18} style={iconStyle} /> Add New Employee</>}
        </h2>
        <p className="uf-subtitle">
          {initialData
            ? 'Propose changes to employee profile'
            : isSelfProfile
              ? 'Set up your self-managed employee profile'
              : 'Create a new employee profile'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <BasicInfoSection
          formData={formData}
          errors={errors}
          isLoading={isLoading}
          onInputChange={handleInputChange}
          onNationalityChange={handleNationalityChange}
        />

        {/* Photos */}
        <PhotosSection
          photos={photos}
          existingPhotos={existingPhotos}
          photosToRemove={photosToRemove}
          errors={errors}
          onPhotoChange={handlePhotoChange}
          onRemovePhoto={removePhoto}
          onRemoveExistingPhoto={removeExistingPhoto}
          onRestoreExistingPhoto={restoreExistingPhoto}
        />

        {/* Freelance Mode */}
        <FreelanceModeSection
          isFreelanceMode={isFreelanceMode}
          selectedNightclubs={selectedNightclubs}
          establishments={establishments}
          onFreelanceModeChange={handleFreelanceModeChange}
          onNightclubToggle={handleNightclubToggle}
        />

        {/* Current Employment (only if not freelance) */}
        {!isFreelanceMode && (
          <EstablishmentSection
            establishments={establishments}
            currentEstablishmentId={formData.current_establishment_id}
            onChange={handleInputChange}
          />
        )}

        {/* Social Media */}
        <SocialMediaSection
          socialMedia={formData.social_media}
          onChange={handleInputChange}
        />

        {errors.submit && (
          <div className="uf-error-box">
            <AlertTriangle size={14} style={iconStyle} /> {errors.submit}
          </div>
        )}

        {/* Action Buttons */}
        <div className="uf-actions">
          <button type="button" onClick={onClose} className="uf-btn uf-btn-cancel">
            <X size={14} style={iconStyle} /> Cancel
          </button>

          <button type="submit" disabled={isLoading || uploadingPhotos} className="uf-btn uf-btn-submit">
            {uploadingPhotos ? (
              <><Upload size={14} style={iconStyle} /> Uploading Photos...</>
            ) : isLoading ? (
              <><Loader2 size={14} style={{ ...iconStyle, animation: 'spin 1s linear infinite' }} /> Submitting...</>
            ) : (
              initialData ? <><Save size={14} style={iconStyle} /> Save Changes</> : <><Sparkles size={14} style={iconStyle} /> Add Employee</>
            )}
          </button>
        </div>

        {/* Freelance Warning Modal */}
        {showFreelanceWarning && warningEstablishment && (
          <FreelanceWarningModal
            establishmentName={warningEstablishment.name}
            categoryName={warningEstablishment.category?.name || 'Unknown'}
            onConfirm={handleConfirmFreelanceSwitch}
            onCancel={handleCancelFreelanceSwitch}
          />
        )}
      </form>
    </div>
  );
};

export default EmployeeFormContent;
