import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../../types';
import {
  Crown,
  Zap,
  User as UserIcon,
  ClipboardList,
  BarChart3,
  Star,
  MessageCircle,
  FileEdit,
  X
} from 'lucide-react';
import { premiumModalVariants, premiumBackdropVariants } from '../../animations/variants';
import '../../styles/components/modal-premium-base.css';

interface UserInfoModalProps {
  user: User;
  onClose: () => void;
  isOpen?: boolean;
}

/**
 * UserInfoModal - Display user profile information with premium Neo-Nightlife 2025 design
 */
const UserInfoModal: React.FC<UserInfoModalProps> = ({ user, onClose, isOpen = true }) => {
  const { t } = useTranslation();

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get role icon
  const getRoleIcon = (role: string, size = 24) => {
    switch (role) {
      case 'admin': return <Crown size={size} />;
      case 'moderator': return <Zap size={size} />;
      default: return <UserIcon size={size} />;
    }
  };

  // Get role color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#FFD700';
      case 'moderator': return '#00E5FF';
      default: return '#E879F9';
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const stats = [
    { icon: <Star size={24} />, value: 0, label: t('userInfo.favorites', 'Favorites'), color: '#FFD700' },
    { icon: <MessageCircle size={24} />, value: 0, label: t('userInfo.comments', 'Comments'), color: '#00E5FF' },
    { icon: <FileEdit size={24} />, value: 0, label: t('userInfo.contributions', 'Contributions'), color: '#E879F9' }
  ];

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="modal-premium-overlay"
          variants={premiumBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleOverlayClick}
        >
          <motion.div
            className="modal-premium modal-premium--small"
            variants={premiumModalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-info-modal-title"
          >
            {/* Close button */}
            <motion.button
              className="modal-premium__close"
              onClick={onClose}
              aria-label={t('common.close', 'Close')}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
            >
              <X size={18} />
            </motion.button>

            {/* Header with icon */}
            <div className="modal-premium__header modal-premium__header--with-icon">
              <motion.div
                className="modal-premium__icon modal-premium__icon--info"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
              >
                <UserIcon size={32} />
              </motion.div>
              <motion.h2
                id="user-info-modal-title"
                className="modal-premium__title modal-premium__title--info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {t('userInfo.title', 'User Profile')}
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
                  style={{ borderColor: getRoleColor(user.role), boxShadow: `0 0 30px ${getRoleColor(user.role)}40` }}
                  whileHover={{ scale: 1.05 }}
                >
                  {getRoleIcon(user.role, 48)}
                </motion.div>
                <h3 className="modal-premium__user-name">{user.pseudonym}</h3>
                <p className="modal-premium__user-email">{user.email}</p>
                <motion.span
                  className="modal-premium__role-badge"
                  style={{
                    borderColor: getRoleColor(user.role),
                    color: getRoleColor(user.role),
                    background: `linear-gradient(135deg, ${getRoleColor(user.role)}20, ${getRoleColor(user.role)}10)`,
                    boxShadow: `0 0 15px ${getRoleColor(user.role)}40`
                  }}
                  whileHover={{ scale: 1.05 }}
                >
                  {getRoleIcon(user.role, 16)} {user.role.toUpperCase()}
                </motion.span>
              </motion.div>

              {/* Separator */}
              <div className="modal-premium__separator" />

              {/* Account Info */}
              <motion.div
                className="modal-premium__section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h4 className="modal-premium__section-title">
                  <ClipboardList size={18} />
                  {t('userInfo.accountInfo', 'Account Information')}
                </h4>
                <div className="modal-premium__info-grid">
                  <div className="modal-premium__info-item">
                    <span className="modal-premium__info-label">{t('userInfo.memberSince', 'Member Since')}:</span>
                    <span className="modal-premium__info-value">{formatDate(user.created_at)}</span>
                  </div>
                  <div className="modal-premium__info-item">
                    <span className="modal-premium__info-label">{t('userInfo.accountType', 'Account Type')}:</span>
                    <span className="modal-premium__info-value">{user.account_type || 'user'}</span>
                  </div>
                </div>
              </motion.div>

              {/* Separator */}
              <div className="modal-premium__separator" />

              {/* Statistics Section */}
              <motion.div
                className="modal-premium__section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <h4 className="modal-premium__section-title">
                  <BarChart3 size={18} />
                  {t('userInfo.activity', 'Activity')}
                </h4>
                <div className="modal-premium__stats-grid">
                  {stats.map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      className="modal-premium__stat-card"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      whileHover={{ scale: 1.05, y: -4 }}
                      style={{ borderColor: `${stat.color}30` }}
                    >
                      <div className="modal-premium__stat-icon" style={{ color: stat.color }}>
                        {stat.icon}
                      </div>
                      <div className="modal-premium__stat-value" style={{ color: stat.color }}>
                        {stat.value}
                      </div>
                      <div className="modal-premium__stat-label">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* Footer */}
            <motion.div
              className="modal-premium__footer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{ justifyContent: 'center' }}
            >
              <motion.button
                className="modal-premium__btn-primary"
                onClick={onClose}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ width: '100%', maxWidth: '200px' }}
              >
                {t('common.close', 'Close')}
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Use portal to render at body level
  return createPortal(modalContent, document.body);
};

export default UserInfoModal;
