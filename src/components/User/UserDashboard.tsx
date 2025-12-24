import React, { useState, useEffect } from 'react';
import { useNavigateWithTransition } from '../../hooks/useNavigateWithTransition';
import { Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useFavorites, useRemoveFavorite } from '../../hooks/useFavorites';
import StarRating from '../Common/StarRating';
import { GirlProfile } from '../../routes/lazyComponents';
import PhotoGalleryModal from '../Common/PhotoGalleryModal';
import EditMyProfileModal from '../Employee/EditMyProfileModal';
import { logger } from '../../utils/logger';
import LazyImage from '../Common/LazyImage';
import { generateEstablishmentUrl } from '../../utils/slugify';
import { SkeletonGallery } from '../Common/Skeleton';
import '../../styles/components/favorite-cards.css';
import '../../styles/pages/user-dashboard.css';
import '../../styles/layout/page-layout.css';

const UserDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigateWithTransition();
  const { openModal, closeModal } = useModal();
  const { secureFetch } = useSecureFetch();

  // ⚡ React Query hooks - Cache intelligent et optimistic updates
  const { data: favorites = [], isLoading } = useFavorites();
  const removeFavoriteMutation = useRemoveFavorite();

  const [photoGallery, setPhotoGallery] = useState<{ photos: string[]; employeeName: string } | null>(null);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  const handleRemoveFavorite = (employeeId: string) => {
    // Optimistic update automatique via React Query
    removeFavoriteMutation.mutate(employeeId);
  };

  const handleOpenProfile = async (employeeId: string) => {
    try {
      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/employees/${employeeId}`);
      if (response.ok) {
        const data = await response.json();
        openModal('user-favorite-profile', GirlProfile, {
          girl: data.employee,
          onClose: () => closeModal('user-favorite-profile')
        }, {
          size: 'fullscreen',
          closeOnOverlayClick: true,
          showCloseButton: false
        });
      }
    } catch (error) {
      logger.error('Failed to load employee:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-nightlife-gradient-main page-content-with-header-nightlife">
        <div className="page-container-nightlife">
          <div className="header-centered-nightlife">
            <h1 className="header-title-nightlife">
              ⭐ {t('userDashboard.pageTitle')}
            </h1>
            <p className="header-subtitle-nightlife">
              {t('userDashboard.pageSubtitle')}
            </p>
          </div>
          <SkeletonGallery count={6} variant="employee" />
        </div>
      </div>
    );
  }

  return (
    <div id="main-content" className="bg-nightlife-gradient-main page-content-with-header-nightlife" tabIndex={-1}>
      {/* Bouton retour en position absolue */}
      <button
        onClick={() => navigate('/')}
        className="back-button-absolute-nightlife"
        style={{ top: '20px' }}
      >
        {t('userDashboard.buttonBackHome')}
      </button>

      <div className="page-container-nightlife">
        <div className="header-centered-nightlife">
          <h1 className="header-title-nightlife">
            ⭐ {t('userDashboard.pageTitle')}
          </h1>
          <p className="header-subtitle-nightlife">
            {t('userDashboard.pageSubtitle')}
          </p>

          {/* Edit Profile Button - Only for claimed employees */}
          {user?.linked_employee_id && (
            <button
              onClick={() => setIsEditProfileModalOpen(true)}
              className="btn-nightlife-base btn-primary-nightlife mt-4 flex items-center gap-2 mx-auto"
            >
              <Edit size={18} />
              {t('userDashboard.buttonEditProfile')}
            </button>
          )}
        </div>

      {favorites.length === 0 ? (
        <div className="empty-state-container-nightlife">
          <h3 className="text-primary-nightlife" style={{ fontSize: '24px', marginBottom: '15px' }}>
            📭 {t('userDashboard.emptyStateTitle')}
          </h3>
          <p className="text-muted-nightlife" style={{ marginBottom: '30px' }}>
            {t('userDashboard.emptyStateMessage')}
          </p>
          <button
            onClick={() => navigate('/search')}
            className="btn-nightlife-base btn-primary-nightlife"
          >
            🔍 {t('userDashboard.buttonBrowseEmployees')}
          </button>
        </div>
      ) : (
        <div className="grid-enhanced-nightlife scroll-reveal-stagger">
          {favorites.map((favorite) => (
            <div
              key={favorite.id}
              className="favorite-card-nightlife"
              role="button" tabIndex={0} onClick={() => handleOpenProfile(favorite.employee_id)}
              style={{ cursor: 'pointer' }}
            >
              {/* Photo Container with Badge */}
              <div
                className="favorite-card-photo-container-nightlife"
                role="button" tabIndex={0} onClick={(e) => {
                  e.stopPropagation();
                  if (favorite.employee_photos && favorite.employee_photos.length > 0) {
                    setPhotoGallery({
                      photos: favorite.employee_photos,
                      employeeName: favorite.employee_name
                    });
                  }
                }}
              >
                {favorite.employee_photos && favorite.employee_photos.length > 0 ? (
                  <>
                    <LazyImage
                      src={favorite.employee_photos[0]}
                      alt={favorite.employee_name}
                      className="favorite-card-photo-nightlife"
                      objectFit="cover"
                    />
                    {favorite.employee_photos.length > 1 && (
                      <div className="favorite-photo-count-badge-nightlife">
                        🔍 {t('userDashboard.photoCountBadge', { count: favorite.employee_photos.length - 1 })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="favorite-card-photo-placeholder-nightlife">
                    {favorite.employee_name.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Badge étoile interactive pour retirer des favoris */}
                <button
                  className="favorite-badge-nightlife"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFavorite(favorite.employee_id);
                  }}
                  aria-label={t('userDashboard.ariaRemoveFavorite', { name: favorite.employee_name })}
                  title={t('userDashboard.titleRemoveFavorite')}
                >
                  ⭐
                </button>
                <div className="favorite-card-photo-overlay-nightlife"></div>
              </div>

              {/* Header - Name and Info */}
              <div className="favorite-card-header-nightlife">
                <h3 className="favorite-card-name-nightlife">
                  {favorite.employee_name}
                  {favorite.employee_nickname && (
                    <span className="favorite-card-nickname-nightlife">
                      "{favorite.employee_nickname}"
                    </span>
                  )}
                </h3>

                {(favorite.employee_age || favorite.employee_nationality) && (
                  <div className="favorite-card-meta-nightlife">
                    {favorite.employee_age && <span>🎂 {t('userDashboard.ageLabel', { age: favorite.employee_age })}</span>}
                    {favorite.employee_nationality && <span>🌏 {favorite.employee_nationality}</span>}
                  </div>
                )}

                {/* Rating */}
                <div className="favorite-card-rating-nightlife">
                  <StarRating
                    rating={favorite.employee_rating || 0}
                    readonly={true}
                    size="small"
                  />
                  <span className="favorite-card-rating-score-nightlife">
                    {favorite.employee_rating?.toFixed(1) || '0.0'} ({favorite.employee_comment_count || 0})
                  </span>
                </div>
              </div>

              {/* Body - Establishment and Social */}
              <div className="favorite-card-body-nightlife">
                {/* Establishment Info */}
                {favorite.current_establishment ? (
                  <div
                    className="favorite-establishment-card-nightlife"
                    role="button" tabIndex={0} onClick={(e) => {
                      e.stopPropagation();
                      const est = favorite.current_establishment!;
                      navigate(generateEstablishmentUrl(est.id, est.name, est.zone || 'other'));
                    }}
                  >
                    <div className="favorite-establishment-label-nightlife">
                      📍 {t('userDashboard.establishmentLabel')}
                    </div>
                    <div className="favorite-establishment-name-nightlife">
                      {favorite.current_establishment.name}
                    </div>
                    <div className="favorite-establishment-zone-nightlife">
                      {favorite.current_establishment.zone?.toUpperCase()}
                    </div>
                  </div>
                ) : (
                  <div className="favorite-unemployed-card-nightlife">
                    ⚠️ {t('userDashboard.notEmployed')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {photoGallery && (
        <PhotoGalleryModal
          photos={photoGallery.photos}
          employeeName={photoGallery.employeeName}
          onClose={() => setPhotoGallery(null)}
        />
      )}

      {/* Edit My Profile Modal */}
      <EditMyProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        onProfileUpdated={() => {
          // Optionally refresh data or show success message
          logger.debug('Profile updated successfully');
        }}
      />

    </div>
  );
};

export default UserDashboard;