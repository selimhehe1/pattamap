import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface StarRatingProps {
  rating?: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'small' | 'medium' | 'large';
  showValue?: boolean;
  className?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating = 0,
  onChange,
  readonly = false,
  size = 'medium',
  showValue = false,
  className = ''
}) => {
  const { t } = useTranslation();
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [currentRating, setCurrentRating] = useState<number>(rating);

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { fontSize: '14px', gap: '2px' };
      case 'large':
        return { fontSize: '24px', gap: '8px' };
      default:
        return { fontSize: '18px', gap: '4px' };
    }
  };

  const sizeConfig = getSizeConfig();

  const handleStarClick = (starValue: number) => {
    if (readonly) return;
    
    setCurrentRating(starValue);
    if (onChange) {
      onChange(starValue);
    }
  };

  const handleStarHover = (starValue: number) => {
    if (readonly) return;
    setHoverRating(starValue);
  };

  const handleStarLeave = () => {
    if (readonly) return;
    setHoverRating(0);
  };

  const getStarColor = (starIndex: number) => {
    const activeRating = hoverRating || currentRating;
    
    if (starIndex <= activeRating) {
      return '#FFD700'; // Gold for filled stars
    }
    return readonly ? '#555555' : '#333333'; // Gray for empty stars
  };

  const getStarOpacity = (starIndex: number) => {
    const activeRating = hoverRating || currentRating;
    return starIndex <= activeRating ? 1 : 0.3;
  };

  const activeRating = hoverRating || currentRating;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: sizeConfig.gap,
        cursor: readonly ? 'default' : 'pointer'
      }}
      role="group"
      aria-label={t('starRating.ariaGroupLabel', 'Star rating')}
    >
      {/* Screen reader announcement for rating changes */}
      <span
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0
        }}
      >
        {activeRating > 0 && t('starRating.ariaCurrentRating', { rating: activeRating, max: 5 })}
      </span>

      {[1, 2, 3, 4, 5].map((starValue) => (
        <span
          key={starValue}
          onClick={() => handleStarClick(starValue)}
          onMouseEnter={() => handleStarHover(starValue)}
          onMouseLeave={handleStarLeave}
          style={{
            fontSize: sizeConfig.fontSize,
            color: getStarColor(starValue),
            opacity: getStarOpacity(starValue),
            transition: 'all 0.2s ease',
            transform: hoverRating === starValue && !readonly ? 'scale(1.2)' : 'scale(1)',
            textShadow: starValue <= (hoverRating || currentRating) ? '0 0 10px rgba(255, 215, 0, 0.8)' : 'none',
            cursor: readonly ? 'default' : 'pointer',
            userSelect: 'none'
          }}
          role={readonly ? 'img' : 'button'}
          aria-label={t(starValue === 1 ? 'starRating.ariaStarsSingular' : 'starRating.ariaStarsPlural', { count: starValue })}
          tabIndex={readonly ? -1 : 0}
          onKeyDown={(e) => {
            if (!readonly && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              handleStarClick(starValue);
            }
          }}
        >
          ⭐
        </span>
      ))}
      
      {showValue && (
        <span style={{
          marginLeft: '8px',
          fontSize: size === 'small' ? '12px' : '14px',
          color: '#FFD700',
          fontWeight: 'bold'
        }}>
          {(hoverRating || currentRating).toFixed(1)}
        </span>
      )}
    </div>
  );
};

export default StarRating;