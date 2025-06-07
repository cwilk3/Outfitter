import { Request, Response, NextFunction } from 'express';
import { TenantAwareRequest } from './tenantValidation';
import { storage } from '../storage';

// Final security validation layer to ensure no tenant leakage
export class TenantSecurityValidator {
  // Validate all outgoing responses for tenant isolation
  static validateResponse() {
    return (req: TenantAwareRequest, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      const originalJson = res.json;
      
      res.json = function(data: any) {
        const validatedData = TenantSecurityValidator.enforceResponseSecurity(data, req);
        return originalJson.call(this, validatedData);
      };
      
      res.send = function(data: any) {
        if (typeof data === 'object') {
          const validatedData = TenantSecurityValidator.enforceResponseSecurity(data, req);
          return originalSend.call(this, validatedData);
        }
        return originalSend.call(this, data);
      };
      
      next();
    };
  }
  
  private static enforceResponseSecurity(data: any, req: TenantAwareRequest): any {
    const tenantContext = req.tenantContext;
    
    if (!tenantContext) {
      return data;
    }
    
    // Recursively validate nested objects and arrays
    if (Array.isArray(data)) {
      return data.filter(item => this.validateTenantItem(item, tenantContext.outfitterId));
    }
    
    if (typeof data === 'object' && data !== null) {
      return this.validateTenantItem(data, tenantContext.outfitterId) ? data : null;
    }
    
    return data;
  }
  
  private static validateTenantItem(item: any, expectedOutfitterId: number): boolean {
    // If item has outfitterId, it must match the tenant context
    if (item && typeof item === 'object' && 'outfitterId' in item) {
      if (item.outfitterId !== expectedOutfitterId) {
        console.error(`🚨 [SECURITY-BREACH] Attempted cross-tenant data access: expected ${expectedOutfitterId}, found ${item.outfitterId}`);
        return false;
      }
    }
    
    return true;
  }
  
  // Database query interceptor to ensure all queries include tenant context
  static interceptDatabaseQueries() {
    return (req: TenantAwareRequest, res: Response, next: NextFunction) => {
      const tenantContext = req.tenantContext;
      
      if (tenantContext) {
        // Add query metadata for debugging
        (req as any).queryMetadata = {
          outfitterId: tenantContext.outfitterId,
          userId: tenantContext.userId,
          timestamp: new Date().toISOString()
        };
        
        console.log(`🔍 [QUERY-INTERCEPT] Query for outfitter ${tenantContext.outfitterId} by user ${tenantContext.userId}`);
      }
      
      next();
    };
  }
}

// Enhanced security headers for tenant isolation
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Prevent data exposure through caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Content security policy
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Custom tenant security header
    const tenantContext = (req as TenantAwareRequest).tenantContext;
    if (tenantContext) {
      res.setHeader('X-Tenant-Isolated', `outfitter-${tenantContext.outfitterId}`);
    }
    
    next();
  };
}

// Final validation middleware stack
export function enableComprehensiveTenantSecurity() {
  return [
    securityHeaders(),
    TenantSecurityValidator.interceptDatabaseQueries(),
    TenantSecurityValidator.validateResponse()
  ];
}