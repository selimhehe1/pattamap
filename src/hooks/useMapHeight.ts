import { useState, useEffect } from 'react';

/**
 * Hook to calculate dynamic map height for responsive mobile displays
 * Returns the current screen height and whether the device is mobile
 */
export const useMapHeight = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [screenHeight, setScreenHeight] = useState(window.innerHeight);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    const updateHeight = () => setScreenHeight(window.innerHeight);

    checkMobile();
    updateHeight();

    window.addEventListener('resize', checkMobile);
    window.addEventListener('resize', updateHeight);

    // Handle orientation change on mobile devices
    window.addEventListener('orientationchange', updateHeight);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, []);

  return { isMobile, screenHeight };
};
