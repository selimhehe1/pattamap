/**
 * 🏷️ Status Utilities - Composants et helpers partagés pour les statuts
 *
 * Utilisé par:
 * - EmployeeCard
 * - EmployeeClaimCard
 * - AdminEstablishmentCard
 * - Autres cards admin
 */

import React from 'react';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

/**
 * Types de status communs
 */
export type ItemStatus = 'pending' | 'approved' | 'rejected';

/**
 * Retourne l'icône appropriée pour un status
 */
export const getStatusIcon = (status: string, size = 12): React.ReactNode => {
  switch (status) {
    case 'pending':
      return <Clock size={size} />;
    case 'approved':
      return <CheckCircle size={size} />;
    case 'rejected':
      return <XCircle size={size} />;
    default:
      return <Clock size={size} />;
  }
};

/**
 * Retourne la classe CSS modifier pour un status
 */
export const getStatusModifier = (status: string, prefix = 'aec-status-badge'): string => {
  switch (status) {
    case 'pending':
      return `${prefix}--pending`;
    case 'approved':
      return `${prefix}--approved`;
    case 'rejected':
      return `${prefix}--rejected`;
    default:
      return '';
  }
};

/**
 * Retourne la couleur pour un status (pour inline styles)
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
      return '#facc15'; // yellow-400
    case 'approved':
      return '#22c55e'; // green-500
    case 'rejected':
      return '#ef4444'; // red-500
    default:
      return '#9ca3af'; // gray-400
  }
};

/**
 * Retourne le label traduit pour un status
 */
export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
};

/**
 * Props pour le composant StatusBadge
 */
interface StatusBadgeProps {
  status: ItemStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * Composant StatusBadge réutilisable
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const iconSize = size === 'sm' ? 10 : size === 'lg' ? 16 : 12;
  const baseClass = 'aec-status-badge';
  const sizeClass = size !== 'md' ? `${baseClass}--${size}` : '';
  const statusClass = getStatusModifier(status, baseClass);

  return (
    <span className={`${baseClass} ${sizeClass} ${statusClass} ${className}`.trim()}>
      {showIcon && getStatusIcon(status, iconSize)}
      <span>{getStatusLabel(status)}</span>
    </span>
  );
};

/**
 * Configuration par défaut pour use3DTilt dans les admin cards
 */
export const defaultAdminCardTiltConfig = {
  maxTilt: 10,
  scale: 1.02,
  glowColor: 'rgba(232, 121, 249, 0.4)',
};

/**
 * Formater une date pour affichage court (ex: "Jan 5")
 */
export const formatShortDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Formater une date pour affichage complet
 */
export const formatFullDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default StatusBadge;
