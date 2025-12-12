import { useEffect, useRef } from 'react';
import { logger } from '../utils/logger';

/**
 * Hook to track employee profile views
 * Automatically sends a POST request to record the view when the employee profile is displayed
 *
 * @param employeeId - The ID of the employee whose profile is being viewed
 * @param isVisible - Optional flag to control when tracking occurs (default: true)
 *
 * @example
 * // In a component displaying an employee profile:
 * useProfileViewTracking(employee.id);
 *
 * @example
 * // With conditional tracking (e.g., only when modal is open):
 * useProfileViewTracking(employee.id, isModalOpen);
 */
export const useProfileViewTracking = (employeeId: string | null | undefined, isVisible: boolean = true) => {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track once per mount and only when visible
    if (!employeeId || !isVisible || hasTracked.current) {
      return;
    }

    const trackView = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/employees/${employeeId}/view`,
          {
            method: 'POST',
            credentials: 'include', // Include cookies for auth (optional, works for anonymous too)
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          logger.debug(`Profile view tracked for employee ${employeeId}`);
          hasTracked.current = true;
        } else {
          logger.warn(`Failed to track profile view for employee ${employeeId}:`, response.status);
        }
      } catch (error) {
        // Fail silently - tracking should not disrupt user experience
        logger.error('Failed to track profile view:', error);
      }
    };

    trackView();
  }, [employeeId, isVisible]);
};
