import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Shield as _Shield, Trophy } from 'lucide-react';

interface CommandHeaderProps {
  user: {
    pseudonym: string;
    role: string;
  };
  onUserClick: () => void;
  isCollapsed: boolean;
}

const CommandHeader: React.FC<CommandHeaderProps> = ({
  user,
  onUserClick,
  isCollapsed
}) => {
  const { t } = useTranslation();
  const [time, setTime] = useState(new Date());

  // Live clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return {
      hours: date.getHours().toString().padStart(2, '0'),
      minutes: date.getMinutes().toString().padStart(2, '0'),
      seconds: date.getSeconds().toString().padStart(2, '0')
    };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).toUpperCase();
  };

  const { hours, minutes, seconds } = formatTime(time);

  return (
    <header
      className="command-header"
      style={{
        left: isCollapsed ? 'var(--cmd-sidebar-collapsed-width)' : 'var(--cmd-sidebar-width)'
      }}
    >
      {/* Left Section - Title & Status */}
      <div className="command-header__left">
        <div className="command-header__title-group">
          <h1 className="command-header__title">COMMAND CENTER</h1>
          <span className="command-header__subtitle">System Status: Operational</span>
        </div>

        {/* Status Indicators */}
        <div className="command-header__status">
          <motion.div
            className="status-dot status-dot--green"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            title="API: Online"
          />
          <motion.div
            className="status-dot status-dot--green"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
            title="Database: Connected"
          />
          <motion.div
            className="status-dot status-dot--green"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 }}
            title="Storage: Active"
          />
        </div>
      </div>

      {/* Center Section - Digital Clock */}
      <div className="command-header__center">
        <div className="digital-clock">
          <span>{hours}</span>
          <span className="digital-clock__separator">:</span>
          <span>{minutes}</span>
          <span className="digital-clock__separator">:</span>
          <span style={{ opacity: 0.7 }}>{seconds}</span>
        </div>
        <span className="digital-clock__date">{formatDate(time)}</span>
      </div>

      {/* Right Section - User Badge */}
      <div className="command-header__right">
        <motion.button
          className="admin-badge-holographic"
          onClick={onUserClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          title={t('admin.viewYourProfile')}
        >
          <div className="admin-badge__avatar">
            {user.pseudonym.charAt(0).toUpperCase()}
          </div>
          <div className="admin-badge__info">
            <span className="admin-badge__name">{user.pseudonym}</span>
            <span className="admin-badge__role">
              <Trophy size={10} style={{ marginRight: '4px' }} />
              {user.role}
            </span>
          </div>
        </motion.button>
      </div>
    </header>
  );
};

export default CommandHeader;
