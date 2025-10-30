import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { haptic } from '../../utils/haptics';
import '../../styles/components/pagination.css';

/**
 * Pagination Component
 *
 * Professional pagination with smart page number display, responsive design,
 * and full i18n support.
 *
 * Features:
 * - First/Previous/Next/Last controls
 * - Smart page number display with ellipsis
 * - Responsive: Mobile (3 nums), Tablet (5 nums), Desktop (7 nums)
 * - Framer Motion animations
 * - Haptic feedback on mobile
 * - WCAG 2.1 Level AAA compliant (44px touch targets)
 * - i18n support (6 languages)
 *
 * Usage:
 * ```tsx
 * <Pagination
 *   currentPage={1}
 *   totalPages={10}
 *   onPageChange={(page) => setCurrentPage(page)}
 * />
 * ```
 */

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Calculate which page numbers to display
 * Returns array like: [1, 2, 3, '...', 10] or [1, '...', 5, 6, 7, '...', 10]
 */
const getPageNumbers = (currentPage: number, totalPages: number, maxVisible: number): (number | string)[] => {
  if (totalPages <= maxVisible) {
    // Show all pages if total is less than max visible
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const halfVisible = Math.floor((maxVisible - 2) / 2); // -2 for first and last pages
  const pages: (number | string)[] = [];

  // Always show first page
  pages.push(1);

  // Calculate start and end of middle section
  let start = Math.max(2, currentPage - halfVisible);
  let end = Math.min(totalPages - 1, currentPage + halfVisible);

  // Adjust if near edges
  if (currentPage <= halfVisible + 2) {
    end = Math.min(maxVisible - 1, totalPages - 1);
  } else if (currentPage >= totalPages - halfVisible - 1) {
    start = Math.max(2, totalPages - maxVisible + 2);
  }

  // Add ellipsis after first page if needed
  if (start > 2) {
    pages.push('...');
  }

  // Add middle pages
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  // Add ellipsis before last page if needed
  if (end < totalPages - 1) {
    pages.push('...');
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
  disabled = false
}) => {
  const { t } = useTranslation();

  // Responsive page number limits
  const maxVisiblePages = useMemo(() => {
    if (typeof window === 'undefined') return 7;
    if (window.innerWidth < 768) return 3; // Mobile: 3 numbers
    if (window.innerWidth < 1024) return 5; // Tablet: 5 numbers
    return 7; // Desktop: 7 numbers
  }, []);

  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages, maxVisiblePages),
    [currentPage, totalPages, maxVisiblePages]
  );

  const isDisabled = disabled || loading;
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  const handlePageChange = (page: number) => {
    if (isDisabled || page < 1 || page > totalPages || page === currentPage) return;
    haptic.light();
    onPageChange(page);
  };

  // No pagination needed for single page
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="pagination" aria-label={t('pagination.navigation', { defaultValue: 'Pagination Navigation' })}>
      <div className="pagination-container">
        {/* First Page Button (Desktop only) */}
        <motion.button
          className="pagination-btn pagination-btn--first"
          onClick={() => handlePageChange(1)}
          disabled={isFirstPage || isDisabled}
          whileHover={!isFirstPage && !isDisabled ? { scale: 1.05 } : {}}
          whileTap={!isFirstPage && !isDisabled ? { scale: 0.95 } : {}}
          aria-label={t('pagination.first', { defaultValue: 'First page' })}
        >
          {t('pagination.first', { defaultValue: 'First' })}
        </motion.button>

        {/* Previous Page Button */}
        <motion.button
          className="pagination-btn pagination-btn--prev"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={isFirstPage || isDisabled}
          whileHover={!isFirstPage && !isDisabled ? { scale: 1.05 } : {}}
          whileTap={!isFirstPage && !isDisabled ? { scale: 0.95 } : {}}
          aria-label={t('pagination.previous', { defaultValue: 'Previous page' })}
        >
          <span className="pagination-btn--prev-text">{t('pagination.previous', { defaultValue: 'Previous' })}</span>
          <span className="pagination-btn--prev-icon">‹</span>
        </motion.button>

        {/* Page Numbers */}
        <div className="pagination-numbers">
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
              <motion.button
                key={pageNum}
                className={`pagination-btn pagination-btn--number ${isActive ? 'pagination-btn--active' : ''}`}
                onClick={() => handlePageChange(pageNum)}
                disabled={isActive || isDisabled}
                whileHover={!isActive && !isDisabled ? { scale: 1.1, y: -2 } : {}}
                whileTap={!isActive && !isDisabled ? { scale: 0.95 } : {}}
                aria-label={t('pagination.goToPage', { page: pageNum, defaultValue: `Go to page ${pageNum}` })}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNum}
              </motion.button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <motion.button
          className="pagination-btn pagination-btn--next"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={isLastPage || isDisabled}
          whileHover={!isLastPage && !isDisabled ? { scale: 1.05 } : {}}
          whileTap={!isLastPage && !isDisabled ? { scale: 0.95 } : {}}
          aria-label={t('pagination.next', { defaultValue: 'Next page' })}
        >
          <span className="pagination-btn--next-icon">›</span>
          <span className="pagination-btn--next-text">{t('pagination.next', { defaultValue: 'Next' })}</span>
        </motion.button>

        {/* Last Page Button (Desktop only) */}
        <motion.button
          className="pagination-btn pagination-btn--last"
          onClick={() => handlePageChange(totalPages)}
          disabled={isLastPage || isDisabled}
          whileHover={!isLastPage && !isDisabled ? { scale: 1.05 } : {}}
          whileTap={!isLastPage && !isDisabled ? { scale: 0.95 } : {}}
          aria-label={t('pagination.last', { defaultValue: 'Last page' })}
        >
          {t('pagination.last', { defaultValue: 'Last' })}
        </motion.button>
      </div>

      {/* Page Info (Mobile friendly) */}
      <div className="pagination-info">
        {t('pagination.pageInfo', {
          current: currentPage,
          total: totalPages,
          defaultValue: `Page ${currentPage} of ${totalPages}`
        })}
      </div>
    </nav>
  );
};

export default Pagination;
