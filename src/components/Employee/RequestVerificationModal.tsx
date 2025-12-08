import React, { useState } from 'react';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useTranslation } from 'react-i18next';
import toast from '../../utils/toast';
import { logger } from '../../utils/logger';
import '../../styles/components/verification-modal.css';

interface RequestVerificationModalProps {
  employeeId: string;
  onClose: () => void;
  onVerificationComplete: () => void;
}

interface VerificationResult {
  status: 'approved' | 'rejected' | 'manual_review';
  face_match_score: number;
  auto_approved: boolean;
  submitted_at: string;
}

const RequestVerificationModal: React.FC<RequestVerificationModalProps> = ({
  employeeId,
  onClose,
  onVerificationComplete
}) => {
  const { secureFetch } = useSecureFetch();
  const { t } = useTranslation();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // Upload to Cloudinary
  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || '');
    formData.append('folder', 'verifications');

    const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

    // Debug log
    logger.info('Uploading to Cloudinary', { cloudName, uploadPreset });

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      logger.error('Cloudinary upload failed', { status: response.status, error: errorData });
      throw new Error(errorData.error?.message || `Upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    logger.info('Cloudinary upload successful', { url: data.secure_url });
    return data.secure_url;
  };

  // Submit verification
  const handleSubmitVerification = async () => {
    if (!selectedFile) {
      toast.error('Please select a selfie photo');
      return;
    }

    setIsUploading(true);

    try {
      // 1. Upload to Cloudinary
      toast.info('Uploading photo...');
      const selfieUrl = await uploadToCloudinary(selectedFile);

      // 2. Submit to verification API
      toast.info('Analyzing face...');
      const response = await secureFetch(
        `${process.env.REACT_APP_API_URL}/api/verifications/${employeeId}/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ selfie_url: selfieUrl })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Verification failed');
      }

      const data = await response.json();
      logger.info('Verification submitted successfully', data);

      setVerificationResult(data.verification);

      // Show success message based on status
      if (data.verification.status === 'approved') {
        toast.success(data.message || 'Verification successful!');
      } else if (data.verification.status === 'manual_review') {
        toast.info(data.message || 'Verification is under review');
      } else if (data.verification.status === 'rejected') {
        toast.error(data.message || 'Verification failed');
      }

      // Call completion callback after a short delay to show result
      setTimeout(() => {
        onVerificationComplete();
      }, 2000);

    } catch (error: any) {
      logger.error('Verification error', error);
      toast.error(error.message || 'Failed to submit verification');
      setIsUploading(false);
    }
  };

  // Close and cleanup
  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onClose();
  };

  return (
    <div className="verification-modal-overlay" onClick={handleClose}>
      <div className="verification-modal" onClick={(e) => e.stopPropagation()}>
        {!verificationResult ? (
          <>
            {/* Header */}
            <div className="modal-header">
              <h2>{t('verificationModal.title', 'Verify Your Profile')}</h2>
              <button className="close-button" onClick={handleClose} disabled={isUploading}>
                ×
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {/* Pose Instructions */}
              <div className="pose-instructions">
                <h3>{t('verificationModal.poseTitle', 'Required Pose')}</h3>
                <div className="pose-emoji">🫰</div>
                <p className="pose-description">
                  {t('verificationModal.poseDescription', 'Make a mini heart with your thumb and index finger next to your face')}
                </p>
                <ul className="pose-steps">
                  <li>{t('verificationModal.step1', 'Touch your thumb and index finger together')}</li>
                  <li>{t('verificationModal.step2', 'Make a small heart shape')}</li>
                  <li>{t('verificationModal.step3', 'Hold it next to your face')}</li>
                  <li>{t('verificationModal.step4', 'Look at the camera')}</li>
                  <li>{t('verificationModal.step5', 'Ensure good lighting')}</li>
                </ul>
                <p className="pose-note">
                  {t('verificationModal.poseNote', 'Korean "Finger Heart" gesture - popular in Asian K-pop culture')}
                </p>
              </div>

              {/* File Input */}
              <div className="file-input-section">
                <label htmlFor="selfie-input" className="file-input-label">
                  {selectedFile
                    ? t('verificationModal.changePhoto', 'Change Photo')
                    : t('verificationModal.selectPhoto', 'Take Selfie / Select Photo')}
                </label>
                <input
                  id="selfie-input"
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Preview */}
              {previewUrl && (
                <div className="photo-preview">
                  <img src={previewUrl} alt="Verification selfie preview" />
                </div>
              )}

              {/* Important Notes */}
              <div className="verification-notes">
                <h4>{t('verificationModal.importantNotes', 'Important Notes')}</h4>
                <ul>
                  <li>{t('verificationModal.note1', 'Your face must match your profile photos')}</li>
                  <li>{t('verificationModal.note2', 'Use good lighting for best results')}</li>
                  <li>{t('verificationModal.note3', 'Face must be clearly visible')}</li>
                  <li>{t('verificationModal.note4', 'Maximum 3 attempts per 24 hours')}</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={handleClose}
                disabled={isUploading}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                className="btn-submit"
                onClick={handleSubmitVerification}
                disabled={!selectedFile || isUploading}
              >
                {isUploading
                  ? t('verificationModal.submitting', 'Submitting...')
                  : t('verificationModal.submit', 'Submit Verification')}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Verification Result */}
            <div className="modal-header">
              <h2>{t('verificationModal.resultTitle', 'Verification Result')}</h2>
              <button className="close-button" onClick={handleClose}>×</button>
            </div>

            <div className="modal-body">
              <div className={`verification-result verification-result-${verificationResult.status}`}>
                {verificationResult.status === 'approved' && (
                  <>
                    <div className="result-icon success">✓</div>
                    <h3>{t('verificationModal.approved', 'Verification Approved!')}</h3>
                    <p>{t('verificationModal.approvedMessage', 'Your profile now has a verified badge.')}</p>
                    <p className="match-score">
                      {t('verificationModal.matchScore', 'Match score')}: {verificationResult.face_match_score}%
                    </p>
                  </>
                )}

                {verificationResult.status === 'manual_review' && (
                  <>
                    <div className="result-icon review">👀</div>
                    <h3>{t('verificationModal.underReview', 'Under Manual Review')}</h3>
                    <p>{t('verificationModal.reviewMessage', 'An admin will review your submission within 24 hours.')}</p>
                    <p className="match-score">
                      {t('verificationModal.matchScore', 'Match score')}: {verificationResult.face_match_score}%
                    </p>
                  </>
                )}

                {verificationResult.status === 'rejected' && (
                  <>
                    <div className="result-icon rejected">✗</div>
                    <h3>{t('verificationModal.rejected', 'Verification Failed')}</h3>
                    <p>{t('verificationModal.rejectedMessage', 'The photo did not match your profile photos. Please try again with a clearer selfie.')}</p>
                    <p className="match-score">
                      {t('verificationModal.matchScore', 'Match score')}: {verificationResult.face_match_score}%
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-close" onClick={handleClose}>
                {t('common.close', 'Close')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RequestVerificationModal;
