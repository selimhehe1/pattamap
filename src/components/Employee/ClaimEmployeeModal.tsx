import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { Employee } from '../../types';
import notification from '../../utils/notification';
import { logger } from '../../utils/logger';
import {
  Link,
  Search,
  CheckCircle,
  MessageSquare,
  Camera,
  Rocket,
  Info,
  X,
  Plus,
  Loader2
} from 'lucide-react';
import { premiumModalVariants, premiumBackdropVariants } from '../../animations/variants';
import '../../styles/components/modal-premium-base.css';

interface ClaimEmployeeModalProps {
  onClose: () => void;
  onClaimSubmitted?: () => void;
  preselectedEmployee?: Employee;
  isOpen?: boolean;
}

const ClaimEmployeeModal: React.FC<ClaimEmployeeModalProps> = ({
  onClose,
  onClaimSubmitted,
  preselectedEmployee,
  isOpen = true
}) => {
  const { t } = useTranslation();
  const { claimEmployeeProfile } = useAuth();
  const { secureFetch } = useSecureFetch();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ name: string; nickname?: string; id?: string }[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [message, setMessage] = useState('');
  const [verificationProofs, setVerificationProofs] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_PROOF_URLS = 5;

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/employees/suggestions/names?q=${encodeURIComponent(searchQuery)}`,
          { credentials: 'include' }
        );

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions(true);
        }
      } catch (error) {
        logger.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    if (preselectedEmployee) {
      setSelectedEmployee(preselectedEmployee);
      setSearchQuery(preselectedEmployee.name);
      setShowSuggestions(false);
    }
  }, [preselectedEmployee]);

  const searchEmployeeByName = async (name: string) => {
    try {
      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/employees/search?q=${encodeURIComponent(name)}&limit=10`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        // API returns { employees: [...] } format
        const employees = data.employees || [];
        if (employees.length > 0) {
          const exactMatch = employees.find(
            (emp: Employee) => emp.name.toLowerCase() === name.toLowerCase()
          );
          setSelectedEmployee(exactMatch || employees[0]);
          setShowSuggestions(false);
        } else {
          notification.error(t('claimEmployeeModal.errorEmployeeNotFound'));
        }
      }
    } catch (error) {
      logger.error('Employee search error:', error);
      notification.error(t('claimEmployeeModal.errorSearchFailed'));
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    searchEmployeeByName(suggestion);
  };

  const addProofField = () => {
    if (verificationProofs.length >= MAX_PROOF_URLS) return;
    setVerificationProofs([...verificationProofs, '']);
  };

  const updateProofField = (index: number, value: string) => {
    const updated = [...verificationProofs];
    updated[index] = value;
    setVerificationProofs(updated);
  };

  const removeProofField = (index: number) => {
    setVerificationProofs(verificationProofs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployee) {
      notification.error(t('claimEmployeeModal.errorNoEmployeeSelected'));
      return;
    }

    if (message.trim().length < 10) {
      notification.error(t('claimEmployeeModal.errorMessageTooShort'));
      return;
    }

    setIsLoading(true);

    try {
      const proofs = verificationProofs.filter((p) => p.trim().length > 0);
      await claimEmployeeProfile!(selectedEmployee.id, message.trim(), proofs);

      notification.success(t('claimEmployeeModal.successClaimSubmitted'));
      onClaimSubmitted?.();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit claim request';
      notification.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
            className="modal-premium modal-premium--medium"
            variants={premiumModalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="claim-employee-modal-title"
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
                <Link size={32} />
              </motion.div>
              <motion.h2
                id="claim-employee-modal-title"
                className="modal-premium__title modal-premium__title--info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {t('claimEmployeeModal.title')}
              </motion.h2>
              <motion.p
                className="modal-premium__subtitle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {t('claimEmployeeModal.subtitle')}
              </motion.p>
            </div>

            {/* Content */}
            <motion.div
              className="modal-premium__content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <form onSubmit={handleSubmit}>
                {/* Step 1: Search Employee */}
                {!preselectedEmployee && (
                  <motion.div
                    className="modal-premium__field"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <label className="modal-premium__label">
                      <Search size={14} />
                      {t('claimEmployeeModal.searchLabel')}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('claimEmployeeModal.searchPlaceholder')}
                        className="modal-premium__input"
                        onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                      />
                      {isSearching && (
                        <motion.div
                          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#00E5FF' }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Loader2 size={18} />
                        </motion.div>
                      )}

                      {/* Suggestions Dropdown */}
                      <AnimatePresence>
                        {showSuggestions && suggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              marginTop: '4px',
                              background: 'rgba(0,0,0,0.95)',
                              border: '2px solid rgba(0, 229, 255, 0.5)',
                              borderRadius: '12px',
                              maxHeight: '200px',
                              overflowY: 'auto',
                              zIndex: 10,
                              backdropFilter: 'blur(10px)',
                            }}
                          >
                            {suggestions.map((suggestion, idx) => (
                              <motion.div
                                key={idx}
                                onClick={() => handleSuggestionClick(suggestion.name)}
                                style={{
                                  padding: '12px 16px',
                                  cursor: 'pointer',
                                  borderBottom: idx < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                }}
                                whileHover={{ background: 'rgba(0,229,255,0.1)' }}
                              >
                                <div style={{ color: '#ffffff', fontWeight: 'bold' }}>
                                  {suggestion.name}
                                  {suggestion.nickname && (
                                    <span style={{ color: '#cccccc', marginLeft: '8px' }}>({suggestion.nickname})</span>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <span className="modal-premium__hint">{t('claimEmployeeModal.searchHint')}</span>
                  </motion.div>
                )}

                {/* Selected Employee Preview */}
                <AnimatePresence>
                  {selectedEmployee && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      style={{
                        padding: '16px',
                        background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(232, 121, 249,0.1))',
                        border: '2px solid rgba(0, 229, 255, 0.5)',
                        borderRadius: '12px',
                        marginBottom: '20px',
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#00E5FF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle size={16} />
                        {t('claimEmployeeModal.selectedProfileLabel')}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {selectedEmployee.photos && selectedEmployee.photos[0] && (
                          <img
                            src={selectedEmployee.photos[0]}
                            alt={selectedEmployee.name}
                            style={{
                              width: '60px',
                              height: '60px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '2px solid rgba(0, 229, 255, 0.3)',
                            }}
                          />
                        )}
                        <div>
                          <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>
                            {selectedEmployee.name}
                          </div>
                          {selectedEmployee.nickname && (
                            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                              {t('claimEmployeeModal.nicknamePrefix')} "{selectedEmployee.nickname}"
                            </div>
                          )}
                          {selectedEmployee.age && selectedEmployee.nationality && (
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px' }}>
                              {t('claimEmployeeModal.yearsOld', { age: selectedEmployee.age })} {t('claimEmployeeModal.ageSeparator')} {selectedEmployee.nationality}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step 2: Justification Message */}
                <motion.div
                  className="modal-premium__field"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <label className="modal-premium__label" style={{ color: '#E879F9' }}>
                    <MessageSquare size={14} />
                    {t('claimEmployeeModal.messageLabelRequired')} *
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('claimEmployeeModal.messagePlaceholder')}
                    rows={4}
                    required
                    minLength={10}
                    className="modal-premium__textarea"
                  />
                  <span className={`modal-premium__char-counter ${message.length >= 10 ? 'modal-premium__char-counter--success' : ''}`}>
                    {t('claimEmployeeModal.characterCount', { count: message.length })}
                  </span>
                </motion.div>

                {/* Step 3: Verification Proof */}
                <motion.div
                  className="modal-premium__field"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <label className="modal-premium__label">
                    <Camera size={14} />
                    {t('claimEmployeeModal.verificationProofLabel')}
                  </label>
                  <span className="modal-premium__hint" style={{ marginBottom: '12px', display: 'block' }}>
                    {t('claimEmployeeModal.verificationProofHint')}
                  </span>

                  {verificationProofs.map((proof, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}
                    >
                      <input
                        type="url"
                        value={proof}
                        onChange={(e) => updateProofField(index, e.target.value)}
                        placeholder={t('claimEmployeeModal.verificationProofPlaceholder')}
                        className="modal-premium__input"
                        style={{ flex: 1 }}
                      />
                      {verificationProofs.length > 1 && (
                        <motion.button
                          type="button"
                          onClick={() => removeProofField(index)}
                          className="modal-premium__btn-secondary"
                          style={{ padding: '10px 16px', minWidth: 'auto' }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <X size={16} />
                        </motion.button>
                      )}
                    </motion.div>
                  ))}

                  <motion.button
                    type="button"
                    onClick={addProofField}
                    disabled={verificationProofs.length >= MAX_PROOF_URLS}
                    className="modal-premium__btn-secondary"
                    style={{ marginTop: '8px', opacity: verificationProofs.length >= MAX_PROOF_URLS ? 0.5 : 1 }}
                    whileHover={{ scale: verificationProofs.length >= MAX_PROOF_URLS ? 1 : 1.02 }}
                    whileTap={{ scale: verificationProofs.length >= MAX_PROOF_URLS ? 1 : 0.98 }}
                  >
                    <Plus size={14} />
                    {t('claimEmployeeModal.addProofButton')} ({verificationProofs.length}/{MAX_PROOF_URLS})
                  </motion.button>
                </motion.div>

                {/* Info Box */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  style={{
                    padding: '16px',
                    background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,229,255,0.05))',
                    border: '1px solid rgba(0,229,255,0.3)',
                    borderRadius: '12px',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#00E5FF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={16} />
                    {t('claimEmployeeModal.whatHappensNextTitle')}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.6' }}>
                    <li>{t('claimEmployeeModal.whatHappensNextStep1')}</li>
                    <li>{t('claimEmployeeModal.whatHappensNextStep2')}</li>
                    <li>{t('claimEmployeeModal.whatHappensNextStep3')}</li>
                  </ul>
                </motion.div>

                {/* Footer */}
                <motion.div
                  className="modal-premium__footer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <motion.button
                    type="button"
                    className="modal-premium__btn-secondary"
                    onClick={onClose}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <X size={16} />
                    {t('common.cancel', 'Cancel')}
                  </motion.button>
                  <motion.button
                    type="submit"
                    className="modal-premium__btn-primary modal-premium__btn-success"
                    disabled={isLoading || !selectedEmployee || message.trim().length < 10}
                    style={{ opacity: !selectedEmployee || message.trim().length < 10 ? 0.5 : 1 }}
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  >
                    {isLoading ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Loader2 size={16} />
                        </motion.span>
                        {t('claimEmployeeModal.buttonSubmitting')}
                      </>
                    ) : (
                      <>
                        <Rocket size={16} />
                        {t('claimEmployeeModal.buttonSubmitClaim')}
                      </>
                    )}
                  </motion.button>
                </motion.div>
              </form>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default ClaimEmployeeModal;
