/**
 * 🆕 v10.3 Phase 1/5 - VIP Purchase Modal (Generic)
 *
 * Modal for purchasing VIP subscriptions for employees or establishments
 * Displays pricing tiers, durations, features, and payment methods
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { Employee, Establishment, VIPDuration, PaymentMethod, VIPTierConfig, PurchaseVIPRequest, VIPSubscriptionType } from '../../types';
import { logger } from '../../utils/logger';
import './VIPPurchaseModal.css';

interface Props {
  subscriptionType: VIPSubscriptionType; // 'employee' | 'establishment'
  entity: Employee | Establishment; // Employee or Establishment object
  onClose: () => void;
  onSuccess: () => void;
}

const VIPPurchaseModal: React.FC<Props> = ({ subscriptionType, entity, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { secureFetch } = useSecureFetch();

  // Get entity name (works for both Employee and Establishment)
  const entityName = 'nickname' in entity && entity.nickname
    ? entity.nickname
    : entity.name;

  // State
  const [selectedDuration, setSelectedDuration] = useState<VIPDuration>(30);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');
  const [pricingData, setPricingData] = useState<VIPTierConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  // PromptPay QR result
  const [promptPayQR, setPromptPayQR] = useState<{
    qrCode: string;
    reference: string;
    amount: number;
  } | null>(null);

  // Fetch pricing data on mount or retry
  useEffect(() => {
    const fetchPricingData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/vip/pricing/${subscriptionType}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch pricing data');
        }

        const data = await response.json();
        // Backend now returns single VIPTypeConfig directly
        setPricingData(data.pricing);
      } catch (_err) {
        logger.error('Error fetching pricing:', _err);
        setError(t('vipPurchase.errorFetchingPricing', 'Failed to load pricing information'));
      } finally {
        setLoading(false);
      }
    };
    fetchPricingData();
  }, [subscriptionType, t, retryCount]);

  const handlePurchase = async () => {
    if (!pricingData) return;

    try {
      setPurchasing(true);
      setError(null);

      // Note: tier is auto-assigned by backend based on subscription_type
      const requestBody: PurchaseVIPRequest = {
        subscription_type: subscriptionType,
        entity_id: entity.id,
        duration: selectedDuration,
        payment_method: selectedPaymentMethod,
      };

      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/vip/purchase`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Purchase failed');
      }

      // Success!
      setSuccess(true);

      // If PromptPay, store QR data and don't auto-close
      if (selectedPaymentMethod === 'promptpay' && data.transaction?.promptpay_qr_code) {
        setPromptPayQR({
          qrCode: data.transaction.promptpay_qr_code,
          reference: data.transaction.promptpay_reference || data.transaction.id,
          amount: data.transaction.amount,
        });
        // Don't auto-close - user needs to scan QR
        return;
      }

      // Show success message briefly, then close and refresh
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error purchasing VIP:', error);
      setError(errorMessage || t('vipPurchase.errorPurchasing', 'Failed to purchase VIP subscription'));
    } finally {
      setPurchasing(false);
    }
  };

  // Get selected price
  const getSelectedPrice = () => {
    if (!pricingData) return null;
    return pricingData.prices.find((p) => p.duration === selectedDuration);
  };

  const selectedPrice = getSelectedPrice();

  // Loading state
  if (loading) {
    return (
      <div className="vip-purchase-modal-overlay" onClick={onClose}>
        <div className="vip-purchase-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="vip-purchase-loading">
            <div className="loading-spinner">⏳</div>
            <p>{t('vipPurchase.loadingPricing', 'Loading pricing...')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !pricingData) {
    return (
      <div className="vip-purchase-modal-overlay" onClick={onClose}>
        <div className="vip-purchase-modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="close-modal" onClick={onClose}>
            ✕
          </button>
          <div className="vip-purchase-error">
            <p className="error-icon">❌</p>
            <p className="error-message">{error}</p>
            <button className="retry-button" onClick={() => setRetryCount(c => c + 1)}>
              {t('vipPurchase.retry', 'Retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!pricingData) return null;

  // Success state
  if (success) {
    // PromptPay QR display
    if (promptPayQR) {
      return (
        <div className="vip-purchase-modal-overlay">
          <div className="vip-purchase-modal-content">
            <button className="close-modal" onClick={() => { onSuccess(); onClose(); }}>
              ✕
            </button>
            <div className="vip-promptpay-success">
              <h3>📱 {t('vipPurchase.scanQR', 'Scan QR Code to Pay')}</h3>
              <div className="promptpay-qr-container">
                <img
                  src={promptPayQR.qrCode}
                  alt="PromptPay QR Code"
                  className="promptpay-qr-image"
                />
              </div>
              <div className="promptpay-details">
                <p className="promptpay-amount">
                  {t('vipPurchase.amount', 'Amount')}: <strong>฿{promptPayQR.amount.toLocaleString()}</strong>
                </p>
                <p className="promptpay-reference">
                  {t('vipPurchase.reference', 'Reference')}: <code>{promptPayQR.reference}</code>
                </p>
              </div>
              <div className="promptpay-instructions">
                <p>1. {t('vipPurchase.qrStep1', 'Open your Thai banking app')}</p>
                <p>2. {t('vipPurchase.qrStep2', 'Scan this QR code')}</p>
                <p>3. {t('vipPurchase.qrStep3', 'Confirm the payment')}</p>
                <p>4. {t('vipPurchase.qrStep4', 'Admin will verify and activate your VIP')}</p>
              </div>
              <button
                className="done-button"
                onClick={() => { onSuccess(); onClose(); }}
              >
                {t('vipPurchase.done', 'Done')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Standard success (Cash / Admin)
    return (
      <div className="vip-purchase-modal-overlay">
        <div className="vip-purchase-modal-content">
          <div className="vip-purchase-success">
            <p className="success-icon">✅</p>
            <h3>{t('vipPurchase.successTitle', 'VIP Purchase Successful!')}</h3>
            <p className="success-message">
              {selectedPaymentMethod === 'cash'
                ? t('vipPurchase.successMessageCash', 'Your VIP subscription has been created. Please contact admin to verify payment.')
                : t('vipPurchase.successMessage', 'VIP subscription activated successfully!')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vip-purchase-modal-overlay" onClick={onClose}>
      <div className="vip-purchase-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>
          ✕
        </button>

        {/* Header */}
        <div className="vip-purchase-header">
          <h2>{t('vipPurchase.title', 'Purchase VIP Subscription')}</h2>
          <p className="employee-info">
            {t('vipPurchase.forEntity', {
              type: subscriptionType === 'employee'
                ? t('vipPurchase.employee', 'Employee')
                : t('vipPurchase.establishment', 'Establishment'),
              defaultValue: 'For {{type}}'
            })}: <strong>{entityName}</strong>
          </p>
        </div>

        {/* VIP Features */}
        <div className="vip-features-section">
          <div className="vip-header">
            <span className="tier-badge">👑 VIP</span>
            <h3>{pricingData.name}</h3>
          </div>
          <p className="vip-description">{pricingData.description}</p>
          <ul className="vip-features-list">
            {pricingData.features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
        </div>

        {/* Duration Selection */}
        <div className="vip-duration-selection">
          <h3>{t('vipPurchase.selectDuration', 'Select Duration')}</h3>
          <div className="duration-pills">
            {pricingData.prices.map((priceOption) => (
              <button
                key={priceOption.duration}
                className={`duration-pill ${selectedDuration === priceOption.duration ? 'selected' : ''} ${
                  priceOption.popular ? 'popular' : ''
                }`}
                onClick={() => setSelectedDuration(priceOption.duration)}
              >
                <span className="duration-label">
                  {priceOption.duration} {t('vipPurchase.days', 'days')}
                </span>
                {priceOption.discount > 0 && (
                  <span className="discount-badge">-{priceOption.discount}%</span>
                )}
                <span className="price-label">฿{priceOption.price.toLocaleString()}</span>
                {priceOption.originalPrice && (
                  <span className="original-price">฿{priceOption.originalPrice.toLocaleString()}</span>
                )}
                {priceOption.popular && (
                  <span className="popular-label">{t('vipPurchase.popular', 'Popular')}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="vip-payment-selection">
          <h3>{t('vipPurchase.selectPayment', 'Select Payment Method')}</h3>
          <div className="payment-methods">
            <button
              className={`payment-method ${selectedPaymentMethod === 'cash' ? 'selected' : ''}`}
              onClick={() => setSelectedPaymentMethod('cash')}
            >
              <span className="payment-icon">💵</span>
              <span className="payment-label">{t('vipPurchase.paymentCash', 'Cash Payment')}</span>
              <span className="payment-description">
                {t('vipPurchase.paymentCashDesc', 'Pay in cash and admin will verify')}
              </span>
            </button>
            <button
              className={`payment-method ${selectedPaymentMethod === 'promptpay' ? 'selected' : ''}`}
              onClick={() => setSelectedPaymentMethod('promptpay')}
            >
              <span className="payment-icon">📱</span>
              <span className="payment-label">{t('vipPurchase.paymentPromptPay', 'PromptPay QR')}</span>
              <span className="payment-description">
                {t('vipPurchase.paymentPromptPayDesc', 'Scan QR code to pay (Thai banks)')}
              </span>
            </button>
          </div>
        </div>

        {/* Price Summary */}
        {selectedPrice && (
          <div className="vip-price-summary">
            <div className="summary-row">
              <span className="summary-label">{t('vipPurchase.duration', 'Duration')}:</span>
              <span className="summary-value">
                {selectedDuration} {t('vipPurchase.days', 'days')}
              </span>
            </div>
            {selectedPrice.originalPrice && (
              <div className="summary-row discount-row">
                <span className="summary-label">{t('vipPurchase.discount', 'Discount')}:</span>
                <span className="summary-value discount-value">
                  -{selectedPrice.discount}% (฿
                  {(selectedPrice.originalPrice - selectedPrice.price).toLocaleString()})
                </span>
              </div>
            )}
            <div className="summary-row total-row">
              <span className="summary-label">{t('vipPurchase.total', 'Total')}:</span>
              <span className="summary-value total-value">฿{selectedPrice.price.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="vip-purchase-error-inline">
            <p>❌ {error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="vip-purchase-actions">
          <button className="cancel-button" onClick={onClose} disabled={purchasing}>
            {t('vipPurchase.cancel', 'Cancel')}
          </button>
          <button
            className="purchase-button"
            onClick={handlePurchase}
            disabled={purchasing}
          >
            {purchasing ? (
              <>
                <span className="loading-spinner-small">⏳</span>
                {t('vipPurchase.processing', 'Processing...')}
              </>
            ) : (
              <>
                👑 {t('vipPurchase.confirmPurchase', 'Confirm Purchase')} - ฿{selectedPrice?.price.toLocaleString()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VIPPurchaseModal;
