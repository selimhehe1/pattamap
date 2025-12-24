import React from 'react';
import { useNavigateWithTransition } from '../../hooks/useNavigateWithTransition';
import { useTranslation } from 'react-i18next';
import './EmptyState.css';

/**
 * ============================================
 * EMPTY STATE COMPONENT
 * ============================================
 *
 * Professional empty state component for lists, searches, and filters.
 * Provides clear messaging and CTAs when no data is available.
 *
 * Audit Fix: A009 - Empty States
 * Score: 8.5 (Minor - Sévérité: 3, Impact: 3, Effort: 2)
 *
 * @see AUDIT_CSS_MASTER_REPORT.md
 */

export type EmptyStateType =
  | 'search'
  | 'favorites'
  | 'reviews'
  | 'employees'
  | 'establishments'
  | 'notifications'
  | 'ownership'
  | 'generic';

export interface EmptyStateProps {
  /** Type of empty state (determines icon and default message) */
  type?: EmptyStateType;

  /** Custom title */
  title?: string;

  /** Custom message */
  message?: string;

  /** Custom icon (emoji or text) */
  icon?: string;

  /** Show primary action button */
  showPrimaryAction?: boolean;

  /** Primary action button text */
  primaryActionText?: string;

  /** Primary action button click handler */
  onPrimaryAction?: () => void;

  /** Show secondary action button */
  showSecondaryAction?: boolean;

  /** Secondary action button text */
  secondaryActionText?: string;

  /** Secondary action button click handler */
  onSecondaryAction?: () => void;

  /** Custom className for styling */
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'generic',
  title,
  message,
  icon,
  showPrimaryAction = true,
  primaryActionText,
  onPrimaryAction,
  showSecondaryAction = false,
  secondaryActionText,
  onSecondaryAction,
  className = '',
}) => {
  const navigate = useNavigateWithTransition();
  const { t } = useTranslation();

  // Default configurations based on type
  const getDefaultConfig = () => {
    switch (type) {
      case 'search':
        return {
          icon: '🔍',
          title: t('emptyState.search.title', 'No results found'),
          message: t('emptyState.search.message', 'Try adjusting your search or filters to find what you\'re looking for.'),
          primaryActionText: t('emptyState.search.action', 'Clear Filters'),
          primaryAction: onPrimaryAction || (() => window.location.reload()),
        };

      case 'favorites':
        return {
          icon: '⭐',
          title: t('emptyState.favorites.title', 'No favorites yet'),
          message: t('emptyState.favorites.message', 'Start adding your favorite employees and establishments to see them here.'),
          primaryActionText: t('emptyState.favorites.action', 'Explore Maps'),
          primaryAction: onPrimaryAction || (() => navigate('/')),
        };

      case 'reviews':
        return {
          icon: '💬',
          title: t('emptyState.reviews.title', 'No reviews yet'),
          message: t('emptyState.reviews.message', 'Be the first to leave a review and help the community!'),
          primaryActionText: t('emptyState.reviews.action', 'Write Review'),
          primaryAction: onPrimaryAction,
        };

      case 'employees':
        return {
          icon: '👥',
          title: t('emptyState.employees.title', 'No employees found'),
          message: t('emptyState.employees.message', 'There are currently no employees in this zone or matching your criteria.'),
          primaryActionText: t('emptyState.employees.action', 'View All Zones'),
          primaryAction: onPrimaryAction || (() => navigate('/')),
        };

      case 'establishments':
        return {
          icon: '🏢',
          title: t('emptyState.establishments.title', 'No establishments found'),
          message: t('emptyState.establishments.message', 'There are currently no establishments matching your criteria.'),
          primaryActionText: t('emptyState.establishments.action', 'View All'),
          primaryAction: onPrimaryAction || (() => navigate('/')),
        };

      case 'notifications':
        return {
          icon: '🔔',
          title: t('emptyState.notifications.title', 'No notifications'),
          message: t('emptyState.notifications.message', 'You\'re all caught up! Check back later for new updates.'),
          primaryActionText: undefined,
          primaryAction: undefined,
        };

      case 'ownership':
        return {
          icon: '🏆',
          title: t('emptyState.ownership.title', 'No establishments yet'),
          message: t('emptyState.ownership.message', 'You haven\'t been assigned any establishments yet. Contact an admin to request ownership.'),
          primaryActionText: t('emptyState.ownership.action', 'Contact Admin'),
          primaryAction: onPrimaryAction,
        };

      default:
        return {
          icon: '📭',
          title: t('emptyState.generic.title', 'Nothing here yet'),
          message: t('emptyState.generic.message', 'This section is currently empty.'),
          primaryActionText: undefined,
          primaryAction: undefined,
        };
    }
  };

  const config = getDefaultConfig();

  // Use custom props or defaults
  const finalIcon = icon || config.icon;
  const finalTitle = title || config.title;
  const finalMessage = message || config.message;
  const finalPrimaryActionText = primaryActionText || config.primaryActionText;
  const finalPrimaryAction = onPrimaryAction || config.primaryAction;
  const finalSecondaryActionText = secondaryActionText;
  const finalSecondaryAction = onSecondaryAction;

  return (
    <div className={`empty-state-container ${className}`}>
      <div className="empty-state-content">
        {/* Icon */}
        <div className="empty-state-icon" role="img" aria-label={finalTitle}>
          {finalIcon}
        </div>

        {/* Title */}
        <h2 className="empty-state-title">
          {finalTitle}
        </h2>

        {/* Message */}
        <p className="empty-state-message">
          {finalMessage}
        </p>

        {/* Actions */}
        {(showPrimaryAction || showSecondaryAction) && (
          <div className="empty-state-actions">
            {showPrimaryAction && finalPrimaryActionText && finalPrimaryAction && (
              <button
                onClick={finalPrimaryAction}
                className="btn-nightlife-base btn-primary-nightlife empty-state-btn-primary"
                aria-label={finalPrimaryActionText}
              >
                {finalPrimaryActionText}
              </button>
            )}

            {showSecondaryAction && finalSecondaryActionText && finalSecondaryAction && (
              <button
                onClick={finalSecondaryAction}
                className="btn-nightlife-base btn-secondary-nightlife empty-state-btn-secondary"
                aria-label={finalSecondaryActionText}
              >
                {finalSecondaryActionText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
