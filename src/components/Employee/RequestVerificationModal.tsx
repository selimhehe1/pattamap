import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Eye, Camera, Upload, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import toast from '../../utils/toast';
import { logger } from '../../utils/logger';
import { premiumModalVariants, premiumBackdropVariants } from '../../animations/variants';
import '../../styles/components/modal-premium-base.css';

interface RequestVerificationModalProps {
  employeeId: string;
  onClose: () => void;
  onVerificationComplete: () => void;
  isOpen?: boolean;
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
  onVerificationComplete,
  isOpen = true
}) => {
  const { secureFetch } = useSecureFetch();
  const { t } = useTranslation();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '');
    formData.append('folder', 'verifications');

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(errorData.error?.message || `Upload failed: ${response.status}`);
    }

    const data = await response.json();
    return data.secure_url;
  };

  const handleSubmitVerification = async () => {
    if (!selectedFile) {
      toast.error('Please select a selfie photo');
      return;
    }

    setIsUploading(true);

    try {
      toast.info('Uploading photo...');
      const selfieUrl = await uploadToCloudinary(selectedFile);

      toast.info('Analyzing face...');
      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/verifications/${employeeId}/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

      if (data.verification.status === 'approved') {
        toast.success(data.message || 'Verification successful!');
      } else if (data.verification.status === 'manual_review') {
        toast.info(data.message || 'Verification is under review');
      } else if (data.verification.status === 'rejected') {
        toast.error(data.message || 'Verification failed');
      }

      setTimeout(() => {
        onVerificationComplete();
      }, 2000);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Verification error', error);
      toast.error(errorMessage || 'Failed to submit verification');
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isUploading) {
      handleClose();
    }
  };

  const renderVerificationForm = () => (
    <>
      {/* Header */}
      <div className="modal-premium__header modal-premium__header--with-icon">
        <motion.div
          className="modal-premium__icon modal-premium__icon--info"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
        >
          <ShieldCheck size={32} />
        </motion.div>
        <motion.h2
          className="modal-premium__title modal-premium__title--info"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {t('verificationModal.title', 'Verify Your Profile')}
        </motion.h2>
      </div>

      {/* Content */}
      <motion.div
        className="modal-premium__content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ maxHeight: '60vh', overflowY: 'auto' }}
      >
        {/* Pose Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{
            textAlign: 'center',
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.1), rgba(232, 121, 249, 0.1))',
            borderRadius: '12px',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            marginBottom: '20px'
          }}
        >
          <h3 style={{ color: '#00E5FF', marginBottom: '12px' }}>
            {t('verificationModal.poseTitle', 'Required Pose')}
          </h3>
          <motion.div
            style={{ fontSize: '64px', marginBottom: '12px' }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🫰
          </motion.div>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '16px' }}>
            {t('verificationModal.poseDescription', 'Make a mini heart with your thumb and index finger next to your face')}
          </p>
          <ul style={{ textAlign: 'left', color: 'rgba(255,255,255,0.7)', fontSize: '13px', paddingLeft: '20px' }}>
            <li>{t('verificationModal.step1', 'Touch your thumb and index finger together')}</li>
            <li>{t('verificationModal.step2', 'Make a small heart shape')}</li>
            <li>{t('verificationModal.step3', 'Hold it next to your face')}</li>
            <li>{t('verificationModal.step4', 'Look at the camera')}</li>
            <li>{t('verificationModal.step5', 'Ensure good lighting')}</li>
          </ul>
        </motion.div>

        {/* File Input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ marginBottom: '20px' }}
        >
          <label
            htmlFor="selfie-input"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '16px',
              background: 'linear-gradient(135deg, rgba(232, 121, 249, 0.2), rgba(232, 121, 249, 0.1))',
              border: '2px dashed rgba(232, 121, 249, 0.5)',
              borderRadius: '12px',
              cursor: 'pointer',
              color: '#E879F9',
              fontWeight: 'bold',
              transition: 'all 0.3s ease'
            }}
          >
            {selectedFile ? <Camera size={20} /> : <Upload size={20} />}
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
        </motion.div>

        {/* Preview */}
        <AnimatePresence>
          {previewUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                marginBottom: '20px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid rgba(0, 229, 255, 0.5)'
              }}
            >
              <img
                src={previewUrl}
                alt="Verification selfie preview"
                style={{ width: '100%', display: 'block' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Important Notes */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          style={{
            padding: '16px',
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '12px'
          }}
        >
          <h4 style={{ color: '#FFC107', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={16} />
            {t('verificationModal.importantNotes', 'Important Notes')}
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
            <li>{t('verificationModal.note1', 'Your face must match your profile photos')}</li>
            <li>{t('verificationModal.note2', 'Use good lighting for best results')}</li>
            <li>{t('verificationModal.note3', 'Face must be clearly visible')}</li>
            <li>{t('verificationModal.note4', 'Maximum 3 attempts per 24 hours')}</li>
          </ul>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.div
        className="modal-premium__footer"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <motion.button
          className="modal-premium__btn-secondary"
          onClick={handleClose}
          disabled={isUploading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <X size={16} />
          {t('common.cancel', 'Cancel')}
        </motion.button>
        <motion.button
          className="modal-premium__btn-primary modal-premium__btn-success"
          onClick={handleSubmitVerification}
          disabled={!selectedFile || isUploading}
          style={{ opacity: !selectedFile ? 0.5 : 1 }}
          whileHover={{ scale: isUploading ? 1 : 1.02 }}
          whileTap={{ scale: isUploading ? 1 : 0.98 }}
        >
          {isUploading ? (
            <>
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Loader2 size={16} />
              </motion.span>
              {t('verificationModal.submitting', 'Submitting...')}
            </>
          ) : (
            <>
              <ShieldCheck size={16} />
              {t('verificationModal.submit', 'Submit Verification')}
            </>
          )}
        </motion.button>
      </motion.div>
    </>
  );

  const renderVerificationResult = () => {
    if (!verificationResult) return null;

    const statusConfig = {
      approved: { icon: <Check size={48} />, color: '#22C55E', iconBg: 'rgba(34, 197, 94, 0.2)' },
      manual_review: { icon: <Eye size={48} />, color: '#F59E0B', iconBg: 'rgba(245, 158, 11, 0.2)' },
      rejected: { icon: <X size={48} />, color: '#EF4444', iconBg: 'rgba(239, 68, 68, 0.2)' }
    };

    const config = statusConfig[verificationResult.status];

    return (
      <>
        <div className="modal-premium__header modal-premium__header--with-icon">
          <motion.div
            className="modal-premium__icon"
            style={{ background: config.iconBg, color: config.color }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            {config.icon}
          </motion.div>
          <motion.h2
            className="modal-premium__title"
            style={{ color: config.color }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {verificationResult.status === 'approved' && t('verificationModal.approved', 'Verification Approved!')}
            {verificationResult.status === 'manual_review' && t('verificationModal.underReview', 'Under Manual Review')}
            {verificationResult.status === 'rejected' && t('verificationModal.rejected', 'Verification Failed')}
          </motion.h2>
        </div>

        <motion.div
          className="modal-premium__content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ textAlign: 'center', padding: '20px' }}
        >
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '16px' }}>
            {verificationResult.status === 'approved' && t('verificationModal.approvedMessage', 'Your profile now has a verified badge.')}
            {verificationResult.status === 'manual_review' && t('verificationModal.reviewMessage', 'An admin will review your submission within 24 hours.')}
            {verificationResult.status === 'rejected' && t('verificationModal.rejectedMessage', 'The photo did not match your profile photos. Please try again with a clearer selfie.')}
          </p>
          <div style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: config.iconBg,
            borderRadius: '8px',
            color: config.color,
            fontWeight: 'bold'
          }}>
            {t('verificationModal.matchScore', 'Match score')}: {verificationResult.face_match_score}%
          </div>
        </motion.div>

        <motion.div
          className="modal-premium__footer"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ justifyContent: 'center' }}
        >
          <motion.button
            className="modal-premium__btn-primary"
            onClick={handleClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t('common.close', 'Close')}
          </motion.button>
        </motion.div>
      </>
    );
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
            className="modal-premium modal-premium--medium"
            variants={premiumModalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Close button */}
            <motion.button
              className="modal-premium__close"
              onClick={handleClose}
              disabled={isUploading}
              aria-label={t('common.close', 'Close')}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
            >
              <X size={18} />
            </motion.button>

            {!verificationResult ? renderVerificationForm() : renderVerificationResult()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default RequestVerificationModal;
