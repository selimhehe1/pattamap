import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { PartyPopper, Sparkles, Star, Zap } from 'lucide-react';
import { useGamification } from '../../contexts/GamificationContext';
import './XPToastNotifications.css';

/**
 * XP Toast Notifications
 * Displays animated +XP notifications when user earns XP
 * Auto-dismisses after 3 seconds
 */
const XPToastNotifications: React.FC = () => {
  const { t } = useTranslation();
  const { xpNotifications, getLevelIcon } = useGamification();

  // Friendly reason labels (using translation keys)
  const getReasonLabel = (reason: string): string => {
    const reasonKeyMap: Record<string, string> = {
      review_created: 'gamification.toast.reviewCreated',
      photo_uploaded: 'gamification.toast.photoUploaded',
      check_in: 'gamification.toast.checkIn',
      helpful_vote_received: 'gamification.toast.helpfulVote',
      validation_vote: 'gamification.toast.voteCast',
      profile_correction_approved: 'gamification.toast.editApproved',
      friend_invited: 'gamification.toast.friendInvited',
      mission_completed: 'gamification.toast.missionComplete',
      badge_earned: 'gamification.toast.badgeUnlocked',
      streak_bonus: 'gamification.toast.streakBonus'
    };
    return t(reasonKeyMap[reason] || reason);
  };

  return (
    <div className="xp-toast-container">
      <AnimatePresence>
        {xpNotifications.map((notification) => {
          // Check if this is a level-up notification
          const isLevelUp = notification.reason.startsWith('level_up:');
          const levelUpData = isLevelUp ? notification.reason.split(':') : null;
          const newLevel = levelUpData ? parseInt(levelUpData[1], 10) : null;
          const levelName = levelUpData ? levelUpData[2] : null;
          const levelIcon = newLevel ? getLevelIcon(newLevel) : null;

          return isLevelUp ? (
            // LEVEL UP NOTIFICATION (Special)
            <motion.div
              key={notification.timestamp}
              className="xp-toast xp-toast-levelup"
              initial={{ opacity: 0, scale: 0.5, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -50 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 20
              }}
            >
              {/* Level Up Header */}
              <div className="xp-toast-levelup-header">
                <PartyPopper size={20} style={{ marginRight: '6px' }} /> {t('gamification.level.up')} <PartyPopper size={20} style={{ marginLeft: '6px' }} />
              </div>

              {/* Level Icon & Number */}
              <div className="xp-toast-levelup-icon">
                <span className="level-icon">{levelIcon}</span>
                <span className="level-number">{t('gamification.level.current')} {newLevel}</span>
              </div>

              {/* Level Name */}
              <div className="xp-toast-levelup-name">
                {levelName}
              </div>

              {/* Animated sparkles (more intense) */}
              <div className="xp-toast-sparkles">
                {[...Array(6)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="xp-sparkle"
                    animate={{
                      y: [-10, -30],
                      x: [(-15 + i * 6), (15 - i * 6)],
                      opacity: [1, 0],
                      scale: [1, 2]
                    }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: i * 0.1 }}
                  >
                    {i % 3 === 0 ? <Sparkles size={14} /> : i % 3 === 1 ? <Star size={14} /> : <Zap size={14} />}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          ) : (
            // REGULAR XP NOTIFICATION
            <motion.div
              key={notification.timestamp}
              className="xp-toast"
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -100, scale: 0.8 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25
              }}
            >
              {/* XP Amount */}
              <div className="xp-toast-amount">
                +{notification.xpAmount} {t('gamification.xp.points')}
              </div>

              {/* Reason */}
              <div className="xp-toast-reason">
                {getReasonLabel(notification.reason)}
              </div>

              {/* Animated sparkles */}
              <div className="xp-toast-sparkles">
                <motion.span
                  className="xp-sparkle"
                  animate={{
                    y: [-10, -20],
                    x: [-5, 5],
                    opacity: [1, 0],
                    scale: [1, 1.5]
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                  <Sparkles size={14} />
                </motion.span>
                <motion.span
                  className="xp-sparkle"
                  animate={{
                    y: [-10, -25],
                    x: [5, -5],
                    opacity: [1, 0],
                    scale: [1, 1.3]
                  }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
                >
                  <Star size={14} />
                </motion.span>
                <motion.span
                  className="xp-sparkle"
                  animate={{
                    y: [-10, -20],
                    x: [0, 0],
                    opacity: [1, 0],
                    scale: [1, 1.4]
                  }}
                  transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
                >
                  <Zap size={14} />
                </motion.span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default XPToastNotifications;
