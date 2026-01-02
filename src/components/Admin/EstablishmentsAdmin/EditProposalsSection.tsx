/**
 * EditProposalsSection Component
 *
 * Displays and manages edit proposals for establishments.
 * Uses DOMPurify for XSS protection when rendering formatted values.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import {
  Pencil,
  BarChart3,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { formatValueForDisplay } from './formatProposalValue';
import type { EditProposalsSectionProps } from './types';

/**
 * Safely render HTML content using DOMPurify sanitization
 */
const createSanitizedMarkup = (html: string) => ({
  __html: DOMPurify.sanitize(html)
});

const EditProposalsSection: React.FC<EditProposalsSectionProps> = ({
  editProposals,
  selectedProposal,
  processingIds,
  onSelectProposal,
  onApproveProposal,
  onRejectProposal
}) => {
  const { t } = useTranslation();

  // Empty state
  if (editProposals.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
        borderRadius: '20px',
        border: '2px solid rgba(193, 154, 107,0.3)',
        padding: '40px',
        textAlign: 'center'
      }}>
        <h3 style={{
          color: 'var(--color-primary)',
          fontSize: '20px',
          fontWeight: 'bold',
          margin: '0 0 10px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <CheckCircle size={20} style={{ color: 'var(--color-success)' }} /> {t('admin.noPendingEdits')}
        </h3>
        <p style={{ color: '#cccccc', fontSize: '16px' }}>
          {t('admin.allEditsReviewed')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {editProposals.map((proposal) => (
        <div
          key={proposal.id}
          style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(0,0,0,0.3))',
            borderRadius: '20px',
            border: '2px solid rgba(255,215,0,0.3)',
            padding: '25px',
            position: 'relative'
          }}
        >
          {/* Badge */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '8px 15px',
            borderRadius: '20px',
            background: 'rgba(255,215,0,0.2)',
            border: '2px solid #FFD700',
            color: '#FFD700',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Pencil size={14} /> {t('admin.editProposal')}
          </div>

          {/* Header */}
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ color: '#FFD700', fontSize: '18px', margin: '0 0 5px 0' }}>
              {t('admin.editFor')} {String(proposal.current_values?.name || t('admin.establishments'))}
            </h3>
            <p style={{ color: '#cccccc', fontSize: '14px', margin: 0 }}>
              {t('admin.proposedBy')} <strong style={{ color: '#00E5FF' }}>{proposal.proposed_by_user?.pseudonym || t('admin.unknown')}</strong>
            </p>
          </div>

          {/* Toggle Button */}
          <button
            onClick={() => onSelectProposal(selectedProposal?.id === proposal.id ? null : proposal)}
            style={{
              padding: '10px 20px',
              background: selectedProposal?.id === proposal.id
                ? 'linear-gradient(45deg, #FFD700, #FFA500)'
                : 'linear-gradient(45deg, rgba(255,215,0,0.2), rgba(255,165,0,0.2))',
              color: selectedProposal?.id === proposal.id ? '#000' : '#FFD700',
              border: '1px solid #FFD700',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {selectedProposal?.id === proposal.id ? `▲ ${t('admin.hideChanges')}` : `▼ ${t('admin.viewChanges')}`}
          </button>

          {/* Expanded Changes View */}
          {selectedProposal?.id === proposal.id && (
            <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(0,0,0,0.4)', borderRadius: '15px' }}>
              <h5 style={{ color: '#FFD700', fontSize: '16px', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={16} /> {t('admin.proposedChanges')}
              </h5>

              {Object.keys(proposal.proposed_changes).map(key => {
                const currentValue = proposal.current_values?.[key];
                const proposedValue = proposal.proposed_changes[key];

                if (JSON.stringify(currentValue) === JSON.stringify(proposedValue)) return null;

                return (
                  <div key={key} style={{ marginBottom: '15px', padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
                    <strong style={{ color: '#FFD700', fontSize: '14px', textTransform: 'uppercase' }}>
                      {key.replace(/_/g, ' ')}:
                    </strong>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {/* Before - sanitized with DOMPurify */}
                      <div style={{
                        flex: 1,
                        minWidth: '200px',
                        padding: '10px',
                        background: 'rgba(255,71,87,0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,71,87,0.3)'
                      }}>
                        <div style={{ color: '#FF4757', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle size={12} /> {t('admin.before')}
                        </div>
                        <div
                          style={{ color: '#ffffff', fontSize: '13px', wordBreak: 'break-word', lineHeight: '1.6' }}
                          dangerouslySetInnerHTML={createSanitizedMarkup(formatValueForDisplay(currentValue, key))}
                        />
                      </div>
                      {/* After - sanitized with DOMPurify */}
                      <div style={{
                        flex: 1,
                        minWidth: '200px',
                        padding: '10px',
                        background: 'rgba(0,255,127,0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(0,255,127,0.3)'
                      }}>
                        <div style={{ color: '#00FF7F', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={12} /> {t('admin.after')}
                        </div>
                        <div
                          style={{ color: '#ffffff', fontSize: '13px', wordBreak: 'break-word', lineHeight: '1.6' }}
                          dangerouslySetInnerHTML={createSanitizedMarkup(formatValueForDisplay(proposedValue, key))}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                <button
                  onClick={() => onApproveProposal(proposal.id)}
                  disabled={processingIds.has(proposal.id)}
                  style={{
                    flex: 1,
                    padding: '15px 25px',
                    background: processingIds.has(proposal.id) ? '#666' : 'linear-gradient(45deg, #00FF7F, #00D4AA)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: processingIds.has(proposal.id) ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {processingIds.has(proposal.id) ? (
                    <><Loader2 size={16} className="animate-spin" /> {t('admin.processing')}</>
                  ) : (
                    <><CheckCircle size={16} /> {t('admin.approveAndApply')}</>
                  )}
                </button>

                <button
                  onClick={() => onRejectProposal(proposal.id)}
                  disabled={processingIds.has(proposal.id)}
                  style={{
                    flex: 1,
                    padding: '15px 25px',
                    background: processingIds.has(proposal.id) ? '#666' : 'linear-gradient(45deg, #FF4757, #FF1744)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: processingIds.has(proposal.id) ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {processingIds.has(proposal.id) ? (
                    <><Loader2 size={16} className="animate-spin" /> {t('admin.processing')}</>
                  ) : (
                    <><XCircle size={16} /> {t('admin.reject')}</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default EditProposalsSection;
