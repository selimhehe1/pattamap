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
  Eye
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const refreshComments = () => {
    setRefreshCounter(c => c + 1);
    setSelectedIds(new Set());
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
      const response = await secureFetch(`${API_URL}/api/admin/comments/${commentId}/approve`, { method: 'POST' });
      if (response.ok) refreshComments();
    } catch (error) {
      logger.error('Failed to approve comment:', error);
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(commentId); return s; });
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
      if (response.ok) refreshComments();
    } catch (error) {
      logger.error('Failed to reject comment:', error);
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(commentId); return s; });
    }
  };

  const handleDismissReports = async (commentId: number) => {
    setProcessingIds(prev => new Set(prev).add(commentId));
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await secureFetch(`${API_URL}/api/admin/comments/${commentId}/dismiss-reports`, { method: 'POST' });
      if (response.ok) refreshComments();
    } catch (error) {
      logger.error('Failed to dismiss reports:', error);
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(commentId); return s; });
    }
  };

  const toggleSelect = (commentId: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.has(commentId) ? newSet.delete(commentId) : newSet.add(commentId);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === comments.length ? new Set() : new Set(comments.map(c => c.id)));
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      await Promise.all(Array.from(selectedIds).map(id =>
        secureFetch(`${API_URL}/api/admin/comments/${id}/approve`, { method: 'POST' })
      ));
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
      await Promise.all(Array.from(selectedIds).map(id =>
        secureFetch(`${API_URL}/api/admin/comments/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason: 'Bulk rejected' }) })
      ));
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
      await Promise.all(Array.from(selectedIds).map(id =>
        secureFetch(`${API_URL}/api/admin/comments/${id}/dismiss-reports`, { method: 'POST' })
      ));
      refreshComments();
    } catch (error) {
      logger.error('Bulk dismiss failed:', error);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending': return 'cmd-card__status--pending';
      case 'approved': return 'cmd-card__status--approved';
      case 'rejected': return 'cmd-card__status--rejected';
      default: return '';
    }
  };

  const getCardClass = (comment: AdminComment) => {
    let base = 'cmd-card';
    if (selectedIds.has(comment.id)) base += ' cmd-card--selected';
    if (comment.reports && comment.reports.length > 0) base += ' cmd-card--reported';
    else if (comment.status === 'pending') base += ' cmd-card--pending';
    else if (comment.status === 'approved') base += ' cmd-card--approved';
    else if (comment.status === 'rejected') base += ' cmd-card--rejected';
    return base;
  };

  if (!user || !['admin', 'moderator'].includes(user.role)) {
    return (
      <div className="cmd-modal-overlay">
        <div className="cmd-modal cmd-modal--sm">
          <div className="cmd-modal__body" style={{ textAlign: 'center', padding: '48px' }}>
            <Ban size={48} style={{ color: 'var(--color-error)', marginBottom: '16px' }} />
            <h2 className="cmd-modal__title">{t('admin.accessDenied')}</h2>
            <p className="cmd-modal__subtitle">{t('admin.accessDeniedArea')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="command-content-section">
      {/* Breadcrumb */}
      <AdminBreadcrumb
        currentSection={t('admin.commentsManagement')}
        onBackToDashboard={() => onTabChange('overview')}
        icon={<MessageSquare size={16} />}
      />

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 className="command-header__title" style={{ marginBottom: '8px' }}>
          <MessageSquare size={28} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
          {t('admin.commentsManagement')}
        </h1>
        <p className="cmd-modal__subtitle">{t('admin.moderateCommentsReviews')}</p>
      </div>

      {/* Filter Tabs */}
      <div className="cmd-filters cmd-filters--scroll">
        {[
          { key: 'reported', label: t('admin.filterReported'), icon: <AlertTriangle size={14} />, variant: 'error' },
          { key: 'pending', label: t('admin.filterPending'), icon: <Loader2 size={14} />, variant: 'warning' },
          { key: 'approved', label: t('admin.filterApproved'), icon: <CheckCircle size={14} />, variant: 'success' },
          { key: 'rejected', label: t('admin.filterRejected'), icon: <XCircle size={14} />, variant: 'error' },
          { key: 'all', label: t('admin.filterAll'), icon: <ClipboardList size={14} />, variant: '' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`cmd-filter ${tab.variant ? `cmd-filter--${tab.variant}` : ''} ${filter === tab.key ? 'cmd-filter--active' : ''}`}
          >
            <span className="cmd-filter__icon">{tab.icon}</span>
            <span className="cmd-filter__label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="cmd-table__bulk-bar">
          <span className="cmd-table__bulk-count">
            {selectedIds.size} {t('admin.itemsSelected', 'item(s) selected')}
          </span>
          <div className="cmd-table__bulk-actions">
            <button
              onClick={handleBulkApprove}
              disabled={isBulkProcessing}
              className={`cmd-modal-btn cmd-modal-btn--success ${isBulkProcessing ? 'cmd-modal-btn--loading' : ''}`}
            >
              <CheckCircle size={14} /> {t('admin.approveAll', 'Approve All')}
            </button>
            <button
              onClick={handleBulkReject}
              disabled={isBulkProcessing}
              className={`cmd-modal-btn cmd-modal-btn--danger ${isBulkProcessing ? 'cmd-modal-btn--loading' : ''}`}
            >
              <XCircle size={14} /> {t('admin.rejectAll', 'Reject All')}
            </button>
            {filter === 'reported' && (
              <button
                onClick={handleBulkDismissReports}
                disabled={isBulkProcessing}
                className={`cmd-modal-btn cmd-modal-btn--secondary ${isBulkProcessing ? 'cmd-modal-btn--loading' : ''}`}
              >
                <BellOff size={14} /> {t('admin.dismissAllReports', 'Dismiss Reports')}
              </button>
            )}
            <button onClick={() => setSelectedIds(new Set())} className="cmd-modal-btn cmd-modal-btn--ghost">
              {t('admin.clearSelection', 'Clear')}
            </button>
          </div>
        </div>
      )}

      {/* Select All */}
      {!isLoading && comments.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '12px 16px', background: 'rgba(232, 121, 249, 0.05)', borderRadius: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={selectedIds.size === comments.length && comments.length > 0}
              onChange={toggleSelectAll}
              className="cmd-table__checkbox"
            />
            {t('admin.selectAll', 'Select All')} ({comments.length})
          </label>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <LoadingFallback message={t('admin.loadingComments')} variant="inline" />
      ) : comments.length === 0 ? (
        <div className="cmd-table__empty">
          <MailX size={48} className="cmd-table__empty-icon" />
          <h3 className="cmd-table__empty-title">{t('admin.noCommentsFound')}</h3>
          <p className="cmd-table__empty-text">{t('admin.noCommentsMatch')}</p>
        </div>
      ) : (
        <div className="cmd-card-grid">
          {comments.map((comment) => (
            <div key={comment.id} className={getCardClass(comment)}>
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selectedIds.has(comment.id)}
                onChange={() => toggleSelect(comment.id)}
                className="cmd-card__checkbox"
                aria-label={`Select comment by ${comment.user?.pseudonym || 'anonymous'}`}
              />

              {/* Status Badge */}
              <div className={`cmd-card__status ${getStatusClass(comment.status)}`}>
                <span className="cmd-card__status-dot" />
                {comment.status.toUpperCase()}
              </div>

              {/* Header */}
              <div className="cmd-card__header" style={{ paddingLeft: '32px' }}>
                <div className="cmd-card__header-left">
                  <div className="cmd-card__avatar">
                    {comment.user?.pseudonym?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="cmd-card__title-group">
                    <h3 className="cmd-card__title">{comment.user?.pseudonym || t('admin.anonymous')}</h3>
                    <p className="cmd-card__subtitle" style={{ color: 'var(--color-secondary)' }}>
                      {t('admin.reviewFor')} {comment.employee?.name}
                      {comment.employee?.nickname && ` "${comment.employee.nickname}"`}
                    </p>
                    <span className="cmd-card__meta">{formatDate(comment.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div className="cmd-card__rating">
                <StarRating rating={comment.rating} readonly size="medium" />
                <span className="cmd-card__rating-value">{(comment.rating || 0).toFixed(1)}/5</span>
              </div>

              {/* Comment Text */}
              <div className="cmd-card__content">
                <p className="cmd-card__text">{comment.comment}</p>
              </div>

              {/* Reports Section */}
              {comment.reports && comment.reports.length > 0 && (
                <div className="cmd-card__reports">
                  <div className="cmd-card__reports-header">
                    <AlertTriangle size={14} />
                    {t('admin.reports')} ({comment.reports.length})
                  </div>
                  <div className="cmd-card__reports-list">
                    {comment.reports.map((report) => (
                      <div key={report.id} className="cmd-card__report">
                        <div className="cmd-card__report-meta">
                          <span className="cmd-card__report-author">{report.user?.pseudonym || t('admin.anonymous')}</span>
                          <span className="cmd-card__report-date">{formatDate(report.created_at)}</span>
                        </div>
                        <p className="cmd-card__report-reason">{report.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="cmd-card__footer">
                {comment.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(comment.id)}
                      disabled={processingIds.has(comment.id)}
                      className={`cmd-card__action cmd-card__action--success ${processingIds.has(comment.id) ? 'cmd-card__action--loading' : ''}`}
                    >
                      <CheckCircle size={14} /> {t('admin.approve')}
                    </button>
                    <button
                      onClick={() => handleReject(comment.id)}
                      disabled={processingIds.has(comment.id)}
                      className={`cmd-card__action cmd-card__action--danger ${processingIds.has(comment.id) ? 'cmd-card__action--loading' : ''}`}
                    >
                      <XCircle size={14} /> {t('admin.reject')}
                    </button>
                  </>
                )}
                {comment.reports && comment.reports.length > 0 && (
                  <button
                    onClick={() => handleDismissReports(comment.id)}
                    disabled={processingIds.has(comment.id)}
                    className={`cmd-card__action cmd-card__action--warning ${processingIds.has(comment.id) ? 'cmd-card__action--loading' : ''}`}
                  >
                    <FileEdit size={14} /> {t('admin.dismissReports')}
                  </button>
                )}
                <button onClick={() => setSelectedComment(comment)} className="cmd-card__action cmd-card__action--primary">
                  <Eye size={14} /> {t('admin.viewDetails')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedComment && (
        <div className="cmd-modal-overlay cmd-modal-overlay--closable" onClick={() => setSelectedComment(null)} role="dialog" aria-modal="true">
          <div className="cmd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cmd-modal__header">
              <h2 className="cmd-modal__title">
                <MessageSquare size={20} className="cmd-modal__title-icon" />
                {t('admin.commentDetails')}
              </h2>
              <button className="cmd-modal__close" onClick={() => setSelectedComment(null)}>×</button>
            </div>

            <div className="cmd-modal__body">
              <div className="cmd-modal__info-row">
                <span className="cmd-modal__info-label">{t('admin.author')}</span>
                <span className="cmd-modal__info-value">{selectedComment.user?.pseudonym || t('admin.anonymous')}</span>
              </div>
              <div className="cmd-modal__info-row">
                <span className="cmd-modal__info-label">{t('admin.employee')}</span>
                <span className="cmd-modal__info-value">
                  {selectedComment.employee?.name}
                  {selectedComment.employee?.nickname && ` "${selectedComment.employee.nickname}"`}
                </span>
              </div>
              <div className="cmd-modal__info-row">
                <span className="cmd-modal__info-label">{t('admin.rating')}</span>
                <span className="cmd-modal__info-value">{selectedComment.rating}/5 {t('admin.stars')}</span>
              </div>
              <div className="cmd-modal__info-row">
                <span className="cmd-modal__info-label">{t('admin.status')}</span>
                <span className="cmd-modal__info-value">{selectedComment.status}</span>
              </div>
              <div className="cmd-modal__info-row">
                <span className="cmd-modal__info-label">{t('admin.created')}</span>
                <span className="cmd-modal__info-value">{formatDate(selectedComment.created_at)}</span>
              </div>

              <div className="cmd-modal__section">
                <h3 className="cmd-modal__section-title">{t('admin.comment')}</h3>
                <div className="cmd-modal__section-content">
                  <p className="cmd-card__text">{selectedComment.comment}</p>
                </div>
              </div>

              {selectedComment.reports && selectedComment.reports.length > 0 && (
                <div className="cmd-modal__section">
                  <h3 className="cmd-modal__section-title" style={{ color: 'var(--color-error)' }}>
                    <AlertTriangle size={14} style={{ marginRight: '8px' }} />
                    {t('admin.reports')} ({selectedComment.reports.length})
                  </h3>
                  {selectedComment.reports.map((report) => (
                    <div key={report.id} className="cmd-modal__alert cmd-modal__alert--error" style={{ marginBottom: '8px' }}>
                      <AlertTriangle size={16} className="cmd-modal__alert-icon" />
                      <div className="cmd-modal__alert-content">
                        <p className="cmd-modal__alert-title">
                          {report.user?.pseudonym || t('admin.anonymous')} - {formatDate(report.created_at)}
                        </p>
                        <p className="cmd-modal__alert-text">{report.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="cmd-modal__footer">
              <button className="cmd-modal-btn cmd-modal-btn--secondary" onClick={() => setSelectedComment(null)}>
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentsAdmin;
