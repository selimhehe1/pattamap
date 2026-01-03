import React, { CSSProperties, useMemo } from 'react';
import LazyImage from './LazyImage';

/**
 * UserAvatar - Reusable avatar component with colored initials fallback
 *
 * Features:
 * - Displays Cloudinary avatar if available
 * - Falls back to colored initials based on pseudonym
 * - Circular design with optional border
 * - Multiple size presets (xs, sm, md, lg, xl)
 * - Click handler support for edit functionality
 */

export interface UserAvatarProps {
  /** User object with pseudonym and optional avatar_url */
  user: {
    pseudonym: string;
    avatar_url?: string | null;
  };
  /** Size preset */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Additional CSS class */
  className?: string;
  /** Show colored border */
  showBorder?: boolean;
  /** Click handler (makes avatar interactive) */
  onClick?: () => void;
  /** Inline styles */
  style?: CSSProperties;
}

const SIZES: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 128
};

// Neo-Nightlife 2025 color palette for avatars
const AVATAR_COLORS = [
  '#E879F9', // Fuchsia
  '#00E5FF', // Cyan
  '#C19A6B', // Gold
  '#4CAF50', // Green
  '#FF6B6B', // Coral
  '#9C27B0', // Purple
  '#FF9800', // Orange
  '#2196F3', // Blue
  '#E91E63', // Pink
  '#00BCD4'  // Teal
];

/**
 * Generate consistent color from pseudonym using simple hash
 */
const getAvatarColor = (pseudonym: string): string => {
  let hash = 0;
  for (let i = 0; i < pseudonym.length; i++) {
    hash = pseudonym.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

/**
 * Extract initials from pseudonym (max 2 characters)
 */
const getInitials = (pseudonym: string): string => {
  return pseudonym
    .split(/[\s_-]/)
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('') || '?';
};

const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  showBorder = true,
  onClick,
  style
}) => {
  const pixelSize = SIZES[size];

  const { initials, bgColor } = useMemo(() => ({
    initials: getInitials(user.pseudonym),
    bgColor: getAvatarColor(user.pseudonym)
  }), [user.pseudonym]);

  const containerStyle: CSSProperties = {
    width: pixelSize,
    height: pixelSize,
    minWidth: pixelSize,
    minHeight: pixelSize,
    borderRadius: '50%',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    cursor: onClick ? 'pointer' : 'default',
    border: showBorder ? `2px solid ${bgColor}` : 'none',
    boxShadow: showBorder ? `0 0 10px ${bgColor}40` : 'none',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    ...style
  };

  const initialsStyle: CSSProperties = {
    background: `linear-gradient(135deg, ${bgColor}, ${bgColor}cc)`,
    color: '#ffffff',
    fontSize: pixelSize * 0.4,
    fontWeight: 'bold',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    letterSpacing: '0.5px'
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`user-avatar ${className}`}
      style={containerStyle}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Avatar de ${user.pseudonym}` : undefined}
    >
      {user.avatar_url ? (
        <LazyImage
          src={user.avatar_url}
          alt={`Avatar de ${user.pseudonym}`}
          cloudinaryPreset="thumbnail"
          objectFit="cover"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        <div style={initialsStyle}>
          {initials}
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
