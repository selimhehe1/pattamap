import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Heart, Pencil, Link2, X, Crown, Sparkles, Star, BarChart3, Search, CheckCircle, Building2, MapPin, Globe, Briefcase, Calendar, ExternalLink, MessageSquare, XCircle, ChevronLeft, ChevronRight, Shield, Cake, Share2 } from 'lucide-react';
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
import toast from '../../utils/toast';
import { useTranslation } from 'react-i18next';
import { isFeatureEnabled, FEATURES } from '../../utils/featureFlags';
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

  // Load reviews on component mount
  // Note: favorite status is now managed by useToggleFavorite hook (React Query)
  useEffect(() => {
    loadReviews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [girl.id]);

  // 🆕 Phase 5.3: Simplified handler using centralized hook
  const handleToggleFavorite = () => {
    if (!user) {
      toast.warning(t('common.loginToAddFavorites', 'Please login to add favorites'));
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
        toast.success(t('reviews.reportSuccess', 'Review reported successfully. Thank you for helping keep our community safe!'));
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
      } catch (err) {
        // User cancelled or share failed, fallback to clipboard
        navigator.clipboard.writeText(shareUrl);
        toast.success(t('common.linkCopied', 'Link copied to clipboard!'));
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success(t('common.linkCopied', 'Link copied to clipboard!'));
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
                  <Cake size={12} />
                  {t('profile.age', 'Age')}
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
                  <Globe size={12} />
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
          {girl.social_media && Object.keys(girl.social_media).some(key => girl.social_media?.[key as keyof typeof girl.social_media]) && (
            <motion.div
              className="profile-v2-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="profile-v2-section-title">
                <MessageSquare size={16} />
                {t('profile.contact', 'Contact')} {girl.nickname || girl.name}
              </h3>

              <div className="profile-v2-social-links">
                {Object.entries(girl.social_media).map(([platform, username]) => {
                  if (!username) return null;
                  return (
                    <a
                      key={platform}
                      href={getSocialMediaUrl(platform, username)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`profile-v2-social-link profile-v2-social-link--${platform}`}
                    >
                      <span className="profile-v2-social-icon">
                        {getSocialMediaIcon(platform)}
                      </span>
                      <span className="profile-v2-social-name">{platform}</span>
                    </a>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ====== WORKPLACE SECTION ====== */}
          {girl.current_employment && girl.current_employment.length > 0 && (
            <motion.div
              className="profile-v2-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <h3 className="profile-v2-section-title">
                <Building2 size={16} />
                {t('profile.currentlyWorkingAt', 'Currently Working At')}
              </h3>

              <div className="profile-v2-workplaces">
                {girl.current_employment.map((employment) => (
                  <div key={employment.id} className="profile-v2-workplace">
                    <div className="profile-v2-workplace-info">
                      <h4 className="profile-v2-workplace-name">
                        {employment.establishment?.name}
                      </h4>

                      <div className="profile-v2-workplace-meta">
                        {employment.establishment?.category?.name && (
                          <span>
                            <MapPin size={12} />
                            {employment.establishment.category.name}
                          </span>
                        )}
                        {employment.establishment?.zone && (
                          <span>
                            <Globe size={12} />
                            {employment.establishment.zone}
                          </span>
                        )}
                      </div>

                      {employment.position && (
                        <div className="profile-v2-workplace-position">
                          <Briefcase size={12} />
                          {employment.position}
                        </div>
                      )}

                      {employment.start_date && (
                        <div className="profile-v2-workplace-date">
                          <Calendar size={12} />
                          {t('profile.since', 'Since')} {new Date(employment.start_date).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      )}
                    </div>

                    {employment.establishment?.id && (
                      <button
                        className="profile-v2-workplace-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                          navigate(`/bar/${employment.establishment?.id}`);
                        }}
                      >
                        <ExternalLink size={14} />
                        {t('profile.visitBar', 'Visit Bar')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

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
              current_establishment_id: girl.current_employment?.[0]?.establishment_id || ''
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
                  toast.success(t('editProposal.autoApproved', 'Modifications applied immediately!'));
                } else {
                  toast.success(t('editProposal.created', 'Proposal created! It will be reviewed by a moderator.'));
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