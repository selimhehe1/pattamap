/**
 * Notification API - Imperative notification system
 *
 * Drop-in replacement for toast.ts with identical API.
 * Uses the Neon Glass Toast system with Neo-Nightlife 2025 design.
 *
 * Usage:
 * ```typescript
 * import notification from './utils/notification';
 *
 * notification.success('Operation completed!');
 * notification.error('Something went wrong');
 * notification.warning('Are you sure?');
 * notification.info('New feature available');
 *
 * const id = notification.loading('Saving...');
 * notification.update(id, { type: 'success', message: 'Saved!' });
 *
 * notification.promise(fetchData(), {
 *   loading: 'Loading...',
 *   success: 'Data loaded!',
 *   error: (err) => `Failed: ${err.message}`,
 * });
 * ```
 */

import { ReactNode } from 'react';
import { notificationStore, NotificationType, NotificationAction } from '../stores/notificationStore';

// ============================================
// TYPES
// ============================================

export interface NotificationOptions {
  duration?: number;
  icon?: ReactNode;
  description?: string;
  action?: NotificationAction;
  dismissible?: boolean;
  pauseOnHover?: boolean;
}

export interface PromiseMessages<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((err: unknown) => string);
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Show a success notification (cyan → emerald gradient)
 */
export const showSuccess = (message: string, options?: NotificationOptions): string => {
  return notificationStore.add({
    type: 'success',
    message,
    duration: options?.duration,
    icon: options?.icon,
    description: options?.description,
    action: options?.action,
    dismissible: options?.dismissible,
    pauseOnHover: options?.pauseOnHover,
  });
};

/**
 * Show an error notification (rose → coral gradient)
 */
export const showError = (message: string, options?: NotificationOptions): string => {
  return notificationStore.add({
    type: 'error',
    message,
    duration: options?.duration,
    icon: options?.icon,
    description: options?.description,
    action: options?.action,
    dismissible: options?.dismissible,
    pauseOnHover: options?.pauseOnHover,
  });
};

/**
 * Show a warning notification (amber → gold gradient)
 */
export const showWarning = (message: string, options?: NotificationOptions): string => {
  return notificationStore.add({
    type: 'warning',
    message,
    duration: options?.duration,
    icon: options?.icon,
    description: options?.description,
    action: options?.action,
    dismissible: options?.dismissible,
    pauseOnHover: options?.pauseOnHover,
  });
};

/**
 * Show an info notification (magenta → violet gradient)
 */
export const showInfo = (message: string, options?: NotificationOptions): string => {
  return notificationStore.add({
    type: 'info',
    message,
    duration: options?.duration,
    icon: options?.icon,
    description: options?.description,
    action: options?.action,
    dismissible: options?.dismissible,
    pauseOnHover: options?.pauseOnHover,
  });
};

/**
 * Show a loading notification (magenta → cyan gradient, infinite duration)
 */
export const showLoading = (message: string, options?: NotificationOptions): string => {
  return notificationStore.add({
    type: 'loading',
    message,
    duration: Infinity,
    icon: options?.icon,
    description: options?.description,
    action: options?.action,
    dismissible: false,
    pauseOnHover: false,
  });
};

/**
 * Show a custom notification
 */
export const showCustom = (
  message: string,
  type: NotificationType = 'info',
  options?: NotificationOptions
): string => {
  return notificationStore.add({
    type,
    message,
    duration: options?.duration,
    icon: options?.icon,
    description: options?.description,
    action: options?.action,
    dismissible: options?.dismissible,
    pauseOnHover: options?.pauseOnHover,
  });
};

/**
 * Promise-based notification (handles loading → success/error automatically)
 */
export const showPromise = <T,>(
  promise: Promise<T>,
  messages: PromiseMessages<T>,
  options?: NotificationOptions
): Promise<T> => {
  const id = notificationStore.add({
    type: 'loading',
    message: messages.loading,
    duration: Infinity,
    icon: options?.icon,
    description: options?.description,
    dismissible: false,
    pauseOnHover: false,
  });

  return promise
    .then((data) => {
      const successMessage =
        typeof messages.success === 'function'
          ? messages.success(data)
          : messages.success;

      notificationStore.update(id, {
        type: 'success',
        message: successMessage,
        dismissible: true,
      });

      return data;
    })
    .catch((err) => {
      const errorMessage =
        typeof messages.error === 'function'
          ? messages.error(err)
          : messages.error;

      notificationStore.update(id, {
        type: 'error',
        message: errorMessage,
        dismissible: true,
      });

      throw err;
    });
};

/**
 * Dismiss a specific notification
 */
export const dismissNotification = (id: string): void => {
  notificationStore.remove(id);
};

/**
 * Dismiss all notifications
 */
export const dismissAll = (): void => {
  notificationStore.removeAll();
};

/**
 * Update an existing notification
 */
export const updateNotification = (
  id: string,
  updates: Partial<NotificationOptions & { message: string; type: NotificationType }>
): void => {
  notificationStore.update(id, updates);
};

// ============================================
// LEGACY ALIASES (for migration compatibility)
// ============================================

/** @deprecated Use dismissNotification instead */
export const dismissToast = dismissNotification;

// ============================================
// DEFAULT EXPORT
// ============================================

const notification = {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  custom: showCustom,
  promise: showPromise,
  dismiss: dismissNotification,
  dismissAll,
  update: updateNotification,
};

export default notification;
