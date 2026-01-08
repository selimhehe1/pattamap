import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useTranslation } from 'react-i18next';
import { useAppModals } from '../../hooks/useAppModals';
import LoadingFallback from '../Common/LoadingFallback';
import { SkeletonDetailPage } from '../Common/Skeleton';
import notification from '../../utils/notification';
import { logger } from '../../utils/logger';
import RequestVerificationModal from './RequestVerificationModal';
import RequestSelfRemovalModal from './RequestSelfRemovalModal';
import VIPPurchaseModal from '../Owner/VIPPurchaseModal';
import { isFeatureEnabled, FEATURES } from '../../utils/featureFlags';
import {
  PartyPopper,
  Lightbulb,
  AlertTriangle,
  Pencil,
  Check,
  Shield,
  Eye,
  MessageCircle,
  Star,
  Heart,
  Crown,
  CheckCircle,
  Trash2
} from 'lucide-react';
import '../../styles/components/employee-dashboard.css';

// Feature flag for VIP system (disabled for now)
const VIP_ENABLED = isFeatureEnabled(FEATURES.VIP_SYSTEM);

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
  const { handleEditMyProfile } = useAppModals();

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showVIPModal, setShowVIPModal] = useState(false);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [refreshDashboard, setRefreshDashboard] = useState(0);

  // Helper function to trigger dashboard refresh
  const triggerDashboardRefresh = () => setRefreshDashboard(c => c + 1);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!linkedEmployeeProfile?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const [verificationResponse, statsResponse] = await Promise.all([
          secureFetch(
            `${import.meta.env.VITE_API_URL}/api/verifications/${linkedEmployeeProfile.id}/verification-status`
          ),
          secureFetch(
            `${import.meta.env.VITE_API_URL}/api/employees/${linkedEmployeeProfile.id}/stats`
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
        notification.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [linkedEmployeeProfile, secureFetch, refreshDashboard]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!linkedEmployeeProfile?.id) {
        return;
      }

      setIsLoadingReviews(true);
      try {
        const limit = 5;
        const offset = (reviewsPage - 1) * limit;

        const response = await secureFetch(
          `${import.meta.env.VITE_API_URL}/api/employees/${linkedEmployeeProfile.id}/reviews?limit=${limit}&offset=${offset}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch reviews');
        }

        const data = await response.json();
        setReviews(data.reviews || []);
        setTotalReviews(data.total || 0);
      } catch (error) {
        logger.error('Failed to fetch reviews', error);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    if (linkedEmployeeProfile?.id) {
      fetchReviews();
    }
  }, [linkedEmployeeProfile, reviewsPage, secureFetch]);

  const fetchVerificationStatus = async () => {
    if (!linkedEmployeeProfile?.id) {
      return;
    }

    try {
      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/verifications/${linkedEmployeeProfile.id}/verification-status`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch verification status');
      }

      const data = await response.json();
      setVerificationStatus(data);
    } catch (error) {
      logger.error('Failed to fetch verification status', error);
      notification.error('Failed to load verification status');
    }
  };

  const handleVerificationComplete = () => {
    setShowVerificationModal(false);
    fetchVerificationStatus(); // Refresh status
  };

  const handleVIPPurchaseSuccess = async () => {
    notification.success(t('employeeDashboard.vipPurchaseSuccess', 'VIP purchase initiated! Awaiting admin verification.'));
    setShowVIPModal(false);
    // Refresh profile to get updated VIP status
    if (refreshLinkedProfile) {
      await refreshLinkedProfile(true);
    }
    triggerDashboardRefresh();
  };

  const handleRemovalRequestSuccess = () => {
    setShowRemovalModal(false);
    // Refresh profile to reflect the removal request status
    if (refreshLinkedProfile) {
      refreshLinkedProfile(true);
    }
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
    return <SkeletonDetailPage variant="employee" showSidebar={true} galleryCount={3} />;
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
              <div className="status-icon"><PartyPopper size={32} /></div>
              <div className="status-content">
                <h2>{t('employeeDashboard.pendingApprovalTitle', 'Your Profile is On Its Way!')}</h2>
                <p className="pending-description">
                  {t('employeeDashboard.pendingApprovalMessage', 'Your profile is being reviewed by our team. Hang tight—this usually takes 24-48 hours. We\'ll notify you as soon as you\'re live!')}
                </p>

                <div className="pending-steps">
                  <h3>{t('employeeDashboard.whatHappensNextTitle', 'What happens next:')}</h3>
                  <ul>
                    <li><Check size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#06FFA5' }} />{t('employeeDashboard.pendingStep1', 'Our team reviews your profile and photos')}</li>
                    <li><Check size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#06FFA5' }} />{t('employeeDashboard.pendingStep2', 'You\'ll get notified when approved')}</li>
                    <li><Check size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#06FFA5' }} />{t('employeeDashboard.pendingStep3', 'Once live, you can verify your identity and unlock all features')}</li>
                  </ul>
                </div>

                <div className="pro-tip">
                  <h4><Lightbulb size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />{t('employeeDashboard.proTipTitle', 'Pro Tip:')}</h4>
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

  // No linked profile yet - redirect to home instead of showing error
  if (!linkedEmployeeProfile) {
    return <Navigate to="/" replace />;
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
              onClick={handleEditMyProfile}
            >
              <Pencil size={16} style={{ marginRight: '6px' }} /> {t('employeeDashboard.editProfile', 'Edit My Profile')}
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
              <div className="status-icon"><Check size={32} /></div>
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
              <div className="status-icon"><AlertTriangle size={32} /></div>
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
                      <Shield size={16} style={{ marginRight: '6px' }} /> {t('employeeDashboard.verifyProfile', 'Verify My Profile')}
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
              <div className="stat-icon"><Eye size={24} /></div>
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
              <div className="stat-icon"><MessageCircle size={24} /></div>
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
              <div className="stat-icon"><Star size={24} /></div>
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
              <div className="stat-icon"><Heart size={24} /></div>
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

        {/* VIP Section - Only shown when VIP feature is enabled */}
        {VIP_ENABLED && (
          <section className="vip-section" style={{ marginTop: '30px' }}>
            <h2>{t('employeeDashboard.vipBoost', 'VIP Boost')}</h2>

            {linkedEmployeeProfile.is_vip && linkedEmployeeProfile.vip_expires_at ? (
              <div className="vip-active-card">
                <div className="vip-active-content">
                  <div className="vip-icon"><Crown size={32} /></div>
                  <div className="vip-details">
                    <h3>{t('employeeDashboard.vipActive', 'VIP Active')}</h3>
                    <p className="vip-expiry">
                      {t('employeeDashboard.vipExpires', 'Expires')}: {new Date(linkedEmployeeProfile.vip_expires_at).toLocaleDateString()}
                    </p>
                    <div className="vip-benefits">
                      <span><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('employeeDashboard.vipBenefit1', 'Top position in search')}</span>
                      <span><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('employeeDashboard.vipBenefit2', 'Gold border + badge')}</span>
                      <span><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('employeeDashboard.vipBenefit3', 'Priority visibility')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="vip-upgrade-card">
                <div className="vip-upgrade-content">
                  <div className="vip-icon"><Crown size={32} /></div>
                  <div className="vip-pitch">
                    <h3>{t('employeeDashboard.upgradeToVIP', 'Upgrade to VIP')}</h3>
                    <p className="vip-subtitle">
                      {t('employeeDashboard.vipSubtitle', 'Boost Your Visibility')}
                    </p>
                    <ul className="vip-benefits-list">
                      <li><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('employeeDashboard.vipBenefit1', 'Top position in search')}</li>
                      <li><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('employeeDashboard.vipBenefit2', 'Gold border + badge')}</li>
                      <li><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('employeeDashboard.vipBenefit3', 'Priority visibility')}</li>
                      <li><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('employeeDashboard.vipBenefit4', 'Detailed analytics')}</li>
                    </ul>
                    <button
                      className="btn-upgrade-vip"
                      onClick={() => setShowVIPModal(true)}
                    >
                      <Crown size={16} style={{ marginRight: '6px' }} /> {t('employeeDashboard.upgradeNow', 'Upgrade Now')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

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
                          <Star key={i} size={16} fill={i < review.rating ? '#FFD700' : 'transparent'} color={i < review.rating ? '#FFD700' : 'rgba(255,255,255,0.2)'} />
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

        {/* Danger Zone Section */}
        <section className="danger-zone-section" style={{ marginTop: '40px' }}>
          <h2 style={{
            color: '#F87171',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={24} />
            {t('employeeDashboard.dangerZone', 'Danger Zone')}
          </h2>
          <div style={{
            background: 'rgba(248, 113, 113, 0.05)',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <h3 style={{
                  color: '#ffffff',
                  margin: '0 0 8px 0',
                  fontSize: '16px'
                }}>
                  {t('employeeDashboard.requestRemoval', 'Request Profile Removal')}
                </h3>
                <p style={{
                  color: 'rgba(255,255,255,0.6)',
                  margin: 0,
                  fontSize: '14px',
                  maxWidth: '400px'
                }}>
                  {t('employeeDashboard.removalDescription', 'Once your removal request is approved, your profile will no longer be visible to visitors.')}
                </p>
              </div>
              <button
                onClick={() => setShowRemovalModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  background: 'rgba(248, 113, 113, 0.15)',
                  border: '1px solid rgba(248, 113, 113, 0.5)',
                  borderRadius: '8px',
                  color: '#F87171',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(248, 113, 113, 0.25)';
                  e.currentTarget.style.borderColor = '#F87171';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(248, 113, 113, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.5)';
                }}
              >
                <Trash2 size={16} />
                {t('employeeDashboard.requestRemovalBtn', 'Request Removal')}
              </button>
            </div>
          </div>
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

      {/* VIP Purchase Modal - Only shown when VIP feature is enabled */}
      {VIP_ENABLED && showVIPModal && linkedEmployeeProfile && (
        <VIPPurchaseModal
          subscriptionType="employee"
          entity={linkedEmployeeProfile}
          onClose={() => setShowVIPModal(false)}
          onSuccess={handleVIPPurchaseSuccess}
        />
      )}

      {/* Self Removal Modal */}
      {showRemovalModal && linkedEmployeeProfile && (
        <RequestSelfRemovalModal
          employeeId={linkedEmployeeProfile.id}
          employeeName={linkedEmployeeProfile.name}
          onClose={() => setShowRemovalModal(false)}
          onSuccess={handleRemovalRequestSuccess}
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;
