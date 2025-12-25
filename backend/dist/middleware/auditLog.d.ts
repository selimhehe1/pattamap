import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
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
export declare enum AuditLevel {
    LOW = "low",// Basic actions like viewing
    MEDIUM = "medium",// Modifications, approvals
    HIGH = "high",// User management, system changes
    CRITICAL = "critical"
}
export declare enum ActionCategory {
    AUTHENTICATION = "authentication",
    USER_MANAGEMENT = "user_management",
    CONTENT_MODERATION = "content_moderation",
    SYSTEM_CONFIG = "system_config",
    DATA_EXPORT = "data_export",
    SECURITY = "security"
}
export declare const createAuditLog: (logEntry: Partial<AuditLogEntry>) => Promise<void>;
export declare const auditLogger: (action: string, resourceType: string, level?: AuditLevel) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const auditAdminLogin: (req: AuthRequest, success: boolean) => void;
export declare const auditUserAction: (req: AuthRequest, action: string, targetUserId: string, details?: Record<string, any>) => void;
export declare const auditContentAction: (req: AuthRequest, action: string, contentType: string, contentId: string, details?: Record<string, any>) => void;
export declare const queryAuditLogs: (filters: {
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    level?: AuditLevel;
    limit?: number;
    offset?: number;
}) => Promise<any[]>;
export declare const cleanupAuditLogs: (retentionDays?: number) => Promise<boolean>;
//# sourceMappingURL=auditLog.d.ts.map