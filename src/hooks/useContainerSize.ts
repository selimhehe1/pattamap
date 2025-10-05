import { useState, useEffect, RefObject } from 'react';

interface ContainerSize {
  width: number;
  height: number;
}

/**
 * Hook qui surveille les changements de taille d'un conteneur avec ResizeObserver
 * et renvoie les dimensions actuelles avec debounce pour optimiser les performances
 */
export const useContainerSize = (
  containerRef: RefObject<HTMLDivElement | null>,
  debounceMs: number = 150
): ContainerSize => {
  const [size, setSize] = useState<ContainerSize>({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timeoutId: NodeJS.Timeout;

    // Observer pour détecter les changements de taille
    const resizeObserver = new ResizeObserver((entries) => {
      // Debounce pour éviter trop de recalculs
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          setSize({ width, height });
        }
      }, debounceMs);
    });

    // Démarrer l'observation
    resizeObserver.observe(container);

    // Initialiser avec les dimensions actuelles
    const rect = container.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [containerRef, debounceMs]);

  return size;
};
