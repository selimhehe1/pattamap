import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNavigateWithTransition } from '../hooks/useNavigateWithTransition';
import { Helmet } from '@dr.pogodin/react-helmet';
import { Home, ArrowLeft, Search, Map } from 'lucide-react';
import '../styles/pages/not-found.css';

/**
 * NotFoundPage Component
 *
 * 404 error page displayed when users navigate to non-existent routes.
 * Provides helpful navigation options and maintains brand consistency.
 *
 * Features:
 * - SEO meta tags (noindex)
 * - Quick navigation links
 * - Responsive design
 * - Accessible with proper ARIA labels
 */
const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigateWithTransition();

  const handleGoBack = () => {
    // Go back in history if possible, otherwise go home
    if (window.history.length > 2) {
      navigate.back();
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('notFound.pageTitle')}</title>
        <meta name="description" content={t('notFound.metaDescription')} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="not-found-page" role="main" aria-labelledby="not-found-title">
        <div className="not-found-background">
          <div className="not-found-overlay" />
        </div>

        <div className="not-found-content">
          {/* Error Code */}
          <div className="not-found-code" aria-hidden="true">
            404
          </div>

          {/* Title */}
          <h1 id="not-found-title" className="not-found-title">
            {t('notFound.title')}
          </h1>

          {/* Description */}
          <p className="not-found-description">
            {t('notFound.description')}
          </p>

          {/* Action Buttons */}
          <div className="not-found-actions">
            <button
              onClick={handleGoBack}
              className="not-found-btn not-found-btn-secondary"
              aria-label={t('notFound.goBackAria')}
            >
              <ArrowLeft size={18} aria-hidden="true" />
              <span>{t('notFound.goBack')}</span>
            </button>

            <Link
              to="/"
              className="not-found-btn not-found-btn-primary"
              aria-label={t('notFound.homeAria')}
            >
              <Home size={18} aria-hidden="true" />
              <span>{t('notFound.home')}</span>
            </Link>
          </div>

          {/* Quick Links */}
          <div className="not-found-quick-links">
            <p className="not-found-quick-links-title">{t('notFound.tryThese')}</p>
            <nav aria-label={t('notFound.quickNav')}>
              <ul className="not-found-links-list">
                <li>
                  <Link to="/search" className="not-found-link">
                    <Search size={16} aria-hidden="true" />
                    <span>{t('header.search')}</span>
                  </Link>
                </li>
                <li>
                  <Link to="/" className="not-found-link">
                    <Map size={16} aria-hidden="true" />
                    <span>{t('map.mapButton')}</span>
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFoundPage;
