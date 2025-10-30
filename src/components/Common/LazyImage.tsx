import React, { useState, useEffect, CSSProperties, useMemo } from 'react';
import { logger } from '../../utils/logger';
import { getOptimizedImageUrl, getAutoSrcSet, CloudinaryTransformOptions, isCloudinaryUrl } from '../../utils/cloudinary';

/**
 * LazyImage - Optimized Image Component with Cloudinary Support
 *
 * Performance features:
 * - Native browser lazy loading (`loading="lazy"`)
 * - Automatic Cloudinary optimization (WebP, auto quality, resizing)
 * - Responsive srcset generation for Cloudinary images
 * - Error handling with placeholder fallback
 * - Loading states for better UX
 * - Prevents layout shift with aspect ratio
 * - Accessibility compliant (alt text required)
 *
 * Usage:
 * <LazyImage
 *   src="https://res.cloudinary.com/.../photo.jpg"
 *   alt="Description for screen readers"
 *   cloudinaryPreset="employeePhoto"
 *   enableResponsive
 * />
 */

export type CloudinaryPreset =
  | 'thumbnail'
  | 'employeePhoto'
  | 'establishmentLogo'
  | 'galleryLarge'
  | 'galleryThumb'
  | 'cardPreview';

export interface LazyImageProps {
  /** Image source URL */
  src: string;

  /** Alt text for accessibility (required) */
  alt: string;

  /** Optional CSS class */
  className?: string;

  /** Optional inline styles */
  style?: CSSProperties;

  /** Placeholder image URL (default: generic avatar) */
  placeholderSrc?: string;

  /** Callback when image fails to load */
  onError?: (error: Error) => void;

  /** Callback when image successfully loads */
  onLoad?: () => void;

  /** Object-fit CSS property (default: 'cover') */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

  /** Whether to show loading spinner (default: false) */
  showLoadingSpinner?: boolean;

  /** Cloudinary transformation options (only for Cloudinary URLs) */
  cloudinaryOptions?: CloudinaryTransformOptions;

  /** Use Cloudinary preset (shortcut for common use cases) */
  cloudinaryPreset?: CloudinaryPreset;

  /** Enable responsive srcset for Cloudinary images (default: false) */
  enableResponsive?: boolean;

  /** Type for auto srcset generation ('employee' | 'logo' | 'gallery') */
  responsiveType?: 'employee' | 'logo' | 'gallery';
}

const DEFAULT_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="26" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';

/**
 * Apply Cloudinary preset transformations
 */
const applyCloudinaryPreset = (url: string, preset: CloudinaryPreset, size?: number): string => {
  if (!isCloudinaryUrl(url)) return url;

  const presetMap: Record<CloudinaryPreset, CloudinaryTransformOptions> = {
    thumbnail: { width: size || 64, height: size || 64, crop: 'fill', gravity: 'auto', quality: 'auto:good', format: 'auto' },
    employeePhoto: { width: size || 800, crop: 'limit', quality: 'auto:good', format: 'auto' },
    establishmentLogo: { width: size || 64, height: size || 64, crop: 'fit', format: 'png', quality: 'auto:best' },
    galleryLarge: { width: 1920, crop: 'limit', quality: 'auto:best', format: 'auto' },
    galleryThumb: { width: 320, height: 320, crop: 'fill', gravity: 'auto', quality: 'auto:good', format: 'auto' },
    cardPreview: { width: 400, height: 400, crop: 'fill', gravity: 'auto', quality: 'auto:good', format: 'auto' },
  };

  return getOptimizedImageUrl(url, presetMap[preset]);
};

/**
 * Lazy-loaded image component with error handling, loading states, and Cloudinary optimization
 */
