/**
 * StructuredData Component
 * Generates JSON-LD structured data for SEO (schema.org)
 *
 * Supports:
 * - LocalBusiness (for establishments)
 * - ItemList (for establishment listings)
 * - BreadcrumbList (for navigation)
 *
 * Security: JSON.stringify handles escaping, and we only use controlled data
 *
 * @see https://schema.org/LocalBusiness
 * @see https://developers.google.com/search/docs/appearance/structured-data
 */

import React from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { Establishment } from '../../types';
import { getZoneLabel } from '../../utils/constants';

// ==========================================
// Types
// ==========================================

interface LocalBusinessProps {
  type: 'LocalBusiness';
  establishment: Establishment;
  employeeCount?: number;
}

interface ItemListProps {
  type: 'ItemList';
  establishments: Establishment[];
  zone?: string;
}

interface BreadcrumbProps {
  type: 'BreadcrumbList';
  items: Array<{
    name: string;
    url: string;
  }>;
}

type StructuredDataProps = LocalBusinessProps | ItemListProps | BreadcrumbProps;

// ==========================================
// Helper Functions
// ==========================================

/**
 * Sanitize string for JSON-LD (remove control characters)
 */
const sanitizeString = (str: string | undefined | null): string => {
  if (!str) return '';
  // Remove control characters (ASCII 0-31 and 127) and limit length
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\u0000-\u001F\u007F]/g, '').substring(0, 500);
};

/**
 * Get category type for schema.org
 * Maps our categories to schema.org types
 */
const getCategorySchemaType = (category?: { name?: string }): string => {
  const categoryName = category?.name?.toLowerCase() || '';

  if (categoryName.includes('bar')) return 'BarOrPub';
  if (categoryName.includes('club') || categoryName.includes('gogo')) return 'NightClub';
  if (categoryName.includes('massage')) return 'HealthAndBeautyBusiness';
  if (categoryName.includes('karaoke')) return 'EntertainmentBusiness';
  if (categoryName.includes('restaurant')) return 'Restaurant';

  return 'LocalBusiness';
};

/**
 * Format opening hours for schema.org
 * Handles both string format ("10:00-22:00") and object format ({ open, close })
 */
const formatOpeningHours = (openingHours?: Record<string, string | undefined>): string[] => {
  if (!openingHours) return [];

  const dayMapping: Record<string, string> = {
    monday: 'Mo',
    tuesday: 'Tu',
    wednesday: 'We',
    thursday: 'Th',
    friday: 'Fr',
    saturday: 'Sa',
    sunday: 'Su',
  };

  const result: string[] = [];

  for (const [day, hours] of Object.entries(openingHours)) {
    if (hours && typeof hours === 'string') {
      const dayAbbr = dayMapping[day.toLowerCase()];
      if (dayAbbr) {
        // Format: "10:00-22:00" -> "Mo 10:00-22:00"
        result.push(`${dayAbbr} ${hours}`);
      }
    }
  }

  return result;
};

/**
 * Validate URL format
 */
const isValidUrl = (url: string | undefined | null): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ==========================================
// Schema Generators
// ==========================================

/**
 * Generate LocalBusiness schema for a single establishment
 */
