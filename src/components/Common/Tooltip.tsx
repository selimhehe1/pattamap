/**
 * Tooltip Component
 *
 * Displays an informative tooltip on hover after a delay.
 * Used throughout the app to explain button/icon functions.
 */

import React, { useState, useRef, useEffect } from 'react';
import '../../styles/components/tooltip.css';

interface TooltipProps {
  /** Text to display in the tooltip */
  content: string;
  /** Element that triggers the tooltip */
  children: React.ReactNode;
  /** Position of the tooltip relative to the trigger */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay in ms before showing tooltip (default: 500) */
  delay?: number;
  /** Disable the tooltip */
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 500,
  disabled = false
}) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (disabled || !content) return;
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Don't render wrapper if disabled
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div
      ref={wrapperRef}
      className="tooltip-wrapper"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {visible && content && (
        <div
          className={`tooltip tooltip--${position}`}
          role="tooltip"
          aria-hidden={!visible}
        >
          {content}
          <div className="tooltip__arrow" />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
