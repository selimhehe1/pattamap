/**
 * ⚡ useEstablishments Hook - React Query
 *
 * Hook pour récupérer les établissements avec cache intelligent
 *
 * Bénéfices:
 * - Cache 5 minutes (pas de refetch inutile)
 * - Refetch automatique en arrière-plan
 * - Loading/error states automatiques
 * - Invalidation après création/update d'établissement
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSecureFetch } from './useSecureFetch';
import { Establishment } from '../types';
import { logger } from '../utils/logger';
import toast from '../utils/toast';

/**
 * Query keys centralisés pour invalidation facile
 */
// Filter type for establishment queries
interface EstablishmentFilters {
  zone?: string;
  category_id?: string | number;
  status?: string;
}

export const establishmentKeys = {
  all: ['establishments'] as const,
  lists: () => [...establishmentKeys.all, 'list'] as const,
  list: (filters?: EstablishmentFilters) => [...establishmentKeys.lists(), { filters }] as const,
  details: () => [...establishmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...establishmentKeys.details(), id] as const,
};

/**
 * Hook pour récupérer tous les établissements
 */
export const useEstablishments = () => {
  const { secureFetch } = useSecureFetch();

  return useQuery({
    queryKey: establishmentKeys.lists(),
    queryFn: async (): Promise<Establishment[]> => {
      logger.debug('🏢 Fetching establishments...');

      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/establishments?limit=200`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch establishments');
      }

      const data = await response.json();
      // API returns { establishments: [...], pagination: {...} }
      const establishments = data.establishments || data;
      logger.debug(`✅ Fetched ${establishments.length} establishments`);

      return establishments;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook pour récupérer un établissement par ID
 */
export const useEstablishment = (id: string | null) => {
  const { secureFetch } = useSecureFetch();

  return useQuery({
    queryKey: establishmentKeys.detail(id || ''),
    queryFn: async (): Promise<Establishment> => {
      if (!id) {
        throw new Error('Establishment ID is required');
      }

      logger.debug(`🏢 Fetching establishment ${id}...`);

      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/establishments/${id}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch establishment ${id}`);
      }

      const data = await response.json();

      // API returns { establishment: {...} } - unwrap it
      const establishment = data.establishment || data;
      logger.debug(`✅ Fetched establishment: ${establishment.name}`);

      return establishment;
    },
    enabled: !!id, // Ne lance la requête que si id est fourni
    staleTime: 3 * 60 * 1000, // 3 minutes (détail change plus souvent)
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook pour créer un établissement
 */
export const useCreateEstablishment = () => {
  const { secureFetch } = useSecureFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (establishmentData: Partial<Establishment>): Promise<Establishment> => {
      logger.debug('🏢 Creating establishment...', establishmentData);

      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/establishments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(establishmentData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create establishment');
      }

      const data = await response.json();
      logger.debug('✅ Establishment created:', data);

      return data;
    },
    onSuccess: () => {
      // Invalide le cache pour forcer un refetch
      queryClient.invalidateQueries({ queryKey: establishmentKeys.lists() });
      toast.success('Establishment created successfully!');
    },
    onError: (error: Error) => {
      logger.error('❌ Failed to create establishment:', error);
      toast.error(`Failed to create establishment: ${error.message}`);
    },
  });
};

/**
 * Hook pour mettre à jour un établissement
 */
export const useUpdateEstablishment = () => {
  const { secureFetch } = useSecureFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Establishment> }): Promise<Establishment> => {
      logger.debug(`🏢 Updating establishment ${id}...`, data);

      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/establishments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update establishment');
      }

      const updatedData = await response.json();
      logger.debug('✅ Establishment updated:', updatedData);

      return updatedData;
    },
    onSuccess: (data, variables) => {
      // Invalide les listes ET le détail de cet établissement
      queryClient.invalidateQueries({ queryKey: establishmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: establishmentKeys.detail(variables.id) });
      toast.success('Establishment updated successfully!');
    },
    onError: (error: Error) => {
      logger.error('❌ Failed to update establishment:', error);
      toast.error(`Failed to update establishment: ${error.message}`);
    },
  });
};

/**
 * Hook pour supprimer un établissement
 */
export const useDeleteEstablishment = () => {
  const { secureFetch } = useSecureFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      logger.debug(`🏢 Deleting establishment ${id}...`);

      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/establishments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete establishment');
      }

      logger.debug('✅ Establishment deleted');
    },
    onSuccess: (_, deletedId) => {
      // Invalide les listes
      queryClient.invalidateQueries({ queryKey: establishmentKeys.lists() });
      // Supprime du cache le détail de cet établissement
      queryClient.removeQueries({ queryKey: establishmentKeys.detail(deletedId) });
      toast.success('Establishment deleted successfully!');
    },
    onError: (error: Error) => {
      logger.error('❌ Failed to delete establishment:', error);
      toast.error(`Failed to delete establishment: ${error.message}`);
    },
  });
};

/**
 * Hook pour récupérer les établissements filtrés par zone
 * Utilise les données cachées de useEstablishments et filtre côté client
 */
export const useEstablishmentsByZone = (zone: string | null) => {
  const { data: allEstablishments, isLoading, error } = useEstablishments();

  const filteredEstablishments = React.useMemo(() => {
    if (!allEstablishments || !zone) return [];
    return allEstablishments.filter(est => est.zone === zone);
  }, [allEstablishments, zone]);

  return {
    data: filteredEstablishments,
    isLoading,
    error,
    totalCount: filteredEstablishments.length,
  };
};
