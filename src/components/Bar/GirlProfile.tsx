import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Employee } from '../../types';
import StarRating from '../Common/StarRating';
import ReviewForm from '../Review/ReviewForm';
import ReviewsList from '../Review/ReviewsList';
import ReviewsModalContent from '../Review/ReviewsModalContent';
import UserRating from '../Review/UserRating';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import EmployeeFormContent from '../Forms/EmployeeFormContent';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import PhotoGalleryModal from '../Common/PhotoGalleryModal';
import { logger } from '../../utils/logger';

interface GirlProfileProps {
  girl: Employee;
  onClose: () => void;
}

const GirlProfile: React.FC<GirlProfileProps> = ({ girl, onClose }) => {
  const { user } = useAuth();
  const { openModal, closeModal, updateModalProps } = useModal();
  const { secureFetch } = useSecureFetch();
  const navigate = useNavigate();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  // Handler to open photo gallery
  const handlePhotoClick = () => {
    if (girl.photos && girl.photos.length > 0) {
      openModal('photo-gallery', PhotoGalleryModal, {
        photos: girl.photos,
        initialIndex: currentPhotoIndex,
        employeeName: girl.name,
        onClose: () => closeModal('photo-gallery')
      }, {
        size: 'fullscreen'
      });
    }
  };

  const getSocialMediaUrl = (platform: string, username: string) => {
    const urls: { [key: string]: string } = {
      instagram: `https://instagram.com/${username}`,
      line: `https://line.me/R/ti/p/${username}`,
      telegram: `https://t.me/${username}`,
      whatsapp: `https://wa.me/${username}`,
      facebook: `https://facebook.com/${username}`
    };
    return urls[platform] || '#';
  };

  const getSocialMediaIcon = (platform: string) => {
    const icons: { [key: string]: React.ReactElement } = {
      instagram: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      line: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
        </svg>
      ),
      telegram: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      whatsapp: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      ),
      facebook: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    };
    return icons[platform] || (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
      </svg>
    );
  };

  // Load reviews and favorite status on component mount
  useEffect(() => {
    loadReviews();
    checkFavoriteStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [girl.id]);

  const checkFavoriteStatus = async () => {
    if (!user) return;

    try {
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/favorites/check/${girl.id}`);

      if (response.ok) {
        const data = await response.json();
        setIsFavorite(data.is_favorite);
      }
    } catch (error) {
      logger.error('Failed to check favorite status:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      alert('Please login to add favorites');
      return;
    }

    setIsTogglingFavorite(true);
    try {
      if (isFavorite) {
        const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/favorites/${girl.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setIsFavorite(false);
        } else {
          throw new Error('Failed to remove from favorites');
        }
      } else {
        const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/favorites`, {
          method: 'POST',
          body: JSON.stringify({ employee_id: girl.id })
        });

        if (response.ok) {
          setIsFavorite(true);
        } else if (response.status === 409) {
          setIsFavorite(true);
        } else {
          throw new Error('Failed to add to favorites');
        }
      }
    } catch (error) {
      logger.error('Failed to toggle favorite:', error);
      alert(`Failed to ${isFavorite ? 'remove from' : 'add to'} favorites`);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  // Helper function to organize flat comments into threaded structure
  const organizeCommentsIntoThreads = (flatComments: any[]) => {
    const reviewsMap = new Map<string, any>();
    const mainReviews: any[] = [];

    // First pass: create all reviews and initialize replies arrays
    flatComments.forEach((comment: any) => {
      const reviewWithReplies = {
        ...comment,
        replies: []
      };
      reviewsMap.set(String(comment.id), reviewWithReplies); // Ensure string key

      // If it's a main review (no parent_id or parent_id is null/undefined), add to main list
      if (!comment.parent_id || comment.parent_id === null || comment.parent_id === undefined) {
        mainReviews.push(reviewWithReplies);
      }
    });

    // Second pass: attach replies to their parent reviews
    flatComments.forEach((comment: any) => {
      if (comment.parent_id && comment.parent_id !== null && comment.parent_id !== undefined) {
        const parentReview = reviewsMap.get(String(comment.parent_id)); // Ensure string key
        const replyWithoutReplies = reviewsMap.get(String(comment.id));
        if (parentReview && replyWithoutReplies) {
          parentReview.replies.push(replyWithoutReplies);
        }
      }
    });

    // Sort main reviews by creation date (newest first)
    mainReviews.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Sort replies within each review by creation date (oldest first for conversation flow)
    mainReviews.forEach((review: any) => {
      if (review.replies && review.replies.length > 0) {
        review.replies.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    });

    return mainReviews;
  };

  const loadReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/comments?employee_id=${girl.id}`);
      if (response.ok) {
        const data = await response.json();
        const flatComments = data.comments || [];

        const threadedReviews = organizeCommentsIntoThreads(flatComments);

        setReviews(threadedReviews);
      }
    } catch (error) {
      logger.error('Failed to load reviews:', error);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleReviewSubmit = async (reviewData: any) => {
    setIsSubmittingReview(true);
    try {
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/comments`, {
        method: 'POST',
        body: JSON.stringify(reviewData)
      });

      if (response.ok) {
        setShowReviewForm(false);
        await loadReviews(); // Reload reviews
      } else {
        throw new Error('Failed to submit review');
      }
    } catch (error) {
      logger.error('Failed to submit review:', error);
      throw error;
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleReplySubmit = async (reviewId: string, content: string) => {
    try {
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/comments`, {
        method: 'POST',
        body: JSON.stringify({
          employee_id: girl.id,
          content: content,
          parent_comment_id: reviewId
        })
      });

      if (response.ok) {
        // Recharger les reviews et récupérer les nouvelles données
        setIsLoadingReviews(true);
        try {
          const reviewResponse = await secureFetch(`${process.env.REACT_APP_API_URL}/api/comments?employee_id=${girl.id}`);
          if (reviewResponse.ok) {
            const data = await reviewResponse.json();
            const flatComments = data.comments || [];
            const threadedReviews = organizeCommentsIntoThreads(flatComments);

            setReviews(threadedReviews);

            // 🎯 Mettre à jour les props du modal reviews s'il est ouvert avec les nouvelles données
            updateModalProps('reviews', {
              reviews: threadedReviews,
              employeeName: girl.nickname || girl.name,
              onReply: handleReplySubmit,
              onReport: handleReportSubmit,
              isLoading: false
            });
          }
        } finally {
          setIsLoadingReviews(false);
        }
      } else {
        throw new Error('Failed to submit reply');
      }
    } catch (error) {
      logger.error('Failed to submit reply:', error);
      throw error;
    }
  };

  const handleReportSubmit = async (reviewId: string, reason: string) => {
    try {
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/comments/${reviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        alert('Review reported successfully. Thank you for helping keep our community safe!');
      } else {
        throw new Error('Failed to report review');
      }
    } catch (error) {
      logger.error('Failed to report review:', error);
      throw error;
    }
  };


  return (
    <div className="profile-container-vertical-nightlife">
        {/* Section photos */}
        <div className="profile-photo-section-vertical">
          {/* Boutons overlay dans la photo */}
          <button
            onClick={handleToggleFavorite}
            disabled={isTogglingFavorite}
            className={`profile-photo-overlay-btn profile-photo-favorite-btn ${isFavorite ? 'favorited' : ''} ${isTogglingFavorite ? 'loading' : ''}`}
          >
            {isTogglingFavorite ? '⏳' : isFavorite ? '⭐' : '☆'}
          </button>

          <button onClick={onClose} className="profile-photo-overlay-btn profile-photo-close-btn">
            ✕
          </button>

          {/* Photo principale */}
          <div
            className="profile-photo-main-vertical"
            style={{
              backgroundImage: `url(${girl.photos[currentPhotoIndex] || '/placeholder-avatar.png'})`,
              cursor: girl.photos && girl.photos.length > 0 ? 'pointer' : 'default'
            }}
            onClick={handlePhotoClick}
            title="Click to view full gallery"
          >
              {/* Navigation photos */}
              {girl.photos.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPhotoIndex(prev =>
                        prev === 0 ? girl.photos.length - 1 : prev - 1
                      );
                    }}
                    className="profile-photo-nav profile-photo-nav-left"
                  >
                    ←
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPhotoIndex(prev =>
                        prev === girl.photos.length - 1 ? 0 : prev + 1
                      );
                    }}
                    className="profile-photo-nav profile-photo-nav-right"
                  >
                    →
                  </button>

                  {/* Indicateurs photos */}
                  <div className="profile-photo-indicators">
                    {girl.photos.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPhotoIndex(index);
                        }}
                        className={`profile-photo-dot ${index === currentPhotoIndex ? 'active' : ''}`}
                      />
                    ))}
                  </div>
                </>
              )}

            </div>
        </div>

        {/* Contenu principal */}
        <div className="profile-content-vertical">
          {/* Informations principales avec edit button à droite */}
          <div className="profile-main-info">
            <div className="profile-header-row">
              <div className="profile-name-section">
                <h1 className="profile-name-nightlife">
                  {girl.name}
                  {girl.nickname && (
                    <span className="profile-nickname">
                      "{girl.nickname}"
                    </span>
                  )}
                </h1>
              </div>

              {user && (
                <button
                  className="edit-icon-btn-nightlife edit-icon-right"
                  title={user.role === 'admin' || user.role === 'moderator' ? 'Edit Profile' : 'Suggest Edit'}
                  onClick={() => openModal('edit-employee', EmployeeFormContent, {
                    initialData: {
                      ...girl,
                      current_establishment_id: girl.current_employment?.[0]?.establishment_id || ''
                    },
                    onSubmit: async (employeeData: any) => {
                      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

                      const response = await secureFetch(`${API_URL}/api/edit-proposals`, {
                        method: 'POST',
                        body: JSON.stringify({
                          item_type: 'employee',
                          item_id: girl.id,
                          proposed_changes: employeeData,
                          current_values: girl
                        })
                      });

                      if (response.ok) {
                        const data = await response.json();
                        if (data.auto_approved) {
                          alert('✅ Modifications appliquées immédiatement !');
                        } else {
                          alert('✅ Proposition créée ! Elle sera examinée par un modérateur.');
                        }
                        closeModal('edit-employee');
                        window.location.reload();
                      } else {
                        alert('❌ Erreur lors de la création de la proposition');
                      }
                    }
                  }, {
                    size: 'medium',
                    closeOnOverlayClick: false
                  })}
                >
                  ✏️
                </button>
              )}
            </div>

            <div className="profile-meta-row">
              <span className="profile-age-nationality">
                {girl.age} years old • {girl.nationality}
              </span>

              <div className="profile-rating-container">
                <StarRating
                  rating={girl.average_rating || 0}
                  readonly={true}
                  size="medium"
                />
                <span className="profile-rating-text">
                  {girl.average_rating?.toFixed(1) || '0.0'} ({girl.comment_count || 0} reviews)
                </span>
              </div>
            </div>

            {girl.description && (
              <p className="profile-description">
                {girl.description}
              </p>
            )}
          </div>

          {/* Current Workplace */}
          {girl.current_employment && girl.current_employment.length > 0 && (
            <div className="profile-workplace-section">
              <h3 className="profile-section-title">
                🏢 Currently Working At
              </h3>

              <div className="workplace-info-container">
                {girl.current_employment.map((employment) => (
                  <div key={employment.id} className="workplace-card-nightlife">
                    <div className="workplace-main-info">
                      <h4 className="workplace-name">
                        {employment.establishment?.name}
                      </h4>

                      <div className="workplace-details">
                        {employment.establishment?.category?.name && (
                          <span className="workplace-category">
                            📍 {employment.establishment.category.name}
                          </span>
                        )}

                        {employment.establishment?.zone && (
                          <span className="workplace-zone">
                            🌍 {employment.establishment.zone}
                          </span>
                        )}
                      </div>

                      {employment.position && (
                        <div className="workplace-position">
                          💼 Position: {employment.position}
                        </div>
                      )}

                      {employment.start_date && (
                        <div className="workplace-start-date">
                          📅 Since: {new Date(employment.start_date).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      )}
                    </div>

                    {employment.establishment?.id && (
                      <button
                        className="workplace-visit-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose(); // Close the profile modal first
                          navigate(`/bar/${employment.establishment?.id}`);
                        }}
                      >
                        🔗 Visit Bar Page
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Social Media */}
          {girl.social_media && Object.keys(girl.social_media).some(key => girl.social_media?.[key as keyof typeof girl.social_media]) && (
            <div className="profile-social-section">
              <h3 className="profile-section-title">
                💬 Contact {girl.nickname || girl.name}
              </h3>

              <div className="social-badges-container">
                {Object.entries(girl.social_media).map(([platform, username]) => {
                  if (!username) return null;

                  return (
                    <a
                      key={platform}
                      href={getSocialMediaUrl(platform, username)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`social-badge-nightlife social-badge-${platform}`}
                    >
                      <span className="social-badge-icon">
                        {getSocialMediaIcon(platform)}
                      </span>
                      <span className="social-badge-text">
                        {platform}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rating Section - EN PREMIER comme demandé */}
          <div className="profile-rating-section">
            <UserRating
              employeeId={girl.id}
              onRatingUpdate={() => loadReviews()} // Refresh reviews when rating changes
            />
          </div>

          {/* Actions */}
          <div className="profile-actions-section">
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className={`profile-action-button profile-action-review ${showReviewForm ? 'active' : ''}`}
            >
              {showReviewForm ? '❌ Cancel Comment' : '💬 Add Comment'}
            </button>
          </div>

          {/* Comments Section - Après rating et actions */}
          <div className="profile-comments-section">
            {/* Review Form */}
            {showReviewForm && (
              <div className="profile-review-form">
                <ReviewForm
                  employeeId={girl.id}
                  onSubmit={handleReviewSubmit}
                  onCancel={() => setShowReviewForm(false)}
                  isLoading={isSubmittingReview}
                />
              </div>
            )}

            {/* Reviews List */}
            <div className="profile-reviews-list">
              <ReviewsList
                reviews={reviews}
                onReply={handleReplySubmit}
                onReport={handleReportSubmit}
                isLoading={isLoadingReviews}
                onOpenModal={() => openModal('reviews', ReviewsModalContent, {
                  reviews,
                  employeeName: girl.nickname || girl.name,
                  onReply: handleReplySubmit,
                  onReport: handleReportSubmit,
                  isLoading: isLoadingReviews
                }, {
                  size: 'large',
                  closeOnOverlayClick: true
                })}
                maxReviews={3}
              />
            </div>
          </div>
        </div>
      </div>
  );
};

// Fixed TypeScript compilation issues
export default GirlProfile;