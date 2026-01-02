import { Establishment } from '../../../types';

/**
 * Shared types for EmployeeFormContent components
 */

// Internal form state for social media (using abbreviations)
export interface FormSocialMedia {
  ig: string;
  fb: string;
  line: string;
  tg: string;
  wa: string;
}

// Internal form data type
export interface InternalFormData {
  name: string;
  nickname: string;
  age: string;
  nationality: string[] | null;
  description: string;
  social_media: FormSocialMedia;
  current_establishment_id: string;
}

// Extended form data type for submission (includes freelance fields)
export interface EmployeeSubmitData {
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

// ============================================
// Component Props
// ============================================

export interface BasicInfoSectionProps {
  formData: InternalFormData;
  errors: Record<string, string>;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onNationalityChange: (nationalities: string[] | null) => void;
}

export interface PhotosSectionProps {
  photos: File[];
  existingPhotos: string[];
  photosToRemove: string[];
  errors: Record<string, string>;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
  onRemoveExistingPhoto: (photoUrl: string) => void;
  onRestoreExistingPhoto: (photoUrl: string) => void;
}

export interface FreelanceModeSectionProps {
  isFreelanceMode: boolean;
  selectedNightclubs: string[];
  establishments: Establishment[];
  onFreelanceModeChange: (checked: boolean) => void;
  onNightclubToggle: (nightclubId: string, checked: boolean) => void;
}

export interface EstablishmentSectionProps {
  establishments: Establishment[];
  currentEstablishmentId: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export interface SocialMediaSectionProps {
  socialMedia: FormSocialMedia;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface FreelanceWarningModalProps {
  establishmentName: string;
  categoryName: string;
  onConfirm: () => void;
  onCancel: () => void;
}
