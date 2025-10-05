import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchFilters from './SearchFilters';
import SearchResults from './SearchResults';
import { Employee, PaginatedResponse } from '../../types';
import { useModal } from '../../contexts/ModalContext';
import GirlProfile from '../Bar/GirlProfile';
import { logger } from '../../utils/logger';

// Development logging helper
const isDev = process.env.NODE_ENV === 'development';
const debugLog = (message: string, data?: any) => {
  if (isDev) logger.debug(message, data);
};

interface SearchResponse extends PaginatedResponse<Employee> {
  filters: {
    availableNationalities: string[];
    availableZones: string[];
    availableEstablishments: Array<{ id: string; name: string; zone: string; }>;
    availableCategories: Array<{ id: number; name: string; icon: string; }>;
  };
  sortOptions: Array<{ value: string; label: string; }>;
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openModal, closeModal } = useModal();

  // Search state
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Available filters (populated from API)
  const [availableFilters, setAvailableFilters] = useState({
    nationalities: [] as string[],
    zones: [] as string[],
    establishments: [] as Array<{ id: string; name: string; zone: string; }>,
    categories: [] as Array<{ id: number; name: string; icon: string; }>
  });

  // Current filter values (including query)
  const [filters, setFilters] = useState({
    query: searchParams.get('q') || '',
    nationality: searchParams.get('nationality') || '',
    zone: searchParams.get('zone') || '',
    establishment_id: searchParams.get('establishment_id') || '',
    category_id: searchParams.get('category_id') || '',
    age_min: searchParams.get('age_min') || '',
    age_max: searchParams.get('age_max') || '',
    sort_by: searchParams.get('sort_by') || 'relevance',
    sort_order: searchParams.get('sort_order') || 'desc'
  });

  // Typing state for better UX feedback
  const [isTyping, setIsTyping] = useState(false);

  // Perform search API call
  const performSearch = useCallback(async (page: number = 1, loadMore: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      // Add search parameters
      if (filters.query) params.append('q', filters.query);
      if (filters.nationality) params.append('nationality', filters.nationality);
      if (filters.zone) params.append('zone', filters.zone);
      if (filters.establishment_id) params.append('establishment_id', filters.establishment_id);
      if (filters.category_id) params.append('category_id', filters.category_id);
      if (filters.age_min) params.append('age_min', filters.age_min);
      if (filters.age_max) params.append('age_max', filters.age_max);
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      if (filters.sort_order) params.append('sort_order', filters.sort_order);

      params.append('page', page.toString());
      params.append('limit', '20');

      debugLog('🔍 Performing search with params:', params.toString());

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees/search?${params}`);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data: SearchResponse = await response.json();
      debugLog('📊 Search results:', data);

      // Update results
      if (loadMore && page > 1) {
        setSearchResults(prev => [...prev, ...data.data]);
      } else {
        setSearchResults(data.data);
      }

      setTotalResults(data.total);
      setCurrentPage(data.page);
      setHasMore(data.hasMore);

      // Update available filters (only from first page)
      if (page === 1 && data.filters) {
        setAvailableFilters({
          nationalities: data.filters.availableNationalities || [],
          zones: data.filters.availableZones || [],
          establishments: data.filters.availableEstablishments || [],
          categories: data.filters.availableCategories || []
        });
      }

    } catch (err) {
      if (isDev) logger.error('❌ Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Update URL params
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();

    // Add all filter values to URL
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value.toString().trim()) {
        params.set(key, value.toString());
      }
    });

    setSearchParams(params);
  }, [filters, setSearchParams]);

  // Handle text query changes with debounce - Scheduler optimized
  const handleQueryChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, query: value }));
    setIsTyping(true);

    // Use requestIdleCallback for non-urgent operations
    const scheduleSearch = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          setIsTyping(false);
          performSearch(1, false);
          updateUrlParams();
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          setIsTyping(false);
          performSearch(1, false);
          updateUrlParams();
        }, 0);
      }
    };

    // Increased debounce to avoid scheduler violations
    setTimeout(scheduleSearch, 1000); // Increased from 800ms to 1000ms
  }, [performSearch, updateUrlParams]);

  // Handle zone change with establishment reset
  const handleZoneChange = useCallback((zoneValue: string) => {
    requestAnimationFrame(() => {
      const newFilters = {
        ...filters,
        zone: zoneValue,
        establishment_id: '' // Reset establishment when zone changes
      };

      setFilters(newFilters);
      setCurrentPage(1);

      // Perform search with new filters
      const performSearchWithNewFilters = async () => {
        setLoading(true);
        setError(null);

        try {
          const params = new URLSearchParams();

          if (newFilters.query) params.append('q', newFilters.query);
          if (newFilters.nationality) params.append('nationality', newFilters.nationality);
          if (newFilters.zone) params.append('zone', newFilters.zone);
          if (newFilters.establishment_id) params.append('establishment_id', newFilters.establishment_id);
          if (newFilters.category_id) params.append('category_id', newFilters.category_id);
          if (newFilters.age_min) params.append('age_min', newFilters.age_min);
          if (newFilters.age_max) params.append('age_max', newFilters.age_max);
          if (newFilters.sort_by) params.append('sort_by', newFilters.sort_by);
          if (newFilters.sort_order) params.append('sort_order', newFilters.sort_order);

          params.append('page', '1');
          params.append('limit', '20');

          debugLog('🔍 Performing search with params:', params.toString());

          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees/search?${params}`);

          if (!response.ok) {
            throw new Error(`Search failed: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          debugLog('📊 Search results:', data);

          setSearchResults(data.data);
          setTotalResults(data.total);
          setCurrentPage(data.page);
          setHasMore(data.hasMore);

          if (data.filters) {
            if ('requestIdleCallback' in window) {
              requestIdleCallback(() => {
                setAvailableFilters({
                  nationalities: data.filters.availableNationalities || [],
                  zones: data.filters.availableZones || [],
                  establishments: data.filters.availableEstablishments || [],
                  categories: data.filters.availableCategories || []
                });
              });
            } else {
              setAvailableFilters({
                nationalities: data.filters.availableNationalities || [],
                zones: data.filters.availableZones || [],
                establishments: data.filters.availableEstablishments || [],
                categories: data.filters.availableCategories || []
              });
            }
          }

        } catch (err) {
          if (isDev) logger.error('❌ Search error:', err);
          setError(err instanceof Error ? err.message : 'Search failed');
        } finally {
          setLoading(false);
        }
      };

      performSearchWithNewFilters();

      const updateUrl = () => {
        const params = new URLSearchParams();
        Object.entries(newFilters).forEach(([key, value]) => {
          if (value && value.toString().trim()) {
            params.set(key, value.toString());
          }
        });
        setSearchParams(params);
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(updateUrl);
      } else {
        setTimeout(updateUrl, 0);
      }
    });
  }, [filters, setSearchParams]);

  // Handle filter changes - Scheduler optimized
  const handleFilterChange = useCallback((key: string, value: string) => {
    // Use requestAnimationFrame for smooth state updates
    requestAnimationFrame(() => {
      let newFilters = {
        ...filters,
        [key]: value
      };

      // CRITICAL FIX: Auto-adjust sort_order based on sort_by for intuitive behavior
      if (key === 'sort_by') {
        if (value === 'name') {
          // Name A-Z should be ascending by default
          newFilters.sort_order = 'asc';
          debugLog('🔤 Name sort selected - Auto-setting sort_order to asc');
        } else if (value === 'oldest') {
          // Oldest should be ascending (oldest first)
          newFilters.sort_order = 'asc';
        } else {
          // All others (relevance, popularity, newest) should be descending
          newFilters.sort_order = 'desc';
        }
      }

      setFilters(newFilters);
      setCurrentPage(1);

      // Use performSearch directly with newFilters to avoid timing issues
      const performSearchWithNewFilters = async () => {
        setLoading(true);
        setError(null);

        try {
          const params = new URLSearchParams();

          // Add search parameters using newFilters
          if (newFilters.query) params.append('q', newFilters.query);
          if (newFilters.nationality) params.append('nationality', newFilters.nationality);
          if (newFilters.zone) params.append('zone', newFilters.zone);
          if (newFilters.establishment_id) params.append('establishment_id', newFilters.establishment_id);
          if (newFilters.category_id) params.append('category_id', newFilters.category_id);
          if (newFilters.age_min) params.append('age_min', newFilters.age_min);
          if (newFilters.age_max) params.append('age_max', newFilters.age_max);
          if (newFilters.sort_by) params.append('sort_by', newFilters.sort_by);
          if (newFilters.sort_order) params.append('sort_order', newFilters.sort_order);

          params.append('page', '1');
          params.append('limit', '20');

          debugLog('🔍 Performing immediate search with params:', params.toString());

          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees/search?${params}`);

          if (!response.ok) {
            throw new Error(`Search failed: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          debugLog('📊 Search results:', data);

          setSearchResults(data.data);
          setTotalResults(data.total);
          setCurrentPage(data.page);
          setHasMore(data.hasMore);

          // Update available filters using idle callback to avoid blocking
          if (data.filters) {
            if ('requestIdleCallback' in window) {
              requestIdleCallback(() => {
                setAvailableFilters({
                  nationalities: data.filters.availableNationalities || [],
                  zones: data.filters.availableZones || [],
                  establishments: data.filters.availableEstablishments || [],
                  categories: data.filters.availableCategories || []
                });
              });
            } else {
              setAvailableFilters({
                nationalities: data.filters.availableNationalities || [],
                zones: data.filters.availableZones || [],
                establishments: data.filters.availableEstablishments || [],
                categories: data.filters.availableCategories || []
              });
            }
          }

        } catch (err) {
          if (isDev) logger.error('❌ Search error:', err);
          setError(err instanceof Error ? err.message : 'Search failed');
        } finally {
          setLoading(false);
        }
      };

      // Execute search immediately
      performSearchWithNewFilters();

      // Update URL params using idle callback to avoid blocking
      const updateUrl = () => {
        const params = new URLSearchParams();
        Object.entries(newFilters).forEach(([key, value]) => {
          if (value && value.toString().trim()) {
            params.set(key, value.toString());
          }
        });
        setSearchParams(params);
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(updateUrl);
      } else {
        setTimeout(updateUrl, 0);
      }
    });
  }, [filters, setSearchParams]);

  // Handle clearing all filters - Scheduler optimized
  const handleClearFilters = useCallback(() => {
    debugLog('🗑️ CLEAR ALL FILTERS');

    // Use requestAnimationFrame for smooth state updates
    requestAnimationFrame(() => {
      const clearedFilters = {
        query: '',
        nationality: '',
        zone: '',
        establishment_id: '',
        category_id: '',
        age_min: '',
        age_max: '',
        sort_by: 'relevance',
        sort_order: 'desc'
      };

      setFilters(clearedFilters);
      setCurrentPage(1);

      // Execute search immediately with cleared filters
      const performSearchWithClearedFilters = async () => {
        setLoading(true);
        setError(null);

        try {
          const params = new URLSearchParams();

          // Add search parameters using clearedFilters (all empty except defaults)
          params.append('sort_by', 'relevance');
          params.append('sort_order', 'desc');
          params.append('page', '1');
          params.append('limit', '20');

          debugLog('🔍 Performing immediate search with cleared filters:', params.toString());

          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees/search?${params}`);

          if (!response.ok) {
            throw new Error(`Search failed: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          debugLog('📊 Search results after clear:', data);

          setSearchResults(data.data);
          setTotalResults(data.total);
          setCurrentPage(data.page);
          setHasMore(data.hasMore);

          // Update available filters using idle callback
          if (data.filters) {
            if ('requestIdleCallback' in window) {
              requestIdleCallback(() => {
                setAvailableFilters({
                  nationalities: data.filters.availableNationalities || [],
                  zones: data.filters.availableZones || [],
                  establishments: data.filters.availableEstablishments || [],
                  categories: data.filters.availableCategories || []
                });
              });
            } else {
              setAvailableFilters({
                nationalities: data.filters.availableNationalities || [],
                zones: data.filters.availableZones || [],
                establishments: data.filters.availableEstablishments || [],
                categories: data.filters.availableCategories || []
              });
            }
          }

        } catch (err) {
          if (isDev) logger.error('❌ Search error after clear:', err);
          setError(err instanceof Error ? err.message : 'Search failed');
        } finally {
          setLoading(false);
        }
      };

      // Execute search immediately
      performSearchWithClearedFilters();

      // Update URL params to cleared state using idle callback
      const updateUrl = () => {
        const params = new URLSearchParams();
        params.set('sort_by', 'relevance');
        params.set('sort_order', 'desc');
        setSearchParams(params);
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(updateUrl);
      } else {
        setTimeout(updateUrl, 0);
      }
    });
  }, [setSearchParams]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      performSearch(currentPage + 1, true);
    }
  }, [loading, hasMore, currentPage, performSearch]);

  // Handle employee profile navigation
  const handleEmployeeClick = useCallback((employee: Employee) => {
    debugLog('Opening profile for employee:', employee.name);
    openModal('employee-profile', GirlProfile, {
      girl: employee,
      onClose: () => closeModal('employee-profile')
    }, {
      size: 'profile'
    });
  }, [openModal, closeModal]);


  // Initial search on mount only
  useEffect(() => {
    debugLog('🚀 Initial search on mount');
    performSearch(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  return (
    <div className="page-content-with-header-nightlife" style={{
      background: 'linear-gradient(135deg, #0a0a2e, #16213e, #240046)',
      color: '#ffffff'
    }}>
      {/* Header Section */}
      <div style={{
        padding: '30px 20px',
        textAlign: 'center',
        borderBottom: '2px solid rgba(255,27,141,0.3)'
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: '900',
          background: 'linear-gradient(45deg, #FF1B8D, #FFD700)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 30px rgba(255,27,141,0.5)',
          marginBottom: '10px',
          fontFamily: '"Orbitron", monospace'
        }}>
          🔍 Advanced Employee Search
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#00FFFF',
          textShadow: '0 0 10px rgba(0,255,255,0.3)',
          margin: '0'
        }}>
          Find employees by name, age, nationality, zone, and establishment
        </p>

        {/* Results Summary */}
        {!loading && totalResults > 0 && (
          <div style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: 'rgba(255,27,141,0.1)',
            border: '1px solid rgba(255,27,141,0.3)',
            borderRadius: '25px',
            display: 'inline-block',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#FF1B8D'
          }}>
            📊 Found {totalResults} result{totalResults !== 1 ? 's' : ''}
            {filters.query && ` for "${filters.query}"`}
          </div>
        )}
      </div>

      <div className="search-results-container-nightlife">
        {/* Fixed Filters Sidebar */}
        <SearchFilters
          filters={filters}
          availableFilters={availableFilters}
          onFilterChange={handleFilterChange}
          onZoneChange={handleZoneChange}
          onQueryChange={handleQueryChange}
          onClearFilters={handleClearFilters}
          loading={loading}
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
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>❌</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF4757' }}>
                Search Error
              </div>
              <div style={{ fontSize: '14px', color: '#ffffff', marginTop: '5px' }}>
                {error}
              </div>
            </div>
          )}

          {!error && (
            <SearchResults
              results={searchResults}
              loading={loading}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              onEmployeeClick={handleEmployeeClick}
              totalResults={totalResults}
              currentPage={currentPage}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;