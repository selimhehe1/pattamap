import ReactGA from 'react-ga4';
import { logger } from './logger';

/**
 * Google Analytics 4 wrapper utility
 * Handles tracking of page views, events, and user interactions
 *
 * Usage:
 * ```typescript
 * import { initGA, trackPageView, trackEvent } from './utils/analytics';
 *
 * // Initialize on app mount
 * initGA();
 *
 * // Track page view
 * trackPageView('/home', 'Home Page');
 *
 * // Track custom event
 * trackEvent('User', 'Add Favorite', 'establishment-123');
 * ```
 */

// GA4 Measurement ID (to be replaced with actual ID)
const GA_MEASUREMENT_ID = process.env.REACT_APP_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';

// Flag to check if GA is initialized
let isInitialized = false;

/**
 * Initialize Google Analytics 4
 * Should be called once on app mount
 */
export const initGA = (): void => {
  if (isInitialized) {
    logger.warn('GA4 already initialized');
    return;
  }

  // Don't initialize in development unless explicitly enabled
  if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_GA_DEBUG) {
    logger.info('GA4 disabled in development mode');
    return;
  }

  try {
    ReactGA.initialize(GA_MEASUREMENT_ID, {
      gtagOptions: {
        send_page_view: false, // We'll manually track page views
      },
    });

    isInitialized = true;
    logger.info('✅ GA4 initialized:', GA_MEASUREMENT_ID);
  } catch (error) {
    logger.error('Failed to initialize GA4:', error);
  }
};

/**
 * Track a page view
 * @param path - URL path (e.g., '/bar/soi-6/cockatoo-bar')
 * @param title - Page title (e.g., 'Cockatoo Bar - Soi 6')
 */
export const trackPageView = (path: string, title?: string): void => {
  if (!isInitialized) return;

  try {
    ReactGA.send({
      hitType: 'pageview',
      page: path,
      title: title || document.title,
    });

    logger.debug(`📊 GA4 Page View: ${path}`, { title });
  } catch (error) {
    logger.error('Failed to track page view:', error);
  }
};

/**
 * Track a custom event
 * @param category - Event category (e.g., 'User', 'Navigation', 'Form')
 * @param action - Event action (e.g., 'Click', 'Submit', 'View')
 * @param label - Optional event label (e.g., 'establishment-id')
 * @param value - Optional numeric value
 */
export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number
): void => {
  if (!isInitialized) return;

  try {
    ReactGA.event({
      category,
      action,
      label,
      value,
    });

    logger.debug(`📊 GA4 Event: ${category} - ${action}`, { label, value });
  } catch (error) {
    logger.error('Failed to track event:', error);
  }
};

/**
 * Pre-defined event trackers for common interactions
 */

export const Analytics = {
  /**
   * Track establishment card click
   */
  trackEstablishmentView: (establishmentId: string, establishmentName: string) => {
    trackEvent('Establishment', 'View', `${establishmentName} (${establishmentId})`);
  },

  /**
   * Track employee profile view
   */
  trackEmployeeView: (employeeId: string, employeeName: string) => {
    trackEvent('Employee', 'View Profile', `${employeeName} (${employeeId})`);
  },

  /**
   * Track favorite add
   */
  trackFavoriteAdd: (employeeId: string) => {
    trackEvent('User', 'Add Favorite', employeeId);
  },

  /**
   * Track favorite remove
   */
  trackFavoriteRemove: (employeeId: string) => {
    trackEvent('User', 'Remove Favorite', employeeId);
  },

  /**
   * Track search query
   */
  trackSearch: (query: string, resultsCount: number) => {
    trackEvent('Search', 'Query', query, resultsCount);
  },

  /**
   * Track form submission
   */
  trackFormSubmit: (formType: 'employee' | 'establishment', action: 'create' | 'update') => {
    trackEvent('Form', `${action} ${formType}`, formType);
  },

  /**
   * Track map interaction
   */
  trackMapInteraction: (zone: string, action: 'zoom' | 'pan' | 'click') => {
    trackEvent('Map', action, zone);
  },

  /**
   * Track social media link click
   */
  trackSocialClick: (platform: string, employeeId?: string) => {
    trackEvent('Social', 'Click', `${platform}${employeeId ? ` - ${employeeId}` : ''}`);
  },

  /**
   * Track navigation
   */
  trackNavigation: (destination: string) => {
    trackEvent('Navigation', 'Click', destination);
  },

  /**
   * Track user login
   */
  trackLogin: (method: 'email' | 'google' | 'facebook') => {
    trackEvent('User', 'Login', method);
  },

  /**
   * Track user registration
   */
  trackRegistration: (method: 'email' | 'google' | 'facebook') => {
    trackEvent('User', 'Register', method);
  },

  /**
   * Track error
   */
  trackError: (errorType: string, errorMessage: string) => {
    trackEvent('Error', errorType, errorMessage);
  },
};

export default Analytics;
