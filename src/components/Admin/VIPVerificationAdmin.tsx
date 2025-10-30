/**
 * 🆕 v10.3 Phase 2 - VIP Verification Admin Panel
 *
 * Admin panel for verifying cash payments for VIP subscriptions
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useDialog } from '../../hooks/useDialog';
import toast from '../../utils/toast';
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
  const { secureFetch } = useSecureFetch();
  const dialog = useDialog();

  const [transactions, setTransactions] = useState<VIPTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Note: This endpoint needs to be created in backend
      // For now, we'll fetch from a generic endpoint that returns cash payment transactions
      const response = await secureFetch(
        `${process.env.REACT_APP_API_URL}/api/admin/vip/transactions?payment_method=cash&status=${filter === 'all' ? '' : filter}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch VIP transactions');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err: any) {
      console.error('Error fetching VIP transactions:', err);
      setError(err.message || t('vipVerification.errorFetching', 'Failed to load VIP transactions'));
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
        `${process.env.REACT_APP_API_URL}/api/admin/vip/verify-payment/${transactionId}`,
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
    } catch (err: any) {
      console.error('Error verifying payment:', err);
      toast.error(err.message || t('vipVerification.verifyError', 'Failed to verify payment'));
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
        `${process.env.REACT_APP_API_URL}/api/admin/vip/reject-payment/${transactionId}`,
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
    } catch (err: any) {
      console.error('Error rejecting payment:', err);
      toast.error(err.message || t('vipVerification.rejectError', 'Failed to reject payment'));
    } finally {
      setVerifying(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge pending">⏳ {t('vipVerification.statusPending', 'Pending')}</span>;
      case 'completed':
        return <span className="status-badge completed">✅ {t('vipVerification.statusCompleted', 'Completed')}</span>;
      case 'failed':
        return <span className="status-badge failed">❌ {t('vipVerification.statusFailed', 'Failed')}</span>;
      case 'refunded':
        return <span className="status-badge refunded">🔄 {t('vipVerification.statusRefunded', 'Refunded')}</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="vip-verification-admin">
        <h2>{t('vipVerification.title', 'VIP Payment Verification')}</h2>
        <div className="loading-state">
          <div className="spinner">⏳</div>
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

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={fetchTransactions} className="retry-button">
            {t('vipVerification.retry', 'Retry')}
          </button>
        </div>
      )}

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">📭</p>
          <p className="empty-message">
            {filter === 'pending'
              ? t('vipVerification.noPending', 'No pending verifications')
              : t('vipVerification.noTransactions', 'No transactions found')}
          </p>
        </div>
      ) : (
        <div className="transactions-grid">
          {transactions.map((transaction) => (
            <div key={transaction.id} className={`transaction-card ${transaction.payment_status}`}>
              {/* Transaction Header */}
              <div className="transaction-header">
                <div className="transaction-type">
                  {transaction.subscription_type === 'employee' ? '👤' : '🏢'}{' '}
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
                  💵 {t('vipPurchase.paymentCash', 'Cash Payment')}
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
                      <>⏳ {t('vipVerification.verifying', 'Verifying...')}</>
                    ) : (
                      <>✅ {t('vipVerification.verify', 'Verify Payment')}</>
                    )}
                  </button>
                  <button
                    className="reject-button"
                    onClick={() => handleReject(transaction.id)}
                    disabled={verifying === transaction.id}
                  >
                    ❌ {t('vipVerification.reject', 'Reject')}
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
          {loading ? '⏳' : '🔄'} {t('vipVerification.refresh', 'Refresh')}
        </button>
      </div>
    </div>
  );
};

export default VIPVerificationAdmin;
