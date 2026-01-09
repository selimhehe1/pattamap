import React, { useState, useEffect, useCallback } from 'react';
import { Star, Pencil, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StarRating from '../Common/StarRating';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useOptimisticRating } from '../../hooks/useOptimisticRating';
import { logger } from '../../utils/logger';
import '../../styles/components/user-rating.css';
import '../../styles/features/employee/ValidationSection.css';

interface UserRatingProps {
  employeeId: string;
  onRatingUpdate?: (rating: number) => void;
  className?: string;
}

interface UserRatingData {
  id: string;
  rating: number;
  content: string;
  created_at: string;
}

const UserRating: React.FC<UserRatingProps> = ({
  employeeId,
  onRatingUpdate,
  className = ''
}) => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const { secureFetch } = useSecureFetch();
  const [userRatingData, setUserRatingData] = useState<UserRatingData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newRating, setNewRating] = useState(0);

  // 🆕 Phase 5.3: React 19 optimistic updates for instant UI feedback
  const handleSubmitToServer = useCallback(async (rating: number): Promise<boolean> => {
    try {
      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/comments/user-rating/${employeeId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            rating,
            content: userRatingData ? 'Rating updated' : 'User rating'
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        logger.debug('🎯 Rating submitted successfully:', data);

        // Update the full rating data
        setUserRatingData({
          id: data.comment.id,
          rating: data.comment.rating,
          content: data.comment.content,
          created_at: data.comment.created_at
        });

        return true;
      } else {
        const errorData = await response.json();
        logger.debug('❌ Rating submission failed:', errorData);
        return false;
      }
    } catch (error) {
      logger.error('Failed to submit rating:', error);
      return false;
    }
  }, [secureFetch, employeeId, userRatingData]);

  const {
    optimisticRating,
    isPending,
    hasError,
    error: optimisticError,
    submitRating
  } = useOptimisticRating({
    initialRating: userRatingData?.rating ?? null,
    onSubmit: handleSubmitToServer,
    onSuccess: (rating) => {
      setIsEditing(false);
      setNewRating(0);
      onRatingUpdate?.(rating);
    },
    onError: (error) => {
      logger.error('Optimistic rating error:', error);
    }
  });

  // Fetch user's existing rating
  useEffect(() => {
    if (loading || !user || !employeeId) {
      return;
    }

    const fetchUserRating = async () => {
      try {
        const response = await secureFetch(
          `${import.meta.env.VITE_API_URL}/api/comments/user-rating/${employeeId}`
        );

        if (response.ok) {
          const data = await response.json();
          setUserRatingData(data.user_rating);
        } else {
          const errorData = await response.text();
          logger.debug('⚠️ API error', {
            status: response.status,
            error: errorData
          });
        }
      } catch (error) {
        logger.error('❌ Failed to fetch user rating:', error);
      }
    };

    fetchUserRating();
  }, [user, employeeId, loading, secureFetch]);

  // 🆕 Phase 5.3: Instant submit with optimistic update
  const handleRatingSubmit = () => {
    if (!user || newRating < 1 || newRating > 5) {
      return;
    }
    // This updates UI immediately, then syncs with server
    submitRating(newRating);
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setNewRating(optimisticRating || userRatingData?.rating || 0);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewRating(0);
  };

  // Derive the display rating (use optimistic if available)
  const displayRating = optimisticRating ?? userRatingData?.rating ?? null;
  const errorMessage = hasError ? (optimisticError?.message || t('userRating.errorSaveFailed')) : '';

  if (!user) {
    return (
      <a href="/login" className="validation-section validation-section--login-required">
        <Lock size={16} />
        <span>{t('userRating.loginToRate', 'Login to rate')}</span>
      </a>
    );
  }

  return (
    <div className={`user-rating-container-nightlife ${className}`}>
      <h4 className="user-rating-title-nightlife">
        <Star size={16} style={{ marginRight: '6px', verticalAlign: 'middle', fill: '#FFD700', color: '#FFD700' }} /> {t('userRating.title')}
      </h4>

      {/* Display existing rating - uses optimistic value for instant feedback */}
      {displayRating && !isEditing && (
        <div className="existing-rating-nightlife">
          <div className="rating-display">
            <StarRating rating={displayRating} readonly={true} size="medium" />
            <span className="rating-value">
              {t('userRating.ratingValue', { rating: displayRating })}
              {isPending && <span className="rating-syncing"> ⟳</span>}
            </span>
          </div>
          <button
            onClick={handleEditClick}
            className="edit-rating-btn-nightlife"
            disabled={isPending}
          >
            <Pencil size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('userRating.buttonUpdateRating')}
          </button>
        </div>
      )}

      {/* Rating form */}
      {(!displayRating || isEditing) && (
        <div className="rating-form-nightlife">
          <div className="rating-input-section">
            <label className="rating-label">
              {displayRating ? t('userRating.labelUpdateRating') : t('userRating.labelRateEmployee')}
            </label>
            <StarRating
              rating={newRating}
              onChange={setNewRating}
              readonly={isPending}
              size="large"
            />
          </div>

          {/* Error display */}
          {errorMessage && (
            <div className="rating-error-nightlife">
              {errorMessage}
            </div>
          )}

          <div className="rating-form-actions">
            {isEditing && (
              <button
                onClick={handleCancelEdit}
                className="cancel-rating-btn"
                disabled={isPending}
              >
                {t('userRating.buttonCancel')}
              </button>
            )}
            <button
              onClick={handleRatingSubmit}
              disabled={isPending || newRating < 1}
              className={`submit-rating-btn ${isPending || newRating < 1 ? 'disabled' : ''}`}
            >
              {isPending ? t('userRating.buttonSaving') : (displayRating ? t('userRating.buttonUpdate') : t('userRating.buttonSubmit'))}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserRating;