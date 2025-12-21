/**
 * @vitest-environment jsdom
 */
/**
 * Cloudinary Utility Tests
 *
 * Tests for image optimization utilities:
 * - isCloudinaryUrl (4 tests)
 * - parseCloudinaryUrl (5 tests)
 * - buildTransformString (7 tests)
 * - getOptimizedImageUrl (6 tests)
 * - getResponsiveImageUrl (4 tests)
 * - CloudinaryPresets (6 tests)
 * - getAutoSrcSet (4 tests)
 *
 * Total: 36 tests
 */

import { describe, it, expect } from 'vitest';
import {
  isCloudinaryUrl,
  parseCloudinaryUrl,
  buildTransformString,
  getOptimizedImageUrl,
  getResponsiveImageUrl,
  CloudinaryPresets,
  getAutoSrcSet,
  CloudinaryTransformOptions,
} from '../cloudinary';

// Sample Cloudinary URLs for testing
const SAMPLE_CLOUDINARY_URL = 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg';
const SAMPLE_CLOUDINARY_URL_WITH_FOLDER = 'https://res.cloudinary.com/demo/image/upload/v1234567890/folder/subfolder/sample.jpg';
const NON_CLOUDINARY_URL = 'https://example.com/images/sample.jpg';
const LOCAL_IMAGE_URL = '/images/sample.jpg';

