/**
 * Shared types for VerificationsAdmin components
 */

export interface RecentVerification {
  id: string;
  employee_id: string;
  selfie_url: string;
  face_match_score: number;
  status: 'pending' | 'approved' | 'rejected' | 'revoked' | 'manual_review';
  submitted_at: string;
  auto_approved: boolean;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  employee: {
    id: string;
    name: string;
    photos: string[];
  };
}

export interface VerificationGroup {
  employee: {
    id: string;
    name: string;
    photos: string[];
  };
  verifications: RecentVerification[];
  latestStatus: string;
  totalAttempts: number;
  approvedCount: number;
  rejectedCount: number;
}

export type FilterType = 'all' | 'manual_review' | 'approved' | 'rejected';

export interface VerificationStats {
  total: number;
  manualReview: number;
  approved: number;
  rejected: number;
}

// ============================================
// Component Props
// ============================================

export interface VerificationCardProps {
  group: VerificationGroup;
  isProcessing: boolean;
  onReview: (verificationId: string, action: 'approve' | 'reject') => void;
  onRevoke: (employeeId: string, employeeName: string) => void;
  onViewTimeline: (group: VerificationGroup) => void;
  onViewProfile: (group: VerificationGroup) => void;
}

export interface TimelineModalProps {
  group: VerificationGroup;
  onClose: () => void;
}

export interface RevokeModalProps {
  employeeId: string;
  employeeName: string;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}
