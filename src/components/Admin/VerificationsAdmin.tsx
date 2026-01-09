import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle,
  XCircle,
  Eye,
  List,
  BarChart3,
  Inbox,
  BadgeCheck
} from 'lucide-react';
import useSecureFetch from '../../hooks/useSecureFetch';
import { useModal } from '../../contexts/ModalContext';
import { GirlProfile } from '../../routes/lazyComponents';
import AdminBreadcrumb from '../Common/AdminBreadcrumb';
import { SkeletonGallery } from '../Common/Skeleton';
import notification from '../../utils/notification';
import { logger } from '../../utils/logger';
import '../../styles/admin/verifications-admin.css';

// Sub-components
import { VerificationCard, TimelineModal, RevokeModal } from './VerificationsAdmin/index';
import type { RecentVerification, VerificationGroup, FilterType } from './VerificationsAdmin/types';

/**
 * VerificationsAdmin Component (v10.3 - Refactored)
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

interface VerificationsAdminProps {
  onTabChange: (tab: string) => void;
}

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

  // Fetch verifications
  const fetchVerifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || '';
      const url = `${API_URL}/api/verifications?limit=200`;
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
  }, [secureFetch]);

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

      if (group.verifications.length === 1) {
        group.latestStatus = verification.status;
      }
    });

    groups.forEach(group => {
      group.verifications.sort((a, b) =>
        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      );
    });

    const groupsArray = Array.from(groups.values());

    if (filter !== 'all') {
      return groupsArray.filter(group => {
        const latestStatus = group.verifications[0].status;
        return latestStatus === filter;
      });
    }

    return groupsArray;
  }, [verifications, filter]);

  // Stats calculation
  const stats = React.useMemo(() => {
    const employeeLatestStatus = new Map<string, RecentVerification>();

    verifications.forEach(verification => {
      const existing = employeeLatestStatus.get(verification.employee_id);
      if (!existing || new Date(verification.submitted_at) > new Date(existing.submitted_at)) {
        employeeLatestStatus.set(verification.employee_id, verification);
      }
    });

    const latestVerifications = Array.from(employeeLatestStatus.values());

    return {
      total: latestVerifications.length,
      manualReview: latestVerifications.filter(v => v.status === 'manual_review').length,
      approved: latestVerifications.filter(v => v.status === 'approved').length,
      rejected: latestVerifications.filter(v => v.status === 'rejected').length
    };
  }, [verifications]);

  // Review verification (approve/reject)
  const handleReview = async (verificationId: string, action: 'approve' | 'reject', adminNotes?: string) => {
    try {
      setProcessingIds(prev => new Set(prev).add(verificationId));
      const API_URL = import.meta.env.VITE_API_URL || '';

      const response = await secureFetch(`${API_URL}/api/verifications/${verificationId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, admin_notes: adminNotes || undefined })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} verification`);
      }

      await fetchVerifications();
      notification.success(t(`admin.verification${action === 'approve' ? 'Approved' : 'Rejected'}`, `Verification ${action}d successfully`));
    } catch (error) {
      logger.error(`Error ${action}ing verification:`, error);
      notification.error(t('admin.verificationError', `Failed to ${action} verification`, { action }));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(verificationId);
        return newSet;
      });
    }
  };

  // Revoke verification
  const handleRevoke = async (reason: string) => {
    if (!revokeTarget) return;

    try {
      setProcessingIds(prev => new Set(prev).add(revokeTarget.employeeId));
      const API_URL = import.meta.env.VITE_API_URL || '';

      const response = await secureFetch(`${API_URL}/api/verifications/employees/${revokeTarget.employeeId}/verification`, {
        method: 'DELETE',
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error('Failed to revoke verification');
      }

      await fetchVerifications();
      setRevokeModalOpen(false);
      setRevokeTarget(null);
      notification.success(t('admin.verificationRejected', 'Verification rejected successfully'));
    } catch (error) {
      logger.error('Error rejecting verification:', error);
      notification.error(t('admin.failedRejectVerification', 'Failed to reject verification'));
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
    setRevokeModalOpen(true);
  };

  // Open employee profile modal
  const handleViewProfile = async (group: VerificationGroup) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await secureFetch(`${API_URL}/api/employees/${group.employee.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch employee details');
      }

      const data = await response.json();
      const employeeData = data.employee;

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
      notification.error(t('admin.failedLoadProfile', 'Failed to load employee profile'));
    }
  };

  if (isLoading) {
    return (
      <div className="command-content-section">
        <AdminBreadcrumb
          currentSection="Profile Verifications"
          onBackToDashboard={() => onTabChange('overview')}
        />
        <SkeletonGallery count={6} variant="employee" />
      </div>
    );
  }

  return (
    <div className="command-content-section">
      {/* Breadcrumb */}
      <AdminBreadcrumb
        currentSection="Profile Verifications"
        onBackToDashboard={() => onTabChange('overview')}
        icon={<BadgeCheck size={18} />}
      />

      {/* Header */}
      <div className="cmd-section-header">
        <h1 className="cmd-section-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BadgeCheck size={32} style={{ color: 'var(--color-success)' }} /> Profile Verifications
        </h1>
        <p className="cmd-section-subtitle">
          Manage employee verification requests and review authenticity
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="cmd-filters" style={{ marginBottom: '24px' }}>
        <div className="cmd-filter-pills">
          {[
            { key: 'all', label: 'All', icon: <List size={14} />, count: stats.total },
            { key: 'manual_review', label: 'Manual Review', icon: <Eye size={14} />, count: stats.manualReview },
            { key: 'approved', label: 'Approved', icon: <CheckCircle size={14} />, count: stats.approved },
            { key: 'rejected', label: 'Rejected', icon: <XCircle size={14} />, count: stats.rejected }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as FilterType)}
              className={`cmd-filter ${filter === tab.key ? 'cmd-filter--active' : ''}`}
            >
              {tab.icon}
              <span>{tab.label} ({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '30px'
      }}>
        {[
          { label: 'Total Employees', value: stats.total, icon: <BarChart3 size={28} />, gradient: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,229,255,0.05))', border: 'rgba(0,229,255,0.3)' },
          { label: 'Manual Review', value: stats.manualReview, icon: <Eye size={28} />, gradient: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,215,0,0.05))', border: 'rgba(255,215,0,0.3)' },
          { label: 'Approved', value: stats.approved, icon: <CheckCircle size={28} />, gradient: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,255,136,0.05))', border: 'rgba(0,255,136,0.3)' },
          { label: 'Rejected', value: stats.rejected, icon: <XCircle size={28} />, gradient: 'linear-gradient(135deg, rgba(255,71,87,0.1), rgba(255,71,87,0.05))', border: 'rgba(255,71,87,0.3)' }
        ].map((stat) => (
          <div
            key={stat.label}
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
            <span style={{ color: stat.border.replace('0.3', '1') }}>{stat.icon}</span>
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
        <div className="cmd-card cmd-card--empty" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ marginBottom: '20px' }}><Inbox size={64} style={{ color: 'var(--color-cyan, rgba(0,229,255,0.5))' }} /></div>
          <h3 className="cmd-card__title" style={{ color: 'var(--color-cyan)', marginBottom: '12px' }}>
            No verifications found
          </h3>
          <p className="cmd-card__description">
            No verifications match the selected filter
          </p>
        </div>
      ) : (
        <div className="grid-enhanced-nightlife">
          {groupedVerifications.map(group => {
            const latestVerification = group.verifications[0];
            const isProcessing = processingIds.has(latestVerification.id) || processingIds.has(group.employee.id);

            return (
              <VerificationCard
                key={group.employee.id}
                group={group}
                isProcessing={isProcessing}
                onReview={handleReview}
                onRevoke={handleOpenRevoke}
                onViewTimeline={handleViewTimeline}
                onViewProfile={handleViewProfile}
              />
            );
          })}
        </div>
      )}

      {/* Timeline Modal */}
      {selectedGroup && (
        <TimelineModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      )}

      {/* Revoke Modal */}
      {revokeModalOpen && revokeTarget && (
        <RevokeModal
          employeeId={revokeTarget.employeeId}
          employeeName={revokeTarget.employeeName}
          isProcessing={processingIds.has(revokeTarget.employeeId)}
          onClose={() => {
            setRevokeModalOpen(false);
            setRevokeTarget(null);
          }}
          onConfirm={handleRevoke}
        />
      )}
    </div>
  );
};

export default VerificationsAdmin;
