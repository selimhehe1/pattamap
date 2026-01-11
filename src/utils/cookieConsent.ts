/**
 * Cookie Consent Utility
 *
 * Manages user consent for cookies and analytics (GDPR/PDPA compliance).
 * GA4 will ONLY be initialized if user explicitly accepts cookies.
 */

const CONSENT_KEY = 'cookie-consent';
const CONSENT_DATE_KEY = 'cookie-consent-date';

export type ConsentStatus = 'accepted' | 'declined' | 'pending';

/**
 * Get current consent status from localStorage
 */
export function getConsentStatus(): ConsentStatus {
  if (typeof window === 'undefined') return 'pending';

  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent === 'accepted') return 'accepted';
  if (consent === 'declined') return 'declined';
  return 'pending';
}

/**
 * Check if user has made a consent choice (accepted or declined)
 */
export function hasConsentChoice(): boolean {
  return getConsentStatus() !== 'pending';
}

/**
 * Check if user has accepted cookies
 */
export function hasAcceptedCookies(): boolean {
  return getConsentStatus() === 'accepted';
}

/**
 * Accept cookies and save to localStorage
 */
export function acceptCookies(): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(CONSENT_KEY, 'accepted');
  localStorage.setItem(CONSENT_DATE_KEY, new Date().toISOString());
}

/**
 * Decline cookies and save to localStorage
 */
export function declineCookies(): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(CONSENT_KEY, 'declined');
  localStorage.setItem(CONSENT_DATE_KEY, new Date().toISOString());

  // Clear any existing GA cookies if user declines
  clearAnalyticsCookies();
}

/**
 * Clear GA4 cookies when user declines
 */
function clearAnalyticsCookies(): void {
  // GA4 cookies pattern
  const gaCookies = document.cookie.split(';').filter(cookie =>
    cookie.trim().startsWith('_ga') ||
    cookie.trim().startsWith('_gid') ||
    cookie.trim().startsWith('_gat')
  );

  gaCookies.forEach(cookie => {
    const cookieName = cookie.split('=')[0].trim();
    // Clear cookie by setting expiry in the past
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
  });
}

/**
 * Get the date when consent was given/declined
 */
export function getConsentDate(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CONSENT_DATE_KEY);
}

/**
 * Reset consent (for testing or if user wants to change their choice)
 */
export function resetConsent(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(CONSENT_KEY);
  localStorage.removeItem(CONSENT_DATE_KEY);
}
