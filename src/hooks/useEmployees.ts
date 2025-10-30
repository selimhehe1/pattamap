/**
 * ⚡ useEmployees Hook - React Query
 *
 * Hook pour récupérer les employees avec cache intelligent
 *
 * Bénéfices:
 * - Cache 5 minutes (pas de refetch inutile)
 * - Refetch automatique en arrière-plan
 * - Loading/error states automatiques
 * - Invalidation après création/update d'employee
 * - Support pour recherche avancée avec filtres
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSecureFetch } from './useSecureFetch';
import { Employee } from '../types';
import { logger } from '../utils/logger';
import toast from '../utils/toast';

/**
 * Normalize search params for queryKey
 * Remove undefined, null, and empty string values to ensure consistent cache keys
 *
 * Problem: React Query treats { type: 'freelance', q: '' } and { type: 'freelance' } as different keys
 * Solution: Normalize to remove empty values, ensuring same cache key for same search
 */
const normalizeSearchParams = (params: any) => {
  const normalized: any = {};
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
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters?: any) => [...employeeKeys.lists(), { filters }] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
  search: (params?: any) => [...employeeKeys.all, 'search', normalizeSearchParams(params)] as const,
};

/**
 * Hook pour récupérer tous les employees
 */
export const useEmployees = () => {
  const { secureFetch } = useSecureFetch();

  return useQuery({
    queryKey: employeeKeys.lists(),
    queryFn: async (): Promise<Employee[]> => {
      logger.debug('👤 Fetching employees...');

      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/employees`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }

      const data = await response.json();
      logger.debug(`✅ Fetched ${data.length} employees`);

      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook pour récupérer un employee par ID
 */
export const useEmployee = (id: string | null) => {
  const { secureFetch } = useSecureFetch();

  return useQuery({
    queryKey: employeeKeys.detail(id || ''),
    queryFn: async (): Promise<Employee> => {
      if (!id) {
        throw new Error('Employee ID is required');
      }

      logger.debug(`👤 Fetching employee ${id}...`);

      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/employees/${id}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch employee ${id}`);
      }

      const data = await response.json();
      logger.debug(`✅ Fetched employee: ${data.name}`);

      return data;
    },
    enabled: !!id, // Ne lance la requête que si id est fourni
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Interface pour les paramètres de recherche
 */
export interface EmployeeSearchParams {
  q?: string; // Query text search
  type?: string; // 🆕 v10.3 - Employee type filter (all/freelance/regular)
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
 * Interface pour la réponse de recherche complète
 */
export interface EmployeeSearchResponse {
  employees: Employee[]; // Backend returns 'employees' (standardized with GET /api/employees)
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
 * Retourne la réponse complète incluant les filtres disponibles
 */
export const useEmployeeSearch = (params: EmployeeSearchParams) => {
  return useQuery({
    queryKey: employeeKeys.search(params),
    queryFn: async (): Promise<EmployeeSearchResponse> => {
      logger.debug('🔍 Searching employees...', params);

      // Construire l'URL avec query params
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const url = `${process.env.REACT_APP_API_URL}/api/employees/search?${queryParams.toString()}`;

      const response = await fetch(url, {
        credentials: 'include' // Include cookies for session/CSRF token
      });

      if (!response.ok) {
        throw new Error('Failed to search employees');
      }

      const data = await response.json();
      logger.debug(`✅ Found ${data.employees?.length || 0} employees (${data.total} total)`);

      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (recherche change plus souvent)
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true, // Override global config to ensure initial fetch on mount
    // Always enabled - search can run even with no params (returns all)
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new results
  });
};

/**
 * Hook pour recherche infinie avec pagination (Load More)
 * Utilise useInfiniteQuery pour accumuler les résultats de chaque page
 */
export const useInfiniteEmployeeSearch = (baseParams: Omit<EmployeeSearchParams, 'page'>) => {
  return useInfiniteQuery({
    queryKey: employeeKeys.search(baseParams),
    queryFn: async ({ pageParam = 1 }): Promise<EmployeeSearchResponse> => {
      logger.debug('🔍 Searching employees (infinite)...', { ...baseParams, page: pageParam });

      const queryParams = new URLSearchParams();

      // Add base params
      Object.entries(baseParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      // Add pagination
      queryParams.append('page', String(pageParam));
      queryParams.append('limit', '20');

      const url = `${process.env.REACT_APP_API_URL}/api/employees/search?${queryParams.toString()}`;
      const response = await fetch(url, {
        credentials: 'include' // Include cookies for session/CSRF token
      });

      if (!response.ok) {
        throw new Error('Failed to search employees');
      }

      const data = await response.json();
      logger.debug(`✅ Found ${data.employees?.length || 0} employees on page ${pageParam}`);

      return data;
    },
    getNextPageParam: (lastPage) => {
      // Return next page number if there's more data, undefined otherwise
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Hook pour créer un employee
 */
export const useCreateEmployee = () => {
  const { secureFetch } = useSecureFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeData: Partial<Employee>): Promise<Employee> => {
      logger.debug('👤 Creating employee...', employeeData);

      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create employee');
      }

      const data = await response.json();
      logger.debug('✅ Employee created:', data);

      return data;
    },
    onSuccess: () => {
      // Invalide le cache pour forcer un refetch
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.all }); // Invalide toutes les recherches
      toast.success('✅ Employee profile created successfully!');
    },
    onError: (error: Error) => {
      logger.error('❌ Failed to create employee:', error);
      toast.error(`❌ Failed to create employee: ${error.message}`);
    },
  });
};

/**
 * Hook pour mettre à jour un employee
 */
export const useUpdateEmployee = () => {
  const { secureFetch } = useSecureFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Employee> }): Promise<Employee> => {
      logger.debug(`👤 Updating employee ${id}...`, data);

      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/employees/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update employee');
      }

      const updatedData = await response.json();
      logger.debug('✅ Employee updated:', updatedData);

      return updatedData;
    },
    onSuccess: (data, variables) => {
      // Invalide les listes ET le détail de cet employee
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.all }); // Invalide recherches
      toast.success('✅ Employee profile updated successfully!');
    },
    onError: (error: Error) => {
      logger.error('❌ Failed to update employee:', error);
      toast.error(`❌ Failed to update employee: ${error.message}`);
    },
  });
};

/**
 * Hook pour supprimer un employee
 */
export const useDeleteEmployee = () => {
  const { secureFetch } = useSecureFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      logger.debug(`👤 Deleting employee ${id}...`);

      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/employees/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete employee');
      }

      logger.debug('✅ Employee deleted');
    },
    onSuccess: (_, deletedId) => {
      // Invalide les listes
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      // Supprime du cache le détail de cet employee
      queryClient.removeQueries({ queryKey: employeeKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      toast.success('✅ Employee profile deleted successfully!');
    },
    onError: (error: Error) => {
      logger.error('❌ Failed to delete employee:', error);
      toast.error(`❌ Failed to delete employee: ${error.message}`);
    },
  });
};
