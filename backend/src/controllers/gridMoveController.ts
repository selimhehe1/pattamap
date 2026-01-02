/**
 * Grid Move Controller
 *
 * Handles establishment grid position updates and swaps.
 * Extracted from server.ts to reduce file size and complexity.
 */

import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { isEstablishmentOwner } from '../middleware/auth';
import { cacheInvalidatePattern, cacheDel } from '../config/redis';

// Zone-specific column limits
const ZONE_COLUMN_LIMITS: Record<string, number> = {
  soi6: 20,
  walkingstreet: 24,
  lkmetro: 10,
  treetown: 10,
  soibuakhao: 18,
  jomtiencomplex: 15,
  boyztown: 12,
  soi78: 16,
  beachroad: 40
};

/**
 * Enhanced UUID validation
 */
function isValidUUID(uuid: unknown): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof uuid === 'string' && uuidRegex.test(uuid);
}

/**
 * Validate grid position for a specific zone
 */
function validateGridPosition(
  zone: string,
  grid_row: number,
  grid_col: number
): { valid: boolean; error?: string; details?: string; validRange?: { min: number; max: number } } {
  const maxCol = ZONE_COLUMN_LIMITS[zone] || 24;

  if (grid_col < 1 || grid_col > maxCol) {
    return {
      valid: false,
      error: 'Column position out of bounds',
      details: `${zone} columns must be between 1 and ${maxCol}.`,
      validRange: { min: 1, max: maxCol }
    };
  }

  // Zone-specific row validation
  if (zone === 'soi6' && (grid_row < 1 || grid_row > 2)) {
    return {
      valid: false,
      error: 'Row position out of bounds for Soi 6',
      details: 'Soi 6 rows must be between 1 and 2.',
      validRange: { min: 1, max: 2 }
    };
  }

  if (zone === 'walkingstreet' && (grid_row < 1 || grid_row > 42)) {
    return {
      valid: false,
      error: 'Row position out of bounds for Walking Street',
      details: 'Walking Street rows must be between 1 and 42.',
      validRange: { min: 1, max: 42 }
    };
  }

  if (zone === 'lkmetro') {
    if (grid_row < 1 || grid_row > 4) {
      return {
        valid: false,
        error: 'Row position out of bounds for LK Metro',
        details: 'LK Metro rows must be between 1 and 4.',
        validRange: { min: 1, max: 4 }
      };
    }

    // Row-specific column validation with masked positions
    let minCol = 1;
    let maxColLK: number;

    if (grid_row === 2) {
      maxColLK = 8;
    } else if (grid_row === 3) {
      minCol = 3;
      maxColLK = 9;
    } else {
      maxColLK = 9;
    }

    if (grid_col < minCol || grid_col > maxColLK) {
      return {
        valid: false,
        error: 'Column position out of bounds for LK Metro',
        details: `LK Metro row ${grid_row} columns must be between ${minCol} and ${maxColLK}.`,
        validRange: { min: minCol, max: maxColLK }
      };
    }
  }

  return { valid: true };
}

/**
 * Perform atomic swap using RPC function
 */
