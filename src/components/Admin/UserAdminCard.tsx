/**
 * User Admin Card component for UsersAdmin grid view
 * Premium fullbleed design with role-based colors, 3D tilt, and neon borders
 *
 * Uses CSS classes from:
 * - src/styles/admin/admin-employee-card.css (.aec-* and .uac-* classes)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { use3DTilt } from '../../hooks/use3DTilt';
import LazyImage from '../Common/LazyImage';
import Tooltip from '../Common/Tooltip';
import {
  Eye,
  Crown,
  Shield,
  User,
  Ban,
  CheckCircle,
  Loader2,
  Building2,
  Users,
  MessageSquare,
  Check,
  Pencil
} from 'lucide-react';

interface UserAdminCardProps {
  user: {
    id: string;
    pseudonym: string;
    email: string;
    role: 'user' | 'moderator' | 'admin';
    is_active: boolean;
    created_at: string;
    last_login?: string;
    avatar_url?: string | null;
    stats?: {
      establishments_submitted: number;
      employees_submitted: number;
      comments_made: number;
    };
  };
  isCurrentUser?: boolean;
  isProcessing: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  onViewDetails: () => void;
  onEdit: () => void;
  onChangeRole: (role: string) => void;
  onToggleActive: () => void;
}

const getRoleGlowColor = (role: string, isActive: boolean): string => {
  if (!isActive) return 'rgba(107, 114, 128, 0.4)';
  switch (role) {
    case 'admin': return 'rgba(248, 113, 113, 0.4)';
    case 'moderator': return 'rgba(251, 191, 36, 0.4)';
    case 'user': return 'rgba(0, 229, 255, 0.4)';
    default: return 'rgba(232, 121, 249, 0.4)';
  }
};

const getRoleIcon = (role: string, size: number = 14) => {
  switch (role) {
    case 'admin': return <Crown size={size} />;
    case 'moderator': return <Shield size={size} />;
    case 'user': return <User size={size} />;
    default: return <User size={size} />;
  }
};

export const UserAdminCard: React.FC<UserAdminCardProps> = ({
  user,
  isCurrentUser = false,
  isProcessing,
  isSelected = false,
  onToggleSelection,
  onViewDetails,
  onEdit,
  onChangeRole,
  onToggleActive,
}) => {
  const { t } = useTranslation();

  // 3D Tilt effect hook
  const tiltRef = use3DTilt<HTMLDivElement>({
    maxTilt: 10,
    scale: 1.02,
    glowColor: getRoleGlowColor(user.role, user.is_active),
  });

  const handleCardClick = () => {
    onViewDetails();
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection?.(user.id);
  };

  // User display
  const userInitial = user.pseudonym.charAt(0).toUpperCase();

  // Format date
  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div
      ref={tiltRef}
      className={`aec-card--fullbleed uac-card uac-card--${user.role} ${!user.is_active ? 'uac-card--inactive' : ''} ${isCurrentUser ? 'uac-card--current' : ''}`}
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); }}
    >
      {/* 1. Background - Image if available, otherwise gradient based on role */}
      {user.avatar_url ? (
        <div className="uac-background uac-background--image">
          <LazyImage
            src={user.avatar_url}
            alt={user.pseudonym}
            className="uac-background__img"
            objectFit="cover"
          />
        </div>
      ) : (
        <div className={`uac-background uac-background--${user.role}`} />
      )}

      {/* 2. Gradient overlay */}
      <div className="aec-overlay" />

      {/* 3. Inactive overlay */}
      {!user.is_active && (
        <div className="uac-inactive-overlay">
          <div className="uac-inactive-badge">
            <Ban size={14} />
            {t('admin.inactive', 'Inactive')}
          </div>
        </div>
      )}

      {/* 4. Checkbox (if selectable and not current user) */}
      {onToggleSelection && !isCurrentUser && (
        <div
          onClick={handleCheckboxClick}
          className={`aec-checkbox ${isSelected ? 'aec-checkbox--selected' : ''}`}
          role="checkbox"
          aria-checked={isSelected}
          aria-label={t('admin.selectUser', 'Select user')}
        >
          {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
        </div>
      )}

      {/* 5. Role badge */}
      <div className={`aec-status-badge aec-status-badge--animated uac-role-badge uac-role-badge--${user.role}`}>
        {getRoleIcon(user.role, 12)}
        {user.role.toUpperCase()}
      </div>

      {/* 6. Floating action icons */}
      <div className="aec-floating-actions">
        <Tooltip content={t('admin.editUser', 'Modifier les informations')} position="bottom">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="aec-action-icon"
            aria-label={t('common.edit', 'Edit')}
          >
            <Pencil size={16} />
          </button>
        </Tooltip>
        <Tooltip content={t('admin.viewProfile', 'Voir le profil complet')} position="bottom">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            className="aec-action-icon"
            aria-label={t('admin.viewDetails', 'View Details')}
          >
            <Eye size={16} />
          </button>
        </Tooltip>
      </div>

      {/* 7. Avatar initial (large, centered) - only when no profile photo */}
      {!user.avatar_url && (
        <div className={`uac-avatar uac-avatar--${user.role}`}>
          <span className="uac-avatar__initial">{userInitial}</span>
        </div>
      )}

      {/* 8. User info overlay */}
      <div className="uac-info-overlay">
        {/* User name and email */}
        <h3 className="uac-name">{user.pseudonym}</h3>
        <p className="uac-email">{user.email}</p>
        <p className="uac-joined">{t('admin.joined', 'Joined')} {formatJoinDate(user.created_at)}</p>

        {/* Stats row */}
        {user.stats && (
          <div className="uac-stats">
            <div className="uac-stat" title={t('admin.bars', 'Establishments')}>
              <Building2 size={14} />
              <span className="uac-stat__value">{user.stats.establishments_submitted}</span>
            </div>
            <div className="uac-stat" title={t('admin.profiles', 'Employees')}>
              <Users size={14} />
              <span className="uac-stat__value">{user.stats.employees_submitted}</span>
            </div>
            <div className="uac-stat" title={t('admin.reviews', 'Reviews')}>
              <MessageSquare size={14} />
              <span className="uac-stat__value">{user.stats.comments_made}</span>
            </div>
          </div>
        )}
      </div>

      {/* 9. Footer actions (not for current user) */}
      {!isCurrentUser && (
        <div className="aec-footer uac-footer">
          {/* Role selector buttons */}
          <div className="uac-role-buttons">
            {(['user', 'moderator', 'admin'] as const).map((role) => (
              <Tooltip
                key={role}
                content={t(`admin.setRole.${role}`, `Définir comme ${role === 'user' ? 'Utilisateur' : role === 'moderator' ? 'Modérateur' : 'Admin'}`)}
                position="top"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (user.role !== role) onChangeRole(role);
                  }}
                  disabled={isProcessing || user.role === role}
                  className={`uac-role-btn uac-role-btn--${role} ${user.role === role ? 'uac-role-btn--active' : ''}`}
                >
                  {getRoleIcon(role, 12)}
                </button>
              </Tooltip>
            ))}
          </div>

          {/* Toggle active button */}
          <Tooltip
            content={user.is_active ? t('admin.deactivateUser', 'Désactiver l\'utilisateur') : t('admin.activateUser', 'Activer l\'utilisateur')}
            position="top"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleActive();
              }}
              disabled={isProcessing}
              className={`uac-toggle-btn ${user.is_active ? 'uac-toggle-btn--danger' : 'uac-toggle-btn--success'}`}
            >
              {isProcessing ? (
                <Loader2 size={14} className="aec-icon--spin" />
              ) : user.is_active ? (
                <Ban size={14} />
              ) : (
                <CheckCircle size={14} />
              )}
            </button>
          </Tooltip>
        </div>
      )}

      {/* Current user indicator */}
      {isCurrentUser && (
        <div className="aec-footer uac-footer uac-footer--current">
          <span className="uac-current-badge">
            <User size={14} />
            {t('admin.thisIsYou', 'This is you')}
          </span>
        </div>
      )}

      {/* 10. Neon border */}
      <div className={`aec-neon-border uac-neon--${user.role} ${!user.is_active ? 'uac-neon--inactive' : ''}`} />
    </div>
  );
};

export default UserAdminCard;
