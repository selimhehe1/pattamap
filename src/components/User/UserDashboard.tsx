import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { Favorite, Employee } from '../../types';
import StarRating from '../Common/StarRating';
import GirlProfile from '../Bar/GirlProfile';
import PhotoGalleryModal from '../Common/PhotoGalleryModal';
import { logger } from '../../utils/logger';

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openModal, closeModal } = useModal();
  const { secureFetch } = useSecureFetch();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [photoGallery, setPhotoGallery] = useState<{ photos: string[]; employeeName: string } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadFavorites();
  }, [user, navigate]);

  const loadFavorites = async () => {
    setIsLoading(true);
    try {
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/favorites`);

      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites || []);
      }
    } catch (error) {
      logger.error('Failed to load favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFavorite = async (employeeId: string) => {
    try {
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/favorites/${employeeId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setFavorites(prev => prev.filter(fav => fav.employee_id !== employeeId));
      }
    } catch (error) {
      logger.error('Failed to remove favorite:', error);
      alert('Failed to remove from favorites');
    }
  };

  const handleOpenProfile = async (employeeId: string) => {
    try {
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/employees/${employeeId}`);
      if (response.ok) {
        const data = await response.json();
        openModal('user-favorite-profile', GirlProfile, {
          girl: data.employee,
          onClose: () => closeModal('user-favorite-profile')
        }, {
          size: 'profile',
          closeOnOverlayClick: true
        });
      }
    } catch (error) {
      logger.error('Failed to load employee:', error);
    }
  };

  const getSocialMediaUrl = (platform: string, username: string) => {
    const urls: { [key: string]: string } = {
      instagram: `https://instagram.com/${username}`,
      line: `https://line.me/R/ti/p/${username}`,
      telegram: `https://t.me/${username}`,
      whatsapp: `https://wa.me/${username}`,
      facebook: `https://facebook.com/${username}`
    };
    return urls[platform] || '#';
  };

  const getSocialMediaIcon = (platform: string) => {
    const icons: { [key: string]: React.ReactElement } = {
      instagram: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      line: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
        </svg>
      ),
      telegram: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      whatsapp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      ),
      facebook: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    };
    return icons[platform] || (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-nightlife-gradient-main page-content-with-header-nightlife">
        <div className="loading-container-nightlife">
          <div className="loading-spinner-large-nightlife"></div>
          <p className="text-cyan-nightlife" style={{ marginTop: '20px', fontSize: '18px' }}>
            Loading your favorites...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-nightlife-gradient-main page-content-with-header-nightlife">
      {/* Bouton retour en position absolue */}
      <button
        onClick={() => navigate('/')}
        className="back-button-absolute-nightlife"
        style={{ top: '20px' }}
      >
        Back to Home
      </button>

      <div className="page-container-nightlife">
        <div className="header-centered-nightlife">
          <h1 className="header-title-nightlife">
            ⭐ My Favorites
          </h1>
          <p className="header-subtitle-nightlife">
            Your favorite employees and where they work
          </p>
        </div>

      {favorites.length === 0 ? (
        <div className="empty-state-container-nightlife">
          <h3 className="text-primary-nightlife" style={{ fontSize: '24px', marginBottom: '15px' }}>
            📭 No Favorites Yet
          </h3>
          <p className="text-muted-nightlife" style={{ marginBottom: '30px' }}>
            Start adding employees to your favorites to see them here!
          </p>
          <button
            onClick={() => navigate('/search')}
            className="btn-nightlife-base btn-primary-nightlife"
          >
            🔍 Browse Employees
          </button>
        </div>
      ) : (
        <div className="grid-enhanced-nightlife">
          {favorites.map((favorite) => (
            <div
              key={favorite.id}
              className="favorite-card-nightlife"
              onClick={() => handleOpenProfile(favorite.employee_id)}
              style={{ cursor: 'pointer' }}
            >
              {/* Photo Container with Badge */}
              <div
                className="favorite-card-photo-container-nightlife"
                onClick={(e) => {
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
                    <img
                      src={favorite.employee_photos[0]}
                      alt={favorite.employee_name}
                      className="favorite-card-photo-nightlife"
                    />
                    {favorite.employee_photos.length > 1 && (
                      <div className="favorite-photo-count-badge-nightlife">
                        🔍 +{favorite.employee_photos.length - 1} photos
                      </div>
                    )}
                  </>
                ) : (
                  <div className="favorite-card-photo-placeholder-nightlife">
                    {favorite.employee_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="favorite-badge-nightlife">⭐</div>
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
                    {favorite.employee_age && <span>🎂 {favorite.employee_age} years</span>}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/bar/${favorite.current_establishment!.id}`);
                    }}
                  >
                    <div className="favorite-establishment-label-nightlife">
                      📍 Currently Working At
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
                    ⚠️ Not currently employed
                  </div>
                )}

                {/* Social Media */}
                {favorite.employee_social_media && Object.keys(favorite.employee_social_media).length > 0 && (
                  <div className="favorite-social-container-nightlife">
                    {Object.entries(favorite.employee_social_media).map(([platform, username]) => {
                      if (!username) return null;
                      return (
                        <a
                          key={platform}
                          href={getSocialMediaUrl(platform, username)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`favorite-social-icon-nightlife social-${platform}-nightlife`}
                          title={`@${username} on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {getSocialMediaIcon(platform)}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="favorite-card-actions-nightlife">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenProfile(favorite.employee_id);
                  }}
                  className="favorite-btn-view-nightlife"
                >
                  👁️ View
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFavorite(favorite.employee_id);
                  }}
                  className="favorite-btn-remove-nightlife"
                >
                  🗑️ Remove
                </button>
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

    </div>
  );
};

export default UserDashboard;