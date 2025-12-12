import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Structured Data Component for Schema.org markup
 * Enables rich snippets in Google search results
 *
 * Usage:
 * ```tsx
 * <StructuredData
 *   data={{
 *     "@context": "https://schema.org",
 *     "@type": "Organization",
 *     "name": "PattaMap"
 *   }}
 * />
 * ```
 */

export interface StructuredDataProps {
  /**
   * Schema.org data object
   */
  data: Record<string, any>;
}

const StructuredData: React.FC<StructuredDataProps> = ({ data }) => {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(data)}
      </script>
    </Helmet>
  );
};

/**
 * Generate Organization schema
 */
export const createOrganizationSchema = () => {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://pattamap.com';

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "PattaMap",
    "url": siteUrl,
    "logo": `${siteUrl}/logo.png`,
    "description": "Premium Pattaya nightlife entertainment directory with interactive maps, employee profiles, and real-time venue information.",
    "foundingDate": "2024",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
      "email": "contact@pattamap.com"
    },
    "sameAs": [
      // Add social media profiles when available
      // "https://facebook.com/pattamap",
      // "https://twitter.com/pattamap",
      // "https://instagram.com/pattamap"
    ]
  };
};

/**
 * Generate WebSite schema with SearchAction
 */
export const createWebSiteSchema = () => {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://pattamap.com';

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "PattaMap",
    "url": siteUrl,
    "description": "Pattaya nightlife entertainment directory",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${siteUrl}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };
};

/**
 * Generate LocalBusiness schema for establishment
 */
export const createLocalBusinessSchema = (establishment: {
  id: string;
  name: string;
  description: string;
  address: string;
  zone: string;
  phone?: string;
  website?: string;
  logo_url?: string;
  opening_hours?: {
    open: string;
    close: string;
  };
  pricing?: {
    ladydrink?: number | string;
    barfine?: number | string;
  };
}) => {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://pattamap.com';

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "BarOrPub",
    "name": establishment.name,
    "description": establishment.description,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": establishment.address,
      "addressLocality": "Pattaya",
      "addressRegion": "Chonburi",
      "postalCode": "20150",
      "addressCountry": "TH"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "12.9236",  // Default Pattaya coordinates
      "longitude": "100.8825"
    },
    "url": `${siteUrl}/bar/${establishment.zone}/${establishment.id}`,
    "priceRange": "฿฿"
  };

  // Add optional fields if available
  if (establishment.phone) {
    schema.telephone = establishment.phone;
  }

  if (establishment.website) {
    schema.url = establishment.website;
  }

  if (establishment.logo_url) {
    schema.image = establishment.logo_url;
  }

  if (establishment.opening_hours) {
    schema.openingHours = `${establishment.opening_hours.open}-${establishment.opening_hours.close}`;
  }

  return schema;
};

/**
 * Generate BreadcrumbList schema for navigation
 */
export const createBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://pattamap.com';

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `${siteUrl}${item.url}`
    }))
  };
};

export default StructuredData;
