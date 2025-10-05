import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import EstablishmentForm from '../Forms/EstablishmentForm';
import AdminBreadcrumb from '../Common/AdminBreadcrumb';
import { logger } from '../../utils/logger';

// Force recompile

interface AdminEstablishment {
  id: string;
  name: string;
  address: string;
  zone: string;
  category_id: string;
  phone?: string;
  website?: string;
  logo_url?: string;
  services?: string[];
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  created_at: string;
  updated_at: string;
  pricing?: {
    consumables?: Array<{
      consumable_id: string;
      price: string;
    }>;
    ladydrink?: string;
    barfine?: string;
    rooms?: string;
  };
  user?: {
    id: string;
    pseudonym: string;
  };
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    created_at: string;
  };
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

interface EstablishmentsAdminProps {
  onTabChange: (tab: string) => void;
}

const EstablishmentsAdmin: React.FC<EstablishmentsAdminProps> = ({ onTabChange }) => {
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();
  const [establishments, setEstablishments] = useState<AdminEstablishment[]>([]);
  const [editProposals, setEditProposals] = useState<EditProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'pending-edits'>('pending');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [editingEstablishment, setEditingEstablishment] = useState<AdminEstablishment | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<EditProposal | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadEstablishments();
  }, [filter]);

  const loadEstablishments = async () => {
    setIsLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

      if (filter === 'pending-edits') {
        const response = await secureFetch(`${API_URL}/api/edit-proposals?status=pending&item_type=establishment`);

        if (response.ok) {
          const data = await response.json();
          setEditProposals(data.proposals || []);
          setEstablishments([]);
        }
      } else {
        const response = await secureFetch(`${API_URL}/api/admin/establishments?status=${filter === 'all' ? '' : filter}`);

        if (response.ok) {
          const data = await response.json();
          setEstablishments(data.establishments || []);
          setEditProposals([]);
        }
      }
    } catch (error) {
      logger.error('Failed to load establishments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (establishmentId: string) => {
    setProcessingIds(prev => new Set(prev).add(establishmentId));
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const response = await secureFetch(`${API_URL}/api/admin/establishments/${establishmentId}/approve`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadEstablishments(); // Reload list
      }
    } catch (error) {
      logger.error('Failed to approve establishment:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(establishmentId);
        return newSet;
      });
    }
  };

  const handleReject = async (establishmentId: string, reason?: string) => {
    setProcessingIds(prev => new Set(prev).add(establishmentId));
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const response = await secureFetch(`${API_URL}/api/admin/establishments/${establishmentId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        await loadEstablishments(); // Reload list
      }
    } catch (error) {
      logger.error('Failed to reject establishment:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(establishmentId);
        return newSet;
      });
    }
  };

  const handleSaveEstablishment = async (establishmentData: any) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

      // Determine if we're adding or editing
      const isEditing = !!editingEstablishment;
      const url = isEditing
        ? `${API_URL}/api/admin/establishments/${editingEstablishment.id}`
        : `${API_URL}/api/admin/establishments`;
      const method = isEditing ? 'PUT' : 'POST';

      // DEBUG: Log the data being sent
      logger.debug('🏢 EstablishmentsAdmin - Saving establishment:', {
        method,
        url,
        establishmentData,
        logo_url: establishmentData.logo_url
      });

      const response = await secureFetch(url, {
        method,
        body: JSON.stringify(establishmentData)
      });

      if (response.ok) {
        await loadEstablishments();
        // Close the appropriate modal
        if (isEditing) {
          setEditingEstablishment(null);
        } else {
          setShowAddModal(false);
        }
      } else {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} establishment`);
      }
    } catch (error) {
      logger.error(`Failed to ${editingEstablishment ? 'save' : 'create'} establishment:`, error);
      throw error;
    }
  };

  const handleApproveProposal = async (proposalId: string) => {
    setProcessingIds(prev => new Set(prev).add(proposalId));
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const response = await secureFetch(`${API_URL}/api/edit-proposals/${proposalId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ moderator_notes: 'Approved via Establishments tab' })
      });

      if (response.ok) {
        await loadEstablishments();
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
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    setProcessingIds(prev => new Set(prev).add(proposalId));
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const response = await secureFetch(`${API_URL}/api/edit-proposals/${proposalId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ moderator_notes: reason })
      });

      if (response.ok) {
        await loadEstablishments();
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

  if (!user || !['admin', 'moderator'].includes(user.role)) {
    return (
      <div className="admin-access-denied-container-nightlife">
        <div className="admin-access-denied-card-nightlife">
          <h2 className="admin-access-denied-title-nightlife">
            🚫 Access Denied
          </h2>
          <p className="admin-access-denied-text-nightlife">
            You don't have permission to access this area.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-establishments-container-nightlife">
      {/* Breadcrumb Navigation */}
      <AdminBreadcrumb
        currentSection="Gestion des Établissements"
        onBackToDashboard={() => onTabChange('overview')}
        icon="🏢"
      />

      {/* Header */}
      <div className="admin-establishments-header-nightlife">
        <h1 className="admin-establishments-title-nightlife">
          🏢 Establishments Management
        </h1>
        <p className="admin-establishments-subtitle-nightlife">
          Review and approve establishment submissions
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="admin-establishments-tabs-nightlife">
        {[
          { key: 'pending', label: 'New Pending', icon: '🆕' },
          { key: 'pending-edits', label: 'Pending Edits', icon: '✏️' },
          { key: 'approved', label: 'Approved', icon: '✅' },
          { key: 'rejected', label: 'Rejected', icon: '❌' },
          { key: 'all', label: 'All', icon: '📋' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`admin-establishments-tab-nightlife ${filter === tab.key ? 'active' : ''}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Add Establishment Button */}
      <div className="admin-add-establishment-center-nightlife">
        <button
          onClick={() => setShowAddModal(true)}
          className="admin-add-establishment-button-nightlife"
        >
          🏢 Add New Establishment
        </button>
      </div>

      {/* Establishments List */}
      {isLoading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '300px'
        }}>
          <div style={{
            display: 'inline-block',
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255,27,141,0.3)',
            borderTop: '4px solid #FF1B8D',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      ) : filter === 'pending-edits' && editProposals.length === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,27,141,0.1), rgba(0,0,0,0.3))',
          borderRadius: '20px',
          border: '2px solid rgba(255,27,141,0.3)',
          padding: '40px',
          textAlign: 'center'
        }}>
          <h3 style={{
            color: '#FF1B8D',
            fontSize: '20px',
            fontWeight: 'bold',
            margin: '0 0 10px 0'
          }}>
            ✅ No Pending Edits
          </h3>
          <p style={{
            color: '#cccccc',
            fontSize: '16px'
          }}>
            All edit proposals have been reviewed.
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
                ✏️ EDIT PROPOSAL
              </div>

              <div style={{ marginBottom: '15px' }}>
                <h3 style={{ color: '#FFD700', fontSize: '18px', margin: '0 0 5px 0' }}>
                  Edit for: {proposal.current_values?.name || 'Establishment'}
                </h3>
                <p style={{ color: '#cccccc', fontSize: '14px', margin: 0 }}>
                  Proposed by: <strong style={{ color: '#00FFFF' }}>{proposal.proposed_by_user?.pseudonym || 'Unknown'}</strong>
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
                {selectedProposal?.id === proposal.id ? '▲ Hide Changes' : '▼ View Changes'}
              </button>

              {selectedProposal?.id === proposal.id && (
                <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(0,0,0,0.4)', borderRadius: '15px' }}>
                  <h5 style={{ color: '#FFD700', fontSize: '16px', margin: '0 0 15px 0' }}>
                    📊 Proposed Changes
                  </h5>
                  {Object.keys(proposal.proposed_changes).map(key => {
                    const currentValue = proposal.current_values?.[key];
                    const proposedValue = proposal.proposed_changes[key];

                    if (JSON.stringify(currentValue) === JSON.stringify(proposedValue)) return null;

                    return (
                      <div key={key} style={{ marginBottom: '15px', padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
                        <strong style={{ color: '#FFD700', fontSize: '14px', textTransform: 'uppercase' }}>
                          {key.replace(/_/g, ' ')}:
                        </strong>
                        <div style={{ display: 'flex', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
                          <div style={{
                            flex: 1,
                            minWidth: '200px',
                            padding: '10px',
                            background: 'rgba(255,71,87,0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,71,87,0.3)'
                          }}>
                            <div style={{ color: '#FF4757', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
                              ❌ BEFORE
                            </div>
                            <div style={{ color: '#ffffff', fontSize: '13px', wordBreak: 'break-word' }}>
                              {typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : String(currentValue || 'N/A')}
                            </div>
                          </div>
                          <div style={{
                            flex: 1,
                            minWidth: '200px',
                            padding: '10px',
                            background: 'rgba(0,255,127,0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(0,255,127,0.3)'
                          }}>
                            <div style={{ color: '#00FF7F', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
                              ✅ AFTER
                            </div>
                            <div style={{ color: '#ffffff', fontSize: '13px', wordBreak: 'break-word' }}>
                              {typeof proposedValue === 'object' ? JSON.stringify(proposedValue, null, 2) : String(proposedValue || 'N/A')}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

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
                      {processingIds.has(proposal.id) ? '⏳ Processing...' : '✅ Approve & Apply'}
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
                      {processingIds.has(proposal.id) ? '⏳ Processing...' : '❌ Reject'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : establishments.length === 0 ? (
        <div className="admin-establishments-empty-nightlife">
          <h3 className="admin-establishments-empty-title-nightlife">
            📭 No Establishments Found
          </h3>
          <p className="admin-establishments-empty-text-nightlife">
            No establishments match the current filter.
          </p>
        </div>
      ) : (
        <div className="admin-establishments-grid-nightlife">
          {establishments.map((establishment) => (
            <div
              key={establishment.id}
              className="admin-establishment-card-nightlife"
            >
              {/* Status Badge */}
              <div
                className="admin-establishment-status-badge-nightlife"
                style={{
                  background: `${getStatusColor(establishment.status)}20`,
                  border: `2px solid ${getStatusColor(establishment.status)}`,
                  color: getStatusColor(establishment.status)
                }}
              >
                {getStatusIcon(establishment.status)} {establishment.status.toUpperCase()}
              </div>

              {/* Content Area - Flex 1 to push buttons to bottom */}
              <div className="admin-establishment-content-nightlife">
                {/* Main Establishment Info - Horizontal Layout */}
                <div className="admin-establishment-main-info-nightlife">
                  {/* Logo with Status-Colored Border */}
                  <div className="admin-establishment-logo-container-nightlife">
                    {establishment.logo_url ? (
                      <img
                        src={establishment.logo_url}
                        alt={`${establishment.name} logo`}
                        className="admin-establishment-logo-image-nightlife"
                      />
                    ) : (
                      <div className="admin-establishment-logo-placeholder-nightlife">
                        {establishment.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info Section */}
                  <div className="admin-establishment-info-nightlife">
                    <div>
                      <h3 className="admin-establishment-name-nightlife">
                        {establishment.name}
                      </h3>

                      <div className="admin-establishment-details-nightlife">
                        <div className="admin-establishment-detail-row-nightlife">
                          <span className="admin-establishment-detail-icon-nightlife">📍</span>
                          <span className="admin-establishment-detail-text-nightlife">{establishment.address}</span>
                        </div>

                        <div className="admin-establishment-detail-row-nightlife">
                          <span className="admin-establishment-detail-icon-nightlife">🌍</span>
                          <span className="admin-establishment-detail-text-nightlife">{establishment.zone}</span>
                        </div>

                        <div className="admin-establishment-detail-row-nightlife">
                          <span className="admin-establishment-detail-icon-nightlife">🏷️</span>
                          <span className="admin-establishment-detail-text-nightlife">{establishment.category?.name || 'Unknown'}</span>
                        </div>

                        <div className="admin-establishment-detail-row-nightlife">
                          <span className="admin-establishment-detail-icon-nightlife">👤</span>
                          <span className="admin-establishment-detail-text-nightlife">{establishment.user?.pseudonym || 'Unknown'}</span>
                        </div>
                      </div>

                      {/* Submission Info */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        color: '#888888',
                        marginTop: '8px'
                      }}>
                        <span>📅 {formatDate(establishment.created_at)}</span>
                        <span style={{ color: '#FFD700' }}>🏷️ {establishment.category?.name || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="admin-establishment-timestamps-nightlife">
                  Submitted: {formatDate(establishment.created_at)}
                  {establishment.updated_at !== establishment.created_at && (
                    <span> • Updated: {formatDate(establishment.updated_at)}</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className={`admin-establishment-actions-nightlife ${establishment.status === 'pending' ? 'admin-establishment-actions-pending-nightlife' : 'admin-establishment-actions-approved-nightlife'}`}>
                {/* Edit Button - Always available */}
                <button
                  onClick={() => setEditingEstablishment(establishment)}
                  className="admin-establishment-edit-button-nightlife"
                >
                  ✏️ Edit
                </button>

                {/* Approval Buttons - Only for pending */}
                {establishment.status === 'pending' && (
                  <div className="admin-establishment-approval-buttons-nightlife">
                    <button
                      onClick={() => handleApprove(establishment.id)}
                      disabled={processingIds.has(establishment.id)}
                      className="admin-establishment-approve-button-nightlife"
                    >
                      {processingIds.has(establishment.id) ? '⏳' : '✅'}
                    </button>

                    <button
                      onClick={() => handleReject(establishment.id)}
                      disabled={processingIds.has(establishment.id)}
                      className="admin-establishment-reject-button-nightlife"
                    >
                      {processingIds.has(establishment.id) ? '⏳' : '❌'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Establishment Modal (Add/Edit) */}
      {(showAddModal || editingEstablishment) && (
        <div className="admin-establishments-modal-overlay-nightlife">
          <EstablishmentForm
            initialData={editingEstablishment}
            onCancel={() => {
              setShowAddModal(false);
              setEditingEstablishment(null);
            }}
            onSubmit={handleSaveEstablishment}
          />
        </div>
      )}

    </div>
  );
};

export default EstablishmentsAdmin;