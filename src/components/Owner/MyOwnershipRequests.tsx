import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Check, X, Loader2, FileText } from 'lucide-react';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import toast from '../../utils/toast';
import { logger } from '../../utils/logger';
import RequestOwnershipModal from '../Forms/RequestOwnershipModal';
import '../../styles/components/my-ownership-requests.css';

interface OwnershipRequest {
  id: string;
  user_id: string;
  establishment_id: string;
  status: 'pending' | 'approved' | 'rejected';
  documents_urls: string[];
  request_message?: string;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  establishment: {
    id: string;
    name: string;
    address: string;
    zone?: string;
    logo_url?: string;
  };
  reviewer?: {
    id: string;
    pseudonym: string;
  };
}

const MyOwnershipRequests: React.FC = () => {
  const { secureFetch } = useSecureFetch();
  const { user } = useAuth();
  const { openModal, closeModal } = useModal();

  const [requests, setRequests] = useState<OwnershipRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<OwnershipRequest | null>(null);

  // Fetch user's ownership requests
  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/ownership-requests/my`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch ownership requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      logger.error('Fetch ownership requests error:', error);
      toast.error('Failed to load your ownership requests');
    } finally {
      setIsLoading(false);
    }
  }, [secureFetch]);

  useEffect(() => {
    if (user?.account_type === 'establishment_owner') {
      fetchRequests();
    }
  }, [user, fetchRequests]);

  // Cancel/delete a pending request
  const handleCancelRequest = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to cancel this ownership request?')) {
      return;
    }

    try {
      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/ownership-requests/${requestId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel request');
      }

      toast.success('Ownership request cancelled successfully');
      fetchRequests(); // Refresh the list
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Cancel ownership request error:', error);
      toast.error(errorMessage || 'Failed to cancel request');
    }
  };

  // Open request ownership modal
  const handleOpenRequestModal = () => {
    openModal(
      'request-ownership-modal',
      RequestOwnershipModal,
      {
        onSuccess: () => {
          closeModal('request-ownership-modal');
          fetchRequests(); // Refresh the list
        }
      },
      {
        size: 'large',
        closeOnEscape: true,
        closeOnOverlayClick: false
      }
    );
  };

  // View request details
  const handleViewDetails = (request: OwnershipRequest) => {
    setSelectedRequest(selectedRequest?.id === request.id ? null : request);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge class
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      case 'pending':
      default:
        return 'status-pending';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <Check size={14} />;
      case 'rejected':
        return <X size={14} />;
      case 'pending':
      default:
        return <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />;
    }
  };

  // Check account type
  if (user?.account_type !== 'establishment_owner') {
    return (
      <div className="my-ownership-requests-container">
        <div className="empty-state">
          <h2>Access Denied</h2>
          <p>You must have an establishment owner account to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-ownership-requests-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>My Ownership Requests</h1>
          <p className="page-description">
            Track the status of your establishment ownership requests
          </p>
        </div>
        <button className="btn-new-request" onClick={handleOpenRequestModal}>
          + New Request
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your requests...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && requests.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><ClipboardList size={48} /></div>
          <h2>No Ownership Requests Yet</h2>
          <p>
            You haven't submitted any ownership requests yet.
            <br />
            Click "New Request" to claim ownership of your establishment.
          </p>
          <button className="btn-get-started" onClick={handleOpenRequestModal}>
            Submit Your First Request
          </button>
        </div>
      )}

      {/* Requests list */}
      {!isLoading && requests.length > 0 && (
        <div className="requests-list">
          {requests.map(request => (
            <div key={request.id} className="request-card">
              {/* Card header */}
              <div className="card-header">
                <div className="establishment-info">
                  {request.establishment.logo_url && (
                    <img
                      src={request.establishment.logo_url}
                      alt={request.establishment.name}
                      className="establishment-logo"
                    />
                  )}
                  <div className="establishment-details">
                    <h3>{request.establishment.name}</h3>
                    <p className="establishment-address">
                      {request.establishment.address}
                    </p>
                    {request.establishment.zone && (
                      <span className="zone-badge">{request.establishment.zone}</span>
                    )}
                  </div>
                </div>

                <div className="card-actions">
                  <div className={`status-badge ${getStatusClass(request.status)}`}>
                    <span className="status-icon">{getStatusIcon(request.status)}</span>
                    <span className="status-text">{request.status}</span>
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div className="card-body">
                <div className="request-meta">
                  <div className="meta-item">
                    <span className="meta-label">Submitted:</span>
                    <span className="meta-value">{formatDate(request.created_at)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Documents:</span>
                    <span className="meta-value">{request.documents_urls?.length || 0} file(s)</span>
                  </div>
                  {request.reviewed_at && (
                    <div className="meta-item">
                      <span className="meta-label">Reviewed:</span>
                      <span className="meta-value">{formatDate(request.reviewed_at)}</span>
                    </div>
                  )}
                  {request.reviewer && (
                    <div className="meta-item">
                      <span className="meta-label">Reviewer:</span>
                      <span className="meta-value">{request.reviewer.pseudonym}</span>
                    </div>
                  )}
                </div>

                {/* Admin notes (for rejected requests) */}
                {request.status === 'rejected' && request.admin_notes && (
                  <div className="admin-notes rejected">
                    <h4>Rejection Reason:</h4>
                    <p>{request.admin_notes}</p>
                  </div>
                )}

                {/* Admin notes (for approved requests) */}
                {request.status === 'approved' && request.admin_notes && (
                  <div className="admin-notes approved">
                    <h4>Admin Notes:</h4>
                    <p>{request.admin_notes}</p>
                  </div>
                )}

                {/* Expandable details */}
                {selectedRequest?.id === request.id && (
                  <div className="request-details">
                    {/* Request message */}
                    {request.request_message && (
                      <div className="detail-section">
                        <h4>Your Message:</h4>
                        <p>{request.request_message}</p>
                      </div>
                    )}

                    {/* Documents */}
                    {request.documents_urls && request.documents_urls.length > 0 && (
                      <div className="detail-section">
                        <h4>Submitted Documents:</h4>
                        <div className="documents-grid">
                          {request.documents_urls.map((url, index) => (
                            <a
                              key={index}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="document-link"
                            >
                              <div className="document-thumbnail">
                                {url.toLowerCase().endsWith('.pdf') ? (
                                  <span className="pdf-icon"><FileText size={24} /></span>
                                ) : (
                                  <img src={url} alt={`Document ${index + 1}`} />
                                )}
                              </div>
                              <span className="document-label">Document {index + 1}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card footer */}
              <div className="card-footer">
                <button
                  className="btn-view-details"
                  onClick={() => handleViewDetails(request)}
                >
                  {selectedRequest?.id === request.id ? 'Hide Details' : 'View Details'}
                </button>

                {request.status === 'pending' && (
                  <button
                    className="btn-cancel"
                    onClick={() => handleCancelRequest(request.id)}
                  >
                    Cancel Request
                  </button>
                )}

                {request.status === 'rejected' && (
                  <button
                    className="btn-resubmit"
                    onClick={handleOpenRequestModal}
                  >
                    Submit New Request
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info section */}
      {!isLoading && requests.length > 0 && (
        <div className="info-section">
          <h3>About Ownership Requests</h3>
          <div className="info-grid">
            <div className="info-card">
              <div className="info-icon"><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
              <h4>Pending</h4>
              <p>Your request is being reviewed by administrators. This typically takes 48-72 hours.</p>
            </div>
            <div className="info-card">
              <div className="info-icon"><Check size={24} /></div>
              <h4>Approved</h4>
              <p>Congratulations! You can now manage your establishment from the "My Establishments" page.</p>
            </div>
            <div className="info-card">
              <div className="info-icon"><X size={24} /></div>
              <h4>Rejected</h4>
              <p>Your request was declined. Review the admin notes and submit a new request with better documentation.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOwnershipRequests;
