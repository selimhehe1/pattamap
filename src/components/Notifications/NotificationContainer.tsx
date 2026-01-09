/**
 * NotificationContainer - Portal container for toast stack
 *
 * Features:
 * - Renders to document body via portal
 * - AnimatePresence for enter/exit animations
 * - Bottom-right stacking
 * - Subscribes to notification store
 */

import { memo, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { notificationStore, Notification } from '../../stores/notificationStore';
import NeonToast from './NeonToast';

// ============================================
// STORE SUBSCRIPTION
// ============================================

const subscribe = (callback: () => void) => {
  return notificationStore.subscribe(callback);
};

const getSnapshot = (): Notification[] => {
  return notificationStore.getAll();
};

const getServerSnapshot = (): Notification[] => {
  return [];
};

// ============================================
// COMPONENT
// ============================================

const NotificationContainer = memo(() => {
  // Subscribe to store updates
  const notifications = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  // Don't render portal on server or if no portal target
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="neon-toast-container"
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {notifications.map((notification) => (
          <NeonToast
            key={notification.id}
            notification={notification}
          />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
});

NotificationContainer.displayName = 'NotificationContainer';

export default NotificationContainer;
