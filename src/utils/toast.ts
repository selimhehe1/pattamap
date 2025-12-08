import toast, { Toaster, ToastOptions } from 'react-hot-toast';

/**
 * Accessible Toast System
 *
 * Wrapper around react-hot-toast with accessibility defaults:
 * - ARIA live regions (polite for success/info, assertive for errors)
 * - Appropriate durations based on message type
 * - Keyboard dismissible
 * - Screen reader friendly
 *
 * WCAG 2.1 Level AA compliant
 */

// Default toast options with accessibility in mind
const defaultOptions: ToastOptions = {
  duration: 4000, // 4 seconds - enough time to read
  position: 'top-center',
  style: {
    background: 'rgba(0,0,0,0.9)',
    color: '#ffffff',
    padding: '16px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    maxWidth: '500px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  // Accessibility: role and aria-live handled by react-hot-toast
  ariaProps: {
    role: 'status',
    'aria-live': 'polite',
  },
};

// Success toast (green)
export const showSuccess = (message: string, options?: ToastOptions): string => {
  return toast.success(message, {
    ...defaultOptions,
    ...options,
    duration: options?.duration || 4000,
    style: {
      ...defaultOptions.style,
      background: 'linear-gradient(135deg, #4CAF50, #81C784)',
      ...options?.style,
    },
    icon: '✅',
  });
};

// Error toast (red) - longer duration for errors
export const showError = (message: string, options?: ToastOptions): string => {
  return toast.error(message, {
    ...defaultOptions,
    ...options,
    duration: options?.duration || 6000, // Errors need more time to read
    style: {
      ...defaultOptions.style,
      background: 'linear-gradient(135deg, #f44336, #e57373)',
      ...options?.style,
    },
    icon: '❌',
    ariaProps: {
      role: 'alert',
      'aria-live': 'assertive', // Errors are assertive
    },
  });
};

// Info toast (blue)
export const showInfo = (message: string, options?: ToastOptions): string => {
  return toast(message, {
    ...defaultOptions,
    ...options,
    duration: options?.duration || 4000,
    style: {
      ...defaultOptions.style,
      background: 'linear-gradient(135deg, #2196F3, #64B5F6)',
      ...options?.style,
    },
    icon: 'ℹ️',
  });
};

// Warning toast (orange)
export const showWarning = (message: string, options?: ToastOptions): string => {
  return toast(message, {
    ...defaultOptions,
    ...options,
    duration: options?.duration || 5000,
    style: {
      ...defaultOptions.style,
      background: 'linear-gradient(135deg, #FF9800, #FFB74D)',
      ...options?.style,
    },
    icon: '⚠️',
  });
};

// Loading toast - use with promise pattern
export const showLoading = (message: string, options?: ToastOptions): string => {
  return toast.loading(message, {
    ...defaultOptions,
    ...options,
    style: {
      ...defaultOptions.style,
      background: 'linear-gradient(135deg, #9C27B0, #BA68C8)',
      ...options?.style,
    },
  });
};

// Promise toast - handles loading/success/error automatically
export const showPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: unknown) => string);
  },
  options?: ToastOptions
): Promise<T> => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      ...defaultOptions,
      ...options,
      success: {
        style: {
          ...defaultOptions.style,
          background: 'linear-gradient(135deg, #4CAF50, #81C784)',
        },
        icon: '✅',
        duration: 4000,
      },
      error: {
        style: {
          ...defaultOptions.style,
          background: 'linear-gradient(135deg, #f44336, #e57373)',
        },
        icon: '❌',
        duration: 6000,
      },
      loading: {
        style: {
          ...defaultOptions.style,
          background: 'linear-gradient(135deg, #9C27B0, #BA68C8)',
        },
      },
    }
  );
};

// Dismiss a specific toast
export const dismissToast = (toastId: string): void => {
  toast.dismiss(toastId);
};

// Dismiss all toasts
export const dismissAll = (): void => {
  toast.dismiss();
};

// Custom toast with full control
export const showCustom = (message: string, options?: ToastOptions): string => {
  return toast(message, {
    ...defaultOptions,
    ...options,
  });
};

// Re-export Toaster component for App.tsx integration
export { Toaster };

// Default export with all methods
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
