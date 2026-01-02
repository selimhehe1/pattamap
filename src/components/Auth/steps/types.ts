/**
 * Shared types for MultiStepRegisterForm step components
 */

import { Employee, Establishment, EstablishmentCategory } from '../../../types';

// ============================================
// Account Types
// ============================================

export type AccountType = 'regular' | 'employee' | 'establishment_owner';
export type EmployeePath = 'claim' | 'create' | null;
export type OwnerPath = 'claim' | 'create' | null;

// ============================================
// Form Data Types
// ============================================

export interface CredentialsData {
  pseudonym: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface EmployeeProfileData {
  employeeName: string;
  employeeNickname: string;
  employeeAge: string;
  employeeNationality: string[] | null;
  employeeDescription: string;
  photos: File[];
}

export interface EmployeeEmploymentData {
  isFreelance: boolean;
  freelanceZone: string;
  establishmentId: string;
}

export interface SocialMediaData {
  ig: string;
  fb: string;
  line: string;
  tg: string;
  wa: string;
}

export interface OwnershipRequestData {
  ownerPath: OwnerPath;
  selectedEstablishmentToClaim: Establishment | null;
  ownershipDocuments: File[];
  ownershipRequestMessage: string;
  ownershipContactMe: boolean;
}

export interface NewEstablishmentData {
  newEstablishmentName: string;
  newEstablishmentAddress: string;
  newEstablishmentZone: string;
  newEstablishmentCategoryId: number | null;
  newEstablishmentDescription: string;
  newEstablishmentPhone: string;
  newEstablishmentWebsite: string;
  newEstablishmentInstagram: string;
  newEstablishmentTwitter: string;
  newEstablishmentTiktok: string;
  newEstablishmentLogo: File | null;
}

export interface EmployeeClaimData {
  employeePath: EmployeePath;
  selectedEmployee: Employee | null;
  claimMessage: string;
}

// ============================================
// Complete Form Data (all steps combined)
// ============================================

export interface MultiStepFormData extends
  CredentialsData,
  EmployeeProfileData,
  EmployeeEmploymentData,
  OwnershipRequestData,
  NewEstablishmentData,
  EmployeeClaimData {
  [key: string]: unknown;
  accountType: AccountType;
  socialMedia: SocialMediaData;
}

// ============================================
// Validation Status Types
// ============================================

/** Must match FormField's FieldStatus type */
export type FieldStatus = 'valid' | 'invalid' | 'validating' | 'untouched';

export interface CredentialsFieldStatus {
  pseudonym?: FieldStatus;
  email?: FieldStatus;
  password?: FieldStatus;
  confirmPassword?: FieldStatus;
}

export interface CredentialsErrors {
  pseudonym?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

// ============================================
// Grouped Establishments Type (for autocomplete)
// ============================================

export interface GroupedEstablishments {
  groupedByZone: Record<string, Establishment[]>;
  sortedZones: string[];
}

// ============================================
// Search Results Types
// ============================================

export interface EmployeeSearchResults {
  employees: Employee[];
  total?: number;
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ============================================
// Document Preview Type
// ============================================

export interface DocumentPreview {
  file: File;
  url: string;
  name: string;
}

// ============================================
// Step Navigation Props (common to all steps)
// ============================================

export interface StepNavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  isLoading?: boolean;
}

// ============================================
// Categories for establishment creation
// ============================================

export type { EstablishmentCategory };
