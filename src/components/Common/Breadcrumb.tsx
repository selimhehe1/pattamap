import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Breadcrumb - Navigation component showing current page location
 *
 * Improves navigation UX by showing the path to the current page.
 * Required for WCAG 2.1 Level AA compliance (Success Criterion 2.4.8).
 *
 * @example
 * <Breadcrumb
 *   items={[
 *     { label: 'Home', path: '/' },
 *     { label: 'Search', path: '/search' },
 *     { label: 'Employee Profile' } // Current page (no path)
 *   ]}
 * />
 */

export interface BreadcrumbItem {
  /** Display text for the breadcrumb item */
  label: string;
  /** Path to navigate to (omit for current page) */
  path?: string;
  /** Optional icon (emoji or Unicode) */
  icon?: string;
}

interface BreadcrumbProps {
  /** Array of breadcrumb items, from root to current page */
  items: BreadcrumbItem[];
  /** Custom CSS class name */
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={`breadcrumb-navigation-nightlife ${className}`}
    >
      <ol className="breadcrumb-list-nightlife">
        {items.map((item, index) => {
          const isCurrentPage = index === items.length - 1;
          const isFirst = index === 0;

          return (
            <li
              key={`${item.label}-${index}`}
              className="breadcrumb-item-nightlife"
            >
              {!isFirst && (
                <span
                  className="breadcrumb-separator-nightlife"
                  aria-hidden="true"
                >
                  /
                </span>
              )}

              {isCurrentPage ? (
                <span
                  className="breadcrumb-current-nightlife"
                  aria-current="page"
                >
                  {item.icon && (
                    <span className="breadcrumb-icon-nightlife" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path || '/'}
                  className="breadcrumb-link-nightlife"
                  aria-label={`Navigate to ${item.label}`}
                >
                  {item.icon && (
                    <span className="breadcrumb-icon-nightlife" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      <style>{`
        /* Breadcrumb Container */
        .breadcrumb-navigation-nightlife {
          display: flex;
          align-items: center;
          padding: 12px 0;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(193, 154, 107, 0.2);
        }

        /* Breadcrumb List */
        .breadcrumb-list-nightlife {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        /* Breadcrumb Item */
        .breadcrumb-item-nightlife {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        /* Breadcrumb Separator */
        .breadcrumb-separator-nightlife {
          color: rgba(255, 255, 255, 0.4);
          font-weight: 300;
          user-select: none;
        }

        /* Breadcrumb Link */
        .breadcrumb-link-nightlife {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #00E5FF;
          text-decoration: none;
          padding: 6px 12px;
          border-radius: 6px;
          transition: all 0.3s ease;
          background: rgba(0, 229, 255, 0.05);
          border: 1px solid transparent;
        }

        .breadcrumb-link-nightlife:hover {
          color: #00FFFF;
          background: rgba(0, 229, 255, 0.15);
          border-color: rgba(0, 229, 255, 0.3);
          transform: translateY(-1px);
        }

        .breadcrumb-link-nightlife:focus-visible {
          outline: 2px solid #00E5FF;
          outline-offset: 2px;
        }

        /* Current Page */
        .breadcrumb-current-nightlife {
          display: flex;
          align-items: center;
          gap: 6px;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 6px;
          background: rgba(193, 154, 107, 0.1);
          border: 1px solid rgba(193, 154, 107, 0.3);
        }

        /* Icon */
        .breadcrumb-icon-nightlife {
          font-size: 16px;
          line-height: 1;
        }

        /* Mobile Responsive */
        @media (max-width: 640px) {
          .breadcrumb-navigation-nightlife {
            padding: 10px 0;
            margin-bottom: 15px;
          }

          .breadcrumb-item-nightlife {
            font-size: 12px;
          }

          .breadcrumb-link-nightlife,
          .breadcrumb-current-nightlife {
            padding: 5px 10px;
            gap: 4px;
          }

          .breadcrumb-icon-nightlife {
            font-size: 14px;
          }

          .breadcrumb-list-nightlife {
            gap: 4px;
          }
        }

        /* Very small screens - stack vertically if needed */
        @media (max-width: 375px) {
          .breadcrumb-item-nightlife {
            font-size: 11px;
          }

          .breadcrumb-link-nightlife,
          .breadcrumb-current-nightlife {
            padding: 4px 8px;
          }
        }
      `}</style>
    </nav>
  );
};

export default Breadcrumb;
