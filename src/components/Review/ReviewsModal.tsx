import React from 'react';
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
  if (!isOpen) return null;

  return (
    <div
      className="modal-app-overlay"
      onClick={onClose}
    >
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
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="profile-header-bar" style={{
          padding: '20px 25px',
          borderBottom: '1px solid rgba(255,27,141,0.3)',
          background: 'linear-gradient(135deg, rgba(255,27,141,0.2), rgba(0,0,0,0.4))',
          borderRadius: '15px 15px 0 0'
        }}>
          <h2 style={{
            color: '#FF1B8D',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0',
            textShadow: '0 0 10px rgba(255,27,141,0.5)',
            textAlign: 'center'
          }}>
            💬 All Reviews for {employeeName}
          </h2>

          <button
            onClick={onClose}
            className="profile-close-button"
            style={{
              position: 'absolute',
              top: '20px',
              right: '25px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,27,141,0.3)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FF1B8D',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,27,141,0.2)';
              e.currentTarget.style.borderColor = '#FF1B8D';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.borderColor = 'rgba(255,27,141,0.3)';
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
          background: 'linear-gradient(135deg, rgba(0,0,0,0.8), rgba(255,27,141,0.05))',
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
                color: '#FF1B8D',
                fontSize: '20px',
                marginBottom: '10px'
              }}>
                No Reviews Yet
              </h3>
              <p>Be the first to share your experience with {employeeName}!</p>
            </div>
          ) : (
            <div>
              {/* Reviews Count */}
              <div style={{
                marginBottom: '30px',
                textAlign: 'center',
                padding: '15px',
                background: 'rgba(255,27,141,0.1)',
                borderRadius: '10px',
                border: '1px solid rgba(255,27,141,0.3)'
              }}>
                <span style={{
                  color: '#00FFFF',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}>
                  📊 {reviews.length} Review{reviews.length > 1 ? 's' : ''} Total
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
          borderTop: '1px solid rgba(255,27,141,0.3)',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '0 0 15px 15px'
        }}>
          <p style={{
            color: '#666666',
            fontSize: '12px',
            margin: '0'
          }}>
            💡 Tip: Use Ctrl+F to search specific reviews
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReviewsModal;