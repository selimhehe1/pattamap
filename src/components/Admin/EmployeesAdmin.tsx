import React, { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useDialog } from '../../hooks/useDialog';
import { EmployeeForm } from '../../routes/lazyComponents';
import { GirlProfile } from '../../routes/lazyComponents';
import AdminBreadcrumb from '../Common/AdminBreadcrumb';
import LoadingFallback from '../Common/LoadingFallback';
import { logger } from '../../utils/logger';
import toast from '../../utils/toast';
import LazyImage from '../Common/LazyImage';
import '../../styles/components/employee-profile.css';
import '../../styles/components/social-icons.css';
import '../../styles/pages/user-dashboard.css';

interface AdminEmployee {
  id: string;
  name: string;
  nickname?: string;
  age: number;
  nationality: string[] | null; // v10.4: Array for multiple nationalities (max 2 for "half/mixed")
  description?: string;
  photos: string[];
  social_media?: {
    instagram?: string;
    line?: string;
    telegram?: string;
    whatsapp?: string;
    facebook?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  self_removal_requested: boolean;
  is_verified?: boolean; // 🆕 v10.2 - Verification status
  verified_at?: string | null; // 🆕 v10.2 - Verification timestamp
  created_by: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    pseudonym: string;
  };
  employment_history?: Array<{
    id: string;
    employee_id: string;
    establishment_id: string;
    establishment_name: string;
    position?: string;
    start_date: string;
    end_date?: string;
    is_current: boolean;
    notes?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
  }>;
}

interface EditProposal {
  id: string;
  item_type: 'employee' | 'establishment';
  item_id: string;
  proposed_changes: any;
  current_values: any;
  proposed_by: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  proposed_by_user?: {
    id: string;
    pseudonym: string;
  };
}

interface EmployeesAdminProps {
  onTabChange: (tab: string) => void;
}

const EmployeesAdmin: React.FC<EmployeesAdminProps> = ({ onTabChange }) => {
  const { t } = useTranslation();
  const dialog = useDialog();
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();
  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [editProposals, setEditProposals] = useState<EditProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'pending-edits'>('pending');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState<AdminEmployee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<AdminEmployee | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<EditProposal | null>(null);
  const [establishmentNames, setEstablishmentNames] = useState<Record<string, string>>({});
  const [showEmployeeProfile, setShowEmployeeProfile] = useState(false);
  const [profileEmployee, setProfileEmployee] = useState<AdminEmployee | null>(null);

  // 🎯 Gestion du scroll du body quand un profil est ouvert
  useEffect(() => {
    if (showEmployeeProfile) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    // Nettoyage au démontage
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showEmployeeProfile]);

  useEffect(() => {
    loadEmployees();
  }, [filter]);

  const getSocialMediaUrl = (platform: string, username: string) => {
    const urls: { [key: string]: string } = {
      instagram: `https://instagram.com/${username}`,
      line: `https://line.me/R/ti/p/${username}`,
      telegram: `https://t.me/${username}`,
      whatsapp: `https://wa.me/${username}`,
      facebook: `https://facebook.com/${username}`
    };
    return urls[platform] || '#';
  };

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

      if (filter === 'pending-edits') {
        const response = await secureFetch(`${API_URL}/api/edit-proposals?status=pending&item_type=employee`);

        if (response.ok) {
          const data = await response.json();
          setEditProposals(data.proposals || []);
          setEmployees([]);

          const establishmentIds = new Set<string>();
          data.proposals?.forEach((p: EditProposal) => {
            if (p.proposed_changes?.current_establishment_id) {
              establishmentIds.add(p.proposed_changes.current_establishment_id);
            }
            if (p.current_values?.current_establishment_id) {
              establishmentIds.add(p.current_values.current_establishment_id);
            }
          });

          if (establishmentIds.size > 0) {
            const estResponse = await secureFetch(`${API_URL}/api/establishments?ids=${Array.from(establishmentIds).join(',')}`);
            if (estResponse.ok) {
              const estData = await estResponse.json();
              const names: Record<string, string> = {};
              estData.establishments?.forEach((est: any) => {
                names[est.id] = est.name;
              });
              setEstablishmentNames(names);
            }
          }
        }
      } else {
        const response = await secureFetch(`${API_URL}/api/admin/employees?status=${filter === 'all' ? '' : filter}`);

        if (response.ok) {
          const data = await response.json();
          setEmployees(data.employees || []);
          setEditProposals([]);
        }
      }
    } catch (error) {
      logger.error('Failed to load employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (employeeId: string) => {
    setProcessingIds(prev => new Set(prev).add(employeeId));
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const response = await secureFetch(`${API_URL}/api/admin/employees/${employeeId}/approve`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadEmployees(); // Reload list
      }
    } catch (error) {
      logger.error('Failed to approve employee:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(employeeId);
        return newSet;
      });
    }
  };

  const handleReject = async (employeeId: string, reason?: string) => {
    setProcessingIds(prev => new Set(prev).add(employeeId));
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const response = await secureFetch(`${API_URL}/api/admin/employees/${employeeId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        await loadEmployees(); // Reload list
      }
    } catch (error) {
      logger.error('Failed to reject employee:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(employeeId);
        return newSet;
      });
    }
  };

  const handleApproveProposal = async (proposalId: string) => {
    setProcessingIds(prev => new Set(prev).add(proposalId));
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const response = await secureFetch(`${API_URL}/api/edit-proposals/${proposalId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ moderator_notes: 'Approved via Employees tab' })
      });

      if (response.ok) {
        await loadEmployees();
        setSelectedProposal(null);
      }
    } catch (error) {
      logger.error('Failed to approve proposal:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(proposalId);
        return newSet;
      });
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    setProcessingIds(prev => new Set(prev).add(proposalId));
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const response = await secureFetch(`${API_URL}/api/edit-proposals/${proposalId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ moderator_notes: 'Rejected via Employees tab' })
      });

      if (response.ok) {
        await loadEmployees();
        setSelectedProposal(null);
      }
    } catch (error) {
      logger.error('Failed to reject proposal:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(proposalId);
        return newSet;
      });
    }
  };

  const handleSaveEmployee = async (employeeData: any) => {
    if (!editingEmployee) return;

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const response = await secureFetch(`${API_URL}/api/admin/employees/${editingEmployee.id}`, {
        method: 'PUT',
        body: JSON.stringify(employeeData)
      });

      if (response.ok) {
        await loadEmployees();
        setEditingEmployee(null);
      } else {
        throw new Error('Failed to update employee');
      }
    } catch (error) {
      logger.error('Failed to save employee:', error);
      toast.error('Failed to update employee');
    }
  };

  // 🆕 v10.3 - Verify employee profile (mark as verified)
  const handleVerifyEmployee = async (employeeId: string, employeeName: string) => {
    const confirmed = window.confirm(
      `Verify profile for ${employeeName}?\n\nThis will add a verified badge to their profile.`
    );

    if (!confirmed) {
      return;
    }

    setProcessingIds(prev => new Set(prev).add(employeeId));
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      // Use the verify endpoint (POST /:id/verify)
      const response = await secureFetch(`${API_URL}/api/verifications/${employeeId}/verify`, {
        method: 'POST',
        body: JSON.stringify({
          selfie_url: '', // Admin verification doesn't require selfie
          admin_approved: true // Flag to bypass face recognition
        })
      });

      if (response.ok) {
        toast.success(`Profile verified for ${employeeName}`);
        await loadEmployees();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify profile');
      }
    } catch (error: any) {
      logger.error('Failed to verify profile:', error);
      toast.error(error.message || 'Failed to verify profile');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(employeeId);
        return newSet;
      });
    }
  };

  // 🆕 v10.2 - Revoke verification
  const handleRevokeVerification = async (employeeId: string, employeeName: string) => {
    const reason = await dialog.prompt(
      t('admin.revokeVerificationPrompt', `Revoke verification for ${employeeName}?\n\nPlease provide a reason:`),
      {
        required: true,
        minLength: 10,
        variant: 'danger',
        placeholder: t('admin.enterRevocationReason', 'Enter revocation reason...')
      }
    );

    if (!reason) {
      return; // User cancelled
    }

    setProcessingIds(prev => new Set(prev).add(employeeId));
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const response = await secureFetch(`${API_URL}/api/verifications/employees/${employeeId}/verification`, {
        method: 'DELETE',
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        toast.success(`Verification revoked for ${employeeName}`);
        await loadEmployees();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke verification');
      }
    } catch (error: any) {
      logger.error('Failed to revoke verification:', error);
      toast.error(error.message || 'Failed to revoke verification');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(employeeId);
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

  const getSocialMediaIcon = (platform: string) => {
    const icons: { [key: string]: string } = {
      instagram: '📷',
      line: '💬',
      telegram: '✈️',
      whatsapp: '📱',
      facebook: '👥'
    };
    return icons[platform] || '🔗';
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
            🚫 {t('admin.accessDenied')}
          </h2>
          <p style={{ color: '#cccccc', fontSize: '16px' }}>
            {t('admin.accessDeniedArea')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(26,0,51,0.95), rgba(13,0,25,0.95))',
      minHeight: '100vh',
      padding: '30px',
      color: 'white'
    }}>
      {/* Breadcrumb Navigation */}
      <AdminBreadcrumb
        currentSection={t('admin.employeesManagement')}
        onBackToDashboard={() => onTabChange('overview')}
        icon="👥"
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
          👥 {t('admin.employeesManagement')}
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#cccccc',
          margin: 0
        }}>
          {t('admin.reviewApproveEmployees')}
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
          { key: 'pending', label: t('admin.filterNewPending'), icon: '🆕' },
          { key: 'pending-edits', label: t('admin.filterPendingEdits'), icon: '✏️' },
          { key: 'approved', label: t('admin.filterApproved'), icon: '✅' },
          { key: 'rejected', label: t('admin.filterRejected'), icon: '❌' },
          { key: 'all', label: t('admin.filterAll'), icon: '📋' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              border: filter === tab.key ? '2px solid #C19A6B' : '2px solid rgba(193, 154, 107,0.3)',
              background: filter === tab.key 
                ? 'linear-gradient(45deg, rgba(193, 154, 107,0.2), rgba(255,215,0,0.1))'
                : 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
              color: filter === tab.key ? '#C19A6B' : '#ffffff',
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

      {/* Employees List */}
      {isLoading ? (
        <LoadingFallback message={t('admin.loadingEmployees')} variant="inline" />
      ) : filter === 'pending-edits' && editProposals.length === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
          borderRadius: '20px',
          border: '2px solid rgba(193, 154, 107,0.3)',
          padding: '40px',
          textAlign: 'center'
        }}>
          <h3 style={{
            color: '#C19A6B',
            fontSize: '20px',
            fontWeight: 'bold',
            margin: '0 0 10px 0'
          }}>
            ✅ {t('admin.noPendingEdits')}
          </h3>
          <p style={{
            color: '#cccccc',
            fontSize: '16px'
          }}>
            {t('admin.allEditsReviewed')}
          </p>
        </div>
      ) : filter === 'pending-edits' ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {editProposals.map((proposal) => (
            <div
              key={proposal.id}
              style={{
                background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(0,0,0,0.3))',
                borderRadius: '20px',
                border: '2px solid rgba(255,215,0,0.3)',
                padding: '25px',
                position: 'relative'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                padding: '8px 15px',
                borderRadius: '20px',
                background: 'rgba(255,215,0,0.2)',
                border: '2px solid #FFD700',
                color: '#FFD700',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                ✏️ {t('admin.editProposal')}
              </div>

              <div style={{ marginBottom: '15px' }}>
                <h3 style={{ color: '#FFD700', fontSize: '18px', margin: '0 0 5px 0' }}>
                  {t('admin.editFor')} {proposal.current_values?.name || t('admin.employees')}
                </h3>
                <p style={{ color: '#cccccc', fontSize: '14px', margin: 0 }}>
                  {t('admin.proposedBy')} <strong style={{ color: '#00E5FF' }}>{proposal.proposed_by_user?.pseudonym || t('admin.unknown')}</strong>
                </p>
              </div>

              <button
                onClick={() => setSelectedProposal(selectedProposal?.id === proposal.id ? null : proposal)}
                style={{
                  padding: '10px 20px',
                  background: selectedProposal?.id === proposal.id
                    ? 'linear-gradient(45deg, #FFD700, #FFA500)'
                    : 'linear-gradient(45deg, rgba(255,215,0,0.2), rgba(255,165,0,0.2))',
                  color: selectedProposal?.id === proposal.id ? '#000' : '#FFD700',
                  border: '1px solid #FFD700',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {selectedProposal?.id === proposal.id ? `▲ ${t('admin.hideChanges')}` : `▼ ${t('admin.viewChanges')}`}
              </button>

              {selectedProposal?.id === proposal.id && (
                <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(0,0,0,0.4)', borderRadius: '15px' }}>
                  <h5 style={{
                    color: '#FFD700',
                    fontSize: '18px',
                    margin: '0 0 20px 0',
                    borderBottom: '2px solid rgba(255,215,0,0.3)',
                    paddingBottom: '10px'
                  }}>
                    📊 {t('admin.proposedChanges')}
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {Object.keys(proposal.proposed_changes).map(key => {
                      const currentValue = proposal.current_values?.[key];
                      const proposedValue = proposal.proposed_changes[key];

                      if (JSON.stringify(currentValue) === JSON.stringify(proposedValue)) return null;

                      const formatValue = (value: any, fieldKey: string) => {
                        if (value === null || value === undefined) return 'N/A';

                        if (fieldKey === 'current_establishment_id' && value && typeof value === 'string') {
                          return establishmentNames[value] || `ID: ${value.substring(0, 8)}...`;
                        }

                        if (fieldKey.includes('_id') && typeof value === 'string' && value.includes('-')) {
                          return `ID: ${value.substring(0, 8)}...`;
                        }

                        if (typeof value === 'object') {
                          if (fieldKey === 'social_media') {
                            const entries = Object.entries(value);
                            if (entries.length === 0) return 'No social media';
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {entries.map(([platform, handle]) => (
                                  <div key={platform}>
                                    <strong style={{ color: '#FFD700' }}>{platform}:</strong> {String(handle)}
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return (
                            <pre style={{
                              margin: 0,
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}>
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          );
                        }

                        if (typeof value === 'boolean') {
                          return value ? '✓ Yes' : '✗ No';
                        }

                        return String(value);
                      };

                      return (
                        <div key={key} style={{
                          background: 'linear-gradient(135deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3))',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          border: '1px solid rgba(255,215,0,0.2)'
                        }}>
                          <div style={{
                            padding: '12px 20px',
                            background: 'rgba(255,215,0,0.15)',
                            borderBottom: '1px solid rgba(255,215,0,0.3)'
                          }}>
                            <strong style={{
                              color: '#FFD700',
                              fontSize: '15px',
                              fontWeight: '600',
                              textTransform: 'capitalize',
                              letterSpacing: '0.5px'
                            }}>
                              {key.replace(/_/g, ' ')}
                            </strong>
                          </div>
                          <div style={{ padding: '20px', display: 'flex', gap: '15px', alignItems: 'stretch' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '10px'
                              }}>
                                <span style={{
                                  fontSize: '18px',
                                  filter: 'grayscale(30%)'
                                }}>🔴</span>
                                <span style={{
                                  color: '#FF6B6B',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  textTransform: 'uppercase',
                                  letterSpacing: '1px'
                                }}>
                                  {t('admin.before')}
                                </span>
                              </div>
                              <div style={{
                                padding: '12px 15px',
                                background: 'rgba(255, 107, 107, 0.08)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 107, 107, 0.25)',
                                color: '#ffcccc',
                                fontSize: '14px',
                                lineHeight: '1.6',
                                minHeight: '50px',
                                display: 'flex',
                                alignItems: 'center'
                              }}>
                                {formatValue(currentValue, key)}
                              </div>
                            </div>

                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              color: '#FFD700',
                              fontSize: '24px',
                              fontWeight: 'bold',
                              padding: '0 5px'
                            }}>
                              →
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '10px'
                              }}>
                                <span style={{ fontSize: '18px' }}>🟢</span>
                                <span style={{
                                  color: '#51CF66',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  textTransform: 'uppercase',
                                  letterSpacing: '1px'
                                }}>
                                  {t('admin.after')}
                                </span>
                              </div>
                              <div style={{
                                padding: '12px 15px',
                                background: 'rgba(81, 207, 102, 0.08)',
                                borderRadius: '8px',
                                border: '1px solid rgba(81, 207, 102, 0.25)',
                                color: '#ccffcc',
                                fontSize: '14px',
                                lineHeight: '1.6',
                                minHeight: '50px',
                                display: 'flex',
                                alignItems: 'center'
                              }}>
                                {formatValue(proposedValue, key)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                    <button
                      onClick={() => handleApproveProposal(proposal.id)}
                      disabled={processingIds.has(proposal.id)}
                      style={{
                        flex: 1,
                        padding: '15px 25px',
                        background: processingIds.has(proposal.id) ? '#666' : 'linear-gradient(45deg, #00FF7F, #00D4AA)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: processingIds.has(proposal.id) ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}
                    >
                      {processingIds.has(proposal.id) ? `⏳ ${t('admin.processing')}` : `✅ ${t('admin.approveAndApply')}`}
                    </button>

                    <button
                      onClick={() => handleRejectProposal(proposal.id)}
                      disabled={processingIds.has(proposal.id)}
                      style={{
                        flex: 1,
                        padding: '15px 25px',
                        background: processingIds.has(proposal.id) ? '#666' : 'linear-gradient(45deg, #FF4757, #FF1744)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: processingIds.has(proposal.id) ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}
                    >
                      {processingIds.has(proposal.id) ? `⏳ ${t('admin.processing')}` : `❌ ${t('admin.reject')}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
          borderRadius: '20px',
          border: '2px solid rgba(193, 154, 107,0.3)',
          padding: '40px',
          textAlign: 'center'
        }}>
          <h3 style={{
            color: '#C19A6B',
            fontSize: '20px',
            fontWeight: 'bold',
            margin: '0 0 10px 0'
          }}>
            📭 {t('admin.noEmployeesFound')}
          </h3>
          <p style={{
            color: '#cccccc',
            fontSize: '16px'
          }}>
            {t('admin.noEmployeesMatch')}
          </p>
        </div>
      ) : (
        <div className="grid-enhanced-nightlife">
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="employee-card-nightlife"
              role="button"
              tabIndex={0}
              style={{
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative', // For absolute positioning of status badge
                display: 'flex',
                flexDirection: 'column',
                height: '100%' // Ensure full height for flexbox
              }}
              onClick={() => {
                setProfileEmployee(employee);
                setShowEmployeeProfile(true);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(193, 154, 107,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Status Badge - Absolute Position Top Right */}
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                padding: '4px 8px',
                borderRadius: '12px',
                background: `${getStatusColor(employee.status)}20`,
                border: `1px solid ${getStatusColor(employee.status)}`,
                color: getStatusColor(employee.status),
                fontSize: '10px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                zIndex: 10
              }}>
                {getStatusIcon(employee.status)} {
                  employee.status === 'approved' ? 'OK' :
                  employee.status === 'pending' ? 'NEW' :
                  employee.status === 'rejected' ? 'NO' :
                  'UNKNOWN'
                }
              </div>
              {/* Content Area - Flex 1 to push buttons to bottom */}
              <div style={{ flex: 1, paddingTop: '10px' }}>
                {/* Main Employee Info - Horizontal Layout */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  {/* Circular Photo with Status-Colored Border */}
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: `3px solid ${getStatusColor(employee.status)}`,
                    flexShrink: 0,
                    position: 'relative'
                  }}>
                    {employee.photos && employee.photos.length > 0 ? (
                      <LazyImage
                        src={employee.photos[0]}
                        alt={`${employee.name}, ${employee.age} years old from ${employee.nationality}`}
                        cloudinaryPreset="thumbnail"
                        style={{ width: '100%', height: '100%' }}
                        objectFit="cover"
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(45deg, #C19A6B, #FFD700)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        color: 'white'
                      }}>
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Photo Count Badge */}
                    {employee.photos && employee.photos.length > 1 && (
                      <div style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        background: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}>
                        📷 {employee.photos.length}
                      </div>
                    )}
                  </div>

                  {/* Employee Details */}
                  <div style={{ flex: 1 }}>
                    {/* Name with Verified Badge - 🆕 v10.2 */}
                    <h3 style={{
                      color: '#ffffff',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      margin: '0 0 5px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>{employee.name}</span>
                      {employee.is_verified && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '18px',
                            height: '18px',
                            background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                            borderRadius: '50%',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#fff',
                            boxShadow: '0 2px 8px rgba(0, 212, 255, 0.4)',
                            flexShrink: 0
                          }}
                          title={`Verified ${employee.verified_at ? `on ${new Date(employee.verified_at).toLocaleDateString()}` : ''}`}
                        >
                          ✓
                        </span>
                      )}
                      {employee.nickname && (
                        <span className="text-accent-nightlife nickname-text-nightlife">
                          "{employee.nickname}"
                        </span>
                      )}
                    </h3>

                    {/* Age and Nationality */}
                    <div style={{ color: '#00E5FF', fontSize: '12px', marginBottom: '8px' }}>
                      {employee.age} {t('admin.years')} • {employee.nationality}
                    </div>

                    {/* Submission Info */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#888888',
                      marginBottom: '8px'
                    }}>
                      <span>📅 {formatDate(employee.created_at)}</span>
                      <span style={{ color: '#FFD700' }}>👤 {employee.user?.pseudonym || t('admin.unknown')}</span>
                    </div>
                  </div>
                </div>

              {/* Employment History - Enhanced for Admin */}
              {employee.employment_history && employee.employment_history.length > 0 ? (() => {
                const currentJob = employee.employment_history.find(job => job.is_current);
                const pastJobs = employee.employment_history
                  .filter(job => !job.is_current)
                  .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                  .slice(0, 3); // Show up to 3 previous jobs

                return (
                  <div style={{ marginBottom: '15px' }}>
                    {/* Current Employment */}
                    {currentJob ? (
                      <div className="status-card-nightlife status-employed-nightlife" style={{ marginBottom: pastJobs.length > 0 ? '10px' : '0px' }}>
                        <div style={{ color: '#00E5FF', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
                          📍 {t('admin.currentlyWorkingAt')}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#00FF7F', marginBottom: '2px' }}>
                          {currentJob.establishment_name}
                        </div>
                        {currentJob.position && (
                          <div style={{ color: '#FFD700', fontSize: '12px', marginBottom: '2px' }}>
                            💼 {currentJob.position}
                          </div>
                        )}
                        <div style={{ color: '#cccccc', fontSize: '11px' }}>
                          Since {new Date(currentJob.start_date).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="status-card-nightlife status-unemployed-nightlife" style={{ marginBottom: pastJobs.length > 0 ? '10px' : '0px' }}>
                        ⚠️ {t('admin.notCurrentlyEmployed')}
                      </div>
                    )}

                    {/* Previous Employment History */}
                    {pastJobs.length > 0 && (
                      <div style={{
                        background: 'rgba(255, 215, 0, 0.05)',
                        border: '1px solid rgba(255, 215, 0, 0.2)',
                        borderRadius: '8px',
                        padding: '6px'
                      }}>
                        <div style={{
                          color: '#FFD700',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          📋 {t('admin.employmentHistory')} ({pastJobs.length} {t('admin.previousJob', { count: pastJobs.length })}):
                        </div>
                        {pastJobs.map((job, index) => (
                          <div key={job.id || index} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '11px',
                            color: '#cccccc',
                            marginBottom: index === pastJobs.length - 1 ? '0px' : '4px',
                            paddingLeft: '8px'
                          }}>
                            <span style={{ color: '#FFD700', fontWeight: 'bold' }}>
                              • {job.establishment_name}
                              {job.position && <span style={{ color: '#cccccc', fontWeight: 'normal' }}> ({job.position})</span>}
                            </span>
                            <span style={{ color: '#999999', fontSize: '10px' }}>
                              {new Date(job.start_date).getFullYear()}
                              {job.end_date && ` - ${new Date(job.end_date).getFullYear()}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="status-card-nightlife status-unemployed-nightlife" style={{ marginBottom: '15px' }}>
                  ⚠️ {t('admin.noEmploymentHistory')}
                </div>
              )}

              {/* Social Media - My Favorites Style */}
              {employee.social_media && Object.values(employee.social_media).some(username => username) && (
                <div className="social-media-container-nightlife" style={{ marginBottom: '15px' }}>
                  {Object.entries(employee.social_media).map(([platform, username]) => {
                    if (!username) return null;
                    return (
                      <a
                        key={platform}
                        href={getSocialMediaUrl(platform, username)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`social-icon-nightlife social-${platform}-nightlife`}
                        title={`@${username} on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {getSocialMediaIcon(platform)}
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Description Preview */}
              {employee.description && (
                <div style={{
                  color: '#cccccc',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  marginBottom: '15px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  💭 {employee.description}
                </div>
              )}
              </div>

              {/* Action Buttons - Anchored at Bottom */}
              <div style={{
                marginTop: 'auto',
                padding: '15px 0 0 0'
              }}>
                {/* First Line: View Profile + Edit - Perfect 50-50 */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setProfileEmployee(employee);
                      setShowEmployeeProfile(true);
                    }}
                    className="btn-nightlife-base btn-primary-nightlife"
                    style={{
                      flex: 1,
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '10px 8px',
                      borderRadius: '10px'
                    }}
                  >
                    👁️ {t('admin.viewProfile')}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingEmployee(employee);
                    }}
                    className="btn-nightlife-base"
                    style={{
                      flex: 1,
                      background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                      color: '#000',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '10px 8px',
                      borderRadius: '10px'
                    }}
                  >
                    ✏️ {t('common.edit')}
                  </button>
                </div>

                {/* Verify Profile Button - 🆕 v10.3 - Only for non-verified approved employees */}
                {!employee.is_verified && employee.status === 'approved' && (
                  <div style={{ marginBottom: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVerifyEmployee(employee.id, employee.name);
                      }}
                      disabled={processingIds.has(employee.id)}
                      className="btn-nightlife-base"
                      style={{
                        width: '100%',
                        background: processingIds.has(employee.id)
                          ? 'linear-gradient(45deg, #666666, #888888)'
                          : 'linear-gradient(45deg, #00D4FF, #0099CC)',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        padding: '10px 8px',
                        borderRadius: '10px',
                        opacity: processingIds.has(employee.id) ? 0.7 : 1,
                        cursor: processingIds.has(employee.id) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {processingIds.has(employee.id) ? `⏳ ${t('admin.processing')}` : `✓ ${t('admin.verifyProfile', 'Verify Profile')}`}
                    </button>
                  </div>
                )}

                {/* Revoke Verification Button - 🆕 v10.2 - Only for verified employees */}
                {employee.is_verified && (
                  <div style={{ marginBottom: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRevokeVerification(employee.id, employee.name);
                      }}
                      disabled={processingIds.has(employee.id)}
                      className="btn-nightlife-base"
                      style={{
                        width: '100%',
                        background: processingIds.has(employee.id)
                          ? 'linear-gradient(45deg, #666666, #888888)'
                          : 'linear-gradient(45deg, #FF6B00, #FF4500)',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        padding: '10px 8px',
                        borderRadius: '10px',
                        opacity: processingIds.has(employee.id) ? 0.7 : 1,
                        cursor: processingIds.has(employee.id) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {processingIds.has(employee.id) ? `⏳ ${t('admin.processing')}` : `⛔ ${t('admin.revokeVerification', 'Revoke Verification')}`}
                    </button>
                  </div>
                )}

                {/* Second Line: Approve/Reject - Only for pending - Perfect 50-50 */}
                {employee.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprove(employee.id);
                      }}
                      disabled={processingIds.has(employee.id)}
                      className="btn-nightlife-base"
                      style={{
                        flex: 1,
                        background: processingIds.has(employee.id)
                          ? 'linear-gradient(45deg, #666666, #888888)'
                          : 'linear-gradient(45deg, #00FF7F, #00CC65)',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        padding: '10px 8px',
                        borderRadius: '10px',
                        opacity: processingIds.has(employee.id) ? 0.7 : 1,
                        cursor: processingIds.has(employee.id) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {processingIds.has(employee.id) ? `⏳ ${t('admin.processing')}` : `✅ ${t('admin.approve')}`}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReject(employee.id);
                      }}
                      disabled={processingIds.has(employee.id)}
                      className="btn-nightlife-base"
                      style={{
                        flex: 1,
                        background: processingIds.has(employee.id)
                          ? 'linear-gradient(45deg, #666666, #888888)'
                          : 'linear-gradient(45deg, #FF4757, #FF3742)',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        padding: '10px 8px',
                        borderRadius: '10px',
                        opacity: processingIds.has(employee.id) ? 0.7 : 1,
                        cursor: processingIds.has(employee.id) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {processingIds.has(employee.id) ? `⏳ ${t('admin.processing')}` : `❌ ${t('admin.reject')}`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
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
            border: '2px solid #C19A6B',
            boxShadow: '0 20px 60px rgba(193, 154, 107,0.3)',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedEmployee(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(193, 154, 107,0.2)',
                border: '2px solid #C19A6B',
                color: '#C19A6B',
                fontSize: '20px',
                cursor: 'pointer',
                zIndex: 10,
                transition: 'all 0.3s ease'
              }}
            >
              ×
            </button>

            <div style={{ padding: '30px' }}>
              {/* Detailed view content here - similar to GirlProfile but for admin */}
              <h2 style={{
                color: '#C19A6B',
                fontSize: '28px',
                fontWeight: 'bold',
                margin: '0 0 20px 0'
              }}>
                {selectedEmployee.name}
                {selectedEmployee.nickname && (
                  <span style={{ color: '#FFD700', fontSize: '20px', marginLeft: '10px' }}>
                    "{selectedEmployee.nickname}"
                  </span>
                )}
              </h2>

              {/* All employee details in expanded view */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '300px 1fr',
                gap: '30px'
              }}>
                {/* Photos */}
                <div>
                  {selectedEmployee.photos.map((photo, index) => (
                    <LazyImage
                      key={index}
                      src={photo}
                      alt={`${selectedEmployee.name}, ${selectedEmployee.age} years old from ${selectedEmployee.nationality} - ${index + 1}`}
                      cloudinaryPreset="employeePhoto"
                      style={{
                        width: '100%',
                        marginBottom: '10px',
                        borderRadius: '10px'
                      }}
                      objectFit="cover"
                    />
                  ))}
                </div>

                {/* Details */}
                <div style={{ color: 'white' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <strong style={{ color: '#C19A6B' }}>Age:</strong> {selectedEmployee.age}
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <strong style={{ color: '#C19A6B' }}>Nationality:</strong> {selectedEmployee.nationality}
                  </div>

                  {/* Current Employment Detail */}
                  {selectedEmployee.employment_history && selectedEmployee.employment_history.find(job => job.is_current) && (
                    <div style={{ marginBottom: '20px' }}>
                      <strong style={{ color: '#C19A6B' }}>{t('admin.currentEmployment')}</strong>
                      {(() => {
                        const currentJob = selectedEmployee.employment_history.find(job => job.is_current);
                        return (
                          <div style={{
                            marginTop: '10px',
                            background: 'rgba(0, 255, 127, 0.1)',
                            border: '2px solid rgba(0, 255, 127, 0.3)',
                            borderRadius: '12px',
                            padding: '15px'
                          }}>
                            <div style={{
                              color: '#00FF7F',
                              fontSize: '18px',
                              fontWeight: 'bold',
                              marginBottom: '8px'
                            }}>
                              🏢 {currentJob?.establishment_name}
                            </div>
                            {currentJob?.position && (
                              <div style={{ color: '#FFD700', marginBottom: '5px' }}>
                                💼 Position: {currentJob?.position}
                              </div>
                            )}
                            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                              📅 {t('admin.started')} {new Date(currentJob?.start_date || '').toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                            {currentJob?.notes && (
                              <div style={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontSize: '13px',
                                marginTop: '8px',
                                fontStyle: 'italic'
                              }}>
                                📝 {t('admin.notes')} {currentJob?.notes}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {selectedEmployee.description && (
                    <div style={{ marginBottom: '20px' }}>
                      <strong style={{ color: '#C19A6B' }}>Description:</strong>
                      <p style={{ marginTop: '5px', lineHeight: '1.6' }}>{selectedEmployee.description}</p>
                    </div>
                  )}
                  
                  {/* Social media details */}
                  {selectedEmployee.social_media && (
                    <div style={{ marginBottom: '20px' }}>
                      <strong style={{ color: '#C19A6B' }}>Social Media:</strong>
                      <div style={{ marginTop: '10px' }}>
                        {Object.entries(selectedEmployee.social_media).map(([platform, username]) => {
                          if (!username) return null;
                          return (
                            <div key={platform} style={{ marginBottom: '5px' }}>
                              {getSocialMediaIcon(platform)} {platform}: {username}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action buttons if pending */}
                  {selectedEmployee.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                      <button
                        onClick={() => {
                          handleApprove(selectedEmployee.id);
                          setSelectedEmployee(null);
                        }}
                        style={{
                          flex: 1,
                          padding: '15px',
                          background: 'linear-gradient(45deg, #00FF7F, #00CC65)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        ✅ {t('admin.approve')}
                      </button>
                      <button
                        onClick={() => {
                          handleReject(selectedEmployee.id);
                          setSelectedEmployee(null);
                        }}
                        style={{
                          flex: 1,
                          padding: '15px',
                          background: 'linear-gradient(45deg, #FF4757, #FF3742)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        ❌ {t('admin.reject')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GirlProfile Modal for Employee View */}
      {showEmployeeProfile && profileEmployee && (
        <div className="profile-overlay-nightlife">
          <Suspense fallback={<LoadingFallback message="Loading profile..." variant="modal" />}>
            <GirlProfile
              girl={{
              id: profileEmployee.id,
              name: profileEmployee.name,
              nickname: profileEmployee.nickname || undefined,
              age: profileEmployee.age,
              nationality: profileEmployee.nationality,
              photos: profileEmployee.photos || [],
              description: profileEmployee.description || undefined,
              social_media: profileEmployee.social_media,
              status: profileEmployee.status,
              self_removal_requested: profileEmployee.self_removal_requested,
              created_by: profileEmployee.created_by,
              employment_history: profileEmployee.employment_history?.map(job => ({
                id: String(job.id || 0),
                employee_id: profileEmployee.id,
                establishment_id: String(job.establishment_id || 0),
                establishment: job.establishment_name ? {
                  id: String(job.establishment_id || 0),
                  name: job.establishment_name,
                  address: 'N/A', // Default for admin view
                  category_id: '1', // Default category ID
                  category: {
                    id: '1',
                    name: 'Bar',
                    icon: '🍻',
                    color: '#C19A6B',
                    created_at: new Date().toISOString()
                  },
                  status: 'approved' as const,
                  created_by: 'system',
                  created_at: job.start_date || new Date().toISOString(),
                  updated_at: job.start_date || new Date().toISOString()
                } : undefined,
                start_date: job.start_date,
                end_date: job.end_date || undefined,
                position: job.position || undefined,
                notes: job.notes || undefined,
                is_current: job.is_current,
                created_by: profileEmployee.created_by,
                created_at: job.start_date, // Use start_date as fallback
                updated_at: job.start_date  // Use start_date as fallback
              })) || [],
              created_at: profileEmployee.created_at,
              updated_at: profileEmployee.updated_at || profileEmployee.created_at
            }}
              onClose={() => {
                setShowEmployeeProfile(false);
                setProfileEmployee(null);
              }}
            />
          </Suspense>
        </div>
      )}

      {/* Edit Employee Form */}
      {editingEmployee && (
        <Suspense fallback={<LoadingFallback message="Loading employee form..." variant="modal" />}>
          <EmployeeForm
            initialData={{
              ...editingEmployee,
              current_establishment_id: (() => {
                const fromEmploymentHistory = editingEmployee.employment_history?.find(eh => eh.is_current)?.establishment_id;
                const result = fromEmploymentHistory || '';

                logger.debug('🔧 EmployeesAdmin Debug for:', editingEmployee.name);
                logger.debug('fromEmploymentHistory:', fromEmploymentHistory);
                logger.debug('employment_history:', editingEmployee.employment_history);
                logger.debug('Final result:', result);

                return result;
              })()
            }}
            onSubmit={handleSaveEmployee}
            onCancel={() => setEditingEmployee(null)}
          />
        </Suspense>
      )}

      {/* Loading Animation CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EmployeesAdmin;