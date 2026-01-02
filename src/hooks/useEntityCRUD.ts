/**
 * ⚡ useEntityCRUD - Generic CRUD Hook Factory
 *
 * Factory qui génère des hooks React Query pour les opérations CRUD standard.
 * Élimine la duplication entre useEstablishments, useEmployees, etc.
 *
 * Usage:
 * ```
 * const { useList, useOne, useCreate, useUpdate, useDelete, keys } = createEntityHooks<Establishment>({
 *   entityName: 'establishment',
 *   endpoint: '/api/establishments',
 *   responseKey: 'establishments', // Clé dans la réponse API (ex: { establishments: [...] })
 * });
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSecureFetch } from './useSecureFetch';
import { logger } from '../utils/logger';
import toast from '../utils/toast';

/**
 * Configuration pour créer des hooks d'entité
 */
export interface EntityHooksConfig<TFilters = Record<string, unknown>> {
  /** Nom de l'entité (pour logs et messages) */
  entityName: string;
  /** Endpoint API de base (ex: '/api/establishments') */
  endpoint: string;
  /** Clé dans la réponse API pour la liste (ex: 'establishments') - optionnel */
  responseKey?: string;
  /** Clé pour un item unique (ex: 'establishment') - optionnel */
  singleResponseKey?: string;
  /** Emoji pour les logs */
  emoji?: string;
  /** Temps de cache (staleTime) en ms - défaut: 5 min */
  staleTime?: number;
  /** Temps de garbage collection en ms - défaut: 10 min */
  gcTime?: number;
  /** Message de succès personnalisé pour create */
  createSuccessMessage?: string;
  /** Message de succès personnalisé pour update */
  updateSuccessMessage?: string;
  /** Message de succès personnalisé pour delete */
  deleteSuccessMessage?: string;
  /** Type des filtres pour les query keys */
  _filters?: TFilters;
}

/**
 * Crée les query keys pour une entité
 */
export function createEntityKeys<TFilters = Record<string, unknown>>(entityName: string) {
  const baseKey = [entityName] as const;

  return {
    all: baseKey,
    lists: () => [...baseKey, 'list'] as const,
    list: (filters?: TFilters) => [...baseKey, 'list', { filters }] as const,
    details: () => [...baseKey, 'detail'] as const,
    detail: (id: string) => [...baseKey, 'detail', id] as const,
  };
}

/**
 * Type des query keys générés
 */
export type EntityKeys<TFilters = Record<string, unknown>> = ReturnType<typeof createEntityKeys<TFilters>>;

/**
 * Factory principale pour créer tous les hooks CRUD d'une entité
 */
export function createEntityHooks<
  TEntity extends { id?: string },
  TFilters = Record<string, unknown>
