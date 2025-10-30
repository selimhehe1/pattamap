/**
 * ⚡ useFreelances Hook - React Query
 *
 * Hook pour récupérer les positions indépendantes (freelances) affichées sur la carte
 *
 * Bénéfices:
 * - Cache 5 minutes
 * - Refetch automatique en arrière-plan
 * - Loading states automatiques
 */

import { useQuery } from '@tanstack/react-query';
import { logger } from '../utils/logger';

/**
 * Interface pour une position indépendante
 */
export interface IndependentPosition {
  id: string;
  employee_id: string;
  zone: string;
  visual_x: number;
  visual_y: number;
  grid_x?: number;
  grid_y?: number;
  employee_name?: string;
  employee_photos?: string[];
  employee_age?: number;
  employee_nationality?: string;
}

/**
 * Query keys centralisés
 */
export const freelanceKeys = {
  all: ['freelances'] as const,
  map: () => [...freelanceKeys.all, 'map'] as const,
};

/**
 * Hook pour récupérer les positions indépendantes pour la carte
 */
export const useFreelances = () => {
  return useQuery({
    queryKey: freelanceKeys.map(),
    queryFn: async (): Promise<IndependentPosition[]> => {
      logger.debug('👤 Fetching independent positions for map...');

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/independent-positions/map`);

      if (!response.ok) {
        throw new Error('Failed to fetch independent positions');
      }

      const data = await response.json();

      // API retourne { data: [...] }
      const positions = data.data || [];

      logger.debug(`✅ Fetched ${positions.length} independent positions`);

      return positions;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
