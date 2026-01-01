/**
 * Admin Shared Components & Utilities
 *
 * Export central pour les composants et utilitaires partagés
 * entre les différents modules Admin.
 */

// Status utilities
export {
  getStatusIcon,
  getStatusModifier,
  getStatusColor,
  getStatusLabel,
  StatusBadge,
  defaultAdminCardTiltConfig,
  formatShortDate,
  formatFullDate,
} from './statusUtils';

export type { ItemStatus } from './statusUtils';
