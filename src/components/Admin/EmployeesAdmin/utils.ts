/**
 * Utility functions for EmployeesAdmin components
 * Extracted from the original EmployeesAdmin.tsx for better modularity
 */

import type { EmployeeStatus } from './types';

/**
 * Social media platform URL generators
 */
const SOCIAL_MEDIA_URLS: Record<string, (username: string) => string> = {
  instagram: (username) => `https://instagram.com/${username}`,
  line: (username) => `https://line.me/R/ti/p/${username}`,
  telegram: (username) => `https://t.me/${username}`,
  whatsapp: (username) => `https://wa.me/${username}`,
  facebook: (username) => `https://facebook.com/${username}`,
};

/**
 * Get the URL for a social media platform
 */
export const getSocialMediaUrl = (platform: string, username: string): string => {
  const urlGenerator = SOCIAL_MEDIA_URLS[platform.toLowerCase()];
  return urlGenerator ? urlGenerator(username) : '#';
};

/**
 * Get the icon for a social media platform
 */
export const getSocialMediaIcon = (platform: string): string => {
  const icons: Record<string, string> = {
    instagram: 'fab fa-instagram',
    line: 'fab fa-line',
    telegram: 'fab fa-telegram',
    whatsapp: 'fab fa-whatsapp',
    facebook: 'fab fa-facebook',
  };
  return icons[platform.toLowerCase()] || 'fas fa-link';
};

/**
 * Format a date string for display
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a date string for short display (without time)
 */
export const formatDateShort = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Get the color for a status
 */
export const getStatusColor = (status: EmployeeStatus | string): string => {
  const colors: Record<string, string> = {
    pending: '#FFD700',
    approved: '#00FF7F',
    rejected: '#FF4757',
  };
  return colors[status] || '#cccccc';
};

/**
 * Get the icon for a status
 */
export const getStatusIcon = (status: EmployeeStatus | string): string => {
  const icons: Record<string, string> = {
    pending: '⏳',
    approved: '✅',
    rejected: '❌',
  };
  return icons[status] || '❓';
};

/**
 * Get CSS class for status badge
 */
export const getStatusBadgeClass = (status: EmployeeStatus | string): string => {
  const classes: Record<string, string> = {
    pending: 'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
  };
  return classes[status] || 'badge-default';
};

/**
 * Truncate text to a maximum length
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Get display name for an employee (nickname or name)
 */
export const getEmployeeDisplayName = (name: string, nickname?: string): string => {
  return nickname ? `${nickname} (${name})` : name;
};

/**
 * Format nationality array for display
 */
export const formatNationality = (nationality: string[] | null): string => {
  if (!nationality || nationality.length === 0) return 'Unknown';
  return nationality.join(' / ');
};

/**
 * Check if a field has changed between current and proposed values
 */
export const hasFieldChanged = (
  field: string,
  currentValues: Record<string, unknown>,
  proposedChanges: Record<string, unknown>
): boolean => {
  return JSON.stringify(currentValues[field]) !== JSON.stringify(proposedChanges[field]);
};

/**
 * Get list of changed fields between current and proposed values
 */
export const getChangedFields = (
  currentValues: Record<string, unknown>,
  proposedChanges: Record<string, unknown>
): string[] => {
  const allFields = new Set([
    ...Object.keys(currentValues),
    ...Object.keys(proposedChanges),
  ]);

  return Array.from(allFields).filter((field) =>
    hasFieldChanged(field, currentValues, proposedChanges)
  );
};

/**
 * API URL helper
 */
export const getApiUrl = (): string => {
  return process.env.REACT_APP_API_URL || 'http://localhost:8080';
};
