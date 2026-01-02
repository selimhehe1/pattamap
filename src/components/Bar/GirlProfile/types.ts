/**
 * Shared types for GirlProfile components
 */

import { EmploymentHistory } from '../../../types';

// ============================================
// Employment Card Props
// ============================================

export interface EmploymentCardProps {
  employment: EmploymentHistory;
  /** If true, shows date range instead of "Since" */
  isPast?: boolean;
  /** Callback when "Visit Bar" is clicked */
  onNavigate: (establishmentId: string) => void;
}

// ============================================
// Employment Section Props
// ============================================

export interface EmploymentSectionProps {
  currentEmployment: EmploymentHistory[];
  pastEmployment: EmploymentHistory[];
  showHistory: boolean;
  onToggleHistory: () => void;
  onNavigate: (establishmentId: string) => void;
}

// ============================================
// Social Media Types
// ============================================

export interface SocialMediaLinksProps {
  socialMedia: Record<string, string | undefined>;
  employeeName: string;
}

export type SocialMediaPlatform = 'instagram' | 'line' | 'telegram' | 'whatsapp' | 'facebook';

// ============================================
// Re-export types from main types
// ============================================

export type { EmploymentHistory };
