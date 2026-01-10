/**
 * useRealtimeNotifications - Real-time notification updates via Supabase Realtime
 *
 * Subscribes to the notifications table for the current user and provides
 * instant updates when notifications are created, updated, or deleted.
 *
 * Features:
 * - Automatic subscription management
 * - Optimistic UI updates
 * - Fallback to polling if Realtime fails
 * - Connection status tracking
 *
 * @version 1.0.0
 * @created 2026-01-10
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSecureFetch } from './useSecureFetch';
import { logger } from '../utils/logger';

// ============================================
// TYPES
// ============================================

export type NotificationType =
  | 'ownership_request_submitted' | 'ownership_request_approved' | 'ownership_request_rejected' | 'new_ownership_request'
  | 'verification_submitted' | 'verification_approved' | 'verification_rejected' | 'verification_revoked'
  | 'vip_purchase_confirmed' | 'vip_payment_verified' | 'vip_payment_rejected' | 'vip_subscription_cancelled'
  | 'edit_proposal_submitted' | 'edit_proposal_approved' | 'edit_proposal_rejected'
  | 'establishment_owner_assigned' | 'establishment_owner_removed' | 'establishment_owner_permissions_updated'
  | 'employee_approved' | 'employee_rejected' | 'establishment_approved' | 'establishment_rejected'
  | 'comment_approved' | 'comment_rejected' | 'comment_removed'
  | 'comment_reply' | 'comment_mention' | 'new_favorite' | 'favorite_available'
  | 'employee_profile_updated' | 'employee_photos_updated' | 'employee_position_changed'
  | 'new_content_pending' | 'new_report' | 'moderation_action_required' | 'new_verification_request'
  | 'system' | 'other';

export interface DatabaseNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
  related_entity_type?: string;
  related_entity_id?: string;
  i18n_key?: string;
  i18n_params?: Record<string, string | number | boolean | null>;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseRealtimeNotificationsOptions {
  /** Maximum notifications to keep in memory */
  limit?: number;
  /** Enable polling fallback if Realtime fails */
  enablePollingFallback?: boolean;
  /** Polling interval in ms (only used as fallback) */
  pollingInterval?: number;
}

