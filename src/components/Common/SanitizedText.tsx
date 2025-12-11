import React from 'react';
import DOMPurify from 'dompurify';

/**
 * Props for the SanitizedText component
 */
interface SanitizedTextProps {
  /** HTML content to sanitize and render */
  html: string;
  /** Additional CSS class name */
  className?: string;
  /** HTML tag to use (default: 'div') */
  tag?: 'div' | 'p' | 'span' | 'section' | 'article';
}

/**
 * Component that safely renders user-generated HTML content with XSS protection.
 *
 * Uses DOMPurify to sanitize HTML before rendering, preventing XSS attacks
 * while preserving safe formatting (links, bold, italic, etc.).
 *
 * @example
 * ```tsx
 * // Safely render user description
 * <SanitizedText html={employee.description} />
 *
 * // With custom tag and class
 * <SanitizedText
 *   html={comment.text}
 *   tag="p"
 *   className="comment-text"
 * />
 * ```
 */
const SanitizedText: React.FC<SanitizedTextProps> = ({
  html,
  className = '',
  tag = 'div'
}) => {
  // Sanitize HTML to prevent XSS attacks
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });

  // Render based on tag type
  if (tag === 'p') {
    return <p className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
  } else if (tag === 'span') {
    return <span className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
  } else if (tag === 'section') {
    return <section className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
  } else if (tag === 'article') {
    return <article className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
  }

  // Default to div
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
};

export default SanitizedText;
