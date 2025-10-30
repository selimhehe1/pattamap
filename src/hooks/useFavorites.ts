/**
 * ⚡ useFavorites Hook - React Query
 *
 * Hook pour gérer les favoris avec cache intelligent et optimistic updates
 *
 * Bénéfices:
 * - Cache 3 minutes (favoris changent souvent)
 * - Optimistic updates (UI instantanée)
 * - Rollback automatique si erreur
 * - Invalidation automatique après ajout/suppression
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSecureFetch } from './useSecureFetch';
import { Establishment } from '../types';
import { logger } from '../utils/logger';
import toast from '../utils/toast';

/**
 * Interface pour un favori
 */
export interface Favorite {
  id: string;
  user_id: string;
  employee_id: string;
  created_at: string;
  employee_name: string;
  employee_nickname?: string;
  employee_photos: string[];
  employee_age?: number;
  employee_nationality?: string;
  employee_rating?: number;
  employee_comment_count?: number;
  employee_social_media?: Record<string, string>;
  current_establishment?: Establishment;
  average_rating?: number;
}

/**
 * Query keys centralisés
 */
export const favoriteKeys = {
  all: ['favorites'] as const,
  lists: () => [...favoriteKeys.all, 'list'] as const,
  list: (userId?: string) => [...favoriteKeys.lists(), { userId }] as const,
};

/**
 * Hook pour récupérer les favoris de l'utilisateur connecté
 */
export const useFavorites = () => {
  const { secureFetch } = useSecureFetch();

  return useQuery({
    queryKey: favoriteKeys.lists(),
    queryFn: async (): Promise<Favorite[]> => {
      logger.debug('⭐ Fetching user favorites...');

      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/favorites`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch favorites');
      }

      const data = await response.json();
      logger.debug(`✅ Fetched ${data.favorites?.length || 0} favorites`);

      return data.favorites || [];
    },
    staleTime: 3 * 60 * 1000, // 3 minutes (favoris changent souvent)
    gcTime: 10 * 60 * 1000,
    retry: 2, // Moins de retries car requête user-specific
  });
};

/**
 * Hook pour vérifier si un employee est dans les favoris
 */
export const useIsFavorite = (employeeId: string): boolean => {
  const { data: favorites } = useFavorites();
  return favorites?.some((fav) => fav.employee_id === employeeId) || false;
};

/**
 * Hook pour ajouter un favori avec optimistic update
 */
export const useAddFavorite = () => {
  const { secureFetch } = useSecureFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string): Promise<Favorite> => {
      logger.debug(`⭐ Adding employee ${employeeId} to favorites...`);

      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employee_id: employeeId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add favorite');
      }

      const data = await response.json();
      logger.debug('✅ Favorite added:', data);

      return data;
    },
    // Optimistic update: Update UI immediately before server response
    onMutate: async (employeeId) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: favoriteKeys.lists() });

      // Snapshot the previous value
      const previousFavorites = queryClient.getQueryData<Favorite[]>(favoriteKeys.lists());

      // Optimistically add the favorite to the list
      if (previousFavorites) {
        const optimisticFavorite: Favorite = {
          id: `temp-${Date.now()}`, // Temporary ID
          user_id: 'current-user', // Will be replaced by real data
          employee_id: employeeId,
          created_at: new Date().toISOString(),
          employee_name: 'Loading...', // Placeholder
          employee_photos: [],
          average_rating: undefined,
        };

        queryClient.setQueryData<Favorite[]>(
          favoriteKeys.lists(),
          [...previousFavorites, optimisticFavorite]
        );
      }

      // Return context object with the snapshotted value
      return { previousFavorites };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (error: Error, _employeeId, context) => {
      logger.error('❌ Failed to add favorite:', error);

      // Rollback to previous state
      if (context?.previousFavorites) {
        queryClient.setQueryData(favoriteKeys.lists(), context.previousFavorites);
      }

      toast.error(`❌ Failed to add to favorites: ${error.message}`);
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.lists() });
    },
    onSuccess: () => {
      toast.success('⭐ Added to favorites!');
    },
  });
};

/**
 * Hook pour supprimer un favori avec optimistic update
 */
export const useRemoveFavorite = () => {
  const { secureFetch } = useSecureFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string): Promise<void> => {
      logger.debug(`⭐ Removing employee ${employeeId} from favorites...`);

      const response = await secureFetch(
        `${process.env.REACT_APP_API_URL}/api/favorites/${employeeId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove favorite');
      }

      logger.debug('✅ Favorite removed');
    },
    // Optimistic update: Update UI immediately before server response
    onMutate: async (employeeId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: favoriteKeys.lists() });

      // Snapshot the previous value
      const previousFavorites = queryClient.getQueryData<Favorite[]>(favoriteKeys.lists());

      // Optimistically remove the favorite from the list
      if (previousFavorites) {
        queryClient.setQueryData<Favorite[]>(
          favoriteKeys.lists(),
          previousFavorites.filter((fav) => fav.employee_id !== employeeId)
        );
      }

      // Return context object with the snapshotted value
      return { previousFavorites };
    },
    // If the mutation fails, use the context to roll back
    onError: (error: Error, _employeeId, context) => {
      logger.error('❌ Failed to remove favorite:', error);

      // Rollback to previous state
      if (context?.previousFavorites) {
        queryClient.setQueryData(favoriteKeys.lists(), context.previousFavorites);
      }

      toast.error(`❌ Failed to remove from favorites: ${error.message}`);
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.lists() });
    },
    onSuccess: () => {
      toast.success('❌ Removed from favorites');
    },
  });
};

/**
 * Hook combiné pour toggle favorite (add or remove)
 */
export const useToggleFavorite = (employeeId: string) => {
  const isFavorite = useIsFavorite(employeeId);
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  const toggle = () => {
    if (isFavorite) {
      removeFavorite.mutate(employeeId);
    } else {
      addFavorite.mutate(employeeId);
    }
  };

  return {
    isFavorite,
    toggle,
    isLoading: addFavorite.isPending || removeFavorite.isPending,
  };
};
