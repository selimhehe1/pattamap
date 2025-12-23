import React, { useState } from 'react';
// Note: StarRating retiré - commentaires sans étoiles
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';
import ReviewPhotoGallery, { ReviewPhoto } from './ReviewPhotoGallery';
import '../../styles/components/reviews.css';

interface Review {
  id: string;
  user_id: string;
  employee_id: string;
  rating?: number; // Optional - comments can be posted without rating
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    pseudonym: string;
  };
  replies?: Reply[];
  photos?: ReviewPhoto[]; // v10.4 - Photos in reviews
}

interface Reply {
  id: string;
  comment_id?: string; // Optional - ThreadedComment uses parent_id instead
  parent_id?: string | null; // Alternative to comment_id for threaded comments
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  status?: 'pending' | 'approved' | 'rejected';
  employee_id?: string;
  rating?: number;
  user?: {
    id: string;
    pseudonym: string;
  };
  replies?: Reply[]; // Support recursive nested replies (ThreadedComment structure)
}

interface ReviewsListProps {
  reviews: Review[];
  onReply?: (reviewId: string, content: string) => Promise<void>;
  onReport?: (reviewId: string, reason: string) => Promise<void>;
  isLoading?: boolean;
  showTitle?: boolean;
  autoExpandReplies?: boolean;
  onOpenModal?: () => void;
  maxReviews?: number; // Limite le nombre de reviews affichées (pour preview)
}

