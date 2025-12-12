import { useState, useCallback } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';

/**
 * useMapEditMode - Shared hook for map edit mode management
 *
 * Centralizes edit mode state and admin authorization checks
 * across all zone map components.
 *
 * @example
 * const { isEditMode, toggleEditMode, isAdmin, canEdit } = useMapEditMode();
 */

export interface UseMapEditModeReturn {
  /** Whether edit mode is currently active */
  isEditMode: boolean;

  /** Toggle edit mode on/off */
  toggleEditMode: () => void;

  /** Set edit mode directly */
  setEditMode: (value: boolean) => void;

  /** Whether the current user is an admin */
  isAdmin: boolean;

  /** Whether the current user can edit (admin or moderator) */
  canEdit: boolean;

  /** Current user role */
  userRole: string | null;
}

export const useMapEditMode = (): UseMapEditModeReturn => {
  const { user } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);

  // Authorization checks
  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator';
  const canEdit = isAdmin || isModerator;
  const userRole = user?.role || null;

  // Toggle edit mode (only if authorized)
  const toggleEditMode = useCallback(() => {
    if (!canEdit) {
      console.warn('[useMapEditMode] User not authorized to toggle edit mode');
      return;
    }
    setIsEditMode(prev => !prev);
  }, [canEdit]);

  // Set edit mode directly (only if authorized)
  const setEditMode = useCallback((value: boolean) => {
    if (!canEdit && value) {
      console.warn('[useMapEditMode] User not authorized to enable edit mode');
      return;
    }
    setIsEditMode(value);
  }, [canEdit]);

  return {
    isEditMode,
    toggleEditMode,
    setEditMode,
    isAdmin,
    canEdit,
    userRole,
  };
};

export default useMapEditMode;
