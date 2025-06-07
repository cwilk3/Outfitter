import { Request, Response, NextFunction } from 'express';
import { TenantAwareRequest } from './tenantValidation';

// Enhanced security patterns for cross-tenant protection
export interface TenantSecurityConfig {
  enforceResourceOwnership: boolean;
  logSecurityEvents: boolean;
  preventCrossTenantQueries: boolean;
  auditTrail: boolean;
}

// Security audit logger for tenant violations
export class TenantSecurityAuditor {
  static logSecurityEvent(
    eventType: 'ACCESS_VIOLATION' | 'CROSS_TENANT_ATTEMPT' | 'UNAUTHORIZED_QUERY',
    details: {
      userId?: string;
      outfitterId?: number;
      resourceType?: string;
      resourceId?: string | number;
      attemptedAction?: string;
      userAgent?: string;
      ip?: string;
    }
  ) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      eventType,
      severity: 'HIGH',
      ...details
    };
    
    console.error(`🚨 [SECURITY-AUDIT] ${eventType}:`, JSON.stringify(logEntry, null, 2));
  }
}

// Cross-tenant data leakage prevention
export function preventCrossTenantLeakage() {
  return (req: TenantAwareRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    
    res.json = function(data: any) {
      if (Array.isArray(data)) {
        // Audit array responses for potential cross-tenant data
        const tenantContext = req.tenantContext;
        if (tenantContext && data.length > 0) {
          data.forEach((item, index) => {
            if (item.outfitterId && item.outfitterId !== tenantContext.outfitterId) {
              TenantSecurityAuditor.logSecurityEvent('CROSS_TENANT_ATTEMPT', {
                userId: tenantContext.userId,
                outfitterId: tenantContext.outfitterId,
                resourceType: req.path,
                attemptedAction: 'DATA_LEAK_PREVENTION',
                userAgent: req.headers['user-agent'],
                ip: req.ip
              });
              
              // Remove cross-tenant data
              data.splice(index, 1);
            }
          });
        }
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

// Resource ownership verification
export function verifyResourceOwnership(resourceType: string) {
  return async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
    const tenantContext = req.tenantContext;
    const resourceId = req.params.id;
    
    if (!tenantContext || !resourceId) {
      return next();
    }
    
    // Log ownership verification attempt
    console.log(`🔐 [OWNERSHIP-CHECK] Verifying ${resourceType} ${resourceId} ownership for outfitter ${tenantContext.outfitterId}`);
    
    // This would typically involve a database check
    // For now, we log the verification attempt
    TenantSecurityAuditor.logSecurityEvent('UNAUTHORIZED_QUERY', {
      userId: tenantContext.userId,
      outfitterId: tenantContext.outfitterId,
      resourceType,
      resourceId,
      attemptedAction: 'OWNERSHIP_VERIFICATION'
    });
    
    next();
  };
}

// Query parameter sanitization for tenant safety
export function sanitizeTenantQueries() {
  return (req: TenantAwareRequest, res: Response, next: NextFunction) => {
    const dangerousParams = ['outfitterId', 'tenantId', 'companyId'];
    const tenantContext = req.tenantContext;
    
    if (tenantContext) {
      // Remove any attempts to override tenant context via query params
      dangerousParams.forEach(param => {
        if (req.query[param]) {
          console.warn(`⚠️ [QUERY-SANITIZE] Removing dangerous parameter ${param} from query`);
          delete req.query[param];
        }
      });
      
      // Force tenant context in query operations
      (req as any).sanitizedQuery = {
        ...req.query,
        outfitterId: tenantContext.outfitterId
      };
    }
    
    next();
  };
}

// Rate limiting per tenant to prevent abuse
export class TenantRateLimiter {
  private static requestCounts: Map<string, { count: number; lastReset: number }> = new Map();
  private static readonly WINDOW_MS = 60000; // 1 minute
  private static readonly MAX_REQUESTS = 1000; // per tenant per minute
  
  static middleware() {
    return (req: TenantAwareRequest, res: Response, next: NextFunction) => {
      const tenantContext = req.tenantContext;
      
      if (!tenantContext) {
        return next();
      }
      
      const tenantKey = `tenant_${tenantContext.outfitterId}`;
      const now = Date.now();
      const tenantData = this.requestCounts.get(tenantKey);
      
      if (!tenantData || (now - tenantData.lastReset) > this.WINDOW_MS) {
        this.requestCounts.set(tenantKey, { count: 1, lastReset: now });
        return next();
      }
      
      if (tenantData.count >= this.MAX_REQUESTS) {
        TenantSecurityAuditor.logSecurityEvent('ACCESS_VIOLATION', {
          userId: tenantContext.userId,
          outfitterId: tenantContext.outfitterId,
          attemptedAction: 'RATE_LIMIT_EXCEEDED',
          userAgent: req.headers['user-agent'],
          ip: req.ip
        });
        
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((this.WINDOW_MS - (now - tenantData.lastReset)) / 1000)
        });
      }
      
      tenantData.count++;
      next();
    };
  }
}

// Enhanced tenant security middleware stack
export function enableTenantSecurity(config: Partial<TenantSecurityConfig> = {}) {
  const fullConfig: TenantSecurityConfig = {
    enforceResourceOwnership: true,
    logSecurityEvents: true,
    preventCrossTenantQueries: true,
    auditTrail: true,
    ...config
  };
  
  return [
    sanitizeTenantQueries(),
    preventCrossTenantLeakage(),
    TenantRateLimiter.middleware()
  ];
}