/**
 * 🧪 Upload Controller Tests
 *
 * Tests for image upload functionality with Cloudinary
 * - uploadImages (4/4 tests ✅)
 * - uploadSingleImage (3/3 tests ✅)
 * - deleteImage (3/3 tests ✅)
 * - uploadEstablishmentLogo (4/4 tests ✅)
 * - getImageInfo (3/3 tests ✅)
 *
 * CURRENT STATUS: 17/17 tests passing (100%) ✅
 *
 * Day 4 Sprint - Secondary Controllers Testing
 */

import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
  uploadImages,
  uploadSingleImage,
  deleteImage,
  uploadEstablishmentLogo,
  getImageInfo
} from '../uploadController';
import { logger } from '../../utils/logger';

// Import mock helpers
import { createMockQueryBuilder, mockSuccess, mockNotFound } from '../../config/__mocks__/supabase';

// Mock dependencies
jest.mock('../../config/cloudinary', () => ({
  __esModule: true,
  default: {
    uploader: {
      upload: jest.fn(),
      destroy: jest.fn()
    },
    api: {
      resource: jest.fn()
    }
  },
  ensureConfigured: jest.fn()
}));

jest.mock('../../config/supabase', () => {
  const mockModule = jest.requireActual('../../config/__mocks__/supabase');
  return {
    supabase: mockModule.supabase,
    supabaseClient: mockModule.supabaseClient,
    createMockQueryBuilder: mockModule.createMockQueryBuilder,
    mockSuccess: mockModule.mockSuccess,
    mockNotFound: mockModule.mockNotFound,
    mockError: mockModule.mockError,
  };
});

jest.mock('../../utils/logger');
jest.mock('../../config/sentry');
jest.mock('../../services/missionTrackingService', () => ({
  missionTrackingService: {
    onPhotoUploaded: jest.fn()
  }
}));

// Import mocked modules AFTER jest.mock
import cloudinary from '../../config/cloudinary';
import { supabase } from '../../config/supabase';
import { missionTrackingService } from '../../services/missionTrackingService';

