import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface ReviewFormProps {
  employeeId: string;
  onSubmit: (reviewData: ReviewData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface ReviewData {
  employee_id: string;
  content: string;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  employeeId,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const { user } = useAuth();
  const [comment, setComment] = useState<string>('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});


  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!comment.trim()) {
      newErrors.comment = 'Please write a comment';
    } else if (comment.trim().length < 10) {
      newErrors.comment = 'Comment must be at least 10 characters long';
    } else if (comment.trim().length > 1000) {
      newErrors.comment = 'Comment must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const reviewData: ReviewData = {
      employee_id: employeeId,
      content: comment.trim()
    };

    try {
      await onSubmit(reviewData);
      // Reset form on success
      setComment('');
      setErrors({});
    } catch (error) {
      setErrors({ submit: 'Failed to submit review. Please try again.' });
    }
  };

  if (!user) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,27,141,0.1), rgba(0,0,0,0.3))',
        borderRadius: '15px',
        padding: '30px',
        border: '1px solid rgba(255,27,141,0.3)',
        textAlign: 'center'
      }}>
        <h3 style={{
          color: '#FF1B8D',
          fontSize: '20px',
          fontWeight: 'bold',
          margin: '0 0 15px 0',
          textShadow: '0 0 10px rgba(255,27,141,0.5)'
        }}>
          🔒 Login Required
        </h3>
        <p style={{
          color: '#cccccc',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          You need to be logged in to leave a review. Please log in or create an account to share your experience.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,27,141,0.1), rgba(0,0,0,0.3))',
      borderRadius: '15px',
      padding: '25px',
      border: '1px solid rgba(255,27,141,0.3)',
      marginTop: '20px'
    }}>
      <h3 style={{
        color: '#FF1B8D',
        fontSize: '20px',
        fontWeight: 'bold',
        margin: '0 0 20px 0',
        textShadow: '0 0 10px rgba(255,27,141,0.5)'
      }}>
        💬 Add Comment
      </h3>

      <form onSubmit={handleSubmit}>

        {/* Comment Section */}
        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="comment"
            style={{
              display: 'block',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}
          >
            Your Comment *
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience... (minimum 10 characters)"
            disabled={isLoading}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              borderRadius: '8px',
              border: errors.comment ? '2px solid #ff4444' : '2px solid rgba(255,27,141,0.3)',
              background: 'rgba(0,0,0,0.5)',
              color: '#ffffff',
              fontSize: '14px',
              lineHeight: '1.5',
              resize: 'vertical',
              transition: 'border-color 0.3s ease',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              if (!errors.comment) {
                e.target.style.borderColor = '#FF1B8D';
              }
            }}
            onBlur={(e) => {
              if (!errors.comment) {
                e.target.style.borderColor = 'rgba(255,27,141,0.3)';
              }
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '5px'
          }}>
            {errors.comment && (
              <span style={{
                color: '#ff4444',
                fontSize: '12px',
                fontStyle: 'italic'
              }}>
                {errors.comment}
              </span>
            )}
            <span style={{
              color: comment.length > 1000 ? '#ff4444' : '#cccccc',
              fontSize: '12px',
              marginLeft: 'auto'
            }}>
              {comment.length}/1000
            </span>
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div style={{
            background: 'rgba(255,68,68,0.1)',
            border: '1px solid #ff4444',
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '20px'
          }}>
            <span style={{
              color: '#ff4444',
              fontSize: '14px'
            }}>
              {errors.submit}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              color: '#cccccc',
              border: '2px solid #666666',
              borderRadius: '25px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              opacity: isLoading ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.borderColor = '#888888';
                e.currentTarget.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.borderColor = '#666666';
                e.currentTarget.style.color = '#cccccc';
              }
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              background: isLoading 
                ? 'linear-gradient(45deg, #666666, #888888)'
                : 'linear-gradient(45deg, #FF1B8D, #E91E63)',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              position: 'relative',
              opacity: isLoading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(255,27,141,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {isLoading ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginRight: '8px'
                }} />
                Submitting...
              </>
            ) : (
              'Submit Comment'
            )}
          </button>
        </div>
      </form>

      {/* Loading Animation CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ReviewForm;