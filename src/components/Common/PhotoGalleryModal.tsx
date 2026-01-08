import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import LazyImage from './LazyImage';
import { useGalleryGestures } from '../../hooks/useGalleryGestures';

interface PhotoGalleryModalProps {
  photos: string[];
  initialIndex?: number;
  employeeName: string;
  onClose?: () => void; // Optional - injected by openModal
}

const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({
  photos,
  initialIndex = 0,
  employeeName,
  onClose = () => {}
}) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Touch gestures for mobile (swipe + pinch-to-zoom)
  const { handlers, imageStyle, isZoomed, resetZoom } = useGalleryGestures({
    onNext: goToNext,
    onPrevious: goToPrevious,
  });

  // Reset zoom when changing photo
  useEffect(() => {
    resetZoom();
  }, [currentIndex, resetZoom]);

  useEffect(() => {
    // Lock body scroll
    document.body.classList.add('modal-open');

    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, goToNext, goToPrevious]);

  if (photos.length === 0) return null;

  return (
    <div className="photo-gallery-simple-overlay-nightlife" onClick={onClose} role="button" tabIndex={0}>
      <div className="photo-gallery-simple-container-nightlife" role="button" tabIndex={0} onClick={(e) => e.stopPropagation()}>

        {/* Header minimal */}
        <div className="photo-gallery-simple-header-nightlife">
          <span className="photo-gallery-simple-counter-nightlife">
            {currentIndex + 1} / {photos.length}
          </span>
          <button
            onClick={onClose}
            className="photo-gallery-simple-close-nightlife"
            aria-label={t('photoGalleryModal.ariaClose')}
          >
            ✕
          </button>
        </div>

        {/* Image centrée avec gestes tactiles */}
        <div
          className="photo-gallery-simple-content-nightlife"
          {...handlers}
          data-zoomed={isZoomed}
        >
          <div style={imageStyle} className="photo-gallery-simple-image-wrapper">
            <LazyImage
              src={photos[currentIndex]}
              alt={t('photoGalleryModal.altTextPhoto', { employeeName, currentIndex: currentIndex + 1, totalPhotos: photos.length })}
              cloudinaryPreset="galleryLarge"
              className="photo-gallery-simple-image-nightlife"
              objectFit="contain"
              showLoadingSpinner={true}
            />
          </div>
        </div>

        {/* Navigation arrows (seulement si plusieurs photos et non zoomé) */}
        {photos.length > 1 && !isZoomed && (
          <>
            <button
              onClick={goToPrevious}
              className="photo-gallery-simple-arrow-nightlife photo-gallery-simple-arrow-left-nightlife"
              aria-label={t('photoGalleryModal.ariaPrevious')}
            >
              ‹
            </button>
            <button
              onClick={goToNext}
              className="photo-gallery-simple-arrow-nightlife photo-gallery-simple-arrow-right-nightlife"
              aria-label={t('photoGalleryModal.ariaNext')}
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PhotoGalleryModal;
