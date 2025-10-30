import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { EmployeeClaimRequest } from '../../types';
import AdminBreadcrumb from '../Common/AdminBreadcrumb';
import LoadingFallback from '../Common/LoadingFallback';
import LazyImage from '../Common/LazyImage';
import { logger } from '../../utils/logger';
import toast from '../../utils/toast';

interface EmployeeClaimsAdminProps {
  onTabChange: (tab: string) => void;
}

/**
 * EmployeeClaimsAdmin
 *
 * Admin interface for managing employee profile claim requests.
 * Allows admins/moderators to approve or reject claims submitted by users
 * who want to link their account to an existing employee profile.
 *
 * Features:
 * - Filter claims by status (pending, approved, rejected, all)
 * - View detailed claim information (user, employee, message, proofs)
 * - Approve/reject claims with moderator notes
 * - Image preview for verification proofs
 * - Responsive nightlife-themed UI
 */
const EmployeeClaimsAdmin: React.FC<EmployeeClaimsAdminProps> = ({ onTabChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [claims, setClaims] = useState<EmployeeClaimRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [selectedClaim, setSelectedClaim] = useState<EmployeeClaimRequest | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [claimToReject, setClaimToReject] = useState<string | null>(null);

  useEffect(() => {
    loadClaims();
  }, [filter]);

  const loadClaims = async () => {
    setIsLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const statusParam = filter === 'all' ? '' : `?status=${filter}`;

      const response = await fetch(`${API_URL}/api/employees/claims${statusParam}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setClaims(data.claims || []);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t('admin.claims.errorLoadFailed'));
      }
    } catch (error) {
      logger.error('Failed to load employee claims:', error);
      toast.error(t('admin.claims.errorLoadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (claimId: string) => {
    setProcessingIds(prev => new Set(prev).add(claimId));
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const response = await fetch(`${API_URL}/api/employees/claims/${claimId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ moderator_notes: 'Claim approved' })
      });

      if (response.ok) {
        toast.success(t('admin.claims.successApproved'));
        await loadClaims(); // Reload list
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t('admin.claims.errorApproveFailed'));
      }
    } catch (error) {
      logger.error('Failed to approve claim:', error);
      toast.error(t('admin.claims.errorApproveFailed'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(claimId);
        return newSet;
      });
    }
  };

  const handleRejectClick = (claimId: string) => {
    setClaimToReject(claimId);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!claimToReject) return;

    if (rejectReason.trim().length < 10) {
      toast.error(t('admin.claims.errorRejectReasonShort'));
      return;
    }

    setProcessingIds(prev => new Set(prev).add(claimToReject));
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const response = await fetch(`${API_URL}/api/employees/claims/${claimToReject}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ moderator_notes: rejectReason.trim() })
      });

      if (response.ok) {
        toast.success(t('admin.claims.successRejected'));
        setRejectModalOpen(false);
        setClaimToReject(null);
        setRejectReason('');
        await loadClaims(); // Reload list
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t('admin.claims.errorRejectFailed'));
      }
    } catch (error) {
      logger.error('Failed to reject claim:', error);
      toast.error(t('admin.claims.errorRejectFailed'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(claimToReject);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFD700';
      case 'approved': return '#00FF7F';
      case 'rejected': return '#FF4757';
      default: return '#cccccc';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      default: return '❓';
    }
  };

  const isImageUrl = (url: string): boolean => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  if (!user || !['admin', 'moderator'].includes(user.role)) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '30px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
          borderRadius: '20px',
          border: '2px solid rgba(193, 154, 107,0.3)',
          padding: '40px',
          textAlign: 'center'
        }}>
          <h2 style={{
            color: '#C19A6B',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0 0 15px 0'
          }}>
            🚫 {t('admin.claims.accessDenied')}
          </h2>
          <p style={{ color: '#cccccc', fontSize: '16px' }}>
            {t('admin.claims.accessDeniedMessage')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      padding: '30px',
      color: 'white'
    }}>
      {/* Breadcrumb Navigation */}
      <AdminBreadcrumb
        currentSection={t('admin.claims.title')}
        onBackToDashboard={() => onTabChange('overview')}
        icon="🔗"
      />

      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '900',
          margin: '0 0 10px 0',
          background: 'linear-gradient(45deg, #C19A6B, #FFD700)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 20px rgba(193, 154, 107,0.5)',
          fontFamily: '"Orbitron", monospace'
        }}>
          🔗 {t('admin.claims.title')}
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#cccccc',
          margin: 0
        }}>
          {t('admin.claims.subtitle')}
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        overflowX: 'auto'
      }}>
        {[
          { key: 'pending', label: t('admin.claims.filterPending'), icon: '⏳' },
          { key: 'approved', label: t('admin.claims.filterApproved'), icon: '✅' },
          { key: 'rejected', label: t('admin.claims.filterRejected'), icon: '❌' },
          { key: 'all', label: t('admin.claims.filterAll'), icon: '📋' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              border: filter === tab.key ? '2px solid #00E5FF' : '2px solid rgba(0,229,255,0.3)',
              background: filter === tab.key
                ? 'linear-gradient(45deg, rgba(0,229,255,0.2), rgba(255,215,0,0.1))'
                : 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,0,0,0.3))',
              color: filter === tab.key ? '#00E5FF' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '14px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Claims List */}
      {isLoading ? (
        <LoadingFallback message={t('admin.claims.loadingClaims')} variant="inline" />
      ) : claims.length === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,0,0,0.3))',
          borderRadius: '20px',
          border: '2px solid rgba(0,229,255,0.3)',
          padding: '40px',
          textAlign: 'center'
        }}>
          <h3 style={{
            color: '#00E5FF',
            fontSize: '20px',
            fontWeight: 'bold',
            margin: '0 0 10px 0'
          }}>
            📭 {t('admin.claims.noClaimsFound')}
          </h3>
          <p style={{
            color: '#cccccc',
            fontSize: '16px'
          }}>
            {t('admin.claims.noClaimsMatch')}
          </p>
        </div>
      ) : (
        <div className="grid-enhanced-nightlife">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="employee-card-nightlife"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                cursor: claim.status === 'pending' ? 'default' : 'pointer'
              }}
            >
              {/* Status Badge - Absolute Position Top Right */}
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                padding: '4px 10px',
                borderRadius: '12px',
                background: `${getStatusColor(claim.status)}20`,
                border: `1px solid ${getStatusColor(claim.status)}`,
                color: getStatusColor(claim.status),
                fontSize: '10px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                zIndex: 10
              }}>
                {getStatusIcon(claim.status)} {claim.status.toUpperCase()}
              </div>

              {/* Content Area - Flex 1 to push buttons to bottom */}
              <div style={{ flex: 1, paddingTop: '10px' }}>
                {/* Claimant and Employee Info - Compact Layout */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                  {/* User Avatar */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #00E5FF, #00A8CC)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    flexShrink: 0
                  }}>
                    {claim.submitted_by_user?.pseudonym?.charAt(0).toUpperCase() || '?'}
                  </div>

                  {/* Arrow */}
                  <div style={{ color: '#FFD700', fontSize: '20px', fontWeight: 'bold' }}>
                    →
                  </div>

                  {/* Employee Photo */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '2px solid #C19A6B',
                    flexShrink: 0
                  }}>
                    {claim.employee?.photos && claim.employee.photos[0] ? (
                      <LazyImage
                        src={claim.employee.photos[0]}
                        alt={claim.employee.name}
                        objectFit="cover"
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(45deg, #C19A6B, #FFD700)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '20px'
                      }}>
                        {claim.employee?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                </div>

                {/* User and Employee Names */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{
                    color: '#00E5FF',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '2px'
                  }}>
                    👤 {claim.submitted_by_user?.pseudonym || t('admin.claims.unknownUser')}
                  </div>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    💃 {claim.employee?.name || t('admin.claims.unknownEmployee')}
                    {claim.employee?.nickname && (
                      <span style={{ color: '#FFD700', fontSize: '12px', marginLeft: '5px' }}>
                        "{claim.employee.nickname}"
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Preview - Truncated */}
                <div style={{
                  color: '#cccccc',
                  fontSize: '12px',
                  lineHeight: '1.4',
                  marginBottom: '12px',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  💬 {claim.request_metadata?.message || t('admin.claims.noMessage')}
                </div>

                {/* Verification Proofs - Thumbnails (max 3 visible) */}
                {claim.verification_proof && claim.verification_proof.length > 0 && (
                  <div style={{
                    display: 'flex',
                    gap: '5px',
                    marginBottom: '12px'
                  }}>
                    {claim.verification_proof.slice(0, 3).map((url, index) => (
                      <div
                        key={index}
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid rgba(193, 154, 107,0.3)',
                          background: 'rgba(0,0,0,0.3)',
                          flexShrink: 0
                        }}
                      >
                        {isImageUrl(url) ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <LazyImage
                              src={url}
                              alt={`Proof ${index + 1}`}
                              objectFit="cover"
                              style={{ width: '100%', height: '100%' }}
                            />
                          </a>
                        ) : (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#00E5FF',
                              fontSize: '20px',
                              textDecoration: 'none'
                            }}
                          >
                            🔗
                          </a>
                        )}
                      </div>
                    ))}
                    {claim.verification_proof.length > 3 && (
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '6px',
                        background: 'rgba(193, 154, 107,0.2)',
                        border: '1px solid rgba(193, 154, 107,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#C19A6B',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        +{claim.verification_proof.length - 3}
                      </div>
                    )}
                  </div>
                )}

                {/* Submission Date */}
                <div style={{
                  color: '#888888',
                  fontSize: '11px',
                  marginBottom: '12px'
                }}>
                  📅 {formatDate(claim.created_at)}
                </div>

                {/* Moderator Review Info (if reviewed) - Compact */}
                {claim.reviewed_at && (
                  <div style={{
                    padding: '8px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '11px',
                    color: '#cccccc',
                    marginBottom: '12px'
                  }}>
                    ✅ {claim.moderator_user?.pseudonym || 'Admin'}
                  </div>
                )}
              </div>

              {/* Action Buttons - Anchored at Bottom */}
              <div style={{
                marginTop: 'auto',
                padding: '15px 0 0 0'
              }}>
                {claim.status === 'pending' ? (
                  <>
                    {/* Approve and Reject Buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(claim.id);
                        }}
                        disabled={processingIds.has(claim.id)}
                        style={{
                          flex: 1,
                          padding: '10px 8px',
                          background: processingIds.has(claim.id)
                            ? 'linear-gradient(45deg, #666666, #888888)'
                            : 'linear-gradient(45deg, #00FF7F, #00CC65)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: processingIds.has(claim.id) ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          transition: 'all 0.3s ease',
                          opacity: processingIds.has(claim.id) ? 0.7 : 1
                        }}
                      >
                        {processingIds.has(claim.id) ? '⏳' : `✅ ${t('admin.claims.buttonApprove')}`}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectClick(claim.id);
                        }}
                        disabled={processingIds.has(claim.id)}
                        style={{
                          flex: 1,
                          padding: '10px 8px',
                          background: processingIds.has(claim.id)
                            ? 'linear-gradient(45deg, #666666, #888888)'
                            : 'linear-gradient(45deg, #FF4757, #FF3742)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: processingIds.has(claim.id) ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          transition: 'all 0.3s ease',
                          opacity: processingIds.has(claim.id) ? 0.7 : 1
                        }}
                      >
                        {processingIds.has(claim.id) ? '⏳' : `❌ ${t('admin.claims.buttonReject')}`}
                      </button>
                    </div>

                    {/* View Details Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClaim(claim);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 8px',
                        background: 'linear-gradient(45deg, #00E5FF, #0080FF)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      👁️ {t('admin.claims.buttonDetails')}
                    </button>
                  </>
                ) : (
                  /* View Details Only for non-pending claims */
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClaim(claim);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 8px',
                      background: 'linear-gradient(45deg, #00E5FF, #0080FF)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    👁️ {t('admin.claims.buttonViewDetails')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backdropFilter: 'blur(10px)'
        }} role="dialog" aria-modal="true">
          <div style={{
            background: 'linear-gradient(135deg, rgba(26,0,51,0.95), rgba(13,0,25,0.95))',
            borderRadius: '25px',
            border: '2px solid #FF4757',
            boxShadow: '0 20px 60px rgba(255,71,87,0.3)',
            maxWidth: '500px',
            width: '100%',
            position: 'relative',
            padding: '30px'
          }}>
            {/* Close Button */}
            <button
              onClick={() => {
                setRejectModalOpen(false);
                setClaimToReject(null);
                setRejectReason('');
              }}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255,71,87,0.2)',
                border: '2px solid #FF4757',
                color: '#FF4757',
                fontSize: '20px',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              ×
            </button>

            <h2 style={{
              color: '#FF4757',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: '0 0 20px 0'
            }}>
              ❌ {t('admin.claims.rejectModalTitle')}
            </h2>

            <p style={{
              color: '#cccccc',
              fontSize: '15px',
              marginBottom: '20px',
              lineHeight: '1.6'
            }}>
              {t('admin.claims.rejectModalMessage')}
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('admin.claims.rejectModalPlaceholder')}
              rows={6}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0,0,0,0.4)',
                border: '2px solid rgba(255,71,87,0.3)',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '14px',
                resize: 'vertical',
                marginBottom: '20px'
              }}
            />

            <div style={{
              fontSize: '12px',
              color: rejectReason.length >= 10 ? '#00FF7F' : '#cccccc',
              marginBottom: '20px'
            }}>
              {t('admin.claims.rejectModalCharCount', { count: rejectReason.length })}
            </div>

            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setRejectModalOpen(false);
                  setClaimToReject(null);
                  setRejectReason('');
                }}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: 'transparent',
                  border: '2px solid #cccccc',
                  color: '#cccccc',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
              >
                {t('admin.claims.rejectModalCancel')}
              </button>

              <button
                onClick={handleRejectConfirm}
                disabled={rejectReason.trim().length < 10}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: rejectReason.trim().length < 10
                    ? 'rgba(255,71,87,0.3)'
                    : 'linear-gradient(45deg, #FF4757, #FF3742)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '12px',
                  cursor: rejectReason.trim().length < 10 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  opacity: rejectReason.trim().length < 10 ? 0.5 : 1
                }}
              >
                {t('admin.claims.rejectModalConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedClaim && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backdropFilter: 'blur(10px)',
          overflowY: 'auto'
        }} role="dialog" aria-modal="true">
          <div style={{
            background: 'linear-gradient(135deg, rgba(26,0,51,0.95), rgba(13,0,25,0.95))',
            borderRadius: '25px',
            border: '2px solid #00E5FF',
            boxShadow: '0 20px 60px rgba(0,229,255,0.3)',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            padding: '30px'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedClaim(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(0,229,255,0.2)',
                border: '2px solid #00E5FF',
                color: '#00E5FF',
                fontSize: '20px',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              ×
            </button>

            <h2 style={{
              color: '#00E5FF',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: '0 0 20px 0'
            }}>
              {t('admin.claims.detailModalTitle')}
            </h2>

            {/* Full claim details */}
            <div style={{ color: 'white' }}>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#00E5FF' }}>{t('admin.claims.detailClaimId')}</strong> {selectedClaim.id}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#00E5FF' }}>{t('admin.claims.detailStatus')}</strong>{' '}
                <span style={{ color: getStatusColor(selectedClaim.status) }}>
                  {getStatusIcon(selectedClaim.status)} {selectedClaim.status.toUpperCase()}
                </span>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#00E5FF' }}>{t('admin.claims.detailClaimant')}</strong> {selectedClaim.submitted_by_user?.pseudonym} ({selectedClaim.submitted_by_user?.email})
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#00E5FF' }}>{t('admin.claims.detailEmployee')}</strong> {selectedClaim.employee?.name}
                {selectedClaim.employee?.nickname && ` "${selectedClaim.employee.nickname}"`}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#00E5FF' }}>{t('admin.claims.detailSubmitted')}</strong> {formatDate(selectedClaim.created_at)}
              </div>
              {selectedClaim.reviewed_at && (
                <div style={{ marginBottom: '20px' }}>
                  <strong style={{ color: '#00E5FF' }}>{t('admin.claims.detailReviewed')}</strong> {formatDate(selectedClaim.reviewed_at)} {t('admin.claims.detailReviewedBy')} {selectedClaim.moderator_user?.pseudonym}
                </div>
              )}
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#00E5FF' }}>{t('admin.claims.detailMessage')}</strong>
                <div style={{
                  marginTop: '10px',
                  padding: '15px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '10px',
                  lineHeight: '1.6'
                }}>
                  {selectedClaim.request_metadata?.message || t('admin.claims.noMessage')}
                </div>
              </div>
              {selectedClaim.verification_proof && selectedClaim.verification_proof.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <strong style={{ color: '#00E5FF' }}>{t('admin.claims.detailVerificationProofs')}</strong>
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedClaim.verification_proof.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#C19A6B',
                          textDecoration: 'none',
                          padding: '8px',
                          background: 'rgba(193, 154, 107,0.1)',
                          borderRadius: '8px',
                          wordBreak: 'break-all'
                        }}
                      >
                        🔗 {t('admin.claims.detailProofLabel', { index: index + 1 })} {url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {selectedClaim.moderator_notes && (
                <div style={{ marginBottom: '20px' }}>
                  <strong style={{ color: '#00E5FF' }}>{t('admin.claims.detailModeratorNotes')}</strong>
                  <div style={{
                    marginTop: '10px',
                    padding: '15px',
                    background: 'rgba(255,71,87,0.1)',
                    border: '1px solid #FF4757',
                    borderRadius: '10px',
                    lineHeight: '1.6',
                    color: '#FF4757'
                  }}>
                    {selectedClaim.moderator_notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeClaimsAdmin;
