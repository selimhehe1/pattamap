import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, SlidersHorizontal, Check, Trash2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: () => void;
  onClear?: () => void;
  activeFiltersCount: number;
  children: React.ReactNode;
}

/**
 * MobileFilterDrawer - Slide-in drawer for mobile filter panel
 * Neo-Nightlife 2025 style with smooth animations
 */
const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  onApply,
  onClear,
  activeFiltersCount,
  children
}) => {
  const { t } = useTranslation();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle apply and close
  const handleApply = useCallback(() => {
    if (onApply) {
      onApply();
    }
    onClose();
  }, [onApply, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="mobile-filter-drawer-overlay"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        opacity: isOpen ? 1 : 0,
        transition: 'opacity 0.3s ease',
        display: 'flex',
        justifyContent: 'flex-end'
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t('search.filterDrawer', 'Filter Drawer')}
    >
      {/* Drawer Panel */}
      <div
        className="mobile-filter-drawer-panel"
        style={{
          width: '85%',
          maxWidth: '400px',
          height: '100%',
          background: 'linear-gradient(180deg, #0D0D0F 0%, #16161A 50%, #1E1E24 100%)',
          boxShadow: '-4px 0 30px rgba(0, 0, 0, 0.5), -2px 0 10px rgba(232, 121, 249, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderLeft: '1px solid rgba(232, 121, 249, 0.2)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(232, 121, 249, 0.1) 0%, rgba(0, 229, 255, 0.05) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SlidersHorizontal size={22} color="#E879F9" />
            <span style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '0.5px'
            }}>
              {t('search.filters', 'Filters')}
            </span>
            {activeFiltersCount > 0 && (
              <span style={{
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #E879F9 0%, #A855F7 100%)',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(232, 121, 249, 0.4)'
              }}>
                {activeFiltersCount}
              </span>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              color: 'rgba(255, 255, 255, 0.6)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 71, 87, 0.2)';
              e.currentTarget.style.borderColor = '#FF4757';
              e.currentTarget.style.color = '#FF4757';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Filter Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            scrollbarWidth: 'thin',
            scrollbarColor: '#E879F9 transparent'
          }}
        >
          {children}
        </div>

        {/* Fixed Footer with Action Buttons */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            gap: '12px'
          }}
        >
          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && onClear && (
            <button
              onClick={onClear}
              style={{
                flex: '0 0 auto',
                padding: '14px 16px',
                background: 'rgba(255, 71, 87, 0.1)',
                border: '1px solid rgba(255, 71, 87, 0.3)',
                borderRadius: '12px',
                color: '#FF4757',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 71, 87, 0.2)';
                e.currentTarget.style.borderColor = '#FF4757';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 71, 87, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 71, 87, 0.3)';
              }}
            >
              <Trash2 size={16} />
              {t('search.clear', 'Clear')}
            </button>
          )}

          {/* Apply Button */}
          <button
            onClick={handleApply}
            style={{
              flex: 1,
              padding: '14px 20px',
              background: 'linear-gradient(135deg, #E879F9 0%, #A855F7 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 20px rgba(232, 121, 249, 0.4)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 25px rgba(232, 121, 249, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(232, 121, 249, 0.4)';
            }}
          >
            <Check size={18} />
            {t('search.applyFilters', 'Apply Filters')}
            {activeFiltersCount > 0 && ` (${activeFiltersCount})`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * MobileFilterFAB - Floating Action Button to open filter drawer
 */
export const MobileFilterFAB: React.FC<{
  onClick: () => void;
  activeFiltersCount: number;
}> = ({ onClick, activeFiltersCount }) => {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      aria-label={t('search.openFilters', 'Open Filters')}
      className="mobile-filter-fab"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #E879F9 0%, #A855F7 100%)',
        border: 'none',
        boxShadow: '0 4px 20px rgba(232, 121, 249, 0.5), 0 0 40px rgba(232, 121, 249, 0.2)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
        animation: 'pulse-glow 2s infinite'
      }}
    >
      <SlidersHorizontal size={26} color="#ffffff" />

      {/* Active Filters Badge */}
      {activeFiltersCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#00E5FF',
            color: '#0D0D0F',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 229, 255, 0.5)',
            border: '2px solid #0D0D0F'
          }}
        >
          {activeFiltersCount > 9 ? '9+' : activeFiltersCount}
        </span>
      )}
    </button>
  );
};

export default MobileFilterDrawer;
