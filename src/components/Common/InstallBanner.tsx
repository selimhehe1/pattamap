import { useTranslation } from 'react-i18next';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

export default function InstallBanner() {
  const { t } = useTranslation();
  const { showBanner, install, dismiss } = useInstallPrompt();

  if (!showBanner) return null;

  return (
    <div
      role="banner"
      aria-label={t('pwa.installTitle')}
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(59, 130, 246, 0.95))',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        maxWidth: '400px',
        width: 'calc(100% - 32px)',
        color: '#fff',
      }}
    >
      <Download size={20} aria-hidden="true" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 600 }}>{t('pwa.installTitle')}</div>
        <div style={{ fontSize: '12px', opacity: 0.85 }}>{t('pwa.installDescription')}</div>
      </div>
      <button
        onClick={install}
        style={{
          padding: '6px 14px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.3)',
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {t('pwa.installButton')}
      </button>
      <button
        onClick={dismiss}
        aria-label={t('common.close')}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer',
          padding: '4px',
          flexShrink: 0,
        }}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
