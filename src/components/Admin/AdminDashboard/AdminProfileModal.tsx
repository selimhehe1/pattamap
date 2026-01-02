/**
 * AdminProfileModal Component
 *
 * Premium modal displaying admin/moderator profile information.
 * Features role-based colors and activity statistics.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Zap,
  User as UserIcon,
  Shield,
  Mail,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  BarChart3,
  Building2,
  Users,
  MessageSquare,
  X
} from 'lucide-react';
import { premiumModalVariants, premiumBackdropVariants } from '../../../animations/variants';
import type { AdminProfileModalProps } from './types';

// Role-based color helper
const getRoleColor = (role: string): string => {
  switch (role) {
    case 'admin': return '#FFD700';
    case 'moderator': return '#00E5FF';
    default: return '#E879F9';
  }
};

// Role-based icon helper
const getRoleIcon = (role: string, size = 32) => {
  switch (role) {
    case 'admin': return <Crown size={size} />;
    case 'moderator': return <Zap size={size} />;
    default: return <UserIcon size={size} />;
  }
};

const AdminProfileModal: React.FC<AdminProfileModalProps> = ({
  selectedUser,
  onClose
}) => {
  const { t } = useTranslation();
  const roleColor = getRoleColor(selectedUser.role);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="modal-premium-overlay"
        variants={premiumBackdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
      >
        <motion.div
          className="modal-premium modal-premium--small"
          variants={premiumModalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-profile-modal-title"
        >
          {/* Close Button */}
          <motion.button
            className="modal-premium__close"
            onClick={onClose}
            aria-label={t('common.close')}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.95 }}
          >
            <X size={18} />
          </motion.button>

          {/* Header with Icon */}
          <div className="modal-premium__header modal-premium__header--form">
            <motion.div
              className="modal-premium__icon modal-premium__icon--admin"
              style={{
                background: `rgba(255, 215, 0, 0.15)`,
                border: `2px solid ${roleColor}`,
                color: roleColor,
                boxShadow: `0 0 20px ${roleColor}30`
              }}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
            >
              <Shield size={24} />
            </motion.div>
            <motion.h2
              id="admin-profile-modal-title"
              className="modal-premium__title"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              {t('admin.adminProfile')}
            </motion.h2>
          </div>

          {/* Content */}
          <motion.div
            className="modal-premium__content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Avatar Section */}
            <motion.div
              className="modal-premium__avatar-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <motion.div
                className="modal-premium__avatar"
                style={{
                  borderColor: roleColor,
                  boxShadow: `0 0 30px ${roleColor}40, 0 0 60px ${roleColor}20`
                }}
                whileHover={{ scale: 1.05 }}
              >
                {getRoleIcon(selectedUser.role, 48)}
              </motion.div>
              <h3 className="modal-premium__user-name">{selectedUser.pseudonym || 'Administrator'}</h3>
              <p className="modal-premium__user-email">{selectedUser.email}</p>
              <motion.span
                className="modal-premium__role-badge"
                style={{
                  borderColor: roleColor,
                  color: roleColor,
                  background: `linear-gradient(135deg, ${roleColor}20, ${roleColor}10)`,
                  boxShadow: `0 0 15px ${roleColor}40`
                }}
                whileHover={{ scale: 1.05 }}
              >
                {getRoleIcon(selectedUser.role, 16)} {selectedUser.role?.toUpperCase() || 'USER'}
              </motion.span>
            </motion.div>

            {/* Separator */}
            <div className="modal-premium__separator" />

            {/* Personal Information */}
            <motion.div
              className="modal-premium__section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h4 className="modal-premium__section-title">
                <Mail size={18} />
                {t('admin.personalInformation')}
              </h4>
              <div className="modal-premium__info-grid">
                <div className="modal-premium__info-item">
                  <span className="modal-premium__info-label">{t('admin.memberSince')}:</span>
                  <span className="modal-premium__info-value">
                    {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : t('admin.unknown')}
                  </span>
                </div>
                <div className="modal-premium__info-item">
                  <span className="modal-premium__info-label">{t('admin.accountStatus')}:</span>
                  <span className="modal-premium__info-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {selectedUser.is_active ? (
                      <><CheckCircle size={14} style={{ color: '#10B981' }} /> {t('admin.active')}</>
                    ) : (
                      <><XCircle size={14} style={{ color: '#F87171' }} /> {t('admin.inactive')}</>
                    )}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Separator */}
            <div className="modal-premium__separator" />

            {/* Role & Permissions */}
            <motion.div
              className="modal-premium__section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <h4 className="modal-premium__section-title">
                <Lock size={18} />
                {t('admin.rolePermissions')}
              </h4>
              <div className="modal-premium__info-grid">
                <div className="modal-premium__info-item">
                  <span className="modal-premium__info-label">{t('admin.accessLevel')}:</span>
                  <span className="modal-premium__info-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {selectedUser.role === 'admin' ? (
                      <><Unlock size={14} style={{ color: '#10B981' }} /> {t('admin.fullAccess')}</>
                    ) : selectedUser.role === 'moderator' ? (
                      <><Lock size={14} style={{ color: '#00E5FF' }} /> {t('admin.moderationAccess')}</>
                    ) : (
                      <><Lock size={14} style={{ color: '#E879F9' }} /> {t('admin.userAccess')}</>
                    )}
                  </span>
                </div>
                <div className="modal-premium__info-item">
                  <span className="modal-premium__info-label">{t('admin.permissions')}:</span>
                  <span className="modal-premium__info-value">
                    {selectedUser.role === 'admin' ? t('admin.allOperations') :
                     selectedUser.role === 'moderator' ? t('admin.contentModeration') :
                     t('admin.readOnly')}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Separator */}
            <div className="modal-premium__separator" />

            {/* Activity Statistics */}
            {selectedUser.stats && (
              <motion.div
                className="modal-premium__section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h4 className="modal-premium__section-title">
                  <BarChart3 size={18} />
                  {t('admin.activityStatistics')}
                </h4>
                <div className="modal-premium__stats-grid">
                  <motion.div
                    className="modal-premium__stat-card"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.45 }}
                    whileHover={{ scale: 1.05, y: -4 }}
                    style={{ borderColor: '#E879F930' }}
                  >
                    <div className="modal-premium__stat-icon" style={{ color: '#E879F9' }}>
                      <Building2 size={24} />
                    </div>
                    <div className="modal-premium__stat-value" style={{ color: '#E879F9' }}>
                      {selectedUser.stats.establishments_submitted || 0}
                    </div>
                    <div className="modal-premium__stat-label">{t('admin.establishments')}</div>
                  </motion.div>
                  <motion.div
                    className="modal-premium__stat-card"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.05, y: -4 }}
                    style={{ borderColor: '#00E5FF30' }}
                  >
                    <div className="modal-premium__stat-icon" style={{ color: '#00E5FF' }}>
                      <Users size={24} />
                    </div>
                    <div className="modal-premium__stat-value" style={{ color: '#00E5FF' }}>
                      {selectedUser.stats.employees_submitted || 0}
                    </div>
                    <div className="modal-premium__stat-label">{t('admin.employees')}</div>
                  </motion.div>
                  <motion.div
                    className="modal-premium__stat-card"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.55 }}
                    whileHover={{ scale: 1.05, y: -4 }}
                    style={{ borderColor: '#FFD70030' }}
                  >
                    <div className="modal-premium__stat-icon" style={{ color: '#FFD700' }}>
                      <MessageSquare size={24} />
                    </div>
                    <div className="modal-premium__stat-value" style={{ color: '#FFD700' }}>
                      {selectedUser.stats.comments_made || 0}
                    </div>
                    <div className="modal-premium__stat-label">{t('admin.comments')}</div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Footer */}
          <motion.div
            className="modal-premium__footer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            style={{ justifyContent: 'center' }}
          >
            <motion.button
              className="modal-premium__btn-primary"
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ width: '100%', maxWidth: '200px' }}
            >
              {t('common.close')}
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdminProfileModal;
