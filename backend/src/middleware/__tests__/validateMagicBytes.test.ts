import { Request, Response, NextFunction } from 'express';
import { validateMagicBytes } from '../validateMagicBytes';

describe('validateMagicBytes middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = {};
    mockRes = { status: statusMock, json: jsonMock };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call next() when no files are present', () => {
    validateMagicBytes(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  describe('single file (req.file)', () => {
    it('should accept valid JPEG', () => {
      mockReq.file = createMockFile('photo.jpg', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]));
      validateMagicBytes(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should accept valid PNG', () => {
      mockReq.file = createMockFile(
        'photo.png',
        'image/png',
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
      );
      validateMagicBytes(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should accept valid WebP', () => {
      // RIFF....WEBP
      const buf = Buffer.alloc(16, 0);
      buf.write('RIFF', 0);
      buf.write('WEBP', 8);
      mockReq.file = createMockFile('photo.webp', 'image/webp', buf);
      validateMagicBytes(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should accept valid GIF87a', () => {
      mockReq.file = createMockFile('anim.gif', 'image/gif', Buffer.from('GIF87a', 'ascii'));
      validateMagicBytes(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should accept valid GIF89a', () => {
      mockReq.file = createMockFile('anim.gif', 'image/gif', Buffer.from('GIF89a', 'ascii'));
      validateMagicBytes(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should accept valid PDF', () => {
      mockReq.file = createMockFile('doc.pdf', 'application/pdf', Buffer.from('%PDF-1.4', 'ascii'));
      validateMagicBytes(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject JPEG with wrong magic bytes', () => {
      // PNG header but declared as JPEG
      mockReq.file = createMockFile(
        'fake.jpg',
        'image/jpeg',
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      );
      validateMagicBytes(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid file',
          message: expect.stringContaining('fake.jpg'),
        })
      );
    });

    it('should reject PNG with wrong magic bytes', () => {
      mockReq.file = createMockFile('fake.png', 'image/png', Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
      validateMagicBytes(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should reject file with empty buffer', () => {
      mockReq.file = createMockFile('empty.jpg', 'image/jpeg', Buffer.alloc(0));
      validateMagicBytes(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should reject file with no buffer', () => {
      mockReq.file = createMockFile('no-buf.jpg', 'image/jpeg', undefined as unknown as Buffer);
      validateMagicBytes(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('multiple files (req.files as array)', () => {
    it('should accept all valid files', () => {
      mockReq.files = [
        createMockFile('a.jpg', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0])),
        createMockFile('b.png', 'image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      ];
      validateMagicBytes(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject if any file has wrong magic bytes', () => {
      mockReq.files = [
        createMockFile('good.jpg', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0])),
        createMockFile('bad.png', 'image/png', Buffer.from([0xff, 0xd8, 0xff])), // JPEG bytes, declared PNG
      ];
      validateMagicBytes(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('bad.png') })
      );
    });
  });

  describe('multiple files (req.files as Record)', () => {
    it('should validate files from all fields', () => {
      (mockReq as Record<string, unknown>).files = {
        avatar: [createMockFile('a.jpg', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0]))],
        document: [createMockFile('d.pdf', 'application/pdf', Buffer.from('%PDF-1.7', 'ascii'))],
      };
      validateMagicBytes(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('unknown MIME types', () => {
    it('should skip validation for unknown MIME types', () => {
      mockReq.file = createMockFile('data.csv', 'text/csv', Buffer.from('col1,col2\n'));
      validateMagicBytes(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});

function createMockFile(
  originalname: string,
  mimetype: string,
  buffer: Buffer
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype,
    buffer,
    size: buffer?.length ?? 0,
    stream: null as unknown as import('stream').Readable,
    destination: '',
    filename: '',
    path: '',
  };
}
