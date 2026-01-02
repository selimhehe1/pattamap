import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import { getSocialMediaIcon, getSocialMediaUrl } from './socialMediaIcons';
import type { SocialMediaLinksProps } from './types';

/**
 * SocialMediaLinks Component
 *
 * Displays social media contact links for an employee profile.
 * Uses memoized icons from socialMediaIcons.tsx.
 */
const SocialMediaLinks: React.FC<SocialMediaLinksProps> = ({
  socialMedia,
  employeeName
}) => {
  const { t } = useTranslation();

  // Check if there are any social media links
  const hasSocialMedia = Object.keys(socialMedia).some(key => socialMedia[key]);

  if (!hasSocialMedia) {
    return null;
  }

  return (
    <motion.div
      className="profile-v2-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <h3 className="profile-v2-section-title">
        <MessageSquare size={16} />
        {t('profile.contact', 'Contact')} {employeeName}
      </h3>

      <div className="profile-v2-social-links">
        {Object.entries(socialMedia).map(([platform, username]) => {
          if (!username) return null;
          return (
            <a
              key={platform}
              href={getSocialMediaUrl(platform, username)}
              target="_blank"
              rel="noopener noreferrer"
              className={`profile-v2-social-link profile-v2-social-link--${platform}`}
            >
              <span className="profile-v2-social-icon">
                {getSocialMediaIcon(platform)}
              </span>
              <span className="profile-v2-social-name">{platform}</span>
            </a>
          );
        })}
      </div>
    </motion.div>
  );
};

export default SocialMediaLinks;