async function performAtomicSwap(
  establishmentId: string,
  swapWithId: string,
  targetRow: number,
  targetCol: number,
  sourceRow: number,
  sourceCol: number,
  zone: string
): Promise<{ success: boolean; data?: { source: unknown; target: unknown }; error?: string }> {
  try {
    const { data: swapResult, error: swapError } = await supabase
      .rpc('swap_establishments_atomic', {
        p_source_id: establishmentId,
        p_target_id: swapWithId,
        p_source_new_row: targetRow,
        p_source_new_col: targetCol,
        p_target_new_row: sourceRow,
        p_target_new_col: sourceCol,
        p_zone: zone
      });

    if (swapError) {
      return { success: false, error: swapError.message };
    }

    return {
      success: true,
      data: {
        source: swapResult[0]?.source_establishment,
        target: swapResult[0]?.target_establishment
      }
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Perform sequential swap with rollback protection
 */
async function performSequentialSwap(
  establishmentId: string,
  targetId: string,
  targetRow: number,
  targetCol: number,
  sourceData: { grid_row: number; grid_col: number; zone: string },
  zone: string
): Promise<{ success: boolean; data?: { source: unknown; target: unknown }; error?: string }> {
  const now = new Date().toISOString();
  let step1Success = false;

  try {
    // STEP 1: Move source to temporary position (NULL, NULL, zone)
    logger.debug('STEP 1: Moving source to temporary position');
    const { error: step1Error } = await supabase
      .from('establishments')
      .update({ grid_row: null, grid_col: null, zone, updated_at: now })
      .eq('id', establishmentId)
      .select();

    if (step1Error) throw new Error('Failed to move source to temporary position');
    step1Success = true;

    // STEP 2: Move target to source's original position
    logger.debug('STEP 2: Moving target to source original position');
    const { data: step2Data, error: step2Error } = await supabase
      .from('establishments')
      .update({
        grid_row: sourceData.grid_row,
        grid_col: sourceData.grid_col,
        zone: sourceData.zone,
        updated_at: now
      })
      .eq('id', targetId)
      .select();

    if (step2Error) throw new Error('Failed to move target to source position');

    // STEP 3: Move source to target's final position
    logger.debug('STEP 3: Moving source to target position');
    const { data: step3Data, error: step3Error } = await supabase
      .from('establishments')
      .update({ grid_row: targetRow, grid_col: targetCol, zone, updated_at: now })
      .eq('id', establishmentId)
      .select();

    if (step3Error) throw new Error('Failed to move source to final position');

    return {
      success: true,
      data: { source: step3Data[0], target: step2Data[0] }
    };

  } catch (error) {
    // ROLLBACK: Restore source to original position if any step failed
    if (step1Success) {
      logger.debug('Rolling back: Restoring source to original position');
      await supabase
        .from('establishments')
        .update({
          grid_row: sourceData.grid_row,
          grid_col: sourceData.grid_col,
          zone: sourceData.zone,
          updated_at: now
        })
        .eq('id', establishmentId);
    }
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Invalidate cache after grid operations
 */
async function invalidateGridCache(): Promise<void> {
  await cacheInvalidatePattern('establishments:*');
  await cacheDel('dashboard:stats');
}

/**
 * Grid Move Workaround Handler
 * POST /api/grid-move-workaround
 */
export async function handleGridMove(req: AuthRequest, res: Response): Promise<void> {
  try {
    logger.debug('Grid move workaround', {
      hasBody: !!req.body,
      isSwap: !!req.body.swap_with_id
    });

    const { establishmentId, grid_row, grid_col, zone, swap_with_id } = req.body;

    // Security check: admin OR owner
    const user = req.user;
    const isAdmin = user?.role === 'admin' || user?.role === 'moderator';
    const isOwner = user?.id ? await isEstablishmentOwner(user.id, establishmentId) : false;

    if (!isAdmin && !isOwner) {
      logger.warn('Unauthorized grid move attempt', { userId: user?.id, establishmentId });
      res.status(403).json({
        error: 'Unauthorized',
        details: 'Only admins or establishment owners can move establishments'
      });
      return;
    }

    // UUID validation
    if (!isValidUUID(establishmentId)) {
      res.status(400).json({ error: 'Invalid establishmentId format', details: 'establishmentId must be a valid UUID' });
      return;
    }

    if (swap_with_id && !isValidUUID(swap_with_id)) {
      res.status(400).json({ error: 'Invalid swap_with_id format', details: 'swap_with_id must be a valid UUID' });
      return;
    }

    // Required fields validation
    if (!establishmentId || !grid_row || !grid_col || !zone) {
      res.status(400).json({ error: 'Missing required fields: establishmentId, grid_row, grid_col, zone' });
      return;
    }

    // Grid position validation
    const positionValidation = validateGridPosition(zone, grid_row, grid_col);
    if (!positionValidation.valid) {
      res.status(400).json({
        error: positionValidation.error,
        details: positionValidation.details,
        validRange: positionValidation.validRange
      });
      return;
    }

    // SWAP operation
    if (swap_with_id) {
      await handleSwapOperation(req, res, establishmentId, swap_with_id, grid_row, grid_col, zone);
      return;
    }

    // MOVE operation (with auto-swap detection)
    await handleMoveOperation(req, res, establishmentId, grid_row, grid_col, zone);

  } catch (error) {
    logger.error('DIRECT WORKAROUND ERROR:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle explicit SWAP operation
 */
async function handleSwapOperation(
  _req: AuthRequest,
  res: Response,
  establishmentId: string,
  swapWithId: string,
  targetRow: number,
  targetCol: number,
  zone: string
): Promise<void> {
  logger.debug('Atomic SWAP detected');

  // Get source position
  const { data: sourceData, error: sourceError } = await supabase
    .from('establishments')
    .select('grid_row, grid_col, zone')
    .eq('id', establishmentId)
    .single();

  if (sourceError) {
    res.status(500).json({ error: 'Failed to fetch source establishment' });
    return;
  }

  // Try atomic RPC first
  const atomicResult = await performAtomicSwap(
    establishmentId, swapWithId, targetRow, targetCol, sourceData.grid_row, sourceData.grid_col, zone
  );

  if (atomicResult.success) {
    await invalidateGridCache();
    res.json({
      success: true,
      message: 'Atomic swap operation completed successfully',
      establishments: atomicResult.data
    });
    return;
  }

  // Fallback to sequential swap
  logger.warn('Atomic SWAP RPC failed, falling back to sequential');
  const sequentialResult = await performSequentialSwap(
    establishmentId, swapWithId, targetRow, targetCol, sourceData, zone
  );

  if (sequentialResult.success) {
    await invalidateGridCache();
    res.json({
      success: true,
      message: 'Sequential swap operation completed successfully (fallback)',
      establishments: sequentialResult.data
    });
    return;
  }

  res.status(500).json({ error: 'Failed to perform swap', details: sequentialResult.error });
}

/**
 * Handle MOVE operation (with auto-swap if target occupied)
 */
async function handleMoveOperation(
  req: AuthRequest,
  res: Response,
  establishmentId: string,
  targetRow: number,
  targetCol: number,
  zone: string
): Promise<void> {
  logger.debug('Checking if target position is occupied');

  // Check if target position is occupied
  const { data: existingAtTarget, error: checkError } = await supabase
    .from('establishments')
    .select('id, name')
    .eq('zone', zone)
    .eq('grid_row', targetRow)
    .eq('grid_col', targetCol)
    .neq('id', establishmentId)
    .maybeSingle();

  if (checkError) {
    res.status(500).json({ error: 'Failed to check target position' });
    return;
  }

  if (existingAtTarget) {
    // Auto-convert MOVE to SWAP
    logger.debug('TARGET OCCUPIED - Auto-converting MOVE to SWAP', {
      movingEstablishment: establishmentId,
      targetEstablishment: existingAtTarget.id
    });

    // Get source position
    const { data: sourceData, error: sourceError } = await supabase
      .from('establishments')
      .select('grid_row, grid_col, zone')
      .eq('id', establishmentId)
      .single();

    if (sourceError) {
      res.status(500).json({ error: 'Failed to fetch source establishment' });
      return;
    }

    // Try atomic RPC first
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('swap_establishment_positions', {
        p_source_id: establishmentId,
        p_target_id: existingAtTarget.id,
        p_new_zone: zone
      });

    if (!rpcError && rpcData && rpcData.length > 0 && rpcData[0].success) {
      await invalidateGridCache();
      res.json({
        success: true,
        message: 'Auto-swap operation completed successfully (atomic)',
        establishments: {
          source: rpcData[0].source_establishment,
          target: rpcData[0].target_establishment
        }
      });
      return;
    }

    // Fallback to sequential swap
    const sequentialResult = await performSequentialSwap(
      establishmentId, existingAtTarget.id, targetRow, targetCol, sourceData, zone
    );

    if (sequentialResult.success) {
      await invalidateGridCache();
      res.json({
        success: true,
        message: 'Auto-swap operation completed successfully (sequential)',
        establishments: sequentialResult.data
      });
      return;
    }

    res.status(500).json({ error: 'Failed to swap establishments', details: sequentialResult.error });
    return;
  }

  // TARGET EMPTY - Simple MOVE
  logger.debug('TARGET EMPTY - Proceeding with simple MOVE');
  const { data, error } = await supabase
    .from('establishments')
    .update({
      grid_row: targetRow,
      grid_col: targetCol,
      zone,
      updated_at: new Date().toISOString()
    })
    .eq('id', establishmentId)
    .select();

  if (error) {
    res.status(500).json({ error: 'Failed to update position' });
    return;
  }

  await invalidateGridCache();
  res.json({
    success: true,
    message: 'Position updated successfully',
    establishment: data[0]
  });
}
