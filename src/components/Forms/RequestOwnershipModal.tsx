/**
 * RequestOwnershipModal Component
 *
 * Multi-step wizard for requesting establishment ownership.
 * Refactored to use extracted sub-components for better maintainability.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useAuth } from '../../contexts/AuthContext';
import toast from '../../utils/toast';
import { logger } from '../../utils/logger';
import { Establishment, EstablishmentCategory } from '../../types';
import { Trophy, X, Rocket, Loader2 } from 'lucide-react';
import { premiumBackdropVariants, premiumModalVariants } from '../../animations/variants';
import '../../styles/components/modal-premium-base.css';
import '../../styles/components/form-components.css';
import '../../styles/utilities/layout-utilities.css';

// Extracted components
import {
  StepIndicator,
  Step1EstablishmentSelect,
  Step2DocumentUpload,
  Step3Confirmation,
  useDocumentUpload,
  type RequestOwnershipModalProps,
  type StepNumber,
  type NewEstablishmentData,
  type OwnershipRequestBody,
  DEFAULT_NEW_ESTABLISHMENT
} from './RequestOwnershipModal/index';

const RequestOwnershipModal: React.FC<RequestOwnershipModalProps> = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { secureFetch } = useSecureFetch();
  const { user } = useAuth();

  // Step management
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);

  // Step 1: Establishment selection
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const [categories, setCategories] = useState<EstablishmentCategory[]>([]);
  const [newEstablishment, setNewEstablishment] = useState<NewEstablishmentData>(DEFAULT_NEW_ESTABLISHMENT);

  // Step 2: Document upload (using extracted hook)
  const {
    documents,
    isDragging,
    isUploading,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveDocument,
    uploadDocumentsToCloudinary,
    cleanupDocuments
  } = useDocumentUpload();

  // Step 3: Verification & message
  const [verificationCode, setVerificationCode] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check user account type on mount
  useEffect(() => {
    if (user && user.account_type !== 'establishment_owner') {
      toast.error(t('ownership.accountTypeRequired', 'You must have an establishment owner account to request ownership'));
      onClose?.();
    }
  }, [user, onClose, t]);

  // Fetch establishments and categories on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const estResponse = await secureFetch(
          `${import.meta.env.VITE_API_URL}/api/establishments?limit=1000`,
          { method: 'GET' }
        );

        if (estResponse.ok) {
          const estData = await estResponse.json();
          setEstablishments(estData.establishments || []);
        }

        const catResponse = await secureFetch(
          `${import.meta.env.VITE_API_URL}/api/establishments/categories`,
          { method: 'GET' }
        );

        if (catResponse.ok) {
          const catData = await catResponse.json();
          setCategories(catData.categories || []);
        }
      } catch (error) {
        logger.error('Fetch data error:', error);
      }
    };

    fetchData();
  }, [secureFetch]);

  // Submit ownership request
  const handleSubmit = async () => {
    if (!createMode && !selectedEstablishment) {
      toast.error('Please select an establishment');
      return;
    }

    if (createMode && (!newEstablishment.name || !newEstablishment.address || !newEstablishment.category_id)) {
      toast.error('Please fill in all required establishment fields');
      return;
    }

    if (documents.length === 0) {
      toast.error('Please upload at least one document');
      return;
    }

    setIsSubmitting(true);

    try {
      toast.info('Uploading documents...');
      const documentUrls = await uploadDocumentsToCloudinary();

      const requestBody: OwnershipRequestBody = {
        documents_urls: documentUrls,
        verification_code: verificationCode || undefined,
        request_message: requestMessage || undefined
      };

      if (createMode) {
        requestBody.establishment_data = {
          name: newEstablishment.name,
          address: newEstablishment.address,
          latitude: newEstablishment.latitude,
          longitude: newEstablishment.longitude,
          category_id: newEstablishment.category_id,
          zone: newEstablishment.zone || undefined,
          description: newEstablishment.description || undefined,
          phone: newEstablishment.phone || undefined,
          website: newEstablishment.website || undefined,
          instagram: newEstablishment.instagram || undefined,
          twitter: newEstablishment.twitter || undefined,
          tiktok: newEstablishment.tiktok || undefined
        };
      } else {
        requestBody.establishment_id = selectedEstablishment!.id;
      }

      toast.info(createMode ? 'Creating establishment and submitting request...' : 'Submitting request...');
      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/ownership-requests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit request');
      }

      const data = await response.json();
      logger.info('Ownership request submitted successfully', data);

      const successMessage = data.isNewEstablishment
        ? 'Establishment and ownership request submitted successfully! Admins will review both.'
        : 'Ownership request submitted successfully! Admins will review your request.';

      toast.success(successMessage);
      cleanupDocuments();
      onSuccess?.();
      onClose?.();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Submit ownership request error:', error);
      toast.error(errorMessage || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigation
  const handleNext = () => {
    if (currentStep === 1) {
      if (!createMode && !selectedEstablishment) {
        toast.error('Please select an establishment');
        return;
      }
      if (createMode && (!newEstablishment.name || !newEstablishment.address || !newEstablishment.category_id)) {
        toast.error('Please fill in all required fields: name, address, and category');
        return;
      }
    }

    if (currentStep === 2 && documents.length === 0) {
      toast.error('Please upload at least one document');
      return;
    }

    setCurrentStep(prev => Math.min(3, prev + 1) as StepNumber);
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1) as StepNumber);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose?.();
    }
  };

  const modalContent = (
    <AnimatePresence mode="wait">
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
          style={{ padding: '30px' }}
        >
          {/* Close Button */}
          <motion.button
            className="modal-premium__close"
            onClick={onClose}
            aria-label="Close"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.95 }}
          >
            <X size={18} />
          </motion.button>

          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '25px'
          }}>
            <h2 style={{
              color: '#C19A6B',
              fontSize: '28px',
              fontWeight: 'bold',
              margin: 0,
              textShadow: '0 0 10px rgba(193, 154, 107,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Trophy size={28} style={{ color: '#FFD700' }} /> {t('ownership.title', 'Request Establishment Ownership')}
            </h2>
          </div>

          {/* Subtitle */}
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '14px',
            margin: '0 0 30px 0',
            textAlign: 'center'
          }}>
            {t('ownership.subtitle', 'Verify your ownership to manage your establishment')}
          </p>

          {/* Progress indicator */}
          <StepIndicator currentStep={currentStep} />

          {/* Step content */}
          <div>
            {currentStep === 1 && (
              <Step1EstablishmentSelect
                establishments={establishments}
                selectedEstablishment={selectedEstablishment}
                createMode={createMode}
                categories={categories}
                newEstablishment={newEstablishment}
                onEstablishmentSelect={setSelectedEstablishment}
                onCreateModeChange={setCreateMode}
                onNewEstablishmentChange={setNewEstablishment}
              />
            )}

            {currentStep === 2 && (
              <Step2DocumentUpload
                documents={documents}
                isDragging={isDragging}
                isUploading={isUploading}
                onFileSelect={handleFileSelect}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onRemoveDocument={handleRemoveDocument}
              />
            )}

            {currentStep === 3 && (
              <Step3Confirmation
                createMode={createMode}
                selectedEstablishment={selectedEstablishment}
                newEstablishmentName={newEstablishment.name}
                documentsCount={documents.length}
                verificationCode={verificationCode}
                requestMessage={requestMessage}
                onVerificationCodeChange={setVerificationCode}
                onRequestMessageChange={setRequestMessage}
              />
            )}
          </div>

          {/* Footer with navigation */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '2px solid rgba(193, 154, 107, 0.2)'
          }}>
            <button
              onClick={currentStep === 1 ? onClose : handleBack}
              disabled={isSubmitting}
              style={{
                background: 'linear-gradient(135deg, rgba(100, 100, 100, 0.3), rgba(50, 50, 50, 0.5))',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                padding: '12px 30px',
                borderRadius: '8px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                opacity: isSubmitting ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(120, 120, 120, 0.4), rgba(70, 70, 70, 0.6))';
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 5px 15px rgba(255, 255, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(100, 100, 100, 0.3), rgba(50, 50, 50, 0.5))';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {currentStep === 1 ? t('common.cancel', 'Cancel') : t('common.back', 'Back')}
            </button>

            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                disabled={isSubmitting}
                style={{
                  background: isSubmitting
                    ? 'linear-gradient(135deg, rgba(100, 100, 100, 0.3), rgba(50, 50, 50, 0.5))'
                    : 'linear-gradient(135deg, #C19A6B, #FFD700)',
                  border: '2px solid rgba(193, 154, 107, 0.6)',
                  color: isSubmitting ? 'rgba(255, 255, 255, 0.5)' : '#000',
                  padding: '12px 30px',
                  borderRadius: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  boxShadow: isSubmitting ? 'none' : '0 0 15px rgba(193, 154, 107, 0.4)'
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 5px 20px rgba(193, 154, 107, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #C19A6B, #FFD700)';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(193, 154, 107, 0.4)';
                  }
                }}
              >
                {t('common.next', 'Next')} →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{
                  background: isSubmitting
                    ? 'linear-gradient(135deg, rgba(100, 100, 100, 0.3), rgba(50, 50, 50, 0.5))'
                    : 'linear-gradient(135deg, #00E5FF, #00B8D4)',
                  border: isSubmitting ? '2px solid rgba(255, 255, 255, 0.2)' : '2px solid rgba(0, 229, 255, 0.6)',
                  color: isSubmitting ? 'rgba(255, 255, 255, 0.5)' : '#000',
                  padding: '12px 30px',
                  borderRadius: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  boxShadow: isSubmitting ? 'none' : '0 0 15px rgba(0, 229, 255, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #00B8D4, #0097A7)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 5px 20px rgba(0, 229, 255, 0.7)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #00E5FF, #00B8D4)';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 229, 255, 0.5)';
                  }
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    {t('common.submitting', 'Submitting...')}
                  </>
                ) : (
                  <>
                    <Rocket size={18} /> {t('ownership.submitRequest', 'Submit Request')}
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default RequestOwnershipModal;
