import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigateWithTransition } from '../../hooks/useNavigateWithTransition';
import { useTranslation } from 'react-i18next';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';
import { Bell, Check, X, Sparkles } from 'lucide-react';
import '../../styles/components/notification-bell.css';

// Notification types (kept for backend compatibility)
type NotificationType =
  | 'ownership_request_submitted' | 'ownership_request_approved' | 'ownership_request_rejected' | 'new_ownership_request'
  | 'verification_submitted' | 'verification_approved' | 'verification_rejected' | 'verification_revoked'
  | 'vip_purchase_confirmed' | 'vip_payment_verified' | 'vip_payment_rejected' | 'vip_subscription_cancelled'
  | 'edit_proposal_submitted' | 'edit_proposal_approved' | 'edit_proposal_rejected'
  | 'establishment_owner_assigned' | 'establishment_owner_removed' | 'establishment_owner_permissions_updated'
  | 'employee_approved' | 'employee_rejected' | 'establishment_approved' | 'establishment_rejected'
  | 'comment_approved' | 'comment_rejected' | 'comment_removed'
  | 'comment_reply' | 'comment_mention' | 'new_favorite' | 'favorite_available'
  | 'employee_profile_updated' | 'employee_photos_updated' | 'employee_position_changed'
  | 'new_content_pending' | 'new_report' | 'moderation_action_required'
  | 'system' | 'other';

interface Notification {
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
  metadata?: {
    i18n_key?: string;
    i18n_params?: Record<string, string | number | boolean | null>;
    [key: string]: string | number | boolean | null | Record<string, string | number | boolean | null> | undefined;
  };
}

const BASE_POLL_INTERVAL_MS = 30000;
const MAX_POLL_INTERVAL_MS = 300000;

interface NotificationBellProps {
  variant?: 'default' | 'menu-item';
}

