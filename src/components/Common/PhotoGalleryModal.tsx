import React, { useState, useEffect } from 'react';

interface PhotoGalleryModalProps {
  photos: string[];
  initialIndex?: number;
  employeeName: string;
  onClose: () => void;
}

const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({
  photos,
  initialIndex = 0,
  employeeName,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

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
  }, [onClose]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  if (photos.length === 0) return null;

  return (
    <div className="photo-gallery-simple-overlay-nightlife" onClick={onClose}>
      <div className="photo-gallery-simple-container-nightlife" onClick={(e) => e.stopPropagation()}>

        {/* Header minimal */}
        <div className="photo-gallery-simple-header-nightlife">
          <span className="photo-gallery-simple-counter-nightlife">
            {currentIndex + 1} / {photos.length}
          </span>
          <button
            onClick={onClose}
            className="photo-gallery-simple-close-nightlife"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Image centrée */}
        <div className="photo-gallery-simple-content-nightlife">
          <img
            src={photos[currentIndex]}
            alt={`${employeeName} - ${currentIndex + 1}`}
            className="photo-gallery-simple-image-nightlife"
          />
        </div>

        {/* Navigation arrows (seulement si plusieurs photos) */}
        {photos.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="photo-gallery-simple-arrow-nightlife photo-gallery-simple-arrow-left-nightlife"
              aria-label="Previous"
            >
              ‹
            </button>
            <button
              onClick={goToNext}
              className="photo-gallery-simple-arrow-nightlife photo-gallery-simple-arrow-right-nightlife"
              aria-label="Next"
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
