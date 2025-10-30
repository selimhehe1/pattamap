import React, { useEffect, useState } from 'react';

/**
 * LiveRegion - ARIA Live Region for Screen Reader Announcements
 *
 * Announces dynamic content changes to screen readers without moving focus.
 * Required for WCAG 2.1 Level AA compliance.
 *
 * Usage:
 * <LiveRegion message="Loading complete" politeness="polite" />
 */

export type AriaPoliteness = 'off' | 'polite' | 'assertive';

interface LiveRegionProps {
  /** Message to announce to screen readers */
  message: string;

  /** Politeness level (default: 'polite')
   * - 'polite': Wait for user to finish before announcing
   * - 'assertive': Interrupt immediately (use sparingly)
   * - 'off': No announcement
   */
  politeness?: AriaPoliteness;

  /** Whether to clear message after announcement (default: true) */
  autoClear?: boolean;

  /** Delay before clearing (ms, default: 1000) */
  clearDelay?: number;
}

const LiveRegion: React.FC<LiveRegionProps> = ({
  message,
  politeness = 'polite',
  autoClear = true,
  clearDelay = 1000
}) => {
  const [currentMessage, setCurrentMessage] = useState(message);

  useEffect(() => {
    if (message) {
      setCurrentMessage(message);

      if (autoClear) {
        const timer = setTimeout(() => {
          setCurrentMessage('');
        }, clearDelay);

        return () => clearTimeout(timer);
      }
    }
  }, [message, autoClear, clearDelay]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0
      }}
    >
      {currentMessage}
    </div>
  );
};

export default LiveRegion;
