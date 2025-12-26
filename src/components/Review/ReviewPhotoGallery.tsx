import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ZoomIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LazyImage from '../Common/LazyImage';
import './ReviewPhotoGallery.css';

/**
 * ReviewPhotoGallery - Display photos attached to reviews with lightbox
 *
 * Features:
 * - Responsive grid layout (1-3 photos)
 * - Click to open lightbox modal
 * - Keyboard navigation in lightbox
 * - Lazy loading images
 *
 * @example
 * <ReviewPhotoGallery
 *   photos={[
 *     { id: '1', photo_url: 'https://...', display_order: 0 },
 *     { id: '2', photo_url: 'https://...', display_order: 1 }
 *   ]}
 * />
 */

export interface ReviewPhoto {
  id: string;
  photo_url: string;
  cloudinary_public_id?: string;
  display_order: number;
}

interface ReviewPhotoGalleryProps {
  photos: ReviewPhoto[];
  className?: string;
}

const ReviewPhotoGallery: React.FC<ReviewPhotoGalleryProps> = ({
  photos,
  className = ''
}) => {
  const { t } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Sort photos by display_order - memoized to avoid recalculation
  const sortedPhotos = useMemo(() => {
    if (!photos || photos.length === 0) return [];
    return [...photos].sort((a, b) => a.display_order - b.display_order);
  }, [photos]);

  const photosCount = sortedPhotos.length;

  const openLightbox = useCallback((index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  }, []);

  const goToPrevious = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photosCount - 1));
  }, [photosCount]);

  const goToNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev < photosCount - 1 ? prev + 1 : 0));
  }, [photosCount]);

  // Handle keyboard navigation - MUST be called before any early returns
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, closeLightbox, goToPrevious, goToNext]);

  // Early return AFTER all hooks
  if (photosCount === 0) {
    return null;
  }

  // Determine grid class based on number of photos
  const getGridClass = () => {
    switch (sortedPhotos.length) {
      case 1:
        return 'review-photos-grid-1';
      case 2:
        return 'review-photos-grid-2';
      case 3:
      default:
        return 'review-photos-grid-3';
    }
  };

  return (
    <>
      {/* Photo Grid */}
      <div className={`review-photos-gallery ${getGridClass()} ${className}`}>
        {sortedPhotos.map((photo, index) => (
          <div
            key={photo.id}
            className="review-photo-item"
            onClick={() => openLightbox(index)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && openLightbox(index)}
            aria-label={t('reviews.photos.openPhoto', { index: index + 1 })}
          >
            <LazyImage
              src={photo.photo_url}
              alt={t('reviews.photos.photoAlt', { index: index + 1 })}
              className="review-photo-image"
              cloudinaryPreset="galleryThumb"
              objectFit="cover"
            />
            <div className="review-photo-overlay">
              <span className="review-photo-zoom-icon"><ZoomIn size={20} /></span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="review-lightbox-overlay"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={t('reviews.photos.lightboxTitle')}
        >
          {/* Close Button */}
          <button
            className="review-lightbox-close"
            onClick={closeLightbox}
            aria-label={t('reviews.photos.close')}
          >
            ✕
          </button>

          {/* Navigation Arrows */}
          {sortedPhotos.length > 1 && (
            <>
              <button
                className="review-lightbox-nav review-lightbox-prev"
                onClick={goToPrevious}
                aria-label={t('reviews.photos.previous')}
              >
                ‹
              </button>
              <button
                className="review-lightbox-nav review-lightbox-next"
                onClick={goToNext}
                aria-label={t('reviews.photos.next')}
              >
                ›
              </button>
            </>
          )}

          {/* Image Container */}
          <div
            className="review-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={sortedPhotos[currentIndex].photo_url}
              alt={t('reviews.photos.photoAlt', { index: currentIndex + 1 })}
              className="review-lightbox-image"
            />

            {/* Photo Counter */}
            {sortedPhotos.length > 1 && (
              <div className="review-lightbox-counter">
                {currentIndex + 1} / {sortedPhotos.length}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {sortedPhotos.length > 1 && (
            <div className="review-lightbox-thumbnails">
              {sortedPhotos.map((photo, index) => (
                <button
                  key={photo.id}
                  className={`review-lightbox-thumb ${index === currentIndex ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  aria-label={t('reviews.photos.goToPhoto', { index: index + 1 })}
                >
                  <img
                    src={photo.photo_url}
                    alt=""
                    className="review-lightbox-thumb-image"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ReviewPhotoGallery;
