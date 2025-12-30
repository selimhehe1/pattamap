import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { XCircle, X, ArrowUpDown, ChevronDown } from 'lucide-react';
import SearchFilters from './SearchFilters';
import SearchResults from './SearchResults';
import SearchHero from './SearchHero';
import MobileFilterDrawer, { MobileFilterFAB } from './MobileFilterDrawer';
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
    sort_order: urlParams.get('sort_order') || 'desc',
    // 🆕 v11.0 - Advanced filters
    languages: urlParams.get('languages') || '',
    min_rating: urlParams.get('min_rating') || '',
    has_photos: urlParams.get('has_photos') || '',
    social_media: urlParams.get('social_media') || ''
  });

  const [isTyping, setIsTyping] = useState(false);
  const [currentPage, setCurrentPage] = useState(1); // 🆕 Pagination state
  const [isMobile, setIsMobile] = useState(false); // 🆕 v11.0 - Mobile detection
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // 🆕 v11.0 - Mobile drawer state
  const [isSortOpen, setIsSortOpen] = useState(false); // 🆕 v11.2 - Custom sort dropdown
  const sortDropdownRef = useRef<HTMLDivElement>(null); // 🆕 v11.2 - Click outside handler
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

  // 🆕 v11.0 - Mobile detection
  useEffect(() => {
    const mobileMediaQuery = window.matchMedia('(max-width: 48rem)'); // 768px

    const handleMobileChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    // Initial check
    handleMobileChange(mobileMediaQuery);

    // Add listener for changes
    mobileMediaQuery.addEventListener('change', handleMobileChange);

    return () => {
      mobileMediaQuery.removeEventListener('change', handleMobileChange);
    };
  }, []);

  // 🆕 v11.2 - Close sort dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };

    if (isSortOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSortOpen]);

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
      sort_order: 'desc',
      // 🆕 v11.0 - Reset advanced filters
      languages: '',
      min_rating: '',
      has_photos: '',
      social_media: ''
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

  // Calculate verified count from results (approximate)
  const verifiedCount = useMemo(() => {
    return searchResults.filter(emp => emp.is_verified).length;
  }, [searchResults]);

  // 🆕 v11.0 - Active filters count and list for chips
  const activeFilters = useMemo(() => {
    const active: Array<{ key: string; label: string; value: string }> = [];

    if (filters.q) active.push({ key: 'q', label: t('search.searchName', 'Name'), value: filters.q });
    if (filters.nationality) active.push({ key: 'nationality', label: t('search.nationality', 'Nationality'), value: filters.nationality });
    if (filters.zone) active.push({ key: 'zone', label: t('search.zone', 'Zone'), value: filters.zone });
    if (filters.category_id) active.push({ key: 'category_id', label: t('search.category', 'Type'), value: availableFilters.categories.find(c => String(c.id) === filters.category_id)?.name || filters.category_id });
    if (filters.establishment_id) active.push({ key: 'establishment_id', label: t('search.establishment', 'Establishment'), value: availableFilters.establishments.find(e => e.id === filters.establishment_id)?.name || filters.establishment_id });
    if (filters.age_min || filters.age_max) {
      const ageLabel = filters.age_min && filters.age_max
        ? `${filters.age_min}-${filters.age_max}`
        : filters.age_min
          ? `${filters.age_min}+`
          : `≤${filters.age_max}`;
      active.push({ key: 'age', label: t('search.ageRange', 'Age'), value: ageLabel });
    }
    if (filters.is_verified === 'true') active.push({ key: 'is_verified', label: t('search.verified', 'Verified'), value: '✓' });
    if (filters.languages) active.push({ key: 'languages', label: t('search.languages', 'Languages'), value: filters.languages.split(',').join(', ') });
    if (filters.min_rating) active.push({ key: 'min_rating', label: t('search.rating', 'Rating'), value: `${filters.min_rating}+★` });
    if (filters.has_photos === 'true') active.push({ key: 'has_photos', label: t('search.photos', 'Photos'), value: '✓' });
    if (filters.social_media) active.push({ key: 'social_media', label: t('search.socialMedia', 'Social'), value: filters.social_media.split(',').length.toString() });

    return active;
  }, [filters, availableFilters, t]);

  const activeFiltersCount = activeFilters.length;

  // Remove a specific filter
  const handleRemoveFilter = useCallback((key: string) => {
    if (key === 'age') {
      setFilters(prev => ({ ...prev, age_min: '', age_max: '' }));
    } else {
      setFilters(prev => ({ ...prev, [key]: '' }));
    }
  }, []);

  return (
    <div id="main-content" className="bg-nightlife-gradient-main page-content-with-header-nightlife" tabIndex={-1} data-testid="search-page">
      {/* Hero Section - Neo-Nightlife v11.0 */}
      <SearchHero
        totalResults={totalResults}
        verifiedCount={verifiedCount}
        isLoading={isFetching}
      />

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
          {/* 🆕 v11.1 - Sort Bar + Active Filters (fix #5) */}
          <div className="results-header-bar" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {/* Results count */}
            <div style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              {totalResults > 0 && (
                <span>{totalResults} {t('search.results', 'results')}</span>
              )}
            </div>

            {/* 🆕 v11.2 - Custom Sort Dropdown (sans VIP) */}
            <div
              ref={sortDropdownRef}
              style={{ position: 'relative' }}
            >
              <button
                onClick={() => !isFetching && setIsSortOpen(!isSortOpen)}
                disabled={isFetching}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: isSortOpen
                    ? 'linear-gradient(135deg, rgba(232, 121, 249, 0.2), rgba(168, 85, 247, 0.15))'
                    : 'rgba(10, 0, 20, 0.6)',
                  border: `1px solid ${isSortOpen ? 'rgba(232, 121, 249, 0.5)' : 'rgba(232, 121, 249, 0.25)'}`,
                  borderRadius: '10px',
                  padding: '8px 14px',
                  color: '#E879F9',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: isFetching ? 'not-allowed' : 'pointer',
                  opacity: isFetching ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  boxShadow: isSortOpen ? '0 0 16px rgba(232, 121, 249, 0.2)' : 'none'
                }}
              >
                <ArrowUpDown size={14} />
                <span>
                  {filters.sort_by === 'relevance' && t('search.sortOptions.relevance', 'Relevance')}
                  {filters.sort_by === 'popularity' && t('search.sortOptions.popular', 'Popular')}
                  {filters.sort_by === 'newest' && t('search.sortOptions.newest', 'Newest')}
                  {filters.sort_by === 'oldest' && t('search.sortOptions.oldest', 'Oldest')}
                  {filters.sort_by === 'name' && t('search.sortOptions.name', 'Name A-Z')}
                  {!['relevance', 'popularity', 'newest', 'oldest', 'name'].includes(filters.sort_by) && t('search.sortOptions.relevance', 'Relevance')}
                </span>
                <ChevronDown
                  size={14}
                  style={{
                    transform: isSortOpen ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s ease'
                  }}
                />
              </button>

              {/* Dropdown menu */}
              {isSortOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    minWidth: '160px',
                    background: 'linear-gradient(180deg, rgba(15, 5, 30, 0.98), rgba(10, 0, 20, 0.98))',
                    border: '1px solid rgba(232, 121, 249, 0.3)',
                    borderRadius: '12px',
                    padding: '6px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(232, 121, 249, 0.15)',
                    zIndex: 100,
                    backdropFilter: 'blur(16px)'
                  }}
                >
                  {[
                    { value: 'relevance', label: t('search.sortOptions.relevance', 'Relevance') },
                    { value: 'popularity', label: t('search.sortOptions.popular', 'Popular') },
                    { value: 'newest', label: t('search.sortOptions.newest', 'Newest') },
                    { value: 'oldest', label: t('search.sortOptions.oldest', 'Oldest') },
                    { value: 'name', label: t('search.sortOptions.name', 'Name A-Z') }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        handleFilterChange('sort_by', option.value);
                        setIsSortOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        padding: '10px 12px',
                        background: filters.sort_by === option.value
                          ? 'linear-gradient(135deg, rgba(232, 121, 249, 0.2), rgba(168, 85, 247, 0.15))'
                          : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        color: filters.sort_by === option.value ? '#E879F9' : 'rgba(255, 255, 255, 0.8)',
                        fontSize: '13px',
                        fontWeight: filters.sort_by === option.value ? '600' : '400',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        if (filters.sort_by !== option.value) {
                          e.currentTarget.style.background = 'rgba(232, 121, 249, 0.1)';
                          e.currentTarget.style.color = '#E879F9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (filters.sort_by !== option.value) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                        }
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Filters Bar */}
          {activeFiltersCount > 0 && (
            <div className="active-filters-bar">
              {activeFilters.map((filter) => (
                <button
                  key={filter.key}
                  className="active-filter-chip"
                  onClick={() => handleRemoveFilter(filter.key)}
                  title={`${t('search.removeFilter', 'Remove')}: ${filter.label}`}
                >
                  <span className="active-filter-chip-label">{filter.label}:</span>
                  <span className="active-filter-chip-value">{filter.value}</span>
                  <span className="active-filter-chip-remove">
                    <X size={10} />
                  </span>
                </button>
              ))}
              {activeFiltersCount > 1 && (
                <button
                  className="clear-all-filters-link"
                  onClick={handleClearFilters}
                >
                  {t('search.clearAll', 'Clear All')}
                </button>
              )}
            </div>
          )}

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

      {/* 🆕 v11.0 - Mobile Filter FAB */}
      {isMobile && (
        <MobileFilterFAB
          onClick={() => setIsDrawerOpen(true)}
          activeFiltersCount={activeFiltersCount}
        />
      )}

      {/* 🆕 v11.0 - Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onClear={handleClearFilters}
        activeFiltersCount={activeFiltersCount}
      >
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
      </MobileFilterDrawer>
    </div>
  );
};

export default SearchPage;