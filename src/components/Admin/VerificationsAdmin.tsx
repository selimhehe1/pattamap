import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useSecureFetch from '../../hooks/useSecureFetch';
import { useModal } from '../../contexts/ModalContext';
import { GirlProfile } from '../../routes/lazyComponents';
import AdminBreadcrumb from '../Common/AdminBreadcrumb';
import LoadingFallback from '../Common/LoadingFallback';
import LazyImage from '../Common/LazyImage';
import toast from '../../utils/toast';
import { logger } from '../../utils/logger';
import '../../styles/admin/verifications-admin.css';

/**
 * VerificationsAdmin Component (v10.2 - Nightlife Styled)
 * Full-page admin interface for managing employee profile verifications
 * Features:
 * - Nightlife-themed UI with gradients (#C19A6B, #FFD700, #00E5FF)
 * - Filter tabs (All, Pending, Approved, Rejected, Revoked)
 * - Stats mini-cards showing counts
 * - Grouped verifications by employee (prevent duplicate display)
 * - Timeline modal showing verification history
 * - Approve/Reject actions for manual review queue
 * - Revoke verification functionality
 */

interface RecentVerification {
  id: string;
  employee_id: string;
  selfie_url: string;
  face_match_score: number;
  status: 'pending' | 'approved' | 'rejected' | 'revoked' | 'manual_review';
  submitted_at: string;
  auto_approved: boolean;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  employee: {
    id: string;
    name: string;
    photos: string[];
  };
}

interface VerificationGroup {
  employee: {
    id: string;
    name: string;
    photos: string[];
  };
  verifications: RecentVerification[];
  latestStatus: string;
  totalAttempts: number;
  approvedCount: number;
  rejectedCount: number;
}

interface VerificationsAdminProps {
  onTabChange: (tab: string) => void;
}

type FilterType = 'all' | 'manual_review' | 'approved' | 'rejected';

