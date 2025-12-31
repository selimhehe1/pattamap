import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, Link, Loader2, CheckCircle, XCircle, ClipboardList, MailX, User, PersonStanding, MessageSquare, Calendar, Eye, HelpCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
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
  const { secureFetch } = useSecureFetch();
  const [claims, setClaims] = useState<EmployeeClaimRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [selectedClaim, setSelectedClaim] = useState<EmployeeClaimRequest | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [claimToReject, setClaimToReject] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Phase 3: Bulk actions state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Helper function to trigger refresh
  const refreshClaims = () => {
    setRefreshCounter(c => c + 1);
    setSelectedIds(new Set()); // Clear selection on refresh
  };

  useEffect(() => {
    const loadClaims = async () => {
      setIsLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const statusParam = filter === 'all' ? '' : `?status=${filter}`;

        const response = await secureFetch(`${API_URL}/api/employees/claims${statusParam}`);

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
    loadClaims();
  }, [filter, secureFetch, t, refreshCounter]);

  const handleApprove = async (claimId: string) => {
    setProcessingIds(prev => new Set(prev).add(claimId));
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await secureFetch(`${API_URL}/api/employees/claims/${claimId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ moderator_notes: 'Claim approved' })
      });

      if (response.ok) {
        toast.success(t('admin.claims.successApproved'));
        refreshClaims(); // Reload list
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
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await secureFetch(`${API_URL}/api/employees/claims/${claimToReject}/reject`, {
        method: 'POST',
        body: JSON.stringify({ moderator_notes: rejectReason.trim() })
      });

      if (response.ok) {
        toast.success(t('admin.claims.successRejected'));
        setRejectModalOpen(false);
        setClaimToReject(null);
        setRejectReason('');
        refreshClaims(); // Reload list
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

  // Phase 3: Bulk action handlers
  const toggleSelect = (claimId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(claimId)) {
        newSet.delete(claimId);
      } else {
        newSet.add(claimId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const pendingClaims = claims.filter(c => c.status === 'pending');
    if (selectedIds.size === pendingClaims.length && pendingClaims.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingClaims.map(c => c.id)));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const promises = Array.from(selectedIds).map(id =>
        secureFetch(`${API_URL}/api/employees/claims/${id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ moderator_notes: 'Bulk approved by admin' })
        })
      );
      await Promise.all(promises);
      toast.success(t('admin.claims.bulkApproveSuccess', { count: selectedIds.size }));
      refreshClaims();
    } catch (error) {
      logger.error('Bulk approve failed:', error);
      toast.error(t('admin.claims.bulkApproveFailed'));
    } finally {
      setIsBulkProcessing(false);
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

  const getStatusIcon = (status: string): React.ReactNode => {
    switch (status) {
      case 'pending': return <Loader2 size={12} style={{ verticalAlign: 'middle' }} />;
      case 'approved': return <CheckCircle size={12} style={{ verticalAlign: 'middle' }} />;
      case 'rejected': return <XCircle size={12} style={{ verticalAlign: 'middle' }} />;
      default: return <HelpCircle size={12} style={{ verticalAlign: 'middle' }} />;
    }
  };

  const isImageUrl = (url: string): boolean => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  if (!user || !['admin', 'moderator'].includes(user.role)) {
    return (
      <div className="command-content-section" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="cmd-card cmd-card--alert" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h2 className="cmd-card__title" style={{ color: 'var(--color-gold)' }}>
            <Ban size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />{t('admin.claims.accessDenied')}
          </h2>
          <p className="cmd-card__description">
            {t('admin.claims.accessDeniedMessage')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="command-content-section">
      {/* Breadcrumb Navigation */}
      <AdminBreadcrumb
        currentSection={t('admin.claims.title')}
        onBackToDashboard={() => onTabChange('overview')}
        icon={<Link size={20} style={{ verticalAlign: 'middle' }} />}
      />

      {/* Header */}
      <div className="cmd-section-header">
        <h1 className="cmd-section-title">
          <Link size={28} style={{ marginRight: '8px', verticalAlign: 'middle' }} />{t('admin.claims.title')}
        </h1>
        <p className="cmd-section-subtitle">
          {t('admin.claims.subtitle')}
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="cmd-filters" style={{ marginBottom: '24px' }}>
        <div className="cmd-filter-pills">
          {[
            { key: 'pending', label: t('admin.claims.filterPending'), icon: <Loader2 size={14} /> },
            { key: 'approved', label: t('admin.claims.filterApproved'), icon: <CheckCircle size={14} /> },
            { key: 'rejected', label: t('admin.claims.filterRejected'), icon: <XCircle size={14} /> },
            { key: 'all', label: t('admin.claims.filterAll'), icon: <ClipboardList size={14} /> }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`cmd-filter ${filter === tab.key ? 'cmd-filter--active' : ''}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Bar - Phase 3 */}
      {selectedIds.size > 0 && (
        <div className="cmd-table__bulk-bar">
          <span className="cmd-table__bulk-count">
            {selectedIds.size} {t('admin.claims.itemsSelected', 'claim(s) selected')}
          </span>
          <button
            onClick={handleBulkApprove}
            disabled={isBulkProcessing}
            className="cmd-table__bulk-action cmd-table__bulk-action--success"
          >
            {isBulkProcessing ? '...' : <><CheckCircle size={14} />{t('admin.claims.approveAll', 'Approve All')}</>}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="cmd-table__bulk-action cmd-table__bulk-action--secondary"
          >
            {t('admin.claims.clearSelection', 'Clear')}
          </button>
        </div>
      )}

      {/* Select All Header - Phase 3 */}
      {!isLoading && claims.filter(c => c.status === 'pending').length > 0 && filter === 'pending' && (
        <div className="cmd-table__select-all">
          <label className="cmd-table__select-label">
            <input
              type="checkbox"
              checked={selectedIds.size === claims.filter(c => c.status === 'pending').length && claims.filter(c => c.status === 'pending').length > 0}
              onChange={toggleSelectAll}
              className="cmd-table__checkbox"
            />
            {t('admin.claims.selectAll', 'Select All Pending')} ({claims.filter(c => c.status === 'pending').length})
          </label>
        </div>
      )}

      {/* Claims List */}
      {isLoading ? (
        <LoadingFallback message={t('admin.claims.loadingClaims')} variant="inline" />
      ) : claims.length === 0 ? (
        <div className="cmd-card cmd-card--empty" style={{ textAlign: 'center', padding: '40px' }}>
          <h3 className="cmd-card__title" style={{ color: 'var(--color-cyan)', marginBottom: '10px' }}>
            <MailX size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />{t('admin.claims.noClaimsFound')}
          </h3>
          <p className="cmd-card__description">
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
                cursor: claim.status === 'pending' ? 'default' : 'pointer',
                border: selectedIds.has(claim.id) ? '2px solid #00E5FF' : undefined,
                background: selectedIds.has(claim.id)
                  ? 'linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(0, 0, 0, 0.3))'
                  : undefined
              }}
            >
              {/* Selection Checkbox - Phase 3 Bulk Actions */}
              {claim.status === 'pending' && (
                <label
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 15
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(claim.id)}
                    onChange={() => toggleSelect(claim.id)}
                    style={{
                      width: '20px',
                      height: '20px',
                      accentColor: '#00E5FF',
                      cursor: 'pointer'
                    }}
                    aria-label={`Select claim by ${claim.submitted_by_user?.pseudonym || 'unknown'}`}
                  />
                </label>
              )}

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
                    <User size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{claim.submitted_by_user?.pseudonym || t('admin.claims.unknownUser')}
                  </div>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    <PersonStanding size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{claim.employee?.name || t('admin.claims.unknownEmployee')}
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
                  <MessageSquare size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{claim.request_metadata?.message || t('admin.claims.noMessage')}
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
                        key={url}
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
                            <Link size={20} />
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
                  <Calendar size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{formatDate(claim.created_at)}
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
                    <CheckCircle size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{claim.moderator_user?.pseudonym || 'Admin'}
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
                        {processingIds.has(claim.id) ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.claims.buttonApprove')}</>}
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
                        {processingIds.has(claim.id) ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><XCircle size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.claims.buttonReject')}</>}
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
                      <Eye size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.claims.buttonDetails')}
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
                    <Eye size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.claims.buttonViewDetails')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalOpen && (
        <div className="cmd-modal-overlay" role="dialog" aria-modal="true">
          <div className="cmd-modal cmd-modal--danger" style={{ maxWidth: '500px' }}>
            {/* Close Button */}
            <button
              onClick={() => {
                setRejectModalOpen(false);
                setClaimToReject(null);
                setRejectReason('');
              }}
              className="cmd-modal__close"
            >
              ×
            </button>

            <h2 className="cmd-modal__title" style={{ color: 'var(--color-danger, #FF4757)' }}>
              <XCircle size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />{t('admin.claims.rejectModalTitle')}
            </h2>

            <p className="cmd-modal__description">
              {t('admin.claims.rejectModalMessage')}
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('admin.claims.rejectModalPlaceholder')}
              rows={6}
              className="cmd-form__textarea"
              style={{ marginBottom: '16px' }}
            />

            <div className="cmd-form__hint" style={{ color: rejectReason.length >= 10 ? 'var(--color-success, #00FF7F)' : undefined }}>
              {t('admin.claims.rejectModalCharCount', { count: rejectReason.length })}
            </div>

            <div className="cmd-modal__actions">
              <button
                onClick={() => {
                  setRejectModalOpen(false);
                  setClaimToReject(null);
                  setRejectReason('');
                }}
                className="cmd-modal__btn cmd-modal__btn--secondary"
              >
                {t('admin.claims.rejectModalCancel')}
              </button>

              <button
                onClick={handleRejectConfirm}
                disabled={rejectReason.trim().length < 10}
                className="cmd-modal__btn cmd-modal__btn--danger"
              >
                {t('admin.claims.rejectModalConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedClaim && (
        <div className="cmd-modal-overlay" role="dialog" aria-modal="true">
          <div className="cmd-modal" style={{ maxWidth: '700px' }}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedClaim(null)}
              className="cmd-modal__close"
            >
              ×
            </button>

            <h2 className="cmd-modal__title">
              {t('admin.claims.detailModalTitle')}
            </h2>

            {/* Full claim details */}
            <div className="cmd-modal__body">
              <div className="cmd-modal__field">
                <strong className="cmd-modal__label">{t('admin.claims.detailClaimId')}</strong>
                <span className="cmd-modal__value">{selectedClaim.id}</span>
              </div>
              <div className="cmd-modal__field">
                <strong className="cmd-modal__label">{t('admin.claims.detailStatus')}</strong>
                <span className="cmd-card__status" data-status={selectedClaim.status}>
                  {getStatusIcon(selectedClaim.status)} {selectedClaim.status.toUpperCase()}
                </span>
              </div>
              <div className="cmd-modal__field">
                <strong className="cmd-modal__label">{t('admin.claims.detailClaimant')}</strong>
                <span className="cmd-modal__value">{selectedClaim.submitted_by_user?.pseudonym} ({selectedClaim.submitted_by_user?.email})</span>
              </div>
              <div className="cmd-modal__field">
                <strong className="cmd-modal__label">{t('admin.claims.detailEmployee')}</strong>
                <span className="cmd-modal__value">
                  {selectedClaim.employee?.name}
                  {selectedClaim.employee?.nickname && ` "${selectedClaim.employee.nickname}"`}
                </span>
              </div>
              <div className="cmd-modal__field">
                <strong className="cmd-modal__label">{t('admin.claims.detailSubmitted')}</strong>
                <span className="cmd-modal__value">{formatDate(selectedClaim.created_at)}</span>
              </div>
              {selectedClaim.reviewed_at && (
                <div className="cmd-modal__field">
                  <strong className="cmd-modal__label">{t('admin.claims.detailReviewed')}</strong>
                  <span className="cmd-modal__value">{formatDate(selectedClaim.reviewed_at)} {t('admin.claims.detailReviewedBy')} {selectedClaim.moderator_user?.pseudonym}</span>
                </div>
              )}
              <div className="cmd-modal__field">
                <strong className="cmd-modal__label">{t('admin.claims.detailMessage')}</strong>
                <div className="cmd-modal__content-box">
                  {selectedClaim.request_metadata?.message || t('admin.claims.noMessage')}
                </div>
              </div>
              {selectedClaim.verification_proof && selectedClaim.verification_proof.length > 0 && (
                <div className="cmd-modal__field">
                  <strong className="cmd-modal__label">{t('admin.claims.detailVerificationProofs')}</strong>
                  <div className="cmd-modal__links">
                    {selectedClaim.verification_proof.map((url, index) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cmd-modal__link"
                      >
                        <Link size={14} />{t('admin.claims.detailProofLabel', { index: index + 1 })} {url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {selectedClaim.moderator_notes && (
                <div className="cmd-modal__field">
                  <strong className="cmd-modal__label">{t('admin.claims.detailModeratorNotes')}</strong>
                  <div className="cmd-modal__content-box cmd-modal__content-box--danger">
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
