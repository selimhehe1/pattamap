import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from '@dr.pogodin/react-helmet';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Shield, Database, Users, Clock, Mail, Globe, Cookie } from 'lucide-react';
import '../styles/pages/legal-pages.css';

/**
 * Privacy Policy Page
 *
 * Compliant with:
 * - PDPA (Thailand Personal Data Protection Act)
 * - GDPR (General Data Protection Regulation) for EU visitors
 *
 * Last updated: January 2025
 */
const PrivacyPolicyPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('privacyPolicy.pageTitle', 'Privacy Policy')} - PattaMap</title>
        <meta
          name="description"
          content={t('privacyPolicy.metaDescription', 'PattaMap Privacy Policy - Learn how we collect, use, and protect your personal data in compliance with PDPA and GDPR.')}
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pattamap.com/privacy-policy" />
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
              <Shield size={32} />
            </div>
            <h1 className="legal-title">{t('privacyPolicy.title', 'Privacy Policy')}</h1>
            <p className="legal-subtitle">
              {t('privacyPolicy.lastUpdated', 'Last updated: January 2025')}
            </p>
          </header>

          {/* Introduction */}
          <section className="legal-section">
            <h2 className="legal-section-title">
              <Globe size={20} />
              {t('privacyPolicy.introTitle', 'Introduction')}
            </h2>
            <p>{t('privacyPolicy.introText1', 'PattaMap ("we", "our", or "us") operates the pattamap.com website and related services. This Privacy Policy explains how we collect, use, disclose, and protect your personal information.')}</p>
            <p>{t('privacyPolicy.introText2', 'By using PattaMap, you agree to the collection and use of information in accordance with this policy. We are committed to protecting your privacy and complying with applicable data protection laws, including the Thailand Personal Data Protection Act (PDPA) and the EU General Data Protection Regulation (GDPR).')}</p>
          </section>

          {/* Data Collected */}
          <section className="legal-section">
            <h2 className="legal-section-title">
              <Database size={20} />
              {t('privacyPolicy.dataCollectedTitle', 'Information We Collect')}
            </h2>

            <h3 className="legal-subsection-title">{t('privacyPolicy.accountData', 'Account Information')}</h3>
            <ul className="legal-list">
              <li>{t('privacyPolicy.dataEmail', 'Email address (for account creation and communication)')}</li>
              <li>{t('privacyPolicy.dataPseudonym', 'Pseudonym/username (public display name)')}</li>
              <li>{t('privacyPolicy.dataAvatar', 'Profile photo (optional)')}</li>
              <li>{t('privacyPolicy.dataAccountType', 'Account type (regular user, employee, or establishment owner)')}</li>
            </ul>

            <h3 className="legal-subsection-title">{t('privacyPolicy.employeeProfiles', 'Employee Profiles')}</h3>
            <p>{t('privacyPolicy.employeeProfilesNote', 'For users who create or claim employee profiles, we may collect:')}</p>
            <ul className="legal-list">
              <li>{t('privacyPolicy.dataName', 'Name and nickname')}</li>
              <li>{t('privacyPolicy.dataAge', 'Age')}</li>
              <li>{t('privacyPolicy.dataNationality', 'Nationality')}</li>
              <li>{t('privacyPolicy.dataPhotos', 'Photos')}</li>
              <li>{t('privacyPolicy.dataSocialMedia', 'Social media links (Instagram, Facebook, Line, etc.)')}</li>
              <li>{t('privacyPolicy.dataEmployment', 'Employment history')}</li>
            </ul>

            <h3 className="legal-subsection-title">{t('privacyPolicy.usageData', 'Usage Data')}</h3>
            <ul className="legal-list">
              <li>{t('privacyPolicy.dataReviews', 'Reviews and ratings you submit')}</li>
              <li>{t('privacyPolicy.dataFavorites', 'Favorites and bookmarks')}</li>
              <li>{t('privacyPolicy.dataDevice', 'Device information and browser type')}</li>
              <li>{t('privacyPolicy.dataIP', 'IP address (for security and analytics)')}</li>
            </ul>
          </section>

          {/* How We Use Data */}
          <section className="legal-section">
            <h2 className="legal-section-title">
              <Users size={20} />
              {t('privacyPolicy.howWeUseTitle', 'How We Use Your Information')}
            </h2>
            <p>{t('privacyPolicy.howWeUseIntro', 'We use the collected information for the following purposes:')}</p>
            <ul className="legal-list">
              <li>{t('privacyPolicy.useProvideService', 'To provide and maintain our service')}</li>
              <li>{t('privacyPolicy.useAccount', 'To manage your account and enable features')}</li>
              <li>{t('privacyPolicy.useCommunicate', 'To communicate with you about updates and changes')}</li>
              <li>{t('privacyPolicy.useSecurity', 'To ensure the security and integrity of our platform')}</li>
              <li>{t('privacyPolicy.useImprove', 'To analyze usage and improve our services')}</li>
              <li>{t('privacyPolicy.useModeration', 'To moderate content and prevent abuse')}</li>
            </ul>
          </section>

          {/* Legal Basis */}
          <section className="legal-section">
            <h2 className="legal-section-title">{t('privacyPolicy.legalBasisTitle', 'Legal Basis for Processing')}</h2>
            <p>{t('privacyPolicy.legalBasisIntro', 'We process your personal data based on:')}</p>
            <ul className="legal-list">
              <li><strong>{t('privacyPolicy.basisConsent', 'Consent')}</strong>: {t('privacyPolicy.basisConsentDesc', 'When you create an account or submit information')}</li>
              <li><strong>{t('privacyPolicy.basisContract', 'Contract')}</strong>: {t('privacyPolicy.basisContractDesc', 'To fulfill our service agreement with you')}</li>
              <li><strong>{t('privacyPolicy.basisLegitimate', 'Legitimate Interest')}</strong>: {t('privacyPolicy.basisLegitimateDesc', 'For platform security and improvement')}</li>
              <li><strong>{t('privacyPolicy.basisLegal', 'Legal Obligation')}</strong>: {t('privacyPolicy.basisLegalDesc', 'To comply with applicable laws')}</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section className="legal-section">
            <h2 className="legal-section-title">{t('privacyPolicy.dataSharingTitle', 'Data Sharing and Third Parties')}</h2>
            <p>{t('privacyPolicy.dataSharingIntro', 'We may share your information with the following third-party service providers:')}</p>
            <ul className="legal-list">
              <li><strong>Supabase</strong>: {t('privacyPolicy.thirdPartySupabase', 'Database and authentication services')}</li>
              <li><strong>Cloudinary</strong>: {t('privacyPolicy.thirdPartyCloudinary', 'Image hosting and optimization')}</li>
              <li><strong>Vercel</strong>: {t('privacyPolicy.thirdPartyVercel', 'Website hosting')}</li>
              <li><strong>Sentry</strong>: {t('privacyPolicy.thirdPartySentry', 'Error tracking and performance monitoring')}</li>
            </ul>
            <p>{t('privacyPolicy.dataSharingNote', 'We do not sell your personal data to third parties.')}</p>
          </section>

          {/* Data Retention */}
          <section className="legal-section">
            <h2 className="legal-section-title">
              <Clock size={20} />
              {t('privacyPolicy.retentionTitle', 'Data Retention')}
            </h2>
            <p>{t('privacyPolicy.retentionText', 'We retain your personal data for as long as your account is active or as needed to provide our services. You can request deletion of your data at any time. After account deletion, we may retain certain data for legal or legitimate business purposes for up to 30 days.')}</p>
          </section>

          {/* Your Rights */}
          <section className="legal-section legal-section--highlight">
            <h2 className="legal-section-title">{t('privacyPolicy.yourRightsTitle', 'Your Rights')}</h2>
            <p>{t('privacyPolicy.yourRightsIntro', 'Under PDPA and GDPR, you have the following rights:')}</p>
            <ul className="legal-list legal-list--rights">
              <li>
                <strong>{t('privacyPolicy.rightAccess', 'Right to Access')}</strong>
                <span>{t('privacyPolicy.rightAccessDesc', 'Request a copy of your personal data')}</span>
              </li>
              <li>
                <strong>{t('privacyPolicy.rightRectification', 'Right to Rectification')}</strong>
                <span>{t('privacyPolicy.rightRectificationDesc', 'Correct inaccurate or incomplete data')}</span>
              </li>
              <li>
                <strong>{t('privacyPolicy.rightErasure', 'Right to Erasure')}</strong>
                <span>{t('privacyPolicy.rightErasureDesc', 'Request deletion of your personal data')}</span>
              </li>
              <li>
                <strong>{t('privacyPolicy.rightPortability', 'Right to Data Portability')}</strong>
                <span>{t('privacyPolicy.rightPortabilityDesc', 'Receive your data in a portable format')}</span>
              </li>
              <li>
                <strong>{t('privacyPolicy.rightObject', 'Right to Object')}</strong>
                <span>{t('privacyPolicy.rightObjectDesc', 'Object to certain types of processing')}</span>
              </li>
              <li>
                <strong>{t('privacyPolicy.rightWithdraw', 'Right to Withdraw Consent')}</strong>
                <span>{t('privacyPolicy.rightWithdrawDesc', 'Withdraw consent at any time')}</span>
              </li>
            </ul>
            <p className="legal-rights-note">
              {t('privacyPolicy.exerciseRights', 'To exercise these rights, use the "Is this me?" button on your profile or contact us directly.')}
            </p>
          </section>

          {/* Cookies */}
          <section className="legal-section">
            <h2 className="legal-section-title">
              <Cookie size={20} />
              {t('privacyPolicy.cookiesTitle', 'Cookies and Tracking')}
            </h2>
            <p>{t('privacyPolicy.cookiesText', 'We use essential cookies to maintain your session and remember your preferences (language, theme). We do not use advertising or tracking cookies. Analytics data is collected anonymously to improve our service.')}</p>
          </section>

          {/* Security */}
          <section className="legal-section">
            <h2 className="legal-section-title">{t('privacyPolicy.securityTitle', 'Data Security')}</h2>
            <p>{t('privacyPolicy.securityText', 'We implement appropriate security measures to protect your personal data, including encryption, secure authentication (JWT), CSRF protection, and regular security audits. However, no method of transmission over the Internet is 100% secure.')}</p>
          </section>

          {/* Contact */}
          <section className="legal-section legal-section--contact">
            <h2 className="legal-section-title">
              <Mail size={20} />
              {t('privacyPolicy.contactTitle', 'Contact Us')}
            </h2>
            <p>{t('privacyPolicy.contactText', 'If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us:')}</p>
            <div className="legal-contact-info">
              <p><strong>Email:</strong> privacy@pattamap.com</p>
              <p><strong>{t('privacyPolicy.contactAddress', 'Address')}:</strong> Pattaya, Thailand</p>
            </div>
          </section>

          {/* Footer */}
          <footer className="legal-footer">
            <p>{t('privacyPolicy.footerText', 'This Privacy Policy may be updated from time to time. We will notify you of any significant changes by posting the new policy on this page.')}</p>
            <div className="legal-footer-links">
              <Link to="/terms">{t('footer.terms', 'Terms of Service')}</Link>
              <span>|</span>
              <Link to="/">{t('common.home', 'Home')}</Link>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicyPage;
