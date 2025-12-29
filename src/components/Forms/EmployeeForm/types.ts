/**
 * EmployeeForm types
 * Extracted from EmployeeForm.tsx for reusability
 */

import type { Employee } from '../../../types';

export interface FormSocialMedia {
  ig: string;
  fb: string;
  line: string;
  tg: string;
  wa: string;
}

export interface InternalFormData {
  name: string;
  nickname: string;
  age: string;
  nationality: string[] | null;
  languages_spoken: string[] | null;
  description: string;
  social_media: FormSocialMedia;
  current_establishment_id: string;
}

export interface EmployeeSubmitData {
  name: string;
  nickname?: string;
  age?: number;
  nationality?: string[] | null;
  languages_spoken?: string[] | null;
  description?: string;
  photos: string[];
  social_media?: Record<string, string>;
  current_establishment_id?: string;
  is_freelance?: boolean;
}

export interface EmployeeFormProps {
  onSubmit: (employeeData: EmployeeSubmitData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<Employee> & { current_establishment_id?: string };
}

export interface FormErrors {
  name?: string;
  age?: string;
  photos?: string;
  submit?: string;
}

export const INITIAL_FORM_DATA: InternalFormData = {
  name: '',
  nickname: '',
  age: '',
  nationality: null,
  languages_spoken: null,
  description: '',
  social_media: { ig: '', fb: '', line: '', tg: '', wa: '' },
  current_establishment_id: ''
};

export const INITIAL_ERRORS: FormErrors = {};
