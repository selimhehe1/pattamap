import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Employee } from '../../types';
import GirlProfile from './GirlProfile';
import { useModal } from '../../contexts/ModalContext';

interface GirlsGalleryProps {
  girls: Employee[];
  onGirlClick: (girl: Employee | null) => void;
  selectedGirl: Employee | null;
}

const GirlsGallery: React.FC<GirlsGalleryProps> = ({ girls, onGirlClick, selectedGirl }) => {
  const [filter, setFilter] = useState<'all' | 'top-rated'>('all');
  const [ageFilter, setAgeFilter] = useState<'all' | '18-22' | '23-26' | '27+'>('all');
  const [hoveredGirl, setHoveredGirl] = useState<string | null>(null);
  const [hoverBlocked, setHoverBlocked] = useState<boolean>(false);
  const { openModal, closeModal } = useModal();

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
          size: 'profile',
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

    // Filtre par statut
    if (filter === 'top-rated') {
      filtered = filtered.filter(girl => (girl.average_rating || 0) >= 4.5);
    }

    // Filtre par âge
    if (ageFilter === '18-22') {
      filtered = filtered.filter(girl => girl.age && girl.age >= 18 && girl.age <= 22);
    } else if (ageFilter === '23-26') {
      filtered = filtered.filter(girl => girl.age && girl.age >= 23 && girl.age <= 26);
    } else if (ageFilter === '27+') {
      filtered = filtered.filter(girl => girl.age && girl.age >= 27);
    }

    return filtered;
  }, [girls, filter, ageFilter]);

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

  const handleMouseEnter = useCallback((girlId: string) => () => {
    if (!hoverBlocked) {
      setHoveredGirl(girlId);
    }
  }, [hoverBlocked]);

  const handleMouseLeave = useCallback(() => {
    setHoveredGirl(null);
  }, []);

  // 🚀 Mémoisation des styles statiques
  const headerStyle = useMemo(() => ({
    fontSize: '28px',
    fontWeight: '900' as const,
    color: '#FF1B8D',
    textAlign: 'center' as const,
    marginBottom: '20px',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
  }), []);

  const filterContainerStyle = useMemo(() => ({
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap' as const,
    marginBottom: '20px'
  }), []);

  const galleryStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 350px))',
    gap: '25px',
    padding: '20px 0'
  }), []);

  // 🚀 Mémoisation de la fonction getRatingStars
  const getRatingStars = useCallback((rating: number | undefined) => {
    if (!rating) return '⭐⭐⭐⭐⭐';
    const stars = Math.round(rating);
    return '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
  }, []);

  // 🚀 Mémoisation des styles de boutons pour éviter les recréations
  const getFilterButtonStyle = useCallback((filterType: string, isActive: boolean) => ({
    padding: '8px 16px',
    border: `2px solid ${isActive ? '#FF1B8D' : 'rgba(255,27,141,0.3)'}`,
    background: isActive
      ? 'linear-gradient(45deg, rgba(255,27,141,0.3), rgba(255,27,141,0.1))'
      : 'rgba(0,0,0,0.5)',
    color: isActive ? '#FF1B8D' : 'rgba(255,255,255,0.7)',
    borderRadius: '15px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase' as const
  }), []);

  const getGirlCardStyle = useCallback((girl: Employee) => {
    const isSelected = selectedGirl?.id === girl.id;
    const isHovered = hoveredGirl === girl.id;

    let transform = 'scale(1)';
    let boxShadow = '0 10px 30px rgba(0,0,0,0.5)';

    if (isSelected) {
      transform = 'scale(1.02)';
      boxShadow = '0 20px 40px rgba(255,27,141,0.4)';
    } else if (isHovered) {
      transform = 'scale(1.05) translateY(-5px)';
      boxShadow = '0 20px 40px rgba(255,27,141,0.3)';
    }

    return {
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: '20px',
      padding: '20px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)',
      border: isSelected ? '2px solid #FF1B8D' : '2px solid rgba(255,255,255,0.1)',
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
          ✨ Employees Gallery ✨
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
                {filterType === 'all' ? '👥 All Girls' : '⭐ Top Rated'}
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
                {age === 'all' ? '🎂 All Ages' : `${age} ans`}
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
          {filteredGirls.length} employee{filteredGirls.length !== 1 ? 's' : ''} available
        </div>
      </div>

      {/* Galerie des filles */}
      <div style={galleryStyle}>
        {filteredGirls.map((girl) => (
          <div
            key={girl.id}
            onClick={() => handleGirlClick(girl)}
            style={getGirlCardStyle(girl)}
            onMouseEnter={handleMouseEnter(girl.id)}
            onMouseLeave={handleMouseLeave}
          >
            {/* Photo principale */}
            <div style={{
              position: 'relative',
              marginBottom: '15px',
              borderRadius: '15px',
              overflow: 'hidden',
              aspectRatio: '3/4',
              backgroundColor: 'rgba(255,255,255,0.1)'
            }}>
              {girl.photos && girl.photos.length > 0 ? (
                <img
                  src={girl.photos[0]}
                  alt={`${girl.name}, ${girl.age} years old from ${girl.nationality}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '15px'
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '60px',
                  color: 'rgba(255,255,255,0.3)'
                }}>
                  👤
                </div>
              )}

              {/* Badge rating si disponible */}
              {girl.average_rating && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  backgroundColor: 'rgba(255,27,141,0.9)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  ⭐ {girl.average_rating.toFixed(1)}
                </div>
              )}
            </div>

            {/* Informations */}
            <div style={{ color: 'white' }}>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#FF1B8D'
              }}>
                {girl.name}
              </h3>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px',
                color: 'rgba(255,255,255,0.8)',
                marginBottom: '8px'
              }}>
                <span>🎂 {girl.age} ans</span>
                <span>🌍 {girl.nationality}</span>
              </div>

              {girl.average_rating && (
                <div style={{
                  textAlign: 'center',
                  fontSize: '16px',
                  marginTop: '10px'
                }}>
                  {getRatingStars(girl.average_rating)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

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
          😔 No employees match your filters
        </div>
      )}

    </div>
  );
};

export default GirlsGallery;