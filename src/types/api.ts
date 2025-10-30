/**
 * 🔧 TYPE SAFETY IMPROVEMENT - Centralized API Response Types
 *
 * This file contains type-safe definitions for all API responses.
 * Use these types instead of 'any' when making API calls.
 *
 * Example usage:
 * ```typescript
 * const response = await secureFetch('/api/establishments');
 * const data: GetEstablishmentsResponse = await response.json();
 * // data.establishments is now fully typed!
 * ```
 */

import {
  Establishment,
  Employee,
  Comment,
  User,
  Favorite,
  AdminStats,
  EmployeeClaimRequest,
  EstablishmentOwner,
  VIPSubscription
} from './index';

// ==========================================
// Generic API Response Wrappers
// ==========================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ==========================================
// Establishment API Responses
// ==========================================

export interface GetEstablishmentsResponse {
  establishments: Establishment[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface GetEstablishmentByIdResponse {
  establishment: Establishment;
}

export interface CreateEstablishmentResponse {
  establishment: Establishment;
  message: string;
}

export interface UpdateEstablishmentResponse {
  establishment: Establishment;
  message: string;
}

export interface DeleteEstablishmentResponse {
  message: string;
}

// ==========================================
// Employee API Responses
// ==========================================

export interface GetEmployeesResponse {
  employees: Employee[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface GetEmployeeByIdResponse {
  employee: Employee;
}

export interface CreateEmployeeResponse {
  employee: Employee;
  message: string;
}

export interface UpdateEmployeeResponse {
  employee: Employee;
  message: string;
}

export interface DeleteEmployeeResponse {
  message: string;
}

export interface GetMyLinkedProfileResponse {
  id: string;
  name: string;
  nickname?: string;
  photos: string[];
  status: 'pending' | 'approved' | 'rejected';
}

// ==========================================
// Auth API Responses
// ==========================================

export interface LoginResponse {
  user: User;
  message: string;
}

export interface RegisterResponse {
  user: User;
  csrfToken: string;
  message: string;
}

export interface GetProfileResponse {
  user: User;
}

export interface LogoutResponse {
  message: string;
}

// ==========================================
// Comment API Responses
// ==========================================

export interface GetCommentsResponse {
  comments: Comment[];
  total?: number;
}

export interface CreateCommentResponse {
  comment: Comment;
  message: string;
}

export interface UpdateCommentResponse {
  comment: Comment;
  message: string;
}

export interface DeleteCommentResponse {
  message: string;
}

// ==========================================
// Favorite API Responses
// ==========================================

export interface GetFavoritesResponse {
  favorites: Favorite[];
  total?: number;
}

export interface AddFavoriteResponse {
  favorite: Favorite;
  message: string;
}

export interface RemoveFavoriteResponse {
  message: string;
}

// ==========================================
// Admin API Responses
// ==========================================

export interface GetAdminStatsResponse {
  stats: AdminStats;
}

export interface GetPendingEmployeesResponse {
  employees: Employee[];
  total: number;
}

export interface GetPendingEstablishmentsResponse {
  establishments: Establishment[];
  total: number;
}

export interface ApproveEmployeeResponse {
  employee: Employee;
  message: string;
}

export interface RejectEmployeeResponse {
  message: string;
  reason?: string;
}

// ==========================================
// Employee Claim System Responses
// ==========================================

export interface GetEmployeeClaimsResponse {
  claims: EmployeeClaimRequest[];
  total: number;
}

export interface CreateEmployeeClaimResponse {
  claim_id: string;
  message: string;
}

export interface ApproveEmployeeClaimResponse {
  message: string;
  employee_id: string;
  user_id: string;
}

export interface RejectEmployeeClaimResponse {
  message: string;
  claim_id: string;
}

// ==========================================
// Establishment Owner System Responses
// ==========================================

export interface GetEstablishmentOwnersResponse {
  owners: EstablishmentOwner[];
  total: number;
}

export interface AssignEstablishmentOwnerResponse {
  owner: EstablishmentOwner;
  message: string;
}

export interface RemoveEstablishmentOwnerResponse {
  message: string;
}

export interface GetMyOwnedEstablishmentsResponse {
  establishments: Array<{
    id: string;
    name: string;
    zone: string;
    owner_role: 'owner' | 'manager';
    permissions: {
      can_edit_info: boolean;
      can_edit_pricing: boolean;
      can_edit_photos: boolean;
      can_edit_employees: boolean;
      can_view_analytics: boolean;
    };
    assigned_at: string;
  }>;
  total: number;
}

// ==========================================
// VIP System Responses
// ==========================================

export interface PurchaseVIPResponse {
  subscription: VIPSubscription;
  transaction: {
    id: string;
    amount: number;
    currency: string;
    payment_method: string;
    payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  };
  message: string;
}

export interface GetVIPSubscriptionsResponse {
  subscriptions: VIPSubscription[];
  total: number;
}

// ==========================================
// CSRF & Security Responses
// ==========================================

export interface GetCSRFTokenResponse {
  csrfToken: string;
  sessionId: string;
  expiresAt: string;
}

// ==========================================
// Health Check Response
// ==========================================

export interface HealthCheckResponse {
  message: string;
  timestamp: string;
  version: string;
}

// ==========================================
// Notification Responses
// ==========================================

export interface GetNotificationsResponse {
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    is_read: boolean;
    created_at: string;
  }>;
  total: number;
  unread_count: number;
}

export interface MarkNotificationReadResponse {
  message: string;
}

// ==========================================
// Upload Responses
// ==========================================

export interface UploadImageResponse {
  images: Array<{
    url: string;
    public_id: string;
  }>;
  message: string;
}

// ==========================================
// Type Guards (Helper functions)
// ==========================================

export function isApiSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

export function isApiErrorResponse(
  response: ApiResponse<unknown>
): response is ApiErrorResponse {
  return response.success === false;
}

// ==========================================
// Typed Fetch Helper
// ==========================================

/**
 * Type-safe wrapper for fetch with automatic JSON parsing
 *
 * @example
 * const data = await typedFetch<GetEstablishmentsResponse>('/api/establishments');
 * console.log(data.establishments); // Fully typed!
 */
export async function typedFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: response.statusText
    }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}
