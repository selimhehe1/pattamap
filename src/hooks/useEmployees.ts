/**
 * ⚡ useEmployees Hook - React Query
 *
 * Hook pour récupérer les employees avec cache intelligent.
 * Utilise le factory useEntityCRUD pour les opérations CRUD standard.
 *
 * Bénéfices:
 * - Cache 5 minutes (pas de refetch inutile)
 * - Refetch automatique en arrière-plan
 * - Loading/error states automatiques
 * - Invalidation après création/update d'employee
 * - Support pour recherche avancée avec filtres
 */

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { createEntityHooks, createEntityKeys } from './useEntityCRUD';
import { Employee } from '../types';
import { logger } from '../utils/logger';

/**
 * Interface pour les paramètres de recherche
 */
export interface EmployeeSearchParams {
  q?: string;
  type?: string;
  name?: string;
  nationality?: string;
  zone?: string;
  age_min?: string | number;
  age_max?: string | number;
  category_id?: string;
  establishment_id?: string;
  verified_only?: boolean;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  limit?: number;
}

/**
 * Normalize search params for queryKey
 */
const normalizeSearchParams = (params: EmployeeSearchParams | undefined): Record<string, string | number | boolean> => {
  const normalized: Record<string, string | number | boolean> = {};
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      normalized[key] = value;
    }
  });
  return normalized;
};

/**
 * Query keys centralisés pour invalidation facile
 */
export const employeeKeys = {
  ...createEntityKeys<EmployeeSearchParams>('employees'),
  search: (params?: EmployeeSearchParams) => ['employees', 'search', normalizeSearchParams(params)] as const,
};

/**
 * Factory hooks pour les employees
 */
const employeeHooks = createEntityHooks<Employee, EmployeeSearchParams>({
  entityName: 'employee',
  endpoint: '/api/employees',
  responseKey: 'employees',
  emoji: '👤',
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  createSuccessMessage: 'Employee profile created successfully!',
  updateSuccessMessage: 'Employee profile updated successfully!',
  deleteSuccessMessage: 'Employee profile deleted successfully!',
});

/**
 * Hook pour récupérer tous les employees
 */
export const useEmployees = employeeHooks.useList;

/**
 * Hook pour récupérer un employee par ID
 */
export const useEmployee = employeeHooks.useOne;

/**
 * Hook pour créer un employee
 */
export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  const mutation = employeeHooks.useCreate();

  // Override onSuccess to also invalidate search queries
  return {
    ...mutation,
    mutateAsync: async (data: Partial<Employee>) => {
      const result = await mutation.mutateAsync(data);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      return result;
    },
  };
};

/**
 * Hook pour mettre à jour un employee
 */
export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  const mutation = employeeHooks.useUpdate();

  return {
    ...mutation,
    mutateAsync: async (params: { id: string; data: Partial<Employee> }) => {
      const result = await mutation.mutateAsync(params);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      return result;
    },
  };
};

/**
 * Hook pour supprimer un employee
 */
export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  const mutation = employeeHooks.useDelete();

  return {
    ...mutation,
    mutateAsync: async (id: string) => {
      const result = await mutation.mutateAsync(id);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      return result;
    },
  };
};

// ============================================
// SEARCH HOOKS (Specific to employees)
// ============================================

/**
 * Interface pour la réponse de recherche complète
 */
export interface EmployeeSearchResponse {
  employees: Employee[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  filters?: {
    availableNationalities: string[];
    availableZones: string[];
    availableEstablishments: Array<{ id: string; name: string; zone: string }>;
    availableCategories: Array<{ id: number; name: string; icon: string }>;
  };
}

/**
 * Hook pour rechercher des employees avec filtres
 */
export const useEmployeeSearch = (params: EmployeeSearchParams) => {
  return useQuery({
    queryKey: employeeKeys.search(params),
    queryFn: async (): Promise<EmployeeSearchResponse> => {
      logger.debug('🔍 Searching employees...', params);

      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const url = `${import.meta.env.VITE_API_URL}/api/employees/search?${queryParams.toString()}`;
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        throw new Error('Failed to search employees');
      }

      const data = await response.json();
      logger.debug(`✅ Found ${data.employees?.length || 0} employees (${data.total} total)`);
      return data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook pour recherche infinie avec pagination (Load More)
 */
export const useInfiniteEmployeeSearch = (baseParams: Omit<EmployeeSearchParams, 'page'>) => {
  return useInfiniteQuery({
    queryKey: employeeKeys.search(baseParams),
    queryFn: async ({ pageParam = 1 }): Promise<EmployeeSearchResponse> => {
      logger.debug('🔍 Searching employees (infinite)...', { ...baseParams, page: pageParam });

      const queryParams = new URLSearchParams();
      Object.entries(baseParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
      queryParams.append('page', String(pageParam));
      queryParams.append('limit', '20');

      const url = `${import.meta.env.VITE_API_URL}/api/employees/search?${queryParams.toString()}`;
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        throw new Error('Failed to search employees');
      }

      const data = await response.json();
      logger.debug(`✅ Found ${data.employees?.length || 0} employees on page ${pageParam}`);
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
