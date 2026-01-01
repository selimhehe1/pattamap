/**
 * 📦 Shared Types - Export central des types partagés
 *
 * Ce module contient les types utilisés à la fois par le frontend et le backend.
 *
 * Usage Frontend:
 * ```
 * import { ItemStatus, SocialMedia } from '@shared/types';
 * // ou
 * import { ItemStatus } from '../../../shared/types';
 * ```
 *
 * Usage Backend:
 * ```
 * import { ItemStatus, SocialMedia } from '../../shared/types';
 * ```
 */

// Status types
export type {
  ItemStatus,
  VerificationStatus,
  OwnershipRequestStatus,
  VIPSubscriptionStatus,
} from './status';

// Permission types
export type {
  EstablishmentOwnerPermissions,
  OwnerRole,
  UserRole,
  AccountType,
} from './permissions';

// VIP types
export type {
  VIPTier,
  VIPDuration,
  VIPSubscriptionType,
  PaymentMethod,
  PaymentStatus,
  VIPPricing,
} from './vip';

// Social media types
export type {
  SocialMedia,
  EstablishmentSocialMedia,
  SocialMediaShort,
} from './social';

export {
  expandSocialMedia,
  shortSocialMedia,
} from './social';