const NotificationBell: React.FC<NotificationBellProps> = ({ variant = 'default' }) => {
  const { secureFetch } = useSecureFetch();
  const { user } = useAuth();
  const navigate = useNavigateWithTransition();
  const { t } = useTranslation();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const consecutiveErrorsRef = useRef(0);
  const currentIntervalRef = useRef(BASE_POLL_INTERVAL_MS);

  const API_URL = import.meta.env.VITE_API_URL || '';

  // Fetch unread count
  const fetchUnreadCount = useCallback(async (): Promise<boolean> => {
    if (!user) return true;
    try {
      const response = await secureFetch(`${API_URL}/api/notifications/unread-count`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to fetch unread count:', error);
      return false;
    }
  }, [user, secureFetch, API_URL]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await secureFetch(`${API_URL}/api/notifications?limit=10`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      logger.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, secureFetch, API_URL]);

  // Polling with exponential backoff
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      fetchNotifications();
      consecutiveErrorsRef.current = 0;
      currentIntervalRef.current = BASE_POLL_INTERVAL_MS;

      let timeoutId: NodeJS.Timeout;
      const scheduleNextPoll = () => {
        timeoutId = setTimeout(async () => {
          const success = await fetchUnreadCount();
          if (success) {
            consecutiveErrorsRef.current = 0;
            currentIntervalRef.current = BASE_POLL_INTERVAL_MS;
          } else {
            consecutiveErrorsRef.current++;
            currentIntervalRef.current = Math.min(
              BASE_POLL_INTERVAL_MS * Math.pow(2, consecutiveErrorsRef.current),
              MAX_POLL_INTERVAL_MS
            );
          }
          scheduleNextPoll();
        }, currentIntervalRef.current);
      };
      scheduleNextPoll();
      return () => clearTimeout(timeoutId);
    }
  }, [user, fetchUnreadCount, fetchNotifications]);

  // Fetch when dropdown opens
  useEffect(() => {
    if (showDropdown && user) {
      fetchNotifications();
    }
  }, [showDropdown, user, fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // Calculate dropdown position
  useEffect(() => {
    if (showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 340;

      // Center dropdown under the button, but keep within viewport
      let leftPos = rect.left + (rect.width / 2) - (dropdownWidth / 2);
      leftPos = Math.max(12, Math.min(leftPos, window.innerWidth - dropdownWidth - 12));

      setDropdownPosition({
        top: rect.bottom + 8,
        left: leftPos
      });
    }
  }, [showDropdown]);

  // Escape to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDropdown(false);
    };
    if (showDropdown) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showDropdown]);

  // Mark as read
  const handleMarkAsRead = async (notificationId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const response = await secureFetch(`${API_URL}/api/notifications/${notificationId}/read`, { method: 'PATCH' });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
        await fetchUnreadCount();
      }
    } catch (error) {
      logger.error('Failed to mark as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const response = await secureFetch(`${API_URL}/api/notifications/mark-all-read`, { method: 'PATCH' });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      logger.error('Failed to mark all as read:', error);
    }
  };

  // Delete notification
  const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await secureFetch(`${API_URL}/api/notifications/${notificationId}`, { method: 'DELETE' });
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        await fetchUnreadCount();
      }
    } catch (error) {
      logger.error('Failed to delete notification:', error);
    }
  };

  // Click notification
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      setShowDropdown(false);
      navigate(notification.link);
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('notifications.time.justNow', 'Just now');
    if (diffMins < 60) return t('notifications.time.minutesAgo', '{{count}}m ago', { count: diffMins });
    if (diffHours < 24) return t('notifications.time.hoursAgo', '{{count}}h ago', { count: diffHours });
    if (diffDays < 7) return t('notifications.time.daysAgo', '{{count}}d ago', { count: diffDays });
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Get translated notification content using i18n keys from metadata
  const getNotificationContent = (notification: Notification): { title: string; message: string } => {
    // Always try to get a translated title from the notification type
    const titleKey = `notifications.titles.${notification.type}`;
    const translatedTitle = t(titleKey, { defaultValue: '' });

    // Use translated title if available, otherwise use notification.title (but avoid generic "Notification")
    const finalTitle = translatedTitle ||
      (notification.title && notification.title !== 'Notification' ? notification.title : t('notifications.titles.other', 'Notification'));

    if (notification.metadata?.i18n_key) {
      // Transform backend key (notifications.verificationApproved) to translation key (notifications.messages.verificationApproved)
      const messageKey = notification.metadata.i18n_key.startsWith('notifications.')
        ? `notifications.messages.${notification.metadata.i18n_key.replace('notifications.', '')}`
        : `notifications.messages.${notification.metadata.i18n_key}`;

      const translatedMessage = t(messageKey, {
        ...notification.metadata.i18n_params,
        defaultValue: notification.message || ''
      });

      return { title: finalTitle, message: translatedMessage };
    }

    return { title: finalTitle, message: notification.message };
  };

  if (!user) return null;

  const toggleDropdown = () => setShowDropdown(!showDropdown);

  return (
    <div className={`notif-bell ${variant === 'menu-item' ? 'notif-bell--menu' : ''}`}>
      {variant === 'menu-item' ? (
        <button ref={buttonRef} className="notif-bell__menu-btn" onClick={toggleDropdown}>
          <Bell size={18} />
          <span>{t('notifications.title', 'Notifications')}</span>
          {unreadCount > 0 && <span className="notif-bell__menu-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
      ) : (
        <button ref={buttonRef} className="notif-bell__btn" onClick={toggleDropdown} aria-label={t('notifications.title', 'Notifications')}>
          <Bell size={20} />
          {unreadCount > 0 && <span className="notif-bell__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
      )}

      {showDropdown && createPortal(
        <div
          ref={dropdownRef}
          className="notif-dropdown"
          style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
        >
          {/* Header */}
          <div className="notif-dropdown__header">
            <h3>{t('notifications.title', 'Notifications')}</h3>
            {unreadCount > 0 && (
              <button className="notif-dropdown__mark-all" onClick={handleMarkAllAsRead}>
                {t('notifications.markAllRead', 'Mark all read')}
              </button>
            )}
          </div>

          {/* Content */}
          <div className="notif-dropdown__content">
            {isLoading ? (
              <div className="notif-dropdown__loading">
                <div className="notif-dropdown__spinner" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-dropdown__empty">
                <Sparkles size={32} />
                <p>{t('notifications.empty', 'All caught up!')}</p>
              </div>
            ) : (
              <div className="notif-dropdown__list">
                {notifications.map(notification => {
                  const { title, message } = getNotificationContent(notification);
                  return (
                    <div
                      key={notification.id}
                      className={`notif-item ${!notification.is_read ? 'notif-item--unread' : ''} ${notification.link ? 'notif-item--clickable' : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {!notification.is_read && <div className="notif-item__dot" />}
                      <div className="notif-item__content">
                        <p className="notif-item__title">{title}</p>
                        <p className="notif-item__message">{message}</p>
                        <span className="notif-item__time">{formatTime(notification.created_at)}</span>
                      </div>
                      <div className="notif-item__actions">
                        {!notification.is_read && (
                          <button
                            className="notif-item__action"
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                            title={t('notifications.markRead', 'Mark as read')}
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          className="notif-item__action notif-item__action--delete"
                          onClick={(e) => handleDelete(notification.id, e)}
                          title={t('notifications.delete', 'Delete')}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="notif-dropdown__footer">
              <button onClick={() => { setShowDropdown(false); navigate('/dashboard'); }}>
                {t('notifications.viewAll', 'View all notifications')}
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationBell;
