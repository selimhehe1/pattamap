import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from './auth';
import { logger } from '../utils/logger';

export interface AuditLogEntry {
  user_id: string;
  user_role: string;
  user_pseudonym: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address: string;
  user_agent: string;
  details?: Record<string, any>;
  status: 'success' | 'failed' | 'denied';
  timestamp: string;
}

// Log levels for different types of actions
export enum AuditLevel {
  LOW = 'low',        // Basic actions like viewing
  MEDIUM = 'medium',  // Modifications, approvals
  HIGH = 'high',      // User management, system changes
  CRITICAL = 'critical' // Security changes, admin account changes
}

// Action categories for better organization
export enum ActionCategory {
  AUTHENTICATION = 'authentication',
  USER_MANAGEMENT = 'user_management',
  CONTENT_MODERATION = 'content_moderation',
  SYSTEM_CONFIG = 'system_config',
  DATA_EXPORT = 'data_export',
  SECURITY = 'security'
}

// Create audit log entry
export const createAuditLog = async (logEntry: Partial<AuditLogEntry>): Promise<void> => {
  try {
    const fullEntry: AuditLogEntry = {
      user_id: logEntry.user_id || 'system',
      user_role: logEntry.user_role || 'unknown',
      user_pseudonym: logEntry.user_pseudonym || 'Unknown',
      action: logEntry.action || 'unknown_action',
      resource_type: logEntry.resource_type || 'unknown',
      resource_id: logEntry.resource_id,
      ip_address: logEntry.ip_address || 'unknown',
      user_agent: logEntry.user_agent || 'unknown',
      details: logEntry.details || {},
      status: logEntry.status || 'success',
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert(fullEntry);

    if (error) {
      logger.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break the main flow
    }
  } catch (error) {
    logger.error('Audit log creation error:', error);
  }
};

// Middleware to automatically log admin actions
export const auditLogger = (action: string, resourceType: string, level: AuditLevel = AuditLevel.MEDIUM) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Store original response methods to capture results
    const originalJson = res.json;
    const originalSend = res.send;
    const originalStatus = res.status;

    let statusCode = 200;
    let responseBody: any = null;

    // Override status method to capture status code
    res.status = function(code: number) {
      statusCode = code;
      return originalStatus.call(this, code);
    };

    // Override json method to capture response
    res.json = function(body: any) {
      responseBody = body;
      return originalJson.call(this, body);
    };

    // Override send method to capture response
    res.send = function(body: any) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    // Continue with the request
    res.on('finish', async () => {
      try {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Determine status based on HTTP status code
        let auditStatus: 'success' | 'failed' | 'denied' = 'success';
        if (statusCode >= 400 && statusCode < 500) {
          auditStatus = 'denied';
        } else if (statusCode >= 500) {
          auditStatus = 'failed';
        }

        // Extract relevant details from request and response
        const details: Record<string, any> = {
          method: req.method,
          url: req.originalUrl,
          duration: duration,
          statusCode: statusCode,
          level: level
        };

        // Add request body for certain actions (excluding sensitive data)
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
          const sanitizedBody = { ...req.body };
          // Remove sensitive fields
          delete sanitizedBody.password;
          delete sanitizedBody.token;
          delete sanitizedBody.secret;
          details.requestBody = sanitizedBody;
        }

        // Add query parameters
        if (Object.keys(req.query).length > 0) {
          details.queryParams = req.query;
        }

        // Add error details if request failed
        if (auditStatus !== 'success' && responseBody) {
          details.error = responseBody.error || responseBody.message;
        }

        // Add resource ID from request params if available
        const resourceId = req.params.id || req.params.userId || req.params.establishmentId || req.params.employeeId;

        await createAuditLog({
          user_id: req.user?.id,
          user_role: req.user?.role,
          user_pseudonym: req.user?.pseudonym,
          action: action,
          resource_type: resourceType,
          resource_id: resourceId,
          ip_address: req.ip || req.connection.remoteAddress || 'unknown',
          user_agent: req.get('User-Agent') || 'unknown',
          details: details,
          status: auditStatus
        });

        // Log critical actions to console as well
        if (level === AuditLevel.CRITICAL) {
          logger.warn(`🔴 CRITICAL AUDIT: ${req.user?.pseudonym} (${req.user?.role}) performed ${action} on ${resourceType} - Status: ${auditStatus}`);
        }

      } catch (error) {
        logger.error('Audit logging error:', error);
      }
    });

    next();
  };
};

// Specific audit loggers for common admin actions
export const auditAdminLogin = (req: AuthRequest, success: boolean) => {
  createAuditLog({
    user_id: req.user?.id || 'unknown',
    user_role: req.user?.role || 'unknown',
    user_pseudonym: req.user?.pseudonym || 'Unknown',
    action: 'admin_login',
    resource_type: 'authentication',
    ip_address: req.ip || req.connection.remoteAddress || 'unknown',
    user_agent: req.get('User-Agent') || 'unknown',
    details: { loginMethod: 'password' },
    status: success ? 'success' : 'failed'
  });
};

export const auditUserAction = (req: AuthRequest, action: string, targetUserId: string, details?: Record<string, any>) => {
  createAuditLog({
    user_id: req.user?.id,
    user_role: req.user?.role,
    user_pseudonym: req.user?.pseudonym,
    action: action,
    resource_type: 'user',
    resource_id: targetUserId,
    ip_address: req.ip || req.connection.remoteAddress || 'unknown',
    user_agent: req.get('User-Agent') || 'unknown',
    details: details,
    status: 'success'
  });
};

export const auditContentAction = (req: AuthRequest, action: string, contentType: string, contentId: string, details?: Record<string, any>) => {
  createAuditLog({
    user_id: req.user?.id,
    user_role: req.user?.role,
    user_pseudonym: req.user?.pseudonym,
    action: action,
    resource_type: contentType,
    resource_id: contentId,
    ip_address: req.ip || req.connection.remoteAddress || 'unknown',
    user_agent: req.get('User-Agent') || 'unknown',
    details: details,
    status: 'success'
  });
};

// Query audit logs with filters
export const queryAuditLogs = async (filters: {
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  level?: AuditLevel;
  limit?: number;
  offset?: number;
}) => {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.startDate) {
      query = query.gte('timestamp', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('timestamp', filters.endDate);
    }
    if (filters.level) {
      query = query.contains('details', { level: filters.level });
    }

    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Query audit logs error:', error);
    return [];
  }
};

// Clean up old audit logs (keep only last 90 days by default)
export const cleanupAuditLogs = async (retentionDays: number = 90) => {
  try {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('timestamp', cutoffDate.toISOString());

    if (error) {
      logger.error('Audit log cleanup error:', error);
      return false;
    }

    logger.debug(`Audit logs older than ${retentionDays} days cleaned up successfully`);
    return true;
  } catch (error) {
    logger.error('Audit log cleanup failed:', error);
    return false;
  }
};