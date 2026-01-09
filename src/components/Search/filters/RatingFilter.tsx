/**
 * RatingFilter - Star rating minimum filter
 *
 * Extracted from SearchFilters.tsx for better maintainability.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';

interface RatingFilterProps {
  minRating: string;
  onRatingChange: (rating: string) => void;
  disabled?: boolean;
}

const RatingFilter: React.FC<RatingFilterProps> = ({
  minRating,
  onRatingChange,
  disabled = false
}) => {
  const { t } = useTranslation();
  const currentRating = minRating ? Number(minRating) : 0;

  return (
    <div className="filter-section">
      <label className="label-nightlife filter-label-with-icon">
        <Star size={20} /> {t('search.minRating', 'Minimum Rating')}
      </label>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginTop: '8px'
      }}>
        <div style={{
          display: 'flex',
          gap: '4px'
        }}>
          {[1, 2, 3, 4, 5].map(star => {
            const isActive = star <= currentRating;

            return (
              <button
                key={star}
                type="button"
                onClick={() => {
                  // Toggle: if clicking on current rating, clear it
                  if (currentRating === star) {
                    onRatingChange('');
                  } else {
                    onRatingChange(String(star));
                  }
                }}
                disabled={disabled}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  padding: '4px',
                  transition: 'transform 0.2s ease'
                }}
                title={`${star} ${t('search.starsOrMore', 'stars or more')}`}
              >
                <Star
                  size={24}
                  fill={isActive ? '#FFD700' : 'transparent'}
                  color={isActive ? '#FFD700' : 'rgba(255, 255, 255, 0.3)'}
                  style={{
                    filter: isActive ? 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.5))' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                />
              </button>
            );
          })}
        </div>
        {minRating && (
          <span style={{
            fontSize: '13px',
            color: '#FFD700',
            fontWeight: '600'
          }}>
            {minRating}+ {t('search.stars', 'stars')}
          </span>
        )}
      </div>
    </div>
  );
};

export default RatingFilter;
