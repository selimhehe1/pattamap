/**
 * 🆕 v10.3 Phase 2 - VIP Verification Admin Panel
 *
 * Admin panel for verifying cash payments for VIP subscriptions
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useNavigateWithTransition } from '../../hooks/useNavigateWithTransition';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useDialog } from '../../hooks/useDialog';
import toast from '../../utils/toast';
import { logger } from '../../utils/logger';
import {
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  MailOpen,
  User,
  Building2,
  Banknote
} from 'lucide-react';
import './VIPVerificationAdmin.css';

interface VIPTransaction {
  id: string;
  subscription_type: 'employee' | 'establishment';
  subscription_id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    id: string;
    pseudonym: string;
    email: string;
  };
  employee?: {
    id: string;
    name: string;
    nickname?: string;
  };
  establishment?: {
    id: string;
    name: string;
  };
  subscription?: {
    tier: string;
    duration: number;
    starts_at: string;
    expires_at: string;
  };
}

type FilterType = 'pending' | 'all' | 'completed';

const VIPVerificationAdmin: React.FC = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigateWithTransition();
  const { secureFetch } = useSecureFetch();
  const dialog = useDialog();
  const [searchParams, setSearchParams] = useSearchParams();

  const [transactions, setTransactions] = useState<VIPTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  // Phase 3: Bulk actions state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Get filter from URL params, default to 'pending'
  const getFilterFromParams = (): FilterType => {
    const status = searchParams.get('status');
    if (status === 'completed' || status === 'all' || status === 'pending') {
      return status;
    }
    return 'pending';
  };

  const filter = getFilterFromParams();

  // Update URL when filter changes
  const setFilter = (newFilter: FilterType) => {
    setSearchParams({ status: newFilter });
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Note: This endpoint needs to be created in backend
      // For now, we'll fetch from a generic endpoint that returns cash payment transactions
      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/admin/vip/transactions?payment_method=cash&status=${filter === 'all' ? '' : filter}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch VIP transactions');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error fetching VIP transactions:', error);
      setError(errorMessage || t('vipVerification.errorFetching', 'Failed to load VIP transactions'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (transactionId: string) => {
    const notes = await dialog.prompt(t('vipVerification.enterNotes', 'Enter verification notes (optional):'), {
      required: false,
      variant: 'info'
    });
    if (notes === null) return; // User cancelled

    try {
      setVerifying(transactionId);
      setError(null);

      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/admin/vip/verify-payment/${transactionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            admin_notes: notes || 'Cash payment verified by admin',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Verification failed');
      }

      // Refresh transactions
      await fetchTransactions();

      toast.success(t('vipVerification.verifySuccess', 'Payment verified successfully!'));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error verifying payment:', error);
      toast.error(errorMessage || t('vipVerification.verifyError', 'Failed to verify payment'));
    } finally {
      setVerifying(null);
    }
  };

  const handleReject = async (transactionId: string) => {
    const reason = await dialog.prompt(t('vipVerification.enterReason', 'Enter rejection reason:'), {
      required: true,
      minLength: 10,
      variant: 'danger'
    });
    if (!reason) {
      return; // User cancelled
    }

    const confirmed = await dialog.confirm(
      t('vipVerification.confirmReject', 'Are you sure you want to reject this payment? This action cannot be undone.'),
      {
        variant: 'danger',
        confirmText: t('common.confirm', 'Confirm'),
        cancelText: t('common.cancel', 'Cancel')
      }
    );

    if (!confirmed) return;

    try {
      setVerifying(transactionId);
      setError(null);

      // Note: This endpoint needs to be created in backend
      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/admin/vip/reject-payment/${transactionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            admin_notes: reason,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Rejection failed');
      }

      // Refresh transactions
      await fetchTransactions();

      toast.success(t('vipVerification.rejectSuccess', 'Payment rejected successfully'));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error rejecting payment:', error);
      toast.error(errorMessage || t('vipVerification.rejectError', 'Failed to reject payment'));
    } finally {
      setVerifying(null);
    }
  };

  // Phase 3: Bulk action handlers
  const toggleSelect = (transactionId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const pendingTransactions = transactions.filter(t => t.payment_status === 'pending');
    if (selectedIds.size === pendingTransactions.length && pendingTransactions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingTransactions.map(t => t.id)));
    }
  };

  const handleBulkVerify = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = await dialog.confirm(
      t('vipVerification.bulkConfirm', `Are you sure you want to verify ${selectedIds.size} payment(s)?`),
      {
        variant: 'info',
        confirmText: t('common.confirm', 'Confirm'),
        cancelText: t('common.cancel', 'Cancel')
      }
    );

    if (!confirmed) return;

    setIsBulkProcessing(true);

    try {
      const promises = Array.from(selectedIds).map(id =>
        secureFetch(
          `${import.meta.env.VITE_API_URL}/api/admin/vip/verify-payment/${id}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_notes: 'Bulk verified by admin' }),
          }
        )
      );
      await Promise.all(promises);
      toast.success(t('vipVerification.bulkVerifySuccess', `${selectedIds.size} payment(s) verified successfully!`));
      setSelectedIds(new Set());
      await fetchTransactions();
    } catch (error) {
      logger.error('Bulk verify failed:', error);
      toast.error(t('vipVerification.bulkVerifyError', 'Failed to verify some payments'));
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge pending"><Clock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('vipVerification.statusPending', 'Pending')}</span>;
      case 'completed':
        return <span className="status-badge completed"><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('vipVerification.statusCompleted', 'Completed')}</span>;
      case 'failed':
        return <span className="status-badge failed"><XCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('vipVerification.statusFailed', 'Failed')}</span>;
      case 'refunded':
        return <span className="status-badge refunded"><RefreshCw size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('vipVerification.statusRefunded', 'Refunded')}</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  // Security: Redirect non-admin users (only after auth is loaded)
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load

    if (!user) {
      navigate('/login', { replace: true });
    } else if (user.role !== 'admin' && user.role !== 'moderator') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Fetch transactions when filter changes (only if authorized)
  useEffect(() => {
    if (authLoading || !user) return; // Don't fetch until auth is loaded and user exists
    if (user.role !== 'admin' && user.role !== 'moderator') return; // Don't fetch if not authorized

    const loadTransactions = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await secureFetch(
          `${import.meta.env.VITE_API_URL}/api/admin/vip/transactions?payment_method=cash&status=${filter === 'all' ? '' : filter}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch VIP transactions');
        }

        const data = await response.json();
        setTransactions(data.transactions || []);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error fetching VIP transactions:', error);
        setError(errorMessage || t('vipVerification.errorFetching', 'Failed to load VIP transactions'));
      } finally {
        setLoading(false);
      }
    };
    loadTransactions();
  }, [filter, authLoading, user, secureFetch, t]);

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="vip-verification-admin">
        <h2>{t('vipVerification.title', 'VIP Payment Verification')}</h2>
        <div className="loading-state">
          <div className="spinner"><Clock size={32} /></div>
          <p>{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authorized
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return null;
  }

  if (loading && transactions.length === 0) {
    return (
      <div className="vip-verification-admin">
        <h2>{t('vipVerification.title', 'VIP Payment Verification')}</h2>
        <div className="loading-state">
          <div className="spinner"><Clock size={32} /></div>
          <p>{t('vipVerification.loading', 'Loading transactions...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vip-verification-admin">
      <div className="verification-header">
        <h2>{t('vipVerification.title', 'VIP Payment Verification')}</h2>
        <p className="subtitle">{t('vipVerification.subtitle', 'Verify cash payments for VIP subscriptions')}</p>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          {t('vipVerification.filterPending', 'Pending')}
          {transactions.filter(t => t.payment_status === 'pending').length > 0 && (
            <span className="count-badge">
              {transactions.filter(t => t.payment_status === 'pending').length}
            </span>
          )}
        </button>
        <button
          className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          {t('vipVerification.filterCompleted', 'Completed')}
        </button>
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          {t('vipVerification.filterAll', 'All')}
        </button>
      </div>

      {/* Bulk Action Bar - Phase 3 */}
      {selectedIds.size > 0 && (
        <div className="bulk-action-bar">
          <span className="bulk-count">
            {selectedIds.size} {t('vipVerification.itemsSelected', 'payment(s) selected')}
          </span>
          <button
            onClick={handleBulkVerify}
            disabled={isBulkProcessing}
            className="bulk-verify-button"
          >
            {isBulkProcessing ? '...' : <><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('vipVerification.verifyAll', 'Verify All')}</>}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="bulk-clear-button"
          >
            {t('vipVerification.clearSelection', 'Clear')}
          </button>
        </div>
      )}

      {/* Select All Header - Phase 3 */}
      {!loading && transactions.filter(t => t.payment_status === 'pending').length > 0 && filter === 'pending' && (
        <div className="select-all-header">
          <label className="select-all-label">
            <input
              type="checkbox"
              checked={selectedIds.size === transactions.filter(t => t.payment_status === 'pending').length && transactions.filter(t => t.payment_status === 'pending').length > 0}
              onChange={toggleSelectAll}
              className="select-all-checkbox"
            />
            {t('vipVerification.selectAll', 'Select All Pending')} ({transactions.filter(t => t.payment_status === 'pending').length})
          </label>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <p><XCircle size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />{error}</p>
          <button onClick={fetchTransactions} className="retry-button">
            {t('vipVerification.retry', 'Retry')}
          </button>
        </div>
      )}

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon"><MailOpen size={48} /></p>
          <p className="empty-message">
            {filter === 'pending'
              ? t('vipVerification.noPending', 'No pending verifications')
              : t('vipVerification.noTransactions', 'No transactions found')}
          </p>
        </div>
      ) : (
        <div className="transactions-grid">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className={`transaction-card ${transaction.payment_status} ${selectedIds.has(transaction.id) ? 'selected' : ''}`}
            >
              {/* Selection Checkbox - Phase 3 Bulk Actions */}
              {transaction.payment_status === 'pending' && (
                <label className="transaction-checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(transaction.id)}
                    onChange={() => toggleSelect(transaction.id)}
                    className="transaction-checkbox"
                    aria-label={`Select transaction for ${transaction.employee?.name || transaction.establishment?.name || 'unknown'}`}
                  />
                </label>
              )}

              {/* Transaction Header */}
              <div className="transaction-header">
                <div className="transaction-type">
                  {transaction.subscription_type === 'employee' ? <User size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> : <Building2 size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
                  {transaction.subscription_type === 'employee'
                    ? t('vipVerification.typeEmployee', 'Employee VIP')
                    : t('vipVerification.typeEstablishment', 'Establishment VIP')}
                </div>
                {getStatusBadge(transaction.payment_status)}
              </div>

              {/* Entity Info */}
              <div className="entity-info">
                <h4>
                  {transaction.subscription_type === 'employee'
                    ? transaction.employee?.nickname || transaction.employee?.name
                    : transaction.establishment?.name}
                </h4>
                <p className="entity-detail">
                  {t('vipVerification.purchasedBy', 'Purchased by')}: {transaction.user?.pseudonym || 'Unknown'}
                </p>
              </div>

              {/* Subscription Details */}
              {transaction.subscription && (
                <div className="subscription-details">
                  <div className="detail-row">
                    <span className="detail-label">{t('vipVerification.tier', 'Tier')}:</span>
                    <span className="detail-value">
                      {transaction.subscription.tier === 'basic'
                        ? t('vipPurchase.tierBasic', 'Basic')
                        : t('vipPurchase.tierPremium', 'Premium')}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">{t('vipVerification.duration', 'Duration')}:</span>
                    <span className="detail-value">
                      {transaction.subscription.duration} {t('vipPurchase.days', 'days')}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">{t('vipVerification.expires', 'Expires')}:</span>
                    <span className="detail-value">
                      {new Date(transaction.subscription.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Details */}
              <div className="payment-details">
                <div className="amount">
                  ฿{transaction.amount.toLocaleString()} {transaction.currency}
                </div>
                <div className="payment-method">
                  <Banknote size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('vipPurchase.paymentCash', 'Cash Payment')}
                </div>
                <div className="created-date">
                  {t('vipVerification.created', 'Created')}: {new Date(transaction.created_at).toLocaleString()}
                </div>
              </div>

              {/* Admin Notes */}
              {transaction.admin_notes && (
                <div className="admin-notes">
                  <strong>{t('vipVerification.adminNotes', 'Admin Notes')}:</strong>
                  <p>{transaction.admin_notes}</p>
                </div>
              )}

              {/* Actions */}
              {transaction.payment_status === 'pending' && (
                <div className="transaction-actions">
                  <button
                    className="verify-button"
                    onClick={() => handleVerify(transaction.id)}
                    disabled={verifying === transaction.id}
                  >
                    {verifying === transaction.id ? (
                      <><Clock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('vipVerification.verifying', 'Verifying...')}</>
                    ) : (
                      <><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('vipVerification.verify', 'Verify Payment')}</>
                    )}
                  </button>
                  <button
                    className="reject-button"
                    onClick={() => handleReject(transaction.id)}
                    disabled={verifying === transaction.id}
                  >
                    <XCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('vipVerification.reject', 'Reject')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Refresh Button */}
      <div className="refresh-section">
        <button onClick={fetchTransactions} className="refresh-button" disabled={loading}>
          {loading ? <Clock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> : <RefreshCw size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />} {t('vipVerification.refresh', 'Refresh')}
        </button>
      </div>
    </div>
  );
};

export default VIPVerificationAdmin;
