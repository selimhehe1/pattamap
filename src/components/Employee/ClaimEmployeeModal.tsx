import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { Employee } from '../../types';
import toast from '../../utils/toast';
import '../../styles/components/modal-forms.css';

interface ClaimEmployeeModalProps {
  onClose: () => void;
  onClaimSubmitted?: () => void;
  preselectedEmployee?: Employee; // 🆕 v10.0.2 - Allow pre-filling modal with specific employee
}

/**
 * ClaimEmployeeModal
 * Modal allowing users to claim an existing employee profile
 * Features:
 * - Autocomplete search for employee profiles
 * - Message input (justification)
 * - Optional verification proof (URLs to images/documents)
 * - Submit claim request for admin approval
 */
const ClaimEmployeeModal: React.FC<ClaimEmployeeModalProps> = ({ onClose, onClaimSubmitted, preselectedEmployee }) => {
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

  // Debounced search for employee name suggestions
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
          `${process.env.REACT_APP_API_URL}/api/employees/suggestions/names?q=${encodeURIComponent(searchQuery)}`,
          {
            credentials: 'include',
          }
        );

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Search error:', error);
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

  // 🆕 v10.0.2 - Pre-fill if employee is preselected (from wizard or gallery)
  useEffect(() => {
    if (preselectedEmployee) {
      setSelectedEmployee(preselectedEmployee);
      setSearchQuery(preselectedEmployee.name);
      setShowSuggestions(false);
    }
  }, [preselectedEmployee]);

  // Search full employee details by name
  const searchEmployeeByName = async (name: string) => {
    try {
      const response = await secureFetch(
        `${process.env.REACT_APP_API_URL}/api/employees/search?q=${encodeURIComponent(name)}&limit=10`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          // Find exact match or take first result
          const exactMatch = data.data.find(
            (emp: Employee) => emp.name.toLowerCase() === name.toLowerCase()
          );
          setSelectedEmployee(exactMatch || data.data[0]);
          setShowSuggestions(false);
        } else {
          toast.error(t('claimEmployeeModal.errorEmployeeNotFound'));
        }
      }
    } catch (error) {
      console.error('Employee search error:', error);
      toast.error(t('claimEmployeeModal.errorSearchFailed'));
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    searchEmployeeByName(suggestion);
  };

  const addProofField = () => {
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
      toast.error(t('claimEmployeeModal.errorNoEmployeeSelected'));
      return;
    }

    if (message.trim().length < 10) {
      toast.error(t('claimEmployeeModal.errorMessageTooShort'));
      return;
    }

    setIsLoading(true);

    try {
      // Filter out empty proof URLs
      const proofs = verificationProofs.filter((p) => p.trim().length > 0);

      await claimEmployeeProfile!(selectedEmployee.id, message.trim(), proofs);

      toast.success(t('claimEmployeeModal.successClaimSubmitted'));
      onClaimSubmitted?.();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit claim request';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay-nightlife">
      <div className="modal-form-container" style={{ maxWidth: '700px' }}>
        <button onClick={onClose} className="modal-close-button" aria-label="Close">
          ×
        </button>

        <div className="modal-header">
          <h2 className="header-title-nightlife">🔗 {t('claimEmployeeModal.title')}</h2>
          <p className="modal-subtitle">
            {t('claimEmployeeModal.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-layout">
          {/* Step 1: Search Employee - Hidden if preselected */}
          {!preselectedEmployee && (
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                color: '#00E5FF',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}
            >
              🔍 {t('claimEmployeeModal.searchLabel')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('claimEmployeeModal.searchPlaceholder')}
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 16px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                }}
                onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
              />
              {isSearching && (
                <div
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                >
                  <span className="loading-spinner-small-nightlife" />
                </div>
              )}

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'rgba(0,0,0,0.95)',
                    border: '2px solid #00E5FF',
                    borderRadius: '12px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 10,
                  }}
                >
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion.name)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: idx < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0,229,255,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ color: '#ffffff', fontWeight: 'bold' }}>
                        {suggestion.name}
                        {suggestion.nickname && <span style={{ color: '#cccccc', marginLeft: '8px' }}>({suggestion.nickname})</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ fontSize: '12px', color: '#cccccc', marginTop: '6px' }}>
              {t('claimEmployeeModal.searchHint')}
            </div>
          </div>
          )}

          {/* Selected Employee Preview */}
          {selectedEmployee && (
            <div
              style={{
                padding: '16px',
                background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,229,255,0.2))',
                border: '2px solid #00E5FF',
                borderRadius: '12px',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#00E5FF' }}>
                ✅ {t('claimEmployeeModal.selectedProfileLabel')}
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
                    }}
                  />
                )}
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>
                    {selectedEmployee.name}
                  </div>
                  {selectedEmployee.nickname && (
                    <div style={{ color: '#cccccc', fontSize: '13px' }}>
                      {t('claimEmployeeModal.nicknamePrefix')} "{selectedEmployee.nickname}"
                    </div>
                  )}
                  {selectedEmployee.age && selectedEmployee.nationality && (
                    <div style={{ color: '#cccccc', fontSize: '12px', marginTop: '4px' }}>
                      {t('claimEmployeeModal.yearsOld', { age: selectedEmployee.age })} {t('claimEmployeeModal.ageSeparator')} {selectedEmployee.nationality}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Justification Message */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                color: '#C19A6B',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}
            >
              💬 {t('claimEmployeeModal.messageLabelRequired')} *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('claimEmployeeModal.messagePlaceholder')}
              rows={4}
              required
              minLength={10}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0,0,0,0.4)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
            <div
              style={{
                fontSize: '12px',
                color: message.length >= 10 ? '#00E5FF' : '#cccccc',
                marginTop: '4px',
              }}
            >
              {t('claimEmployeeModal.characterCount', { count: message.length })}
            </div>
          </div>

          {/* Step 3: Verification Proof (Optional) */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                color: '#00E5FF',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}
            >
              📸 {t('claimEmployeeModal.verificationProofLabel')}
            </label>
            <div style={{ fontSize: '12px', color: '#cccccc', marginBottom: '12px' }}>
              {t('claimEmployeeModal.verificationProofHint')}
            </div>

            {verificationProofs.map((proof, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="url"
                  value={proof}
                  onChange={(e) => updateProofField(index, e.target.value)}
                  placeholder={t('claimEmployeeModal.verificationProofPlaceholder')}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                  }}
                />
                {verificationProofs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProofField(index)}
                    style={{
                      padding: '10px 16px',
                      background: 'rgba(193, 154, 107,0.2)',
                      border: '1px solid #C19A6B',
                      borderRadius: '8px',
                      color: '#C19A6B',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addProofField}
              style={{
                padding: '8px 16px',
                background: 'rgba(0,229,255,0.1)',
                border: '1px solid #00E5FF',
                borderRadius: '8px',
                color: '#00E5FF',
                cursor: 'pointer',
                fontSize: '13px',
                marginTop: '8px',
              }}
            >
              + {t('claimEmployeeModal.addProofButton')}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !selectedEmployee || message.trim().length < 10}
            className={`btn-nightlife-base btn-success-nightlife ${isLoading ? 'btn-loading' : ''}`}
            style={{
              width: '100%',
              opacity: !selectedEmployee || message.trim().length < 10 ? 0.5 : 1,
            }}
          >
            {isLoading ? (
              <span className="loading-flex">
                <span className="loading-spinner-small-nightlife" />
                {t('claimEmployeeModal.buttonSubmitting')}
              </span>
            ) : (
              `🚀 ${t('claimEmployeeModal.buttonSubmitClaim')}`
            )}
          </button>

          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(0,229,255,0.1)',
              border: '1px solid rgba(0,229,255,0.3)',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#cccccc',
            }}
          >
            <strong style={{ color: '#00E5FF' }}>ℹ️ {t('claimEmployeeModal.whatHappensNextTitle')}</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              <li>{t('claimEmployeeModal.whatHappensNextStep1')}</li>
              <li>{t('claimEmployeeModal.whatHappensNextStep2')}</li>
              <li>{t('claimEmployeeModal.whatHappensNextStep3')}</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClaimEmployeeModal;
