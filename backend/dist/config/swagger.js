"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'PattaMap API',
            version: '10.2.0',
            description: 'API REST pour PattaMap - Plateforme de référencement des employées à Pattaya. v10.2: Ownership Request System + In-app Notifications',
            contact: {
                name: 'PattaMap Team',
                email: 'support@pattamap.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:8080',
                description: 'Development server'
            },
            {
                url: 'https://api.pattamap.com',
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token from /api/auth/login'
                },
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'auth-token',
                    description: 'HttpOnly cookie containing JWT token'
                },
                csrfToken: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-CSRF-Token',
                    description: 'CSRF token from /api/csrf-token'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'User unique identifier'
                        },
                        pseudonym: {
                            type: 'string',
                            description: 'User pseudonym/username'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email address'
                        },
                        role: {
                            type: 'string',
                            enum: ['user', 'moderator', 'admin'],
                            description: 'User role'
                        },
                        account_type: {
                            type: 'string',
                            enum: ['regular', 'employee', 'establishment_owner'],
                            description: 'Account type (v10.1)',
                            default: 'regular'
                        },
                        is_active: {
                            type: 'boolean',
                            description: 'Whether user account is active'
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                Employee: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        name: {
                            type: 'string',
                            description: 'Employee name or stage name'
                        },
                        age: {
                            type: 'integer',
                            minimum: 18
                        },
                        nationality: {
                            type: 'string',
                            description: 'Primary nationality'
                        },
                        secondary_nationality: {
                            type: 'string',
                            nullable: true,
                            description: 'Secondary nationality (bi-national)'
                        },
                        gender: {
                            type: 'string',
                            enum: ['female', 'trans'],
                            description: 'Gender identity'
                        },
                        profile_image: {
                            type: 'string',
                            format: 'uri',
                            nullable: true,
                            description: 'Cloudinary image URL'
                        },
                        instagram: {
                            type: 'string',
                            nullable: true
                        },
                        line_id: {
                            type: 'string',
                            nullable: true
                        },
                        whatsapp: {
                            type: 'string',
                            nullable: true
                        },
                        current_establishment: {
                            $ref: '#/components/schemas/Establishment'
                        }
                    }
                },
                Establishment: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        name: {
                            type: 'string'
                        },
                        type: {
                            type: 'string',
                            enum: ['bar', 'gogo', 'nightclub', 'massage'],
                            description: 'Type of establishment'
                        },
                        zone: {
                            type: 'string',
                            enum: [
                                'Soi 6',
                                'Walking Street',
                                'LK Metro',
                                'Treetown',
                                'Soi Buakhao',
                                'Jomtien Complex',
                                'BoyzTown',
                                'Soi 7&8',
                                'Beach Road Central'
                            ]
                        },
                        address: {
                            type: 'string',
                            nullable: true
                        },
                        google_maps_url: {
                            type: 'string',
                            format: 'uri',
                            nullable: true
                        },
                        logo_url: {
                            type: 'string',
                            format: 'uri',
                            nullable: true
                        },
                        status: {
                            type: 'string',
                            enum: ['pending', 'approved', 'rejected'],
                            default: 'pending'
                        }
                    }
                },
                Comment: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        employee_id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        user_id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        content: {
                            type: 'string'
                        },
                        rating: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 5,
                            nullable: true,
                            description: 'Star rating (1-5)'
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time'
                        },
                        updated_at: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                EstablishmentOwner: {
                    type: 'object',
                    description: 'Establishment ownership assignment (v10.1)',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Ownership record unique identifier'
                        },
                        user_id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'User (establishment owner account)'
                        },
                        establishment_id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Establishment being managed'
                        },
                        owner_role: {
                            type: 'string',
                            enum: ['owner', 'manager'],
                            description: 'Owner (full control) vs Manager (limited control)'
                        },
                        permissions: {
                            type: 'object',
                            description: 'Granular permissions (JSONB)',
                            properties: {
                                can_edit_info: {
                                    type: 'boolean',
                                    description: 'Edit name, address, description, hours'
                                },
                                can_edit_pricing: {
                                    type: 'boolean',
                                    description: 'Edit ladydrink, barfine, room rates'
                                },
                                can_edit_photos: {
                                    type: 'boolean',
                                    description: 'Upload/manage venue photos and logo'
                                },
                                can_edit_employees: {
                                    type: 'boolean',
                                    description: 'Manage employee roster'
                                },
                                can_view_analytics: {
                                    type: 'boolean',
                                    description: 'View performance metrics'
                                }
                            }
                        },
                        assigned_by: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true,
                            description: 'Admin who assigned ownership (audit trail)'
                        },
                        assigned_at: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Timestamp of assignment'
                        }
                    }
                },
                EstablishmentOwnershipRequest: {
                    type: 'object',
                    description: 'Ownership request submission (v10.2)',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Request unique identifier'
                        },
                        user_id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'User who submitted the request'
                        },
                        establishment_id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Establishment being claimed'
                        },
                        establishment_name: {
                            type: 'string',
                            description: 'Establishment name (from join)'
                        },
                        request_message: {
                            type: 'string',
                            nullable: true,
                            description: 'User message explaining ownership claim'
                        },
                        verification_code: {
                            type: 'string',
                            nullable: true,
                            description: 'Optional verification code (e.g., from establishment profile)'
                        },
                        documents_urls: {
                            type: 'array',
                            items: {
                                type: 'string',
                                format: 'uri'
                            },
                            description: 'Cloudinary URLs of uploaded documents (license, ID, etc.)'
                        },
                        status: {
                            type: 'string',
                            enum: ['pending', 'approved', 'rejected'],
                            description: 'Request status',
                            default: 'pending'
                        },
                        admin_notes: {
                            type: 'string',
                            nullable: true,
                            description: 'Admin notes from review (approval/rejection reason)'
                        },
                        reviewed_by: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true,
                            description: 'Admin who reviewed the request'
                        },
                        reviewed_at: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                            description: 'Timestamp of review'
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Request submission timestamp'
                        }
                    }
                },
                Notification: {
                    type: 'object',
                    description: 'In-app notification (v10.2)',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Notification unique identifier'
                        },
                        user_id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Recipient user ID'
                        },
                        type: {
                            type: 'string',
                            enum: [
                                'ownership_request_approved',
                                'ownership_request_rejected',
                                'establishment_updated',
                                'employee_updated',
                                'comment_reply',
                                'system'
                            ],
                            description: 'Notification type'
                        },
                        title: {
                            type: 'string',
                            description: 'Notification title (short summary)'
                        },
                        message: {
                            type: 'string',
                            description: 'Notification message (detailed content)'
                        },
                        link: {
                            type: 'string',
                            nullable: true,
                            description: 'Optional link to related resource (e.g., /my-establishments)'
                        },
                        is_read: {
                            type: 'boolean',
                            description: 'Whether user has read the notification',
                            default: false
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Notification creation timestamp'
                        }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error message'
                        },
                        code: {
                            type: 'string',
                            description: 'Error code for programmatic handling'
                        }
                    }
                },
                CSRFToken: {
                    type: 'object',
                    properties: {
                        csrfToken: {
                            type: 'string',
                            description: 'CSRF token (64 hex characters)'
                        },
                        sessionId: {
                            type: 'string',
                            description: 'Session ID for debugging'
                        },
                        expiresAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Token expiration time'
                        }
                    }
                }
            }
        },
        tags: [
            {
                name: 'Auth',
                description: 'Authentication endpoints (login, register, logout)'
            },
            {
                name: 'Employees',
                description: 'Employee management (CRUD, search)'
            },
            {
                name: 'Establishments',
                description: 'Establishment management (bars, gogos, nightclubs, massages)'
            },
            {
                name: 'Comments',
                description: 'Comments and ratings management'
            },
            {
                name: 'Establishment Owners',
                description: 'Establishment ownership management (v10.1) - Assign owners to establishments with granular permissions'
            },
            {
                name: 'Ownership Requests',
                description: 'Ownership request submission and approval workflow (v10.2) - Users request ownership, admins review and approve/reject'
            },
            {
                name: 'Notifications',
                description: 'In-app notification system (v10.2) - Real-time updates for ownership requests, comments, and system events'
            },
            {
                name: 'Admin',
                description: 'Admin-only endpoints (require admin role)'
            },
            {
                name: 'Security',
                description: 'Security endpoints (CSRF token)'
            }
        ]
    },
    apis: [
        './src/routes/*.ts',
        './src/server.ts'
    ]
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
//# sourceMappingURL=swagger.js.map