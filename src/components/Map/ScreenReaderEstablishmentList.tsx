import React from 'react';
import { Establishment } from '../../types';

interface ScreenReaderEstablishmentListProps {
  establishments: Establishment[];
  zone: string;
  onEstablishmentSelect?: (establishment: Establishment) => void;
}

/**
 * Screen Reader Only List of Establishments
 *
 * Provides accessible navigation for screen reader users who cannot interact
 * with the visual map. Lists all establishments with keyboard navigation.
 *
 * Accessibility Features:
 * - Hidden visually but accessible to screen readers (sr-only)
 * - Keyboard navigable with Tab and Enter
 * - ARIA landmarks and labels
 * - Clear semantic structure
 */
const ScreenReaderEstablishmentList: React.FC<ScreenReaderEstablishmentListProps> = ({
  establishments,
  zone,
  onEstablishmentSelect
}) => {
  const zoneEstablishments = establishments.filter(est => est.zone === zone);

  if (zoneEstablishments.length === 0) {
    return null;
  }

  return (
    <nav
      className="sr-only"
      aria-label={`List of ${zoneEstablishments.length} establishments in ${zone}`}
      role="navigation"
    >
      <h2 id={`${zone}-map-heading`}>
        {zone.charAt(0).toUpperCase() + zone.slice(1)} Map -
        {zoneEstablishments.length} Establishments
      </h2>

      <p>
        Use Tab to navigate through establishments, Enter to select.
      </p>

      <ul aria-labelledby={`${zone}-map-heading`}>
        {zoneEstablishments.map((est, index) => {
          const categoryName = typeof est.category_id === 'string'
            ? est.category_id
            : 'establishment';

          return (
            <li key={est.id}>
              <button
                onClick={() => onEstablishmentSelect?.(est)}
                aria-label={`
                  ${est.name},
                  ${categoryName},
                  located at row ${est.grid_row || 'unknown'} column ${est.grid_col || 'unknown'}.
                  ${est.description ? est.description : ''}
                  ${index + 1} of ${zoneEstablishments.length}
                `}
                type="button"
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  width: '1px',
                  height: '1px',
                  overflow: 'hidden'
                }}
                onFocus={(e) => {
                  // When focused, make button visible for keyboard users
                  e.currentTarget.style.position = 'static';
                  e.currentTarget.style.width = 'auto';
                  e.currentTarget.style.height = 'auto';
                  e.currentTarget.style.overflow = 'visible';
                  e.currentTarget.style.background = '#C19A6B';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.padding = '8px 16px';
                  e.currentTarget.style.border = '2px solid #FFD700';
                  e.currentTarget.style.borderRadius = '4px';
                  e.currentTarget.style.margin = '4px 0';
                  e.currentTarget.style.cursor = 'pointer';
                  e.currentTarget.style.fontWeight = 'bold';
                }}
                onBlur={(e) => {
                  // When focus lost, hide again
                  e.currentTarget.style.position = 'absolute';
                  e.currentTarget.style.left = '-9999px';
                  e.currentTarget.style.width = '1px';
                  e.currentTarget.style.height = '1px';
                  e.currentTarget.style.overflow = 'hidden';
                }}
              >
                {est.name} - {categoryName}
                {est.grid_row && est.grid_col && ` (Row ${est.grid_row}, Col ${est.grid_col})`}
              </button>
            </li>
          );
        })}
      </ul>

      <style>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        .sr-only:focus-within {
          position: static;
          width: auto;
          height: auto;
          padding: 16px;
          margin: 0;
          overflow: visible;
          clip: auto;
          white-space: normal;
          background: rgba(0, 0, 0, 0.95);
          border: 2px solid #FFD700;
          border-radius: 8px;
          z-index: 9999;
        }

        .sr-only:focus-within h2 {
          color: #C19A6B;
          font-size: 20px;
          margin-bottom: 12px;
        }

        .sr-only:focus-within p {
          color: #00E5FF;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .sr-only:focus-within ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .sr-only:focus-within li {
          margin-bottom: 8px;
        }
      `}</style>
    </nav>
  );
};

export default ScreenReaderEstablishmentList;
