/**
 * Notification Store - Simple External Store Pattern
 *
 * Manages notification state outside React for both hook and imperative usage.
 * Similar pattern to react-hot-toast internals.
 */

import { ReactNode } from 'react';

// ============================================
// TYPES
// ============================================

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  description?: string;
  duration: number;
  createdAt: number;
  pausedAt?: number;
  remainingDuration?: number;
  icon?: ReactNode;
  action?: NotificationAction;
  dismissible: boolean;
  pauseOnHover: boolean;
}

export type NotificationInput = Omit<Notification, 'id' | 'createdAt'>;

type Listener = () => void;

// ============================================
// DEFAULT DURATIONS
// ============================================

export const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
  loading: Infinity,
};

// ============================================
// STORE IMPLEMENTATION
// ============================================

const createNotificationStore = () => {
  let notifications: Notification[] = [];
  const listeners: Set<Listener> = new Set();
  let idCounter = 0;

  const generateId = (): string => {
    idCounter += 1;
    return `neon-toast-${idCounter}-${Date.now()}`;
  };

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  const add = (input: Partial<NotificationInput> & { type: NotificationType; message: string }): string => {
    const id = generateId();

    const notification: Notification = {
      id,
      type: input.type,
      message: input.message,
      description: input.description,
      duration: input.duration ?? DEFAULT_DURATIONS[input.type],
      createdAt: Date.now(),
      icon: input.icon,
      action: input.action,
      dismissible: input.dismissible ?? (input.type !== 'loading'),
      pauseOnHover: input.pauseOnHover ?? true,
    };

    // Limit max notifications to prevent performance issues
    const MAX_NOTIFICATIONS = 5;
    if (notifications.length >= MAX_NOTIFICATIONS) {
      // Remove oldest non-loading notification
      const oldestNonLoading = notifications.find(n => n.type !== 'loading');
      if (oldestNonLoading) {
        notifications = notifications.filter(n => n.id !== oldestNonLoading.id);
      }
    }

    notifications = [...notifications, notification];
    emit();

    // Auto-dismiss after duration (if not infinite)
    if (notification.duration !== Infinity) {
      scheduleRemoval(id, notification.duration);
    }

    return id;
  };

  const update = (id: string, updates: Partial<Notification>): void => {
    notifications = notifications.map((n) => {
      if (n.id !== id) return n;

      const updated = { ...n, ...updates };

      // If type changed and duration wasn't explicitly set, use new type's default
      if (updates.type && !updates.duration) {
        updated.duration = DEFAULT_DURATIONS[updates.type];
      }

      // Schedule new removal if duration changed
      if (updates.duration && updates.duration !== Infinity) {
        scheduleRemoval(id, updates.duration);
      }

      return updated;
    });
    emit();
  };

  const remove = (id: string): void => {
    notifications = notifications.filter((n) => n.id !== id);
    emit();
  };

  const removeAll = (): void => {
    notifications = [];
    emit();
  };

  const pause = (id: string): void => {
    notifications = notifications.map((n) => {
      if (n.id !== id || n.pausedAt) return n;

      const elapsed = Date.now() - n.createdAt;
      const remaining = Math.max(0, n.duration - elapsed);

      return {
        ...n,
        pausedAt: Date.now(),
        remainingDuration: remaining,
      };
    });
    emit();
  };

  const resume = (id: string): void => {
    notifications = notifications.map((n) => {
      if (n.id !== id || !n.pausedAt) return n;

      const remaining = n.remainingDuration ?? n.duration;

      // Schedule removal with remaining time
      if (remaining !== Infinity && remaining > 0) {
        scheduleRemoval(id, remaining);
      }

      return {
        ...n,
        pausedAt: undefined,
        remainingDuration: undefined,
        createdAt: Date.now() - (n.duration - remaining), // Adjust for progress bar
      };
    });
    emit();
  };

  const get = (id: string): Notification | undefined => {
    return notifications.find((n) => n.id === id);
  };

  const getAll = (): Notification[] => {
    return notifications;
  };

  const subscribe = (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  // Removal timers map
  const removalTimers = new Map<string, NodeJS.Timeout>();

  const scheduleRemoval = (id: string, delay: number): void => {
    // Clear any existing timer for this id
    const existingTimer = removalTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      remove(id);
      removalTimers.delete(id);
    }, delay);

    removalTimers.set(id, timer);
  };

  const clearRemovalTimer = (id: string): void => {
    const timer = removalTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      removalTimers.delete(id);
    }
  };

  return {
    add,
    update,
    remove,
    removeAll,
    pause,
    resume,
    get,
    getAll,
    subscribe,
    clearRemovalTimer,
  };
};

// ============================================
// SINGLETON INSTANCE
// ============================================

export const notificationStore = createNotificationStore();

export default notificationStore;
