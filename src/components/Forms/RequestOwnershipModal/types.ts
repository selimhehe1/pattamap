/**
 * Types for RequestOwnershipModal
 *
 * Shared interfaces and types for the ownership request wizard.
 */

import { Establishment } from '../../../types';

/**
 * Props for the main RequestOwnershipModal component
 */
export interface RequestOwnershipModalProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

/**
 * Document preview state for uploaded files
 */
export interface DocumentPreview {
  file: File;
  url: string;
  name: string;
}

/**
 * Request body sent to the API
 */
export interface OwnershipRequestBody {
  documents_urls: string[];
  verification_code?: string;
  request_message?: string;
  establishment_id?: string;
  establishment_data?: Partial<Establishment>;
}

/**
 * New establishment form data
 */
export interface NewEstablishmentData {
  name: string;
  address: string;
  zone: string;
  category_id: string;
  latitude: number;
  longitude: number;
  description: string;
  phone: string;
  website: string;
  instagram: string;
  twitter: string;
  tiktok: string;
}

/**
 * Step type for the wizard
 */
export type StepNumber = 1 | 2 | 3;

/**
 * Props for StepIndicator component
 */
export interface StepIndicatorProps {
  currentStep: StepNumber;
}

/**
 * Props for Step1 - Establishment Selection
 */
export interface Step1Props {
  establishments: Establishment[];
  selectedEstablishment: Establishment | null;
  createMode: boolean;
  categories: { id: string; name: string }[];
  newEstablishment: NewEstablishmentData;
  onEstablishmentSelect: (establishment: Establishment | null) => void;
  onCreateModeChange: (createMode: boolean) => void;
  onNewEstablishmentChange: (data: NewEstablishmentData) => void;
}

/**
 * Props for Step2 - Document Upload
 */
export interface Step2Props {
  documents: DocumentPreview[];
  isDragging: boolean;
  isUploading: boolean;
  onFileSelect: (files: FileList | null) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onRemoveDocument: (index: number) => void;
}

/**
 * Props for Step3 - Confirmation
 */
export interface Step3Props {
  createMode: boolean;
  selectedEstablishment: Establishment | null;
  newEstablishmentName: string;
  documentsCount: number;
  verificationCode: string;
  requestMessage: string;
  onVerificationCodeChange: (code: string) => void;
  onRequestMessageChange: (message: string) => void;
}

/**
 * Default values for new establishment
 */
export const DEFAULT_NEW_ESTABLISHMENT: NewEstablishmentData = {
  name: '',
  address: '',
  zone: '',
  category_id: '',
  latitude: 0,
  longitude: 0,
  description: '',
  phone: '',
  website: '',
  instagram: '',
  twitter: '',
  tiktok: ''
};
