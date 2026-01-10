/**
 * Employee Filters
 *
 * Functions for filtering employee lists by various criteria
 */

import {
  CurrentEmploymentRecord,
  IndependentPositionRecord,
  SearchFilterOptions,
  EmployeeWithFilterFields
} from './types';

/**
 * Filter employees by type (all, freelance, regular)
 */
export function filterEmployeesByType<T extends {
  is_freelance?: boolean;
  current_employment?: CurrentEmploymentRecord[];
  independent_position?: IndependentPositionRecord[];
}>(
  employees: T[],
  type: string | undefined
): T[] {
  if (!type || type === 'all') return employees;

  return employees.filter(emp => {
    const hasCurrentEmployment = emp.current_employment?.some(ce => ce.is_current === true);
    const hasActiveFreelance = emp.independent_position?.some(ip => ip.is_active === true);
    const isSimpleFreelance = emp.is_freelance === true;
    const isFreelance = hasActiveFreelance || isSimpleFreelance;

    if (type === 'freelance') return isFreelance;
    if (type === 'regular') return !isFreelance && hasCurrentEmployment;
    return true;
  });
}

// Individual filter helper functions

function matchesTypeFilter(
  type: string | undefined,
  hasCurrentEmployment: boolean,
  hasActiveFreelance: boolean,
  isSimpleFreelance: boolean
): boolean {
  if (!type || type === 'all') return true;
  const isFreelance = hasActiveFreelance || isSimpleFreelance;
  if (type === 'freelance' && !isFreelance) return false;
  if (type === 'regular' && !hasCurrentEmployment) return false;
  return true;
}

function matchesCategoryFilter(
  categoryId: string | number | undefined,
  currentEmp: CurrentEmploymentRecord | undefined
): boolean {
  if (!categoryId) return true;
  if (!currentEmp) return false;
  const estCategoryId = (currentEmp.establishment as { category_id?: number } | undefined)?.category_id;
  return estCategoryId === Number(categoryId);
}

function matchesZoneFilter(
  normalizedZoneFilter: string | null | undefined,
  currentEmp: CurrentEmploymentRecord | undefined,
  emp: { independent_position?: IndependentPositionRecord[]; is_freelance?: boolean; freelance_zone?: string }
): boolean {
  if (!normalizedZoneFilter) return true;
  const establishmentZone = (currentEmp?.establishment as { zone?: string } | undefined)?.zone?.toLowerCase().replace(/\s+/g, '');
  const freelanceZone = emp.independent_position?.[0]?.zone?.toLowerCase().replace(/\s+/g, '');
  const simpleFreelanceZone = emp.is_freelance ? emp.freelance_zone?.toLowerCase().replace(/\s+/g, '') : null;
  return establishmentZone === normalizedZoneFilter ||
         freelanceZone === normalizedZoneFilter ||
         simpleFreelanceZone === normalizedZoneFilter;
}

function matchesLanguagesFilter(
  languages: string | undefined,
  employeeLanguages: string[]
): boolean {
  if (!languages || !String(languages).trim()) return true;
  const requestedLanguages = String(languages).split(',').map(l => l.trim().toLowerCase());
  const normalizedEmpLangs = employeeLanguages.map(l => l.toLowerCase());
  return requestedLanguages.some(lang =>
    normalizedEmpLangs.some(empLang => empLang.includes(lang) || lang.includes(empLang))
  );
}

function matchesSocialMediaFilter(
  socialMedia: string | undefined,
  employeeSocials: Record<string, string>
): boolean {
  if (!socialMedia || !String(socialMedia).trim()) return true;
  const requestedPlatforms = String(socialMedia).split(',').map(p => p.trim().toLowerCase());
  return requestedPlatforms.some(platform => {
    const value = employeeSocials[platform];
    return value && String(value).trim() !== '';
  });
}

/**
 * Apply search filters to employees
 * Extracted from searchEmployees to reduce complexity
 */
export function applySearchFilters<T extends EmployeeWithFilterFields>(
  employees: T[],
  options: SearchFilterOptions
): T[] {
  const { type, category_id, establishment_id, normalizedZoneFilter, languages, has_photos, social_media } = options;

  return employees.filter(emp => {
    const hasCurrentEmployment = emp.current_employment?.some(ce => ce.is_current === true) ?? false;
    const currentEmp = emp.current_employment?.find(ce => ce.is_current === true);
    const hasActiveFreelance = emp.independent_position?.some(ip => ip.is_active === true) ?? false;
    const isSimpleFreelance = emp.is_freelance === true;

    // Apply filters using helper functions
    if (!matchesTypeFilter(type, hasCurrentEmployment, hasActiveFreelance, isSimpleFreelance)) return false;
    if (!matchesCategoryFilter(category_id, currentEmp)) return false;
    if (establishment_id && (!currentEmp || currentEmp.establishment_id !== establishment_id)) return false;
    if (!matchesZoneFilter(normalizedZoneFilter, currentEmp, emp)) return false;
    if (!matchesLanguagesFilter(languages, emp.languages_spoken || [])) return false;
    if (has_photos === 'true' && (!Array.isArray(emp.photos) || emp.photos.length === 0)) return false;
    if (!matchesSocialMediaFilter(social_media, emp.social_media || {})) return false;

    return true;
  });
}