describe('Cloudinary Utils', () => {
  // ========================================
  // isCloudinaryUrl Tests
  // ========================================
  describe('isCloudinaryUrl', () => {
    it('should return true for res.cloudinary.com URLs', () => {
      expect(isCloudinaryUrl(SAMPLE_CLOUDINARY_URL)).toBe(true);
    });

    it('should return true for cloudinary.com URLs', () => {
      expect(isCloudinaryUrl('https://cloudinary.com/demo/image/upload/sample.jpg')).toBe(true);
    });

    it('should return false for non-Cloudinary URLs', () => {
      expect(isCloudinaryUrl(NON_CLOUDINARY_URL)).toBe(false);
      expect(isCloudinaryUrl(LOCAL_IMAGE_URL)).toBe(false);
    });

    it('should return false for empty or undefined URLs', () => {
      expect(isCloudinaryUrl('')).toBe(false);
      expect(isCloudinaryUrl(null as unknown as string)).toBe(false);
      expect(isCloudinaryUrl(undefined as unknown as string)).toBe(false);
    });
  });

  // ========================================
  // parseCloudinaryUrl Tests
  // ========================================
  describe('parseCloudinaryUrl', () => {
    it('should parse a simple Cloudinary URL', () => {
      const result = parseCloudinaryUrl(SAMPLE_CLOUDINARY_URL);

      expect(result).not.toBeNull();
      expect(result?.cloudName).toBe('demo');
      expect(result?.resourceType).toBe('image');
      expect(result?.uploadType).toBe('upload');
      expect(result?.publicId).toBe('v1234567890/sample.jpg');
      expect(result?.baseUrl).toBe('https://res.cloudinary.com');
    });

    it('should parse URL with folder structure', () => {
      const result = parseCloudinaryUrl(SAMPLE_CLOUDINARY_URL_WITH_FOLDER);

      expect(result).not.toBeNull();
      expect(result?.publicId).toBe('v1234567890/folder/subfolder/sample.jpg');
    });

    it('should handle URLs with different resource types', () => {
      const videoUrl = 'https://res.cloudinary.com/demo/video/upload/v1234/sample.mp4';
      const result = parseCloudinaryUrl(videoUrl);

      expect(result?.resourceType).toBe('video');
    });

    it('should handle URLs with fetch upload type', () => {
      const fetchUrl = 'https://res.cloudinary.com/demo/image/fetch/https://example.com/image.jpg';
      const result = parseCloudinaryUrl(fetchUrl);

      expect(result?.uploadType).toBe('fetch');
    });

    it('should return null for invalid URLs', () => {
      expect(parseCloudinaryUrl('not-a-url')).toBeNull();
      expect(parseCloudinaryUrl('')).toBeNull();
    });
  });

  // ========================================
  // buildTransformString Tests
  // ========================================
  describe('buildTransformString', () => {
    it('should build format transformation', () => {
      const result = buildTransformString({ format: 'auto' });
      expect(result).toBe('f_auto');
    });

    it('should build quality transformation', () => {
      expect(buildTransformString({ quality: 'auto' })).toBe('q_auto');
      expect(buildTransformString({ quality: 'auto:good' })).toBe('q_auto:good');
      expect(buildTransformString({ quality: 80 })).toBe('q_80');
    });

    it('should build dimension transformations', () => {
      expect(buildTransformString({ width: 800 })).toBe('w_800');
      expect(buildTransformString({ height: 600 })).toBe('h_600');
      expect(buildTransformString({ width: 800, height: 600 })).toBe('w_800,h_600');
    });

    it('should build crop transformation', () => {
      expect(buildTransformString({ crop: 'fill' })).toBe('c_fill');
      expect(buildTransformString({ crop: 'fit' })).toBe('c_fit');
    });

    it('should build gravity transformation', () => {
      expect(buildTransformString({ gravity: 'auto' })).toBe('g_auto');
      expect(buildTransformString({ gravity: 'face' })).toBe('g_face');
    });

    it('should build DPR transformation', () => {
      expect(buildTransformString({ dpr: 2 })).toBe('dpr_2');
    });

    it('should combine multiple transformations', () => {
      const options: CloudinaryTransformOptions = {
        format: 'auto',
        quality: 'auto:good',
        width: 800,
        height: 600,
        crop: 'fill',
        gravity: 'auto',
        dpr: 2,
      };

      const result = buildTransformString(options);

      expect(result).toBe('f_auto,q_auto:good,w_800,h_600,c_fill,g_auto,dpr_2');
    });
  });

  // ========================================
  // getOptimizedImageUrl Tests
  // ========================================
  describe('getOptimizedImageUrl', () => {
    it('should return original URL for non-Cloudinary URLs', () => {
      expect(getOptimizedImageUrl(NON_CLOUDINARY_URL)).toBe(NON_CLOUDINARY_URL);
      expect(getOptimizedImageUrl(LOCAL_IMAGE_URL)).toBe(LOCAL_IMAGE_URL);
    });

    it('should apply default optimizations (format: auto, quality: auto:good)', () => {
      const result = getOptimizedImageUrl(SAMPLE_CLOUDINARY_URL);

      expect(result).toContain('f_auto');
      expect(result).toContain('q_auto:good');
    });

    it('should apply custom transformations', () => {
      const result = getOptimizedImageUrl(SAMPLE_CLOUDINARY_URL, {
        width: 800,
        crop: 'fill',
      });

      expect(result).toContain('w_800');
      expect(result).toContain('c_fill');
    });

    it('should preserve cloud name and public ID', () => {
      const result = getOptimizedImageUrl(SAMPLE_CLOUDINARY_URL);

      expect(result).toContain('/demo/');
      expect(result).toContain('sample.jpg');
    });

    it('should handle URLs with folder structure', () => {
      const result = getOptimizedImageUrl(SAMPLE_CLOUDINARY_URL_WITH_FOLDER, { width: 400 });

      expect(result).toContain('folder/subfolder/sample.jpg');
      expect(result).toContain('w_400');
    });

    it('should override default options with custom options', () => {
      const result = getOptimizedImageUrl(SAMPLE_CLOUDINARY_URL, {
        format: 'webp',
        quality: 'auto:best',
      });

      expect(result).toContain('f_webp');
      expect(result).toContain('q_auto:best');
      expect(result).not.toContain('f_auto');
    });
  });

  // ========================================
  // getResponsiveImageUrl Tests
  // ========================================
  describe('getResponsiveImageUrl', () => {
    it('should return original URL for non-Cloudinary URLs', () => {
      expect(getResponsiveImageUrl(NON_CLOUDINARY_URL)).toBe(NON_CLOUDINARY_URL);
    });

    it('should generate srcset with default widths', () => {
      const result = getResponsiveImageUrl(SAMPLE_CLOUDINARY_URL);

      expect(result).toContain('320w');
      expect(result).toContain('640w');
      expect(result).toContain('960w');
      expect(result).toContain('1280w');
      expect(result).toContain('1920w');
    });

    it('should generate srcset with custom widths', () => {
      const result = getResponsiveImageUrl(SAMPLE_CLOUDINARY_URL, [400, 800, 1200]);

      expect(result).toContain('400w');
      expect(result).toContain('800w');
      expect(result).toContain('1200w');
      expect(result).not.toContain('320w');
    });

    it('should apply options to all sizes', () => {
      const result = getResponsiveImageUrl(SAMPLE_CLOUDINARY_URL, [400, 800], {
        crop: 'fill',
        gravity: 'face',
      });

      expect(result).toContain('c_fill');
      expect(result).toContain('g_face');
    });
  });

  // ========================================
  // CloudinaryPresets Tests
  // ========================================
  describe('CloudinaryPresets', () => {
    describe('thumbnail', () => {
      it('should generate square thumbnail with default size', () => {
        const result = CloudinaryPresets.thumbnail(SAMPLE_CLOUDINARY_URL);

        expect(result).toContain('w_64');
        expect(result).toContain('h_64');
        expect(result).toContain('c_fill');
        expect(result).toContain('g_auto');
      });

      it('should generate thumbnail with custom size', () => {
        const result = CloudinaryPresets.thumbnail(SAMPLE_CLOUDINARY_URL, 128);

        expect(result).toContain('w_128');
        expect(result).toContain('h_128');
      });
    });

    describe('employeePhoto', () => {
      it('should generate optimized employee photo', () => {
        const result = CloudinaryPresets.employeePhoto(SAMPLE_CLOUDINARY_URL);

        expect(result).toContain('w_800');
        expect(result).toContain('c_limit');
        expect(result).toContain('q_auto:good');
      });

      it('should accept custom width', () => {
        const result = CloudinaryPresets.employeePhoto(SAMPLE_CLOUDINARY_URL, 600);

        expect(result).toContain('w_600');
      });
    });

    describe('establishmentLogo', () => {
      it('should generate PNG logo with best quality', () => {
        const result = CloudinaryPresets.establishmentLogo(SAMPLE_CLOUDINARY_URL);

        expect(result).toContain('w_64');
        expect(result).toContain('h_64');
        expect(result).toContain('f_png');
        expect(result).toContain('q_auto:best');
      });
    });

    describe('galleryLarge', () => {
      it('should generate large gallery image', () => {
        const result = CloudinaryPresets.galleryLarge(SAMPLE_CLOUDINARY_URL);

        expect(result).toContain('w_1920');
        expect(result).toContain('c_limit');
        expect(result).toContain('q_auto:best');
      });
    });

    describe('galleryThumb', () => {
      it('should generate gallery thumbnail', () => {
        const result = CloudinaryPresets.galleryThumb(SAMPLE_CLOUDINARY_URL);

        expect(result).toContain('w_320');
        expect(result).toContain('h_320');
        expect(result).toContain('c_fill');
      });
    });

    describe('cardPreview', () => {
      it('should generate card preview image', () => {
        const result = CloudinaryPresets.cardPreview(SAMPLE_CLOUDINARY_URL);

        expect(result).toContain('w_400');
        expect(result).toContain('h_400');
        expect(result).toContain('c_fill');
        expect(result).toContain('g_auto');
      });
    });
  });

  // ========================================
  // getAutoSrcSet Tests
  // ========================================
  describe('getAutoSrcSet', () => {
    it('should return empty srcSet for non-Cloudinary URLs', () => {
      const result = getAutoSrcSet(NON_CLOUDINARY_URL);

      expect(result.src).toBe(NON_CLOUDINARY_URL);
      expect(result.srcSet).toBe('');
      expect(result.sizes).toBe('');
    });

    it('should generate employee type srcSet', () => {
      const result = getAutoSrcSet(SAMPLE_CLOUDINARY_URL, 'employee');

      expect(result.srcSet).toContain('320w');
      expect(result.srcSet).toContain('640w');
      expect(result.srcSet).toContain('960w');
      expect(result.srcSet).toContain('1280w');
      expect(result.sizes).toContain('max-width');
      expect(result.src).toContain('w_640'); // Default medium size
    });

    it('should generate logo type srcSet', () => {
      const result = getAutoSrcSet(SAMPLE_CLOUDINARY_URL, 'logo');

      expect(result.srcSet).toContain('64w');
      expect(result.srcSet).toContain('128w');
      expect(result.srcSet).toContain('256w');
      expect(result.sizes).toBe('64px');
      expect(result.srcSet).toContain('f_png');
    });

    it('should generate gallery type srcSet', () => {
      const result = getAutoSrcSet(SAMPLE_CLOUDINARY_URL, 'gallery');

      expect(result.srcSet).toContain('640w');
      expect(result.srcSet).toContain('1280w');
      expect(result.srcSet).toContain('1920w');
      expect(result.sizes).toBe('100vw');
      expect(result.srcSet).toContain('q_auto:best');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('should handle URL with existing transformations', () => {
      const urlWithTransforms = 'https://res.cloudinary.com/demo/image/upload/w_100,h_100/v1234/sample.jpg';
      const result = getOptimizedImageUrl(urlWithTransforms, { width: 800 });

      // Should still work and include the new width
      expect(result).toContain('w_800');
    });

    it('should handle URL without version number', () => {
      const urlNoVersion = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      const result = getOptimizedImageUrl(urlNoVersion, { width: 400 });

      expect(result).toContain('w_400');
      expect(result).toContain('sample.jpg');
    });

    it('should handle private upload type', () => {
      const privateUrl = 'https://res.cloudinary.com/demo/image/private/v1234/sample.jpg';
      const result = parseCloudinaryUrl(privateUrl);

      expect(result?.uploadType).toBe('private');
    });

    it('should preserve special characters in public ID', () => {
      const urlWithSpecialChars = 'https://res.cloudinary.com/demo/image/upload/v1234/folder/file-name_v2.jpg';
      const result = getOptimizedImageUrl(urlWithSpecialChars, { width: 400 });

      expect(result).toContain('file-name_v2.jpg');
    });
  });
});
