/**
 * BarDetailLoadingState
 * Loading and empty state components for BarDetailPage
 *
 * Uses SkeletonDetailPage for consistent loading experience
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigateWithTransition } from '../../../hooks/useNavigateWithTransition';
import { SkeletonDetailPage } from '../../Common/Skeleton';

interface BarLoadingProps {
  type: 'loading' | 'empty';
}

export const BarDetailLoadingState: React.FC<BarLoadingProps> = ({ type }) => {
  const { t } = useTranslation();
  const navigate = useNavigateWithTransition();

  if (type === 'loading') {
    return (
      <SkeletonDetailPage
        variant="establishment"
        showSidebar={true}
        galleryCount={6}
      />
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
          className="btn btn--primary"
          aria-label={t('barDetailPage.ariaBackToMap')}
        >
          {t('barDetailPage.buttonBackToMap')}
        </button>
      </div>
    </div>
  );
};
