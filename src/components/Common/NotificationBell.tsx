/**
 * NotificationBell - Real-time notification bell component
 *
 * Uses Supabase Realtime for instant notification updates.
 * Falls back to polling if Realtime connection fails.
 *
 * @version 2.0.0
 * @updated 2026-01-10 - Migrated to Supabase Realtime
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigateWithTransition } from '../../hooks/useNavigateWithTransition';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeNotifications, DatabaseNotification, ConnectionStatus } from '../../hooks/useRealtimeNotifications';
import { Bell, Check, X, Sparkles, Wifi, WifiOff } from 'lucide-react';
import '../../styles/components/notification-bell.css';

interface NotificationBellProps {
  variant?: 'default' | 'menu-item';
}

const NotificationBell: React.FC<NotificationBellProps> = ({ variant = 'default' }) => {
  const { user } = useAuth();
  const navigate = useNavigateWithTransition();
  const { t } = useTranslation();

  // Use the real-time notifications hook
  const {
    notifications,
    unreadCount,
    connectionStatus,
    isLoading,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useRealtimeNotifications({ limit: 10 });

  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Refresh when dropdown opens
  useEffect(() => {
    if (showDropdown && user) {
      refresh();
    }
  }, [showDropdown, user, refresh]);

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

  // Handle mark as read
  const handleMarkAsRead = async (notificationId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await markAsRead(notificationId);
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  // Handle delete notification
  const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  // Handle notification click
  const handleNotificationClick = async (notification: DatabaseNotification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
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

  // Get translated notification content
  const getNotificationContent = (notification: DatabaseNotification): { title: string; message: string } => {
    // Always try to get a translated title from the notification type
    const titleKey = `notifications.titles.${notification.type}`;
    const translatedTitle = t(titleKey, { defaultValue: '' });

    // Use translated title if available, otherwise use notification.title
    const finalTitle = translatedTitle ||
      (notification.title && notification.title !== 'Notification' ? notification.title : t('notifications.titles.other', 'Notification'));

    if (notification.i18n_key) {
      // Transform backend key to translation key
      const messageKey = notification.i18n_key.startsWith('notifications.')
        ? `notifications.messages.${notification.i18n_key.replace('notifications.', '')}`
        : `notifications.messages.${notification.i18n_key}`;

      const translatedMessage = t(messageKey, {
        ...notification.i18n_params,
        defaultValue: notification.message || ''
      });

      return { title: finalTitle, message: translatedMessage };
    }

    return { title: finalTitle, message: notification.message };
  };

  // Get connection status indicator
  const getConnectionIndicator = (): React.ReactNode => {
    if (connectionStatus === 'connected') {
      return (
        <span className="notif-dropdown__status notif-dropdown__status--connected" title={t('notifications.realtime.connected', 'Real-time updates active')}>
          <Wifi size={12} />
        </span>
      );
    } else if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
      return (
        <span className="notif-dropdown__status notif-dropdown__status--disconnected" title={t('notifications.realtime.disconnected', 'Using polling mode')}>
          <WifiOff size={12} />
        </span>
      );
    }
    return null;
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
            <h3>
              {t('notifications.title', 'Notifications')}
              {getConnectionIndicator()}
            </h3>
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
