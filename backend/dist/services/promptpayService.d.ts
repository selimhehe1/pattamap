/**
 * PromptPay QR Code Generation Service
 *
 * Generates EMVCo-compliant QR codes for Thai PromptPay payments.
 * Used for VIP subscription payments.
 *
 * @see https://www.bot.or.th/Thai/PaymentSystems/StandardPaymentCode/Pages/default.aspx
 */
export interface PromptPayQRResult {
    qrCode: string;
    payload: string;
    reference: string;
    amount: number;
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
export declare function generatePromptPayQR(amount: number, reference: string): Promise<PromptPayQRResult>;
/**
 * Check if PromptPay is properly configured
 * @returns boolean - true if PROMPTPAY_MERCHANT_ID is set and valid
 */
export declare function isPromptPayConfigured(): boolean;
//# sourceMappingURL=promptpayService.d.ts.map