/**
 * ⚡ useEstablishments Hook - React Query
 *
 * Hook pour récupérer les établissements avec cache intelligent.
 * Utilise le factory useEntityCRUD pour les opérations CRUD standard.
 *
 * Bénéfices:
 * - Cache 5 minutes (pas de refetch inutile)
 * - Refetch automatique en arrière-plan
 * - Loading/error states automatiques
 * - Invalidation après création/update d'établissement
 */

import React from 'react';
import { createEntityHooks, createEntityKeys } from './useEntityCRUD';
import { Establishment } from '../types';

/**
 * Filter type for establishment queries
 */
export interface EstablishmentFilters {
  zone?: string;
  category_id?: string | number;
  status?: string;
}

/**
 * Query keys centralisés pour invalidation facile
 * @deprecated Utiliser `establishmentHooks.keys` à la place
 */
export const establishmentKeys = createEntityKeys<EstablishmentFilters>('establishments');

/**
 * Factory hooks pour les établissements
 */
const establishmentHooks = createEntityHooks<Establishment, EstablishmentFilters>({
  entityName: 'establishment',
  endpoint: '/api/establishments',
  responseKey: 'establishments',
  singleResponseKey: 'establishment',
  emoji: '🏢',
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  createSuccessMessage: 'Establishment created successfully!',
  updateSuccessMessage: 'Establishment updated successfully!',
  deleteSuccessMessage: 'Establishment deleted successfully!',
});

/**
 * Hook pour récupérer tous les établissements
 */
export const useEstablishments = () => {
  return establishmentHooks.useList('limit=200');
};

/**
 * Hook pour récupérer un établissement par ID
 */
export const useEstablishment = (id: string | null) => {
  return establishmentHooks.useOne(id);
};

/**
 * Hook pour créer un établissement
 */
export const useCreateEstablishment = establishmentHooks.useCreate;

/**
 * Hook pour mettre à jour un établissement
 */
export const useUpdateEstablishment = establishmentHooks.useUpdate;

/**
 * Hook pour supprimer un établissement
 */
export const useDeleteEstablishment = establishmentHooks.useDelete;

/**
 * Hook pour récupérer les établissements filtrés par zone
 * Utilise l'API avec le paramètre zone pour un filtrage côté serveur
 */
export const useEstablishmentsByZone = (zone: string | null) => {
  // Use API filtering when zone is provided, otherwise fetch all
  const queryParams = zone ? `zone=${zone}&limit=200` : 'limit=200';
  const result = establishmentHooks.useList(queryParams);

  return {
    data: result.data || [],
    isLoading: result.isLoading,
    error: result.error,
    totalCount: result.data?.length || 0,
  };
};
