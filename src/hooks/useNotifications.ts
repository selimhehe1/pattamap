/**
 * useNotifications - React hook for notification management
 *
 * Provides convenient methods for triggering notifications
 * within React components.
 *
 * Usage:
 * ```tsx
 * const { success, error, warning, info, loading, promise } = useNotifications();
 *
 * success('Operation completed!');
 * error('Something went wrong', { description: 'Please try again' });
 * promise(fetchData(), {
 *   loading: 'Loading...',
 *   success: 'Data loaded!',
 *   error: 'Failed to load data',
 * });
 * ```
 */

import { useContext, useCallback, ReactNode } from 'react';
import { NotificationContext } from '../components/Notifications/NotificationProvider';
import { NotificationType, NotificationAction } from '../stores/notificationStore';

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
  id?: string;
}

export interface PromiseMessages<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((err: unknown) => string);
}

// ============================================
// HOOK
// ============================================

export const useNotifications = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }

  const { store } = context;

  const success = useCallback(
    (message: string, options?: NotificationOptions): string => {
      return store.add({
        type: 'success',
        message,
        duration: options?.duration,
        icon: options?.icon,
        description: options?.description,
        action: options?.action,
        dismissible: options?.dismissible,
        pauseOnHover: options?.pauseOnHover,
      });
    },
    [store]
  );

  const error = useCallback(
    (message: string, options?: NotificationOptions): string => {
      return store.add({
        type: 'error',
        message,
        duration: options?.duration,
        icon: options?.icon,
        description: options?.description,
        action: options?.action,
        dismissible: options?.dismissible,
        pauseOnHover: options?.pauseOnHover,
      });
    },
    [store]
  );

  const warning = useCallback(
    (message: string, options?: NotificationOptions): string => {
      return store.add({
        type: 'warning',
        message,
        duration: options?.duration,
        icon: options?.icon,
        description: options?.description,
        action: options?.action,
        dismissible: options?.dismissible,
        pauseOnHover: options?.pauseOnHover,
      });
    },
    [store]
  );

  const info = useCallback(
    (message: string, options?: NotificationOptions): string => {
      return store.add({
        type: 'info',
        message,
        duration: options?.duration,
        icon: options?.icon,
        description: options?.description,
        action: options?.action,
        dismissible: options?.dismissible,
        pauseOnHover: options?.pauseOnHover,
      });
    },
    [store]
  );

  const loading = useCallback(
    (message: string, options?: NotificationOptions): string => {
      return store.add({
        type: 'loading',
        message,
        duration: Infinity,
        icon: options?.icon,
        description: options?.description,
        action: options?.action,
        dismissible: false,
        pauseOnHover: false,
      });
    },
    [store]
  );

  const dismiss = useCallback(
    (id: string): void => {
      store.remove(id);
    },
    [store]
  );

  const dismissAll = useCallback((): void => {
    store.removeAll();
  }, [store]);

  const update = useCallback(
    (
      id: string,
      updates: Partial<NotificationOptions & { message: string; type: NotificationType }>
    ): void => {
      store.update(id, updates);
    },
    [store]
  );

  const promise = useCallback(
    <T,>(
      promiseFn: Promise<T>,
      messages: PromiseMessages<T>,
      options?: NotificationOptions
    ): Promise<T> => {
      const id = store.add({
        type: 'loading',
        message: messages.loading,
        duration: Infinity,
        dismissible: false,
        pauseOnHover: false,
        icon: options?.icon,
        description: options?.description,
      });

      return promiseFn
        .then((data) => {
          const successMessage =
            typeof messages.success === 'function'
              ? messages.success(data)
              : messages.success;

          store.update(id, {
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

          store.update(id, {
            type: 'error',
            message: errorMessage,
            dismissible: true,
          });

          throw err;
        });
    },
    [store]
  );

  return {
    success,
    error,
    warning,
    info,
    loading,
    dismiss,
    dismissAll,
    update,
    promise,
  };
};

export default useNotifications;
