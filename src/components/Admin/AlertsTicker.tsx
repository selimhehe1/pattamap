import React from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  MessageSquare,
  BadgeCheck,
  Gem,
  Link2,
  CheckCircle
} from 'lucide-react';

interface AlertItem {
  id: string;
  type: 'critical' | 'warning' | 'info';
  icon: React.ReactNode;
  text: string;
  count: number;
  onClick: () => void;
}

interface AlertsTickerProps {
  alerts: AlertItem[];
  isCollapsed: boolean;
}

const AlertsTicker: React.FC<AlertsTickerProps> = ({ alerts, isCollapsed }) => {
  // Filter out alerts with 0 count
  const activeAlerts = alerts.filter(alert => alert.count > 0);

  // Only duplicate if we have enough alerts to warrant scrolling
  // With few alerts, just show them once (no scrolling needed)
  const shouldAnimate = activeAlerts.length >= 3;
  const duplicatedAlerts = shouldAnimate
    ? [...activeAlerts, ...activeAlerts, ...activeAlerts]
    : activeAlerts;

  if (activeAlerts.length === 0) {
    return (
      <div
        className="alerts-ticker alerts-ticker--empty"
        style={{
          left: isCollapsed ? 'var(--cmd-sidebar-collapsed-width)' : 'var(--cmd-sidebar-width)'
        }}
      >
        <div className="alerts-ticker__empty">
          <CheckCircle size={18} />
          <span>All systems nominal — No pending items</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="alerts-ticker"
      style={{
        left: isCollapsed ? 'var(--cmd-sidebar-collapsed-width)' : 'var(--cmd-sidebar-width)'
      }}
    >
      {/* Label */}
      <div className="alerts-ticker__label">
        <span className="alerts-ticker__label-dot" />
        <span>PENDING</span>
      </div>

      {/* Scrolling Track */}
      <div className="alerts-ticker__track">
        <motion.div
          className="alerts-ticker__content"
          initial={{ x: '0%' }}
          animate={shouldAnimate ? { x: '-33.33%' } : { x: '0%' }}
          transition={shouldAnimate ? {
            x: {
              repeat: Infinity,
              repeatType: 'loop',
              duration: 20,
              ease: 'linear'
            }
          } : undefined}
          style={{ width: 'max-content' }}
        >
          {duplicatedAlerts.map((alert, index) => (
            <button
              key={`${alert.id}-${index}`}
              className={`alert-item alert-item--${alert.type}`}
              onClick={alert.onClick}
            >
              <span className="alert-item__icon">
                {alert.icon}
              </span>
              <span className="alert-item__text">
                {alert.text}
              </span>
              <span className="alert-item__count">
                {alert.count}
              </span>
            </button>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

// Helper function to create alerts from stats
export const createAlertsFromStats = (
  stats: {
    pendingEstablishments: number;
    pendingEmployees: number;
    pendingClaims: number;
    pendingComments: number;
    reportedComments: number;
    pendingVerifications?: number;
    pendingVIPVerifications?: number;
  },
  onTabChange: (tab: string) => void
): AlertItem[] => {
  const alerts: AlertItem[] = [];

  if (stats.pendingEstablishments > 0) {
    alerts.push({
      id: 'establishments',
      type: 'warning',
      icon: <Building2 size={16} />,
      text: 'Establishments pending',
      count: stats.pendingEstablishments,
      onClick: () => onTabChange('establishments')
    });
  }

  if (stats.pendingEmployees > 0) {
    alerts.push({
      id: 'employees',
      type: 'warning',
      icon: <Users size={16} />,
      text: 'Employees pending',
      count: stats.pendingEmployees,
      onClick: () => onTabChange('employees')
    });
  }

  if (stats.pendingClaims > 0) {
    alerts.push({
      id: 'claims',
      type: 'info',
      icon: <Link2 size={16} />,
      text: 'Profile claims',
      count: stats.pendingClaims,
      onClick: () => onTabChange('employee-claims')
    });
  }

  const totalComments = stats.pendingComments + stats.reportedComments;
  if (totalComments > 0) {
    alerts.push({
      id: 'comments',
      type: stats.reportedComments > 0 ? 'critical' : 'warning',
      icon: <MessageSquare size={16} />,
      text: stats.reportedComments > 0 ? 'Reported comments' : 'Comments pending',
      count: totalComments,
      onClick: () => onTabChange('comments')
    });
  }

  if (stats.pendingVerifications && stats.pendingVerifications > 0) {
    alerts.push({
      id: 'verifications',
      type: 'info',
      icon: <BadgeCheck size={16} />,
      text: 'Verifications pending',
      count: stats.pendingVerifications,
      onClick: () => onTabChange('verifications')
    });
  }

  if (stats.pendingVIPVerifications && stats.pendingVIPVerifications > 0) {
    alerts.push({
      id: 'vip',
      type: 'warning',
      icon: <Gem size={16} />,
      text: 'VIP payments pending',
      count: stats.pendingVIPVerifications,
      onClick: () => onTabChange('vip-verifications')
    });
  }

  return alerts;
};

export default AlertsTicker;
