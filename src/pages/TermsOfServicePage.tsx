import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from '@dr.pogodin/react-helmet';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Scale, FileText, User, Camera, Ban, AlertTriangle, Users, Gavel, Mail } from 'lucide-react';
import '../styles/pages/legal-pages.css';

/**
 * Terms of Service Page
 *
 * Compliant with Thai law
 * Covers user responsibilities, content rules, and liability
 *
 * Last updated: January 2025
 */
const TermsOfServicePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('termsOfService.pageTitle', 'Terms of Service')} - PattaMap</title>
        <meta
          name="description"
          content={t('termsOfService.metaDescription', 'PattaMap Terms of Service - Rules and conditions for using our platform.')}
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pattamap.com/terms" />
      </Helmet>

      <div className="legal-page" role="main">
        {/* Background */}
        <div className="legal-background" aria-hidden="true">
          <div className="legal-gradient-orb legal-gradient-orb--1" />
          <div className="legal-gradient-orb legal-gradient-orb--2" />
        </div>

        {/* Content */}
        <div className="legal-container">
          {/* Back Link */}
          <Link to="/" className="legal-back-link">
            <ArrowLeft size={18} />
            <span>{t('common.backToHome', 'Back to Home')}</span>
          </Link>

          {/* Header */}
          <header className="legal-header">
            <div className="legal-icon">
              <Scale size={32} />
            </div>
            <h1 className="legal-title">{t('termsOfService.title', 'Terms of Service')}</h1>
            <p className="legal-subtitle">
              {t('termsOfService.lastUpdated', 'Last updated: January 2025')}
            </p>
          </header>

          {/* Acceptance */}
          <section className="legal-section legal-section--highlight">
            <h2 className="legal-section-title">
              <FileText size={20} />
              {t('termsOfService.acceptanceTitle', 'Acceptance of Terms')}
            </h2>
            <p>{t('termsOfService.acceptanceText1', 'By accessing or using PattaMap ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.')}</p>
            <p>{t('termsOfService.acceptanceText2', 'We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the modified terms.')}</p>
          </section>

          {/* Service Description */}
          <section className="legal-section">
            <h2 className="legal-section-title">
              <FileText size={20} />
              {t('termsOfService.serviceTitle', 'Service Description')}
            </h2>
            <p>{t('termsOfService.serviceText1', 'PattaMap is a directory platform for nightlife establishments in Pattaya, Thailand. The Service allows users to:')}</p>
            <ul className="legal-list">
              <li>{t('termsOfService.serviceBrowse', 'Browse establishments and employee profiles')}</li>
              <li>{t('termsOfService.serviceSubmit', 'Submit reviews and ratings')}</li>
              <li>{t('termsOfService.serviceCreate', 'Create and manage employee or establishment profiles')}</li>
              <li>{t('termsOfService.serviceFavorites', 'Save favorites and track visits')}</li>
            </ul>
            <p>{t('termsOfService.serviceNote', 'The Service is provided "as is" and we make no guarantees about accuracy or completeness of the information.')}</p>
          </section>

          {/* User Accounts */}
          <section className="legal-section">
            <h2 className="legal-section-title">
              <User size={20} />
              {t('termsOfService.accountsTitle', 'User Accounts')}
            </h2>
            <p>{t('termsOfService.accountsIntro', 'When creating an account, you agree to:')}</p>
            <ul className="legal-list">
              <li>{t('termsOfService.accountAccurate', 'Provide accurate and complete information')}</li>
              <li>{t('termsOfService.accountSecure', 'Keep your login credentials secure')}</li>
              <li>{t('termsOfService.accountResponsible', 'Be responsible for all activity under your account')}</li>
              <li>{t('termsOfService.accountNotify', 'Notify us immediately of any unauthorized access')}</li>
              <li>{t('termsOfService.accountAge', 'Be at least 18 years old to use this Service')}</li>
            </ul>
            <p className="legal-note legal-note--warning">
              {t('termsOfService.accountSuspension', 'We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity.')}
            </p>
          </section>

          {/* User Content */}
          <section className="legal-section">
            <h2 className="legal-section-title">
              <Camera size={20} />
              {t('termsOfService.contentTitle', 'User-Generated Content')}
            </h2>
            <p>{t('termsOfService.contentIntro', 'When submitting content (photos, reviews, profiles), you:')}</p>
            <ul className="legal-list">
              <li>{t('termsOfService.contentOwn', 'Confirm you own or have rights to the content')}</li>
              <li>{t('termsOfService.contentLicense', 'Grant PattaMap a non-exclusive license to use, display, and distribute the content')}</li>
              <li>{t('termsOfService.contentAccurate', 'Ensure the content is accurate and not misleading')}</li>
              <li>{t('termsOfService.contentLegal', 'Confirm the content does not violate any laws or third-party rights')}</li>
            </ul>
            <p>{t('termsOfService.contentModeration', 'All content is subject to moderation. We may remove content that violates these terms without notice.')}</p>
          </section>

          {/* Prohibited Conduct */}
          <section className="legal-section legal-section--warning">
            <h2 className="legal-section-title">
              <Ban size={20} />
              {t('termsOfService.prohibitedTitle', 'Prohibited Conduct')}
            </h2>
            <p>{t('termsOfService.prohibitedIntro', 'You agree NOT to:')}</p>
            <ul className="legal-list legal-list--rules">
              <li>
                <strong>{t('termsOfService.prohibitedSpam', 'Spam or Fake Content')}</strong>
                <span>{t('termsOfService.prohibitedSpamDesc', 'Post fake reviews, spam, or misleading information')}</span>
              </li>
              <li>
                <strong>{t('termsOfService.prohibitedHarass', 'Harassment')}</strong>
                <span>{t('termsOfService.prohibitedHarassDesc', 'Harass, bully, or threaten other users')}</span>
              </li>
              <li>
                <strong>{t('termsOfService.prohibitedImpersonate', 'Impersonation')}</strong>
                <span>{t('termsOfService.prohibitedImpersonateDesc', 'Impersonate others or create fake profiles')}</span>
              </li>
              <li>
                <strong>{t('termsOfService.prohibitedIllegal', 'Illegal Content')}</strong>
                <span>{t('termsOfService.prohibitedIllegalDesc', 'Post content that violates Thai law or international regulations')}</span>
              </li>
              <li>
                <strong>{t('termsOfService.prohibitedScrape', 'Data Scraping')}</strong>
                <span>{t('termsOfService.prohibitedScrapeDesc', 'Scrape, crawl, or collect data without permission')}</span>
              </li>
              <li>
                <strong>{t('termsOfService.prohibitedHack', 'Security Violations')}</strong>
                <span>{t('termsOfService.prohibitedHackDesc', 'Attempt to hack, exploit, or disrupt the Service')}</span>
              </li>
            </ul>
          </section>

          {/* Employee Profiles */}
          <section className="legal-section">
            <h2 className="legal-section-title">
              <Users size={20} />
              {t('termsOfService.employeeProfilesTitle', 'Employee Profiles')}
            </h2>
            <p>{t('termsOfService.employeeProfilesIntro', 'Special rules apply to employee profiles:')}</p>
            <ul className="legal-list">
              <li>{t('termsOfService.employeeConsent', 'Profiles can be created by users, but the person depicted can claim or request deletion at any time')}</li>
              <li>{t('termsOfService.employeeDeletion', 'Any person depicted has the right to request complete removal of their profile and data')}</li>
              <li>{t('termsOfService.employeeVerification', 'Profile claims require identity verification')}</li>
              <li>{t('termsOfService.employeeAccuracy', 'Information about employees must be accurate and respectful')}</li>
            </ul>
            <p className="legal-note">
              {t('termsOfService.employeeNote', 'If you see your profile and want it removed, use the "Is this me?" button or contact us. We will process deletion requests within 30 days.')}
            </p>
          </section>

          {/* Intellectual Property */}
          <section className="legal-section">
            <h2 className="legal-section-title">
              {t('termsOfService.ipTitle', 'Intellectual Property')}
            </h2>
            <p>{t('termsOfService.ipText1', 'The PattaMap name, logo, and platform design are protected intellectual property. You may not use our branding without written permission.')}</p>
            <p>{t('termsOfService.ipText2', 'User-submitted content remains the property of the original owner, subject to the license granted to PattaMap for display and distribution purposes.')}</p>
          </section>

          {/* Liability */}
          <section className="legal-section">
            <h2 className="legal-section-title">
              <AlertTriangle size={20} />
              {t('termsOfService.liabilityTitle', 'Limitation of Liability')}
            </h2>
            <p>{t('termsOfService.liabilityText1', 'PattaMap is provided "as is" without warranties of any kind. We are not responsible for:')}</p>
            <ul className="legal-list">
              <li>{t('termsOfService.liabilityAccuracy', 'Accuracy of user-submitted information')}</li>
              <li>{t('termsOfService.liabilityThirdParty', 'Actions of third parties or establishments listed on the platform')}</li>
              <li>{t('termsOfService.liabilityDowntime', 'Service interruptions or data loss')}</li>
              <li>{t('termsOfService.liabilityDamages', 'Any indirect, incidental, or consequential damages')}</li>
            </ul>
            <p>{t('termsOfService.liabilityMax', 'Our maximum liability is limited to the amount you paid for the Service (if any).')}</p>
          </section>

          {/* Governing Law */}
          <section className="legal-section">
            <h2 className="legal-section-title">
              <Gavel size={20} />
              {t('termsOfService.lawTitle', 'Governing Law')}
            </h2>
            <p>{t('termsOfService.lawText1', 'These Terms are governed by the laws of the Kingdom of Thailand. Any disputes shall be resolved in the courts of Chonburi Province, Thailand.')}</p>
            <p>{t('termsOfService.lawText2', 'If any provision of these Terms is found invalid, the remaining provisions will continue in full force.')}</p>
          </section>

          {/* Contact */}
          <section className="legal-section legal-section--contact">
            <h2 className="legal-section-title">
              <Mail size={20} />
              {t('termsOfService.contactTitle', 'Contact Us')}
            </h2>
            <p>{t('termsOfService.contactText', 'If you have questions about these Terms of Service, please contact us:')}</p>
            <div className="legal-contact-info">
              <p><strong>Email:</strong> legal@pattamap.com</p>
              <p><strong>{t('termsOfService.contactAddress', 'Address')}:</strong> Pattaya, Thailand</p>
            </div>
          </section>

          {/* Footer */}
          <footer className="legal-footer">
            <p>{t('termsOfService.footerText', 'These Terms of Service are effective as of January 2025. By using PattaMap, you acknowledge that you have read, understood, and agree to be bound by these terms.')}</p>
            <div className="legal-footer-links">
              <Link to="/privacy-policy">{t('footer.privacy', 'Privacy Policy')}</Link>
              <span>|</span>
              <Link to="/">{t('common.home', 'Home')}</Link>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
};

export default TermsOfServicePage;
