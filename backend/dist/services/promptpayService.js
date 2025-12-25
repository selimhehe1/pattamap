"use strict";
/**
 * PromptPay QR Code Generation Service
 *
 * Generates EMVCo-compliant QR codes for Thai PromptPay payments.
 * Used for VIP subscription payments.
 *
 * @see https://www.bot.or.th/Thai/PaymentSystems/StandardPaymentCode/Pages/default.aspx
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePromptPayQR = generatePromptPayQR;
exports.isPromptPayConfigured = isPromptPayConfigured;
const promptpay_qr_1 = __importDefault(require("promptpay-qr"));
const qrcode_1 = __importDefault(require("qrcode"));
const logger_1 = require("../utils/logger");
// Merchant PromptPay ID (phone number or tax ID)
const MERCHANT_ID = process.env.PROMPTPAY_MERCHANT_ID;
/**
 * Validates a Thai phone number format for PromptPay
 * @param phoneNumber - Phone number to validate (should be 10 digits starting with 0)
 */
function isValidPhoneNumber(phoneNumber) {
    return /^0\d{9}$/.test(phoneNumber);
}
/**
 * Validates a Thai Tax ID format for PromptPay
 * @param taxId - Tax ID to validate (should be 13 digits)
 */
function isValidTaxId(taxId) {
    return /^\d{13}$/.test(taxId);
}
/**
 * Generates a PromptPay QR code for payment
 *
 * @param amount - Payment amount in THB
 * @param reference - Unique reference ID for tracking (usually transaction ID)
 * @returns Promise<PromptPayQRResult> - QR code data including base64 image
 * @throws Error if PROMPTPAY_MERCHANT_ID is not configured
 *
 * @example
 * ```typescript
 * const result = await generatePromptPayQR(3600, 'txn_123456');
 * // result.qrCode contains base64 PNG image
 * // Display in frontend: <img src={result.qrCode} />
 * ```
 */
async function generatePromptPayQR(amount, reference) {
    // Validate merchant ID is configured
    if (!MERCHANT_ID) {
        logger_1.logger.error('[PromptPay] PROMPTPAY_MERCHANT_ID not configured');
        throw new Error('PromptPay merchant ID not configured. Set PROMPTPAY_MERCHANT_ID in .env');
    }
    // Validate merchant ID format
    if (!isValidPhoneNumber(MERCHANT_ID) && !isValidTaxId(MERCHANT_ID)) {
        logger_1.logger.error('[PromptPay] Invalid merchant ID format:', MERCHANT_ID);
        throw new Error('Invalid PromptPay merchant ID format. Must be 10-digit phone or 13-digit tax ID');
    }
    // Validate amount
    if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
    }
    try {
        logger_1.logger.info(`[PromptPay] Generating QR for ${amount} THB, ref: ${reference}`);
        // Generate EMVCo-compliant payload
        // promptpay-qr handles the correct format for Thai PromptPay standard
        const payload = (0, promptpay_qr_1.default)(MERCHANT_ID, { amount });
        // Generate QR code as base64 PNG
        const qrCode = await qrcode_1.default.toDataURL(payload, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
        });
        logger_1.logger.info(`[PromptPay] QR generated successfully for ref: ${reference}`);
        return {
            qrCode,
            payload,
            reference,
            amount
        };
    }
    catch (error) {
        logger_1.logger.error('[PromptPay] QR generation failed:', error);
        throw new Error(`Failed to generate PromptPay QR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Check if PromptPay is properly configured
 * @returns boolean - true if PROMPTPAY_MERCHANT_ID is set and valid
 */
function isPromptPayConfigured() {
    if (!MERCHANT_ID)
        return false;
    return isValidPhoneNumber(MERCHANT_ID) || isValidTaxId(MERCHANT_ID);
}
//# sourceMappingURL=promptpayService.js.map