interface UseRealtimeNotificationsReturn {
  /** List of notifications */
  notifications: DatabaseNotification[];
  /** Count of unread notifications */
  unreadCount: number;
  /** Connection status */
  connectionStatus: ConnectionStatus;
  /** Whether data is loading */
  isLoading: boolean;
  /** Fetch/refresh notifications */
  refresh: () => Promise<void>;
  /** Mark a notification as read */
  markAsRead: (notificationId: string) => Promise<boolean>;
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<boolean>;
  /** Delete a notification */
  deleteNotification: (notificationId: string) => Promise<boolean>;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_LIMIT = 50;
const DEFAULT_POLLING_INTERVAL = 60000; // 1 minute fallback
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

// ============================================
// HOOK
// ============================================

export function useRealtimeNotifications(
  options: UseRealtimeNotificationsOptions = {}
): UseRealtimeNotificationsReturn {
  const {
    limit = DEFAULT_LIMIT,
    enablePollingFallback = true,
    pollingInterval = DEFAULT_POLLING_INTERVAL,
  } = options;

  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();
  const API_URL = import.meta.env.VITE_API_URL || '';

  // State
  const [notifications, setNotifications] = useState<DatabaseNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // ============================================
  // API METHODS
  // ============================================

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = useCallback(async () => {
    if (!user || !isMountedRef.current) return;

    setIsLoading(true);
    try {
      const response = await secureFetch(`${API_URL}/api/notifications?limit=${limit}`);
      if (response.ok && isMountedRef.current) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      logger.error('[Realtime] Failed to fetch notifications:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user, secureFetch, API_URL, limit]);

  /**
   * Fetch unread count from API
   */
  const fetchUnreadCount = useCallback(async () => {
    if (!user || !isMountedRef.current) return;

    try {
      const response = await secureFetch(`${API_URL}/api/notifications/unread-count`);
      if (response.ok && isMountedRef.current) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      logger.error('[Realtime] Failed to fetch unread count:', error);
    }
  }, [user, secureFetch, API_URL]);

  /**
   * Refresh all notification data
   */
  const refresh = useCallback(async () => {
    await Promise.all([fetchNotifications(), fetchUnreadCount()]);
  }, [fetchNotifications, fetchUnreadCount]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      const response = await secureFetch(
        `${API_URL}/api/notifications/${notificationId}/read`,
        { method: 'PATCH' }
      );

      if (response.ok) {
        // Optimistic update
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch (error) {
      logger.error('[Realtime] Failed to mark as read:', error);
      return false;
    }
  }, [secureFetch, API_URL]);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      const response = await secureFetch(
        `${API_URL}/api/notifications/mark-all-read`,
        { method: 'PATCH' }
      );

      if (response.ok) {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('[Realtime] Failed to mark all as read:', error);
      return false;
    }
  }, [secureFetch, API_URL]);

  /**
   * Delete notification
   */
  const deleteNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      const response = await secureFetch(
        `${API_URL}/api/notifications/${notificationId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        // Optimistic update
        const notification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (notification && !notification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        return true;
      }
      return false;
    } catch (error) {
      logger.error('[Realtime] Failed to delete notification:', error);
      return false;
    }
  }, [secureFetch, API_URL, notifications]);

  // ============================================
  // REALTIME HANDLERS
  // ============================================

  /**
   * Handle INSERT event - new notification
   */
  const handleInsert = useCallback((payload: RealtimePostgresChangesPayload<DatabaseNotification>) => {
    const newNotification = payload.new as DatabaseNotification;

    logger.info('[Realtime] New notification received:', {
      id: newNotification.id,
      type: newNotification.type
    });

    setNotifications(prev => {
      // Avoid duplicates
      if (prev.some(n => n.id === newNotification.id)) {
        return prev;
      }
      // Add to beginning, maintain limit
      const updated = [newNotification, ...prev];
      return updated.slice(0, limit);
    });

    if (!newNotification.is_read) {
      setUnreadCount(prev => prev + 1);
    }
  }, [limit]);

  /**
   * Handle UPDATE event - notification updated (e.g., marked as read)
   */
  const handleUpdate = useCallback((payload: RealtimePostgresChangesPayload<DatabaseNotification>) => {
    const updatedNotification = payload.new as DatabaseNotification;
    const oldNotification = payload.old as Partial<DatabaseNotification>;

    logger.debug('[Realtime] Notification updated:', {
      id: updatedNotification.id,
      wasRead: oldNotification.is_read,
      isRead: updatedNotification.is_read
    });

    setNotifications(prev =>
      prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
    );

    // Update unread count if read status changed
    if (oldNotification.is_read === false && updatedNotification.is_read === true) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    } else if (oldNotification.is_read === true && updatedNotification.is_read === false) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  /**
   * Handle DELETE event - notification removed
   */
  const handleDelete = useCallback((payload: RealtimePostgresChangesPayload<DatabaseNotification>) => {
    const deletedNotification = payload.old as DatabaseNotification;

    logger.debug('[Realtime] Notification deleted:', { id: deletedNotification.id });

    setNotifications(prev => prev.filter(n => n.id !== deletedNotification.id));

    if (!deletedNotification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  /**
   * Set up Supabase Realtime subscription
   */
  const setupSubscription = useCallback(() => {
    if (!user?.id) {
      logger.debug('[Realtime] No user, skipping subscription');
      return;
    }

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    setConnectionStatus('connecting');
    logger.info('[Realtime] Setting up notification subscription for user:', user.id);

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        handleUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        handleDelete
      )
      .subscribe((status, err) => {
        if (!isMountedRef.current) return;

        if (status === 'SUBSCRIBED') {
          logger.info('[Realtime] Successfully subscribed to notifications');
          setConnectionStatus('connected');
          reconnectAttemptsRef.current = 0;

          // Stop polling fallback if connected
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.error('[Realtime] Subscription error:', err);
          setConnectionStatus('error');

          // Attempt reconnect
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current++;
            logger.info(`[Realtime] Attempting reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
            setTimeout(setupSubscription, RECONNECT_DELAY * reconnectAttemptsRef.current);
          } else if (enablePollingFallback && !pollingIntervalRef.current) {
            // Fall back to polling (inline to avoid circular dependency)
            logger.warn('[Realtime] Max reconnect attempts reached, falling back to polling');
            pollingIntervalRef.current = setInterval(() => {
              refresh();
            }, pollingInterval);
          }
        } else if (status === 'CLOSED') {
          logger.debug('[Realtime] Channel closed');
          setConnectionStatus('disconnected');
        }
      });

    channelRef.current = channel;
  }, [user?.id, handleInsert, handleUpdate, handleDelete, enablePollingFallback, refresh, pollingInterval]);

  /**
   * Start polling fallback (kept for external use if needed)
   */
  const _startPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) return;

    logger.info('[Realtime] Starting polling fallback');
    pollingIntervalRef.current = setInterval(() => {
      refresh();
    }, pollingInterval);
  }, [refresh, pollingInterval]);

  // ============================================
  // EFFECTS
  // ============================================

  // Set up subscription when user changes
  useEffect(() => {
    isMountedRef.current = true;

    if (user?.id) {
      // Initial fetch
      refresh();
      // Set up realtime subscription
      setupSubscription();
    } else {
      // Clear data when logged out
      setNotifications([]);
      setUnreadCount(0);
      setConnectionStatus('disconnected');
    }

    return () => {
      isMountedRef.current = false;

      // Clean up subscription
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Clean up polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [user?.id, refresh, setupSubscription]);

  return {
    notifications,
    unreadCount,
    connectionStatus,
    isLoading,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

export default useRealtimeNotifications;
