import React, { useState, useEffect } from 'react';
import StarRating from '../Common/StarRating';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { logger } from '../../utils/logger';

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
  const { user, loading } = useAuth();
  const { secureFetch } = useSecureFetch();
  const [userRating, setUserRating] = useState<UserRatingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newRating, setNewRating] = useState(0);
  // Note: newContent retiré - ratings sans commentaires
  const [error, setError] = useState('');

  // Fetch user's existing rating
  useEffect(() => {
    // Wait for auth loading to complete
    if (loading) {
      return;
    }

    if (!user || !employeeId) {
      return;
    }

    const fetchUserRating = async () => {
      try {

        const response = await secureFetch(
          `${process.env.REACT_APP_API_URL}/api/comments/user-rating/${employeeId}`
        );

        if (response.ok) {
          const data = await response.json();
          setUserRating(data.user_rating);
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
  }, [user, employeeId, loading]);

  const handleRatingSubmit = async () => {
    if (!user || newRating < 1 || newRating > 5) {
      setError('Please select a valid rating (1-5 stars)');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await secureFetch(
        `${process.env.REACT_APP_API_URL}/api/comments/user-rating/${employeeId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            rating: newRating,
            content: userRating ? 'Rating updated' : 'User rating'
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        logger.debug('🎯 Rating submitted successfully:', data);

        const newUserRating = {
          id: data.comment.id,
          rating: data.comment.rating,
          content: data.comment.content,
          created_at: data.comment.created_at
        };

        logger.debug('🎯 Setting userRating to:', newUserRating);
        setUserRating(newUserRating);
        setIsEditing(false);
        setNewRating(0);

        if (onRatingUpdate) {
          onRatingUpdate(data.comment.rating);
        }
      } else {
        const errorData = await response.json();
        logger.debug('❌ Rating submission failed:', errorData);
        setError(errorData.error || 'Failed to save rating');
      }
    } catch (error) {
      logger.error('Failed to submit rating:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setNewRating(userRating?.rating || 0);
    setError('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewRating(0);
    setError('');
  };

  if (!user) {
    return (
      <div className={`user-rating-container-nightlife ${className}`}>
        <p className="login-prompt-nightlife">
          <a href="/auth">Log in</a> to rate this employee
        </p>
      </div>
    );
  }

  return (
    <div className={`user-rating-container-nightlife ${className}`}>
      <h4 className="user-rating-title-nightlife">
        ⭐ Your Rating
      </h4>

      {/* Display existing rating */}
      {userRating && !isEditing && (
        <div className="existing-rating-nightlife">
          <div className="rating-display">
            <StarRating rating={userRating.rating} readonly={true} size="medium" />
            <span className="rating-value">{userRating.rating}/5</span>
          </div>
          <button
            onClick={handleEditClick}
            className="edit-rating-btn-nightlife"
          >
            ✏️ Update Rating
          </button>
        </div>
      )}

      {/* Rating form */}
      {(!userRating || isEditing) && (
        <div className="rating-form-nightlife">
          <div className="rating-input-section">
            <label className="rating-label">
              {userRating ? "Update your rating:" : "Rate this employee:"}
            </label>
            <StarRating
              rating={newRating}
              onChange={setNewRating}
              readonly={isLoading}
              size="large"
            />
          </div>

          {/* Note: Commentaire supprimé - utiliser la section Comments séparée */}

          {error && (
            <div className="rating-error-nightlife">
              {error}
            </div>
          )}

          <div className="rating-form-actions">
            {isEditing && (
              <button
                onClick={handleCancelEdit}
                className="cancel-rating-btn"
                disabled={isLoading}
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleRatingSubmit}
              disabled={isLoading || newRating < 1}
              className={`submit-rating-btn ${isLoading || newRating < 1 ? 'disabled' : ''}`}
            >
              {isLoading ? 'Saving...' : (userRating ? 'Update Rating' : 'Submit Rating')}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserRating;