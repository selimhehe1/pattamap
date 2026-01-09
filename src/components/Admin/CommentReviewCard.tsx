/**
 * Comment Review Card component for CommentsAdmin grid view
 * Premium full-bleed design with quote styling, rating glow, and 3D tilt
 *
 * Uses CSS classes from:
 * - src/styles/admin/admin-employee-card.css (.aec-* and .arc-* classes)
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { use3DTilt } from '../../hooks/use3DTilt';
import AdminCardFooter from './AdminCardFooter';
import {
  Eye,
  AlertTriangle,
  User,
  ArrowRight,
  Check
} from 'lucide-react';
import StarRating from '../Common/StarRating';

interface CommentReviewCardProps {
  comment: {
    id: number;
    rating: number;
    content: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    user?: {
      id: number;
      pseudonym: string;
    };
    employee?: {
      id: number;
      name: string;
      nickname?: string;
      photos?: string[];
    };
    reports?: Array<{
      id: number;
      reason: string;
    }>;
  };
  isProcessing: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: number) => void;
  onViewDetails: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onDismissReports?: (id: number) => void;
}

const getStatusModifier = (status: string): string => {
  switch (status) {
    case 'pending': return 'aec-status-badge--pending';
    case 'approved': return 'aec-status-badge--approved';
    case 'rejected': return 'aec-status-badge--rejected';
    default: return '';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending': return 'NEW';
    case 'approved': return 'OK';
    case 'rejected': return 'NO';
    default: return status.toUpperCase();
  }
};

export const CommentReviewCard: React.FC<CommentReviewCardProps> = ({
  comment,
  isProcessing,
  isSelected = false,
  onToggleSelection,
  onViewDetails,
  onApprove,
  onReject,
  onDismissReports,
}) => {
  const { t } = useTranslation();

  // 3D Tilt effect hook
  const tiltRef = use3DTilt<HTMLDivElement>({
    maxTilt: 10,
    scale: 1.02,
    glowColor: comment.reports && comment.reports.length > 0
      ? 'rgba(239, 68, 68, 0.4)'
      : 'rgba(255, 215, 0, 0.4)',
  });

  const handleCardClick = () => {
    onViewDetails();
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection?.(comment.id);
  };

  const isPending = comment.status === 'pending';
  const isReported = comment.reports && comment.reports.length > 0;
  const showFooter = isPending || isReported;

  // Wrapper callbacks to convert string id back to number
  const handleApprove = useCallback((id: string) => onApprove(Number(id)), [onApprove]);
  const handleReject = useCallback((id: string) => onReject(Number(id)), [onReject]);
  const handleDismiss = useCallback((id: string) => onDismissReports?.(Number(id)), [onDismissReports]);

  // Employee display
  const employeeName = comment.employee?.nickname || comment.employee?.name || t('admin.unknownEmployee');
  const employeeInitial = (comment.employee?.name || 'E').charAt(0).toUpperCase();

  // Truncate comment text (handle null/undefined)
  const commentText = comment.content || '';
  const truncatedComment = commentText.length > 120
    ? commentText.substring(0, 120) + '...'
    : commentText;

  return (
    <div
      ref={tiltRef}
      className={`aec-card--fullbleed ${showFooter ? 'aec-card--pending' : ''} ${isReported ? 'arc-card--reported' : ''}`}
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); }}
    >
      {/* 1. Background - Employee Photo or Initial */}
      <div className="aec-image">
        {comment.employee?.photos && comment.employee.photos.length > 0 ? (
          <img
            src={comment.employee.photos[0]}
            alt={employeeName}
            className="aec-image-inner"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div className="arc-initials-bg">
            <span className="arc-initial">{employeeInitial}</span>
          </div>
        )}
      </div>

      {/* 2. Gradient overlay */}
      <div className="aec-overlay" />

      {/* 3. Reported overlay */}
      {isReported && (
        <div className="arc-reported-overlay">
          <div className="arc-reported-badge">
            <AlertTriangle size={14} />
            {comment.reports?.length} {t('admin.reports', 'Reports')}
          </div>
        </div>
      )}

      {/* 4. Ligne 1: Checkbox seul */}
      {onToggleSelection && (
        <div
          onClick={handleCheckboxClick}
          className={`aec-checkbox ${isSelected ? 'aec-checkbox--selected' : ''}`}
          role="checkbox"
          aria-checked={isSelected}
          aria-label={t('admin.selectComment', 'Select comment')}
        >
          {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
        </div>
      )}

      {/* 5. Ligne 2: Rating */}
      <div className="arc-rating">
        <StarRating rating={comment.rating || 0} readonly size="small" />
        <span className="arc-rating-value">{(comment.rating || 0).toFixed(1)}</span>
      </div>

      {/* 5. Status badge */}
      <div className={`aec-status-badge aec-status-badge--animated ${getStatusModifier(comment.status)}`}>
        {getStatusLabel(comment.status)}
      </div>

      {/* 7. Floating action icons */}
      <div className="aec-floating-actions">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="aec-action-icon"
          aria-label={t('admin.viewDetails', 'View Details')}
        >
          <Eye size={16} />
        </button>
      </div>

      {/* 8. Quote-style comment */}
      <div className="arc-quote">
        <span className="arc-quote-mark arc-quote-mark--open">"</span>
        <p className="arc-quote-text">
          {truncatedComment || <em style={{ opacity: 0.6 }}>{t('admin.noCommentProvided', 'No comment provided')}</em>}
        </p>
        <span className="arc-quote-mark arc-quote-mark--close">"</span>
      </div>

      {/* 9. Info overlay - Reviewer and Employee */}
      <div className="aec-info-overlay">
        <div className="arc-reviewer-line">
          <User size={14} />
          <span className="arc-reviewer-name">{comment.user?.pseudonym || t('admin.anonymous')}</span>
          <ArrowRight size={12} className="arc-arrow" />
          <span className="arc-employee-name">{employeeName}</span>
        </div>
        {comment.employee?.name && comment.employee?.nickname && (
          <div className="arc-employee-fullname">({comment.employee.name})</div>
        )}
      </div>

      {/* 10. Footer actions (pending/reported) */}
      {showFooter && (
        <AdminCardFooter
          itemId={String(comment.id)}
          isProcessing={isProcessing}
          onApprove={isPending ? handleApprove : undefined}
          onReject={isPending ? handleReject : undefined}
          onDismiss={isReported && onDismissReports ? handleDismiss : undefined}
        />
      )}

      {/* 11. Neon border */}
      <div className={`aec-neon-border ${isReported ? 'aec-neon-border--danger' : ''}`} />
    </div>
  );
};

export default CommentReviewCard;
