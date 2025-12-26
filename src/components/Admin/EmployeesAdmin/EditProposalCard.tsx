/**
 * Edit proposal card component for EmployeesAdmin
 * Displays pending edit proposals with expandable diff view
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { EditProposalDiff } from './EditProposalDiff';
import type { EditProposal } from './types';

interface EditProposalCardProps {
  proposal: EditProposal;
  isExpanded: boolean;
  isProcessing: boolean;
  establishmentNames: Record<string, string>;
  onToggleExpand: () => void;
  onApprove: (proposalId: string) => void;
  onReject: (proposalId: string) => void;
}

export const EditProposalCard: React.FC<EditProposalCardProps> = ({
  proposal,
  isExpanded,
  isProcessing,
  establishmentNames,
  onToggleExpand,
  onApprove,
  onReject,
}) => {
  const { t } = useTranslation();

  // Get all changed fields
  const changedFields = Object.keys(proposal.proposed_changes).filter(
    (key) =>
      JSON.stringify(proposal.current_values?.[key]) !==
      JSON.stringify(proposal.proposed_changes[key])
  );

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(0,0,0,0.3))',
        borderRadius: '20px',
        border: '2px solid rgba(255,215,0,0.3)',
        padding: '25px',
        position: 'relative',
      }}
    >
      {/* Edit Proposal Badge */}
      <div
        style={{
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
        }}
      >
        <Pencil size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.editProposal')}
      </div>

      {/* Header */}
      <div style={{ marginBottom: '15px' }}>
        <h3 style={{ color: '#FFD700', fontSize: '18px', margin: '0 0 5px 0' }}>
          {t('admin.editFor')} {String(proposal.current_values?.name || t('admin.employees'))}
        </h3>
        <p style={{ color: '#cccccc', fontSize: '14px', margin: 0 }}>
          {t('admin.proposedBy')}{' '}
          <strong style={{ color: '#00E5FF' }}>
            {proposal.proposed_by_user?.pseudonym || t('admin.unknown')}
          </strong>
        </p>
      </div>

      {/* Expand/Collapse Button */}
      <button
        onClick={onToggleExpand}
        style={{
          padding: '10px 20px',
          background: isExpanded
            ? 'linear-gradient(45deg, #FFD700, #FFA500)'
            : 'linear-gradient(45deg, rgba(255,215,0,0.2), rgba(255,165,0,0.2))',
          color: isExpanded ? '#000' : '#FFD700',
          border: '1px solid #FFD700',
          borderRadius: '10px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        {isExpanded ? `▲ ${t('admin.hideChanges')}` : `▼ ${t('admin.viewChanges')}`}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div
          style={{
            marginTop: '20px',
            padding: '20px',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '15px',
          }}
        >
          <h5
            style={{
              color: '#FFD700',
              fontSize: '18px',
              margin: '0 0 20px 0',
              borderBottom: '2px solid rgba(255,215,0,0.3)',
              paddingBottom: '10px',
            }}
          >
            📊 {t('admin.proposedChanges')}
          </h5>

          {/* Diff Views */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {changedFields.map((key) => (
              <EditProposalDiff
                key={key}
                fieldKey={key}
                currentValue={proposal.current_values?.[key]}
                proposedValue={proposal.proposed_changes[key]}
                establishmentNames={establishmentNames}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
            <button
              onClick={() => onApprove(proposal.id)}
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '15px 25px',
                background: isProcessing
                  ? '#666'
                  : 'linear-gradient(45deg, #00FF7F, #00D4AA)',
                color: '#000',
                border: 'none',
                borderRadius: '12px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              {isProcessing
                ? <><Loader2 size={16} style={{ marginRight: '4px', verticalAlign: 'middle', animation: 'spin 1s linear infinite' }} />{t('admin.processing')}</>
                : <><CheckCircle size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.approveAndApply')}</>}
            </button>

            <button
              onClick={() => onReject(proposal.id)}
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '15px 25px',
                background: isProcessing
                  ? '#666'
                  : 'linear-gradient(45deg, #FF4757, #FF1744)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              {isProcessing ? <><Loader2 size={16} style={{ marginRight: '4px', verticalAlign: 'middle', animation: 'spin 1s linear infinite' }} />{t('admin.processing')}</> : <><XCircle size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.reject')}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProposalCard;
