import React from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ShieldOff,
  Bot
} from 'lucide-react';

/**
 * Verification utility functions and constants
 */

// Status color mapping
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'approved': return '#00FF88';
    case 'rejected': return '#FF4757';
    case 'pending': return '#FFD700';
    case 'manual_review': return '#FFA500';
    case 'revoked': return '#999999';
    default: return '#cccccc';
  }
};

// Status icon mapping
export const getStatusIcon = (status: string, autoApproved?: boolean): React.ReactNode => {
  switch (status) {
    case 'approved':
      return autoApproved
        ? <Bot size={14} style={{ color: 'var(--color-success)' }} />
        : <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />;
    case 'rejected':
      return <XCircle size={14} style={{ color: 'var(--color-error)' }} />;
    case 'pending':
      return <Clock size={14} style={{ color: 'var(--color-warning)' }} />;
    case 'manual_review':
      return <Eye size={14} style={{ color: 'var(--color-warning)' }} />;
    case 'revoked':
      return <ShieldOff size={14} style={{ color: '#999999' }} />;
    default:
      return <Clock size={14} />;
  }
};

// Date formatting
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Placeholder image constant
export const PLACEHOLDER_IMAGE = '/images/placeholder-employee.jpg';

// Get safe image URL (with fallback to placeholder)
export const getSafeImageUrl = (url: string | undefined): string => {
  return (url && url.trim()) || PLACEHOLDER_IMAGE;
};
