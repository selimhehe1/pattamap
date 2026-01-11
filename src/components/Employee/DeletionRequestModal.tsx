import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Employee } from '../../types';
import { Upload, X, Camera, FileText, Send, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { premiumModalVariants, premiumBackdropVariants } from '../../animations/variants';
import notification from '../../utils/notification';
import { logger } from '../../utils/logger';
import '../../styles/components/modal-premium-base.css';
import '../../styles/components/claim-delete-modal.css';

interface DeletionRequestModalProps {
  employee: Employee;
  onClose: () => void;
  onSuccess?: () => void;
  isOpen?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/**
 * Modal for requesting profile deletion.
 * User must provide:
 * 1. Proof of identity (selfie or document)
 * 2. Optional message explaining the request
 *
 * The request is sent to PattaMap admin via email.
 */
const DeletionRequestModal: React.FC<DeletionRequestModalProps> = ({
  employee,
  onClose,
  onSuccess,
  isOpen = true
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      notification.error(t('deletionRequest.errorInvalidType', 'Format non supporté. Utilisez JPG, PNG, WebP ou PDF.'));
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      notification.error(t('deletionRequest.errorFileTooLarge', 'Fichier trop volumineux (max 10MB)'));
      return;
    }

    setProofFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProofPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null);
    }
  };

  const handleRemoveFile = () => {
    setProofFile(null);
    setProofPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proofFile) {
      notification.error(t('deletionRequest.errorNoProof', 'Veuillez fournir une preuve d\'identité'));
      return;
    }

    if (!email || !email.includes('@')) {
      notification.error(t('deletionRequest.errorInvalidEmail', 'Veuillez fournir une adresse email valide'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('proof', proofFile);
      formData.append('email', email);
      formData.append('message', message);
      formData.append('employeeId', employee.id);
      formData.append('employeeName', employee.name);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/employees/${employee.id}/deletion-request`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit deletion request');
      }

      setIsSuccess(true);
      notification.success(t('deletionRequest.success', 'Votre demande a été envoyée'));

      // Close after showing success
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);

    } catch (error) {
      logger.error('Deletion request error:', error);
      notification.error(t('deletionRequest.errorSubmit', 'Erreur lors de l\'envoi. Veuillez réessayer.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="modal-premium-backdrop"
        variants={premiumBackdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={onClose}
      >
        <motion.div
          className="modal-premium-container modal-premium-container--medium"
          variants={premiumModalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-premium-header">
            <div className={`modal-premium-header-icon ${isSuccess ? 'modal-premium-header-icon--success' : 'modal-premium-header-icon--warning'}`}>
              {isSuccess ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
            </div>
            <h2 className="modal-premium-title">
              {isSuccess
                ? t('deletionRequest.titleSuccess', 'Demande envoyée')
                : t('deletionRequest.title', 'Demande de suppression')
              }
            </h2>
            <p className="modal-premium-subtitle">
              {isSuccess
                ? t('deletionRequest.subtitleSuccess', 'Nous traiterons votre demande dans les plus brefs délais')
                : t('deletionRequest.subtitle', 'Prouvez votre identité pour supprimer ce profil')
              }
            </p>
            <button
              className="modal-premium-close"
              onClick={onClose}
              aria-label={t('common.close', 'Close')}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="modal-premium-body">
            {isSuccess ? (
              <div className="deletion-request-success">
                <CheckCircle size={48} className="deletion-request-success-icon" />
                <p>{t('deletionRequest.successMessage', 'Votre demande de suppression a été envoyée à notre équipe. Vous recevrez une confirmation par email.')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="deletion-request-form">
                {/* Profile being deleted */}
                <div className="deletion-request-profile">
                  <span className="deletion-request-label">
                    {t('deletionRequest.profileLabel', 'Profil concerné')}
                  </span>
                  <div className="deletion-request-profile-card">
                    {employee.photos?.[0] ? (
                      <img
                        src={employee.photos[0]}
                        alt={employee.name}
                        className="deletion-request-profile-photo"
                      />
                    ) : (
                      <div className="deletion-request-profile-placeholder">
                        {employee.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="deletion-request-profile-name">{employee.name}</span>
                  </div>
                </div>

                {/* Email */}
                <div className="deletion-request-field">
                  <label className="deletion-request-label">
                    {t('deletionRequest.emailLabel', 'Votre adresse email')} *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('deletionRequest.emailPlaceholder', 'Pour vous contacter concernant votre demande')}
                    className="deletion-request-input"
                    required
                  />
                </div>

                {/* Proof Upload */}
                <div className="deletion-request-field">
                  <label className="deletion-request-label">
                    {t('deletionRequest.proofLabel', 'Preuve d\'identité')} *
                  </label>
                  <p className="deletion-request-hint">
                    {t('deletionRequest.proofHint', 'Selfie avec une pièce d\'identité ou document officiel')}
                  </p>

                  {proofFile ? (
                    <div className="deletion-request-preview">
                      {proofPreview ? (
                        <img src={proofPreview} alt="Preview" className="deletion-request-preview-img" />
                      ) : (
                        <div className="deletion-request-preview-file">
                          <FileText size={32} />
                          <span>{proofFile.name}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        className="deletion-request-preview-remove"
                        onClick={handleRemoveFile}
                        aria-label={t('common.remove', 'Remove')}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="deletion-request-upload"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera size={24} />
                      <span>{t('deletionRequest.uploadButton', 'Ajouter une photo ou document')}</span>
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_TYPES.join(',')}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </div>

                {/* Message */}
                <div className="deletion-request-field">
                  <label className="deletion-request-label">
                    {t('deletionRequest.messageLabel', 'Message (optionnel)')}
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('deletionRequest.messagePlaceholder', 'Raison de la demande ou informations supplémentaires...')}
                    className="deletion-request-textarea"
                    rows={3}
                  />
                </div>

                {/* Legal notice */}
                <p className="deletion-request-legal">
                  {t('deletionRequest.legal', 'En soumettant cette demande, vous confirmez être la personne représentée sur ce profil. Les fausses déclarations peuvent faire l\'objet de poursuites.')}
                </p>

                {/* Submit */}
                <button
                  type="submit"
                  className="deletion-request-submit"
                  disabled={isSubmitting || !proofFile || !email}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      {t('common.sending', 'Envoi en cours...')}
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      {t('deletionRequest.submit', 'Envoyer la demande')}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default DeletionRequestModal;
