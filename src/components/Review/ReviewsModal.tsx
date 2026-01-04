import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Lightbulb, BarChart3, X } from 'lucide-react';
import { premiumModalVariants, premiumBackdropVariants } from '../../animations/variants';
import ReviewsList from './ReviewsList';
import '../../styles/components/modal-premium-base.css';

interface Review {
  id: string;
  user_id: string;
  employee_id: string;
  rating: number;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    pseudonym: string;
  };
  replies?: Reply[];
}

interface Reply {
  id: string;
  comment_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    id: string;
    pseudonym: string;
  };
}

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviews: Review[];
  employeeName: string;
  onReply?: (reviewId: string, content: string) => Promise<void>;
  onReport?: (reviewId: string, reason: string) => Promise<void>;
  isLoading?: boolean;
}

const ReviewsModal: React.FC<ReviewsModalProps> = ({
  isOpen,
  onClose,
  reviews,
  employeeName,
  onReply,
  onReport,
  isLoading = false
}) => {
  const { t } = useTranslation();

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="modal-premium-overlay"
          variants={premiumBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleOverlayClick}
        >
          <motion.div
            className="modal-premium modal-premium--large"
            variants={premiumModalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reviews-modal-title"
          >
            {/* Close button */}
            <motion.button
              className="modal-premium__close"
              onClick={onClose}
              aria-label={t('common.close', 'Close')}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
            >
              <X size={18} />
            </motion.button>

            {/* Header */}
            <div className="modal-premium__header modal-premium__header--with-icon">
              <motion.div
                className="modal-premium__icon modal-premium__icon--info"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
              >
                <MessageSquare size={32} />
              </motion.div>
              <motion.h2
                id="reviews-modal-title"
                className="modal-premium__title modal-premium__title--info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {t('reviewsModal.title', { employeeName })}
              </motion.h2>
            </div>

            {/* Content */}
            <motion.div
              className="modal-premium__content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {reviews.length === 0 ? (
                <div className="modal-premium__empty-state">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.25, type: 'spring' }}
                    style={{ marginBottom: '20px', color: 'rgba(255,255,255,0.3)' }}
                  >
                    <MessageSquare size={64} />
                  </motion.div>
                  <h3 style={{
                    color: '#E879F9',
                    fontSize: '20px',
                    marginBottom: '10px',
                    textShadow: '0 0 15px rgba(232, 121, 249, 0.5)'
                  }}>
                    {t('reviewsModal.noReviewsTitle')}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {t('reviewsModal.noReviewsText', { employeeName })}
                  </p>
                </div>
              ) : (
                <div>
                  {/* Reviews Count */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    style={{
                      marginBottom: '24px',
                      textAlign: 'center',
                      padding: '16px',
                      background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.1), rgba(232, 121, 249, 0.1))',
                      borderRadius: '12px',
                      border: '1px solid rgba(0, 229, 255, 0.3)'
                    }}
                  >
                    <span style={{
                      color: '#00E5FF',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      textShadow: '0 0 10px rgba(0, 229, 255, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}>
                      <BarChart3 size={20} />
                      {t(reviews.length === 1 ? 'reviewsModal.reviewsCountSingular' : 'reviewsModal.reviewsCountPlural', { count: reviews.length })}
                    </span>
                  </motion.div>

                  {/* Reviews List */}
                  <ReviewsList
                    reviews={reviews}
                    onReply={onReply}
                    onReport={onReport}
                    isLoading={isLoading}
                    showTitle={false}
                    autoExpandReplies={true}
                  />
                </div>
              )}
            </motion.div>

            {/* Footer */}
            <motion.div
              className="modal-premium__footer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ justifyContent: 'center' }}
            >
              <p style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '12px',
                margin: '0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Lightbulb size={14} />
                {t('reviewsModal.footerTip')}
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Use portal to render at body level
  return createPortal(modalContent, document.body);
};

export default ReviewsModal;
