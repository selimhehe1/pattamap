import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * SEO Head Component
 * Handles dynamic meta tags, Open Graph, and Twitter Cards for SEO
 *
 * Usage:
 * ```tsx
 * <SEOHead
 *   title="Home"
 *   description="Discover the best nightlife in Pattaya"
 *   canonical="https://pattamap.com/"
 * />
 * ```
 */

export interface SEOHeadProps {
  /**
   * Page title (will be appended with site name)
   */
  title: string;

  /**
   * Page description for meta tag
   */
  description: string;

  /**
   * Canonical URL (defaults to current URL)
   */
  canonical?: string;

  /**
   * Open Graph image URL
   */
  ogImage?: string;

  /**
   * Open Graph type (website, article, profile)
   */
  ogType?: 'website' | 'article' | 'profile';

  /**
   * Prevent indexing (for admin pages, etc.)
   */
  noindex?: boolean;

  /**
   * Keywords for meta tag (optional, less important for modern SEO)
   */
  keywords?: string[];

  /**
   * Author name
   */
  author?: string;

  /**
   * Twitter handle (without @)
   */
  twitterHandle?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  canonical,
  ogImage = '/og-default.jpg',
  ogType = 'website',
  noindex = false,
  keywords,
  author,
  twitterHandle,
}) => {
  // Site configuration
  const siteName = 'PattaMap';
  const siteUrl = process.env.REACT_APP_SITE_URL || 'https://pattamap.com';

  // Full title with site name
  const fullTitle = `${title} | ${siteName} - Pattaya Nightlife Directory`;

  // Canonical URL (default to current if not provided)
  const fullCanonical = canonical || (typeof window !== 'undefined' ? window.location.href : siteUrl);

  // Ensure OG image is absolute URL
  const absoluteOgImage = ogImage.startsWith('http')
    ? ogImage
    : `${siteUrl}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`;

  return (
    <Helmet>
      {/* Basic SEO */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      {author && <meta name="author" content={author} />}

      {/* Canonical URL */}
      <link rel="canonical" href={fullCanonical} />

      {/* Robots meta */}
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph (Facebook, LinkedIn, etc.) */}
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:image" content={absoluteOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteOgImage} />
      {twitterHandle && <meta name="twitter:site" content={`@${twitterHandle}`} />}
      {twitterHandle && <meta name="twitter:creator" content={`@${twitterHandle}`} />}

      {/* Additional meta tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="format-detection" content="telephone=no" />
      <meta httpEquiv="x-ua-compatible" content="ie=edge" />
    </Helmet>
  );
};

export default SEOHead;
