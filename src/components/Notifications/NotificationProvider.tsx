/**
 * NotificationProvider - Context provider for notifications
 *
 * Provides access to notification methods via React context.
 * Also renders the NotificationContainer for portal rendering.
 */

import { createContext, ReactNode, useMemo, memo } from 'react';
import { notificationStore } from '../../stores/notificationStore';
import NotificationContainer from './NotificationContainer';

// ============================================
// TYPES
// ============================================

export interface NotificationContextValue {
  store: typeof notificationStore;
}

// ============================================
// CONTEXT
// ============================================

export const NotificationContext = createContext<NotificationContextValue | null>(null);

// ============================================
// PROVIDER COMPONENT
// ============================================

interface NotificationProviderProps {
  children: ReactNode;
}

const NotificationProvider = memo(({ children }: NotificationProviderProps) => {
  const value = useMemo<NotificationContextValue>(() => ({
    store: notificationStore,
  }), []);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
});

NotificationProvider.displayName = 'NotificationProvider';

export default NotificationProvider;
