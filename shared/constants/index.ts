/**
 * 📋 Shared Constants - Constantes partagées entre frontend et backend
 */

/**
 * Valeurs de status
 */
export const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

/**
 * Durées VIP disponibles (en jours)
 */
export const VIP_DURATIONS = [7, 30, 90, 365] as const;

/**
 * Zones disponibles
 */
export const ZONES = [
  'walkingstreet',
  'soi6',
  'lkmetro',
  'soibuakhao',
  'beachroad',
  'treetown',
  'freelance',
] as const;

/**
 * Rôles utilisateur
 */
export const USER_ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
} as const;

/**
 * Types de compte
 */
export const ACCOUNT_TYPES = {
  USER: 'user',
  EMPLOYEE: 'employee',
  ESTABLISHMENT_OWNER: 'establishment_owner',
} as const;

/**
 * Méthodes de paiement VIP
 */
export const PAYMENT_METHODS = {
  PROMPTPAY: 'promptpay',
  CASH: 'cash',
  ADMIN_GRANT: 'admin_grant',
} as const;
