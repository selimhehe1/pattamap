/**
 * Diff view component for edit proposals
 * Shows before/after comparison for proposed changes
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

interface EditProposalDiffProps {
  fieldKey: string;
  currentValue: unknown;
  proposedValue: unknown;
  establishmentNames: Record<string, string>;
}

export const EditProposalDiff: React.FC<EditProposalDiffProps> = ({
  fieldKey,
  currentValue,
  proposedValue,
  establishmentNames,
}) => {
  const { t } = useTranslation();

  // Don't render if values are the same
  if (JSON.stringify(currentValue) === JSON.stringify(proposedValue)) {
    return null;
  }

  const formatValue = (value: unknown, key: string): React.ReactNode => {
    if (value === null || value === undefined) return 'N/A';

    // Handle establishment IDs
    if (key === 'current_establishment_id' && value && typeof value === 'string') {
      return establishmentNames[value] || `ID: ${value.substring(0, 8)}...`;
    }

    // Handle other IDs
    if (key.includes('_id') && typeof value === 'string' && value.includes('-')) {
      return `ID: ${value.substring(0, 8)}...`;
    }

    // Handle objects
    if (typeof value === 'object') {
      if (key === 'social_media') {
        const entries = Object.entries(value as Record<string, unknown>);
        if (entries.length === 0) return 'No social media';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {entries.map(([platform, handle]) => (
              <div key={platform}>
                <strong style={{ color: '#FFD700' }}>{platform}:</strong> {String(handle)}
              </div>
            ))}
          </div>
        );
      }
      return (
        <pre
          style={{
            margin: 0,
            fontFamily: 'monospace',
            fontSize: '12px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    // Handle booleans
    if (typeof value === 'boolean') {
      return value ? '✓ Yes' : '✗ No';
    }

    return String(value);
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3))',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(255,215,0,0.2)',
      }}
    >
      {/* Field Name Header */}
      <div
        style={{
          padding: '12px 20px',
          background: 'rgba(255,215,0,0.15)',
          borderBottom: '1px solid rgba(255,215,0,0.3)',
        }}
      >
        <strong
          style={{
            color: '#FFD700',
            fontSize: '15px',
            fontWeight: '600',
            textTransform: 'capitalize',
            letterSpacing: '0.5px',
          }}
        >
          {fieldKey.replace(/_/g, ' ')}
        </strong>
      </div>

      {/* Before/After Comparison */}
      <div style={{ padding: '20px', display: 'flex', gap: '15px', alignItems: 'stretch' }}>
        {/* Before (Current) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '18px',
                filter: 'grayscale(30%)',
              }}
            >
              🔴
            </span>
            <span
              style={{
                color: '#FF6B6B',
                fontSize: '13px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {t('admin.before')}
            </span>
          </div>
          <div
            style={{
              padding: '12px 15px',
              background: 'rgba(255, 107, 107, 0.08)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 107, 107, 0.25)',
              color: '#ffcccc',
              fontSize: '14px',
              lineHeight: '1.6',
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {formatValue(currentValue, fieldKey)}
          </div>
        </div>

        {/* Arrow */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            color: '#FFD700',
            fontSize: '24px',
            fontWeight: 'bold',
            padding: '0 5px',
          }}
        >
          →
        </div>

        {/* After (Proposed) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '18px' }}>🟢</span>
            <span
              style={{
                color: '#51CF66',
                fontSize: '13px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {t('admin.after')}
            </span>
          </div>
          <div
            style={{
              padding: '12px 15px',
              background: 'rgba(81, 207, 102, 0.08)',
              borderRadius: '8px',
              border: '1px solid rgba(81, 207, 102, 0.25)',
              color: '#ccffcc',
              fontSize: '14px',
              lineHeight: '1.6',
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {formatValue(proposedValue, fieldKey)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProposalDiff;
