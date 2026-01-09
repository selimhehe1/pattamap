import React, { useState, useEffect } from 'react';
import { useNavigateWithTransition } from '../../hooks/useNavigateWithTransition';
import { Edit, Star, MailX, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useFavorites, useRemoveFavorite, Favorite } from '../../hooks/useFavorites';
import { GirlProfile } from '../../routes/lazyComponents';
import EditEmployeeModal from '../Employee/EditEmployeeModal';
import EmployeeCard from '../Common/EmployeeCard';
import { Employee } from '../../types';
import { logger } from '../../utils/logger';
import notification from '../../utils/notification';
import { SkeletonGallery } from '../Common/Skeleton';
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

  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  // Fonction de mapping Favorite → Employee pour EmployeeCard
  const favoriteToEmployee = (favorite: Favorite): Employee => ({
    id: favorite.employee_id,
    name: favorite.employee_name,
    nickname: favorite.employee_nickname,
    photos: favorite.employee_photos || [],
    age: favorite.employee_age,
    sex: favorite.employee_sex || 'female',
    nationality: Array.isArray(favorite.employee_nationality)
      ? favorite.employee_nationality
      : [],
    average_rating: favorite.employee_rating ?? favorite.average_rating,
    is_verified: favorite.employee_is_verified,
    verified_at: favorite.employee_verified_at,
    vote_count: favorite.employee_vote_count,
    is_vip: favorite.employee_is_vip,
    vip_expires_at: favorite.employee_vip_expires_at,
    current_employment: favorite.current_establishment
      ? [{
          id: `emp-${favorite.employee_id}`,
          employee_id: favorite.employee_id,
          establishment_id: favorite.current_establishment.id,
          establishment: favorite.current_establishment,
          is_current: true,
          start_date: favorite.created_at,
          created_by: favorite.user_id,
          created_at: favorite.created_at,
          updated_at: favorite.created_at,
        }]
      : [],
    created_at: favorite.created_at,
    status: 'approved',
    self_removal_requested: false,
    created_by: favorite.user_id,
    updated_at: favorite.created_at,
  });

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
      } else {
        notification.error(t('userDashboard.errorLoadingProfile', 'Unable to load profile'));
      }
    } catch (error) {
      logger.error('Failed to load employee:', error);
      notification.error(t('userDashboard.errorLoadingProfile', 'Unable to load profile'));
    }
  };

  if (isLoading) {
    return (
      <div className="bg-nightlife-gradient-main page-content-with-header-nightlife">
        <div className="page-container-nightlife">
          <div className="header-centered-nightlife">
            <h1 className="header-title-nightlife">
              <Star size={28} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              {t('userDashboard.pageTitle')}
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
            <Star size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />{t('userDashboard.pageTitle')}
          </h1>
          <p className="header-subtitle-nightlife">
            {t('userDashboard.pageSubtitle')}
          </p>

          {/* Edit Profile Button - Only for claimed employees */}
          {user?.linked_employee_id && (
            <button
              onClick={() => setIsEditProfileModalOpen(true)}
              className="btn btn--primary mt-4 flex items-center gap-2 mx-auto"
            >
              <Edit size={18} />
              {t('userDashboard.buttonEditProfile')}
            </button>
          )}
        </div>

      {favorites.length === 0 ? (
        <div className="empty-state-container-nightlife">
          <h3 className="text-primary-nightlife" style={{ fontSize: '24px', marginBottom: '15px' }}>
            <MailX size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            {t('userDashboard.emptyStateTitle')}
          </h3>
          <p className="text-muted-nightlife" style={{ marginBottom: '30px' }}>
            {t('userDashboard.emptyStateMessage')}
          </p>
          <button
            onClick={() => navigate('/search')}
            className="btn btn--primary"
          >
            <Search size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            {t('userDashboard.buttonBrowseEmployees')}
          </button>
        </div>
      ) : (
        <div className="favorites-grid">
          {favorites.map((favorite) => (
            <div key={favorite.id} className="favorite-card-wrapper">
              <EmployeeCard
                employee={favoriteToEmployee(favorite)}
                onClick={() => handleOpenProfile(favorite.employee_id)}
                showEstablishment={true}
                showRatingBadge={true}
              />
              {/* Bouton remove favorite en overlay */}
              <button
                className="favorite-remove-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFavorite(favorite.employee_id);
                }}
                aria-label={t('userDashboard.ariaRemoveFavorite', { name: favorite.employee_name })}
                title={t('userDashboard.titleRemoveFavorite')}
              >
                <Star size={16} fill="gold" color="gold" />
              </button>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Edit My Profile Modal */}
      <EditEmployeeModal
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