const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  style,
  placeholderSrc = DEFAULT_PLACEHOLDER,
  onError,
  onLoad,
  objectFit = 'cover',
  showLoadingSpinner = false,
  cloudinaryOptions,
  cloudinaryPreset,
  enableResponsive = false,
  responsiveType = 'employee'
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Compute optimized image URLs with Cloudinary transformations
   * Memoized to avoid recomputing on every render
   */
  const imageUrls = useMemo(() => {
    // Validate src is not empty/null/undefined - prevents infinite reload from <img src="">
    if (!src || typeof src !== 'string' || !src.trim()) {
      return { src: placeholderSrc, srcSet: undefined, sizes: undefined };
    }

    // If not a Cloudinary URL, use as-is
    if (!isCloudinaryUrl(src)) {
      return { src, srcSet: undefined, sizes: undefined };
    }

    // Apply preset if provided
    if (cloudinaryPreset) {
      const optimizedSrc = applyCloudinaryPreset(src, cloudinaryPreset);
      return { src: optimizedSrc, srcSet: undefined, sizes: undefined };
    }

    // Apply custom options if provided
    if (cloudinaryOptions) {
      const optimizedSrc = getOptimizedImageUrl(src, cloudinaryOptions);
      return { src: optimizedSrc, srcSet: undefined, sizes: undefined };
    }

    // Generate responsive srcset if enabled
    if (enableResponsive) {
      const { src: responsiveSrc, srcSet, sizes } = getAutoSrcSet(src, responsiveType);
      return { src: responsiveSrc, srcSet, sizes };
    }

    // Default: apply basic optimization (format auto, quality auto)
    const defaultOptimized = getOptimizedImageUrl(src, {
      format: 'auto',
      quality: 'auto:good'
    });

    return { src: defaultOptimized, srcSet: undefined, sizes: undefined };
  }, [src, placeholderSrc, cloudinaryPreset, cloudinaryOptions, enableResponsive, responsiveType]);

  const [currentSrc, setCurrentSrc] = useState(imageUrls.src);

  // Reset states when src changes
  useEffect(() => {
    setImageError(false);
    setIsLoading(true);
    setCurrentSrc(imageUrls.src);
  }, [imageUrls.src]);

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    logger.warn(`LazyImage: Failed to load image: ${src}`);
    setImageError(true);
    setIsLoading(false);
    setCurrentSrc(placeholderSrc);

    if (onError) {
      onError(new Error(`Failed to load image: ${src}`));
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    if (onLoad) {
      onLoad();
    }
    logger.debug(`LazyImage: Successfully loaded: ${src}`);
  };

  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    ...style
  };

  const imageStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit,
    transition: 'opacity 0.3s ease-in-out',
    opacity: isLoading ? 0.5 : 1
  };

  const spinnerStyle: CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.2)',
    borderTop: '4px solid #C19A6B',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    pointerEvents: 'none'
  };

  return (
    <div style={containerStyle} className={className}>
      <img
        src={currentSrc}
        alt={alt}
        loading="lazy"
        onError={handleError}
        onLoad={handleLoad}
        style={imageStyle}
        // Add srcSet and sizes for responsive images
        {...(imageUrls.srcSet && { srcSet: imageUrls.srcSet })}
        {...(imageUrls.sizes && { sizes: imageUrls.sizes })}
        // Accessibility: Indicate if image failed to load
        {...(imageError && { 'aria-label': `${alt} (image failed to load)` })}
      />

      {/* Loading spinner */}
      {showLoadingSpinner && isLoading && !imageError && (
        <div style={spinnerStyle} role="status" aria-label="Loading image">
          <style>{`
            @keyframes spin {
              0% { transform: translate(-50%, -50%) rotate(0deg); }
              100% { transform: translate(-50%, -50%) rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Error indicator (optional visual feedback) */}
      {imageError && (
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            background: 'rgba(244, 67, 54, 0.9)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            pointerEvents: 'none'
          }}
          aria-hidden="true"
        >
          ⚠️ Failed
        </div>
      )}
    </div>
  );
};

export default LazyImage;
