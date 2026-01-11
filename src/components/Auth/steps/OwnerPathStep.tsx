import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Crown, Building2, Rocket, CheckCircle, MapPin, Upload, Mail, MessageSquare, Loader2, Send, CheckSquare } from 'lucide-react';
import { Establishment } from '../../../types';
import { getZoneLabel } from '../../../utils/constants';
import { EstablishmentAutocomplete, DocumentUploadGrid } from '../components';
import type { OwnerPath } from './types';

interface OwnerPathStepProps {
  // Path selection
  ownerPath: OwnerPath;
  onPathChange: (path: OwnerPath) => void;

  // Establishment search (for claiming)
  establishmentSearch: string;
  onEstablishmentSearchChange: (value: string) => void;
  onEstablishmentSelect: (est: Establishment) => void;
  onEstablishmentClear: () => void;
  establishments: Establishment[];

  // Selected establishment to claim
  selectedEstablishment: Establishment | null;

  // Document upload
  documents: File[];
  onDocumentsChange: (docs: File[]) => void;
  documentErrors: string;
  onDocumentError: (error: string) => void;

  // Contact preference
  contactMe: boolean;
  onContactMeChange: (checked: boolean) => void;

  // Message
  message: string;
  onMessageChange: (message: string) => void;

  // Terms acceptance (for claim flow)
  acceptedTerms: boolean;
  onAcceptedTermsChange: (accepted: boolean) => void;

