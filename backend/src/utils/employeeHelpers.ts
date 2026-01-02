/**
 * Employee Helper Functions
 *
 * Extracted from employeeController.ts to reduce complexity
 */

import { supabase } from '../config/supabase';
import { logger } from './logger';

// Type definitions
export interface CurrentEmploymentRecord {
  is_current: boolean;
  establishment_id?: string;
  establishment?: {
    zone?: string;
    category_id?: number;
  };
}

export interface IndependentPositionRecord {
  id: string;
  employee_id: string;
  is_active: boolean;
  zone?: string;
  grid_row?: number;
  grid_col?: number;
}

export interface RatingData {
  employee_id: string;
  rating: number;
  created_at?: string;
}

export interface VoteData {
  employee_id: string;
}

/**
 * Fetch ratings and votes for a list of employees
 */
export async function fetchEmployeeRatingsAndVotes(
  employeeIds: string[]
): Promise<{ ratingsData: RatingData[]; votesData: VoteData[] }> {
  if (employeeIds.length === 0) {
    return { ratingsData: [], votesData: [] };
  }

  const [ratingsResult, votesResult] = await Promise.all([
    supabase
      .from('comments')
      .select('employee_id, rating, created_at')
      .in('employee_id', employeeIds)
      .eq('status', 'approved')
      .not('rating', 'is', null),
    supabase
      .from('employee_existence_votes')
      .select('employee_id')
      .in('employee_id', employeeIds)
  ]);

  return {
    ratingsData: ratingsResult.data || [],
    votesData: votesResult.data || []
  };
}

/**
 * Enrich employees with average ratings and vote counts
 */
export function enrichEmployeesWithRatings<T extends { id: string }>(
  employees: T[],
  ratingsData: RatingData[],
  votesData: VoteData[]
): (T & { average_rating: number | null; comment_count: number; vote_count: number })[] {
  return employees.map(employee => {
    const employeeRatings = ratingsData
      .filter(r => r.employee_id === employee.id)
      .map(r => r.rating);

    const averageRating = employeeRatings.length > 0
      ? employeeRatings.reduce((sum, rating) => sum + rating, 0) / employeeRatings.length
      : null;

    const voteCount = votesData.filter(v => v.employee_id === employee.id).length;

    return {
      ...employee,
      average_rating: averageRating,
      comment_count: employeeRatings.length,
      vote_count: voteCount
    };
  });
}

/**
 * Sort employees by popularity
 */
export function sortByPopularity<T extends { average_rating?: number | null; comment_count?: number; is_vip?: boolean; vip_expires_at?: string }>(
  employees: T[],
  sortOrder: string
): T[] {
  return [...employees].sort((a, b) => {
    const isVIPActiveA = a.is_vip && a.vip_expires_at && new Date(a.vip_expires_at) > new Date();
    const isVIPActiveB = b.is_vip && b.vip_expires_at && new Date(b.vip_expires_at) > new Date();

    const baseScoreA = ((a.average_rating || 0) * 10) + (a.comment_count || 0);
    const baseScoreB = ((b.average_rating || 0) * 10) + (b.comment_count || 0);

    const scoreA = isVIPActiveA ? baseScoreA * 1.5 : baseScoreA;
    const scoreB = isVIPActiveB ? baseScoreB * 1.5 : baseScoreB;

    return sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
  });
}

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

/**
 * Calculate relevance score for search results
 */
export function calculateRelevanceScore(
  employee: {
    name?: string;
    nickname?: string;
    description?: string;
    nationality?: string[];
    is_vip?: boolean;
    vip_expires_at?: string;
    is_verified?: boolean;
  },
  searchQuery: string | undefined,
  averageRating: number,
  commentCount: number
): number {
  let relevanceScore = 0;

  if (searchQuery) {
    const searchTerm = String(searchQuery).toLowerCase();
    const name = employee.name?.toLowerCase() || '';
    const nickname = employee.nickname?.toLowerCase() || '';
    const description = employee.description?.toLowerCase() || '';
    const nationalityArray = Array.isArray(employee.nationality) ? employee.nationality : [];
    const nationalityStr = nationalityArray.join(' ').toLowerCase();

    // Name match scoring
    if (name === searchTerm) relevanceScore += 100;
    else if (name.includes(searchTerm)) relevanceScore += 50;

    // Nickname match scoring
    if (nickname === searchTerm) relevanceScore += 80;
    else if (nickname.includes(searchTerm)) relevanceScore += 40;

    // Description and nationality match scoring
    if (description.includes(searchTerm)) relevanceScore += 20;
    if (nationalityStr.includes(searchTerm)) relevanceScore += 30;

    // Boost based on rating and reviews
    relevanceScore += (averageRating * 5) + (commentCount * 2);
  }

  // VIP & Verified boost
  const isVIPActive = employee.is_vip &&
    employee.vip_expires_at &&
    new Date(employee.vip_expires_at) > new Date();
  const isVerified = employee.is_verified === true;

  if (isVerified && isVIPActive) {
    relevanceScore += 1000;
  } else if (isVerified) {
    relevanceScore += 500;
  } else if (isVIPActive) {
    relevanceScore += 10;
  }

  return relevanceScore;
}

