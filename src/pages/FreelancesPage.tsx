/**
 * FreelancesPage Component
 * Version: 10.3
 *
 * Displays all freelance employees with filtering and VIP prioritization.
 * Freelances can be "free" (no nightclub) or associated with multiple nightclubs.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useModal } from '../contexts/ModalContext';
import EmployeeCard from '../components/Common/EmployeeCard';
import { GirlProfile } from '../routes/lazyComponents';
import { Employee } from '../types';
import { logger } from '../utils/logger';
import '../styles/layout/search-layout.css';
import '../styles/pages/freelances.css';

/**
 * Skeleton loading component for freelance cards
 */
const FreelanceCardSkeleton: React.FC = () => (
  <div className="freelance-card-skeleton">
    <div className="skeleton-image skeleton-pulse" />
    <div className="skeleton-content">
      <div className="skeleton-badge skeleton-pulse" />
      <div className="skeleton-title skeleton-pulse" />
      <div className="skeleton-subtitle skeleton-pulse" />
      <div className="skeleton-tags">
        <div className="skeleton-tag skeleton-pulse" />
        <div className="skeleton-tag skeleton-pulse" />
      </div>
    </div>
  </div>
);

const FreelancesPage: React.FC = () => {
  const { t } = useTranslation();
  const { openModal, closeModal } = useModal();

  const [freelances, setFreelances] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    nationality: '',
    age_min: '',
    age_max: '',
    has_nightclub: 'all', // 'all', 'true', 'false'
    sort_by: 'vip' // 'vip', 'name', 'age', 'created_at'
  });

  // Available filter options (populated from API)
  const [availableNationalities, setAvailableNationalities] = useState<string[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Helper function to trigger refresh
  const refreshFreelances = () => setRefreshCounter(c => c + 1);

  useEffect(() => {
    const fetchFreelances = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query params
        const params = new URLSearchParams();
        params.set('page', currentPage.toString());
        params.set('limit', '20');

        if (filters.search) params.set('search', filters.search);
        if (filters.nationality) params.set('nationality', filters.nationality);
        if (filters.age_min) params.set('age_min', filters.age_min);
        if (filters.age_max) params.set('age_max', filters.age_max);
        if (filters.has_nightclub !== 'all') params.set('has_nightclub', filters.has_nightclub);
        if (filters.sort_by) params.set('sort_by', filters.sort_by);

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/freelances?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch freelances');
        }

        const data = await response.json();

        setFreelances(data.freelances || []);
        setTotalCount(data.pagination?.total || 0);
        setTotalPages(data.pagination?.total_pages || 1);

        // Extract unique nationalities for filter
        const nationalities = Array.from(new Set(
          (data.freelances || []).map((f: Employee) => f.nationality).filter(Boolean)
        )).sort();
        setAvailableNationalities(nationalities as string[]);

        logger.debug('Freelances fetched', {
          count: data.freelances?.length,
          total: data.pagination?.total
        });

      } catch (err) {
        logger.error('Error fetching freelances:', err);
        setError(err instanceof Error ? err.message : 'Failed to load freelances');
      } finally {
        setLoading(false);
      }
    };
    fetchFreelances();
  }, [filters, currentPage, refreshCounter]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      nationality: '',
      age_min: '',
      age_max: '',
      has_nightclub: 'all',
      sort_by: 'vip'
    });
    setCurrentPage(1);
  };

  const openEmployeeProfile = (employee: Employee) => {
    openModal('employee-profile', GirlProfile, {
      girl: employee,
      onClose: () => closeModal('employee-profile')
    }, {
      size: 'fullscreen'
    });
  };

  return (
    <div className="search-layout">
      {/* Header */}
      <div className="search-header">
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #9D4EDD 0%, #C19A6B 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '10px'
        }}>
          💃 {t('freelances.title', 'Freelances')}
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: '16px',
          marginBottom: '20px'
        }}>
          {t('freelances.subtitle', 'Independent professionals available in Pattaya nightlife')}
        </p>

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: '15px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            padding: '10px 20px',
            background: 'rgba(157, 78, 221, 0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(157, 78, 221, 0.3)'
          }}>
            <span style={{ color: '#9D4EDD', fontWeight: 'bold' }}>
              {totalCount}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.7)', marginLeft: '8px' }}>
              {t('freelances.total', 'freelances available')}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="search-filters" style={{
        background: 'rgba(0,0,0,0.3)',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '30px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '15px'
        }}>
          {/* Search */}
          <div>
            <label style={{
              display: 'block',
              color: '#FFD700',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              🔍 {t('search.query', 'Search')}
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder={t('search.placeholder', 'Name, nickname...')}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(193, 154, 107, 0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Nationality */}
          <div>
            <label style={{
              display: 'block',
              color: '#FFD700',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              🌍 {t('filters.nationality', 'Nationality')}
            </label>
            <select
              value={filters.nationality}
              onChange={(e) => handleFilterChange('nationality', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(193, 154, 107, 0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px'
              }}
            >
              <option value="" style={{ background: '#1a1a1a' }}>
                {t('filters.all_nationalities', 'All Nationalities')}
              </option>
              {availableNationalities.map(nat => (
                <option key={nat} value={nat} style={{ background: '#1a1a1a' }}>
                  {nat}
                </option>
              ))}
            </select>
          </div>

          {/* Age Min */}
          <div>
            <label style={{
              display: 'block',
              color: '#FFD700',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              📊 {t('filters.age_min', 'Min Age')}
            </label>
            <input
              type="number"
              value={filters.age_min}
              onChange={(e) => handleFilterChange('age_min', e.target.value)}
              placeholder="18"
              min="18"
              max="80"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(193, 154, 107, 0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Age Max */}
          <div>
            <label style={{
              display: 'block',
              color: '#FFD700',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              📊 {t('filters.age_max', 'Max Age')}
            </label>
            <input
              type="number"
              value={filters.age_max}
              onChange={(e) => handleFilterChange('age_max', e.target.value)}
              placeholder="80"
              min="18"
              max="80"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(193, 154, 107, 0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Availability */}
          <div>
            <label style={{
              display: 'block',
              color: '#FFD700',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              🎵 {t('freelances.availability', 'Availability')}
            </label>
            <select
              value={filters.has_nightclub}
              onChange={(e) => handleFilterChange('has_nightclub', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(193, 154, 107, 0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px'
              }}
            >
              <option value="all" style={{ background: '#1a1a1a' }}>
                {t('freelances.all', 'All Freelances')}
              </option>
              <option value="true" style={{ background: '#1a1a1a' }}>
                {t('freelances.in_nightclubs', 'In Nightclubs')}
              </option>
              <option value="false" style={{ background: '#1a1a1a' }}>
                {t('freelances.free', 'Free (No Nightclub)')}
              </option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label style={{
              display: 'block',
              color: '#FFD700',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              🔄 {t('filters.sort_by', 'Sort By')}
            </label>
            <select
              value={filters.sort_by}
              onChange={(e) => handleFilterChange('sort_by', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(193, 154, 107, 0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px'
              }}
            >
              <option value="vip" style={{ background: '#1a1a1a' }}>
                {t('sort.vip_first', 'VIP First')}
              </option>
              <option value="name" style={{ background: '#1a1a1a' }}>
                {t('sort.name', 'Name')}
              </option>
              <option value="age" style={{ background: '#1a1a1a' }}>
                {t('sort.age', 'Age')}
              </option>
              <option value="created_at" style={{ background: '#1a1a1a' }}>
                {t('sort.newest', 'Newest')}
              </option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        <button
          onClick={handleClearFilters}
          style={{
            padding: '10px 20px',
            background: 'rgba(193, 154, 107, 0.08)',
            border: '2px solid rgba(193, 154, 107, 0.3)',
            borderRadius: '8px',
            color: '#C19A6B',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(193, 154, 107, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(193, 154, 107, 0.08)';
          }}
        >
          🗑️ {t('filters.clear', 'Clear Filters')}
        </button>
      </div>

      {/* Results */}
      {loading && currentPage === 1 ? (
        <div className="freelances-skeleton-grid">
          {/* Render 6 skeleton cards while loading */}
          {[...Array(6)].map((_, index) => (
            <FreelanceCardSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      ) : error ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#FF4757'
        }}>
          <p>⚠️ {error}</p>
          <button
            onClick={refreshFreelances}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: 'rgba(193, 154, 107, 0.08)',
              border: '2px solid rgba(193, 154, 107, 0.3)',
              borderRadius: '8px',
              color: '#C19A6B',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🔄 {t('retry', 'Retry')}
          </button>
        </div>
      ) : freelances.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'rgba(255,255,255,0.7)'
        }}>
          <p style={{ fontSize: '48px', marginBottom: '20px' }}>😔</p>
          <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>
            {t('freelances.no_results', 'No freelances found')}
          </h3>
          <p>{t('freelances.try_different_filters', 'Try adjusting your filters')}</p>
        </div>
      ) : (
        <>
          {/* Results Grid */}
          <div className="freelances-grid">
            {freelances.map((freelance: any) => (
              <div key={freelance.id} className="freelance-card-wrapper">
                {/* Freelance Badge */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  zIndex: 10,
                  background: 'linear-gradient(135deg, #9D4EDD 0%, #C19A6B 100%)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}>
                  💃 FREELANCE
                </div>

                <EmployeeCard
                  employee={freelance}
                  onClick={() => openEmployeeProfile(freelance)}
                />

                {/* Nightclubs Badge */}
                {freelance.nightclubs && freelance.nightclubs.length > 0 && (
                  <div style={{
                    marginTop: '-10px',
                    padding: '8px 12px',
                    background: 'rgba(123, 44, 191, 0.2)',
                    border: '1px solid rgba(123, 44, 191, 0.4)',
                    borderRadius: '0 0 12px 12px',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.9)'
                  }}>
                    🎵 {freelance.nightclubs.map((nc: any) => nc.name).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '10px',
              marginTop: '30px',
              paddingBottom: '30px'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '10px 20px',
                  background: currentPage === 1
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(157, 78, 221, 0.2)',
                  border: '2px solid rgba(157, 78, 221, 0.4)',
                  borderRadius: '8px',
                  color: currentPage === 1 ? 'rgba(255,255,255,0.3)' : '#9D4EDD',
                  fontWeight: 'bold',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                ← {t('pagination.previous', 'Previous')}
              </button>

              <div style={{
                padding: '10px 20px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                color: 'white',
                display: 'flex',
                alignItems: 'center'
              }}>
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '10px 20px',
                  background: currentPage === totalPages
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(157, 78, 221, 0.2)',
                  border: '2px solid rgba(157, 78, 221, 0.4)',
                  borderRadius: '8px',
                  color: currentPage === totalPages ? 'rgba(255,255,255,0.3)' : '#9D4EDD',
                  fontWeight: 'bold',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                {t('pagination.next', 'Next')} →
              </button>
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default FreelancesPage;
