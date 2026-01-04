/**
 * VIP Purchase Modal with Neo-Nightlife 2025 design
 *
 * Modal for purchasing VIP subscriptions for employees or establishments
 * Displays pricing tiers, durations, features, and payment methods
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { Employee, Establishment, VIPDuration, PaymentMethod, VIPTierConfig, PurchaseVIPRequest, VIPSubscriptionType } from '../../types';
import { logger } from '../../utils/logger';
import notification from '../../utils/notification';
import {
  Clock,
  X,
  XCircle,
  Smartphone,
  CheckCircle,
  Crown,
  Banknote,
  RefreshCw
} from 'lucide-react';
import { premiumModalVariants, premiumBackdropVariants } from '../../animations/variants';
import '../../styles/components/modal-premium-base.css';
import '../../styles/features/owner/VIPPurchaseModal.css';

interface Props {
  subscriptionType: VIPSubscriptionType;
  entity: Employee | Establishment;
  onClose: () => void;
  onSuccess: () => void;
  isOpen?: boolean;
}

const VIPPurchaseModal: React.FC<Props> = ({ subscriptionType, entity, onClose, onSuccess, isOpen = true }) => {
  const { t } = useTranslation();
  const { secureFetch } = useSecureFetch();

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
  const [promptPayQR, setPromptPayQR] = useState<{
    qrCode: string;
    reference: string;
    amount: number;
  } | null>(null);

  // Fetch pricing data
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

      setSuccess(true);
      notification.success(t('vipPurchase.purchaseSuccess', 'VIP purchase initiated successfully!'));

      if (selectedPaymentMethod === 'promptpay' && data.transaction?.promptpay_qr_code) {
        setPromptPayQR({
          qrCode: data.transaction.promptpay_qr_code,
          reference: data.transaction.promptpay_reference || data.transaction.id,
          amount: data.transaction.amount,
        });
        return;
      }

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error purchasing VIP:', error);
      const errorMsg = errorMessage || t('vipPurchase.errorPurchasing', 'Failed to purchase VIP subscription');
      setError(errorMsg);
      notification.error(errorMsg);
    } finally {
      setPurchasing(false);
    }
  };

  const getSelectedPrice = () => {
    if (!pricingData) return null;
    return pricingData.prices.find((p) => p.duration === selectedDuration);
  };

  const selectedPrice = getSelectedPrice();

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Render content based on state
  const renderContent = () => {
    // Loading state
    if (loading) {
      return (
        <div className="modal-premium__loading">
          <motion.div
            className="modal-premium__loading-spinner"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Clock size={48} />
          </motion.div>
          <p>{t('vipPurchase.loadingPricing', 'Loading pricing...')}</p>
        </div>
      );
    }

    // Error state (no data)
    if (error && !pricingData) {
      return (
        <div className="vip-purchase-error">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring' }}
            className="error-icon"
          >
            <XCircle size={48} />
          </motion.div>
          <p className="error-message">{error}</p>
          <motion.button
            className="modal-premium__btn-primary"
            onClick={() => setRetryCount(c => c + 1)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw size={16} />
            {t('vipPurchase.retry', 'Retry')}
          </motion.button>
        </div>
      );
    }

    if (!pricingData) return null;

    // Success state - PromptPay QR
    if (success && promptPayQR) {
      return (
        <div className="vip-promptpay-success">
          <motion.h3
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Smartphone size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            {t('vipPurchase.scanQR', 'Scan QR Code to Pay')}
          </motion.h3>
          <motion.div
            className="promptpay-qr-container"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <img
              src={promptPayQR.qrCode}
              alt="PromptPay QR Code"
              className="promptpay-qr-image"
            />
          </motion.div>
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
          <motion.button
            className="done-button"
            onClick={() => { onSuccess(); onClose(); }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t('vipPurchase.done', 'Done')}
          </motion.button>
        </div>
      );
    }

    // Success state - Standard
    if (success) {
      return (
        <div className="vip-purchase-success">
          <motion.div
            className="success-icon"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <CheckCircle size={64} />
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {t('vipPurchase.successTitle', 'VIP Purchase Successful!')}
          </motion.h3>
          <motion.p
            className="success-message"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {selectedPaymentMethod === 'cash'
              ? t('vipPurchase.successMessageCash', 'Your VIP subscription has been created. Please contact admin to verify payment.')
              : t('vipPurchase.successMessage', 'VIP subscription activated successfully!')}
          </motion.p>
        </div>
      );
    }

    // Main purchase form
    return (
      <>
        {/* Header */}
        <div className="modal-premium__header modal-premium__header--with-icon">
          <motion.div
            className="modal-premium__icon"
            style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1))', color: '#FFD700' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Crown size={32} />
          </motion.div>
          <motion.h2
            className="modal-premium__title"
            style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {t('vipPurchase.title', 'Purchase VIP Subscription')}
          </motion.h2>
          <motion.p
            className="modal-premium__subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {t('vipPurchase.forEntity', {
              type: subscriptionType === 'employee'
                ? t('vipPurchase.employee', 'Employee')
                : t('vipPurchase.establishment', 'Establishment'),
              defaultValue: 'For {{type}}'
            })}: <strong style={{ color: '#FFD700' }}>{entityName}</strong>
          </motion.p>
        </div>

        {/* Content */}
        <motion.div
          className="modal-premium__content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* VIP Features */}
          <div className="vip-features-section">
            <div className="vip-header">
              <span className="tier-badge"><Crown size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> VIP</span>
              <h3>{pricingData.name}</h3>
            </div>
            <p className="vip-description">{pricingData.description}</p>
            <ul className="vip-features-list">
              {pricingData.features.map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + index * 0.05 }}
                >
                  {feature}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Duration Selection */}
          <div className="vip-duration-selection">
            <h3>{t('vipPurchase.selectDuration', 'Select Duration')}</h3>
            <div className="duration-pills">
              {pricingData.prices.map((priceOption, index) => (
                <motion.button
                  key={priceOption.duration}
                  className={`duration-pill ${selectedDuration === priceOption.duration ? 'selected' : ''} ${priceOption.popular ? 'popular' : ''}`}
                  onClick={() => setSelectedDuration(priceOption.duration)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -3 }}
                  whileTap={{ scale: 0.98 }}
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
                </motion.button>
              ))}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="vip-payment-selection">
            <h3>{t('vipPurchase.selectPayment', 'Select Payment Method')}</h3>
            <div className="payment-methods">
              <motion.button
                className={`payment-method ${selectedPaymentMethod === 'cash' ? 'selected' : ''}`}
                onClick={() => setSelectedPaymentMethod('cash')}
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="payment-icon"><Banknote size={24} /></span>
                <span className="payment-label">{t('vipPurchase.paymentCash', 'Cash Payment')}</span>
                <span className="payment-description">
                  {t('vipPurchase.paymentCashDesc', 'Pay in cash and admin will verify')}
                </span>
              </motion.button>
              <motion.button
                className={`payment-method ${selectedPaymentMethod === 'promptpay' ? 'selected' : ''}`}
                onClick={() => setSelectedPaymentMethod('promptpay')}
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="payment-icon"><Smartphone size={24} /></span>
                <span className="payment-label">{t('vipPurchase.paymentPromptPay', 'PromptPay QR')}</span>
                <span className="payment-description">
                  {t('vipPurchase.paymentPromptPayDesc', 'Scan QR code to pay (Thai banks)')}
                </span>
              </motion.button>
            </div>
          </div>

          {/* Price Summary */}
          {selectedPrice && (
            <motion.div
              className="vip-price-summary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
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
                    -{selectedPrice.discount}% (฿{(selectedPrice.originalPrice - selectedPrice.price).toLocaleString()})
                  </span>
                </div>
              )}
              <div className="summary-row total-row">
                <span className="summary-label">{t('vipPurchase.total', 'Total')}:</span>
                <span className="summary-value total-value">฿{selectedPrice.price.toLocaleString()}</span>
              </div>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              className="vip-purchase-error-inline"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p><XCircle size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />{error}</p>
            </motion.div>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          className="modal-premium__footer"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <motion.button
            className="modal-premium__btn-secondary"
            onClick={onClose}
            disabled={purchasing}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <X size={16} />
            {t('vipPurchase.cancel', 'Cancel')}
          </motion.button>
          <motion.button
            className="purchase-button"
            onClick={handlePurchase}
            disabled={purchasing}
            whileHover={{ scale: purchasing ? 1 : 1.02 }}
            whileTap={{ scale: purchasing ? 1 : 0.98 }}
          >
            {purchasing ? (
              <>
                <motion.span
                  className="loading-spinner-small"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Clock size={16} />
                </motion.span>
                {t('vipPurchase.processing', 'Processing...')}
              </>
            ) : (
              <>
                <Crown size={16} style={{ marginRight: '6px' }} />
                {t('vipPurchase.confirmPurchase', 'Confirm Purchase')} - ฿{selectedPrice?.price.toLocaleString()}
              </>
            )}
          </motion.button>
        </motion.div>
      </>
    );
  };

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="modal-premium-overlay"
          variants={premiumBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleOverlayClick}
        >
          <motion.div
            className="modal-premium modal-premium--large"
            variants={premiumModalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="vip-purchase-modal-title"
          >
            {/* Close button (only show if not in success state) */}
            {!success && (
              <motion.button
                className="modal-premium__close"
                onClick={onClose}
                aria-label={t('common.close', 'Close')}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
              >
                <X size={18} />
              </motion.button>
            )}

            {renderContent()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default VIPPurchaseModal;
