import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useTranslation } from 'react-i18next';
import LoadingFallback from '../Common/LoadingFallback';
import toast from '../../utils/toast';
import { logger } from '../../utils/logger';
import RequestVerificationModal from './RequestVerificationModal';
import EditMyProfileModal from './EditMyProfileModal';
import VIPPurchaseModal from '../Owner/VIPPurchaseModal';
import '../../styles/components/employee-dashboard.css';

interface VerificationStatus {
  employee: {
    id: string;
    name: string;
    is_verified: boolean;
    verified_at: string | null;
  };
  latest_verification: {
    id: string;
    status: 'pending' | 'approved' | 'rejected' | 'manual_review' | 'revoked';
    face_match_score: number | null;
    submitted_at: string;
    auto_approved: boolean;
  } | null;
}

interface EmployeeStats {
  profileViews: number;
  reviewsCount: number;
  averageRating: number;
  favoritesCount: number;
  currentEmployment: {
    id: string;
    establishment: {
      id: string;
      name: string;
      zone: string;
    };
  } | null;
}

interface Review {
  id: string;
  content: string;
  rating: number;
  created_at: string;
  user: {
    pseudonym: string;
  };
}

const EmployeeDashboard: React.FC = () => {
  const { user, linkedEmployeeProfile, refreshLinkedProfile } = useAuth();
  const { secureFetch } = useSecureFetch();
  const { t } = useTranslation();

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVIPModal, setShowVIPModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [linkedEmployeeProfile]);

  useEffect(() => {
    if (linkedEmployeeProfile?.id) {
      fetchReviews();
    }
  }, [linkedEmployeeProfile, reviewsPage]);

  const fetchDashboardData = async () => {
    if (!linkedEmployeeProfile?.id) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch verification status and stats in parallel for better performance
      const [verificationResponse, statsResponse] = await Promise.all([
        secureFetch(
          `${process.env.REACT_APP_API_URL}/api/verifications/${linkedEmployeeProfile.id}/verification-status`
        ),
        secureFetch(
          `${process.env.REACT_APP_API_URL}/api/employees/${linkedEmployeeProfile.id}/stats`
        )
      ]);

      if (verificationResponse.ok) {
        const verificationData = await verificationResponse.json();
        setVerificationStatus(verificationData);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setEmployeeStats(statsData.stats);
      }
    } catch (error) {
      logger.error('Failed to fetch dashboard data', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVerificationStatus = async () => {
    if (!linkedEmployeeProfile?.id) {
      return;
    }

    try {
      const response = await secureFetch(
        `${process.env.REACT_APP_API_URL}/api/verifications/${linkedEmployeeProfile.id}/verification-status`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch verification status');
      }

      const data = await response.json();
      setVerificationStatus(data);
    } catch (error) {
      logger.error('Failed to fetch verification status', error);
      toast.error('Failed to load verification status');
    }
  };

  const fetchReviews = async () => {
    if (!linkedEmployeeProfile?.id) {
      return;
    }

    setIsLoadingReviews(true);
    try {
      const limit = 5;
      const offset = (reviewsPage - 1) * limit;

      const response = await secureFetch(
        `${process.env.REACT_APP_API_URL}/api/employees/${linkedEmployeeProfile.id}/reviews?limit=${limit}&offset=${offset}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();
      setReviews(data.reviews || []);
      setTotalReviews(data.total || 0);
    } catch (error) {
      logger.error('Failed to fetch reviews', error);
      // Don't show error toast for reviews - it's not critical
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleVerificationComplete = () => {
    setShowVerificationModal(false);
    fetchVerificationStatus(); // Refresh status
  };

  const handleVIPPurchaseSuccess = async () => {
    toast.success(t('employeeDashboard.vipPurchaseSuccess', 'VIP purchase initiated! Awaiting admin verification.'));
    setShowVIPModal(false);
    // Refresh profile to get updated VIP status
    if (refreshLinkedProfile) {
      await refreshLinkedProfile(true);
    }
    fetchDashboardData();
  };

  if (!user || user.account_type !== 'employee') {
    return (
      <div className="employee-dashboard">
        <div className="dashboard-error">
          <h1>{t('common.accessDenied', 'Access Denied')}</h1>
          <p>{t('employeeDashboard.employeeOnly', 'This page is only accessible to employee accounts.')}</p>
        </div>
      </div>
    );
  }

  // Check loading state BEFORE checking if profile exists
  if (isLoading) {
    return <LoadingFallback message={t('common.loading', 'Loading...')} variant="page" />;
  }

  // État Pending : Profil en attente d'approbation admin
  if (linkedEmployeeProfile && linkedEmployeeProfile.status === 'pending') {
    return (
      <div className="employee-dashboard">
        <div className="dashboard-container">
          <header className="dashboard-header">
            <h1>{t('employeeDashboard.title', 'My Dashboard')}</h1>
            <p className="dashboard-subtitle">
              {t('employeeDashboard.welcome', 'Welcome')}, {linkedEmployeeProfile.name}
            </p>
          </header>

          <section className="verification-section">
            <div className="verification-status pending-approval">
              <div className="status-icon">🎉</div>
              <div className="status-content">
                <h2>{t('employeeDashboard.pendingApprovalTitle', 'Your Profile is On Its Way!')}</h2>
                <p className="pending-description">
                  {t('employeeDashboard.pendingApprovalMessage', 'Your profile is being reviewed by our team. Hang tight—this usually takes 24-48 hours. We\'ll notify you as soon as you\'re live!')}
                </p>

                <div className="pending-steps">
                  <h3>{t('employeeDashboard.whatHappensNextTitle', 'What happens next:')}</h3>
                  <ul>
                    <li>✓ {t('employeeDashboard.pendingStep1', 'Our team reviews your profile and photos')}</li>
                    <li>✓ {t('employeeDashboard.pendingStep2', 'You\'ll get notified when approved')}</li>
                    <li>✓ {t('employeeDashboard.pendingStep3', 'Once live, you can verify your identity and unlock all features')}</li>
                  </ul>
                </div>

                <div className="pro-tip">
                  <h4>{t('employeeDashboard.proTipTitle', '💡 Pro Tip:')}</h4>
                  <p>{t('employeeDashboard.proTipMessage', 'Make sure your notifications are enabled so you don\'t miss the approval!')}</p>
                </div>

                <div className="pending-info">
                  <p className="pending-status-text">
                    <strong>{t('employeeDashboard.statusLabel', 'Status')}:</strong> {t('employeeDashboard.waitingApproval', 'Waiting for admin approval')}
                  </p>
                  {linkedEmployeeProfile.created_at && (
                    <p className="pending-date">
                      <strong>{t('employeeDashboard.submittedLabel', 'Submitted')}:</strong>{' '}
                      {new Date(linkedEmployeeProfile.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="contact-admin">
                  <p>{t('employeeDashboard.needHelp', 'Need help? Contact an administrator.')}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // No linked profile yet - Technical error (should not happen in normal flow)
  if (!linkedEmployeeProfile) {
    return (
      <div className="employee-dashboard">
        <div className="dashboard-container">
          <header className="dashboard-header">
            <h1>{t('employeeDashboard.title', 'My Dashboard')}</h1>
          </header>

          <section className="verification-section">
            <div className="verification-status not-verified">
              <div className="status-icon">⚠️</div>
              <div className="status-content">
                <h3>{t('employeeDashboard.noProfileLinked', 'No Profile Linked')}</h3>
                <p className="not-verified-description">
                  {t('employeeDashboard.technicalError', 'There seems to be a technical issue with your profile setup. Please contact an administrator for assistance.')}
                </p>
                <p className="contact-admin" style={{ marginTop: '16px', fontSize: '14px' }}>
                  {t('employeeDashboard.needHelp', 'Need help? Contact an administrator.')}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const isVerified = verificationStatus?.employee.is_verified || false;
  const verifiedAt = verificationStatus?.employee.verified_at;
  const latestVerification = verificationStatus?.latest_verification;

  return (
    <div className="employee-dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>{t('employeeDashboard.title', 'My Dashboard')}</h1>
          <p className="dashboard-subtitle">
            {t('employeeDashboard.welcome', 'Welcome')}, {linkedEmployeeProfile.name}
          </p>
        </header>

        {/* Edit Profile Section */}
        <section className="verification-section" style={{ marginBottom: '30px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2>{t('employeeDashboard.myProfile', 'My Profile')}</h2>
            <button
              className="btn-verify"
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={() => setShowEditModal(true)}
            >
              ✏️ {t('employeeDashboard.editProfile', 'Edit My Profile')}
            </button>
          </div>

          <div className="profile-summary" style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            gap: '20px',
            alignItems: 'center'
          }}>
            {linkedEmployeeProfile.photos && linkedEmployeeProfile.photos[0] && (
              <img
                src={linkedEmployeeProfile.photos[0]}
                alt={linkedEmployeeProfile.name}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            )}
            <div>
              <h3 style={{ color: '#C19A6B', margin: '0 0 8px 0' }}>{linkedEmployeeProfile.name}</h3>
              {linkedEmployeeProfile.nickname && (
                <p style={{ color: '#cccccc', margin: '0 0 8px 0', fontSize: '14px' }}>
                  "{linkedEmployeeProfile.nickname}"
                </p>
              )}
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0', fontSize: '13px' }}>
                {linkedEmployeeProfile.age && `${linkedEmployeeProfile.age} years old`}
                {linkedEmployeeProfile.age && linkedEmployeeProfile.nationality && ' • '}
                {linkedEmployeeProfile.nationality}
              </p>
            </div>
          </div>
        </section>

        {/* Verification Status Section */}
        <section className="verification-section">
          <h2>{t('employeeDashboard.verificationStatus', 'Verification Status')}</h2>

          {isVerified ? (
            <div className="verification-status verified">
              <div className="status-icon">✓</div>
              <div className="status-content">
                <h3>{t('employeeDashboard.verified', 'Your profile is verified!')}</h3>
                {verifiedAt && (
                  <p className="verified-date">
                    {t('employeeDashboard.verifiedOn', 'Verified on')}: {new Date(verifiedAt).toLocaleDateString()}
                  </p>
                )}
                <p className="verified-description">
                  {t('employeeDashboard.verifiedDescription', 'Your profile now displays a verified badge to build trust with visitors.')}
                </p>
              </div>
            </div>
          ) : (
            <div className="verification-status not-verified">
              <div className="status-icon">⚠️</div>
              <div className="status-content">
                <h3>{t('employeeDashboard.notVerified', 'Your profile is not verified yet')}</h3>

                {latestVerification?.status === 'manual_review' ? (
                  <div className="status-pending">
                    <p>{t('employeeDashboard.underReview', 'Your verification is under manual review.')}</p>
                    <p className="status-details">
                      {t('employeeDashboard.reviewMessage', 'An admin will review your submission within 24 hours.')}
                    </p>
                    {latestVerification.face_match_score && (
                      <p className="match-score">
                        {t('employeeDashboard.matchScore', 'Match score')}: {latestVerification.face_match_score}%
                      </p>
                    )}
                  </div>
                ) : latestVerification?.status === 'rejected' ? (
                  <div className="status-rejected">
                    <p>{t('employeeDashboard.rejected', 'Your last verification attempt was rejected.')}</p>
                    <p className="status-details">
                      {t('employeeDashboard.rejectedMessage', 'The photo did not match your profile photos. Please try again with a clearer selfie.')}
                    </p>
                    <button
                      className="btn-verify"
                      onClick={() => setShowVerificationModal(true)}
                    >
                      {t('employeeDashboard.tryAgain', 'Try Again')}
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="not-verified-description">
                      {t('employeeDashboard.notVerifiedDescription', 'Verify your profile to gain trust and stand out with a verified badge.')}
                    </p>
                    <button
                      className="btn-verify"
                      onClick={() => setShowVerificationModal(true)}
                    >
                      🛡️ {t('employeeDashboard.verifyProfile', 'Verify My Profile')}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Stats Section - Real Data */}
        <section className="stats-section">
          <h2>{t('employeeDashboard.statistics', 'Statistics')}</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👁️</div>
              <div className="stat-content">
                <p className="stat-label">{t('employeeDashboard.profileViews', 'Profile Views')}</p>
                <p className="stat-value">
                  {employeeStats ? employeeStats.profileViews.toLocaleString() : '-'}
                </p>
                {!employeeStats && (
                  <p className="stat-note">{t('common.loading', 'Loading...')}</p>
                )}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💬</div>
              <div className="stat-content">
                <p className="stat-label">{t('employeeDashboard.reviews', 'Reviews')}</p>
                <p className="stat-value">
                  {employeeStats ? employeeStats.reviewsCount.toLocaleString() : '-'}
                </p>
                {!employeeStats && (
                  <p className="stat-note">{t('common.loading', 'Loading...')}</p>
                )}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-content">
                <p className="stat-label">{t('employeeDashboard.rating', 'Average Rating')}</p>
                <p className="stat-value">
                  {employeeStats ? (
                    employeeStats.averageRating > 0 ? (
                      `${employeeStats.averageRating.toFixed(1)} / 5.0`
                    ) : (
                      <span style={{ fontSize: '16px' }}>
                        {t('employeeDashboard.noRatings', 'No ratings yet')}
                      </span>
                    )
                  ) : '-'}
                </p>
                {!employeeStats && (
                  <p className="stat-note">{t('common.loading', 'Loading...')}</p>
                )}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">❤️</div>
              <div className="stat-content">
                <p className="stat-label">{t('employeeDashboard.favorites', 'Favorites')}</p>
                <p className="stat-value">
                  {employeeStats ? employeeStats.favoritesCount.toLocaleString() : '-'}
                </p>
                {!employeeStats && (
                  <p className="stat-note">{t('common.loading', 'Loading...')}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* VIP Section */}
        <section className="vip-section" style={{ marginTop: '30px' }}>
          <h2>{t('employeeDashboard.vipBoost', 'VIP Boost')}</h2>

          {linkedEmployeeProfile.is_vip && linkedEmployeeProfile.vip_expires_at ? (
            <div className="vip-active-card">
              <div className="vip-active-content">
                <div className="vip-icon">👑</div>
                <div className="vip-details">
                  <h3>{t('employeeDashboard.vipActive', 'VIP Active')}</h3>
                  <p className="vip-expiry">
                    {t('employeeDashboard.vipExpires', 'Expires')}: {new Date(linkedEmployeeProfile.vip_expires_at).toLocaleDateString()}
                  </p>
                  <div className="vip-benefits">
                    <span>✅ {t('employeeDashboard.vipBenefit1', 'Top position in search')}</span>
                    <span>✅ {t('employeeDashboard.vipBenefit2', 'Gold border + badge')}</span>
                    <span>✅ {t('employeeDashboard.vipBenefit3', 'Priority visibility')}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="vip-upgrade-card">
              <div className="vip-upgrade-content">
                <div className="vip-icon">👑</div>
                <div className="vip-pitch">
                  <h3>{t('employeeDashboard.upgradeToVIP', 'Upgrade to VIP')}</h3>
                  <p className="vip-subtitle">
                    {t('employeeDashboard.vipSubtitle', 'Boost Your Visibility')}
                  </p>
                  <ul className="vip-benefits-list">
                    <li>✅ {t('employeeDashboard.vipBenefit1', 'Top position in search')}</li>
                    <li>✅ {t('employeeDashboard.vipBenefit2', 'Gold border + badge')}</li>
                    <li>✅ {t('employeeDashboard.vipBenefit3', 'Priority visibility')}</li>
                    <li>✅ {t('employeeDashboard.vipBenefit4', 'Detailed analytics')}</li>
                  </ul>
                  <button
                    className="btn-upgrade-vip"
                    onClick={() => setShowVIPModal(true)}
                  >
                    👑 {t('employeeDashboard.upgradeNow', 'Upgrade Now')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Reviews Section */}
        <section className="reviews-section" style={{ marginTop: '30px' }}>
          <h2>{t('employeeDashboard.recentReviews', 'Recent Reviews')}</h2>

          {isLoadingReviews ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.6)' }}>
              {t('common.loading', 'Loading...')}
            </div>
          ) : reviews.length === 0 ? (
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.6)'
            }}>
              <p>{t('employeeDashboard.noReviewsYet', 'No reviews yet. Reviews will appear here once visitors rate your profile.')}</p>
            </div>
          ) : (
            <>
              <div className="reviews-list">
                {reviews.map((review) => (
                  <div key={review.id} style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '15px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <span style={{ color: '#C19A6B', fontWeight: '600' }}>
                          {review.user?.pseudonym || 'Anonymous'}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '12px', fontSize: '14px' }}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[...Array(5)].map((_, i) => (
                          <span key={i} style={{ color: i < review.rating ? '#FFD700' : 'rgba(255,255,255,0.2)' }}>
                            ⭐
                          </span>
                        ))}
                      </div>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: '1.6' }}>
                      {review.content}
                    </p>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalReviews > 5 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '16px',
                  marginTop: '24px'
                }}>
                  <button
                    onClick={() => setReviewsPage(prev => Math.max(1, prev - 1))}
                    disabled={reviewsPage === 1}
                    style={{
                      padding: '8px 16px',
                      background: reviewsPage === 1 ? 'rgba(255,255,255,0.1)' : 'rgba(193, 154, 107, 0.2)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: reviewsPage === 1 ? 'rgba(255,255,255,0.3)' : '#ffffff',
                      cursor: reviewsPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    ← {t('common.previous', 'Previous')}
                  </button>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {t('common.page', 'Page')} {reviewsPage} / {Math.ceil(totalReviews / 5)}
                  </span>
                  <button
                    onClick={() => setReviewsPage(prev => prev + 1)}
                    disabled={reviewsPage >= Math.ceil(totalReviews / 5)}
                    style={{
                      padding: '8px 16px',
                      background: reviewsPage >= Math.ceil(totalReviews / 5) ? 'rgba(255,255,255,0.1)' : 'rgba(193, 154, 107, 0.2)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: reviewsPage >= Math.ceil(totalReviews / 5) ? 'rgba(255,255,255,0.3)' : '#ffffff',
                      cursor: reviewsPage >= Math.ceil(totalReviews / 5) ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {t('common.next', 'Next')} →
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Verification Modal */}
      {showVerificationModal && linkedEmployeeProfile && (
        <RequestVerificationModal
          employeeId={linkedEmployeeProfile.id}
          onClose={() => setShowVerificationModal(false)}
          onVerificationComplete={handleVerificationComplete}
        />
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditMyProfileModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onProfileUpdated={async () => {
            // 🔄 v10.2 FIX: Refresh profile data from AuthContext before refreshing stats
            if (refreshLinkedProfile) {
              await refreshLinkedProfile(true); // skipCheck=true to bypass user state check
            }
            fetchDashboardData(); // Refresh stats after profile update
          }}
        />
      )}

      {/* VIP Purchase Modal */}
      {showVIPModal && linkedEmployeeProfile && (
        <VIPPurchaseModal
          subscriptionType="employee"
          entity={linkedEmployeeProfile}
          onClose={() => setShowVIPModal(false)}
          onSuccess={handleVIPPurchaseSuccess}
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;
