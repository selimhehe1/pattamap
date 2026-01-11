import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  hasConsentChoice,
  acceptCookies,
  declineCookies
} from '../../utils/cookieConsent';
import '../../styles/components/cookie-consent.css';

interface CookieConsentProps {
  onAccept?: () => void;
  onDecline?: () => void;
}

/**
 * Cookie Consent Banner
 *
 * GDPR/PDPA compliant cookie consent banner.
 * - Shows at bottom of screen if no consent choice made
 * - Accept enables GA4 analytics
 * - Decline prevents GA4 from loading
 */
const CookieConsent: React.FC<CookieConsentProps> = ({ onAccept, onDecline }) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show banner only if no consent choice has been made
    if (!hasConsentChoice()) {
      // Small delay for smooth entrance animation
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    acceptCookies();
    setIsVisible(false);
    onAccept?.();
  };

  const handleDecline = () => {
    declineCookies();
    setIsVisible(false);
    onDecline?.();
  };

  if (!isVisible) return null;

  return (
    <div className="cookie-consent" role="dialog" aria-labelledby="cookie-consent-title">
      <div className="cookie-consent-content">
        <div className="cookie-consent-text">
          <h3 id="cookie-consent-title" className="cookie-consent-title">
            {t('cookies.title', 'Cookie Settings')}
          </h3>
          <p className="cookie-consent-description">
            {t('cookies.description', 'We use cookies to analyze site usage and improve your experience. You can accept or decline analytics cookies.')}
            {' '}
            <Link to="/privacy-policy" className="cookie-consent-link">
              {t('cookies.learnMore', 'Learn more')}
            </Link>
          </p>
        </div>
        <div className="cookie-consent-actions">
          <button
            className="cookie-consent-btn cookie-consent-btn-decline"
            onClick={handleDecline}
            aria-label={t('cookies.decline', 'Decline cookies')}
          >
            {t('cookies.decline', 'Decline')}
          </button>
          <button
            className="cookie-consent-btn cookie-consent-btn-accept"
            onClick={handleAccept}
            aria-label={t('cookies.accept', 'Accept cookies')}
          >
            {t('cookies.accept', 'Accept')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
