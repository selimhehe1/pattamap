import React from 'react';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import type { AvailabilityStatus } from '../../../hooks/useAvailabilityCheck';

interface AvailabilityFeedbackProps {
  status: AvailabilityStatus;
  message: string | null;
}

const styles: Record<string, React.CSSProperties> = {
  checking: { color: '#00E5FF', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center' },
  available: { color: '#4CAF50', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center' },
  taken: { color: '#FF5252', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center' },
  invalid: { color: '#FF9800', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center' },
  error: { color: '#FF9800', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center' },
};

const AvailabilityFeedback: React.FC<AvailabilityFeedbackProps> = ({ status, message }) => {
  if (status === 'idle') return null;

  const iconStyle = { marginRight: '4px', flexShrink: 0 };

  const icons: Record<string, React.ReactNode> = {
    checking: <Loader2 size={12} style={{ ...iconStyle, animation: 'spin 1s linear infinite' }} />,
    available: <Check size={12} style={iconStyle} />,
    taken: <AlertTriangle size={12} style={iconStyle} />,
    invalid: <AlertTriangle size={12} style={iconStyle} />,
    error: <AlertTriangle size={12} style={iconStyle} />,
  };

  return (
    <div style={styles[status]}>
      {icons[status]}
      <span>{message}</span>
    </div>
  );
};

export default AvailabilityFeedback;
