import React from 'react';
import { useWebPSupport } from '../../hooks/useWebPSupport';

interface PictureProps {
  src: string;
  alt: string;
  srcSet?: string;
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Picture component with automatic WebP support
 * Serves WebP format when supported, with fallback to original format
 * Supports responsive images via srcSet and sizes
 */
const Picture: React.FC<PictureProps> = ({
  src,
  alt,
  srcSet,
  sizes,
  className,
  style,
  loading = 'lazy',
  onLoad,
  onError,
}) => {
  const supportsWebP = useWebPSupport();

  // Generate WebP URL from original src (assumes Cloudinary or similar CDN)
  const getWebPUrl = (url: string): string => {
    // If URL contains Cloudinary, add format conversion
    if (url.includes('cloudinary.com')) {
      // Insert f_webp before /upload/ or at the end of transformation params
      return url.replace(/\/upload\//, '/upload/f_webp,q_auto/');
    }
    // For other URLs, try replacing extension
    return url.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  };

  // Generate WebP srcSet from original srcSet
  const getWebPSrcSet = (originalSrcSet: string | undefined): string | undefined => {
    if (!originalSrcSet) return undefined;

    return originalSrcSet
      .split(',')
      .map((src) => {
        const [url, descriptor] = src.trim().split(/\s+/);
        const webpUrl = getWebPUrl(url);
        return descriptor ? `${webpUrl} ${descriptor}` : webpUrl;
      })
      .join(', ');
  };

  const webpSrc = supportsWebP ? getWebPUrl(src) : src;
  const webpSrcSet = supportsWebP && srcSet ? getWebPSrcSet(srcSet) : srcSet;

  return (
    <picture>
      {/* WebP source (only if browser supports it) */}
      {supportsWebP && (
        <source
          type="image/webp"
          srcSet={webpSrcSet || webpSrc}
          sizes={sizes}
        />
      )}

      {/* Fallback image */}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        className={className}
        style={style}
        loading={loading}
        onLoad={onLoad}
        onError={onError}
      />
    </picture>
  );
};

export default Picture;
