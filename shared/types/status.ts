/**
 * 📋 Status Types - Types partagés pour les statuts
 *
 * Ces types sont utilisés à la fois par le frontend et le backend.
 * Importez depuis '@shared/types' ou '../../../shared/types'
 */

/**
 * Status de base pour les entités modérées
 */
export type ItemStatus = 'pending' | 'approved' | 'rejected';

/**
 * Status de vérification (pour employees)
 */
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'manual_review' | 'revoked';

/**
 * Status d'ownership request
 */
export type OwnershipRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';

/**
 * Status de VIP subscription
 */
export type VIPSubscriptionStatus = 'pending' | 'active' | 'expired' | 'cancelled';