const ReviewsList: React.FC<ReviewsListProps> = ({
  reviews,
  onReply,
  onReport,
  isLoading = false,
  showTitle = true,
  autoExpandReplies = false,
  onOpenModal,
  maxReviews
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  // Auto-expand all replies if autoExpandReplies is true
  React.useEffect(() => {
    if (autoExpandReplies) {
      const allReviewIds = new Set(reviews.map(review => review.id));
      setExpandedReviews(allReviewIds);
    }
  }, [autoExpandReplies, reviews]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<string>('');
  const [reportingReview, setReportingReview] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>('');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return t('reviewsList.dateToday');
    } else if (diffInDays === 1) {
      return t('reviewsList.dateYesterday');
    } else if (diffInDays < 7) {
      return t('reviewsList.dateDaysAgo', { count: diffInDays });
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return t(weeks === 1 ? 'reviewsList.dateWeekAgo' : 'reviewsList.dateWeeksAgo', { count: weeks });
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return t(months === 1 ? 'reviewsList.dateMonthAgo' : 'reviewsList.dateMonthsAgo', { count: months });
    } else {
      return date.toLocaleDateString();
    }
  };

  const toggleExpanded = (reviewId: string) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
    }
    setExpandedReviews(newExpanded);
  };

  const handleReplySubmit = async (reviewId: string) => {
    if (!replyContent.trim() || !onReply) return;
    
    try {
      await onReply(reviewId, replyContent.trim());
      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      logger.error('Failed to submit reply:', error);
    }
  };

  const handleReportSubmit = async (reviewId: string) => {
    if (!reportReason.trim() || !onReport) return;
    
    try {
      await onReport(reviewId, reportReason.trim());
      setReportReason('');
      setReportingReview(null);
    } catch (error) {
      logger.error('Failed to report review:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="reviews-loading-nightlife">
        <div className="loading-spinner" />
        <p className="loading-text">
          {t('reviewsList.loadingText')}
        </p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="reviews-empty-state-nightlife">
        <h3 className="empty-state-title">
          💬 {t('reviewsList.emptyStateTitle')}
        </h3>
        <p className="empty-state-text">
          {t('reviewsList.emptyStateText')}
        </p>
      </div>
    );
  }

  // Limiter le nombre de reviews affichées si maxReviews est spécifié
  const displayedReviews = maxReviews ? reviews.slice(0, maxReviews) : reviews;
  const hasMoreReviews = maxReviews && reviews.length > maxReviews;

  return (
    <div className="reviews-container-nightlife">
      {showTitle && (
        <h3
          className={`reviews-title-nightlife ${onOpenModal ? 'reviews-title-clickable' : ''}`}
          onClick={onOpenModal}
          title={onOpenModal ? t('reviewsList.titleViewAllModal') : undefined}
        >
          💬 {t('reviewsList.titleReviews', { count: reviews.length })}
        </h3>
      )}

      <div className="reviews-list-nightlife">
        {displayedReviews.map((review) => (
          <div
            key={review.id}
            className="review-card-nightlife"
          >
            {/* Review Header */}
            <div className="review-header-nightlife">
              <div className="review-author-section">
                <div className="review-avatar-nightlife">
                  {review.user?.pseudonym?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="review-author-info">
                  <div className="review-author-name">
                    {review.user?.pseudonym || t('reviewsList.anonymous')}
                  </div>
                  <div className="review-date">
                    {formatDate(review.created_at)}
                  </div>
                </div>
              </div>

              <div className="review-rating-actions">
                {/* Note: Étoiles supprimées - ratings et commentaires séparés */}

                {user && user.id !== review.user_id && (
                  <button
                    onClick={() => setReportingReview(reportingReview === review.id ? null : review.id)}
                    className="review-report-btn-nightlife"
                    aria-label={t('reviewsList.ariaReportReview', { author: review.user?.pseudonym || t('reviewsList.anonymous') })}
                    title={t('reviewsList.titleReportReview')}
                  >
                    ⚠️
                  </button>
                )}
              </div>
            </div>

            {/* Review Content */}
            <div className="review-content-nightlife">
              {review.content}
            </div>

            {/* Review Photos - v10.4 */}
            {review.photos && review.photos.length > 0 && (
              <ReviewPhotoGallery photos={review.photos} />
            )}

            {/* Review Actions */}
            <div className="review-actions-nightlife">
              {user && onReply && (
                <button
                  onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)}
                  className="review-reply-btn-nightlife"
                  aria-label={t('reviewsList.ariaReplyToReview', { author: review.user?.pseudonym || t('reviewsList.anonymous') })}
                >
                  💬 {t('reviewsList.buttonReply')}
                </button>
              )}

              {review.replies && review.replies.length > 0 && !autoExpandReplies && (
                <button
                  onClick={() => toggleExpanded(review.id)}
                  className="review-expand-btn-nightlife"
                  aria-label={t('reviewsList.ariaExpandReplies', {
                    action: expandedReviews.has(review.id) ? t('reviewsList.collapseAction') : t('reviewsList.expandAction'),
                    count: review.replies.length
                  })}
                  aria-expanded={expandedReviews.has(review.id)}
                >
                  {expandedReviews.has(review.id) ? '▼' : '▶'} {t(review.replies.length === 1 ? 'reviewsList.repliesCountSingular' : 'reviewsList.repliesCountPlural', { count: review.replies.length })}
                </button>
              )}

              {review.replies && review.replies.length > 0 && autoExpandReplies && (
                <span className="review-replies-counter">
                  💬 {t('reviewsList.repliesCounter', { count: review.replies.length })}
                </span>
              )}
            </div>

            {/* Reply Form */}
            {replyingTo === review.id && (
              <div className="reply-form-container-nightlife">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={t('reviewsList.placeholderReply')}
                  className="reply-textarea-nightlife"
                />
                <div className="reply-form-actions">
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="reply-cancel-btn"
                    aria-label={t('reviewsList.ariaCancelReply')}
                  >
                    {t('reviewsList.buttonCancel')}
                  </button>
                  <button
                    onClick={() => handleReplySubmit(review.id)}
                    disabled={!replyContent.trim()}
                    className={`reply-submit-btn ${!replyContent.trim() ? 'disabled' : ''}`}
                    aria-label={t('reviewsList.ariaSubmitReply')}
                  >
                    {t('reviewsList.buttonSubmitReply')}
                  </button>
                </div>
              </div>
            )}

            {/* Report Form */}
            {reportingReview === review.id && (
              <div className="report-form-container-nightlife">
                <h4 className="report-form-title">
                  {t('reviewsList.reportFormTitle')}
                </h4>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder={t('reviewsList.placeholderReportReason')}
                  className="report-textarea-nightlife"
                />
                <div className="report-form-actions">
                  <button
                    onClick={() => setReportingReview(null)}
                    className="report-cancel-btn"
                    aria-label={t('reviewsList.ariaCancelReport')}
                  >
                    {t('reviewsList.buttonCancel')}
                  </button>
                  <button
                    onClick={() => handleReportSubmit(review.id)}
                    disabled={!reportReason.trim()}
                    className={`report-submit-btn ${!reportReason.trim() ? 'disabled' : ''}`}
                    aria-label={t('reviewsList.ariaSubmitReport')}
                  >
                    {t('reviewsList.buttonSubmitReport')}
                  </button>
                </div>
              </div>
            )}

            {/* Replies */}
            {(expandedReviews.has(review.id) || autoExpandReplies) && review.replies && review.replies.length > 0 && (
              <div className="replies-container-nightlife">
                {review.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className="reply-card-nightlife"
                  >
                    <div className="reply-header-nightlife">
                      <div className="reply-avatar-nightlife">
                        {reply.user?.pseudonym?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="reply-author-info">
                        <div className="reply-author-name">
                          <span className="reply-indicator">↳</span>
                          {reply.user?.pseudonym || t('reviewsList.anonymous')}
                        </div>
                        <div className="reply-date">
                          {formatDate(reply.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="reply-content-nightlife">
                      {reply.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bouton "Voir tous les reviews" si limité */}
      {hasMoreReviews && onOpenModal && (
        <div className="reviews-see-more-container">
          <button
            onClick={onOpenModal}
            className="reviews-see-more-btn-nightlife"
            aria-label={t('reviewsList.ariaViewAllReviews', { count: reviews.length })}
          >
            📖 {t('reviewsList.buttonViewAllReviews', { count: reviews.length })}
          </button>
        </div>
      )}

      {/* Loading Animation CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ReviewsList;