/**
 * Apply sorting to enriched employees based on sort_by parameter
 */
export function applySorting<T extends {
  name?: string;
  age?: number;
  nationality?: string[];
  created_at?: string;
  average_rating?: number | null;
  comment_count?: number;
  relevance_score?: number;
  is_vip?: boolean;
  vip_expires_at?: string;
}>(
  employees: T[],
  sortBy: string,
  sortOrder: string
): T[] {
  const sorted = [...employees];

  switch (sortBy) {
    case 'popularity':
      return sortByPopularity(sorted, sortOrder);

    case 'relevance':
      sorted.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
      break;

    case 'name':
      sorted.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
      break;

    case 'age':
      sorted.sort((a, b) => {
        const ageA = a.age || 0;
        const ageB = b.age || 0;
        return sortOrder === 'asc' ? ageA - ageB : ageB - ageA;
      });
      break;

    case 'nationality':
      sorted.sort((a, b) => {
        const natA = (Array.isArray(a.nationality) && a.nationality.length > 0 ? a.nationality[0] : '').toLowerCase();
        const natB = (Array.isArray(b.nationality) && b.nationality.length > 0 ? b.nationality[0] : '').toLowerCase();
        return sortOrder === 'asc' ? natA.localeCompare(natB) : natB.localeCompare(natA);
      });
      break;

    case 'newest':
      sorted.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      break;

    case 'oldest':
      sorted.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateA - dateB;
      });
      break;
  }

  return sorted;
}

/**
 * Validate and update employment associations for an employee
 */
export async function updateEmploymentAssociations(
  employeeId: string,
  newEstablishmentIds: string[],
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Deactivate all current employment
  const { error: deactivateError } = await supabase
    .from('employment_history')
    .update({ is_current: false, end_date: new Date().toISOString().split('T')[0] })
    .eq('employee_id', employeeId)
    .eq('is_current', true);

  if (deactivateError) {
    logger.error('Failed to deactivate employment history:', deactivateError);
  }

  // 2. Create new employment associations
  if (newEstablishmentIds.length > 0) {
    const employmentRecords = newEstablishmentIds.map(estId => ({
      employee_id: employeeId,
      establishment_id: estId,
      start_date: new Date().toISOString().split('T')[0],
      is_current: true,
      created_by: userId
    }));

    const { error: createError } = await supabase
      .from('employment_history')
      .insert(employmentRecords);

    if (createError) {
      logger.error('Failed to create employment history:', createError);
      return { success: false, error: 'Failed to update establishments: ' + createError.message };
    }

    logger.info(`Employee ${employeeId} updated with ${newEstablishmentIds.length} establishment(s)`);
  } else {
    logger.info(`Employee ${employeeId} removed from all establishments`);
  }

  return { success: true };
}

/**
 * Search filter options for employee search
 */
export interface SearchFilterOptions {
  type?: string;
  category_id?: string | number;
  establishment_id?: string;
  normalizedZoneFilter?: string | null;
  languages?: string;
  has_photos?: string;
  social_media?: string;
}

/**
 * Apply search filters to employees
 * Extracted from searchEmployees to reduce complexity
 */
