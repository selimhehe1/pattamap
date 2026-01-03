/**
 * useEmployeeFormState hook
 * Manages all form state and handlers for EmployeeForm
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSecureFetch } from '../../../../hooks/useSecureFetch';
import { useCSRF } from '../../../../contexts/CSRFContext';
import { useEstablishments } from '../../../../hooks';
import { logger } from '../../../../utils/logger';
import toast from '../../../../utils/toast';
import type { Employee, CloudinaryUploadResponse, Establishment } from '../../../../types';
import type {
  InternalFormData,
  FormSocialMedia,
  FormErrors,
  EmployeeSubmitData
} from '../types';
import { INITIAL_FORM_DATA, INITIAL_ERRORS } from '../types';

interface UseEmployeeFormStateProps {
  initialData?: Partial<Employee> & { current_establishment_id?: string };
  onSubmit: (employeeData: EmployeeSubmitData) => void;
}

export function useEmployeeFormState({ initialData, onSubmit }: UseEmployeeFormStateProps) {
  const { t } = useTranslation();
  const { secureFetch } = useSecureFetch();
  const { refreshToken } = useCSRF();
  const { data: establishments = [] } = useEstablishments();

  // Form data
  const [formData, setFormData] = useState<InternalFormData>(INITIAL_FORM_DATA);

  // Photo management
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [_photosToRemove, setPhotosToRemove] = useState<string[]>([]);

  // UI state
  const [errors, setErrors] = useState<FormErrors>(INITIAL_ERRORS);
  const [isFreelanceMode, setIsFreelanceMode] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Freelance warning state
  const [showFreelanceWarning, setShowFreelanceWarning] = useState(false);
  const [warningEstablishment, setWarningEstablishment] = useState<Establishment | null>(null);

  // Freelance highlight animation (triggered when auto-switched)
  const [freelanceHighlight, setFreelanceHighlight] = useState(false);

  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      // FIX: Map from API keys (instagram, facebook, etc.) to form keys (ig, fb, etc.)
      const apiSocialMedia = initialData.social_media as Record<string, string> | undefined;

      // FIX: Derive current_establishment_id from various sources
      // - current_employment[] (from regular employee API)
      // - employment_history[] with is_current=true (from admin API)
      // - current_establishment_id directly (fallback)
      let derivedEstablishmentId = '';
      if (initialData.current_employment && initialData.current_employment.length > 0) {
        derivedEstablishmentId = initialData.current_employment[0].establishment_id;
      } else if (initialData.employment_history && initialData.employment_history.length > 0) {
        // Admin API returns employment_history - find the current one
        const currentEmployment = initialData.employment_history.find(eh => eh.is_current);
        if (currentEmployment) {
          derivedEstablishmentId = currentEmployment.establishment_id;
        }
      } else if (initialData.current_establishment_id) {
        derivedEstablishmentId = initialData.current_establishment_id;  // Fallback if provided directly
      }

      setFormData({
        name: initialData.name || '',
        nickname: initialData.nickname || '',
        age: initialData.age?.toString() || '',
        sex: initialData.sex || '', // v10.x - Gender
        nationality: initialData.nationality || null,
        languages_spoken: initialData.languages_spoken || null,
        description: initialData.description || '',
        social_media: {
          // Map from API keys to form keys
          ig: apiSocialMedia?.instagram || apiSocialMedia?.ig || '',
          fb: apiSocialMedia?.facebook || apiSocialMedia?.fb || '',
          line: apiSocialMedia?.line || '',
          tg: apiSocialMedia?.telegram || apiSocialMedia?.tg || '',
          wa: apiSocialMedia?.whatsapp || apiSocialMedia?.wa || ''
        },
        current_establishment_id: derivedEstablishmentId
      });

      if (initialData.photos?.length) {
        setExistingPhotoUrls(initialData.photos);
      }

      if (initialData.is_freelance) {
        setIsFreelanceMode(true);
      }
    }
  }, [initialData]);

  // Input change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name.startsWith('social_media.')) {
      const platform = name.split('.')[1] as keyof FormSocialMedia;
      setFormData(prev => ({
        ...prev,
        social_media: { ...prev.social_media, [platform]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when field is modified
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  const handleNationalityChange = useCallback((nationalities: string[] | null) => {
    setFormData(prev => ({ ...prev, nationality: nationalities }));
  }, []);

  const handleLanguagesChange = useCallback((languages: string[] | null) => {
    setFormData(prev => ({ ...prev, languages_spoken: languages }));
  }, []);

  // v10.x - Sex change handler
  const handleSexChange = useCallback((sex: 'male' | 'female' | 'ladyboy' | '') => {
    setFormData(prev => ({ ...prev, sex }));
    // Clear error when sex is selected
    if (sex && errors.sex) {
      setErrors(prev => ({ ...prev, sex: undefined }));
    }
  }, [errors.sex]);

  const handleEstablishmentChange = useCallback((establishmentId: string) => {
    setFormData(prev => ({ ...prev, current_establishment_id: establishmentId }));
  }, []);

  const handleFreelanceModeChange = useCallback((isFreelance: boolean) => {
    // When switching TO freelance mode, check if current establishment is a non-Nightclub
    if (isFreelance && formData.current_establishment_id) {
      const currentEst = establishments.find((e: Establishment) => e.id === formData.current_establishment_id);

      if (currentEst) {
        if (currentEst.category?.name === 'Nightclub') {
          // Nightclub OK → keep association and switch to freelance
          setIsFreelanceMode(true);
          return;
        } else {
          // Non-Nightclub (Bar, etc.) → show warning dialog
          setWarningEstablishment(currentEst);
          setShowFreelanceWarning(true);
          return;
        }
      }
    }

    // Default: just toggle the mode
    setIsFreelanceMode(isFreelance);
    if (!isFreelance) {
      setFormData(prev => ({ ...prev, current_establishment_id: '' }));
    }
  }, [formData.current_establishment_id, establishments]);

  // Freelance warning handlers
  const handleConfirmFreelanceSwitch = useCallback(() => {
    setIsFreelanceMode(true);
    setFormData(prev => ({ ...prev, current_establishment_id: '' }));
    setShowFreelanceWarning(false);
    setWarningEstablishment(null);
  }, []);

  const handleCancelFreelanceSwitch = useCallback(() => {
    setShowFreelanceWarning(false);
    setWarningEstablishment(null);
  }, []);

  // Photo handlers
  const addNewPhotos = useCallback((files: File[]) => {
    // Validate files
    let validationError: string | undefined;
    const validFiles = files.filter(file => {
      // Check image type by MIME type OR by file extension (fallback for browsers that don't provide MIME type)
      const isImageByMime = file.type && file.type.startsWith('image/');
      const isImageByExtension = /\.(jpg|jpeg|png|gif|webp|bmp|heic|heif)$/i.test(file.name);
      const isImage = isImageByMime || isImageByExtension;

      if (!isImage) {
        validationError = t('employee.errorPhotosType');
        logger.warn(`Invalid file type: MIME="${file.type}", name="${file.name}"`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        validationError = t('employee.errorPhotosSize');
        logger.warn(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB - ${file.name}`);
        return false;
      }
      return true;
    });

    // Add valid files
    if (validFiles.length > 0) {
      setNewPhotos(prev => [...prev, ...validFiles]);
      logger.debug(`Added ${validFiles.length} valid photos`);
    }

    // Set or clear error based on validation result
    if (validationError) {
      setErrors(prev => ({ ...prev, photos: validationError }));
    } else if (validFiles.length > 0) {
      // Only clear error if we successfully added files without errors
      setErrors(prev => ({ ...prev, photos: undefined }));
    }
  }, [t]);

  const removeNewPhoto = useCallback((index: number) => {
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeExistingPhoto = useCallback((photoUrl: string) => {
    setExistingPhotoUrls(prev => prev.filter(url => url !== photoUrl));
    setPhotosToRemove(prev => [...prev, photoUrl]);
  }, []);

  // Upload photos to Cloudinary
  const uploadPhotos = useCallback(async (): Promise<string[]> => {
    if (newPhotos.length === 0) return [];

    setUploadingPhotos(true);
    try {
      // Refresh CSRF token before upload
      logger.debug('🛡️ Refreshing CSRF token before photo upload...');
      await refreshToken();
      await new Promise(resolve => setTimeout(resolve, 500));

      const formDataPayload = new FormData();
      newPhotos.forEach(photo => {
        formDataPayload.append('images', photo);
      });

      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/upload/images`, {
        method: 'POST',
        body: formDataPayload
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle rate limit error with user-friendly message
        if (response.status === 429) {
          throw new Error(t('employee.errorRateLimitExceeded', 'Too many requests. Please wait a few minutes and try again.'));
        }
        throw new Error(data.error || 'Failed to upload photos');
      }

      return (data as CloudinaryUploadResponse).images.map((img) => img.url);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Upload failed';
      logger.error('Photo upload error:', msg);
      throw error;
    } finally {
      setUploadingPhotos(false);
    }
  }, [newPhotos, secureFetch, refreshToken, t]);

  // Validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('employee.errorNameRequired');
    }

    // v10.x - Sex is required
    if (!formData.sex) {
      newErrors.sex = t('employee.errorSexRequired', 'Please select a gender');
    }

    if (formData.age) {
      const age = parseInt(formData.age);
      if (age < 18 || age > 80) {
        newErrors.age = t('employee.errorAgeRange');
      }
    }

    // Check if we have at least one photo (existing or new)
    const totalPhotos = existingPhotoUrls.length + newPhotos.length;
    if (totalPhotos === 0) {
      newErrors.photos = t('employee.errorPhotosRequired');
    }

    // Business rule: Regular employees MUST have an establishment
    // If no establishment in regular mode → auto-switch to Freelance
    if (!isFreelanceMode && !formData.current_establishment_id) {
      // Auto-switch to Freelance mode
      setIsFreelanceMode(true);

      // Trigger highlight animation
      setFreelanceHighlight(true);
      setTimeout(() => setFreelanceHighlight(false), 1500);

      // Show toast explaining what happened
      toast.info(t(
        'employee.autoSwitchedToFreelance',
        'Switched to Freelance mode (no establishment selected). Click Submit again to confirm.'
      ));

      // Block this submission - user must re-click Submit
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.name, formData.sex, formData.age, formData.current_establishment_id, isFreelanceMode, existingPhotoUrls.length, newPhotos.length, t]);

  // Form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      // Upload new photos
      const newUploadedUrls = await uploadPhotos();

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

      const submitData: EmployeeSubmitData = {
        name: formData.name.trim(),
        nickname: formData.nickname.trim() || undefined,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        sex: formData.sex as 'male' | 'female' | 'ladyboy', // v10.x - Gender (required)
        nationality: formData.nationality,
        languages_spoken: formData.languages_spoken,
        description: formData.description.trim() || undefined,
        photos: finalPhotoUrls,
        social_media: Object.keys(mappedSocialMedia).length > 0 ? mappedSocialMedia : undefined,
        // Send null explicitly when empty to tell backend to clear association
        current_establishment_id: formData.current_establishment_id || null,
        is_freelance: isFreelanceMode
      };

      // DEBUG: Log what we're submitting
      console.log('🏢 EmployeeForm submitData:', JSON.stringify({
        current_establishment_id: submitData.current_establishment_id,
        formData_current_establishment_id: formData.current_establishment_id,
        is_freelance: submitData.is_freelance
      }));

      onSubmit(submitData);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Submission failed';
      setErrors(prev => ({ ...prev, submit: msg }));
    }
  }, [formData, existingPhotoUrls, isFreelanceMode, validateForm, uploadPhotos, onSubmit]);

  const setSubmitError = useCallback((error: string) => {
    setErrors(prev => ({ ...prev, submit: error }));
  }, []);

  return {
    formData,
    newPhotos,
    existingPhotoUrls,
    errors,
    isFreelanceMode,
    uploadingPhotos,
    // Freelance warning
    showFreelanceWarning,
    warningEstablishment,
    handleConfirmFreelanceSwitch,
    handleCancelFreelanceSwitch,
    // Freelance highlight animation
    freelanceHighlight,
    // Handlers
    handleInputChange,
    handleNationalityChange,
    handleLanguagesChange,
    handleSexChange, // v10.x - Gender handler
    handleEstablishmentChange,
    handleFreelanceModeChange,
    addNewPhotos,
    removeNewPhoto,
    removeExistingPhoto,
    handleSubmit,
    setSubmitError
  };
}
