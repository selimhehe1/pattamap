import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PattaMap API',
      version: '9.2.0',
      description: 'API REST pour PattaMap - Plateforme de référencement des employées à Pattaya',
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

export const swaggerSpec = swaggerJsdoc(options);