describe('UploadController', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockNext = jest.fn();

    mockRequest = {
      params: {},
      body: {},
      user: {
        id: 'user-123',
        pseudonym: 'testuser',
        email: 'user@test.com',
        role: 'user',
        is_active: true
      }
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock
    };

    // Reset mocks
    supabase.from = jest.fn();
  });

  describe('uploadImages', () => {
    it('should upload multiple images successfully', async () => {
      const mockFiles = [
        {
          buffer: Buffer.from('fake-image-1'),
          mimetype: 'image/jpeg',
          originalname: 'photo1.jpg'
        },
        {
          buffer: Buffer.from('fake-image-2'),
          mimetype: 'image/jpeg',
          originalname: 'photo2.jpg'
        }
      ];

      (mockRequest as any).files = mockFiles;

      const mockUploadResults = [
        { secure_url: 'https://cloudinary.com/photo1.jpg', public_id: 'photo1', width: 800, height: 600 },
        { secure_url: 'https://cloudinary.com/photo2.jpg', public_id: 'photo2', width: 800, height: 600 }
      ];

      (cloudinary.uploader.upload as jest.Mock).mockImplementation((dataURI, options, callback) => {
        callback(null, mockUploadResults[0]);
      });

      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryBuilder(mockSuccess({ id: 'upload-1' }))
      );

      await uploadImages(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Images uploaded successfully',
        images: expect.arrayContaining([
          expect.objectContaining({ url: expect.stringContaining('cloudinary.com') })
        ])
      });
    });

    it('should return 400 if no images provided', async () => {
      (mockRequest as any).files = [];

      await uploadImages(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('image') }));
    });

    it('should return 400 if more than 5 images', async () => {
      (mockRequest as any).files = Array(6).fill({
        buffer: Buffer.from('fake'),
        mimetype: 'image/jpeg'
      });

      await uploadImages(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('5') }));
    });

    it('should handle cloudinary upload errors', async () => {
      (mockRequest as any).files = [{
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/jpeg'
      }];

      (cloudinary.uploader.upload as jest.Mock).mockImplementation((dataURI, options, callback) => {
        callback(new Error('Cloudinary error'), null);
      });

      await uploadImages(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });
  });

  describe('uploadSingleImage', () => {
    it('should upload single image successfully', async () => {
      (mockRequest as any).file = {
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/jpeg',
        originalname: 'photo.jpg'
      };

      const mockResult = {
        secure_url: 'https://cloudinary.com/photo.jpg',
        public_id: 'photo123',
        width: 800,
        height: 600
      };

      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(mockResult);
      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryBuilder(mockSuccess({ id: 'upload-1' }))
      );

      await uploadSingleImage(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Image uploaded successfully',
        image: {
          url: mockResult.secure_url,
          public_id: mockResult.public_id,
          width: mockResult.width,
          height: mockResult.height
        }
      });
    });

    it('should return 400 if no image provided', async () => {
      (mockRequest as any).file = undefined;

      await uploadSingleImage(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('image') }));
    });

    it('should handle upload errors', async () => {
      (mockRequest as any).file = {
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/jpeg'
      };

      (cloudinary.uploader.upload as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      await uploadSingleImage(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      mockRequest.body = { public_id: 'photo123' };

      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });

      await deleteImage(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({ message: 'Image deleted successfully' });
    });

    it('should return 400 if public_id missing', async () => {
      mockRequest.body = {};

      await deleteImage(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('ID') }));
    });

    it('should return 400 if deletion fails', async () => {
      mockRequest.body = { public_id: 'photo123' };

      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'not found' });

      await deleteImage(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });
  });

  describe('uploadEstablishmentLogo', () => {
    it('should upload logo successfully for admin', async () => {
      (mockRequest as any).user.role = 'admin';
      (mockRequest as any).file = {
        buffer: Buffer.from('fake-logo'),
        mimetype: 'image/png',
        originalname: 'logo.png'
      };

      const mockResult = {
        secure_url: 'https://cloudinary.com/logo.png',
        public_id: 'logo123',
        width: 64,
        height: 64
      };

      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(mockResult);
      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryBuilder(mockSuccess({ id: 'upload-1' }))
      );

      await uploadEstablishmentLogo(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Establishment logo uploaded successfully',
        logo: {
          url: mockResult.secure_url,
          public_id: mockResult.public_id,
          width: mockResult.width,
          height: mockResult.height
        }
      });
    });

    it('should return 400 if no logo provided', async () => {
      (mockRequest as any).user.role = 'admin';
      (mockRequest as any).file = undefined;

      await uploadEstablishmentLogo(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('logo') }));
    });

    it('should return 403 if user is not admin or moderator', async () => {
      (mockRequest as any).user.role = 'user';
      (mockRequest as any).file = {
        buffer: Buffer.from('fake-logo'),
        mimetype: 'image/png'
      };

      await uploadEstablishmentLogo(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Admin') }));
    });

    it('should allow moderator to upload logo', async () => {
      (mockRequest as any).user.role = 'moderator';
      (mockRequest as any).file = {
        buffer: Buffer.from('fake-logo'),
        mimetype: 'image/png'
      };

      const mockResult = {
        secure_url: 'https://cloudinary.com/logo.png',
        public_id: 'logo123',
        width: 64,
        height: 64
      };

      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(mockResult);
      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryBuilder(mockSuccess({ id: 'upload-1' }))
      );

      await uploadEstablishmentLogo(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).not.toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Establishment logo uploaded successfully',
        logo: expect.objectContaining({ url: expect.any(String) })
      });
    });
  });

  describe('getImageInfo', () => {
    it('should return image info successfully', async () => {
      mockRequest.params = { public_id: 'photo123' };

      const mockImageInfo = {
        secure_url: 'https://cloudinary.com/photo.jpg',
        public_id: 'photo123',
        width: 800,
        height: 600,
        format: 'jpg',
        bytes: 123456,
        created_at: '2025-01-15T10:00:00Z'
      };

      (cloudinary.api.resource as jest.Mock).mockResolvedValue(mockImageInfo);

      await getImageInfo(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        image: {
          url: mockImageInfo.secure_url,
          public_id: mockImageInfo.public_id,
          width: mockImageInfo.width,
          height: mockImageInfo.height,
          format: mockImageInfo.format,
          size: mockImageInfo.bytes,
          created_at: mockImageInfo.created_at
        }
      });
    });

    it('should return 400 if public_id missing', async () => {
      mockRequest.params = {};

      await getImageInfo(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('ID') }));
    });

    it('should handle errors when fetching image info', async () => {
      mockRequest.params = { public_id: 'photo123' };

      (cloudinary.api.resource as jest.Mock).mockRejectedValue(new Error('Not found'));

      await getImageInfo(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });
  });
});
