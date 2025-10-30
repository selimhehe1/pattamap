import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useEstablishment } from '../../hooks/useEstablishments';
import GirlsGallery from './GirlsGallery';
import BarInfoSidebar from './BarInfoSidebar';
import EstablishmentEditModal from '../Forms/EstablishmentEditModal';
import TabNavigation from './TabNavigation';
import { Employee, Establishment } from '../../types';
import { logger } from '../../utils/logger';
import toast from '../../utils/toast';
import LazyImage from '../Common/LazyImage';
import { parseEstablishmentId, generateEstablishmentUrl } from '../../utils/slugify';
import { SkeletonGallery } from '../Common/Skeleton';
import '../../styles/components/employee-profile.css';
import '../../styles/pages/establishment.css';
import '../../styles/components/photos.css';
import '../../styles/components/modals-app.css';
import '../../styles/layout/page-layout.css';

// Plus de données hardcodées - utilisation exclusive de l'API

interface BarDetailPageProps {}

const BarDetailPage: React.FC<BarDetailPageProps> = () => {
  const { t } = useTranslation();
  const { id: legacyId, slug } = useParams<{ id?: string; zone?: string; slug?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();

  // Parse ID from slug or use legacy ID
  const establishmentId = slug ? parseEstablishmentId(slug) : legacyId;
  const id = establishmentId;

  // ⚡ React Query hooks - Cache intelligent pour establishment
  const { data: bar = null, isLoading: barLoading } = useEstablishment(id || null);

  // Query pour les employees de cet établissement (includes freelances for nightclubs - v10.3)
  // 🔧 FIX: Use public /api/employees endpoint instead of owner-only /api/establishments/:id/employees
  const { data: girls = [], isLoading: girlsLoading } = useQuery({
    queryKey: ['employees', 'establishment', id],
    queryFn: async (): Promise<Employee[]> => {
      if (!id) return [];
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/employees?establishment_id=${id}&status=approved`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.employees || [];
    },
    enabled: !!id && !!bar, // Ne charge que si on a un ID et que le bar est chargé
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // Local states
  const [selectedGirl, setSelectedGirl] = useState<Employee | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false); // For modal form submission
  const [activeTab, setActiveTab] = useState<'employees' | 'info'>('employees');
  const [isMobile, setIsMobile] = useState(
    window.innerWidth <= 768 || window.innerHeight <= 500
  );

  const isAdmin = user?.role === 'admin';

  // Redirect if no ID
  useEffect(() => {
    if (!id) {
      logger.error('❌ No establishment ID provided, redirecting to home');
      navigate('/');
    }
  }, [id, navigate]);

  // Redirect if bar not found after loading
  useEffect(() => {
    if (!barLoading && !bar && id) {
      logger.error('Bar not found:', id);
      navigate('/');
    }
  }, [bar, barLoading, id, navigate]);

  // 301 Redirect: Legacy URL → SEO URL
  useEffect(() => {
    if (bar && legacyId && !slug) {
      // User accessed via old /bar/:id URL, redirect to new /bar/:zone/:slug URL
      const seoUrl = generateEstablishmentUrl(bar.id, bar.name, bar.zone || 'other');
      logger.info(`🔀 Redirecting legacy URL /bar/${legacyId} → ${seoUrl}`);
      navigate(seoUrl, { replace: true }); // replace = 301 redirect
    }
  }, [bar, legacyId, slug, navigate]);

  // Mobile detection - Update on window resize (includes landscape)
  useEffect(() => {
    const handleResize = () => {
      // Mobile if: width ≤ 768px OR height ≤ 500px (landscape mode)
      setIsMobile(window.innerWidth <= 768 || window.innerHeight <= 500);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const handleEditSubmit = async (establishmentData: any) => {
    if (!bar || !id) return;

    setIsSubmittingModal(true);
    try {
      // Helper to convert category_id from STRING back to INTEGER for DB
      const categoryIdToInt = (catId: string | number): number => {
        // If already a number, return it
        if (typeof catId === 'number') return catId;

        // Extract number from "cat-006" format
        const match = catId.match(/cat-(\d+)/);
        return match ? parseInt(match[1], 10) : 1;
      };

      // Clean and prepare data for API
      const cleanedData = {
        name: establishmentData.name,
        address: establishmentData.address,
        description: establishmentData.description,
        phone: establishmentData.phone,
        website: establishmentData.website,
        logo_url: establishmentData.logo_url,
        opening_hours: establishmentData.opening_hours,
        // Social media links (v10.1)
        instagram: establishmentData.instagram || null,
        twitter: establishmentData.twitter || null,
        tiktok: establishmentData.tiktok || null,
        category_id: categoryIdToInt(establishmentData.category_id), // Convert STRING → INTEGER
        zone: establishmentData.zone,
        grid_row: bar.grid_row, // Preserve map position
        grid_col: bar.grid_col, // Preserve map position
        ladydrink: establishmentData.pricing?.ladydrink || establishmentData.ladydrink,
        barfine: establishmentData.pricing?.barfine || establishmentData.barfine,
        rooms: establishmentData.pricing?.rooms?.price || establishmentData.rooms,
        pricing: establishmentData.pricing
      };

      const currentValues = {
        name: bar.name,
        address: bar.address,
        description: bar.description,
        phone: bar.phone,
        website: bar.website,
        logo_url: bar.logo_url,
        opening_hours: bar.opening_hours,
        // Social media links (v10.1)
        instagram: bar.instagram || null,
        twitter: bar.twitter || null,
        tiktok: bar.tiktok || null,
        zone: bar.zone,
        category_id: bar.category_id,
        ladydrink: bar.ladydrink,
        barfine: bar.barfine,
        rooms: bar.rooms,
        pricing: bar.pricing
      };

      if (user?.role === 'admin' || user?.role === 'moderator') {
        // Admin/Moderator -> édition directe
        logger.info('🔍 Sending PUT request with data:', {
          cleanedData,
          pricing: cleanedData.pricing,
          consumablesCount: cleanedData.pricing?.consumables?.length || 0
        });

        const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/establishments/${id}`, {
          method: 'PUT',
          body: JSON.stringify(cleanedData) // Use cleanedData instead of raw establishmentData
        });

        if (response.ok) {
          const responseData = await response.json();
          logger.info('✅ PUT response received:', {
            responseData,
            responsePricing: responseData.establishment?.pricing,
            responseConsumablesCount: responseData.establishment?.pricing?.consumables?.length || 0
          });

          setShowEditModal(false);
          toast.success(t('barDetailPage.toastSuccessApplied'));

          // Attendre 2 secondes pour voir les logs avant reload
          await new Promise(resolve => setTimeout(resolve, 2000));
          window.location.reload();
        } else {
          throw new Error(t('barDetailPage.errorUpdateFailed'));
        }
      } else {
        // User normal -> création proposal
        const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/edit-proposals`, {
          method: 'POST',
          body: JSON.stringify({
            item_type: 'establishment',
            item_id: id,
            proposed_changes: cleanedData, // Use cleanedData
            current_values: currentValues
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.auto_approved) {
            toast.success(t('barDetailPage.toastSuccessApplied'));
            window.location.reload();
          } else {
            toast.success(t('barDetailPage.toastSuccessProposal'));
          }
          setShowEditModal(false);
        } else {
          throw new Error(t('barDetailPage.errorCreateProposal'));
        }
      }
    } catch (error) {
      logger.error('Error submitting edit:', error);
      toast.error(t('barDetailPage.toastErrorSubmit'));
    } finally {
      setIsSubmittingModal(false);
    }
  };

  if (barLoading) {
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

  if (!bar) {
    return (
      <div className="loading-container-nightlife bg-nightlife-gradient-main establishment-page-container-nightlife page-content-with-header-nightlife">
        <div className="establishment-empty-state-nightlife">
          <h2 className="establishment-empty-title-nightlife">{t('barDetailPage.emptyStateTitle')}</h2>
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
  }

  return (
    <div id="main-content" className="bg-nightlife-gradient-main establishment-page-container-nightlife page-content-with-header-nightlife" tabIndex={-1}>
      <style>
        {`
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(100px); }
            20% { opacity: 1; transform: translateX(0); }
            80% { opacity: 1; transform: translateX(0); }
            100% { opacity: 0; transform: translateX(100px); }
          }
        `}
      </style>

      {/* Header du bar */}
      <div className="establishment-header-nightlife">
        {/* Edit Button - Floating (position absolute, ne prend pas d'espace) */}
        {user && (
          <button
            onClick={() => setShowEditModal(true)}
            className="establishment-edit-icon-floating-nightlife"
            aria-label={isAdmin ? t('barDetailPage.ariaEditBar', { name: bar.name }) : t('barDetailPage.ariaSuggestEdit', { name: bar.name })}
            title={isAdmin ? t('barDetailPage.titleEdit') : t('barDetailPage.titleSuggestEdit')}
          >
            ✏️
          </button>
        )}

        <div className="establishment-header-content-nightlife">
          {/* Logo Hero - Gauche */}
          {bar.logo_url && (
            <div className="establishment-logo-hero-nightlife">
              <LazyImage
                src={bar.logo_url}
                alt={`${bar.name} logo`}
                cloudinaryPreset="establishmentLogo"
                className="establishment-logo-header-image-nightlife"
                objectFit="contain"
              />
            </div>
          )}

          {/* Text content - Centre (occupe tout l'espace disponible) */}
          <div className="establishment-text-content-nightlife">
            <h1 className="establishment-name-nightlife">
              {bar.name}
            </h1>
            <p className="establishment-meta-nightlife">
              {bar.description || t('barDetailPage.defaultDescription')}
            </p>

            {/* Status et Horaires */}
            <div className="sidebar-status-container-nightlife">
              <span className="sidebar-status-indicator-nightlife" />
              <span className="sidebar-status-text-nightlife">
                {t('barDetailPage.statusOpenNow')} • {bar.opening_hours?.open || '14:00'} - {bar.opening_hours?.close || '02:00'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Message de succès */}
      {showSuccessMessage && (
        <div className="btn-secondary-nightlife establishment-success-message-nightlife">
          ✅ {t('barDetailPage.successMessage')}
        </div>
      )}

      {/* Tab Navigation - Mobile Only */}
      {isMobile && (
        <div style={{ padding: '0 var(--spacing-md)' }}>
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            employeeCount={girls.length}
          />
        </div>
      )}

      {/* Contenu principal */}
      {isMobile ? (
        // MOBILE: Show ONLY active tab content
        <div style={{ padding: '0 var(--spacing-md) var(--spacing-md)' }}>
          {activeTab === 'employees' ? (
            // Employees Tab
            <div className="establishment-main-content-nightlife">
              {girlsLoading ? (
                <SkeletonGallery count={6} variant="employee" />
              ) : (
                <GirlsGallery
                  girls={girls}
                  onGirlClick={setSelectedGirl}
                  selectedGirl={selectedGirl}
                />
              )}
            </div>
          ) : (
            // Bar Info Tab
            <div className="establishment-sidebar-nightlife" style={{ position: 'static', top: 'auto' }}>
              {bar && (
                <BarInfoSidebar
                  bar={bar}
                  employees={girls}
                  isEditMode={false}
                  editedBar={null}
                  onUpdateField={undefined}
                />
              )}
            </div>
          )}
        </div>
      ) : (
        // DESKTOP: Show both side by side (current behavior)
        <div className="establishment-layout-nightlife">
          {/* Zone principale des serveuses (80%) */}
          <div className="establishment-main-content-nightlife">
            {girlsLoading ? (
              <SkeletonGallery count={6} variant="employee" />
            ) : (
              <GirlsGallery
                girls={girls}
                onGirlClick={setSelectedGirl}
                selectedGirl={selectedGirl}
              />
            )}
          </div>

          {/* Sidebar infos bar (20%) */}
          <div className="establishment-sidebar-nightlife">
            {bar && (
              <BarInfoSidebar
                bar={bar}
                employees={girls}
                isEditMode={false}
                editedBar={null}
                onUpdateField={undefined}
              />
            )}
          </div>
        </div>
      )}

      {/* Edit Establishment Modal - New EstablishmentEditModal */}
      {showEditModal && bar && (
        <EstablishmentEditModal
          key={bar.id} // Force React to remount when bar changes (ensures useState re-initializes)
          onSubmit={handleEditSubmit}
          onCancel={() => setShowEditModal(false)}
          initialData={bar}
          isLoading={isSubmittingModal}
          isSuggestion={!isAdmin && user?.role !== 'moderator'}
        />
      )}

      {/* CSS pour les animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        
        @media (max-width: 768px) {
          .bar-detail-container {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
            padding: 20px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BarDetailPage;