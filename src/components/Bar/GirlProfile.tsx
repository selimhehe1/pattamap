import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Heart, Pencil, Link2, X, Crown, Star, Search, CheckCircle, XCircle, ChevronLeft, ChevronRight, Shield, Cake, Share2, Globe, MessageSquare, ArrowLeft } from 'lucide-react';
import { useNavigateWithTransition } from '../../hooks/useNavigateWithTransition';
import { Employee, Comment, ThreadedComment, ReviewSubmitData, EmployeeFormData } from '../../types';
import ReviewForm from '../Review/ReviewForm';
import ReviewsList from '../Review/ReviewsList';
import ReviewsModalContent from '../Review/ReviewsModalContent';
import UserRating from '../Review/UserRating';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import EditEmployeeModal from '../Employee/EditEmployeeModal';
import ClaimEmployeeModal from '../Employee/ClaimEmployeeModal';
import EmployeeVerificationStatusCard from '../Employee/EmployeeVerificationStatusCard';
import ValidationBadge from '../Employee/ValidationBadge';
import ValidationVoteButtons from '../Employee/ValidationVoteButtons';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useToggleFavorite } from '../../hooks/useFavorites';
import PhotoGalleryModal from '../Common/PhotoGalleryModal';
import LazyImage from '../Common/LazyImage';
import { logger } from '../../utils/logger';
import notification from '../../utils/notification';
import { useTranslation } from 'react-i18next';
import { isFeatureEnabled, FEATURES } from '../../utils/featureFlags';
import { EmploymentSection, SocialMediaLinks } from './GirlProfile/index';
import '../../styles/components/employee-profile.css';
import '../../styles/components/photos.css';
import '../../styles/components/photo-gallery-modal.css';
import '../../styles/pages/user-dashboard.css';

// Feature flag check
const VIP_ENABLED = isFeatureEnabled(FEATURES.VIP_SYSTEM);

interface GirlProfileProps {
  girl: Employee;
  onClose: () => void;
}

