import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import ImageUploadPreview from '../Common/ImageUploadPreview';
import toast from '../../utils/toast';
import { logger } from '../../utils/logger';

interface ReviewFormProps {
  employeeId: string;
  onSubmit: (reviewData: ReviewData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface ReviewData {
  employee_id: string;
  content: string;
  photo_urls?: string[]; // v10.4 - Photos in reviews (max 3)
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  employeeId,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [comment, setComment] = useState<string>('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Upload photos to Cloudinary
  const uploadPhotosToCloudinary = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '');
      formData.append('folder', 'review_photos');

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(errorData.error?.message || `Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.secure_url;
    });

    return Promise.all(uploadPromises);
  };

  const handleFilesChange = (files: File[]) => {
    setPhotos(files);
  };


  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!comment.trim()) {
      newErrors.comment = t('review.form.errorCommentRequired');
    } else if (comment.trim().length < 10) {
      newErrors.comment = t('review.form.errorCommentMinLength');
    } else if (comment.trim().length > 1000) {
      newErrors.comment = t('review.form.errorCommentMaxLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    let photoUrls: string[] = [];

    // Upload photos if any
    if (photos.length > 0) {
      setIsUploading(true);
      try {
        toast.info(t('reviews.photoUploading', 'Uploading photos...'));
        photoUrls = await uploadPhotosToCloudinary(photos);
        logger.info(`Uploaded ${photoUrls.length} photos for review`);
      } catch (error: unknown) {
        logger.error('Photo upload error:', error);
        toast.error(t('reviews.photoUploadError', 'Failed to upload photos'));
        setIsUploading(false);
        setErrors({ submit: t('reviews.photoUploadError', 'Failed to upload photos') });
        return;
      }
      setIsUploading(false);
    }

    const reviewData: ReviewData = {
      employee_id: employeeId,
      content: comment.trim(),
      photo_urls: photoUrls.length > 0 ? photoUrls : undefined
    };

    try {
      await onSubmit(reviewData);
      // Reset form on success
      setComment('');
      setPhotos([]);
      setErrors({});
    } catch (_error) {
      setErrors({ submit: t('review.form.errorSubmitFailed') });
    }
  };

  if (!user) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
        borderRadius: '15px',
        padding: '30px',
        border: '1px solid rgba(193, 154, 107,0.3)',
        textAlign: 'center'
      }}>
        <h3 style={{
          color: '#C19A6B',
          fontSize: '20px',
          fontWeight: 'bold',
          margin: '0 0 15px 0',
          textShadow: '0 0 10px rgba(193, 154, 107,0.5)'
        }}>
          🔒 {t('review.form.loginRequired')}
        </h3>
        <p style={{
          color: '#cccccc',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          {t('review.form.loginRequiredMessage')}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
      borderRadius: '15px',
      padding: '25px',
      border: '1px solid rgba(193, 154, 107,0.3)',
      marginTop: '20px'
    }}>
      <h3 style={{
        color: '#C19A6B',
        fontSize: '20px',
        fontWeight: 'bold',
        margin: '0 0 20px 0',
        textShadow: '0 0 10px rgba(193, 154, 107,0.5)'
      }}>
        💬 {t('review.form.addComment')}
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
            {t('review.form.yourCommentLabel')} *
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('review.form.commentPlaceholder')}
            disabled={isLoading}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              borderRadius: '8px',
              border: errors.comment ? '2px solid #ff4444' : '2px solid rgba(193, 154, 107,0.3)',
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
                e.target.style.borderColor = '#C19A6B';
              }
            }}
            onBlur={(e) => {
              if (!errors.comment) {
                e.target.style.borderColor = 'rgba(193, 154, 107,0.3)';
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
              {t('review.form.characterCount', { count: comment.length })}
            </span>
          </div>
        </div>

        {/* Photo Upload Section - v10.4 */}
        <div style={{ marginBottom: '20px' }}>
          <ImageUploadPreview
            maxFiles={3}
            maxSizeMB={5}
            onFilesChange={handleFilesChange}
            label={t('reviews.addPhotos', 'Add photos (optional)')}
            disabled={isLoading || isUploading}
          />
          <p style={{
            color: '#888888',
            fontSize: '12px',
            marginTop: '5px'
          }}>
            {t('reviews.photosLimit', 'Maximum 3 photos')}
          </p>
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
            {t('review.form.cancelButton')}
          </button>

          <button
            type="submit"
            disabled={isLoading || isUploading}
            style={{
              padding: '12px 24px',
              background: (isLoading || isUploading)
                ? 'linear-gradient(45deg, #666666, #888888)'
                : 'linear-gradient(45deg, #C19A6B, #E91E63)',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              cursor: (isLoading || isUploading) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              position: 'relative',
              opacity: (isLoading || isUploading) ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!isLoading && !isUploading) {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(193, 154, 107,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && !isUploading) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {(isLoading || isUploading) ? (
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
                {isUploading
                  ? t('reviews.photoUploading', 'Uploading photos...')
                  : t('review.form.submittingButton')}
              </>
            ) : (
              t('review.form.submitButton')
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