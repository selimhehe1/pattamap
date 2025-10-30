import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Employee } from '../../types';
import EmployeeCard from '../Common/EmployeeCard';
import { SkeletonGallery } from '../Common/Skeleton';
import { cardContainer, cardItem } from '../../animations/variants';
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

  // Wrapper for Framer Motion animations
  const AnimatedEmployeeCard: React.FC<{ employee: Employee }> = ({ employee }) => {
    return (
      <motion.div
        variants={cardItem}
        style={{ width: '100%', height: '100%' }}
      >
        <EmployeeCard
          employee={employee}
          onClick={onEmployeeClick}
          showEstablishment={true}
          showRatingBadge={true}
        />
      </motion.div>
    );
  };

  // Empty state
  if (!loading && (!results || results.length === 0)) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '20px',
        border: '2px solid rgba(193, 154, 107,0.3)'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔍</div>
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
    <div>
      {/* Results Grid - With stagger animation */}
      <motion.div
        className="employee-search-grid"
        variants={cardContainer}
        initial="hidden"
        animate="visible"
      >
        {(results || []).filter(employee => employee != null).map((employee) => (
          <AnimatedEmployeeCard key={employee.id} employee={employee} />
        ))}
      </motion.div>

      {/* Responsive CSS - Tinder Style Grid */}
      <style>{`
        .employee-search-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 20px;
          padding: 20px 0;
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