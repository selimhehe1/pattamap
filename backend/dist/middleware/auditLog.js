"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupAuditLogs = exports.queryAuditLogs = exports.auditContentAction = exports.auditUserAction = exports.auditAdminLogin = exports.auditLogger = exports.createAuditLog = exports.ActionCategory = exports.AuditLevel = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
// Log levels for different types of actions
var AuditLevel;
(function (AuditLevel) {
    AuditLevel["LOW"] = "low";
    AuditLevel["MEDIUM"] = "medium";
    AuditLevel["HIGH"] = "high";
    AuditLevel["CRITICAL"] = "critical"; // Security changes, admin account changes
})(AuditLevel || (exports.AuditLevel = AuditLevel = {}));
// Action categories for better organization
var ActionCategory;
(function (ActionCategory) {
    ActionCategory["AUTHENTICATION"] = "authentication";
    ActionCategory["USER_MANAGEMENT"] = "user_management";
    ActionCategory["CONTENT_MODERATION"] = "content_moderation";
    ActionCategory["SYSTEM_CONFIG"] = "system_config";
    ActionCategory["DATA_EXPORT"] = "data_export";
    ActionCategory["SECURITY"] = "security";
})(ActionCategory || (exports.ActionCategory = ActionCategory = {}));
// Create audit log entry
const createAuditLog = async (logEntry) => {
    try {
        const fullEntry = {
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
        const { error } = await supabase_1.supabase
            .from('audit_logs')
            .insert(fullEntry);
        if (error) {
            logger_1.logger.error('Failed to create audit log:', error);
            // Don't throw - audit logging should not break the main flow
        }
    }
    catch (error) {
        logger_1.logger.error('Audit log creation error:', error);
    }
};
exports.createAuditLog = createAuditLog;
// Middleware to automatically log admin actions
const auditLogger = (action, resourceType, level = AuditLevel.MEDIUM) => {
    return async (req, res, next) => {
        const startTime = Date.now();
        // Store original response methods to capture results
        const originalJson = res.json;
        const originalSend = res.send;
        const originalStatus = res.status;
        let statusCode = 200;
        let responseBody = null;
        // Override status method to capture status code
        res.status = function (code) {
            statusCode = code;
            return originalStatus.call(this, code);
        };
        // Override json method to capture response
        res.json = function (body) {
            responseBody = body;
            return originalJson.call(this, body);
        };
        // Override send method to capture response
        res.send = function (body) {
            responseBody = body;
            return originalSend.call(this, body);
        };
        // Continue with the request
        res.on('finish', async () => {
            try {
                const endTime = Date.now();
                const duration = endTime - startTime;
                // Determine status based on HTTP status code
                let auditStatus = 'success';
                if (statusCode >= 400 && statusCode < 500) {
                    auditStatus = 'denied';
                }
                else if (statusCode >= 500) {
                    auditStatus = 'failed';
                }
                // Extract relevant details from request and response
                const details = {
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
                await (0, exports.createAuditLog)({
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
                    logger_1.logger.warn(`🔴 CRITICAL AUDIT: ${req.user?.pseudonym} (${req.user?.role}) performed ${action} on ${resourceType} - Status: ${auditStatus}`);
                }
            }
            catch (error) {
                logger_1.logger.error('Audit logging error:', error);
            }
        });
        next();
    };
};
exports.auditLogger = auditLogger;
// Specific audit loggers for common admin actions
const auditAdminLogin = (req, success) => {
    (0, exports.createAuditLog)({
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
exports.auditAdminLogin = auditAdminLogin;
const auditUserAction = (req, action, targetUserId, details) => {
    (0, exports.createAuditLog)({
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
exports.auditUserAction = auditUserAction;
const auditContentAction = (req, action, contentType, contentId, details) => {
    (0, exports.createAuditLog)({
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
exports.auditContentAction = auditContentAction;
// Query audit logs with filters
const queryAuditLogs = async (filters) => {
    try {
        let query = supabase_1.supabase
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
    }
    catch (error) {
        logger_1.logger.error('Query audit logs error:', error);
        return [];
    }
};
exports.queryAuditLogs = queryAuditLogs;
// Clean up old audit logs (keep only last 90 days by default)
const cleanupAuditLogs = async (retentionDays = 90) => {
    try {
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
        const { error } = await supabase_1.supabase
            .from('audit_logs')
            .delete()
            .lt('timestamp', cutoffDate.toISOString());
        if (error) {
            logger_1.logger.error('Audit log cleanup error:', error);
            return false;
        }
        logger_1.logger.debug(`Audit logs older than ${retentionDays} days cleaned up successfully`);
        return true;
    }
    catch (error) {
        logger_1.logger.error('Audit log cleanup failed:', error);
        return false;
    }
};
exports.cleanupAuditLogs = cleanupAuditLogs;
//# sourceMappingURL=auditLog.js.map