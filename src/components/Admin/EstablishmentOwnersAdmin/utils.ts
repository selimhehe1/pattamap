/**
 * Utility functions for EstablishmentOwnersAdmin
 *
 * Contains formatting, role helpers, and permission-related utilities.
 */

import React from 'react';
import {
  Crown,
  Key,
  CheckCircle,
  XCircle,
  FileEdit,
  DollarSign,
  Camera,
  Users,
  BarChart3
} from 'lucide-react';

/**
 * Format date string to localized display format
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
 * Get color based on owner role
 */
export const getRoleColor = (role: string): string => {
  return role === 'owner' ? '#FFD700' : '#00E5FF';
};

/**
 * Get icon component based on owner role
 */
export const getRoleIcon = (role: string, size = 12): React.ReactNode => {
  const iconProps = { size, style: { verticalAlign: 'middle' as const } };
  return role === 'owner'
    ? React.createElement(Crown, iconProps)
    : React.createElement(Key, iconProps);
};

/**
 * Get permission status icon
 */
export const getPermissionIcon = (hasPermission: boolean, size = 12): React.ReactNode => {
  const iconProps = { size, style: { verticalAlign: 'middle' as const } };
  return hasPermission
    ? React.createElement(CheckCircle, iconProps)
    : React.createElement(XCircle, iconProps);
};

/**
 * Permission descriptions for tooltips
 */
export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  can_edit_info: 'Name, address, description, opening hours, social media links',
  can_edit_pricing: 'Ladydrink, barfine, room prices (sensitive data)',
  can_edit_photos: 'Upload and manage logo & venue photos via Cloudinary',
  can_edit_employees: 'Employee roster management (requires extra admin vetting)',
  can_view_analytics: 'View performance metrics and statistics (read-only access)'
};

/**
 * Get permission label with icon
 */
export const getPermissionLabel = (key: string): React.ReactNode => {
  const iconStyle = { marginRight: '4px', verticalAlign: 'middle' as const };
  const iconSize = 12;

  const labels: Record<string, React.ReactNode> = {
    can_edit_info: React.createElement(React.Fragment, null,
      React.createElement(FileEdit, { size: iconSize, style: iconStyle }),
      'Can Edit Info'
    ),
    can_edit_pricing: React.createElement(React.Fragment, null,
      React.createElement(DollarSign, { size: iconSize, style: iconStyle }),
      'Can Edit Pricing'
    ),
    can_edit_photos: React.createElement(React.Fragment, null,
      React.createElement(Camera, { size: iconSize, style: iconStyle }),
      'Can Edit Photos'
    ),
    can_edit_employees: React.createElement(React.Fragment, null,
      React.createElement(Users, { size: iconSize, style: iconStyle }),
      'Can Edit Employees'
    ),
    can_view_analytics: React.createElement(React.Fragment, null,
      React.createElement(BarChart3, { size: iconSize, style: iconStyle }),
      'Can View Analytics'
    )
  };

  return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Default permissions for owner role
 */
export const DEFAULT_OWNER_PERMISSIONS = {
  can_edit_info: true,
  can_edit_pricing: true,
  can_edit_photos: true,
  can_edit_employees: false,
  can_view_analytics: true
};

/**
 * Default permissions for manager role
 */
export const DEFAULT_MANAGER_PERMISSIONS = {
  can_edit_info: true,
  can_edit_pricing: false,
  can_edit_photos: true,
  can_edit_employees: false,
  can_view_analytics: true
};

/**
 * Get default permissions based on role
 */
export const getDefaultPermissions = (role: 'owner' | 'manager') => {
  return role === 'owner' ? DEFAULT_OWNER_PERMISSIONS : DEFAULT_MANAGER_PERMISSIONS;
};
