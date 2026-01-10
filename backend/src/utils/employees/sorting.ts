/**
 * Employee Sorting
 *
 * Functions for sorting and ordering employee lists
 */

import { EmployeeWithRatings, EmployeeWithSortFields } from './types';

/**
 * Sort employees by popularity
 */
export function sortByPopularity<T extends EmployeeWithRatings>(
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
 * Apply sorting to enriched employees based on sort_by parameter
 */
export function applySorting<T extends EmployeeWithSortFields>(
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