>(config: EntityHooksConfig<TFilters>) {
  const {
    entityName,
    endpoint,
    responseKey,
    singleResponseKey,
    emoji = '📦',
    staleTime = 5 * 60 * 1000,
    gcTime = 10 * 60 * 1000,
    createSuccessMessage = `${entityName} created successfully!`,
    updateSuccessMessage = `${entityName} updated successfully!`,
    deleteSuccessMessage = `${entityName} deleted successfully!`,
  } = config;

  const keys = createEntityKeys<TFilters>(entityName);
  const apiUrl = import.meta.env.VITE_API_URL;

  /**
   * Hook pour récupérer la liste complète
   */
  function useList(queryParams?: string) {
    const { secureFetch } = useSecureFetch();

    return useQuery({
      queryKey: keys.lists(),
      queryFn: async (): Promise<TEntity[]> => {
        logger.debug(`${emoji} Fetching ${entityName}s...`);

        const url = queryParams
          ? `${apiUrl}${endpoint}?${queryParams}`
          : `${apiUrl}${endpoint}`;

        const response = await secureFetch(url, { method: 'GET' });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${entityName}s`);
        }

        const data = await response.json();
        // Support pour { entities: [...] } ou [...] direct
        const entities = responseKey ? (data[responseKey] || data) : data;

        logger.debug(`✅ Fetched ${Array.isArray(entities) ? entities.length : 0} ${entityName}s`);
        return entities;
      },
      staleTime,
      gcTime,
    });
  }

  /**
   * Hook pour récupérer une entité par ID
   */
  function useOne(id: string | null) {
    const { secureFetch } = useSecureFetch();

    return useQuery({
      queryKey: keys.detail(id || ''),
      queryFn: async (): Promise<TEntity> => {
        if (!id) {
          throw new Error(`${entityName} ID is required`);
        }

        logger.debug(`${emoji} Fetching ${entityName} ${id}...`);

        const response = await secureFetch(`${apiUrl}${endpoint}/${id}`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${entityName} ${id}`);
        }

        const data = await response.json();
        // Support pour { entity: {...} } ou {...} direct
        const entity = singleResponseKey ? (data[singleResponseKey] || data) : data;

        logger.debug(`✅ Fetched ${entityName}: ${(entity as Record<string, unknown>).name || id}`);
        return entity;
      },
      enabled: !!id,
      staleTime: staleTime * 0.6, // Détail change plus souvent
      gcTime,
    });
  }

  /**
   * Hook pour créer une entité
   */
  function useCreate() {
    const { secureFetch } = useSecureFetch();
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (entityData: Partial<TEntity>): Promise<TEntity> => {
        logger.debug(`${emoji} Creating ${entityName}...`, entityData);

        const response = await secureFetch(`${apiUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entityData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || `Failed to create ${entityName}`);
        }

        const data = await response.json();
        logger.debug(`✅ ${entityName} created:`, data);
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: keys.lists() });
        toast.success(createSuccessMessage);
      },
      onError: (error: Error) => {
        logger.error(`❌ Failed to create ${entityName}:`, error);
        toast.error(`Failed to create ${entityName}: ${error.message}`);
      },
    });
  }

  /**
   * Hook pour mettre à jour une entité
   */
  function useUpdate() {
    const { secureFetch } = useSecureFetch();
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({ id, data }: { id: string; data: Partial<TEntity> }): Promise<TEntity> => {
        logger.debug(`${emoji} Updating ${entityName} ${id}...`, data);

        const response = await secureFetch(`${apiUrl}${endpoint}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || `Failed to update ${entityName}`);
        }

        const updatedData = await response.json();
        logger.debug(`✅ ${entityName} updated:`, updatedData);
        return updatedData;
      },
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: keys.lists() });
        queryClient.invalidateQueries({ queryKey: keys.detail(variables.id) });
        toast.success(updateSuccessMessage);
      },
      onError: (error: Error) => {
        logger.error(`❌ Failed to update ${entityName}:`, error);
        toast.error(`Failed to update ${entityName}: ${error.message}`);
      },
    });
  }

  /**
   * Hook pour supprimer une entité
   */
  function useDelete() {
    const { secureFetch } = useSecureFetch();
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (id: string): Promise<void> => {
        logger.debug(`${emoji} Deleting ${entityName} ${id}...`);

        const response = await secureFetch(`${apiUrl}${endpoint}/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || `Failed to delete ${entityName}`);
        }

        logger.debug(`✅ ${entityName} deleted`);
      },
      onSuccess: (_, deletedId) => {
        queryClient.invalidateQueries({ queryKey: keys.lists() });
        queryClient.removeQueries({ queryKey: keys.detail(deletedId) });
        toast.success(deleteSuccessMessage);
      },
      onError: (error: Error) => {
        logger.error(`❌ Failed to delete ${entityName}:`, error);
        toast.error(`Failed to delete ${entityName}: ${error.message}`);
      },
    });
  }

  return {
    keys,
    useList,
    useOne,
    useCreate,
    useUpdate,
    useDelete,
  };
}

/**
 * Type helper pour extraire le type de retour des hooks
 */
export type EntityHooks<TEntity extends { id?: string }, TFilters = Record<string, unknown>> =
  ReturnType<typeof createEntityHooks<TEntity, TFilters>>;
