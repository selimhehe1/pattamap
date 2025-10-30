/**
 * Freelance Validation Utilities
 * Version: 10.3
 *
 * Validates freelance business logic:
 * - Freelances can ONLY be associated with Nightclubs
 * - Freelances can have MULTIPLE nightclub associations simultaneously
 * - Regular employees can only have ONE current establishment
 */

import { supabase } from '../config/supabase';
import { logger } from './logger';

/**
 * Validates that an establishment is a Nightclub
 * @param establishmentId - The establishment ID to validate
 * @returns Promise<{ isNightclub: boolean, categoryName: string | null, error: string | null }>
 */
export async function validateEstablishmentIsNightclub(
  establishmentId: string
): Promise<{ isNightclub: boolean; categoryName: string | null; error: string | null }> {
  try {
    const { data: establishment, error } = await supabase
      .from('establishments')
      .select(`
        id,
        name,
        category:establishment_categories(name)
      `)
      .eq('id', establishmentId)
      .single();

    if (error || !establishment) {
      return {
        isNightclub: false,
        categoryName: null,
        error: 'Establishment not found'
      };
    }

    const categoryName = (establishment.category as any)?.name || null;
    const isNightclub = categoryName === 'Nightclub';

    return {
      isNightclub,
      categoryName,
      error: null
    };
  } catch (err) {
    logger.error('Error validating establishment category:', err);
    return {
      isNightclub: false,
      categoryName: null,
      error: 'Failed to validate establishment category'
    };
  }
}

/**
 * Validates that all establishment IDs are Nightclubs (for freelance multi-association)
 * @param establishmentIds - Array of establishment IDs to validate
 * @returns Promise<{ valid: boolean, invalidEstablishments: Array<{id: string, name: string, category: string}>, error: string | null }>
 */
export async function validateAllEstablishmentsAreNightclubs(
  establishmentIds: string[]
): Promise<{
  valid: boolean;
  invalidEstablishments: Array<{ id: string; name: string; category: string }>;
  error: string | null;
}> {
  try {
    if (establishmentIds.length === 0) {
      return { valid: true, invalidEstablishments: [], error: null };
    }

    const { data: establishments, error } = await supabase
      .from('establishments')
      .select(`
        id,
        name,
        category:establishment_categories(name)
      `)
      .in('id', establishmentIds);

    if (error) {
      return {
        valid: false,
        invalidEstablishments: [],
        error: 'Failed to fetch establishments'
      };
    }

    if (!establishments || establishments.length !== establishmentIds.length) {
      return {
        valid: false,
        invalidEstablishments: [],
        error: 'One or more establishments not found'
      };
    }

    const invalidEstablishments = establishments
      .filter((est: any) => est.category?.name !== 'Nightclub')
      .map((est: any) => ({
        id: est.id,
        name: est.name,
        category: est.category?.name || 'Unknown'
      }));

    return {
      valid: invalidEstablishments.length === 0,
      invalidEstablishments,
      error: null
    };
  } catch (err) {
    logger.error('Error validating establishments:', err);
    return {
      valid: false,
      invalidEstablishments: [],
      error: 'Failed to validate establishments'
    };
  }
}

/**
 * Validates freelance business rules for employee update/create
 * @param employeeId - The employee ID (null for create)
 * @param isFreelance - Whether the employee is a freelance
 * @param establishmentIds - Array of establishment IDs to associate (for freelances)
 * @returns Promise<{ valid: boolean, error: string | null }>
 */
export async function validateFreelanceRules(
  employeeId: string | null,
  isFreelance: boolean,
  establishmentIds: string[] = []
): Promise<{ valid: boolean; error: string | null }> {
  // If not freelance, no special validation needed
  if (!isFreelance) {
    // Regular employees can only have ONE current establishment
    if (establishmentIds.length > 1) {
      return {
        valid: false,
        error: 'Regular employees can only have one current establishment'
      };
    }
    return { valid: true, error: null };
  }

  // FREELANCE VALIDATION

  // 1. Freelances can have 0 or more establishments (flexible)
  if (establishmentIds.length === 0) {
    // Free freelance (no establishment) - valid
    return { valid: true, error: null };
  }

  // 2. All establishments must be Nightclubs
  const validation = await validateAllEstablishmentsAreNightclubs(establishmentIds);

  if (!validation.valid) {
    if (validation.error) {
      return { valid: false, error: validation.error };
    }

    const invalidNames = validation.invalidEstablishments
      .map(est => `${est.name} (${est.category})`)
      .join(', ');

    return {
      valid: false,
      error: `Freelances can only be associated with Nightclubs. Invalid establishments: ${invalidNames}`
    };
  }

  return { valid: true, error: null };
}

/**
 * Get current nightclub associations for a freelance employee
 * @param employeeId - The employee ID
 * @returns Promise<string[]> - Array of establishment IDs
 */
export async function getFreelanceNightclubs(employeeId: string): Promise<string[]> {
  try {
    const { data: employmentHistory, error } = await supabase
      .from('employment_history')
      .select(`
        establishment_id,
        establishments!inner(
          id,
          category:establishment_categories!inner(name)
        )
      `)
      .eq('employee_id', employeeId)
      .eq('is_current', true);

    if (error || !employmentHistory) {
      logger.error('Error fetching freelance nightclubs:', error);
      return [];
    }

    // Filter only nightclubs
    const nightclubIds = employmentHistory
      .filter((eh: any) => eh.establishments?.category?.name === 'Nightclub')
      .map((eh: any) => eh.establishment_id);

    return nightclubIds;
  } catch (err) {
    logger.error('Error in getFreelanceNightclubs:', err);
    return [];
  }
}
