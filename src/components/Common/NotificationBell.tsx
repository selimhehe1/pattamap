import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';
import '../../styles/components/notification-bell.css';

// Updated NotificationType to match backend (v10.3 - 36 types: 21 existing + 15 new business notifications)
type NotificationType =
  // Ownership Requests
  | 'ownership_request_submitted'
  | 'ownership_request_approved'
  | 'ownership_request_rejected'
  | 'new_ownership_request'
  // Verification System (NEW v10.3)
  | 'verification_submitted'
  | 'verification_approved'
  | 'verification_rejected'
  | 'verification_revoked'
  // VIP System (NEW v10.3)
  | 'vip_purchase_confirmed'
  | 'vip_payment_verified'
  | 'vip_payment_rejected'
  | 'vip_subscription_cancelled'
  // Edit Proposals (NEW v10.3)
  | 'edit_proposal_submitted'
  | 'edit_proposal_approved'
  | 'edit_proposal_rejected'
  // Establishment Owners (NEW v10.3)
  | 'establishment_owner_assigned'
  | 'establishment_owner_removed'
  | 'establishment_owner_permissions_updated'
  // Moderation
  | 'employee_approved'
  | 'employee_rejected'
  | 'establishment_approved'
  | 'establishment_rejected'
  | 'comment_approved'
  | 'comment_rejected'
  | 'comment_removed' // NEW v10.3
  // Social
  | 'comment_reply'
  | 'comment_mention'
  | 'new_favorite'
  | 'favorite_available'
  // Employee Updates
  | 'employee_profile_updated'
  | 'employee_photos_updated'
  | 'employee_position_changed'
  // Admin/Moderator
  | 'new_content_pending'
  | 'new_report'
  | 'moderation_action_required'
  // System
  | 'system'
  | 'other';

type NotificationCategory = 'all' | 'ownership' | 'verification' | 'vip' | 'proposals' | 'owners' | 'moderation' | 'social' | 'updates' | 'admin' | 'system';
type GroupingMode = 'type' | 'date';

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
    i18n_params?: Record<string, any>;
    [key: string]: any;
  };
}

