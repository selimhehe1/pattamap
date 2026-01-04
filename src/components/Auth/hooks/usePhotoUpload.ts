import { useState, useCallback } from 'react';
import { useSecureFetch } from '../../../hooks/useSecureFetch';
import { useCSRF } from '../../../contexts/CSRFContext';
import { logger } from '../../../utils/logger';

interface UsePhotoUploadOptions {
  photos: File[];
}

interface UsePhotoUploadReturn {
  uploadPhotos: (explicitCsrfToken?: string) => Promise<string[]>;
  isUploading: boolean;
}

/**
 * Custom hook for handling photo uploads with CSRF protection
 *
 * Supports two modes:
 * 1. With explicit CSRF token (during registration flow)
 * 2. With automatic token refresh (for other contexts)
 */
export function usePhotoUpload({ photos }: UsePhotoUploadOptions): UsePhotoUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const { secureFetch } = useSecureFetch();
  const { refreshToken } = useCSRF();

  const uploadPhotos = useCallback(async (explicitCsrfToken?: string): Promise<string[]> => {
    if (photos.length === 0) return [];

    setIsUploading(true);
    try {
      const formDataMultipart = new FormData();
      photos.forEach(photo => {
        formDataMultipart.append('images', photo);
      });

      // Use explicit CSRF token if provided (from registration)
      // Otherwise use secureFetch which will handle token refresh
      if (explicitCsrfToken) {
        logger.debug('🛡️ Using explicit CSRF token for photo upload');

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload/images`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'X-CSRF-Token': explicitCsrfToken
          },
          body: formDataMultipart
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload photos');
        }

        return data.images.map((img: { url: string }) => img.url);
      } else {
        // Fallback to secureFetch for other cases (not during registration)
        logger.debug('🛡️ Refreshing CSRF token before photo upload...');
        await refreshToken();
        await new Promise(resolve => setTimeout(resolve, 500));

        const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/upload/images`, {
          method: 'POST',
          body: formDataMultipart
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload photos');
        }

        return data.images.map((img: { url: string }) => img.url);
      }
    } catch (error) {
      logger.error('Photo upload error:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [photos, secureFetch, refreshToken]);

  return {
    uploadPhotos,
    isUploading
  };
}

export default usePhotoUpload;
