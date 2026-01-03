import { ReactNode } from 'react';

/**
 * Toast Service - DEPRECATED
 *
 * This file now forwards all calls to the new Neon Glass notification system.
 * The API remains identical for backwards compatibility during migration.
 *
 * @deprecated Use 'notification' from './notification' instead.
 *
 * Migration Guide:
 * - Replace: import toast from './utils/toast';
 * - With:    import notification from './utils/notification';
 *
 * The new system provides:
 * - Neo-Nightlife 2025 glassmorphism design
 * - Neon glow effects and animations
 * - Bottom-right stacking
 * - Full Framer Motion integration
 */

import notification, {
  showSuccess as newShowSuccess,
  showError as newShowError,
  showWarning as newShowWarning,
  showInfo as newShowInfo,
  showLoading as newShowLoading,
  showPromise as newShowPromise,
  dismissNotification,
  dismissAll as newDismissAll,
  showCustom as newShowCustom,
  NotificationOptions,
} from './notification';

// Legacy type for backwards compatibility
interface LegacyToastOptions {
  duration?: number;
  style?: Record<string, unknown>;
  icon?: ReactNode;
  ariaProps?: {
    role?: string;
    'aria-live'?: string;
  };
}

/**
 * Convert legacy options to new format
 */
const convertOptions = (options?: LegacyToastOptions): NotificationOptions | undefined => {
  if (!options) return undefined;

  return {
    duration: options.duration,
    icon: options.icon,
  };
};

/**
 * @deprecated Use notification.success() instead
 */
export const showSuccess = (message: string, options?: LegacyToastOptions): string => {
  return newShowSuccess(message, convertOptions(options));
};

/**
 * @deprecated Use notification.error() instead
 */
export const showError = (message: string, options?: LegacyToastOptions): string => {
  return newShowError(message, convertOptions(options));
};

/**
 * @deprecated Use notification.info() instead
 */
export const showInfo = (message: string, options?: LegacyToastOptions): string => {
  return newShowInfo(message, convertOptions(options));
};

/**
 * @deprecated Use notification.warning() instead
 */
export const showWarning = (message: string, options?: LegacyToastOptions): string => {
  return newShowWarning(message, convertOptions(options));
};

/**
 * @deprecated Use notification.loading() instead
 */
export const showLoading = (message: string, options?: LegacyToastOptions): string => {
  return newShowLoading(message, convertOptions(options));
};

/**
 * @deprecated Use notification.promise() instead
 */
export const showPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: unknown) => string);
  },
  options?: LegacyToastOptions
): Promise<T> => {
  return newShowPromise(promise, messages, convertOptions(options));
};

/**
 * @deprecated Use notification.dismiss() instead
 */
export const dismissToast = (toastId: string): void => {
  dismissNotification(toastId);
};

/**
 * @deprecated Use notification.dismissAll() instead
 */
export const dismissAll = (): void => {
  newDismissAll();
};

/**
 * @deprecated Use notification.custom() instead
 */
export const showCustom = (message: string, options?: LegacyToastOptions): string => {
  return newShowCustom(message, 'info', convertOptions(options));
};

/**
 * @deprecated The Toaster component is no longer needed.
 * NotificationProvider now handles rendering automatically.
 * Remove <Toaster /> from App.tsx.
 */
export const Toaster = () => null;

/**
 * @deprecated Use notification from './notification' instead
 */
const toastService = {
  success: showSuccess,
  error: showError,
  info: showInfo,
  warning: showWarning,
  loading: showLoading,
  promise: showPromise,
  dismiss: dismissToast,
  dismissAll,
  custom: showCustom,
};

export default toastService;
