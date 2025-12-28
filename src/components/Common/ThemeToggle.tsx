import React, { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import '../../styles/components/ThemeToggle.css';

/**
 * ThemeToggle Component - Dark/Light Mode Toggle Button
 * Phase 3C - Dark/Light Mode Toggle Implementation
 *
 * Features:
 * - Accessible button with ARIA labels
 * - Animated icon (sun/moon) with rotation
 * - Optional tooltip
 * - Responsive design
 * - Keyboard navigation support
 * - Visual feedback on interaction
 *
 * Usage:
 * ```tsx
 * // Icon only
 * <ThemeToggle />
 *
 * // With text label
 * <ThemeToggle variant="text" />
 *
 * // With custom tooltip
 * <ThemeToggle showTooltip={true} />
 * ```
 */

export interface ThemeToggleProps {
  /** Display variant */
  variant?: 'icon' | 'text' | 'menu-item';

  /** Show tooltip on hover */
  showTooltip?: boolean;

  /** Additional CSS class */
  className?: string;

  /** Custom aria-label */
  'aria-label'?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'icon',
  showTooltip = true,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const isDark = theme === 'dark';

  const handleClick = () => {
    setIsAnimating(true);
    toggleTheme();

    // Reset animation state after transition
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  const defaultAriaLabel = isDark
    ? 'Switch to light mode'
    : 'Switch to dark mode';

  const tooltipText = isDark ? 'Daylight mode' : 'Nightlife mode';

  // Menu Item variant (matches other menu items)
  if (variant === 'menu-item') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="menu-item-modern"
        aria-label={ariaLabel || defaultAriaLabel}
        title={tooltipText}
        data-testid="theme-toggle"
      >
        <span className="menu-item-icon">
          {isDark ? <Moon size={18} /> : <Sun size={18} />}
        </span>
        <span className="menu-item-text">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      </button>
    );
  }

  // Original icon/text variants
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`theme-toggle theme-toggle--${variant} ${
        isAnimating ? 'theme-toggle--animating' : ''
      } ${className}`}
      aria-label={ariaLabel || defaultAriaLabel}
      title={showTooltip ? tooltipText : undefined}
      data-theme={theme}
      data-testid="theme-toggle"
    >
      <span className="theme-toggle__icon-wrapper">
        {isDark ? (
          // Moon icon (dark mode)
          <svg
            className="theme-toggle__icon theme-toggle__icon--moon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="20"
            height="20"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          // Sun icon (light mode)
          <svg
            className="theme-toggle__icon theme-toggle__icon--sun"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="20"
            height="20"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </span>

      {variant === 'text' && (
        <span className="theme-toggle__label">
          {isDark ? 'Light' : 'Dark'} Mode
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
