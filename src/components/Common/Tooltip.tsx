/**
 * Tooltip Component
 *
 * Displays an informative tooltip on hover after a delay.
 * Uses React Portal to render in document.body, avoiding overflow issues.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

interface TooltipPosition {
  top: number;
  left: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 500,
  disabled = false
}) => {
  const [visible, setVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({ top: 0, left: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (!wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const gap = 10; // Gap between tooltip and trigger

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - gap;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - gap;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + gap;
        break;
    }

    setTooltipPos({ top, left });
  }, [position]);

  const showTooltip = () => {
    if (disabled || !content) return;
    timeoutRef.current = setTimeout(() => {
      calculatePosition();
      setVisible(true);
    }, delay);
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

  const tooltipElement = visible && content ? (
    <div
      ref={tooltipRef}
      className={`tooltip tooltip--portal tooltip--${position}`}
      role="tooltip"
      aria-hidden={!visible}
      style={{
        top: tooltipPos.top,
        left: tooltipPos.left,
      }}
    >
      {content}
      <div className="tooltip__arrow" />
    </div>
  ) : null;

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
      {tooltipElement && createPortal(tooltipElement, document.body)}
    </div>
  );
};

export default Tooltip;
