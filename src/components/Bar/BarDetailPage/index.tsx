/**
 * BarDetailPage
 * Main page component for establishment detail view
 *
 * Refactored into modular components:
 * - BarDetailHeader: Logo, title, status
 * - BarDetailContent: Mobile tabs / desktop layout
 * - BarDetailLoadingState: Loading and empty states
 * - useBarDetailPage: Hook for state management
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useSecureFetch } from '../../../hooks/useSecureFetch';
import { useBarDetailPage } from './hooks/useBarDetailPage';
import { BarDetailLoadingState } from './BarDetailLoadingState';
import { BarDetailHeader } from './BarDetailHeader';
import { BarDetailContent } from './BarDetailContent';
import EstablishmentEditModal from '../../Forms/EstablishmentEditModal';
import { logger } from '../../../utils/logger';
import notification from '../../../utils/notification';
import '../../../styles/components/employee-profile.css';
import '../../../styles/pages/establishment.css';
import '../../../styles/components/photos.css';
// modals-app.css removed - now using unified modals.css from App.tsx
import '../../../styles/layout/page-layout.css';

const BarDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();

  const {
    bar,
    girls,
    barLoading,
    girlsLoading,
    selectedGirl,
    setSelectedGirl,
    showEditModal,
    setShowEditModal,
    activeTab,
    setActiveTab,
    isMobile,
    showSuccessMessage,
    isAdmin,
    establishmentId,
  } = useBarDetailPage();

  const [isSubmittingModal, setIsSubmittingModal] = React.useState(false);

  const handleEditSubmit = async (establishmentData: Record<string, unknown>) => {
    if (!bar || !establishmentId) return;

    setIsSubmittingModal(true);
    try {
      // Helper to convert category_id from STRING back to INTEGER for DB
      const categoryIdToInt = (catId: string | number): number => {
        if (typeof catId === 'number') return catId;
        const match = String(catId).match(/cat-(\d+)/);
        return match ? parseInt(match[1], 10) : 1;
      };

      // Clean and prepare data for API
      const pricing = establishmentData.pricing as Record<string, unknown> | undefined;
      const cleanedData = {
        name: establishmentData.name,
        address: establishmentData.address,
        description: establishmentData.description,
        phone: establishmentData.phone,
        website: establishmentData.website,
        logo_url: establishmentData.logo_url,
        opening_hours: establishmentData.opening_hours,
        instagram: establishmentData.instagram || null,
        twitter: establishmentData.twitter || null,
        tiktok: establishmentData.tiktok || null,
        category_id: categoryIdToInt(establishmentData.category_id as string | number),
        zone: establishmentData.zone,
        grid_row: bar.grid_row,
        grid_col: bar.grid_col,
        ladydrink: pricing?.ladydrink || establishmentData.ladydrink,
        barfine: pricing?.barfine || establishmentData.barfine,
        rooms: (pricing?.rooms as Record<string, unknown>)?.price || establishmentData.rooms,
        pricing: establishmentData.pricing,
      };

      const currentValues = {
        name: bar.name,
        address: bar.address,
        description: bar.description,
        phone: bar.phone,
        website: bar.website,
        logo_url: bar.logo_url,
        opening_hours: bar.opening_hours,
        instagram: bar.instagram || null,
        twitter: bar.twitter || null,
        tiktok: bar.tiktok || null,
        zone: bar.zone,
        category_id: bar.category_id,
        ladydrink: bar.ladydrink,
        barfine: bar.barfine,
        rooms: bar.rooms,
        pricing: bar.pricing,
      };

      if (user?.role === 'admin' || user?.role === 'moderator') {
        // Admin/Moderator -> direct edit
        logger.info('Sending PUT request with data:', {
          cleanedData,
          pricing: cleanedData.pricing,
        });

        const response = await secureFetch(
          `${import.meta.env.VITE_API_URL}/api/establishments/${establishmentId}`,
          {
            method: 'PUT',
            body: JSON.stringify(cleanedData),
          }
        );

        if (response.ok) {
          setShowEditModal(false);
          notification.success(t('barDetailPage.toastSuccessApplied'));
          await new Promise((resolve) => setTimeout(resolve, 2000));
          window.location.reload();
        } else {
          throw new Error(t('barDetailPage.errorUpdateFailed'));
        }
      } else {
        // Normal user -> create proposal
        const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/edit-proposals`, {
          method: 'POST',
          body: JSON.stringify({
            item_type: 'establishment',
            item_id: establishmentId,
            proposed_changes: cleanedData,
            current_values: currentValues,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.auto_approved) {
            notification.success(t('barDetailPage.toastSuccessApplied'));
            window.location.reload();
          } else {
            notification.success(t('barDetailPage.toastSuccessProposal'));
          }
          setShowEditModal(false);
        } else {
          throw new Error(t('barDetailPage.errorCreateProposal'));
        }
      }
    } catch (error) {
      logger.error('Error submitting edit:', error);
      notification.error(t('barDetailPage.toastErrorSubmit'));
    } finally {
      setIsSubmittingModal(false);
    }
  };

  // Loading state
  if (barLoading) {
    return <BarDetailLoadingState type="loading" />;
  }

  // Empty state
  if (!bar) {
    return <BarDetailLoadingState type="empty" />;
  }

  return (
    <div
      id="main-content"
      className="bg-nightlife-gradient-main establishment-page-container-nightlife page-content-with-header-nightlife"
      tabIndex={-1}
    >
      {/* Scroll Progress Bar */}
      <div className="scroll-progress-bar-gradient" aria-hidden="true" />

      {/* Inline animations */}
      <style>
        {`
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(100px); }
            20% { opacity: 1; transform: translateX(0); }
            80% { opacity: 1; transform: translateX(0); }
            100% { opacity: 0; transform: translateX(100px); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.1); }
          }
        `}
      </style>

      {/* Header */}
      <BarDetailHeader
        bar={bar}
        isAdmin={isAdmin}
        hasUser={!!user}
        onEditClick={() => setShowEditModal(true)}
        employeeCount={girls.length}
      />

      {/* Main content */}
      <BarDetailContent
        bar={bar}
        girls={girls}
        girlsLoading={girlsLoading}
        selectedGirl={selectedGirl}
        setSelectedGirl={setSelectedGirl}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobile={isMobile}
        showSuccessMessage={showSuccessMessage}
      />

      {/* Edit Establishment Modal */}
      {showEditModal && bar && (
        <EstablishmentEditModal
          key={bar.id}
          onSubmit={handleEditSubmit}
          onCancel={() => setShowEditModal(false)}
          initialData={bar}
          isLoading={isSubmittingModal}
          isSuggestion={!isAdmin && user?.role !== 'moderator'}
        />
      )}
    </div>
  );
};

export default BarDetailPage;
