import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Employee } from '../../types';
import EmployeeCard from '../Common/EmployeeCard';
import { SkeletonGallery } from '../Common/Skeleton';
import Pagination from '../Common/Pagination';

interface SearchResultsProps {
  results: Employee[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEmployeeClick: (employee: Employee) => void;
  totalResults: number;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  loading,
  currentPage,
  totalPages,
  onPageChange,
  onEmployeeClick,
  totalResults
}) => {
  const { t } = useTranslation();

  // Track if animation has been triggered to prevent re-animation on data updates
  const [hasAnimated, setHasAnimated] = useState(false);

  // Trigger animation once when results arrive
  useEffect(() => {
    if (results && results.length > 0 && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [results, hasAnimated]);

  // Empty state
  if (!loading && (!results || results.length === 0)) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '20px',
        border: '2px solid rgba(193, 154, 107,0.3)'
      }} data-testid="empty-state">
        <div style={{ marginBottom: '20px' }}><Search size={64} color="var(--color-primary)" /></div>
        <h3 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#C19A6B',
          marginBottom: '10px'
        }}>
          {t('search.noResultsTitle')}
        </h3>
        <p style={{
          fontSize: '16px',
          color: '#cccccc',
          margin: '0'
        }}>
          {t('search.noResultsHint')}
        </p>
      </div>
    );
  }

  return (
    <div data-testid="search-results">
      {/* Results Grid - CSS animation instead of Framer Motion to avoid first-render issues */}
      <div
        className={`employee-search-grid ${hasAnimated ? 'animated' : ''}`}
        data-testid="search-results-grid"
      >
        {(results || []).filter(employee => employee != null).map((employee, index) => (
          <div
            key={employee.id}
            className="employee-card-wrapper"
            style={{ animationDelay: `${index * 0.05}s` }}
            data-testid="employee-card"
          >
            <EmployeeCard
              employee={employee}
              onClick={onEmployeeClick}
              showEstablishment={true}
              showRatingBadge={true}
            />
          </div>
        ))}
      </div>

      {/* Responsive CSS - Tinder Style Grid */}
      <style>{`
        .employee-search-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 20px;
          padding: 20px 0;
        }

        /* Card wrapper for stagger animation */
        .employee-card-wrapper {
          opacity: 1;
          transform: translateY(0);
          width: 100%;
          height: 100%;
        }

        /* Animate cards when grid has animated class */
        .employee-search-grid.animated .employee-card-wrapper {
          animation: cardFadeIn 0.3s ease-out forwards;
        }

        @keyframes cardFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .employee-search-grid.animated .employee-card-wrapper {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }

        /* Desktop: Optimal spacing */
        @media (min-width: 1024px) {
          .employee-search-grid {
            grid-template-columns: repeat(auto-fill, minmax(220px, 280px));
            gap: 25px;
          }
        }

        /* Tablet */
        @media (max-width: 768px) {
          .employee-search-grid {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 15px;
          }
        }

        /* Small mobile - 2 columns minimum */
        @media (max-width: 480px) {
          .employee-search-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }
      `}</style>

      {/* Pagination Component */}
      {!loading && totalPages > 1 && results && results.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          loading={loading}
        />
      )}

      {/* Pagination Info */}
      {results && results.length > 0 && (
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '14px',
          color: '#cccccc'
        }}>
          {t('search.showingResults', {
            count: results?.length || 0,
            total: totalResults,
            page: currentPage
          })}
        </div>
      )}

      {/* Initial Loading */}
      {loading && (!results || results.length === 0) && (
        <SkeletonGallery count={8} variant="employee" />
      )}
    </div>
  );
};

export default SearchResults;
