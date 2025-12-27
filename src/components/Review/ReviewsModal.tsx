import React from 'react';
import { MessageSquare, Lightbulb, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReviewsList from './ReviewsList';
import '../../styles/components/modals.css';

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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay-unified" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content-unified modal--large"
        style={{ display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button onClick={onClose} className="modal-close-btn" aria-label="Close">
          ×
        </button>

        {/* Header */}
        <div style={{
          padding: '20px 25px',
          borderBottom: '1px solid rgba(193, 154, 107,0.3)',
          background: 'linear-gradient(135deg, rgba(193, 154, 107,0.2), rgba(0,0,0,0.4))',
          borderRadius: '15px 15px 0 0'
        }}>
          <h2 style={{
            color: '#C19A6B',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0',
            textShadow: '0 0 10px rgba(193, 154, 107,0.5)',
            textAlign: 'center'
          }}>
            <MessageSquare size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> {t('reviewsModal.title', { employeeName })}
          </h2>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '25px',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.8), rgba(193, 154, 107,0.05))',
          borderRadius: '0 0 15px 15px'
        }}>
          {reviews.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#cccccc'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '20px'
              }}>
                <MessageSquare size={48} />
              </div>
              <h3 style={{
                color: '#C19A6B',
                fontSize: '20px',
                marginBottom: '10px'
              }}>
                {t('reviewsModal.noReviewsTitle')}
              </h3>
              <p>{t('reviewsModal.noReviewsText', { employeeName })}</p>
            </div>
          ) : (
            <div>
              {/* Reviews Count */}
              <div style={{
                marginBottom: '30px',
                textAlign: 'center',
                padding: '15px',
                background: 'rgba(193, 154, 107,0.1)',
                borderRadius: '10px',
                border: '1px solid rgba(193, 154, 107,0.3)'
              }}>
                <span style={{
                  color: '#00E5FF',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}>
                  <BarChart3 size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t(reviews.length === 1 ? 'reviewsModal.reviewsCountSingular' : 'reviewsModal.reviewsCountPlural', { count: reviews.length })}
                </span>
              </div>

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
        </div>

        {/* Footer */}
        <div style={{
          padding: '15px 25px',
          textAlign: 'center',
          borderTop: '1px solid rgba(193, 154, 107,0.3)',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '0 0 15px 15px'
        }}>
          <p style={{
            color: '#666666',
            fontSize: '12px',
            margin: '0'
          }}>
            <Lightbulb size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('reviewsModal.footerTip')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReviewsModal;