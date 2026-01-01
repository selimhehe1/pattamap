/**
 * Icon Mapper Utility
 *
 * Maps text-based icon identifiers to Lucide React components.
 * Used for converting database icon strings to visual icons.
 */

import React from 'react';
import {
  Beer,
  Sparkles,
  Heart,
  Music,
  Mic,
  Building2,
  Wine,
  Martini,
  CupSoda,
} from 'lucide-react';

/**
 * Returns the Lucide icon component for a category
 *
 * @param iconText - Text identifier from database (e.g., 'beer', 'dancer', 'spa')
 * @param size - Icon size in pixels (default: 16)
 * @returns React component for the icon
 *
 * @example
 * getCategoryIcon('beer') // returns <Beer size={16} />
 * getCategoryIcon('dancer') // returns <Sparkles size={16} />
 * getCategoryIcon('unknown') // returns <Building2 size={16} />
 */
export const getCategoryIcon = (iconText: string, size = 16): React.ReactNode => {
  const key = iconText?.toLowerCase() || '';

  // Establishment categories
  const categoryIcons: Record<string, React.ReactNode> = {
    'beer': <Beer size={size} />,
    'bar': <Beer size={size} />,
    'dancer': <Sparkles size={size} />,
    'go-go': <Sparkles size={size} />,
    'gogo': <Sparkles size={size} />,
    'agogo': <Sparkles size={size} />,
    'spa': <Heart size={size} />,
    'massage': <Heart size={size} />,
    'music': <Music size={size} />,
    'club': <Music size={size} />,
    'karaoke': <Mic size={size} />,
  };

  // Consumable categories
  const consumableIcons: Record<string, React.ReactNode> = {
    'shot': <Wine size={size} />,
    'cocktail': <Martini size={size} />,
    'spirit': <Wine size={size} />,
    'wine': <Wine size={size} />,
    'soft': <CupSoda size={size} />,
  };

  return categoryIcons[key] || consumableIcons[key] || <Building2 size={size} />;
};

/**
 * Returns icon component for consumable categories specifically
 */
export const getConsumableIcon = (category: string, size = 16): React.ReactNode => {
  const key = category?.toLowerCase() || '';

  const icons: Record<string, React.ReactNode> = {
    'beer': <Beer size={size} />,
    'shot': <Wine size={size} />,
    'cocktail': <Martini size={size} />,
    'spirit': <Wine size={size} />,
    'wine': <Wine size={size} />,
    'soft': <CupSoda size={size} />,
  };

  return icons[key] || <Beer size={size} />;
};

/**
 * Checks if an icon text is valid (has a mapping)
 *
 * @param iconText - Text identifier to validate
 * @returns true if icon exists in mapping
 */
export const isValidIcon = (iconText: string): boolean => {
  const validIcons = [
    'beer', 'bar', 'dancer', 'go-go', 'gogo', 'agogo', 'spa', 'massage',
    'music', 'club', 'karaoke', 'shot', 'cocktail', 'spirit', 'wine', 'soft'
  ];
  return validIcons.includes(iconText?.toLowerCase() || '');
};
