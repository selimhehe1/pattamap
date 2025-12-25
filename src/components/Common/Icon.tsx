/**
 * Icon Component - Unified Lucide Icon Wrapper
 *
 * Provides consistent icon sizing across the app using design system variables.
 * Replaces scattered emoji and inconsistent icon usage.
 *
 * @example
 * <Icon name="Star" size="md" className="text-gold" />
 * <Icon name="MapPin" size="sm" />
 */

import { LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// Standard icon sizes matching design system --icon-* variables
const sizeMap = {
  xs: 14,  // --icon-xs: 14px
  sm: 16,  // --icon-sm: 16px
  md: 20,  // --icon-md: 20px (default)
  lg: 24,  // --icon-lg: 24px
  xl: 32,  // --icon-xl: 32px
} as const;

export type IconSize = keyof typeof sizeMap;

export interface IconProps {
  /** Lucide icon name (e.g., "Star", "MapPin", "Search") */
  name: keyof typeof LucideIcons;
  /** Size preset: xs (14px), sm (16px), md (20px), lg (24px), xl (32px) */
  size?: IconSize;
  /** Additional CSS classes */
  className?: string;
  /** Accessibility label */
  'aria-label'?: string;
  /** Whether icon is decorative (hidden from screen readers) */
  'aria-hidden'?: boolean;
}

/**
 * Unified Icon component using Lucide icons
 *
 * Usage:
 * ```tsx
 * import { Icon } from '@/components/Common/Icon';
 *
 * <Icon name="Star" size="md" />
 * <Icon name="Search" size="lg" className="text-primary" />
 * ```
 */
export const Icon = ({
  name,
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden = true,
}: IconProps) => {
  const LucideIcon = LucideIcons[name] as LucideIcon;

  if (!LucideIcon) {
    console.warn(`[Icon] Unknown icon name: ${name}`);
    return null;
  }

  return (
    <LucideIcon
      size={sizeMap[size]}
      className={className}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    />
  );
};

/**
 * Zone Icons - Mapping for zone emojis to Lucide icons
 * Used in zone selectors, maps, and navigation
 */
export const ZoneIcons = {
  'soi6': 'Beer',
  'walkingstreet': 'Building2',
  'lkmetro': 'Building',
  'treetown': 'TreePine',
  'soibuakhao': 'Landmark',
  'beachroad': 'Waves',
  'boyztown': 'Star',
  'jomtiencomplex': 'Palmtree',
  'soi78': 'MapPin',
} as const;

/**
 * Category Icons - Mapping for notification/category emojis
 */
export const CategoryIcons = {
  // Navigation
  home: 'Home',
  search: 'Search',
  map: 'Map',
  list: 'List',
  users: 'Users',

  // Status
  success: 'Check',
  error: 'X',
  warning: 'AlertTriangle',
  info: 'Info',

  // Actions
  settings: 'Settings',
  notification: 'Bell',
  refresh: 'RefreshCw',
  close: 'X',

  // Content
  star: 'Star',
  trophy: 'Trophy',
  camera: 'Camera',
  message: 'MessageCircle',

  // User
  user: 'User',
  profile: 'UserCircle',
  logout: 'LogOut',
} as const;

export default Icon;
