import React from 'react';

/**
 * SkipToContent - Accessibility component
 *
 * Provides a "Skip to main content" link for keyboard and screen reader users.
 * This allows users to bypass navigation and jump directly to the main content.
 *
 * WCAG 2.1 Level A requirement (2.4.1 Bypass Blocks)
 */
const SkipToContent: React.FC = () => {
  const handleSkip = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href="#main-content"
      className="skip-to-content-link"
      onClick={handleSkip}
    >
      Skip to main content
    </a>
  );
};

export default SkipToContent;
