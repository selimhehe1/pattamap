import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import StarRating from '../Common/StarRating';
import AdminBreadcrumb from '../Common/AdminBreadcrumb';
import LoadingFallback from '../Common/LoadingFallback';
import { logger } from '../../utils/logger';
import {
  Ban,
  MessageSquare,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  ClipboardList,
  BellOff,
  MailX,
  FileEdit,
  Eye,
  HelpCircle
} from 'lucide-react';

interface AdminComment {
  id: number;
  user_id: number;
  employee_id: number;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    pseudonym: string;
  };
  employee?: {
    id: number;
    name: string;
    nickname?: string;
  };
  reports?: Array<{
    id: number;
    user_id: number;
    reason: string;
    created_at: string;
    user?: {
      pseudonym: string;
    };
  }>;
}

interface CommentsAdminProps {
  onTabChange: (tab: string) => void;
}

const CommentsAdmin: React.FC<CommentsAdminProps> = ({ onTabChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reported' | 'approved' | 'rejected'>('reported');
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [selectedComment, setSelectedComment] = useState<AdminComment | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Phase 3: Bulk actions state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Helper function to trigger refresh
  const refreshComments = () => {
    setRefreshCounter(c => c + 1);
    setSelectedIds(new Set()); // Clear selection on refresh
  };

  useEffect(() => {
    const loadComments = async () => {
      setIsLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const response = await secureFetch(`${API_URL}/api/admin/comments?status=${filter === 'all' ? '' : filter}`);

        if (response.ok) {
          const data = await response.json();
          setComments(data.comments || []);
        }
      } catch (error) {
        logger.error('Failed to load comments:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadComments();
  }, [filter, secureFetch, refreshCounter]);

  const handleApprove = async (commentId: number) => {
    setProcessingIds(prev => new Set(prev).add(commentId));
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await secureFetch(`${API_URL}/api/admin/comments/${commentId}/approve`, {
        method: 'POST'
      });

      if (response.ok) {
        refreshComments(); // Reload list
      }
    } catch (error) {
      logger.error('Failed to approve comment:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  const handleReject = async (commentId: number, reason?: string) => {
    setProcessingIds(prev => new Set(prev).add(commentId));
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await secureFetch(`${API_URL}/api/admin/comments/${commentId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        refreshComments(); // Reload list
      }
    } catch (error) {
      logger.error('Failed to reject comment:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  const handleDismissReports = async (commentId: number) => {
    setProcessingIds(prev => new Set(prev).add(commentId));
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await secureFetch(`${API_URL}/api/admin/comments/${commentId}/dismiss-reports`, {
        method: 'POST'
      });

      if (response.ok) {
        refreshComments(); // Reload list
      }
    } catch (error) {
      logger.error('Failed to dismiss reports:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  // Phase 3: Bulk action handlers
  const toggleSelect = (commentId: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === comments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(comments.map(c => c.id)));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const promises = Array.from(selectedIds).map(id =>
        secureFetch(`${API_URL}/api/admin/comments/${id}/approve`, { method: 'POST' })
      );
      await Promise.all(promises);
      refreshComments();
    } catch (error) {
      logger.error('Bulk approve failed:', error);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const promises = Array.from(selectedIds).map(id =>
        secureFetch(`${API_URL}/api/admin/comments/${id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: 'Bulk rejected by admin' })
        })
      );
      await Promise.all(promises);
      refreshComments();
    } catch (error) {
      logger.error('Bulk reject failed:', error);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDismissReports = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const promises = Array.from(selectedIds).map(id =>
        secureFetch(`${API_URL}/api/admin/comments/${id}/dismiss-reports`, { method: 'POST' })
      );
      await Promise.all(promises);
      refreshComments();
    } catch (error) {
      logger.error('Bulk dismiss reports failed:', error);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Loader2 size={12} style={{ verticalAlign: 'middle' }} />;
      case 'approved': return <CheckCircle size={12} style={{ verticalAlign: 'middle' }} />;
      case 'rejected': return <XCircle size={12} style={{ verticalAlign: 'middle' }} />;
      default: return <HelpCircle size={12} style={{ verticalAlign: 'middle' }} />;
    }
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
        <div className="bg-nightlife-glass-card"
          style={{
            padding: '40px',
            textAlign: 'center'
          }}>
          <h2 style={{
            color: '#C19A6B',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0 0 15px 0'
          }}>
            <Ban size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            {t('admin.accessDenied')}
          </h2>
          <p style={{ color: '#cccccc', fontSize: '16px' }}>
            {t('admin.accessDeniedArea')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-nightlife-gradient-main"
      style={{
        minHeight: '100vh',
        padding: '30px',
        color: 'white'
      }}>
      {/* Breadcrumb Navigation */}
      <AdminBreadcrumb
        currentSection={t('admin.commentsManagement')}
        onBackToDashboard={() => onTabChange('overview')}
        icon={<MessageSquare size={16} />}
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
          <MessageSquare size={28} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          {t('admin.commentsManagement')}
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#cccccc',
          margin: 0
        }}>
          {t('admin.moderateCommentsReviews')}
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
          { key: 'reported', label: t('admin.filterReported'), icon: <AlertTriangle size={12} /> },
          { key: 'pending', label: t('admin.filterPending'), icon: <Loader2 size={12} /> },
          { key: 'approved', label: t('admin.filterApproved'), icon: <CheckCircle size={12} /> },
          { key: 'rejected', label: t('admin.filterRejected'), icon: <XCircle size={12} /> },
          { key: 'all', label: t('admin.filterAll'), icon: <ClipboardList size={12} /> }
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

      {/* Bulk Action Bar - Phase 3 */}
      {selectedIds.size > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(193, 154, 107, 0.15), rgba(255, 215, 0, 0.1))',
          border: '2px solid rgba(193, 154, 107, 0.5)',
          borderRadius: '12px',
          flexWrap: 'wrap'
        }}>
          <span style={{ color: '#C19A6B', fontWeight: 'bold', marginRight: 'auto' }}>
            {selectedIds.size} {t('admin.itemsSelected', 'item(s) selected')}
          </span>
          <button
            onClick={handleBulkApprove}
            disabled={isBulkProcessing}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: 'white',
              cursor: isBulkProcessing ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '13px',
              opacity: isBulkProcessing ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {isBulkProcessing ? '...' : <><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.approveAll', 'Approve All')}</>}
          </button>
          <button
            onClick={handleBulkReject}
            disabled={isBulkProcessing}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              color: 'white',
              cursor: isBulkProcessing ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '13px',
              opacity: isBulkProcessing ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {isBulkProcessing ? '...' : <><XCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.rejectAll', 'Reject All')}</>}
          </button>
          {filter === 'reported' && (
            <button
              onClick={handleBulkDismissReports}
              disabled={isBulkProcessing}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                cursor: isBulkProcessing ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
                opacity: isBulkProcessing ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {isBulkProcessing ? '...' : <><BellOff size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.dismissAllReports', 'Dismiss Reports')}</>}
            </button>
          )}
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              background: 'transparent',
              color: '#cccccc',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px',
              transition: 'all 0.2s ease'
            }}
          >
            {t('admin.clearSelection', 'Clear')}
          </button>
        </div>
      )}

      {/* Select All Header - Phase 3 */}
      {!isLoading && comments.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'rgba(193, 154, 107, 0.05)',
          borderRadius: '8px'
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            color: '#cccccc',
            fontSize: '14px'
          }}>
            <input
              type="checkbox"
              checked={selectedIds.size === comments.length && comments.length > 0}
              onChange={toggleSelectAll}
              style={{
                width: '18px',
                height: '18px',
                accentColor: '#C19A6B',
                cursor: 'pointer'
              }}
            />
            {t('admin.selectAll', 'Select All')} ({comments.length})
          </label>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <LoadingFallback message={t('admin.loadingComments')} variant="inline" />
      ) : comments.length === 0 ? (
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
            <MailX size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            {t('admin.noCommentsFound')}
          </h3>
          <p style={{
            color: '#cccccc',
            fontSize: '16px'
          }}>
            {t('admin.noCommentsMatch')}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                background: selectedIds.has(comment.id)
                  ? 'linear-gradient(135deg, rgba(193, 154, 107,0.2), rgba(255, 215, 0, 0.1))'
                  : 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
                borderRadius: '20px',
                border: selectedIds.has(comment.id)
                  ? '2px solid #C19A6B'
                  : comment.reports && comment.reports.length > 0
                    ? '2px solid #FF4757'
                    : '2px solid rgba(193, 154, 107,0.3)',
                padding: '25px',
                position: 'relative',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Selection Checkbox - Phase 3 Bulk Actions */}
              <label
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 5
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(comment.id)}
                  onChange={() => toggleSelect(comment.id)}
                  style={{
                    width: '20px',
                    height: '20px',
                    accentColor: '#C19A6B',
                    cursor: 'pointer'
                  }}
                  aria-label={`Select comment by ${comment.user?.pseudonym || 'anonymous'}`}
                />
              </label>

              {/* Status Badge */}
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                padding: '8px 15px',
                borderRadius: '20px',
                background: `${getStatusColor(comment.status)}20`,
                border: `2px solid ${getStatusColor(comment.status)}`,
                color: getStatusColor(comment.status),
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                {getStatusIcon(comment.status)} {comment.status.toUpperCase()}
              </div>

              {/* Reports Badge */}
              {comment.reports && comment.reports.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '60px',
                  right: '20px',
                  padding: '6px 12px',
                  borderRadius: '15px',
                  background: 'rgba(255,71,87,0.2)',
                  border: '2px solid #FF4757',
                  color: '#FF4757',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <AlertTriangle size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  {comment.reports.length} {t('admin.report', { count: comment.reports.length })}
                </div>
              )}

              {/* Comment Header */}
              <div style={{ marginBottom: '20px', paddingRight: '150px', paddingLeft: '40px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #C19A6B, #FFD700)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '18px'
                  }}>
                    {comment.user?.pseudonym?.charAt(0).toUpperCase() || '?'}
                  </div>
                  
                  <div>
                    <div style={{
                      color: '#ffffff',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>
                      {comment.user?.pseudonym || t('admin.anonymous')}
                    </div>
                    <div style={{
                      color: '#cccccc',
                      fontSize: '12px',
                      marginBottom: '5px'
                    }}>
                      {formatDate(comment.created_at)}
                    </div>
                    <div style={{
                      color: '#00E5FF',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      {t('admin.reviewFor')} {comment.employee?.name}
                      {comment.employee?.nickname && ` "${comment.employee.nickname}"`}
                    </div>
                  </div>
                </div>

                {/* Rating */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '15px'
                }}>
                  <StarRating
                    rating={comment.rating}
                    readonly={true}
                    size="medium"
                  />
                  <span style={{
                    color: '#FFD700',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {(comment.rating || 0).toFixed(1)}/5
                  </span>
                </div>

                {/* Comment Text */}
                <div style={{
                  color: '#ffffff',
                  fontSize: '16px',
                  lineHeight: '1.6',
                  marginBottom: '20px',
                  padding: '15px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '12px',
                  border: '1px solid rgba(193, 154, 107,0.2)'
                }}>
                  {comment.comment}
                </div>

                {/* Reports Section */}
                {comment.reports && comment.reports.length > 0 && (
                  <div style={{
                    background: 'rgba(255,71,87,0.1)',
                    border: '1px solid #FF4757',
                    borderRadius: '12px',
                    padding: '15px',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{
                      color: '#FF4757',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      margin: '0 0 10px 0'
                    }}>
                      <AlertTriangle size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      {t('admin.reports')} ({comment.reports.length})
                    </h4>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {comment.reports.map((report, _index) => (
                        <div
                          key={report.id}
                          style={{
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '8px',
                            padding: '10px',
                            fontSize: '14px'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '5px'
                          }}>
                            <span style={{
                              color: '#ffffff',
                              fontWeight: 'bold'
                            }}>
                              {report.user?.pseudonym || t('admin.anonymous')}
                            </span>
                            <span style={{
                              color: '#cccccc',
                              fontSize: '12px'
                            }}>
                              {formatDate(report.created_at)}
                            </span>
                          </div>
                          <div style={{
                            color: '#FF4757',
                            lineHeight: '1.5'
                          }}>
                            {report.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(193, 154, 107,0.3)',
                flexWrap: 'wrap'
              }}>
                {comment.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(comment.id)}
                      disabled={processingIds.has(comment.id)}
                      style={{
                        flex: 1,
                        minWidth: '120px',
                        padding: '12px 20px',
                        background: processingIds.has(comment.id)
                          ? 'linear-gradient(45deg, #666666, #888888)'
                          : 'linear-gradient(45deg, #00FF7F, #00CC65)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: processingIds.has(comment.id) ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease',
                        opacity: processingIds.has(comment.id) ? 0.7 : 1
                      }}
                    >
                      {processingIds.has(comment.id) ? <><Loader2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.approving')}</> : <><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.approve')}</>}
                    </button>

                    <button
                      onClick={() => handleReject(comment.id)}
                      disabled={processingIds.has(comment.id)}
                      style={{
                        flex: 1,
                        minWidth: '120px',
                        padding: '12px 20px',
                        background: processingIds.has(comment.id)
                          ? 'linear-gradient(45deg, #666666, #888888)'
                          : 'linear-gradient(45deg, #FF4757, #FF3742)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: processingIds.has(comment.id) ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease',
                        opacity: processingIds.has(comment.id) ? 0.7 : 1
                      }}
                    >
                      {processingIds.has(comment.id) ? <><Loader2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.rejecting')}</> : <><XCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.reject')}</>}
                    </button>
                  </>
                )}

                {comment.reports && comment.reports.length > 0 && (
                  <button
                    onClick={() => handleDismissReports(comment.id)}
                    disabled={processingIds.has(comment.id)}
                    style={{
                      flex: 1,
                      minWidth: '150px',
                      padding: '12px 20px',
                      background: processingIds.has(comment.id)
                        ? 'linear-gradient(45deg, #666666, #888888)'
                        : 'linear-gradient(45deg, #FFD700, #FFA500)',
                      color: processingIds.has(comment.id) ? 'white' : '#000',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: processingIds.has(comment.id) ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      opacity: processingIds.has(comment.id) ? 0.7 : 1
                    }}
                  >
                    {processingIds.has(comment.id) ? <><Loader2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.dismissing')}</> : <><FileEdit size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.dismissReports')}</>}
                  </button>
                )}

                <button
                  onClick={() => setSelectedComment(comment)}
                  style={{
                    padding: '12px 20px',
                    background: 'linear-gradient(45deg, #00E5FF, #0080FF)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,255,255,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Eye size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  {t('admin.viewDetails')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment Detail Modal */}
      {selectedComment && (
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
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            padding: '30px'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedComment(null)}
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
                zIndex: 10
              }}
            >
              ×
            </button>

            <h2 style={{
              color: '#C19A6B',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: '0 0 20px 0'
            }}>
              {t('admin.commentDetails')}
            </h2>

            {/* Full comment details here */}
            <div style={{ color: 'white' }}>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#C19A6B' }}>{t('admin.author')}</strong> {selectedComment.user?.pseudonym || t('admin.anonymous')}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#C19A6B' }}>{t('admin.employee')}</strong> {selectedComment.employee?.name}
                {selectedComment.employee?.nickname && ` "${selectedComment.employee.nickname}"`}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#C19A6B' }}>{t('admin.rating')}</strong> {selectedComment.rating}/5 {t('admin.stars')}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#C19A6B' }}>{t('admin.status')}</strong> {selectedComment.status}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#C19A6B' }}>{t('admin.created')}</strong> {formatDate(selectedComment.created_at)}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#C19A6B' }}>{t('admin.comment')}</strong>
                <div style={{
                  marginTop: '10px',
                  padding: '15px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '10px',
                  lineHeight: '1.6'
                }}>
                  {selectedComment.comment}
                </div>
              </div>

              {/* Reports in modal */}
              {selectedComment.reports && selectedComment.reports.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <strong style={{ color: '#C19A6B' }}>{t('admin.reports')}</strong>
                  <div style={{ marginTop: '10px' }}>
                    {selectedComment.reports.map((report) => (
                      <div
                        key={report.id}
                        style={{
                          background: 'rgba(255,71,87,0.1)',
                          border: '1px solid #FF4757',
                          borderRadius: '8px',
                          padding: '10px',
                          marginBottom: '10px'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                          {report.user?.pseudonym || t('admin.anonymous')} - {formatDate(report.created_at)}
                        </div>
                        <div style={{ color: '#FF4757' }}>
                          {report.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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

export default CommentsAdmin;