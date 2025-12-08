/**
 * Admin Utilities
 * Common utility functions for Admin components
 */

/**
 * Debounce utility function for search optimization
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Format date for display
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format date (short version)
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatDateShort = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Get zone display name
 * @param zone - Zone code
 * @returns Human-readable zone name
 */
export const getZoneDisplayName = (zone?: string): string => {
  const zoneNames: Record<string, string> = {
    soi6: 'Soi 6',
    walkingstreet: 'Walking Street',
    beachroad: 'Beach Road',
    lkmetro: 'LK Metro',
    treetown: 'Tree Town',
    soibuakhao: 'Soi Buakhao',
    jomtiencomplex: 'Jomtien Complex',
    boyztown: 'BoyzTown',
    soi78: 'Soi 7 & 8'
  };
  return zone ? zoneNames[zone] || zone : 'N/A';
};

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
