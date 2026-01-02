import React from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, AlertTriangle, Sparkles, PersonStanding, Users, UserCog } from 'lucide-react';
import type { AccountType } from './types';

export type { AccountType };

interface AccountTypeSelectionStepProps {
  accountType: AccountType;
  onAccountTypeChange: (type: AccountType) => void;
  onNext: () => void;
}

/**
 * Step 1: Account Type Selection
 *
 * Allows users to choose their account type:
 * - Regular user (visitor/reviewer)
 * - Employee (bar worker)
 * - Establishment owner
 */
const AccountTypeSelectionStep: React.FC<AccountTypeSelectionStepProps> = ({
  accountType,
  onAccountTypeChange,
  onNext
}) => {
  const { t } = useTranslation();

  const accountTypeOptions = [
    {
      value: 'regular' as AccountType,
      color: '#00E5FF',
      icon: <Users size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />,
      label: t('register.regularUser'),
      description: t('register.regularUserDesc')
    },
    {
      value: 'employee' as AccountType,
      color: '#C19A6B',
      icon: <PersonStanding size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />,
      label: t('register.employeeUser'),
      description: t('register.employeeUserDesc')
    },
    {
      value: 'establishment_owner' as AccountType,
      color: '#FFD700',
      icon: <Crown size={16} color="#FFD700" />,
      label: t('register.establishmentOwner'),
      description: t('register.establishmentOwnerDesc')
    }
  ];

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{
        display: 'block',
        color: '#00E5FF',
        fontSize: '14px',
        fontWeight: 'bold',
        marginBottom: '10px'
      }}>
        <UserCog size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('register.accountType')}
      </label>

      <div style={{
        display: 'flex',
        gap: '15px',
        flexWrap: 'wrap'
      }}>
        {accountTypeOptions.map((option) => (
          <label
            key={option.value}
            style={{
              flex: '1 1 calc(50% - 8px)',
              minWidth: '200px',
              padding: '15px',
              border: `2px solid ${accountType === option.value ? option.color : 'rgba(255,255,255,0.2)'}`,
              borderRadius: '12px',
              background: accountType === option.value
                ? `linear-gradient(135deg, ${option.color}1A, ${option.color}33)`
                : 'rgba(0,0,0,0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <input
              type="radio"
              name="accountType"
              value={option.value}
              checked={accountType === option.value}
              onChange={() => onAccountTypeChange(option.value)}
              style={{ accentColor: option.color }}
            />
            <div>
              <div style={{
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {option.icon} {option.label}
              </div>
              <div style={{ color: '#cccccc', fontSize: '12px', marginTop: '4px' }}>
                {option.description}
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Info banner for employee accounts */}
      {accountType === 'employee' && (
        <div style={{
          marginTop: '12px',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(193, 154, 107,0.15))',
          border: '1px solid rgba(193, 154, 107,0.3)',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#ffffff',
          lineHeight: '1.5'
        }}>
          <div style={{
            fontWeight: 'bold',
            marginBottom: '6px',
            color: '#C19A6B',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Sparkles size={16} /> {t('register.employeeBenefitsTitle')}
          </div>
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            <li>{t('register.employeeBenefit1')}</li>
            <li>{t('register.employeeBenefit2')}</li>
            <li>{t('register.employeeBenefit3')}</li>
            <li>{t('register.employeeBenefit4')}</li>
          </ul>
        </div>
      )}

      {/* Info banner for establishment owner accounts */}
      {accountType === 'establishment_owner' && (
        <div style={{
          marginTop: '12px',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,215,0,0.15))',
          border: '1px solid rgba(255,215,0,0.3)',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#ffffff',
          lineHeight: '1.5'
        }}>
          <div style={{
            fontWeight: 'bold',
            marginBottom: '6px',
            color: '#FFD700',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Crown size={16} /> {t('register.ownerBenefitsTitle')}
          </div>
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            <li>{t('register.ownerBenefit1')}</li>
            <li>{t('register.ownerBenefit2')}</li>
            <li>{t('register.ownerBenefit3')}</li>
            <li>{t('register.ownerBenefit4')}</li>
          </ul>
          <div style={{
            marginTop: '8px',
            fontSize: '12px',
            color: '#cccccc',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <AlertTriangle size={14} /> {t('register.ownerApprovalNote')}
          </div>
        </div>
      )}

      {/* Next Button */}
      <button
        type="button"
        onClick={onNext}
        className="btn btn--success"
        style={{ marginTop: '20px' }}
      >
        {t('register.nextButton')} →
      </button>
    </div>
  );
};

export default AccountTypeSelectionStep;