const GirlProfile: React.FC<GirlProfileProps> = memo(({ girl, onClose }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { openModal, closeModal, updateModalProps } = useModal();
  const { secureFetch } = useSecureFetch();
  const navigate = useNavigateWithTransition();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviews, setReviews] = useState<ThreadedComment[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmploymentHistory, setShowEmploymentHistory] = useState(false);

  // 🆕 Phase 5.3: Use centralized favorite hook with React Query optimistic updates
  const { isFavorite, toggle: toggleFavorite, isLoading: isTogglingFavorite } = useToggleFavorite(girl.id);

  // Ref for auto-focus on review form
  const reviewFormRef = useRef<HTMLDivElement>(null);

  // Auto-focus on review form when opened
  useEffect(() => {
    if (showReviewForm && reviewFormRef.current) {
      // Scroll to form and focus first input
      reviewFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const textarea = reviewFormRef.current.querySelector('textarea');
      if (textarea) {
        setTimeout(() => textarea.focus(), 300); // Delay for animation
      }
    }
  }, [showReviewForm]);

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


  // Load reviews on component mount
  // Note: favorite status is now managed by useToggleFavorite hook (React Query)
  useEffect(() => {
    loadReviews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [girl.id]);

  // 🆕 Phase 5.3: Simplified handler using centralized hook
  const handleToggleFavorite = () => {
    if (!user) {
      notification.warning(t('common.loginToAddFavorites', 'Please login to add favorites'));
      return;
    }
    toggleFavorite();
  };

  // Helper function to organize flat comments into threaded structure
  const organizeCommentsIntoThreads = (flatComments: Comment[]): ThreadedComment[] => {
    const reviewsMap = new Map<string, ThreadedComment>();
    const mainReviews: ThreadedComment[] = [];

    // First pass: create all reviews and initialize replies arrays
    flatComments.forEach((comment: Comment) => {
      const reviewWithReplies: ThreadedComment = {
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
    flatComments.forEach((comment: Comment) => {
      if (comment.parent_id && comment.parent_id !== null && comment.parent_id !== undefined) {
        const parentReview = reviewsMap.get(String(comment.parent_id)); // Ensure string key
        const replyWithoutReplies = reviewsMap.get(String(comment.id));
        if (parentReview && replyWithoutReplies) {
          parentReview.replies.push(replyWithoutReplies);
        }
      }
    });

    // Sort main reviews by creation date (newest first)
    mainReviews.sort((a: ThreadedComment, b: ThreadedComment) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Sort replies within each review by creation date (oldest first for conversation flow)
    mainReviews.forEach((review: ThreadedComment) => {
      if (review.replies && review.replies.length > 0) {
        review.replies.sort((a: ThreadedComment, b: ThreadedComment) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    });

    return mainReviews;
  };

  const loadReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/comments?employee_id=${girl.id}`);
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

  const handleReviewSubmit = async (reviewData: ReviewSubmitData) => {
    setIsSubmittingReview(true);
    try {
      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/comments`, {
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
      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/comments`, {
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
          const reviewResponse = await secureFetch(`${import.meta.env.VITE_API_URL}/api/comments?employee_id=${girl.id}`);
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
      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/comments/${reviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        notification.success(t('reviews.reportSuccess', 'Review reported successfully. Thank you for helping keep our community safe!'));
      } else {
        throw new Error('Failed to report review');
      }
    } catch (error) {
      logger.error('Failed to report review:', error);
      throw error;
    }
  };


  // Check if employee is VIP
  const isVIP = VIP_ENABLED && girl.is_vip && girl.vip_expires_at && new Date(girl.vip_expires_at) > new Date();

  // Handle share functionality
  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/employee/${girl.id}`;
    const shareData = {
      title: `${girl.name} - PattaMap`,
      text: girl.description || `Check out ${girl.name}'s profile on PattaMap`,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (_err) {
        // User cancelled or share failed, fallback to clipboard
        navigator.clipboard.writeText(shareUrl);
        notification.success(t('common.linkCopied', 'Link copied to clipboard!'));
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      notification.success(t('common.linkCopied', 'Link copied to clipboard!'));
    }
  }, [girl.id, girl.name, girl.description, t]);

  // Navigation handlers
  const goToPrevPhoto = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex(prev => prev === 0 ? girl.photos.length - 1 : prev - 1);
  }, [girl.photos.length]);

  const goToNextPhoto = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex(prev => prev === girl.photos.length - 1 ? 0 : prev + 1);
  }, [girl.photos.length]);

  // Nationality display
  const nationalityDisplay = useMemo(() => {
    if (!girl.nationality) return null;
    return Array.isArray(girl.nationality) ? girl.nationality.join(' / ') : girl.nationality;
  }, [girl.nationality]);

  return (
    <div className={`profile-v2 ${isVIP ? 'profile-v2--vip' : ''}`}>
      {/* ====== MOBILE BACK BUTTON ====== */}
      <button
        onClick={onClose}
        className="profile-v2-back-btn"
        aria-label={t('common.back', 'Back')}
      >
        <ArrowLeft size={24} />
      </button>

      {/* ====== COMPACT HEADER ====== */}
      <motion.header
        className="profile-v2-header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="profile-v2-header-left">
          {/* Mini Avatar */}
          <div className="profile-v2-header-avatar">
            {girl.photos?.[0] ? (
              <img src={girl.photos[0]} alt={girl.name} />
            ) : (
              <span>{girl.name?.charAt(0)?.toUpperCase()}</span>
            )}
          </div>
          <span className="profile-v2-header-name">{girl.name}</span>
        </div>

        <div className="profile-v2-header-actions">
          {/* Favorite Button */}
          <button
            onClick={handleToggleFavorite}
            disabled={isTogglingFavorite}
            className={`profile-v2-header-btn ${isFavorite ? 'profile-v2-header-btn--active' : ''}`}
            aria-label={isFavorite ? t('common.removeFromFavorites') : t('common.addToFavorites')}
          >
            {isTogglingFavorite ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
            )}
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="profile-v2-header-btn"
            aria-label={t('common.share', 'Share')}
          >
            <Share2 size={18} />
          </button>

          {/* Edit Button */}
          {user && (
            <button
              onClick={() => setShowEditModal(true)}
              className="profile-v2-header-btn"
              aria-label={user.role === 'admin' || user.role === 'moderator' ? t('common.edit') : t('common.suggestEdit')}
            >
              <Pencil size={18} />
            </button>
          )}

          {/* Claim Button */}
          {user && user.account_type === 'employee' && !user.linked_employee_id && !girl.user_id && (
            <button
              onClick={() => setShowClaimModal(true)}
              className="profile-v2-header-btn profile-v2-header-btn--claim"
              aria-label={t('common.claimProfile', 'Claim Profile')}
            >
              <Link2 size={18} />
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="profile-v2-header-btn profile-v2-header-btn--close"
            aria-label={t('common.close', 'Close')}
          >
            <X size={18} />
          </button>
        </div>
      </motion.header>

      {/* ====== MAIN LAYOUT ====== */}
      <div className="profile-v2-layout">
        {/* ====== HERO PHOTO SECTION ====== */}
        <motion.section
          className="profile-v2-hero"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Instagram-style Story Dots */}
          {girl.photos && girl.photos.length > 1 && (
            <div className="profile-v2-story-dots">
              {girl.photos.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPhotoIndex(index);
                  }}
                  className={`profile-v2-story-dot ${index === currentPhotoIndex ? 'profile-v2-story-dot--active' : ''} ${index < currentPhotoIndex ? 'profile-v2-story-dot--viewed' : ''}`}
                  aria-label={`Photo ${index + 1}`}
                >
                  {index === currentPhotoIndex && (
                    <motion.div
                      className="profile-v2-story-progress"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 5, ease: 'linear' }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Main Photo */}
          <div
            className="profile-v2-photo"
            onClick={handlePhotoClick}
            role="button"
            tabIndex={0}
            aria-label={t('profile.viewGallery', 'View photo gallery')}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPhotoIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="profile-v2-photo-wrapper"
              >
                {girl.photos?.[currentPhotoIndex] ? (
                  <LazyImage
                    src={girl.photos[currentPhotoIndex]}
                    alt={`${girl.name} - Photo ${currentPhotoIndex + 1}`}
                    cloudinaryPreset="galleryLarge"
                    objectFit="cover"
                    className="profile-v2-photo-img"
                  />
                ) : (
                  <div className="profile-v2-photo-placeholder">
                    <span>{girl.name?.charAt(0)?.toUpperCase() || '?'}</span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            {girl.photos && girl.photos.length > 1 && (
              <>
                <button
                  onClick={goToPrevPhoto}
                  className="profile-v2-nav profile-v2-nav--prev"
                  aria-label={t('common.previousPhoto', 'Previous photo')}
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  onClick={goToNextPhoto}
                  className="profile-v2-nav profile-v2-nav--next"
                  aria-label={t('common.nextPhoto', 'Next photo')}
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}

            {/* Floating Badges */}
            <div className="profile-v2-badges">
              {/* VIP Badge */}
              {isVIP && (
                <motion.div
                  className="profile-v2-badge profile-v2-badge--vip"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                >
                  <Crown size={14} />
                  <span>VIP</span>
                </motion.div>
              )}

              {/* Verified Badge */}
              {girl.is_verified && (
                <motion.div
                  className="profile-v2-badge profile-v2-badge--verified"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring' }}
                  title={girl.verified_at ? `Verified on ${new Date(girl.verified_at).toLocaleDateString()}` : 'Verified Profile'}
                >
                  <Shield size={14} />
                  <span>{t('common.verified', 'Verified')}</span>
                </motion.div>
              )}
            </div>

            {/* Photo Counter */}
            {girl.photos && girl.photos.length > 1 && (
              <div className="profile-v2-photo-counter">
                {currentPhotoIndex + 1} / {girl.photos.length}
              </div>
            )}
          </div>
        </motion.section>

        {/* ====== EDITORIAL CONTENT PANEL ====== */}
        <motion.section
          className="profile-v2-content"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Magazine-style Name */}
          <div className="profile-v2-name-section">
            <h1 className="profile-v2-name">{girl.name}</h1>
            {girl.nickname && (
              <p className="profile-v2-nickname">"{girl.nickname}"</p>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="profile-v2-stats">
            {girl.age && (
              <motion.div
                className="profile-v2-stat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="profile-v2-stat-value">{girl.age}</span>
                <span className="profile-v2-stat-label">
                  {t('profile.age', 'Age')}
                </span>
              </motion.div>
            )}

            {/* 🆕 v10.x - Gender Badge */}
            {girl.sex && (
              <motion.div
                className="profile-v2-stat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
              >
                <span className="profile-v2-stat-value" style={{ textTransform: 'capitalize' }}>
                  {girl.sex === 'female' ? '♀' : girl.sex === 'male' ? '♂' : '⚧'} {t(`employee.sex.${girl.sex}`, girl.sex)}
                </span>
                <span className="profile-v2-stat-label">
                  {t('profile.gender', 'Gender')}
                </span>
              </motion.div>
            )}

            {nationalityDisplay && (
              <motion.div
                className="profile-v2-stat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <span className="profile-v2-stat-value">{nationalityDisplay}</span>
                <span className="profile-v2-stat-label">
                  {t('profile.nationality', 'Nationality')}
                </span>
              </motion.div>
            )}

            {girl.average_rating !== undefined && girl.average_rating > 0 && (
              <motion.div
                className="profile-v2-stat profile-v2-stat--rating"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span className="profile-v2-stat-value">
                  <Star size={16} fill="#FFD700" color="#FFD700" />
                  {girl.average_rating.toFixed(1)}
                </span>
                <span className="profile-v2-stat-label">
                  {t('profile.rating', 'Rating')}
                </span>
              </motion.div>
            )}
          </div>

          {/* Pull-Quote Description */}
          {girl.description && (
            <motion.div
              className="profile-v2-description"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <p>{girl.description}</p>
            </motion.div>
          )}

          {/* ====== SOCIAL CONNECT SECTION ====== */}
          {girl.social_media && (
            <SocialMediaLinks
              socialMedia={girl.social_media}
              employeeName={girl.nickname || girl.name}
            />
          )}

          {/* ====== WORKPLACE SECTION ====== */}
          <EmploymentSection
            currentEmployment={girl.current_employment?.filter(e => e.is_current) || []}
            pastEmployment={girl.employment_history?.filter(e => !e.is_current) || []}
            showHistory={showEmploymentHistory}
            onToggleHistory={() => setShowEmploymentHistory(!showEmploymentHistory)}
            onNavigate={(establishmentId: string) => {
              onClose();
              navigate(`/bar/${establishmentId}`);
            }}
          />

          {/* ====== VIP STATUS (if applicable) ====== */}
          {isVIP && (
            <motion.div
              className="profile-v2-section profile-v2-section--vip"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="profile-v2-section-title profile-v2-section-title--vip">
                <Crown size={16} />
                {t('vipStatus.activeTitle', 'VIP Member')}
              </h3>
              <p className="profile-v2-vip-expiry">
                {t('vipStatus.expiresOn', 'Expires on')}: {new Date(girl.vip_expires_at!).toLocaleDateString()}
              </p>
            </motion.div>
          )}

          {/* ====== VERIFICATION STATUS ====== */}
          {user && user.linked_employee_id === girl.id && (
            <motion.div
              className="profile-v2-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              <EmployeeVerificationStatusCard
                employeeId={girl.id}
                employeeName={girl.name}
                isVerified={girl.is_verified || false}
              />
            </motion.div>
          )}

          {/* ====== COMMUNITY VALIDATION ====== */}
          {!girl.user_id && !girl.is_self_profile && !girl.is_verified && (
            <motion.div
              className="profile-v2-section profile-v2-section--validation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              <h3 className="profile-v2-section-title">
                <Search size={16} />
                {t('profile.communityValidation', 'Community Validation')}
              </h3>
              <ValidationBadge employeeId={girl.id} />
              <ValidationVoteButtons employeeId={girl.id} />
            </motion.div>
          )}

          {/* Verified Owner Badge */}
          {(girl.user_id || girl.is_self_profile || girl.is_verified) && (
            <motion.div
              className="profile-v2-verified-badge"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <CheckCircle size={16} />
              {girl.is_verified ? t('profile.verifiedProfile', 'Verified Profile') : t('profile.verifiedByOwner', 'Verified by Owner')}
            </motion.div>
          )}

          {/* ====== RATING & REVIEWS SECTION ====== */}
          <motion.div
            className="profile-v2-section profile-v2-section--reviews"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h3 className="profile-v2-section-title">
              <Star size={16} />
              {t('profile.ratingsReviews', 'Ratings & Reviews')}
            </h3>

            {/* Rating Component */}
            <div className="profile-v2-rating">
              <UserRating
                employeeId={girl.id}
                onRatingUpdate={() => loadReviews()}
              />
            </div>

            {/* Add Review Button */}
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className={`profile-v2-review-btn ${showReviewForm ? 'profile-v2-review-btn--active' : ''}`}
            >
              {showReviewForm ? (
                <>
                  <XCircle size={16} />
                  {t('profile.cancelComment', 'Cancel')}
                </>
              ) : (
                <>
                  <MessageSquare size={16} />
                  {t('profile.addComment', 'Add Comment')}
                </>
              )}
            </button>

            {/* Review Form */}
            <AnimatePresence>
              {showReviewForm && (
                <motion.div
                  className="profile-v2-review-form"
                  ref={reviewFormRef}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ReviewForm
                    employeeId={girl.id}
                    onSubmit={handleReviewSubmit}
                    onCancel={() => setShowReviewForm(false)}
                    isLoading={isSubmittingReview}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reviews List */}
            <div className="profile-v2-reviews-list">
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
          </motion.div>
        </motion.section>
      </div>

        {/* Claim Employee Modal */}
        {showClaimModal && (
          <ClaimEmployeeModal
            preselectedEmployee={girl}
            onClose={() => setShowClaimModal(false)}
          />
        )}

        {/* Edit Employee Modal */}
        {showEditModal && (
          <EditEmployeeModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            employee={{
              ...girl,
              current_establishment_id: girl.current_employment?.find(e => e.is_current)?.establishment_id || ''
            } as Employee}
            showInfoNote={false}
            onSave={async (employeeData: EmployeeFormData) => {
              const API_URL = import.meta.env.VITE_API_URL || '';
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
                  notification.success(t('editProposal.autoApproved', 'Modifications applied immediately!'));
                } else {
                  notification.success(t('editProposal.created', 'Proposal created! It will be reviewed by a moderator.'));
                }
                window.location.reload();
              } else {
                throw new Error(t('editProposal.error', 'Error creating proposal'));
              }
            }}
            onProfileUpdated={() => window.location.reload()}
          />
        )}
      </div>
  );
});

// Display name for debugging
GirlProfile.displayName = 'GirlProfile';

export default GirlProfile;