export function applySearchFilters<T extends {
  current_employment?: CurrentEmploymentRecord[];
  independent_position?: IndependentPositionRecord[];
  is_freelance?: boolean;
  freelance_zone?: string;
  languages_spoken?: string[];
  photos?: string[];
  social_media?: Record<string, string>;
}>(
  employees: T[],
  options: SearchFilterOptions
): T[] {
  const { type, category_id, establishment_id, normalizedZoneFilter, languages, has_photos, social_media } = options;

  return employees.filter(emp => {
    const hasCurrentEmployment = emp.current_employment?.some(ce => ce.is_current === true);
    const currentEmp = emp.current_employment?.find(ce => ce.is_current === true);
    const hasActiveFreelance = emp.independent_position?.some(ip => ip.is_active === true);
    const isSimpleFreelance = emp.is_freelance === true;

    // Type filter
    if (type && type !== 'all') {
      const isFreelance = hasActiveFreelance || isSimpleFreelance;
      if (type === 'freelance' && !isFreelance) return false;
      if (type === 'regular' && !hasCurrentEmployment) return false;
    }

    // Category filter
    if (category_id) {
      if (!currentEmp) return false;
      const estCategoryId = (currentEmp.establishment as { category_id?: number } | undefined)?.category_id;
      if (estCategoryId !== Number(category_id)) return false;
    }

    // Establishment filter
    if (establishment_id) {
      if (!currentEmp) return false;
      if (currentEmp.establishment_id !== establishment_id) return false;
    }

    // Zone filter
    if (normalizedZoneFilter) {
      const establishmentZone = (currentEmp?.establishment as { zone?: string } | undefined)?.zone?.toLowerCase().replace(/\s+/g, '');
      const freelanceZone = emp.independent_position?.[0]?.zone?.toLowerCase().replace(/\s+/g, '');
      const simpleFreelanceZone = emp.is_freelance ? emp.freelance_zone?.toLowerCase().replace(/\s+/g, '') : null;
      const matchesZone = establishmentZone === normalizedZoneFilter ||
                          freelanceZone === normalizedZoneFilter ||
                          simpleFreelanceZone === normalizedZoneFilter;
      if (!matchesZone) return false;
    }

    // Languages filter
    if (languages && String(languages).trim()) {
      const requestedLanguages = String(languages).split(',').map(l => l.trim().toLowerCase());
      const employeeLanguages = Array.isArray(emp.languages_spoken)
        ? emp.languages_spoken.map(l => l.toLowerCase())
        : [];
      const speaksAnyLanguage = requestedLanguages.some(lang =>
        employeeLanguages.some(empLang => empLang.includes(lang) || lang.includes(empLang))
      );
      if (!speaksAnyLanguage) return false;
    }

    // Has photos filter
    if (has_photos === 'true') {
      if (!Array.isArray(emp.photos) || emp.photos.length === 0) return false;
    }

    // Social media filter
    if (social_media && String(social_media).trim()) {
      const requestedPlatforms = String(social_media).split(',').map(p => p.trim().toLowerCase());
      const employeeSocials = emp.social_media || {};
      const hasAnySocial = requestedPlatforms.some(platform => {
        const value = employeeSocials[platform];
        return value && String(value).trim() !== '';
      });
      if (!hasAnySocial) return false;
    }

    return true;
  });
}

/**
 * Filter employees by minimum rating
 * Returns filtered employees and their ratings map for reuse
 */
export async function filterByMinRating<T extends { id: string }>(
  employees: T[],
  minRating: number
): Promise<{ filtered: T[]; ratingsByEmployee: Map<string, number[]> }> {
  const employeeIds = employees.map(emp => emp.id);

  const { data: allRatings } = await supabase
    .from('comments')
    .select('employee_id, rating')
    .in('employee_id', employeeIds)
    .eq('status', 'approved')
    .not('rating', 'is', null);

  const ratingsByEmployee = new Map<string, number[]>();
  (allRatings || []).forEach(r => {
    if (!ratingsByEmployee.has(r.employee_id)) {
      ratingsByEmployee.set(r.employee_id, []);
    }
    ratingsByEmployee.get(r.employee_id)!.push(r.rating);
  });

  const filtered = employees.filter(emp => {
    const ratings = ratingsByEmployee.get(emp.id) || [];
    if (ratings.length === 0) return false;
    const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    return avgRating >= minRating;
  });

  return { filtered, ratingsByEmployee };
}

/**
 * Enrich employees with ratings, votes, and relevance score for search
 */
export function enrichEmployeesForSearch<T extends {
  id: string;
  name?: string;
  nickname?: string;
  description?: string;
  nationality?: string[];
  is_vip?: boolean;
  vip_expires_at?: string;
  is_verified?: boolean;
}>(
  employees: T[],
  ratingsData: RatingData[],
  votesData: VoteData[],
  searchQuery?: string
): (T & { average_rating: number; comment_count: number; vote_count: number; relevance_score: number })[] {
  return employees.map(employee => {
    const employeeRatings = ratingsData
      .filter(r => r.employee_id === employee.id)
      .map(r => r.rating);

    const averageRating = employeeRatings.length > 0
      ? employeeRatings.reduce((sum, rating) => sum + rating, 0) / employeeRatings.length
      : 0;

    const voteCount = votesData.filter(v => v.employee_id === employee.id).length;

    const relevanceScore = calculateRelevanceScore(
      employee,
      searchQuery,
      averageRating,
      employeeRatings.length
    );

    return {
      ...employee,
      average_rating: averageRating,
      comment_count: employeeRatings.length,
      vote_count: voteCount,
      relevance_score: relevanceScore
    };
  });
}
