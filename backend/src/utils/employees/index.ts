/**
 * Employees Module
 *
 * Centralized employee helper functions for PattaMap
 *
 * Structure:
 * - types.ts:      Type definitions and interfaces
 * - ratings.ts:    Rating, vote, and enrichment functions
 * - sorting.ts:    Sorting and ordering functions
 * - filters.ts:    Filter functions for employee lists
 * - employment.ts: Employment association management
 * - validation.ts: Data validation functions
 */

// Types
export {
  CurrentEmploymentRecord,
  IndependentPositionRecord,
  RatingData,
  VoteData,
  SearchFilterOptions,
  BaseEmployee,
  EmployeeWithRatings,
  EmployeeWithSortFields,
  EmployeeWithSearchFields,
  EmployeeWithFilterFields
} from './types';

// Ratings & Enrichment
export {
  fetchEmployeeRatingsAndVotes,
  enrichEmployeesWithRatings,
  filterByMinRating,
  calculateRelevanceScore,
  enrichEmployeesForSearch
} from './ratings';

// Sorting
export {
  sortByPopularity,
  applySorting
} from './sorting';

// Filters
export {
  filterEmployeesByType,
  applySearchFilters
} from './filters';

// Employment
export {
  updateEmploymentAssociations,
  notifyFollowersOfUpdate
} from './employment';

// Validation
export {
  validateNationalityArray
} from './validation';
