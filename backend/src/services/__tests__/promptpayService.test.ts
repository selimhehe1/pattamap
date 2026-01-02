/**
 * PromptPay Service Tests
 *
 * Tests for PromptPay QR code generation:
 * - generatePromptPayQR
 * - isPromptPayConfigured
 */

import { generatePromptPayQR, isPromptPayConfigured } from '../promptpayService';

// Mock the external dependencies
jest.mock('promptpay-qr', () => jest.fn(() => 'MOCK_PAYLOAD_STRING'));
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,MOCK_QR_CODE')
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

describe('PromptPay Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment for each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ========================================
  // isPromptPayConfigured Tests
  // ========================================
  describe('isPromptPayConfigured', () => {
    it('should return false when PROMPTPAY_MERCHANT_ID is not set', () => {
      delete process.env.PROMPTPAY_MERCHANT_ID;

      // Need to re-import to get fresh module with new env
      jest.resetModules();
      const { isPromptPayConfigured: freshIsConfigured } = require('../promptpayService');

      expect(freshIsConfigured()).toBe(false);
    });

    it('should return true for valid phone number format', () => {
      process.env.PROMPTPAY_MERCHANT_ID = '0812345678';

      jest.resetModules();
      const { isPromptPayConfigured: freshIsConfigured } = require('../promptpayService');

      expect(freshIsConfigured()).toBe(true);
    });

    it('should return true for valid tax ID format', () => {
      process.env.PROMPTPAY_MERCHANT_ID = '1234567890123';

      jest.resetModules();
      const { isPromptPayConfigured: freshIsConfigured } = require('../promptpayService');

      expect(freshIsConfigured()).toBe(true);
    });

    it('should return false for invalid phone number', () => {
      process.env.PROMPTPAY_MERCHANT_ID = '123456'; // Too short

      jest.resetModules();
      const { isPromptPayConfigured: freshIsConfigured } = require('../promptpayService');

      expect(freshIsConfigured()).toBe(false);
    });

    it('should return false for invalid tax ID', () => {
      process.env.PROMPTPAY_MERCHANT_ID = '12345678901234'; // 14 digits

      jest.resetModules();
      const { isPromptPayConfigured: freshIsConfigured } = require('../promptpayService');

      expect(freshIsConfigured()).toBe(false);
    });

    it('should return false for phone not starting with 0', () => {
      process.env.PROMPTPAY_MERCHANT_ID = '1812345678';

      jest.resetModules();
      const { isPromptPayConfigured: freshIsConfigured } = require('../promptpayService');

      expect(freshIsConfigured()).toBe(false);
    });
  });

  // ========================================
  // generatePromptPayQR Tests
  // ========================================
  describe('generatePromptPayQR', () => {
    it('should throw error when PROMPTPAY_MERCHANT_ID is not configured', async () => {
      delete process.env.PROMPTPAY_MERCHANT_ID;

      jest.resetModules();
      const { generatePromptPayQR: freshGenerate } = require('../promptpayService');

      await expect(freshGenerate(1000, 'ref-123')).rejects.toThrow(
        'PromptPay merchant ID not configured'
      );
    });

    it('should throw error for invalid merchant ID format', async () => {
      process.env.PROMPTPAY_MERCHANT_ID = 'invalid-id';

      jest.resetModules();
      const { generatePromptPayQR: freshGenerate } = require('../promptpayService');

      await expect(freshGenerate(1000, 'ref-123')).rejects.toThrow(
        'Invalid PromptPay merchant ID format'
      );
    });

    it('should throw error for zero amount', async () => {
      process.env.PROMPTPAY_MERCHANT_ID = '0812345678';

      jest.resetModules();
      const { generatePromptPayQR: freshGenerate } = require('../promptpayService');

      await expect(freshGenerate(0, 'ref-123')).rejects.toThrow(
        'Amount must be greater than 0'
      );
    });

    it('should throw error for negative amount', async () => {
      process.env.PROMPTPAY_MERCHANT_ID = '0812345678';

      jest.resetModules();
      const { generatePromptPayQR: freshGenerate } = require('../promptpayService');

      await expect(freshGenerate(-100, 'ref-123')).rejects.toThrow(
        'Amount must be greater than 0'
      );
    });

    it('should generate QR code successfully with valid phone number', async () => {
      process.env.PROMPTPAY_MERCHANT_ID = '0812345678';

      jest.resetModules();
      const { generatePromptPayQR: freshGenerate } = require('../promptpayService');

      const result = await freshGenerate(3600, 'txn-123');

      expect(result).toEqual({
        qrCode: 'data:image/png;base64,MOCK_QR_CODE',
        payload: 'MOCK_PAYLOAD_STRING',
        reference: 'txn-123',
        amount: 3600
      });
    });

    it('should generate QR code successfully with valid tax ID', async () => {
      process.env.PROMPTPAY_MERCHANT_ID = '1234567890123';

      jest.resetModules();
      const { generatePromptPayQR: freshGenerate } = require('../promptpayService');

      const result = await freshGenerate(1000, 'txn-456');

      expect(result.reference).toBe('txn-456');
      expect(result.amount).toBe(1000);
      expect(result.qrCode).toContain('data:image/png;base64');
    });

    it('should call generatePayload with correct arguments', async () => {
      process.env.PROMPTPAY_MERCHANT_ID = '0812345678';

      jest.resetModules();
      const generatePayload = require('promptpay-qr');
      const { generatePromptPayQR: freshGenerate } = require('../promptpayService');

      await freshGenerate(5000, 'ref-789');

      expect(generatePayload).toHaveBeenCalledWith('0812345678', { amount: 5000 });
    });

    it('should call QRCode.toDataURL with correct options', async () => {
      process.env.PROMPTPAY_MERCHANT_ID = '0812345678';

      jest.resetModules();
      const QRCode = require('qrcode');
      const { generatePromptPayQR: freshGenerate } = require('../promptpayService');

      await freshGenerate(1500, 'ref-test');

      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        'MOCK_PAYLOAD_STRING',
        expect.objectContaining({
          width: 300,
          margin: 2,
          errorCorrectionLevel: 'M'
        })
      );
    });

    it('should handle QRCode.toDataURL error', async () => {
      process.env.PROMPTPAY_MERCHANT_ID = '0812345678';

      jest.resetModules();
      const QRCode = require('qrcode');
      QRCode.toDataURL.mockRejectedValueOnce(new Error('QR generation failed'));
      const { generatePromptPayQR: freshGenerate } = require('../promptpayService');

      await expect(freshGenerate(1000, 'ref-error')).rejects.toThrow(
        'Failed to generate PromptPay QR: QR generation failed'
      );
    });

    it('should handle non-Error exceptions', async () => {
      process.env.PROMPTPAY_MERCHANT_ID = '0812345678';

      jest.resetModules();
      const QRCode = require('qrcode');
      QRCode.toDataURL.mockRejectedValueOnce('string error');
      const { generatePromptPayQR: freshGenerate } = require('../promptpayService');

      await expect(freshGenerate(1000, 'ref-error')).rejects.toThrow(
        'Failed to generate PromptPay QR: Unknown error'
      );
    });

    it('should work with decimal amounts', async () => {
      process.env.PROMPTPAY_MERCHANT_ID = '0812345678';

      jest.resetModules();
      const { generatePromptPayQR: freshGenerate } = require('../promptpayService');

      const result = await freshGenerate(99.50, 'txn-decimal');

      expect(result.amount).toBe(99.50);
    });

    it('should work with large amounts', async () => {
      process.env.PROMPTPAY_MERCHANT_ID = '0812345678';

      jest.resetModules();
      const { generatePromptPayQR: freshGenerate } = require('../promptpayService');

      const result = await freshGenerate(100000, 'txn-large');

      expect(result.amount).toBe(100000);
    });
  });

  // ========================================
  // Phone Number Validation Edge Cases
  // ========================================
  describe('Phone number validation edge cases', () => {
    const testCases = [
      { id: '0812345678', valid: true, desc: 'valid 10-digit starting with 0' },
      { id: '0912345678', valid: true, desc: 'valid 10-digit starting with 09' },
      { id: '0612345678', valid: true, desc: 'valid 10-digit starting with 06' },
      { id: '081234567', valid: false, desc: '9 digits (too short)' },
      { id: '08123456789', valid: false, desc: '11 digits (too long)' },
      { id: '1812345678', valid: false, desc: '10 digits not starting with 0' },
      { id: '08-123-4567', valid: false, desc: 'contains hyphens' },
      { id: '081 234 5678', valid: false, desc: 'contains spaces' },
      { id: '', valid: false, desc: 'empty string' }
    ];

    testCases.forEach(({ id, valid, desc }) => {
      it(`should return ${valid} for ${desc}`, () => {
        process.env.PROMPTPAY_MERCHANT_ID = id || undefined;

        jest.resetModules();
        const { isPromptPayConfigured: freshIsConfigured } = require('../promptpayService');

        expect(freshIsConfigured()).toBe(valid);
      });
    });
  });

  // ========================================
  // Tax ID Validation Edge Cases
  // ========================================
  describe('Tax ID validation edge cases', () => {
    const testCases = [
      { id: '1234567890123', valid: true, desc: 'valid 13-digit tax ID' },
      { id: '0123456789012', valid: true, desc: '13 digits starting with 0' },
      { id: '123456789012', valid: false, desc: '12 digits (too short)' },
      { id: '12345678901234', valid: false, desc: '14 digits (too long)' },
      { id: '1-2345-67890-12-3', valid: false, desc: 'contains hyphens' }
    ];

    testCases.forEach(({ id, valid, desc }) => {
      it(`should return ${valid} for ${desc}`, () => {
        process.env.PROMPTPAY_MERCHANT_ID = id;

        jest.resetModules();
        const { isPromptPayConfigured: freshIsConfigured } = require('../promptpayService');

        expect(freshIsConfigured()).toBe(valid);
      });
    });
  });
});
