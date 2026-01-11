import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../../styles/layout/footer.css';

/**
 * Footer Component
 *
 * Minimalist footer with legal links (Privacy Policy, Terms of Service)
 * and copyright notice.
 */
const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer" role="contentinfo">
      <div className="app-footer-content">
        <span className="app-footer-copyright">
          © {currentYear} PattaMap
        </span>
        <span className="app-footer-separator">•</span>
        <Link to="/privacy-policy" className="app-footer-link">
          {t('footer.privacy', 'Privacy Policy')}
        </Link>
        <span className="app-footer-separator">•</span>
        <Link to="/terms" className="app-footer-link">
          {t('footer.terms', 'Terms of Service')}
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
