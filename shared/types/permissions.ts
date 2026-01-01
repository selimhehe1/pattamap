/**
 * 🔐 Permission Types - Types partagés pour les permissions
 *
 * Ces types sont utilisés à la fois par le frontend et le backend.
 */

/**
 * Permissions pour un owner d'établissement
 */
export interface EstablishmentOwnerPermissions {
  can_edit_info: boolean;
  can_edit_pricing: boolean;
  can_edit_photos: boolean;
  can_edit_employees: boolean;
  can_view_analytics: boolean;
}

/**
 * Rôle d'un owner d'établissement
 */
export type OwnerRole = 'owner' | 'manager';

/**
 * Rôle utilisateur global
 */
export type UserRole = 'user' | 'moderator' | 'admin';

/**
 * Type de compte utilisateur
 */
export type AccountType = 'user' | 'employee' | 'establishment_owner';
