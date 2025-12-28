import React, { forwardRef, ReactNode, ElementType } from 'react';
import { use3DTilt } from '../../hooks/use3DTilt';
import '../../styles/components/card-animations.css';

interface CardGlassProps {
  children: ReactNode;
  className?: string;
  variant?: 'dark' | 'light' | 'transparent';
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  borderGlow?: boolean;
  glowColor?: 'fuchsia' | 'cyan' | 'gold' | 'blue';
  glowIntensity?: 'subtle' | 'normal' | 'intense';
  tiltEffect?: boolean;
  tiltOptions?: {
    maxTilt?: number;
    scale?: number;
  };
  hoverScale?: boolean;
  onClick?: () => void;
  as?: ElementType;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

const blurValues = {
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
};

const glowColors = {
  fuchsia: 'rgba(232, 121, 249, VAR)',
  cyan: 'rgba(0, 229, 255, VAR)',
  gold: 'rgba(255, 215, 0, VAR)',
  blue: 'rgba(59, 130, 246, VAR)',
};

const glowIntensities = {
  subtle: { border: 0.3, shadow: 0.2 },
  normal: { border: 0.5, shadow: 0.3 },
  intense: { border: 0.7, shadow: 0.5 },
};

/**
 * Premium glassmorphism card component
 * Supports 3D tilt effect, neon glow, and smooth animations
 */
export const CardGlass = forwardRef<HTMLDivElement, CardGlassProps>(
  (
    {
      children,
      className = '',
      variant = 'dark',
      blur = 'md',
      borderGlow = true,
      glowColor = 'fuchsia',
      glowIntensity = 'normal',
      tiltEffect = true,
      tiltOptions = {},
      hoverScale = true,
      onClick,
      as: Component = 'div',
      style,
      'data-testid': testId,
    },
    forwardedRef
  ) => {
    // Use 3D tilt hook if enabled
    const tiltRef = use3DTilt<HTMLDivElement>({
      maxTilt: tiltOptions.maxTilt ?? 10,
      scale: tiltOptions.scale ?? (hoverScale ? 1.02 : 1),
      glowColor: glowColors[glowColor].replace('VAR', '0.4'),
      disabled: !tiltEffect,
    });

    // Combine refs
    const ref = forwardedRef || tiltRef;

    // Build background based on variant
    const backgrounds = {
      dark: 'rgba(13, 13, 15, 0.85)',
      light: 'rgba(255, 255, 255, 0.85)',
      transparent: 'rgba(13, 13, 15, 0.5)',
    };

    // Build glow styles
    const intensity = glowIntensities[glowIntensity];
    const colorBase = glowColors[glowColor];
    const borderColor = colorBase.replace('VAR', String(intensity.border));
    const shadowColor = colorBase.replace('VAR', String(intensity.shadow));

    const glassStyle: React.CSSProperties = {
      background: backgrounds[variant],
      backdropFilter: `blur(${blurValues[blur]})`,
      WebkitBackdropFilter: `blur(${blurValues[blur]})`,
      border: borderGlow ? `1px solid ${borderColor}` : '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: borderGlow
        ? `0 0 20px ${shadowColor}, 0 4px 30px rgba(0, 0, 0, 0.3)`
        : '0 4px 30px rgba(0, 0, 0, 0.3)',
      borderRadius: '16px',
      ...style,
    };

    const combinedClassName = [
      'card-glass',
      tiltEffect && 'card-3d-tilt',
      borderGlow && glowIntensity === 'intense' && 'neon-pulse',
      onClick && 'cursor-pointer',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={tiltEffect ? tiltRef : (forwardedRef as React.Ref<HTMLDivElement>)}
        className={combinedClassName}
        style={glassStyle}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        data-testid={testId}
      >
        {children}
      </div>
    );
  }
);

CardGlass.displayName = 'CardGlass';

export default CardGlass;
