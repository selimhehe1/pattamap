import React from 'react';

export interface StreetIntersectionProps {
  type: 'horizontal' | 'vertical';
  label: string;
  position: { x: number; y: number };
  size: 'major' | 'minor';
  direction?: 'left' | 'right' | 'up' | 'down';
  isMobile?: boolean;
}

const StreetIntersection: React.FC<StreetIntersectionProps> = ({
  type,
  label,
  position,
  size,
  direction,
  isMobile = false
}) => {
  const isHorizontal = type === 'horizontal';
  const isMajor = size === 'major';

  // Street line dimensions - Fixed lengths for realistic but limited street display
  // Minor streets have moderate width for visibility without overwhelming the map
  const lineWidth = isHorizontal ? '60%' : (isMajor ? '8px' : isMobile ? '30px' : '50px');
  const lineHeight = isHorizontal ? (isMajor ? '8px' : isMobile ? '30px' : '40px') : '40%';

  // Arrow symbol based on direction
  const getArrow = () => {
    switch (direction) {
      case 'left': return '←';
      case 'right': return '→';
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '';
    }
  };

  // Label positioning based on type and direction
  const getLabelStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      color: '#FFD700',
      fontSize: isMobile ? '10px' : '12px',
      fontWeight: 'bold',
      whiteSpace: 'nowrap',
      textShadow: '0 0 8px rgba(255,215,0,0.6), 1px 1px 2px rgba(0,0,0,0.8)',
      background: 'rgba(0,0,0,0.6)',
      padding: isMobile ? '2px 6px' : '3px 8px',
      borderRadius: '8px',
      border: '1px solid rgba(255,215,0,0.3)',
      zIndex: 8
    };

    if (isHorizontal) {
      return {
        ...baseStyle,
        top: '-25px',
        left: '50%',
        transform: 'translateX(-50%)'
      };
    } else {
      // Vertical street labels
      if (direction === 'up') {
        // Position label at the TOP of vertical streets going up
        return {
          ...baseStyle,
          top: '-30px',
          left: '50%',
          transform: 'translateX(-50%)'
        };
      } else if (direction === 'left') {
        return {
          ...baseStyle,
          top: '50%',
          right: '15px',
          transform: 'translateY(-50%)'
        };
      } else {
        return {
          ...baseStyle,
          top: '50%',
          left: '15px',
          transform: 'translateY(-50%)'
        };
      }
    }
  };

  // For vertical streets going UP, we need to position them so they cross through Walking Street
  const getVerticalStyles = () => {
    if (type === 'vertical' && direction === 'up') {
      // SIMPLE SOLUTION: Sois go from top to bottom (95% height for slight reduction)
      // This guarantees they cross through Walking Street (centered at 50%)
      // Slightly reduced to 95% for visual balance
      return {
        position: 'absolute' as const,
        left: `${position.x}%`,
        top: '0%', // Start from very top of map
        width: lineWidth,
        height: '95%', // Slightly reduced - still crosses Walking Street perfectly
        transform: 'translateX(-50%)',
        zIndex: 7, // Above Walking Street (z-index: 5)
        pointerEvents: 'none' as const
      };
    }
    return {
      position: 'absolute' as const,
      left: `${position.x}%`,
      top: `${position.y}%`,
      width: lineWidth,
      height: lineHeight,
      transform: isHorizontal ? 'translateY(-50%)' : 'translateX(-50%)',
      zIndex: 6,
      pointerEvents: 'none' as const
    };
  };

  return (
    <div style={getVerticalStyles()}>
      {/* Street line - Realistic asphalt style */}
      <div
        style={{
          width: lineWidth,
          height: lineHeight,
          background: isHorizontal
            ? 'linear-gradient(180deg, rgba(40,40,40,0.9) 0%, rgba(25,25,25,0.95) 20%, rgba(15,15,15,1) 50%, rgba(25,25,25,0.95) 80%, rgba(40,40,40,0.9) 100%)'
            : 'linear-gradient(90deg, rgba(40,40,40,0.9) 0%, rgba(25,25,25,0.95) 20%, rgba(15,15,15,1) 50%, rgba(25,25,25,0.95) 80%, rgba(40,40,40,0.9) 100%)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Asphalt texture overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: isHorizontal
              ? `
                  repeating-linear-gradient(
                    90deg,
                    rgba(35,35,35,0.8) 0px,
                    rgba(35,35,35,0.8) 4px,
                    rgba(45,45,45,0.6) 4px,
                    rgba(45,45,45,0.6) 8px,
                    rgba(25,25,25,0.9) 8px,
                    rgba(25,25,25,0.9) 12px
                  ),
                  repeating-linear-gradient(
                    30deg,
                    transparent 0px,
                    transparent 10px,
                    rgba(0,0,0,0.1) 10px,
                    rgba(0,0,0,0.1) 15px
                  )
                `
              : `
                  repeating-linear-gradient(
                    0deg,
                    rgba(35,35,35,0.8) 0px,
                    rgba(35,35,35,0.8) 3px,
                    rgba(45,45,45,0.6) 3px,
                    rgba(45,45,45,0.6) 6px,
                    rgba(25,25,25,0.9) 6px,
                    rgba(25,25,25,0.9) 9px
                  ),
                  repeating-linear-gradient(
                    45deg,
                    transparent 0px,
                    transparent 8px,
                    rgba(0,0,0,0.1) 8px,
                    rgba(0,0,0,0.1) 12px
                  )
                `,
            opacity: 0.7
          }}
        />

        {/* Center line markings - Always visible now */}
        <div
          style={{
            position: 'absolute',
            top: isHorizontal ? '50%' : '0',
            left: isHorizontal ? '0' : '50%',
            width: isHorizontal ? '100%' : '3px',
            height: isHorizontal ? '3px' : '100%',
            transform: isHorizontal ? 'translateY(-50%)' : 'translateX(-50%)',
            background: isHorizontal
              ? 'repeating-linear-gradient(to right, #FFD700 0px, #FFD700 15px, transparent 15px, transparent 25px)'
              : 'repeating-linear-gradient(to bottom, #FFD700 0px, #FFD700 15px, transparent 15px, transparent 25px)',
            opacity: 0.6
          }}
        />

        {/* Road edges - Golden borders */}
        <div
          style={{
            position: 'absolute',
            ...(isHorizontal ? {
              top: '5px',
              left: 0,
              right: 0,
              height: '2px'
            } : {
              left: '5px',
              top: 0,
              bottom: 0,
              width: '2px'
            }),
            background: '#FFD700',
            opacity: 0.3
          }}
        />
        <div
          style={{
            position: 'absolute',
            ...(isHorizontal ? {
              bottom: '5px',
              left: 0,
              right: 0,
              height: '2px'
            } : {
              right: '5px',
              top: 0,
              bottom: 0,
              width: '2px'
            }),
            background: '#FFD700',
            opacity: 0.3
          }}
        />

        {/* Traffic animation particles - Only for vertical streets going up */}
        {type === 'vertical' && direction === 'up' && (
          <div
            className="traffic-particles-soi"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none'
            }}
          >
            {/* Particle 1 - Cyan */}
            <div
              style={{
                position: 'absolute',
                left: '25%',
                width: '3px',
                height: '3px',
                background: '#00E5FF',
                borderRadius: '50%',
                boxShadow: '0 0 6px #00E5FF',
                animation: 'trafficSoiUp1 6s linear infinite'
              }}
            />
            {/* Particle 2 - Pink */}
            <div
              style={{
                position: 'absolute',
                right: '25%',
                width: '2px',
                height: '2px',
                background: '#C19A6B',
                borderRadius: '50%',
                boxShadow: '0 0 4px #C19A6B',
                animation: 'trafficSoiUp2 8s linear infinite'
              }}
            />
            {/* Particle 3 - Gold */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '2px',
                height: '2px',
                background: '#FFD700',
                borderRadius: '50%',
                boxShadow: '0 0 4px #FFD700',
                animation: 'trafficSoiUp3 5s linear infinite'
              }}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes trafficSoiUp1 {
          0% { bottom: -10px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { bottom: calc(100% + 10px); opacity: 0; }
        }

        @keyframes trafficSoiUp2 {
          0% { bottom: -10px; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { bottom: calc(100% + 10px); opacity: 0; }
        }

        @keyframes trafficSoiUp3 {
          0% { bottom: -10px; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { bottom: calc(100% + 10px); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .traffic-particles-soi > div {
            animation: none !important;
          }
        }
      `}</style>

      {/* Street label */}
      <div style={getLabelStyle()}>
        {direction && `${getArrow()} `}
        {label}
        {direction && ` ${getArrow()}`}
      </div>
    </div>
  );
};

export default StreetIntersection;