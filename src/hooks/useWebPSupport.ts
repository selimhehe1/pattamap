import { useState, useEffect } from 'react';

/**
 * Hook to detect WebP support in the browser
 * Uses a cached result to avoid repeated checks
 * @returns boolean indicating WebP support
 */
export const useWebPSupport = (): boolean => {
  const [supportsWebP, setSupportsWebP] = useState<boolean>(() => {
    // Check if we have a cached result in sessionStorage
    const cached = sessionStorage.getItem('webp-support');
    if (cached !== null) {
      return cached === 'true';
    }
    // Default to false while checking
    return false;
  });

  useEffect(() => {
    // Skip check if already cached
    const cached = sessionStorage.getItem('webp-support');
    if (cached !== null) {
      return;
    }

    // Detect WebP support using a lossy WebP image
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      const supported = webP.height === 2;
      setSupportsWebP(supported);
      sessionStorage.setItem('webp-support', String(supported));
    };

    // Lossy WebP test image (2x2 pixels)
    webP.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoCAAIADsD+JaQAA3AAAAAA';
  }, []);

  return supportsWebP;
};
