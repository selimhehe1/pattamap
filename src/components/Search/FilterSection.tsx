import React, { useState, useCallback, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface FilterSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  activeCount?: number;
  badge?: string;
}

/**
 * FilterSection - Collapsible accordion wrapper for filter groups
 * Neo-Nightlife 2025 style with smooth animations
 */
const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  icon,
  children,
  defaultExpanded = true,
  activeCount = 0,
  badge
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <div
      className="filter-section"
      style={{
        marginBottom: '8px',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Section Header - Clickable */}
      <button
        type="button"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          background: isExpanded
            ? 'linear-gradient(135deg, rgba(232, 121, 249, 0.08) 0%, rgba(0, 229, 255, 0.05) 100%)'
            : 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          outline: 'none'
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Icon */}
          {icon && (
            <span style={{
              color: isExpanded ? '#E879F9' : 'rgba(255, 255, 255, 0.6)',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.3s ease'
            }}>
              {icon}
            </span>
          )}

          {/* Title */}
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: isExpanded ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
            letterSpacing: '0.3px',
            transition: 'color 0.3s ease'
          }}>
            {title}
          </span>

          {/* Badge or Active Count */}
          {(badge || activeCount > 0) && (
            <span style={{
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 700,
              background: activeCount > 0
                ? 'linear-gradient(135deg, #E879F9 0%, #A855F7 100%)'
                : 'rgba(0, 229, 255, 0.15)',
              color: activeCount > 0 ? '#ffffff' : '#00E5FF',
              boxShadow: activeCount > 0
                ? '0 2px 8px rgba(232, 121, 249, 0.3)'
                : 'none',
              transition: 'all 0.3s ease'
            }}>
              {activeCount > 0 ? activeCount : badge}
            </span>
          )}
        </div>

        {/* Chevron */}
        <ChevronDown
          size={18}
          style={{
            color: isExpanded ? '#E879F9' : 'rgba(255, 255, 255, 0.4)',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </button>

      {/* Collapsible Content */}
      <div
        style={{
          maxHeight: isExpanded ? '1000px' : '0',
          opacity: isExpanded ? 1 : 0,
          overflow: 'hidden',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          transformOrigin: 'top'
        }}
      >
        <div style={{
          padding: '0 16px 16px 16px',
          transform: isExpanded ? 'translateY(0)' : 'translateY(-10px)',
          transition: 'transform 0.3s ease'
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default FilterSection;