const generateLocalBusinessSchema = (
  establishment: Establishment,
  employeeCount?: number
) => {
  const schemaType = getCategorySchemaType(establishment.category);
  const zoneName = establishment.zone ? getZoneLabel(establishment.zone) : 'Pattaya';
  const estId = sanitizeString(establishment.id);
  const estZone = sanitizeString(establishment.zone) || 'pattaya';

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    '@id': `https://pattamap.com/bar/${estZone}/${estId}`,
    name: sanitizeString(establishment.name),
    description: sanitizeString(establishment.description) || `${sanitizeString(establishment.name)} - ${schemaType} in ${zoneName}, Pattaya`,
    url: `https://pattamap.com/bar/${estZone}/${estId}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: sanitizeString(establishment.address) || zoneName,
      addressLocality: 'Pattaya',
      addressRegion: 'Chonburi',
      addressCountry: 'TH',
    },
    areaServed: {
      '@type': 'City',
      name: 'Pattaya',
    },
  };

  // Add geo coordinates if available
  if (typeof establishment.latitude === 'number' && typeof establishment.longitude === 'number') {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: establishment.latitude,
      longitude: establishment.longitude,
    };
  }

  // Add logo/image (validate URL)
  if (isValidUrl(establishment.logo_url)) {
    schema.image = establishment.logo_url;
    schema.logo = establishment.logo_url;
  }

  // Add contact info
  if (establishment.phone) {
    schema.telephone = sanitizeString(establishment.phone);
  }

  // Add website and social media links
  const socialLinks: string[] = [];

  if (isValidUrl(establishment.website)) {
    socialLinks.push(establishment.website!);
  }

  if (establishment.instagram) {
    const handle = sanitizeString(establishment.instagram).replace('@', '');
    if (handle) socialLinks.push(`https://instagram.com/${handle}`);
  }
  if (establishment.twitter) {
    const handle = sanitizeString(establishment.twitter).replace('@', '');
    if (handle) socialLinks.push(`https://twitter.com/${handle}`);
  }
  if (establishment.tiktok) {
    const handle = sanitizeString(establishment.tiktok).replace('@', '');
    if (handle) socialLinks.push(`https://tiktok.com/@${handle}`);
  }

  if (socialLinks.length > 0) {
    schema.sameAs = socialLinks;
  }

  // Add opening hours
  const openingHours = formatOpeningHours(establishment.opening_hours);
  if (openingHours.length > 0) {
    schema.openingHours = openingHours;
  }

  // Add price range indicator
  if (establishment.ladydrink || establishment.barfine) {
    schema.priceRange = '$$'; // Mid-range default
  }

  // Add employee count as additional property
  if (typeof employeeCount === 'number' && employeeCount > 0) {
    schema.numberOfEmployees = {
      '@type': 'QuantitativeValue',
      value: employeeCount,
    };
  }

  // Add VIP badge as award
  if (establishment.is_vip) {
    schema.award = 'VIP Establishment';
  }

  return schema;
};

/**
 * Generate ItemList schema for establishment listings
 */
const generateItemListSchema = (establishments: Establishment[], zone?: string) => {
  const zoneName = zone ? getZoneLabel(zone) : 'Pattaya';

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${zoneName} Establishments`,
    description: `List of nightlife venues and establishments in ${zoneName}, Pattaya, Thailand`,
    numberOfItems: establishments.length,
    itemListElement: establishments.slice(0, 20).map((est, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': getCategorySchemaType(est.category),
        '@id': `https://pattamap.com/bar/${sanitizeString(est.zone) || zone}/${sanitizeString(est.id)}`,
        name: sanitizeString(est.name),
        url: `https://pattamap.com/bar/${sanitizeString(est.zone) || zone}/${sanitizeString(est.id)}`,
        image: isValidUrl(est.logo_url) ? est.logo_url : undefined,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Pattaya',
          addressCountry: 'TH',
        },
      },
    })),
  };
};

/**
 * Generate BreadcrumbList schema
 */
const generateBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: sanitizeString(item.name),
      item: item.url.startsWith('http') ? item.url : `https://pattamap.com${item.url}`,
    })),
  };
};

// ==========================================
// Component
// ==========================================

/**
 * StructuredData Component
 * Renders JSON-LD script tag with schema.org structured data
 * Uses react-helmet-async for safe script injection
 */
const StructuredData: React.FC<StructuredDataProps> = (props) => {
  let schema: Record<string, unknown>;

  switch (props.type) {
    case 'LocalBusiness':
      schema = generateLocalBusinessSchema(props.establishment, props.employeeCount);
      break;
    case 'ItemList':
      schema = generateItemListSchema(props.establishments, props.zone);
      break;
    case 'BreadcrumbList':
      schema = generateBreadcrumbSchema(props.items);
      break;
    default:
      return null;
  }

  // JSON.stringify safely escapes the data
  const jsonLd = JSON.stringify(schema);

  return (
    <Helmet>
      <script type="application/ld+json">{jsonLd}</script>
    </Helmet>
  );
};

export default StructuredData;

// Named exports for convenience
export { StructuredData };
export type { StructuredDataProps, LocalBusinessProps, ItemListProps, BreadcrumbProps };
