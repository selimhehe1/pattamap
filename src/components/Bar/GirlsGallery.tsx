import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Employee } from '../../types';
import { useModal } from '../../contexts/ModalContext';
import { GirlProfile } from '../../routes/lazyComponents';
import EmployeeCard from '../Common/EmployeeCard';

interface GirlsGalleryProps {
  girls: Employee[];
  onGirlClick: (girl: Employee | null) => void;
  selectedGirl: Employee | null;
}

const GirlsGallery: React.FC<GirlsGalleryProps> = ({ girls, onGirlClick, selectedGirl }) => {
  const { t } = useTranslation();
  const { user: _user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'top-rated'>('all');
  const [ageFilter, setAgeFilter] = useState<'all' | '18-22' | '23-26' | '27+'>('all');
  const [hoveredGirl, setHoveredGirl] = useState<string | null>(null);
  const [hoverBlocked, setHoverBlocked] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const { openModal, closeModal } = useModal();

  const ITEMS_PER_PAGE = 12;


  // Reset hover when selectedGirl changes
  useEffect(() => {
    if (selectedGirl) {
      setHoveredGirl(null);
    }
  }, [selectedGirl]);

  // Open modal when selectedGirl changes
  useEffect(() => {
    if (selectedGirl) {
      setHoveredGirl(null);

      const timeoutId = setTimeout(() => {
        openModal('girl-profile', GirlProfile, {
          girl: selectedGirl,
          onClose: () => {
            closeModal('girl-profile');
            onGirlClick(null);
            setHoveredGirl(null);
            setHoverBlocked(true);
            setTimeout(() => {
              setHoverBlocked(false);
            }, 300);
          }
        }, {
          size: 'fullscreen', // 🔧 FIX: Changed from 'profile' to 'fullscreen' for consistency with other employee modals
          closeOnOverlayClick: true,
          showCloseButton: false
        });
      }, 50);

      return () => clearTimeout(timeoutId);
    } else {
      closeModal('girl-profile');
    }
  }, [selectedGirl, openModal, closeModal, onGirlClick]);

  // 🚀 Mémoisation des filles filtrées pour éviter les recalculs
  const filteredGirls = useMemo(() => {
    let filtered = [...girls];

    // Filtre par âge (Top Rated n'est plus un filtre, c'est un tri)
    if (ageFilter === '18-22') {
      filtered = filtered.filter(girl => girl.age && girl.age >= 18 && girl.age <= 22);
    } else if (ageFilter === '23-26') {
      filtered = filtered.filter(girl => girl.age && girl.age >= 23 && girl.age <= 26);
    } else if (ageFilter === '27+') {
      filtered = filtered.filter(girl => girl.age && girl.age >= 27);
    }

    // 🆕 v10.3 Phase 4 - Enhanced Priority Sorting (Verified takes absolute priority)
    // Priority order: Verified+VIP > Verified > VIP > Others
    // Note: VIP system is visually disabled, so Verified should always come first
    filtered.sort((a, b) => {
      const isVIPActiveA = a.is_vip && a.vip_expires_at && new Date(a.vip_expires_at) > new Date();
      const isVIPActiveB = b.is_vip && b.vip_expires_at && new Date(b.vip_expires_at) > new Date();
      const isVerifiedA = a.is_verified;
      const isVerifiedB = b.is_verified;

      // Priority 1: Verified + VIP (both) come first
      const isPremiumA = isVerifiedA && isVIPActiveA;
      const isPremiumB = isVerifiedB && isVIPActiveB;
      if (isPremiumA && !isPremiumB) return -1;
      if (!isPremiumA && isPremiumB) return 1;

      // Priority 2: Verified alone (takes priority over VIP since VIP is hidden in UI)
      if (isVerifiedA && !isVerifiedB) return -1;
      if (!isVerifiedA && isVerifiedB) return 1;

      // Priority 3: VIP alone (lower priority since VIP UI is disabled)
      if (isVIPActiveA && !isVIPActiveB) return -1;
      if (!isVIPActiveA && isVIPActiveB) return 1;

      // Priority 4: If "top-rated" is active, sort by rating (descending)
      if (filter === 'top-rated') {
        const ratingA = a.average_rating || 0;
        const ratingB = b.average_rating || 0;
        return ratingB - ratingA; // Higher rating first
      }

      // Maintain original order
      return 0;
    });

    return filtered;
  }, [girls, filter, ageFilter]);

  // 🚀 Pagination logic - 12 employees per page
  const totalPages = useMemo(() => Math.ceil(filteredGirls.length / ITEMS_PER_PAGE), [filteredGirls.length]);

  const paginatedGirls = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredGirls.slice(startIndex, endIndex);
  }, [filteredGirls, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, ageFilter]);

  // 🚀 Mémoisation des callbacks pour éviter les re-renders
  const handleFilterClick = useCallback((filterType: 'all' | 'top-rated') => {
    setFilter(filterType);
  }, []);

  const handleAgeFilterClick = useCallback((age: 'all' | '18-22' | '23-26' | '27+') => {
    setAgeFilter(age);
  }, []);

  const handleGirlClick = useCallback((girl: Employee) => {
    onGirlClick(girl);
  }, [onGirlClick]);

  const _handleMouseEnter = useCallback((girlId: string) => () => {
    if (!hoverBlocked) {
      setHoveredGirl(girlId);
    }
  }, [hoverBlocked]);

  const _handleMouseLeave = useCallback(() => {
    setHoveredGirl(null);
  }, []);

  // 🚀 Scroll to top of page when changing pages
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // 🚀 Pagination handlers with auto-scroll to top
  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
    scrollToTop();
  }, [scrollToTop]);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
    scrollToTop();
  }, [totalPages, scrollToTop]);

  const handleGoToPage = useCallback((page: number) => {
    setCurrentPage(page);
    scrollToTop();
  }, [scrollToTop]);

  // 🚀 Mémoisation des styles statiques
  const headerStyle = useMemo(() => ({
    fontSize: '28px',
    fontWeight: '900' as const,
    color: '#C19A6B',
    textAlign: 'center' as const,
    marginBottom: '20px',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
  }), []);

  const filterContainerStyle = useMemo(() => ({
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    flexWrap: 'wrap' as const,
    marginBottom: '20px'
  }), []);

  // Grid styles moved to CSS (see <style> tag below for responsive breakpoints)
  const galleryStyle = useMemo(() => ({}), []);

  // 🚀 Mémoisation de la fonction getRatingStars
  const _getRatingStars = useCallback((rating: number | undefined) => {
    if (!rating) return '⭐⭐⭐⭐⭐';
    const stars = Math.round(rating);
    return '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
  }, []);

  // 🚀 Mémoisation des styles de boutons pour éviter les recréations
  const getFilterButtonStyle = useCallback((filterType: string, isActive: boolean) => ({
    padding: '8px 16px',
    border: `2px solid ${isActive ? '#C19A6B' : 'rgba(193, 154, 107,0.3)'}`,
    background: isActive
      ? 'linear-gradient(45deg, rgba(193, 154, 107,0.3), rgba(193, 154, 107,0.1))'
      : 'rgba(0,0,0,0.5)',
    color: isActive ? '#C19A6B' : 'rgba(255,255,255,0.7)',
    borderRadius: '15px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase' as const
  }), []);

  const _getGirlCardStyle = useCallback((girl: Employee) => {
    const isSelected = selectedGirl?.id === girl.id;
    const isHovered = hoveredGirl === girl.id;

    let transform = 'scale(1)';
    let boxShadow = '0 10px 30px rgba(0,0,0,0.5)';

    if (isSelected) {
      transform = 'scale(1.02)';
      boxShadow = '0 20px 40px rgba(193, 154, 107,0.4)';
    } else if (isHovered) {
      transform = 'scale(1.05) translateY(-5px)';
      boxShadow = '0 20px 40px rgba(193, 154, 107,0.3)';
    }

    return {
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: '20px',
      padding: '20px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)',
      border: isSelected ? '2px solid #C19A6B' : '2px solid rgba(255,255,255,0.1)',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      transform,
      boxShadow
    };
  }, [selectedGirl?.id, hoveredGirl]);

  return (
    <div>
      {/* Header avec titre et filtres */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={headerStyle}>
          ✨ {t('girlsGallery.title')} ✨
        </h2>

        {/* Filtres */}
        <div style={filterContainerStyle}>
          {/* Filtre statut */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'top-rated'] as const).map((filterType) => (
              <button
                key={filterType}
                onClick={() => handleFilterClick(filterType)}
                style={getFilterButtonStyle(filterType, filter === filterType)}
              >
                {filterType === 'all' ? `👥 ${t('girlsGallery.filters.allGirls')}` : `⭐ ${t('girlsGallery.filters.topRated')}`}
              </button>
            ))}
          </div>

          {/* Filtre âge */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', '18-22', '23-26', '27+'] as const).map((age) => (
              <button
                key={age}
                onClick={() => handleAgeFilterClick(age)}
                style={getFilterButtonStyle(age, ageFilter === age)}
              >
                {age === 'all' ? `🎂 ${t('girlsGallery.filters.allAges')}` : `${age} ${t('girlsGallery.filters.ageUnit')}`}
              </button>
            ))}
          </div>
        </div>

        {/* Compteur */}
        <div style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '14px',
          marginTop: '10px'
        }}>
          {t('girlsGallery.counter.employeeAvailable', { count: filteredGirls.length })}
        </div>
      </div>

      {/* Galerie des filles - New Tinder Style */}
      <div style={galleryStyle} className="girls-gallery-grid">
        {paginatedGirls.map((girl) => (
          <EmployeeCard
            key={girl.id}
            employee={girl}
            onClick={handleGirlClick}
            showEstablishment={false}
            showRatingBadge={true}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {filteredGirls.length > ITEMS_PER_PAGE && (
        <div className="pagination-container">
          {/* Page counter */}
          <div className="pagination-counter">
            {t('girlsGallery.pagination.showing', {
              start: (currentPage - 1) * ITEMS_PER_PAGE + 1,
              end: Math.min(currentPage * ITEMS_PER_PAGE, filteredGirls.length),
              total: filteredGirls.length
            })}
          </div>

          {/* Pagination buttons */}
          <div className="pagination-buttons">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="pagination-btn pagination-prev"
            >
              ← {t('girlsGallery.pagination.previous')}
            </button>

            {/* Page numbers */}
            <div className="pagination-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                // Show first page, last page, current page, and pages around current
                const showPage = page === 1 ||
                                page === totalPages ||
                                Math.abs(page - currentPage) <= 1;

                // Show ellipsis for gaps
                const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

                if (!showPage && !showEllipsisBefore && !showEllipsisAfter) {
                  return null;
                }

                if (showEllipsisBefore || showEllipsisAfter) {
                  return <span key={`ellipsis-${page}`} className="pagination-ellipsis">...</span>;
                }

                return (
                  <button
                    key={page}
                    onClick={() => handleGoToPage(page)}
                    className={`pagination-btn pagination-number ${page === currentPage ? 'active' : ''}`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="pagination-btn pagination-next"
            >
              {t('girlsGallery.pagination.next')} →
            </button>
          </div>
        </div>
      )}

      {/* Responsive CSS - Tinder Style Grid (matches SearchResults and EmployeesGridView) */}
      <style>{`
        .girls-gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
          padding: 20px 0;
          justify-content: center;
        }

        /* Desktop: Optimal spacing (240-300px cards for better horizontal usage) */
        @media (min-width: 1024px) {
          .girls-gallery-grid {
            grid-template-columns: repeat(auto-fill, minmax(240px, 300px));
            gap: 25px;
          }
        }

        /* Tablet */
        @media (max-width: 768px) {
          .girls-gallery-grid {
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 15px;
          }
        }

        /* Small mobile - 2 columns minimum */
        @media (max-width: 480px) {
          .girls-gallery-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }

        /* Pagination Styles */
        .pagination-container {
          margin-top: 40px;
          padding: 20px 0;
        }

        .pagination-counter {
          text-align: center;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          margin-bottom: 20px;
        }

        .pagination-buttons {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .pagination-numbers {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .pagination-btn {
          padding: 10px 16px;
          border: 2px solid rgba(193, 154, 107, 0.3);
          background: rgba(0, 0, 0, 0.5);
          color: rgba(255, 255, 255, 0.7);
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
          min-width: 44px;
          text-align: center;
        }

        .pagination-btn:hover:not(:disabled) {
          background: rgba(193, 154, 107, 0.2);
          border-color: #C19A6B;
          color: #C19A6B;
          transform: translateY(-2px);
        }

        .pagination-btn.active {
          background: linear-gradient(45deg, rgba(193, 154, 107, 0.4), rgba(193, 154, 107, 0.2));
          border-color: #C19A6B;
          color: #C19A6B;
        }

        .pagination-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .pagination-ellipsis {
          color: rgba(255, 255, 255, 0.5);
          padding: 0 8px;
          font-weight: bold;
        }

        /* Responsive pagination */
        @media (max-width: 768px) {
          .pagination-btn {
            padding: 8px 12px;
            font-size: 12px;
            min-width: 38px;
          }

          .pagination-numbers {
            gap: 5px;
          }

          .pagination-buttons {
            gap: 8px;
          }
        }

        @media (max-width: 480px) {
          .pagination-container {
            margin-top: 30px;
            padding: 15px 0;
          }

          .pagination-counter {
            font-size: 12px;
            margin-bottom: 15px;
          }

          .pagination-prev,
          .pagination-next {
            flex: 1;
            max-width: 120px;
          }

          .pagination-numbers {
            order: 3;
            width: 100%;
            justify-content: center;
            margin-top: 10px;
          }
        }
      `}</style>

      {/* Message si aucune fille */}
      {filteredGirls.length === 0 && (
        <div style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.6)',
          fontSize: '18px',
          padding: '40px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: '20px'
        }}>
          😔 {t('girlsGallery.emptyState')}
        </div>
      )}
    </div>
  );
};

export default GirlsGallery;