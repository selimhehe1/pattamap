import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, BarChart3, XCircle } from 'lucide-react';
import SearchFilters from './SearchFilters';
import SearchResults from './SearchResults';
import { Employee } from '../../types';
import { useModal } from '../../contexts/ModalContext';
import { GirlProfile } from '../../routes/lazyComponents';
import { useEmployeeSearch } from '../../hooks/useEmployees';
import { logger } from '../../utils/logger';
import '../../styles/layout/search-layout.css';

// Development logging helper
const isDev = process.env.NODE_ENV === 'development';
const debugLog = (message: string, data?: unknown) => {
  if (isDev) logger.debug(message, data);
};

const SearchPage: React.FC = () => {
  const { t } = useTranslation();
  const [urlParams, setUrlParams] = useSearchParams();
  const { openModal, closeModal } = useModal();

  // Current filter values from URL
  const [filters, setFilters] = useState({
    q: urlParams.get('q') || '',
    type: urlParams.get('type') || 'all', // 🆕 v10.3 - Employee type filter (all/freelance/regular)
    nationality: urlParams.get('nationality') || '',
    zone: urlParams.get('zone') || '',
    establishment_id: urlParams.get('establishment_id') || '',
    category_id: urlParams.get('category_id') || '',
    age_min: urlParams.get('age_min') || '',
    age_max: urlParams.get('age_max') || '',
    is_verified: urlParams.get('is_verified') || '', // 🆕 v10.2 - Verified filter
    sort_by: urlParams.get('sort_by') || 'relevance',
    sort_order: urlParams.get('sort_order') || 'desc'
  });

  const [isTyping, setIsTyping] = useState(false);
  const [currentPage, setCurrentPage] = useState(1); // 🆕 Pagination state
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  // Stable filter key for dependency tracking (avoids long dependency arrays)
  const filterKey = useMemo(
    () => JSON.stringify(filters),
    [filters]
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterKey]);

  // Scroll to top when filters or page change
  useEffect(() => {
    // Scroll main content container
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }

    // Also scroll window to top (for better UX)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, filters.type, filters.nationality, filters.zone, filters.establishment_id, filters.category_id, filters.age_min, filters.age_max, filters.is_verified, filters.sort_by, filters.sort_order]);

  // ⚡ React Query hook with pagination - Retourne une seule page
  const {
    data,
    isFetching,
    error
  } = useEmployeeSearch({
    ...filters,
    page: currentPage,
    limit: 20
  });

  // Extract data from current page
  const searchResults = data?.employees || [];
  const totalResults = data?.total || 0;
  const totalPages = Math.ceil(totalResults / 20);
  const availableFilters = {
    nationalities: data?.filters?.availableNationalities || [],
    zones: data?.filters?.availableZones || [],
    establishments: data?.filters?.availableEstablishments || [],
    categories: data?.filters?.availableCategories || []
  };


  // Update URL params
  const updateUrlParams = useCallback((newFilters: typeof filters) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      // ✅ Strict check to avoid removing valid falsy values like '0' or 'false'
      if (value !== undefined && value !== null && value.toString().trim() !== '') {
        // ✅ Skip default values to keep URLs clean and avoid cache key issues
        if (key === 'type' && value === 'all') return;
        if (key === 'sort_by' && value === 'relevance') return;
        if (key === 'sort_order' && value === 'desc') return;

        params.set(key, value.toString());
      }
    });
    setUrlParams(params);
  }, [setUrlParams]);

  // Synchronize URL params with filters state (debounced to avoid too many history entries)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateUrlParams(filters);
    }, 150); // Debounce URL updates to avoid spamming browser history

    return () => clearTimeout(timeoutId);
  }, [filters, updateUrlParams]);

  // Handle text query changes with optimized debounce
  // 🚀 OPTIMIZED: Single debounce location (here) - SearchFilters calls directly without debounce
  const handleQueryChange = useCallback((value: string) => {
    setIsTyping(true);

    // Clear previous timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // 🎯 250ms debounce - balanced between responsiveness and API efficiency
    // Not too short (to avoid hammering the server)
    // Not too long (to feel instant)
    debounceTimeout.current = setTimeout(() => {
      // ✅ Just update filters - useEffect will handle URL sync
      setFilters(prev => ({ ...prev, q: value }));
      setIsTyping(false);
    }, 250);
  }, []);

  // Handle zone change with establishment reset
  const handleZoneChange = useCallback((zoneValue: string) => {
    // ✅ Just update filters - useEffect will handle URL sync
    setFilters(prev => ({
      ...prev,
      zone: zoneValue,
      establishment_id: '' // Reset establishment when zone changes
    }));
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((key: string, value: string) => {
    // ✅ Just update filters - useEffect will handle URL sync
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [key]: value
      };

      // Auto-adjust sort_order based on sort_by
      if (key === 'sort_by') {
        if (value === 'name' || value === 'oldest') {
          newFilters.sort_order = 'asc';
        } else {
          newFilters.sort_order = 'desc';
        }
      }

      return newFilters;
    });
  }, []);

  // Handle clearing all filters
  const handleClearFilters = useCallback(() => {
    debugLog('🗑️ CLEAR ALL FILTERS');

    // ✅ Just update filters - useEffect will handle URL sync
    setFilters({
      q: '',
      type: 'all', // 🆕 v10.3 - Reset type filter
      nationality: '',
      zone: '',
      establishment_id: '',
      category_id: '',
      age_min: '',
      age_max: '',
      is_verified: '', // 🆕 v10.2 - Reset verified filter
      sort_by: 'relevance',
      sort_order: 'desc'
    });
  }, []);

  // Handle page change - Update current page state
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    // Scroll already handled by useEffect above
  }, []);

  // Handle employee profile navigation
  const handleEmployeeClick = useCallback((employee: Employee) => {
    debugLog('Opening profile for employee:', employee.name);
    openModal('employee-profile', GirlProfile, {
      girl: employee,
      onClose: () => closeModal('employee-profile')
    }, {
      size: 'fullscreen',
      showCloseButton: false
    });
  }, [openModal, closeModal]);

  return (
    <div id="main-content" className="bg-nightlife-gradient-main page-content-with-header-nightlife" tabIndex={-1} data-testid="search-page">
      {/* Header Section - AVANT search-results-container pour éviter d'être caché par le padding-left de la sidebar */}
      <div className="header-centered-nightlife" style={{
        padding: '30px 20px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h1 className="header-title-nightlife" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Search size={28} color="var(--color-primary)" /> {t('search.title')}
        </h1>
        <p className="header-subtitle-nightlife">
          {t('search.subtitle')}
        </p>

        {/* Results Summary */}
        {!isFetching && totalResults > 0 && (
          <div style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: 'rgba(193, 154, 107,0.1)',
            border: '1px solid rgba(193, 154, 107,0.3)',
            borderRadius: '25px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#C19A6B'
          }}>
            <BarChart3 size={16} /> {filters.q
              ? t('search.foundResultsFor', { count: totalResults, query: filters.q })
              : t('search.foundResults', { count: totalResults })}
          </div>
        )}
      </div>

      <div className="search-results-container-nightlife" data-testid="search-results-container">
        {/* Fixed Filters Sidebar */}
        <SearchFilters
          filters={filters}
          availableFilters={availableFilters}
          onFilterChange={handleFilterChange}
          onZoneChange={handleZoneChange}
          onQueryChange={handleQueryChange}
          onClearFilters={handleClearFilters}
          loading={isFetching}
          isTyping={isTyping}
        />

        {/* Results Section */}
        <div style={{
          minHeight: 'calc(100vh - 200px)'
        }}>
          {error && (
            <div style={{
              padding: '20px',
              background: 'rgba(255,71,87,0.1)',
              border: '2px solid #FF4757',
              borderRadius: '15px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}><XCircle size={32} color="#FF4757" /></div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF4757' }}>
                {t('search.error')}
              </div>
              <div style={{ fontSize: '14px', color: '#ffffff', marginTop: '5px' }}>
                {error.message}
              </div>
            </div>
          )}

          {!error && (
            <SearchResults
              key={`${filters.type}-${filters.nationality}-${filters.zone}-${filters.establishment_id}-${filters.category_id}-${filters.is_verified}`}
              results={searchResults}
              loading={isFetching}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onEmployeeClick={handleEmployeeClick}
              totalResults={totalResults}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;