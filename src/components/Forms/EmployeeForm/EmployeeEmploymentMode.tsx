/**
 * EmployeeEmploymentMode component
 * Handles freelance mode toggle
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

interface EmployeeEmploymentModeProps {
  isFreelanceMode: boolean;
  onModeChange: (isFreelance: boolean) => void;
}

export function EmployeeEmploymentMode({
  isFreelanceMode,
  onModeChange
}: EmployeeEmploymentModeProps) {
  const { t } = useTranslation();

  return (
    <div className="form-section">
      <h3 className="text-cyan-nightlife" style={{
        margin: '0 0 15px 0',
        fontSize: '16px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        👯 {t('employee.employmentMode')}
      </h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '15px',
        background: 'rgba(157, 78, 221, 0.1)',
        border: '2px solid rgba(157, 78, 221, 0.3)',
        borderRadius: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            color: 'white',
            fontSize: '15px',
            fontWeight: '500'
          }}>
            <input
              type="checkbox"
              checked={isFreelanceMode}
              onChange={(e) => onModeChange(e.target.checked)}
              style={{
                width: '20px',
                height: '20px',
                cursor: 'pointer'
              }}
            />
            <span>💃 {t('employee.freelanceMode')}</span>
          </label>
          {isFreelanceMode && (
            <span style={{
              background: 'linear-gradient(45deg, #9D4EDD, #C77DFF)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {t('employee.freelanceModeActive')}
            </span>
          )}
        </div>

        {/* Info about employment mode */}
        <div style={{
          padding: '10px',
          background: 'rgba(157, 78, 221, 0.15)',
          borderRadius: '8px',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '13px',
          lineHeight: '1.6'
        }}>
          {isFreelanceMode ? (
            <>
              <strong style={{ color: '#C77DFF' }}>🌙 Nightclub Freelance:</strong>
              <br />
              • Can work in multiple nightclubs simultaneously
              <br />
              • Leave establishment empty for "free freelance"
              <br />
              • Select nightclub below to associate
            </>
          ) : (
            <>
              <strong style={{ color: '#00E5FF' }}>🏢 Regular Employee:</strong>
              <br />
              • Works at one establishment (any type)
              <br />
              • Select establishment below (optional)
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmployeeEmploymentMode;
