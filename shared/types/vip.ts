/**
 * 💎 VIP Types - Types partagés pour les fonctionnalités VIP
 *
 * Ces types sont utilisés à la fois par le frontend et le backend.
 */

/**
 * Type de tier VIP
 */
export type VIPTier = 'employee' | 'establishment';

/**
 * Durée de subscription VIP (en jours)
 */
export type VIPDuration = 7 | 30 | 90 | 365;

/**
 * Type de subscription VIP
 */
export type VIPSubscriptionType = 'employee' | 'establishment';

/**
 * Méthode de paiement pour VIP
 */
export type PaymentMethod = 'promptpay' | 'cash' | 'admin_grant';

/**
 * Status de paiement VIP
 */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

/**
 * Structure de pricing VIP
 */
export interface VIPPricing {
  duration: VIPDuration;
  price: number;
  discount?: number;
  label: string;
}
