/**
 * VIP Helpers
 *
 * Shared utility functions for VIP subscription handling.
 * Extracted from vipController.ts to eliminate code duplication.
 */

import { VIPSubscriptionType } from '../config/vipPricing';

/**
 * Get the appropriate VIP subscription table name based on subscription type
 */
export function getVIPTableName(subscriptionType: VIPSubscriptionType): string {
  return subscriptionType === 'employee'
    ? 'employee_vip_subscriptions'
    : 'establishment_vip_subscriptions';
}

/**
 * Get the entity column name based on subscription type
 */
export function getEntityColumn(subscriptionType: VIPSubscriptionType): string {
  return subscriptionType === 'employee' ? 'employee_id' : 'establishment_id';
}