const VerificationsAdmin: React.FC<VerificationsAdminProps> = ({ onTabChange }) => {
  const { t } = useTranslation();
  const { secureFetch } = useSecureFetch();
  const { openModal, closeModal } = useModal();

  // State
  const [verifications, setVerifications] = useState<RecentVerification[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<VerificationGroup | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<{ employeeId: string; employeeName: string } | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  // Fetch verifications
  // 🔧 FIX: Always fetch ALL verifications (no status filter) to prevent employees appearing in multiple categories
  // Frontend will filter by latest status only
  const fetchVerifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      // Don't filter by status at API level - fetch all verifications
      const url = `${API_URL}/api/verifications?limit=200`; // Increased limit to get more history
      const response = await secureFetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch verifications');
      }

      const data = await response.json();
      setVerifications(data.verifications || []);
    } catch (error) {
      logger.error('Error fetching verifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []); // 🔧 FIX: No dependencies - always fetch all verifications

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  // Group verifications by employee
  const groupedVerifications = React.useMemo(() => {
    const groups = new Map<string, VerificationGroup>();

    verifications.forEach(verification => {
      const employeeId = verification.employee_id;

      if (!groups.has(employeeId)) {
        groups.set(employeeId, {
          employee: verification.employee,
          verifications: [],
          latestStatus: verification.status,
          totalAttempts: 0,
          approvedCount: 0,
          rejectedCount: 0
        });
      }

      const group = groups.get(employeeId)!;
      group.verifications.push(verification);
      group.totalAttempts++;

      if (verification.status === 'approved') {
        group.approvedCount++;
      } else if (verification.status === 'rejected') {
        group.rejectedCount++;
      }

      // Update latest status (verifications are sorted by submitted_at desc)
      if (group.verifications.length === 1) {
        group.latestStatus = verification.status;
      }
    });

    // Sort verifications within each group by submitted_at desc
    groups.forEach(group => {
      group.verifications.sort((a, b) =>
        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      );
    });

    const groupsArray = Array.from(groups.values());

    // 🔧 Filter by latest status only (prevents employees from appearing in multiple categories)
    if (filter !== 'all') {
      return groupsArray.filter(group => {
        const latestStatus = group.verifications[0].status;
        return latestStatus === filter;
      });
    }

    return groupsArray;
  }, [verifications, filter]); // 🔧 ADD filter dependency

  // Stats calculation
  // 🔧 Calculate stats based on unique employees with their latest status
  const stats = React.useMemo(() => {
    // Group by employee to get latest status for each
    const employeeLatestStatus = new Map<string, RecentVerification>();

    verifications.forEach(verification => {
      const existing = employeeLatestStatus.get(verification.employee_id);
      // Keep the latest verification (most recent submitted_at)
      if (!existing || new Date(verification.submitted_at) > new Date(existing.submitted_at)) {
        employeeLatestStatus.set(verification.employee_id, verification);
      }
    });

    const latestVerifications = Array.from(employeeLatestStatus.values());

    return {
      total: latestVerifications.length, // Unique employees
      manualReview: latestVerifications.filter(v => v.status === 'manual_review').length,
      approved: latestVerifications.filter(v => v.status === 'approved').length,
      rejected: latestVerifications.filter(v => v.status === 'rejected').length
    };
  }, [verifications]);

  // Review verification (approve/reject)
  const handleReview = async (verificationId: string, action: 'approve' | 'reject', adminNotes?: string) => {
    try {
      setProcessingIds(prev => new Set(prev).add(verificationId));
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

      const response = await secureFetch(`${API_URL}/api/verifications/${verificationId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, admin_notes: adminNotes || undefined })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} verification`);
      }

      // Refresh data
      await fetchVerifications();
      toast.success(t(`admin.verification${action === 'approve' ? 'Approved' : 'Rejected'}`, `Verification ${action}d successfully`));
    } catch (error) {
      logger.error(`Error ${action}ing verification:`, error);
      toast.error(t('admin.verificationError', `Failed to ${action} verification`, { action }));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(verificationId);
        return newSet;
      });
    }
  };

  // Revoke verification
  const handleRevoke = async () => {
    if (!revokeTarget || !revokeReason.trim()) {
      toast.warning(t('admin.pleaseProvideReason', 'Please provide a reason for revocation'));
      return;
    }

    if (revokeReason.trim().length < 10) {
      toast.warning(t('admin.reasonMinLength', 'Reason must be at least 10 characters'));
      return;
    }

    try {
      setProcessingIds(prev => new Set(prev).add(revokeTarget.employeeId));
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

      const response = await secureFetch(`${API_URL}/api/verifications/employees/${revokeTarget.employeeId}/verification`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: revokeReason })
      });

      if (!response.ok) {
        throw new Error('Failed to revoke verification');
      }

      // Refresh data
      await fetchVerifications();
      setRevokeModalOpen(false);
      setRevokeTarget(null);
      setRevokeReason('');
      toast.success(t('admin.verificationRejected', 'Verification rejected successfully'));
    } catch (error) {
      logger.error('Error rejecting verification:', error);
      toast.error(t('admin.failedRejectVerification', 'Failed to reject verification'));
    } finally {
      if (revokeTarget) {
        setProcessingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(revokeTarget.employeeId);
          return newSet;
        });
      }
    }
  };

  // Open timeline modal
  const handleViewTimeline = (group: VerificationGroup) => {
    setSelectedGroup(group);
  };

  // Open revoke modal
  const handleOpenRevoke = (employeeId: string, employeeName: string) => {
    setRevokeTarget({ employeeId, employeeName });
    setRevokeReason('');
    setRevokeModalOpen(true);
  };

  // Open employee profile modal
  const handleViewProfile = async (group: VerificationGroup) => {
    try {
      // Fetch full employee data with all fields
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const response = await secureFetch(`${API_URL}/api/employees/${group.employee.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch employee details');
      }

      const data = await response.json();
      const employeeData = data.employee;

      // Open modal with employee data
      openModal('girl-profile', GirlProfile, {
        girl: employeeData,
        onClose: () => closeModal('girl-profile')
      }, {
        size: 'fullscreen',
        closeOnOverlayClick: true,
        showCloseButton: false
      });
    } catch (error) {
      logger.error('Error loading employee profile:', error);
      toast.error(t('admin.failedLoadProfile', 'Failed to load employee profile'));
    }
  };

  // Status badge helper with colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#00FF88';
      case 'rejected': return '#FF4757';
      case 'pending': return '#FFD700';
      case 'manual_review': return '#FFA500';
      case 'revoked': return '#999999';
      default: return '#cccccc';
    }
  };

  const getStatusIcon = (status: string, autoApproved?: boolean) => {
    switch (status) {
      case 'approved': return autoApproved ? '🤖' : '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      case 'manual_review': return '👁️';
      case 'revoked': return '🚫';
      default: return '❓';
    }
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return <LoadingFallback message="Loading verifications..." variant="inline" />;
  }

  return (
    <div className="bg-nightlife-gradient-main" style={{
      minHeight: '100vh',
      padding: '30px',
      color: 'white'
    }}>
      {/* Breadcrumb */}
      <AdminBreadcrumb
        currentSection="Profile Verifications"
        onBackToDashboard={() => onTabChange('overview')}
        icon="✅"
      />

      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '900',
          margin: '0 0 10px 0',
          background: 'linear-gradient(45deg, #00FF88, #00E5FF)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 20px rgba(0,255,136,0.5)',
          fontFamily: '"Orbitron", monospace'
        }}>
          ✅ Profile Verifications
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#cccccc',
          margin: 0
        }}>
          Manage employee verification requests and review authenticity
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
          { key: 'all', label: 'All', icon: '📋', count: stats.total },
          { key: 'manual_review', label: 'Manual Review', icon: '👁️', count: stats.manualReview },
          { key: 'approved', label: 'Approved', icon: '✅', count: stats.approved },
          { key: 'rejected', label: 'Rejected', icon: '❌', count: stats.rejected }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as FilterType)}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              border: filter === tab.key ? '2px solid #00E5FF' : '2px solid rgba(0,229,255,0.3)',
              background: filter === tab.key
                ? 'linear-gradient(45deg, rgba(0,229,255,0.2), rgba(0,255,136,0.1))'
                : 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,0,0,0.3))',
              color: filter === tab.key ? '#00E5FF' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '14px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.icon} {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '30px'
      }}>
        {[
          { label: 'Total Employees', value: stats.total, icon: '📊', gradient: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,229,255,0.05))', border: 'rgba(0,229,255,0.3)' },
          { label: 'Manual Review', value: stats.manualReview, icon: '👁️', gradient: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,215,0,0.05))', border: 'rgba(255,215,0,0.3)' },
          { label: 'Approved', value: stats.approved, icon: '✅', gradient: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,255,136,0.05))', border: 'rgba(0,255,136,0.3)' },
          { label: 'Rejected', value: stats.rejected, icon: '❌', gradient: 'linear-gradient(135deg, rgba(255,71,87,0.1), rgba(255,71,87,0.05))', border: 'rgba(255,71,87,0.3)' }
        ].map((stat, index) => (
          <div
            key={index}
            style={{
              background: stat.gradient,
              border: `1px solid ${stat.border}`,
              borderRadius: '10px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <span style={{ fontSize: '28px' }}>{stat.icon}</span>
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.border.replace('0.3', '1'), fontFamily: '"Orbitron", monospace' }}>
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Verifications Grid */}
      {groupedVerifications.length === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,0,0,0.3))',
          borderRadius: '20px',
          border: '2px solid rgba(0,229,255,0.3)',
          padding: '60px 40px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📭</div>
          <h3 style={{
            color: '#00E5FF',
            fontSize: '22px',
            fontWeight: 'bold',
            margin: '0 0 12px 0'
          }}>
            No verifications found
          </h3>
          <p style={{
            color: '#cccccc',
            fontSize: '16px',
            margin: 0
          }}>
            No verifications match the selected filter
          </p>
        </div>
      ) : (
        <div className="grid-enhanced-nightlife">
          {groupedVerifications.map(group => {
            const latestVerification = group.verifications[0];
            const isProcessing = processingIds.has(latestVerification.id) || processingIds.has(group.employee.id);
            const profilePhoto = (group.employee.photos?.[0] && group.employee.photos[0].trim()) || '/images/placeholder-employee.jpg';
            const selfieUrl = (latestVerification.selfie_url && latestVerification.selfie_url.trim()) || '/images/placeholder-employee.jpg';
            const statusColor = getStatusColor(latestVerification.status);

            return (
              <div
                key={group.employee.id}
                className="employee-card-nightlife"
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                }}
              >
                {/* Status Badge - Absolute Position Top Right */}
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: `${statusColor}20`,
                  border: `1px solid ${statusColor}`,
                  color: statusColor,
                  fontSize: '10px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {getStatusIcon(latestVerification.status, latestVerification.auto_approved)}{' '}
                  {latestVerification.status.toUpperCase().replace('_', ' ')}
                  {latestVerification.auto_approved && ' (AUTO)'}
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, paddingTop: '10px' }}>
                  {/* Employee Header */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '15px', alignItems: 'center' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: `3px solid ${statusColor}`,
                      flexShrink: 0
                    }}>
                      <LazyImage
                        src={profilePhoto}
                        alt={group.employee.name}
                        objectFit="cover"
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        color: '#ffffff',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        margin: '0 0 4px 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {group.employee.name}
                      </h3>
                      <div style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '12px'
                      }}>
                        {group.totalAttempts} attempt{group.totalAttempts !== 1 ? 's' : ''}
                        {group.approvedCount > 0 && <span style={{ color: '#00FF88' }}> • {group.approvedCount} ✅</span>}
                        {group.rejectedCount > 0 && <span style={{ color: '#FF4757' }}> • {group.rejectedCount} ❌</span>}
                      </div>
                    </div>
                  </div>

                  {/* Latest Verification Details */}
                  <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '12px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Latest Submission:</span>
                      <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 'bold' }}>{formatDate(latestVerification.submitted_at)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Face Match Score:</span>
                      <span style={{ color: '#00E5FF', fontSize: '12px', fontWeight: 'bold', fontFamily: '"Orbitron", monospace' }}>
                        {latestVerification.face_match_score}%
                      </span>
                    </div>
                    {latestVerification.admin_notes && (
                      <div style={{
                        marginTop: '12px',
                        padding: '8px',
                        background: 'rgba(255,71,87,0.1)',
                        border: '1px solid rgba(255,71,87,0.3)',
                        borderRadius: '6px',
                        color: '#FF4757',
                        fontSize: '11px',
                        lineHeight: '1.4'
                      }}>
                        <strong>Admin Notes:</strong> {latestVerification.admin_notes}
                      </div>
                    )}
                  </div>

                  {/* Selfie Thumbnail */}
                  <div style={{
                    width: '100%',
                    height: '140px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    marginBottom: '12px'
                  }}
                  onClick={() => selfieUrl !== '/images/placeholder-employee.jpg' && window.open(latestVerification.selfie_url, '_blank')}>
                    <LazyImage
                      src={selfieUrl}
                      alt="Verification selfie"
                      objectFit="cover"
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                </div>

                {/* Actions - Anchored at Bottom */}
                <div style={{
                  marginTop: 'auto',
                  padding: '12px 0 0 0',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {/* Manual Review Actions */}
                  {latestVerification.status === 'manual_review' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleReview(latestVerification.id, 'approve')}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          padding: '10px 8px',
                          background: isProcessing
                            ? 'linear-gradient(45deg, #666666, #888888)'
                            : 'linear-gradient(45deg, #00FF7F, #00CC65)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          transition: 'all 0.3s ease',
                          opacity: isProcessing ? 0.7 : 1
                        }}
                      >
                        {isProcessing ? '⏳' : '✅ Approve'}
                      </button>
                      <button
                        onClick={() => handleReview(latestVerification.id, 'reject')}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          padding: '10px 8px',
                          background: isProcessing
                            ? 'linear-gradient(45deg, #666666, #888888)'
                            : 'linear-gradient(45deg, #FF4757, #FF3742)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          transition: 'all 0.3s ease',
                          opacity: isProcessing ? 0.7 : 1
                        }}
                      >
                        {isProcessing ? '⏳' : '❌ Reject'}
                      </button>
                    </div>
                  )}

                  {/* Reject Action for Approved Verifications */}
                  {latestVerification.status === 'approved' && (
                    <button
                      onClick={() => handleOpenRevoke(group.employee.id, group.employee.name)}
                      disabled={isProcessing}
                      style={{
                        width: '100%',
                        padding: '10px 8px',
                        background: isProcessing
                          ? 'linear-gradient(45deg, #666666, #888888)'
                          : 'linear-gradient(45deg, rgba(255,71,87,0.2), rgba(255,107,107,0.2))',
                        border: '1px solid rgba(255,71,87,0.4)',
                        color: '#FF4757',
                        borderRadius: '10px',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease',
                        opacity: isProcessing ? 0.7 : 1
                      }}
                    >
                      {isProcessing ? '⏳' : '❌ Reject Verification'}
                    </button>
                  )}

                  {/* Timeline & Profile Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleViewTimeline(group)}
                      style={{
                        flex: 1,
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
                      📜 Timeline ({group.totalAttempts})
                    </button>
                    <button
                      onClick={() => handleViewProfile(group)}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        background: 'linear-gradient(45deg, rgba(193, 154, 107,0.2), rgba(255,107,141,0.2))',
                        border: '1px solid rgba(193, 154, 107,0.4)',
                        color: '#C19A6B',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      👁️ Profile
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline Modal */}
      {selectedGroup && (
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
          }}
          onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedGroup(null)}
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
              margin: '0 0 8px 0'
            }}>
              Verification Timeline
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '16px',
              marginBottom: '24px'
            }}>
              {selectedGroup.employee.name} - {selectedGroup.totalAttempts} attempt{selectedGroup.totalAttempts !== 1 ? 's' : ''}
            </p>

            {/* Timeline */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              {selectedGroup.verifications.map((verification, index) => {
                const vStatusColor = getStatusColor(verification.status);
                const timelineSelfieUrl = (verification.selfie_url && verification.selfie_url.trim()) || '/images/placeholder-employee.jpg';
                return (
                  <div
                    key={verification.id}
                    style={{
                      background: `linear-gradient(135deg, ${vStatusColor}15, rgba(0,0,0,0.2))`,
                      border: `1px solid ${vStatusColor}40`,
                      borderRadius: '12px',
                      padding: '16px',
                      position: 'relative'
                    }}
                  >
                    {/* Latest Badge */}
                    {index === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: 'rgba(0,229,255,0.2)',
                        border: '1px solid rgba(0,229,255,0.4)',
                        color: '#00E5FF',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Latest
                      </div>
                    )}

                    {/* Header */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        background: `${vStatusColor}20`,
                        border: `1px solid ${vStatusColor}`,
                        color: vStatusColor,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {getStatusIcon(verification.status, verification.auto_approved)}{' '}
                        {verification.status.toUpperCase().replace('_', ' ')}
                      </div>
                      <span style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '11px'
                      }}>
                        {formatDate(verification.submitted_at)}
                      </span>
                    </div>

                    {/* Details */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      marginBottom: '12px',
                      fontSize: '12px'
                    }}>
                      <div>
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Match Score: </span>
                        <span style={{ color: '#00E5FF', fontWeight: 'bold' }}>{verification.face_match_score}%</span>
                      </div>
                      <div>
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Method: </span>
                        <span style={{ color: verification.auto_approved ? '#00FF88' : '#FFD700', fontWeight: 'bold' }}>
                          {verification.auto_approved ? '🤖 Auto' : '👤 Manual'}
                        </span>
                      </div>
                    </div>

                    {/* Admin Notes */}
                    {verification.admin_notes && (
                      <div style={{
                        marginBottom: '12px',
                        padding: '8px',
                        background: 'rgba(255,71,87,0.1)',
                        border: '1px solid rgba(255,71,87,0.3)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: '#FF4757'
                      }}>
                        <strong>Admin Notes:</strong> {verification.admin_notes}
                      </div>
                    )}

                    {/* Selfie Thumbnail */}
                    <div style={{
                      width: '100%',
                      height: '120px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer'
                    }}
                    onClick={() => timelineSelfieUrl !== '/images/placeholder-employee.jpg' && window.open(verification.selfie_url, '_blank')}>
                      <LazyImage
                        src={timelineSelfieUrl}
                        alt="Verification selfie"
                        objectFit="cover"
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Close Button Bottom */}
            <button
              onClick={() => setSelectedGroup(null)}
              style={{
                width: '100%',
                marginTop: '24px',
                padding: '12px 20px',
                background: 'transparent',
                border: '2px solid #00E5FF',
                color: '#00E5FF',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {revokeModalOpen && revokeTarget && (
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
          }}
          onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => {
                setRevokeModalOpen(false);
                setRevokeTarget(null);
                setRevokeReason('');
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
              ❌ Reject Verification
            </h2>

            <p style={{
              color: '#cccccc',
              fontSize: '15px',
              marginBottom: '20px',
              lineHeight: '1.6'
            }}>
              You are about to reject the verification for <strong style={{ color: '#ffffff' }}>{revokeTarget.employeeName}</strong>.
              This will remove their verified badge and create a rejection record.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#FF4757',
                fontSize: '13px',
                fontWeight: 'bold',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Reason for Rejection *
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Explain why this verification is being rejected (e.g., fraudulent identity, misrepresentation, fake selfie, etc.)"
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
                  fontFamily: 'inherit'
                }}
              />
              <div style={{
                fontSize: '12px',
                color: revokeReason.length >= 10 ? '#00FF7F' : '#cccccc',
                marginTop: '8px'
              }}>
                {revokeReason.length} / 10 characters minimum
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setRevokeModalOpen(false);
                  setRevokeTarget(null);
                  setRevokeReason('');
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
                Cancel
              </button>

              <button
                onClick={handleRevoke}
                disabled={revokeReason.trim().length < 10 || processingIds.has(revokeTarget.employeeId)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: revokeReason.trim().length < 10
                    ? 'rgba(255,71,87,0.3)'
                    : 'linear-gradient(45deg, #FF4757, #FF3742)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '12px',
                  cursor: revokeReason.trim().length < 10 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  opacity: revokeReason.trim().length < 10 ? 0.5 : 1
                }}
              >
                {processingIds.has(revokeTarget.employeeId) ? '⏳ Rejecting...' : 'Reject Verification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationsAdmin;
