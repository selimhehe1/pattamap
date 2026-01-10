/**
 * Employee Ratings & Votes
 *
 * Functions for fetching and enriching employees with ratings and votes
 */

import { supabase } from '../../config/supabase';
import { RatingData, VoteData, BaseEmployee } from './types';

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
export function enrichEmployeesWithRatings<T extends BaseEmployee>(
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
 * Filter employees by minimum rating
 * Returns filtered employees and their ratings map for reuse
 */
export async function filterByMinRating<T extends BaseEmployee>(
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
