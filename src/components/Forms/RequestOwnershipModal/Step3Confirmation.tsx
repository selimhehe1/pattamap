/**
 * Step3Confirmation Component
 *
 * Third step of the ownership request wizard.
 * Shows summary and collects optional verification code and message.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import type { Step3Props } from './types';

const Step3Confirmation: React.FC<Step3Props> = ({
  createMode,
  selectedEstablishment,
  newEstablishmentName,
  documentsCount,
  verificationCode,
  requestMessage,
  onVerificationCodeChange,
  onRequestMessageChange
}) => {
  const { t } = useTranslation();

  const establishmentName = createMode ? newEstablishmentName : selectedEstablishment?.name;

  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '12px',
      padding: '25px',
      border: '1px solid rgba(193, 154, 107, 0.2)'
    }}>
      <h3 style={{
        color: '#FFD700',
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '10px',
        textShadow: '0 0 5px rgba(255, 215, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <CheckCircle size={20} /> {t('ownership.step3Title', 'Final Details')}
      </h3>

      <p style={{
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '14px',
        marginBottom: '20px',
        lineHeight: '1.6'
      }}>
        {t('ownership.step3Description', 'Review your request and provide additional information')}
      </p>

      {/* Summary Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(193, 154, 107, 0.1), rgba(0, 0, 0, 0.4))',
        border: '2px solid rgba(193, 154, 107, 0.3)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '25px'
      }}>
        <h4 style={{
          color: '#C19A6B',
          fontSize: '16px',
          fontWeight: 'bold',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📋 {t('ownership.requestSummary', 'Request Summary')}
        </h4>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 0',
          borderBottom: '1px solid rgba(193, 154, 107, 0.2)'
        }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
            {t('ownership.establishment', 'Establishment')}:
          </span>
          <span style={{
            color: '#FFD700',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {establishmentName}
            {createMode && (
              <span style={{
                background: 'linear-gradient(45deg, #00E5FF, #00B8D4)',
                color: '#000',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                {t('ownership.new', 'NEW')}
              </span>
            )}
          </span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 0'
        }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
            {t('ownership.documents', 'Documents')}:
          </span>
          <span style={{
            color: '#FFD700',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {documentsCount} {t('ownership.files', 'file(s)')}
          </span>
        </div>
      </div>

      {/* Verification code (optional) */}
      <div style={{ marginBottom: '20px' }}>
        <label
          htmlFor="verification-code"
          style={{
            display: 'block',
            color: '#C19A6B',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '8px'
          }}
        >
          🔑 {t('ownership.verificationCode', 'Verification Code')}{' '}
          <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 'normal', fontSize: '12px' }}>
            ({t('ownership.optional', 'Optional')})
          </span>
        </label>
        <p style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '12px',
          marginBottom: '8px'
        }}>
          {t('ownership.verificationCodeHint', 'If you were given a verification code, enter it here')}
        </p>
        <input
          id="verification-code"
          type="text"
          placeholder={t('ownership.verificationCodePlaceholder', 'e.g., VRF-12345')}
          value={verificationCode}
          onChange={(e) => onVerificationCodeChange(e.target.value)}
          maxLength={50}
          className="input-nightlife"
        />
      </div>

      {/* Request message */}
      <div style={{ marginBottom: '20px' }}>
        <label
          htmlFor="request-message"
          style={{
            display: 'block',
            color: '#C19A6B',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '8px'
          }}
        >
          💬 {t('ownership.additionalMessage', 'Additional Message')}{' '}
          <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 'normal', fontSize: '12px' }}>
            ({t('ownership.optional', 'Optional')})
          </span>
        </label>
        <p style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '12px',
          marginBottom: '8px'
        }}>
          {t('ownership.additionalMessageHint', 'Provide any additional context that may help verify your ownership')}
        </p>
        <textarea
          id="request-message"
          placeholder={t('ownership.additionalMessagePlaceholder', "e.g., I've been managing this establishment since 2020...")}
          value={requestMessage}
          onChange={(e) => onRequestMessageChange(e.target.value)}
          rows={4}
          maxLength={500}
          className="input-nightlife"
          style={{ resize: 'vertical', minHeight: '100px' }}
        />
        <div style={{
          textAlign: 'right',
          color: requestMessage.length >= 450 ? '#FFD700' : 'rgba(255, 255, 255, 0.5)',
          fontSize: '12px',
          marginTop: '5px'
        }}>
          {requestMessage.length} / 500
        </div>
      </div>

      {/* Important notes */}
      <div style={{
        padding: '20px',
        background: 'rgba(255, 165, 0, 0.1)',
        border: '2px solid rgba(255, 165, 0, 0.4)',
        borderRadius: '12px'
      }}>
        <h4 style={{
          color: '#FFA500',
          fontSize: '16px',
          fontWeight: 'bold',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertTriangle size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('ownership.important', 'Important')}
        </h4>
        <ul style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: '13px'
        }}>
          <li style={{ marginBottom: '10px', paddingLeft: '20px', position: 'relative', lineHeight: '1.6' }}>
            <span style={{ position: 'absolute', left: 0, color: '#FFA500' }}>•</span>
            {t('ownership.importantNote1', 'Your request will be reviewed by administrators within 48-72 hours')}
          </li>
          <li style={{ marginBottom: '10px', paddingLeft: '20px', position: 'relative', lineHeight: '1.6' }}>
            <span style={{ position: 'absolute', left: 0, color: '#FFA500' }}>•</span>
            {t('ownership.importantNote2', 'You will receive a notification once your request is processed')}
          </li>
          <li style={{ marginBottom: '10px', paddingLeft: '20px', position: 'relative', lineHeight: '1.6' }}>
            <span style={{ position: 'absolute', left: 0, color: '#FFA500' }}>•</span>
            {t('ownership.importantNote3', 'Approved ownership grants you permission to edit your establishment details')}
          </li>
          <li style={{ paddingLeft: '20px', position: 'relative', lineHeight: '1.6' }}>
            <span style={{ position: 'absolute', left: 0, color: '#FFA500' }}>•</span>
            {t('ownership.importantNote4', 'False ownership claims may result in account suspension')}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Step3Confirmation;
