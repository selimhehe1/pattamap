/**
 * useEmployeeFormState hook
 * Manages all form state and handlers for EmployeeForm
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSecureFetch } from '../../../../hooks/useSecureFetch';
import { useCSRF } from '../../../../contexts/CSRFContext';
import { logger } from '../../../../utils/logger';
import type { Employee, CloudinaryUploadResponse } from '../../../../types';
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

  // Form data
  const [formData, setFormData] = useState<InternalFormData>(INITIAL_FORM_DATA);

  // Photo management
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [photosToRemove, setPhotosToRemove] = useState<string[]>([]);

  // UI state
  const [errors, setErrors] = useState<FormErrors>(INITIAL_ERRORS);
  const [isFreelanceMode, setIsFreelanceMode] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      const socialMedia = initialData.social_media as FormSocialMedia | undefined;

      setFormData({
        name: initialData.name || '',
        nickname: initialData.nickname || '',
        age: initialData.age?.toString() || '',
        nationality: initialData.nationality || null,
        description: initialData.description || '',
        social_media: {
          ig: socialMedia?.ig || '',
          fb: socialMedia?.fb || '',
          line: socialMedia?.line || '',
          tg: socialMedia?.tg || '',
          wa: socialMedia?.wa || ''
        },
        current_establishment_id: initialData.current_establishment_id || ''
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

  const handleEstablishmentChange = useCallback((establishmentId: string) => {
    setFormData(prev => ({ ...prev, current_establishment_id: establishmentId }));
  }, []);

  const handleFreelanceModeChange = useCallback((isFreelance: boolean) => {
    setIsFreelanceMode(isFreelance);
    if (!isFreelance) {
      setFormData(prev => ({ ...prev, current_establishment_id: '' }));
    }
  }, []);

  // Photo handlers
  const addNewPhotos = useCallback((files: File[]) => {
    // Validate files
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

    setNewPhotos(prev => [...prev, ...validFiles]);
    setErrors(prev => ({ ...prev, photos: undefined }));
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
  }, [newPhotos, secureFetch, refreshToken]);

  // Validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('employee.errorNameRequired');
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.name, formData.age, existingPhotoUrls.length, newPhotos.length, t]);

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
        nationality: formData.nationality,
        description: formData.description.trim() || undefined,
        photos: finalPhotoUrls,
        social_media: Object.keys(mappedSocialMedia).length > 0 ? mappedSocialMedia : undefined,
        current_establishment_id: formData.current_establishment_id || undefined,
        is_freelance: isFreelanceMode
      };

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
    handleInputChange,
    handleNationalityChange,
    handleEstablishmentChange,
    handleFreelanceModeChange,
    addNewPhotos,
    removeNewPhoto,
    removeExistingPhoto,
    handleSubmit,
    setSubmitError
  };
}