const NotificationBell: React.FC = () => {
  const { secureFetch } = useSecureFetch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<NotificationCategory>('all');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('type');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const response = await secureFetch(`${API_URL}/api/notifications/unread-count`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      logger.error('Failed to fetch unread notification count:', error);
    }
  }, [user, secureFetch, API_URL]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await secureFetch(`${API_URL}/api/notifications?limit=20`);
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

  // Initial fetch and periodic refresh
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      // Only fetch notifications on mount, not on every dependency change
      fetchNotifications();

      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        fetchUnreadCount();
        // Don't auto-refresh notifications list, only on dropdown open
      }, 30000);

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only re-run when user changes

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (showDropdown && user) {
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDropdown]); // Only re-run when dropdown state changes

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await secureFetch(
        `${API_URL}/api/notifications/${notificationId}/read`,
        { method: 'PATCH' }
      );

      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, is_read: true } : notif
          )
        );
        // Refresh unread count
        await fetchUnreadCount();
      }
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      const response = await secureFetch(
        `${API_URL}/api/notifications/mark-all-read`,
        { method: 'PATCH' }
      );

      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, is_read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
    }
  };

  // Delete notification
  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent notification click

    try {
      const response = await secureFetch(
        `${API_URL}/api/notifications/${notificationId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        // Remove from local state
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        // Refresh unread count
        await fetchUnreadCount();
      }
    } catch (error) {
      logger.error('Failed to delete notification:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate to link if available
    if (notification.link) {
      setShowDropdown(false);
      navigate(notification.link);
    }
  };

  // Toggle dropdown
  const handleToggleDropdown = () => {
    // Fetch is now handled by useEffect when showDropdown changes
    setShowDropdown(!showDropdown);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('notifications.time.justNow');
    if (diffMins < 60) return t('notifications.time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('notifications.time.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('notifications.time.daysAgo', { count: diffDays });

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  };

  // Format notification message using i18n (v10.3)
  const formatNotificationMessage = (notification: Notification): string => {
    // If notification has i18n metadata, use it
    if (notification.metadata?.i18n_key) {
      try {
        const { i18n_key, i18n_params } = notification.metadata;

        // Format date parameters if present (e.g., expiresAt)
        const formattedParams = { ...i18n_params };
        if (i18n_params?.expiresAt) {
          const date = new Date(i18n_params.expiresAt);
          formattedParams.expiresAt = date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }

        // Use i18n to format message
        return String(t(`notifications.messages.${i18n_key.replace('notifications.', '')}`, formattedParams));
      } catch (error) {
        logger.warn('Failed to format i18n notification message', {
          notificationId: notification.id,
          i18n_key: notification.metadata.i18n_key,
          error
        });
        // Fallback to original message
        return notification.message;
      }
    }

    // Backward compatibility: use title/message fields
    return notification.message;
  };

  // Categorize notification by type
  const getCategoryForType = (type: NotificationType): NotificationCategory => {
    // Ownership Requests
    if (['ownership_request_submitted', 'ownership_request_approved', 'ownership_request_rejected', 'new_ownership_request'].includes(type)) {
      return 'ownership';
    }
    // Verification System (NEW v10.3)
    if (['verification_submitted', 'verification_approved', 'verification_rejected', 'verification_revoked'].includes(type)) {
      return 'verification';
    }
    // VIP System (NEW v10.3)
    if (['vip_purchase_confirmed', 'vip_payment_verified', 'vip_payment_rejected', 'vip_subscription_cancelled'].includes(type)) {
      return 'vip';
    }
    // Edit Proposals (NEW v10.3)
    if (['edit_proposal_submitted', 'edit_proposal_approved', 'edit_proposal_rejected'].includes(type)) {
      return 'proposals';
    }
    // Establishment Owners (NEW v10.3)
    if (['establishment_owner_assigned', 'establishment_owner_removed', 'establishment_owner_permissions_updated'].includes(type)) {
      return 'owners';
    }
    // Moderation
    if (['employee_approved', 'employee_rejected', 'establishment_approved', 'establishment_rejected', 'comment_approved', 'comment_rejected', 'comment_removed'].includes(type)) {
      return 'moderation';
    }
    // Social
    if (['comment_reply', 'comment_mention', 'new_favorite', 'favorite_available'].includes(type)) {
      return 'social';
    }
    // Employee Updates
    if (['employee_profile_updated', 'employee_photos_updated', 'employee_position_changed'].includes(type)) {
      return 'updates';
    }
    // Admin/Moderator
    if (['new_content_pending', 'new_report', 'moderation_action_required'].includes(type)) {
      return 'admin';
    }
    // System
    return 'system';
  };

  // Get notification icon (enhanced for 36 types - v10.3)
  const getNotificationIcon = (type: NotificationType): string => {
    switch (type) {
      // Ownership Requests
      case 'ownership_request_submitted': return '📋';
      case 'ownership_request_approved': return '✅';
      case 'ownership_request_rejected': return '❌';
      case 'new_ownership_request': return '🏆';

      // Verification System (NEW v10.3)
      case 'verification_submitted': return '✅';
      case 'verification_approved': return '🎖️';
      case 'verification_rejected': return '❌';
      case 'verification_revoked': return '⚠️';

      // VIP System (NEW v10.3)
      case 'vip_purchase_confirmed': return '💎';
      case 'vip_payment_verified': return '👑';
      case 'vip_payment_rejected': return '⛔';
      case 'vip_subscription_cancelled': return '🔕';

      // Edit Proposals (NEW v10.3)
      case 'edit_proposal_submitted': return '📝';
      case 'edit_proposal_approved': return '✏️';
      case 'edit_proposal_rejected': return '🚫';

      // Establishment Owners (NEW v10.3)
      case 'establishment_owner_assigned': return '🏆';
      case 'establishment_owner_removed': return '🔓';
      case 'establishment_owner_permissions_updated': return '🔧';

      // Moderation
      case 'employee_approved': return '👤✅';
      case 'employee_rejected': return '👤❌';
      case 'establishment_approved': return '🏢✅';
      case 'establishment_rejected': return '🏢❌';
      case 'comment_approved': return '💬✅';
      case 'comment_rejected': return '💬❌';
      case 'comment_removed': return '🗑️'; // NEW v10.3

      // Social
      case 'comment_reply': return '💬';
      case 'comment_mention': return '📢';
      case 'new_favorite': return '⭐';
      case 'favorite_available': return '🔔';

      // Employee Updates
      case 'employee_profile_updated': return '📝';
      case 'employee_photos_updated': return '📸';
      case 'employee_position_changed': return '📍';

      // Admin/Moderator
      case 'new_content_pending': return '🕐';
      case 'new_report': return '⚠️';
      case 'moderation_action_required': return '⚡';

      // System
      case 'system': return '⚙️';
      default: return '📬';
    }
  };

  // Get category icon (updated for 10 categories - v10.3)
  const getCategoryIcon = (category: NotificationCategory): string => {
    switch (category) {
      case 'ownership': return '🏆';
      case 'verification': return '🎖️'; // NEW v10.3
      case 'vip': return '💎'; // NEW v10.3
      case 'proposals': return '📝'; // NEW v10.3
      case 'owners': return '🔑'; // NEW v10.3
      case 'moderation': return '✅';
      case 'social': return '💬';
      case 'updates': return '📝';
      case 'admin': return '⚡';
      case 'system': return '⚙️';
      default: return '📬';
    }
  };

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(notif => getCategoryForType(notif.type) === filterCategory);
    }

    // Apply unread filter
    if (showOnlyUnread) {
      filtered = filtered.filter(notif => !notif.is_read);
    }

    return filtered;
  }, [notifications, filterCategory, showOnlyUnread]);

  // Group notifications
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {};

    if (groupingMode === 'type') {
      // Group by category
      filteredNotifications.forEach(notif => {
        const category = getCategoryForType(notif.type);
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(notif);
      });
    } else {
      // Group by date
      filteredNotifications.forEach(notif => {
        const date = new Date(notif.created_at);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / 86400000);

        let groupKey: string;
        if (diffDays === 0) {
          groupKey = 'today';
        } else if (diffDays === 1) {
          groupKey = 'yesterday';
        } else if (diffDays <= 7) {
          groupKey = 'this_week';
        } else {
          groupKey = 'older';
        }

        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(notif);
      });
    }

    return groups;
  }, [filteredNotifications, groupingMode]);

  // Toggle group collapse
  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  // Mark group as read
  const handleMarkGroupAsRead = async (groupKey: string) => {
    const groupNotifications = groupedNotifications[groupKey] || [];
    const unreadIds = groupNotifications.filter(n => !n.is_read).map(n => n.id);

    if (unreadIds.length === 0) return;

    try {
      await Promise.all(
        unreadIds.map(id =>
          secureFetch(`${API_URL}/api/notifications/${id}/read`, { method: 'PATCH' })
        )
      );

      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          unreadIds.includes(notif.id) ? { ...notif, is_read: true } : notif
        )
      );

      // Refresh unread count
      await fetchUnreadCount();
    } catch (error) {
      logger.error('Failed to mark group as read:', error);
    }
  };

  // Don't render if user is not logged in
  if (!user) {
    return null;
  }

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        className="notification-bell-button"
        onClick={handleToggleDropdown}
        aria-label={`Notifications. ${unreadCount} unread`}
      >
        <span className="notification-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-bell-badge" aria-label={`${unreadCount} unread notifications`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="notification-dropdown">
          {/* Header */}
          <div className="notification-dropdown-header">
            <h3 className="notification-dropdown-title">{t('notifications.title')}</h3>
            {unreadCount > 0 && (
              <button
                className="notification-mark-all-read"
                onClick={handleMarkAllAsRead}
                aria-label={t('notifications.markAllRead')}
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="notification-filters">
            {/* Unread Filter */}
            <button
              className={`notification-filter-btn ${showOnlyUnread ? 'active' : ''}`}
              onClick={() => setShowOnlyUnread(!showOnlyUnread)}
              aria-label={t('notifications.filters.unreadOnly')}
            >
              {showOnlyUnread ? '🔵' : '⚪'} {t('notifications.filters.unread')}
            </button>

            {/* Grouping Mode Toggle */}
            <button
              className="notification-filter-btn"
              onClick={() => setGroupingMode(groupingMode === 'type' ? 'date' : 'type')}
              aria-label={t('notifications.groupBy', { mode: groupingMode === 'type' ? t('notifications.date') : t('notifications.type') })}
              title={t('notifications.toggleGrouping')}
            >
              {groupingMode === 'type' ? '📁' : '📅'}
            </button>
          </div>

          {/* Category Filters */}
          <div className="notification-category-filters">
            <button
              className={`notification-category-btn ${filterCategory === 'all' ? 'active' : ''}`}
              onClick={() => setFilterCategory('all')}
            >
              {t('notifications.filters.all')}
            </button>
            <button
              className={`notification-category-btn ${filterCategory === 'ownership' ? 'active' : ''}`}
              onClick={() => setFilterCategory('ownership')}
            >
              🏆 {t('notifications.categories.ownership')}
            </button>
            <button
              className={`notification-category-btn ${filterCategory === 'verification' ? 'active' : ''}`}
              onClick={() => setFilterCategory('verification')}
            >
              🎖️ {t('notifications.categories.verification')}
            </button>
            <button
              className={`notification-category-btn ${filterCategory === 'vip' ? 'active' : ''}`}
              onClick={() => setFilterCategory('vip')}
            >
              💎 {t('notifications.categories.vip')}
            </button>
            <button
              className={`notification-category-btn ${filterCategory === 'proposals' ? 'active' : ''}`}
              onClick={() => setFilterCategory('proposals')}
            >
              📝 {t('notifications.categories.proposals')}
            </button>
            <button
              className={`notification-category-btn ${filterCategory === 'owners' ? 'active' : ''}`}
              onClick={() => setFilterCategory('owners')}
            >
              🔑 {t('notifications.categories.owners')}
            </button>
            <button
              className={`notification-category-btn ${filterCategory === 'moderation' ? 'active' : ''}`}
              onClick={() => setFilterCategory('moderation')}
            >
              ✅ {t('notifications.categories.moderation')}
            </button>
            <button
              className={`notification-category-btn ${filterCategory === 'social' ? 'active' : ''}`}
              onClick={() => setFilterCategory('social')}
            >
              💬 {t('notifications.categories.social')}
            </button>
            <button
              className={`notification-category-btn ${filterCategory === 'updates' ? 'active' : ''}`}
              onClick={() => setFilterCategory('updates')}
            >
              📝 {t('notifications.categories.updates')}
            </button>
            {user?.role === 'admin' || user?.role === 'moderator' ? (
              <button
                className={`notification-category-btn ${filterCategory === 'admin' ? 'active' : ''}`}
                onClick={() => setFilterCategory('admin')}
              >
                ⚡ {t('notifications.categories.admin')}
              </button>
            ) : null}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="notification-loading">
              <div className="notification-loading-spinner"></div>
              <p>{t('notifications.loading')}</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredNotifications.length === 0 && (
            <div className="notification-empty">
              <span className="notification-empty-icon">📭</span>
              <p className="notification-empty-text">
                {showOnlyUnread || filterCategory !== 'all'
                  ? t('notifications.noFiltered')
                  : t('notifications.empty')}
              </p>
            </div>
          )}

          {/* Grouped Notifications List */}
          {!isLoading && filteredNotifications.length > 0 && (
            <div className="notification-list">
              {Object.keys(groupedNotifications).map((groupKey) => {
                const groupNotifications = groupedNotifications[groupKey];
                const isCollapsed = collapsedGroups.has(groupKey);
                const groupUnreadCount = groupNotifications.filter(n => !n.is_read).length;

                // Get group title
                let groupTitle = '';
                let groupIcon = '';
                if (groupingMode === 'type') {
                  groupTitle = t(`notifications.categories.${groupKey}`);
                  groupIcon = getCategoryIcon(groupKey as NotificationCategory);
                } else {
                  groupTitle = t(`notifications.dateGroups.${groupKey}`);
                  groupIcon = groupKey === 'today' ? '📅' : groupKey === 'yesterday' ? '📆' : groupKey === 'this_week' ? '📋' : '📁';
                }

                return (
                  <div key={groupKey} className="notification-group">
                    {/* Group Header */}
                    <div className="notification-group-header">
                      <button
                        className="notification-group-toggle"
                        onClick={() => toggleGroup(groupKey)}
                        aria-label={`${isCollapsed ? t('notifications.expand') : t('notifications.collapse')} ${groupTitle}`}
                      >
                        <span className="notification-group-icon">{isCollapsed ? '▶' : '▼'}</span>
                        <span className="notification-group-emoji">{groupIcon}</span>
                        <span className="notification-group-title">{groupTitle}</span>
                        <span className="notification-group-count">
                          {groupNotifications.length}
                          {groupUnreadCount > 0 && (
                            <span className="notification-group-unread"> ({groupUnreadCount} {t('notifications.unread')})</span>
                          )}
                        </span>
                      </button>
                      {groupUnreadCount > 0 && !isCollapsed && (
                        <button
                          className="notification-group-mark-read"
                          onClick={() => handleMarkGroupAsRead(groupKey)}
                          aria-label={t('notifications.markGroupRead')}
                          title={t('notifications.markGroupRead')}
                        >
                          ✓
                        </button>
                      )}
                    </div>

                    {/* Group Notifications */}
                    {!isCollapsed && (
                      <div className="notification-group-items">
                        {groupNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`notification-item ${!notification.is_read ? 'unread' : ''} ${notification.link ? 'clickable' : ''}`}
                            onClick={() => handleNotificationClick(notification)}
                            role={notification.link ? 'button' : undefined}
                            tabIndex={notification.link ? 0 : undefined}
                            aria-label={notification.link ? `View notification: ${notification.title}` : notification.title}
                          >
                            {/* Unread Indicator */}
                            {!notification.is_read && (
                              <div className="notification-unread-indicator" aria-hidden="true"></div>
                            )}

                            {/* Icon */}
                            <div className="notification-icon">
                              {getNotificationIcon(notification.type)}
                            </div>

                            {/* Content */}
                            <div className="notification-content">
                              <h4 className="notification-title">{notification.title}</h4>
                              <p className="notification-message">{formatNotificationMessage(notification)}</p>
                              <span className="notification-time">{formatDate(notification.created_at)}</span>
                            </div>

                            {/* Delete Button */}
                            <button
                              className="notification-delete"
                              onClick={(e) => handleDeleteNotification(notification.id, e)}
                              aria-label={t('notifications.delete')}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {!isLoading && notifications.length > 0 && (
            <div className="notification-dropdown-footer">
              <button
                className="notification-view-all"
                onClick={() => {
                  setShowDropdown(false);
                  // Navigate to dashboard - dedicated notifications page can be added in future
                  navigate('/dashboard');
                }}
              >
                {t('notifications.viewAll')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
