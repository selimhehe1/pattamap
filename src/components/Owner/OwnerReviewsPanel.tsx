import React, { useState, useEffect, useCallback } from 'react';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useCSRF } from '../../contexts/CSRFContext';
import { useTranslation } from 'react-i18next';
import { logger } from '../../utils/logger';
import ReviewPhotoGallery, { ReviewPhoto } from '../Review/ReviewPhotoGallery';
import '../../styles/features/owner/OwnerReviewsPanel.css';

interface Review {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_photo?: string;
  user_pseudonym: string;
  rating: number;
  content: string;
  photos?: ReviewPhoto[];
  created_at: string;
  has_establishment_response: boolean;
  establishment_response?: {
    content: string;
    created_at: string;
  };
}

interface Props {
  establishmentId: string;
  establishmentName: string;
}

type FilterType = 'all' | 'pending' | 'responded';

// Helper function to format relative time without date-fns
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
};

const OwnerReviewsPanel: React.FC<Props> = ({
  establishmentId,
  establishmentName
}) => {
  const { secureFetch } = useSecureFetch();
  const { csrfToken, refreshToken, loading: csrfLoading } = useCSRF();
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseContent, setResponseContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchReviews = useCallback(async (pageNum: number = 1, reset: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      setError(null);

      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/comments/establishment/${establishmentId}/reviews?page=${pageNum}&limit=20`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();
      const newReviews = data.reviews || [];

      if (reset || pageNum === 1) {
        setReviews(newReviews);
      } else {
        setReviews(prev => [...prev, ...newReviews]);
      }

      setHasMore(newReviews.length === 20);
      setPage(pageNum);
    } catch (error) {
      logger.error('Failed to fetch reviews:', error);
      setError(t('reviews.owner.fetchError', 'Failed to load reviews. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [establishmentId, secureFetch, t]);

  useEffect(() => {
    fetchReviews(1, true);
  }, [fetchReviews]);

  const handleSubmitResponse = async (reviewId: string) => {
    if (!responseContent.trim() || responseContent.length < 10) {
      return;
    }

    setSubmitting(true);
    try {
      // Ensure we have a CSRF token
      let token: string | null = csrfToken;
      if (!token) {
        token = await refreshToken();
      }

      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/comments/${reviewId}/establishment-response`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': token ?? ''
          },
          body: JSON.stringify({
            content: responseContent,
            establishment_id: establishmentId
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit response');
      }

      // Update the review in state with the new response
      setReviews(prev => prev.map(review => {
        if (review.id === reviewId) {
          return {
            ...review,
            has_establishment_response: true,
            establishment_response: {
              content: responseContent,
              created_at: new Date().toISOString()
            }
          };
        }
        return review;
      }));

      setRespondingTo(null);
      setResponseContent('');
    } catch (error) {
      logger.error('Failed to submit response:', error);
      setError(t('reviews.owner.responseError', 'Failed to submit response. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReviews = reviews.filter(review => {
    if (filter === 'pending') return !review.has_establishment_response;
    if (filter === 'responded') return review.has_establishment_response;
    return true;
  });

  const renderStars = (rating: number) => {
    return (
      <div className="review-stars">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className={`star ${star <= rating ? 'filled' : ''}`}>
            ★
          </span>
        ))}
      </div>
    );
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="owner-reviews-panel">
        <div className="panel-header">
          <h3>{t('reviews.owner.panelTitle')}</h3>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (error && reviews.length === 0) {
    return (
      <div className="owner-reviews-panel">
        <div className="panel-header">
          <h3>{t('reviews.owner.panelTitle')}</h3>
        </div>
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button onClick={() => fetchReviews(1, true)} className="btn-retry">
            {t('common.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="owner-reviews-panel">
      <div className="panel-header">
        <h3>{t('reviews.owner.panelTitle')}</h3>
        <p className="establishment-name">{establishmentName}</p>
      </div>

      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          {t('reviews.owner.filterAll')} ({reviews.length})
        </button>
        <button
          className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          {t('reviews.owner.filterPending')} ({reviews.filter(r => !r.has_establishment_response).length})
        </button>
        <button
          className={`filter-tab ${filter === 'responded' ? 'active' : ''}`}
          onClick={() => setFilter('responded')}
        >
          {t('reviews.owner.filterResponded')} ({reviews.filter(r => r.has_establishment_response).length})
        </button>
      </div>

      {filteredReviews.length === 0 ? (
        <div className="no-reviews">
          <p>{t('reviews.owner.noReviews')}</p>
        </div>
      ) : (
        <div className="reviews-list">
          {filteredReviews.map(review => (
            <div key={review.id} className="review-item">
              <div className="review-header">
                <div className="employee-info">
                  {review.employee_photo && (
                    <img
                      src={review.employee_photo}
                      alt={review.employee_name}
                      className="employee-avatar"
                    />
                  )}
                  <div className="employee-details">
                    <span className="employee-name">{review.employee_name}</span>
                    {renderStars(review.rating)}
                  </div>
                </div>
                <div className="review-meta">
                  <span className="reviewer-name">{review.user_pseudonym}</span>
                  <span className="review-date">
                    {formatRelativeTime(review.created_at)}
                  </span>
                </div>
              </div>

              <div className="review-content">
                <p>{review.content}</p>
              </div>

              {review.photos && review.photos.length > 0 && (
                <ReviewPhotoGallery photos={review.photos} />
              )}

              {review.has_establishment_response && review.establishment_response ? (
                <div className="establishment-response">
                  <div className="response-header">
                    <span className="response-badge">{t('reviews.establishmentResponse')}</span>
                    <span className="response-date">
                      {formatRelativeTime(review.establishment_response.created_at)}
                    </span>
                  </div>
                  <p className="response-content">{review.establishment_response.content}</p>
                </div>
              ) : (
                <div className="response-section">
                  {respondingTo === review.id ? (
                    <div className="response-form">
                      <label htmlFor={`response-${review.id}`}>
                        {t('reviews.owner.responseLabel')}
                      </label>
                      <textarea
                        id={`response-${review.id}`}
                        value={responseContent}
                        onChange={(e) => setResponseContent(e.target.value)}
                        placeholder={t('reviews.owner.responsePlaceholder')}
                        rows={3}
                        disabled={submitting || csrfLoading}
                      />
                      <div className="response-actions">
                        <button
                          className="btn-cancel"
                          onClick={() => {
                            setRespondingTo(null);
                            setResponseContent('');
                          }}
                          disabled={submitting}
                        >
                          {t('common.cancel', 'Cancel')}
                        </button>
                        <button
                          className="btn-submit"
                          onClick={() => handleSubmitResponse(review.id)}
                          disabled={submitting || csrfLoading || responseContent.length < 10}
                        >
                          {submitting ? t('common.submitting', 'Submitting...') : t('reviews.owner.submitResponse')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn-respond"
                      onClick={() => setRespondingTo(review.id)}
                    >
                      {t('reviews.owner.respondButton')}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <div className="load-more">
              <button
                onClick={() => fetchReviews(page + 1)}
                disabled={loading}
                className="btn-load-more"
              >
                {loading ? t('common.loading', 'Loading...') : t('common.loadMore', 'Load More')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OwnerReviewsPanel;
