import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

interface Criterion {
  key: string;
  label: string;
  met: boolean;
}

function getStrengthLevel(criteria: Criterion[]): { level: number; color: string; label: string } {
  const metCount = criteria.filter(c => c.met).length;

  if (metCount <= 1) return { level: 1, color: 'var(--color-error, #ef4444)', label: 'weak' };
  if (metCount <= 2) return { level: 2, color: 'var(--color-error, #ef4444)', label: 'weak' };
  if (metCount <= 3) return { level: 3, color: 'var(--color-warning, #f59e0b)', label: 'fair' };
  if (metCount <= 4) return { level: 4, color: 'var(--color-success, #22c55e)', label: 'good' };
  return { level: 5, color: 'var(--color-success, #22c55e)', label: 'strong' };
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { t } = useTranslation();

  const criteria: Criterion[] = useMemo(() => [
    { key: 'length', label: t('register.strengthMinLength'), met: password.length >= 8 },
    { key: 'lowercase', label: t('register.strengthLowercase'), met: /[a-z]/.test(password) },
    { key: 'uppercase', label: t('register.strengthUppercase'), met: /[A-Z]/.test(password) },
    { key: 'number', label: t('register.strengthNumber'), met: /[0-9]/.test(password) },
    { key: 'special', label: t('register.strengthSpecial'), met: /[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/]/.test(password) },
  ], [password, t]);

  const strength = useMemo(() => getStrengthLevel(criteria), [criteria]);

  if (!password) return null;

  return (
    <div style={{ marginTop: '8px', marginBottom: '4px' }} role="status" aria-live="polite">
      {/* Strength bar */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '8px',
      }}>
        {[1, 2, 3, 4, 5].map(segment => (
          <div
            key={segment}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              backgroundColor: segment <= strength.level
                ? strength.color
                : 'var(--bg-tertiary, rgba(255,255,255,0.1))',
              transition: 'background-color 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Strength label */}
      <div style={{
        fontSize: '12px',
        color: strength.color,
        marginBottom: '6px',
        fontWeight: 500,
      }}>
        {t(`register.strength_${strength.label}`)}
      </div>

      {/* Criteria checklist */}
      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}>
        {criteria.map(criterion => (
          <li
            key={criterion.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: criterion.met ? 'var(--color-success, #22c55e)' : 'var(--text-tertiary, rgba(255,255,255,0.5))',
              transition: 'color 0.2s ease',
            }}
          >
            {criterion.met
              ? <Check size={12} aria-hidden="true" />
              : <X size={12} aria-hidden="true" />
            }
            <span>{criterion.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
