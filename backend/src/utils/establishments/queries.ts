/**
 * Establishment Queries
 *
 * Database fetching functions for establishments
 */

import { supabase } from '../../config/supabase';
import { logger } from '../logger';
import {
  DbEstablishmentWithLocation,
  EmploymentRecord,
  EmployeeFromQuery,
  EstablishmentConsumableWithTemplate
} from './types';
import { parsePostGISBinary } from './coordinates';
import { unwrapSupabaseRelation } from '../supabaseHelpers';

/**
 * Fetch employee counts for establishments
 */
export async function fetchEmployeeCounts(establishmentIds: string[]): Promise<{
  total: { [key: string]: number };
  approved: { [key: string]: number };
}> {
  const employeeCounts: { [key: string]: number } = {};
  const approvedEmployeeCounts: { [key: string]: number } = {};

  const { data: employmentData, error: employmentError } = await supabase
    .from('employment_history')
    .select('establishment_id, employees(status)')
    .in('establishment_id', establishmentIds)
    .eq('is_current', true);

  if (!employmentError && employmentData) {
    employmentData.forEach((emp: EmploymentRecord) => {
      const estId = emp.establishment_id;
      employeeCounts[estId] = (employeeCounts[estId] || 0) + 1;

      const employee = unwrapSupabaseRelation(emp.employees) as { status: string } | undefined;
      const employeeStatus = employee?.status;
      if (employeeStatus === 'approved') {
        approvedEmployeeCounts[estId] = (approvedEmployeeCounts[estId] || 0) + 1;
      }
    });
  }

  return { total: employeeCounts, approved: approvedEmployeeCounts };
}

/**
 * Fetch ownership map for establishments
 */
export async function fetchOwnershipMap(establishmentIds: string[]): Promise<{ [key: string]: boolean }> {
  const ownerMap: { [key: string]: boolean } = {};

  const { data: ownerData } = await supabase
    .from('establishment_owners')
    .select('establishment_id')
    .in('establishment_id', establishmentIds);

  if (ownerData) {
    ownerData.forEach((owner: { establishment_id: string }) => {
      ownerMap[owner.establishment_id] = true;
    });
  }

  return ownerMap;
}

/**
 * Map establishments with coordinates and extra data
 */
export function mapEstablishmentsWithExtras(
  establishments: DbEstablishmentWithLocation[],
  employeeCounts: { [key: string]: number },
  approvedCounts: { [key: string]: number },
  ownerMap: { [key: string]: boolean }
) {
  return establishments.map((est: DbEstablishmentWithLocation) => {
    let latitude = null;
    let longitude = null;

    if (est.location) {
      const coords = parsePostGISBinary(est.location, est.id);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }

    return {
      ...est,
      latitude,
      longitude,
      employee_count: employeeCounts[est.id] || 0,
      approved_employee_count: approvedCounts[est.id] || 0,
      has_owner: !!ownerMap[est.id]
    };
  });
}

/**
 * Fetch freelances associated with a nightclub
 */
export async function fetchNightclubFreelances(
  establishmentId: string,
  establishmentName: string,
  existingEmployeeIds: Set<string>
) {
  const { data: freelanceEmployments, error } = await supabase
    .from('employment_history')
    .select(`
      employee_id,
      start_date,
      employee:employees(id, name, age, nationality, photos, status, average_rating, comment_count, is_freelance)
    `)
    .eq('establishment_id', establishmentId)
    .eq('is_current', true);

  if (error || !freelanceEmployments) return [];

  return freelanceEmployments
    .filter(emp => {
      const employeeArray = emp.employee as EmployeeFromQuery[] | null;
      const employee = employeeArray?.[0];
      return employee?.is_freelance === true && !existingEmployeeIds.has(employee.id);
    })
    .map(emp => {
      const employeeArray = emp.employee as EmployeeFromQuery[] | null;
      const employee = employeeArray![0];
      return {
        ...employee,
        current_employment: {
          establishment_id: establishmentId,
          establishment_name: establishmentName,
          start_date: emp.start_date
        },
        employee_type: 'freelance' as const
      };
    });
}

/**
 * Fetch and format establishment consumables
 */
export async function fetchFormattedConsumables(establishmentId: string) {
  const { data: consumables, error } = await supabase
    .from('establishment_consumables')
    .select(`
      id,
      consumable_id,
      price,
      consumable:consumable_templates(id, name, category, icon, default_price)
    `)
    .eq('establishment_id', establishmentId);

  if (error) {
    logger.warn('Could not load consumables:', error);
    return [];
  }

  return (consumables || []).map((ec: EstablishmentConsumableWithTemplate) => ({
    id: ec.id,
    consumable_id: ec.consumable_id,
    name: ec.consumable?.[0]?.name,
    category: ec.consumable?.[0]?.category,
    icon: ec.consumable?.[0]?.icon,
    price: ec.price
  }));
}
