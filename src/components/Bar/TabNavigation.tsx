import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../styles/components/tab-navigation.css';

interface TabNavigationProps {
  activeTab: 'employees' | 'info';
  onTabChange: (tab: 'employees' | 'info') => void;
  employeeCount: number;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  employeeCount
}) => {
  const { t } = useTranslation();

  return (
    <div className="tab-navigation-nightlife">
      <button
        className={`tab-button-nightlife ${activeTab === 'employees' ? 'tab-active-nightlife' : ''}`}
        onClick={() => onTabChange('employees')}
        aria-label={t('barDetailPage.tabNavigation.ariaViewLineup', { count: employeeCount })}
        aria-current={activeTab === 'employees' ? 'page' : undefined}
      >
        <span className="tab-icon-nightlife">👥</span>
        <span className="tab-label-nightlife">{t('barDetailPage.tabNavigation.lineup')}</span>
        {employeeCount > 0 && (
          <span className="tab-badge-nightlife">{employeeCount}</span>
        )}
      </button>

      <button
        className={`tab-button-nightlife ${activeTab === 'info' ? 'tab-active-nightlife' : ''}`}
        onClick={() => onTabChange('info')}
        aria-label={t('barDetailPage.tabNavigation.ariaViewDetails')}
        aria-current={activeTab === 'info' ? 'page' : undefined}
      >
        <span className="tab-icon-nightlife">ℹ️</span>
        <span className="tab-label-nightlife">{t('barDetailPage.tabNavigation.details')}</span>
      </button>
    </div>
  );
};

export default TabNavigation;