  // Navigation
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

/**
 * OwnerPathStep - Step 3 for Owner registration
 *
 * Allows the owner to choose between:
 * - Claiming an existing establishment
 * - Creating a new establishment
 */
const OwnerPathStep: React.FC<OwnerPathStepProps> = ({
  ownerPath,
  onPathChange,
  establishmentSearch,
  onEstablishmentSearchChange,
  onEstablishmentSelect,
  onEstablishmentClear,
  establishments,
  selectedEstablishment,
  documents,
  onDocumentsChange,
  documentErrors,
  onDocumentError,
  contactMe,
  onContactMeChange,
  message,
  onMessageChange,
  acceptedTerms,
  onAcceptedTermsChange,
  isLoading,
  onPrevious,
  onNext,
  onSubmit,
}) => {
  const { t } = useTranslation();

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{
        display: 'block',
        color: '#C19A6B',
        fontSize: '14px',
        fontWeight: 'bold',
        marginBottom: '10px'
      }}>
        <Crown size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('register.ownerPathTitle')}
      </label>

      {/* Option: Claim Existing Establishment */}
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        border: `2px solid ${ownerPath === 'claim' ? '#C19A6B' : 'rgba(255,255,255,0.2)'}`,
        borderRadius: '12px',
        background: ownerPath === 'claim'
          ? 'linear-gradient(135deg, rgba(193,154,107,0.1), rgba(193,154,107,0.2))'
          : 'rgba(0,0,0,0.3)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        marginBottom: '12px'
      }}>
        <input
          type="radio"
          name="ownerPath"
          value="claim"
          checked={ownerPath === 'claim'}
          onChange={() => onPathChange('claim')}
          style={{ accentColor: '#C19A6B' }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '15px' }}>
            <Building2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.claimExistingEstablishment')}
          </div>
          <div style={{ color: '#cccccc', fontSize: '12px', marginTop: '4px' }}>
            {t('register.claimExistingEstablishmentDesc')}
          </div>
        </div>
      </label>

      {/* Claim Establishment Section */}
      {ownerPath === 'claim' && (
        <div style={{ marginBottom: '16px', paddingLeft: '16px' }}>
          {/* Establishment Search */}
          <div style={{ marginBottom: '12px' }}>
            <EstablishmentAutocomplete
              value={establishmentSearch}
              onChange={onEstablishmentSearchChange}
              onSelect={onEstablishmentSelect}
              onClear={onEstablishmentClear}
              establishments={establishments}
              excludeWithOwner={true}
              label={t('register.searchYourEstablishment')}
              selectedId={selectedEstablishment?.id}
            />
          </div>

          {/* Selected Establishment Preview */}
          {selectedEstablishment && (
            <div style={{
              padding: '12px',
              background: 'rgba(193,154,107,0.1)',
              border: '1px solid rgba(193,154,107,0.3)',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} style={{ color: '#C19A6B' }} />
                <span style={{ color: '#ffffff', fontWeight: 'bold' }}>
                  {selectedEstablishment.name}
                </span>
              </div>
              {selectedEstablishment.zone && (
                <div style={{ color: '#999999', fontSize: '12px', marginTop: '4px', marginLeft: '24px' }}>
                  <MapPin size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  {getZoneLabel(selectedEstablishment.zone)}
                </div>
              )}
            </div>
          )}

          {/* Document Upload Section (Optional) */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              color: '#C19A6B',
              fontSize: '13px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              <Upload size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('register.uploadOwnershipDocuments')}
              <span style={{ color: '#999999', fontWeight: 'normal', marginLeft: '8px' }}>
                ({t('register.optional')})
              </span>
            </label>
            <DocumentUploadGrid
              documents={documents}
              onChange={onDocumentsChange}
              error={documentErrors}
              onError={onDocumentError}
              description={t('register.uploadOwnershipDocumentsDesc')}
              accentColor="#C19A6B"
            />
          </div>

          {/* Contact Me Checkbox */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              padding: '12px',
              background: contactMe ? 'rgba(193,154,107,0.1)' : 'transparent',
              border: `1px solid ${contactMe ? 'rgba(193,154,107,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '8px',
              transition: 'all 0.3s ease'
            }}>
              <input
                type="checkbox"
                checked={contactMe}
                onChange={(e) => onContactMeChange(e.target.checked)}
                style={{ accentColor: '#C19A6B' }}
              />
              <div>
                <div style={{ color: '#ffffff', fontSize: '14px' }}>
                  <Mail size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  {t('register.ownershipContactMe')}
                </div>
                <div style={{ color: '#999999', fontSize: '12px', marginTop: '2px' }}>
                  {t('register.ownershipContactMeDesc')}
                </div>
              </div>
            </label>
          </div>

          {/* Message Textarea */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              color: '#C19A6B',
              fontSize: '13px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              <MessageSquare size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('register.ownershipMessage')}
              <span style={{ color: '#999999', fontWeight: 'normal', marginLeft: '8px' }}>
                ({t('register.optional')})
              </span>
            </label>
            <textarea
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder={t('register.ownershipMessagePlaceholder')}
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0,0,0,0.4)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '14px',
                resize: 'vertical',
                minHeight: '80px'
              }}
            />
          </div>
        </div>
      )}

      {/* Option: Create New Establishment */}
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        border: `2px solid ${ownerPath === 'create' ? '#C19A6B' : 'rgba(255,255,255,0.2)'}`,
        borderRadius: '12px',
        background: ownerPath === 'create'
          ? 'linear-gradient(135deg, rgba(193,154,107,0.1), rgba(193,154,107,0.2))'
          : 'rgba(0,0,0,0.3)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        marginBottom: '12px'
      }}>
        <input
          type="radio"
          name="ownerPath"
          value="create"
          checked={ownerPath === 'create'}
          onChange={() => onPathChange('create')}
          style={{ accentColor: '#C19A6B' }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '15px' }}>
            <Rocket size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.createNewEstablishment')}
          </div>
          <div style={{ color: '#cccccc', fontSize: '12px', marginTop: '4px' }}>
            {t('register.createNewEstablishmentDesc')}
          </div>
        </div>
      </label>

      {/* Terms Acceptance Checkbox - GDPR/PDPA Compliance (only show for claim) */}
      {ownerPath === 'claim' && selectedEstablishment && (
        <div style={{
          marginTop: '20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '16px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <input
            type="checkbox"
            id="acceptedTermsOwnerClaim"
            checked={acceptedTerms}
            onChange={(e) => onAcceptedTermsChange(e.target.checked)}
            style={{
              width: '20px',
              height: '20px',
              marginTop: '2px',
              accentColor: '#10b981',
              cursor: 'pointer',
              flexShrink: 0
            }}
            required
          />
          <label
            htmlFor="acceptedTermsOwnerClaim"
            style={{
              color: 'rgba(248, 250, 252, 0.9)',
              fontSize: '14px',
              lineHeight: '1.5',
              cursor: 'pointer'
            }}
          >
            <CheckSquare size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#10b981' }} />
            {t('register.acceptTerms', 'I accept the')}{' '}
            <Link to="/privacy-policy" target="_blank" style={{ color: '#E879F9', textDecoration: 'none' }}>
              {t('register.privacyPolicy', 'Privacy Policy')}
            </Link>
            {' '}{t('register.and', 'and')}{' '}
            <Link to="/terms" target="_blank" style={{ color: '#E879F9', textDecoration: 'none' }}>
              {t('register.termsOfService', 'Terms of Service')}
            </Link>
            {' *'}
          </label>
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button
          type="button"
          onClick={onPrevious}
          className="btn btn--secondary"
          style={{ flex: 1 }}
        >
          ← {t('register.previousButton')}
        </button>
        {/* Claim → Submit, Create → Next to Step 4 */}
        {ownerPath === 'claim' ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!selectedEstablishment || isLoading || !acceptedTerms}
            className="btn btn--success"
            style={{ flex: 2 }}
          >
            {isLoading ? (
              <><Loader2 size={16} className="spin" style={{ marginRight: '8px' }} /> {t('register.submittingButton')}</>
            ) : (
              <>{t('register.registerButton')} <Send size={16} style={{ marginLeft: '8px' }} /></>
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled={!ownerPath}
            onClick={onNext}
            className="btn btn--success"
            style={{ flex: 2 }}
          >
            {t('register.nextButton')} →
          </button>
        )}
      </div>
    </div>
  );
};

export default OwnerPathStep;
