"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authController_1 = require("../authController");
const supabase_1 = require("../../config/supabase");
const csrf_1 = require("../../middleware/csrf");
// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../middleware/csrf');
// Mock global fetch for HaveIBeenPwned API
global.fetch = jest.fn();
describe('AuthController', () => {
    let mockRequest;
    let mockResponse;
    let jsonMock;
    let statusMock;
    let cookieMock;
    let clearCookieMock;
    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        cookieMock = jest.fn();
        clearCookieMock = jest.fn();
        mockRequest = {
            body: {},
            session: {
                csrfToken: 'initial-csrf-token',
                save: jest.fn((callback) => callback())
            },
            sessionID: 'test-session-id'
        };
        mockResponse = {
            status: statusMock,
            json: jsonMock,
            cookie: cookieMock,
            clearCookie: clearCookieMock
        };
        // Set JWT_SECRET for tests
        process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';
        process.env.JWT_EXPIRES_IN = '7d';
        process.env.BCRYPT_ROUNDS = '12';
        // Mock generateCSRFToken
        csrf_1.generateCSRFToken.mockReturnValue('new-csrf-token');
        jest.clearAllMocks();
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('register', () => {
        const validRegistration = {
            pseudonym: 'testuser',
            email: 'test@example.com',
            password: 'SecureP@ss123!' // Fixed: Added special chars
        };
        it('should register a new user successfully', async () => {
            mockRequest.body = validRegistration;
            // Mock user check (no existing users)
            supabase_1.supabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    or: jest.fn().mockResolvedValue({
                        data: [],
                        error: null
                    })
                })
            });
            // Mock HaveIBeenPwned API (not breached)
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue('ABCDE:5\nXYZ12:3') // No match
            });
            // Mock bcrypt hash
            bcryptjs_1.default.hash.mockResolvedValue('hashed-password');
            // Mock user creation
            const newUser = {
                id: 'user-123',
                pseudonym: 'testuser',
                email: 'test@example.com',
                role: 'user',
                is_active: true,
                account_type: 'regular',
                created_at: '2025-01-01'
            };
            supabase_1.supabase.from.mockReturnValueOnce({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: newUser,
                            error: null
                        })
                    })
                })
            });
            // Mock user_points creation
            supabase_1.supabase.from.mockReturnValueOnce({
                insert: jest.fn().mockResolvedValue({ error: null })
            });
            // Mock JWT sign
            jsonwebtoken_1.default.sign.mockReturnValue('jwt-token-123');
            await (0, authController_1.register)(mockRequest, mockResponse);
            expect(cookieMock).toHaveBeenCalledWith('auth-token', 'jwt-token-123', expect.objectContaining({
                httpOnly: true,
                sameSite: 'strict',
                path: '/'
            }));
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'User registered successfully',
                user: newUser,
                csrfToken: 'new-csrf-token',
                passwordBreached: false
            });
        });
        it('should register user with establishment_owner account type', async () => {
            mockRequest.body = {
                ...validRegistration,
                account_type: 'establishment_owner'
            };
            // Mock user check
            supabase_1.supabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    or: jest.fn().mockResolvedValue({ data: [], error: null })
                })
            });
            // Mock HaveIBeenPwned API (not breached)
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue('ABCDE:5')
            });
            // Mock bcrypt
            bcryptjs_1.default.hash.mockResolvedValue('hashed-password');
            // Mock user creation with account_type
            const newUser = {
                id: 'owner-123',
                pseudonym: 'testowner',
                email: 'test@example.com',
                role: 'user',
                is_active: true,
                account_type: 'establishment_owner',
                created_at: '2025-01-01'
            };
            supabase_1.supabase.from.mockReturnValueOnce({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: newUser,
                            error: null
                        })
                    })
                })
            });
            // Mock user_points creation
            supabase_1.supabase.from.mockReturnValueOnce({
                insert: jest.fn().mockResolvedValue({ error: null })
            });
            jsonwebtoken_1.default.sign.mockReturnValue('jwt-token-owner');
            await (0, authController_1.register)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                user: expect.objectContaining({
                    account_type: 'establishment_owner'
                })
            }));
        });
        it('should return 400 for missing required fields', async () => {
            mockRequest.body = { email: 'test@example.com' }; // Missing pseudonym and password
            await (0, authController_1.register)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Pseudonym, email and password are required',
                code: 'MISSING_FIELDS'
            });
        });
        it('should return 400 for invalid pseudonym format', async () => {
            mockRequest.body = {
                pseudonym: 'ab', // Too short
                email: 'test@example.com',
                password: 'SecurePass123'
            };
            await (0, authController_1.register)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Pseudonym must be 3-50 characters, alphanumeric with dash/underscore only',
                code: 'INVALID_PSEUDONYM'
            });
        });
        it('should return 400 for invalid email format', async () => {
            mockRequest.body = {
                pseudonym: 'testuser',
                email: 'invalid-email',
                password: 'SecurePass123'
            };
            await (0, authController_1.register)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Invalid email format',
                code: 'INVALID_EMAIL'
            });
        });
        it('should return 400 for weak password', async () => {
            mockRequest.body = {
                pseudonym: 'testuser',
                email: 'test@example.com',
                password: 'weak' // Missing uppercase, numbers
            };
            await (0, authController_1.register)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: expect.stringContaining('Password must'),
                code: 'INVALID_PASSWORD'
            });
        });
        it('should return 409 for duplicate email', async () => {
            mockRequest.body = validRegistration;
            // Mock existing user with same email
            supabase_1.supabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    or: jest.fn().mockResolvedValue({
                        data: [{ id: 'existing', email: 'test@example.com', pseudonym: 'other' }],
                        error: null
                    })
                })
            });
            // Note: Breach check not reached, but mock for safety
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue('ABCDE:5')
            });
            await (0, authController_1.register)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(409);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'User with this email already exists',
                code: 'USER_EXISTS'
            });
        });
        it('should return 409 for duplicate pseudonym', async () => {
            mockRequest.body = validRegistration;
            // Mock existing user with same pseudonym
            supabase_1.supabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    or: jest.fn().mockResolvedValue({
                        data: [{ id: 'existing', email: 'other@example.com', pseudonym: 'testuser' }],
                        error: null
                    })
                })
            });
            // Note: Breach check not reached, but mock for safety
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue('ABCDE:5')
            });
            await (0, authController_1.register)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(409);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'User with this pseudonym already exists',
                code: 'USER_EXISTS'
            });
        });
        it('should return 500 if JWT_SECRET is missing', async () => {
            delete process.env.JWT_SECRET;
            mockRequest.body = validRegistration;
            // Mock successful user checks
            supabase_1.supabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    or: jest.fn().mockResolvedValue({ data: [], error: null })
                })
            });
            // Mock HaveIBeenPwned API (not breached)
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue('ABCDE:5')
            });
            bcryptjs_1.default.hash.mockResolvedValue('hashed');
            supabase_1.supabase.from.mockReturnValueOnce({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: { id: 'user-123' },
                            error: null
                        })
                    })
                })
            });
            // Mock user_points creation
            supabase_1.supabase.from.mockReturnValueOnce({
                insert: jest.fn().mockResolvedValue({ error: null })
            });
            // Mock delete (rollback) for when JWT_SECRET is missing
            supabase_1.supabase.from.mockReturnValueOnce({
                delete: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: null })
                })
            });
            supabase_1.supabase.from.mockReturnValueOnce({
                delete: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: null })
                })
            });
            await (0, authController_1.register)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Server configuration error' });
            // Restore JWT_SECRET
            process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';
        });
    });
    describe('login', () => {
        const validCredentials = {
            login: 'testuser',
            password: 'SecurePass123'
        };
        const mockUser = {
            id: 'user-123',
            pseudonym: 'testuser',
            email: 'test@example.com',
            password: 'hashed-password',
            role: 'user',
            is_active: true
        };
        it('should login user with pseudonym successfully', async () => {
            mockRequest.body = validCredentials;
            // Mock user fetch
            supabase_1.supabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    or: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({
                            data: [mockUser],
                            error: null
                        })
                    })
                })
            });
            // Mock password comparison
            bcryptjs_1.default.compare.mockResolvedValue(true);
            // Mock JWT sign
            jsonwebtoken_1.default.sign.mockReturnValue('jwt-token-login');
            await (0, authController_1.login)(mockRequest, mockResponse);
            expect(cookieMock).toHaveBeenCalledWith('auth-token', 'jwt-token-login', expect.any(Object));
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Login successful',
                user: expect.objectContaining({
                    id: 'user-123',
                    pseudonym: 'testuser'
                }),
                csrfToken: 'new-csrf-token'
            });
        });
        it('should login user with email successfully', async () => {
            mockRequest.body = {
                login: 'test@example.com',
                password: 'SecurePass123'
            };
            supabase_1.supabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    or: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({
                            data: [mockUser],
                            error: null
                        })
                    })
                })
            });
            bcryptjs_1.default.compare.mockResolvedValue(true);
            jsonwebtoken_1.default.sign.mockReturnValue('jwt-token-email');
            await (0, authController_1.login)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Login successful',
                user: expect.objectContaining({
                    email: 'test@example.com'
                }),
                csrfToken: 'new-csrf-token'
            });
        });
        it('should return 400 for missing credentials', async () => {
            mockRequest.body = { login: 'testuser' }; // Missing password
            await (0, authController_1.login)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Login and password are required',
                code: 'MISSING_FIELDS'
            });
        });
        it('should return 401 for non-existent user', async () => {
            mockRequest.body = validCredentials;
            supabase_1.supabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    or: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({
                            data: [],
                            error: null
                        })
                    })
                })
            });
            await (0, authController_1.login)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        });
        it('should return 401 for incorrect password', async () => {
            mockRequest.body = validCredentials;
            supabase_1.supabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    or: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({
                            data: [mockUser],
                            error: null
                        })
                    })
                })
            });
            bcryptjs_1.default.compare.mockResolvedValue(false);
            await (0, authController_1.login)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        });
        it('should return 500 if JWT_SECRET is missing', async () => {
            delete process.env.JWT_SECRET;
            mockRequest.body = validCredentials;
            supabase_1.supabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    or: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({
                            data: [mockUser],
                            error: null
                        })
                    })
                })
            });
            bcryptjs_1.default.compare.mockResolvedValue(true);
            await (0, authController_1.login)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Server configuration error' });
            // Restore JWT_SECRET
            process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';
        });
    });
    describe('getProfile', () => {
        it('should return user profile with linked employee', async () => {
            mockRequest = {
                user: {
                    id: 'user-123',
                    pseudonym: 'testuser',
                    email: 'test@example.com',
                    role: 'user',
                    is_active: true
                }
            };
            const mockProfile = {
                id: 'user-123',
                pseudonym: 'testuser',
                email: 'test@example.com',
                role: 'user',
                is_active: true,
                account_type: 'employee',
                linked_employee_id: 'emp-123',
                created_at: '2025-01-01',
                linkedEmployee: {
                    id: 'emp-123',
                    name: 'Test Employee',
                    photos: ['photo1.jpg'],
                    status: 'approved'
                }
            };
            supabase_1.supabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: mockProfile,
                            error: null
                        })
                    })
                })
            });
            await (0, authController_1.getProfile)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                user: expect.objectContaining({
                    id: 'user-123',
                    linkedEmployee: expect.objectContaining({
                        id: 'emp-123',
                        name: 'Test Employee'
                    })
                })
            });
        });
        it('should return 401 for unauthenticated request', async () => {
            mockRequest = {}; // No user
            await (0, authController_1.getProfile)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        });
        it('should return 404 if user profile not found', async () => {
            mockRequest = {
                user: {
                    id: 'non-existent',
                    pseudonym: 'test',
                    email: 'test@test.com',
                    role: 'user',
                    is_active: true
                }
            };
            supabase_1.supabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: null,
                            error: { message: 'Not found' }
                        })
                    })
                })
            });
            await (0, authController_1.getProfile)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'User profile not found',
                code: 'USER_NOT_FOUND'
            });
        });
    });
    describe('changePassword', () => {
        it('should change password successfully', async () => {
            mockRequest = {
                user: {
                    id: 'user-123',
                    pseudonym: 'testuser',
                    email: 'test@example.com',
                    role: 'user',
                    is_active: true
                },
                body: {
                    currentPassword: 'OldP@ss123!', // Fixed: Added special chars
                    newPassword: 'NewSecureP@ss456!' // Fixed: Added special chars
                }
            };
            // Mock HaveIBeenPwned API (not breached)
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue('ABCDE:5')
            });
            // Mock fetch current password
            supabase_1.supabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: { password: 'hashed-old-password' },
                            error: null
                        })
                    })
                })
            });
            // Mock password comparison (correct current password)
            bcryptjs_1.default.compare.mockResolvedValue(true);
            // Mock new password hashing
            bcryptjs_1.default.hash.mockResolvedValue('hashed-new-password');
            // Mock password update
            supabase_1.supabase.from.mockReturnValueOnce({
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({
                        error: null
                    })
                })
            });
            await (0, authController_1.changePassword)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Password changed successfully',
                passwordBreached: false
            });
        });
        it('should return 401 for unauthenticated request', async () => {
            mockRequest = {
                body: {
                    currentPassword: 'OldPass123',
                    newPassword: 'NewSecurePass456'
                }
            }; // No user
            await (0, authController_1.changePassword)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        });
        it('should return 400 for missing fields', async () => {
            mockRequest = {
                user: {
                    id: 'user-123',
                    pseudonym: 'testuser',
                    email: 'test@example.com',
                    role: 'user',
                    is_active: true
                },
                body: {
                    currentPassword: 'OldPass123'
                    // Missing newPassword
                }
            };
            await (0, authController_1.changePassword)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Current and new password are required',
                code: 'MISSING_FIELDS'
            });
        });
        it('should return 400 for invalid new password', async () => {
            mockRequest = {
                user: {
                    id: 'user-123',
                    pseudonym: 'testuser',
                    email: 'test@example.com',
                    role: 'user',
                    is_active: true
                },
                body: {
                    currentPassword: 'OldPass123',
                    newPassword: 'weak' // Invalid password
                }
            };
            await (0, authController_1.changePassword)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: expect.stringContaining('Password must'),
                code: 'INVALID_PASSWORD'
            });
        });
        it('should return 401 for incorrect current password', async () => {
            mockRequest = {
                user: {
                    id: 'user-123',
                    pseudonym: 'testuser',
                    email: 'test@example.com',
                    role: 'user',
                    is_active: true
                },
                body: {
                    currentPassword: 'WrongOldP@ss!', // Fixed: Added special chars
                    newPassword: 'NewSecureP@ss456!' // Fixed: Added special chars
                }
            };
            // Mock HaveIBeenPwned API (not breached)
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue('ABCDE:5')
            });
            supabase_1.supabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: { password: 'hashed-old-password' },
                            error: null
                        })
                    })
                })
            });
            bcryptjs_1.default.compare.mockResolvedValue(false);
            await (0, authController_1.changePassword)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Current password is incorrect',
                code: 'INVALID_CURRENT_PASSWORD'
            });
        });
    });
    describe('logout', () => {
        it('should logout successfully and clear cookie', async () => {
            await (0, authController_1.logout)(mockRequest, mockResponse);
            expect(clearCookieMock).toHaveBeenCalledWith('auth-token', {
                httpOnly: true,
                secure: false, // Test environment
                sameSite: 'strict',
                path: '/'
            });
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Logout successful'
            });
        });
        it('should handle logout errors gracefully', async () => {
            clearCookieMock.mockImplementation(() => {
                throw new Error('Cookie clear error');
            });
            await (0, authController_1.logout)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Logout failed',
                code: 'INTERNAL_ERROR'
            });
        });
    });
});
//# sourceMappingURL=authController.test.js.map