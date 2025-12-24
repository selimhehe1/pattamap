/**
 * BarDetailLoadingState
 * Loading and empty state components for BarDetailPage
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigateWithTransition } from '../../../hooks/useNavigateWithTransition';

interface BarLoadingProps {
  type: 'loading' | 'empty';
}

export const BarDetailLoadingState: React.FC<BarLoadingProps> = ({ type }) => {
  const { t } = useTranslation();
  const navigate = useNavigateWithTransition();

  if (type === 'loading') {
    return (
      <div className="loading-container-nightlife bg-nightlife-gradient-main establishment-page-container-nightlife page-content-with-header-nightlife">
        <div className="establishment-loading-container-nightlife">
          <div className="establishment-loading-icon-nightlife">
            💃
          </div>
          <div className="establishment-loading-text-nightlife">
            {t('barDetailPage.loadingText')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-container-nightlife bg-nightlife-gradient-main establishment-page-container-nightlife page-content-with-header-nightlife">
      <div className="establishment-empty-state-nightlife">
        <h2 className="establishment-empty-title-nightlife">
          {t('barDetailPage.emptyStateTitle')}
        </h2>
        <button
          onClick={() => navigate('/')}
          className="btn-primary-nightlife"
          aria-label={t('barDetailPage.ariaBackToMap')}
        >
          {t('barDetailPage.buttonBackToMap')}
        </button>
      </div>
    </div>
  );
};
