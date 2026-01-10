/**
 * Establishment Mutations
 *
 * Functions for modifying establishment data (consumables, permissions)
 */

import { supabase } from '../../config/supabase';
import { logger } from '../logger';
import { ForbiddenError } from '../../middleware/asyncHandler';
import { ConsumableInput } from './types';

/**
 * Check granular permissions for establishment owners
 */
export async function checkOwnerPermissions(
  userId: string,
  establishmentId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { data: ownership, error: ownershipError } = await supabase
    .from('establishment_owners')
    .select('permissions, owner_role')
    .eq('user_id', userId)
    .eq('establishment_id', establishmentId)
    .single();

  if (ownershipError || !ownership) {
    logger.error('Failed to fetch ownership permissions:', ownershipError);
    throw ForbiddenError('Failed to verify ownership permissions');
  }

  const permissions = ownership.permissions;
  const attemptedFields = Object.keys(updates);

  // Field → permission mapping
  const infoFields = ['name', 'address', 'description', 'phone', 'website', 'opening_hours', 'instagram', 'twitter', 'tiktok'];
  const pricingFields = ['ladydrink', 'barfine', 'rooms', 'pricing'];
  const photoFields = ['logo_url', 'photos'];

  if (attemptedFields.some(f => infoFields.includes(f)) && !permissions.can_edit_info) {
    throw ForbiddenError('You do not have permission to edit establishment information');
  }
  if (attemptedFields.some(f => pricingFields.includes(f)) && !permissions.can_edit_pricing) {
    throw ForbiddenError('You do not have permission to edit pricing information');
  }
  if (attemptedFields.some(f => photoFields.includes(f)) && !permissions.can_edit_photos) {
    throw ForbiddenError('You do not have permission to edit establishment photos');
  }
}

/**
 * Update establishment consumables
 */
export async function updateEstablishmentConsumables(
  establishmentId: string,
  consumables: ConsumableInput[]
): Promise<void> {
  // Delete existing consumables
  await supabase
    .from('establishment_consumables')
    .delete()
    .eq('establishment_id', establishmentId);

  // Insert new consumables
  if (consumables.length > 0) {
    const consumablesToInsert = consumables.map((c: ConsumableInput) => ({
      establishment_id: establishmentId,
      consumable_id: c.consumable_id,
      price: c.price
    }));

    const { error } = await supabase
      .from('establishment_consumables')
      .insert(consumablesToInsert);

    if (error) {
      logger.error('Failed to update consumables:', error);
    }
  }
}
