import React from 'react';
import { useTranslation } from 'react-i18next';
import ReviewsList from './ReviewsList';

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
    <div
      className="modal-app-overlay"
      onClick={onClose}
     role="button" tabIndex={0}>
      <div
        className="profile-container-vertical-nightlife"
        style={{
          width: '90%',
          maxWidth: '800px',
          maxHeight: '90vh',
          margin: '20px',
          display: 'flex',
          flexDirection: 'column'
        }}
        role="button" tabIndex={0} onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="profile-header-bar" style={{
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
            💬 {t('reviewsModal.title', { employeeName })}
          </h2>

          <button
            onClick={onClose}
            className="profile-close-button"
            style={{
              position: 'absolute',
              top: '20px',
              right: '25px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(193, 154, 107,0.3)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#C19A6B',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(193, 154, 107,0.2)';
              e.currentTarget.style.borderColor = '#C19A6B';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.borderColor = 'rgba(193, 154, 107,0.3)';
            }}
          >
            ✕
          </button>
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
                💬
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
                  📊 {t(reviews.length === 1 ? 'reviewsModal.reviewsCountSingular' : 'reviewsModal.reviewsCountPlural', { count: reviews.length })}
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
            💡 {t('reviewsModal.footerTip')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReviewsModal;