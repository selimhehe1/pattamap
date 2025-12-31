/**
 * Comment Review Card component for CommentsAdmin grid view
 * Premium full-bleed design with quote styling, rating glow, and 3D tilt
 *
 * Uses CSS classes from:
 * - src/styles/admin/admin-employee-card.css (.aec-* and .arc-* classes)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { use3DTilt } from '../../hooks/use3DTilt';
import {
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  User,
  ArrowRight,
  Check,
  FileEdit
} from 'lucide-react';
import StarRating from '../Common/StarRating';

interface CommentReviewCardProps {
  comment: {
    id: number;
    rating: number;
    comment: string;
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
      photo?: string; // For future use
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

  // Employee display
  const employeeName = comment.employee?.nickname || comment.employee?.name || t('admin.unknownEmployee');
  const employeeInitial = (comment.employee?.name || 'E').charAt(0).toUpperCase();

  // Truncate comment text (handle null/undefined)
  const commentText = comment.comment || '';
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
      {/* 1. Background - Gradient + Employee Initial */}
      <div className="aec-image">
        {comment.employee?.photo ? (
          <img
            src={comment.employee.photo}
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

      {/* 4. Rating - top left with glow */}
      <div className="arc-rating">
        <StarRating rating={comment.rating || 0} readonly size="small" />
        <span className="arc-rating-value">{(comment.rating || 0).toFixed(1)}</span>
      </div>

      {/* 5. Status badge */}
      <div className={`aec-status-badge aec-status-badge--animated ${getStatusModifier(comment.status)}`}>
        {getStatusLabel(comment.status)}
      </div>

      {/* 6. Selection checkbox */}
      {onToggleSelection && (
        <div
          onClick={handleCheckboxClick}
          className={`aec-checkbox ${isSelected ? 'aec-checkbox--selected' : ''}`}
          role="checkbox"
          aria-checked={isSelected}
          aria-label={t('admin.selectComment', 'Select comment')}
          style={{ top: '48px' }} // Below rating
        >
          {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
        </div>
      )}

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
        <div className="aec-footer">
          {isPending && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove(comment.id);
                }}
                disabled={isProcessing}
                className="aec-footer-btn aec-footer-btn--approve"
              >
                {isProcessing ? (
                  <Loader2 size={14} className="aec-icon--spin" />
                ) : (
                  <>
                    <CheckCircle size={14} />
                    {t('admin.approve')}
                  </>
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReject(comment.id);
                }}
                disabled={isProcessing}
                className="aec-footer-btn aec-footer-btn--reject"
              >
                {isProcessing ? (
                  <Loader2 size={14} className="aec-icon--spin" />
                ) : (
                  <>
                    <XCircle size={14} />
                    {t('admin.reject')}
                  </>
                )}
              </button>
            </>
          )}
          {isReported && onDismissReports && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismissReports(comment.id);
              }}
              disabled={isProcessing}
              className="aec-footer-btn aec-footer-btn--dismiss"
            >
              {isProcessing ? (
                <Loader2 size={14} className="aec-icon--spin" />
              ) : (
                <>
                  <FileEdit size={14} />
                  {t('admin.dismiss')}
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* 11. Neon border */}
      <div className={`aec-neon-border ${isReported ? 'aec-neon-border--danger' : ''}`} />
    </div>
  );
};

export default CommentReviewCard;
