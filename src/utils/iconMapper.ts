/**
 * Icon Mapper Utility
 *
 * Maps text-based icon identifiers to emoji characters.
 * Used for converting database icon strings to visual emojis.
 */

/**
 * Converts a text icon identifier to its corresponding emoji
 *
 * @param iconText - Text identifier from database (e.g., 'beer', 'dancer', 'spa')
 * @returns Emoji character or fallback icon
 *
 * @example
 * getCategoryIcon('beer') // returns '🍺'
 * getCategoryIcon('dancer') // returns '💃'
 * getCategoryIcon('unknown') // returns '🏢'
 */
export const getCategoryIcon = (iconText: string): string => {
  const iconMap: Record<string, string> = {
    // Establishment categories
    'beer': '🍺',
    'dancer': '💃',
    'spa': '💆',
    'music': '🎵',

    // Consumable categories
    'shot': '🥃',
    'cocktail': '🍹',
    'spirit': '🥂',
    'wine': '🍷',
    'soft': '🥤',
  };

  return iconMap[iconText.toLowerCase()] || '🏢';
};

/**
 * Checks if an icon text is valid (has a mapping)
 *
 * @param iconText - Text identifier to validate
 * @returns true if icon exists in mapping
 */
export const isValidIcon = (iconText: string): boolean => {
  const validIcons = ['beer', 'dancer', 'spa', 'music', 'shot', 'cocktail', 'spirit', 'wine', 'soft'];
  return validIcons.includes(iconText.toLowerCase());
};
