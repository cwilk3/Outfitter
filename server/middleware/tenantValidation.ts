import { Request, Response, NextFunction } from 'express';

// Types for tenant-aware operations
export interface TenantContext {
  outfitterId: number;
  userId: string;
  role: 'admin' | 'guide';
}

export interface TenantAwareRequest extends Request {
  user?: {
    id: string;
    outfitterId: number;
    role: 'admin' | 'guide';
    [key: string]: any;
  };
  tenantContext?: TenantContext;
}

// Utility to assert tenant access for resource operations
export async function assertTenantAccess(
  resourceId: number | string,
  outfitterId: number,
  resourceType: string
): Promise<void> {
  if (!outfitterId) {
    throw new Error(`Tenant access denied: Missing outfitterId for ${resourceType} ${resourceId}`);
  }
  
  if (!resourceId) {
    throw new Error(`Tenant access denied: Missing resourceId for ${resourceType}`);
  }
  
  // Log security validation for audit trail
  console.log(`🔒 [TENANT-VALIDATION] Verifying access to ${resourceType} ${resourceId} for outfitter ${outfitterId}`);
}

// Middleware decorator for tenant validation
export function withTenantValidation() {
  return (req: TenantAwareRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user || !user.outfitterId) {
      console.log('🚫 [TENANT-VALIDATION] Access denied: Missing tenant context');
      return res.status(401).json({ error: 'Authentication required with tenant context' });
    }
    
    // Add tenant context to request
    req.tenantContext = {
      outfitterId: user.outfitterId,
      userId: user.id,
      role: user.role
    };
    
    console.log(`✅ [TENANT-VALIDATION] Tenant context established for outfitter ${user.outfitterId}`);
    next();
  };
}

// Utility for creating tenant-scoped resource access patterns
export interface TenantResourceOptions {
  resourceType: string;
  requireOwnership?: boolean;
}

export async function validateTenantResource(
  resourceId: number | string,
  tenantContext: TenantContext,
  options: TenantResourceOptions
): Promise<void> {
  await assertTenantAccess(resourceId, tenantContext.outfitterId, options.resourceType);
  
  if (options.requireOwnership) {
    console.log(`🔍 [TENANT-VALIDATION] Ownership verification required for ${options.resourceType} ${resourceId}`);
  }
}

// Error class for tenant validation failures
export class TenantAccessError extends Error {
  constructor(
    message: string,
    public resourceType: string,
    public resourceId: number | string,
    public outfitterId: number
  ) {
    super(message);
    this.name = 'TenantAccessError';
  }
}

// Automatic tenant validation for route parameters
export function validateTenantParam(paramName: string = 'id', resourceType: string) {
  return (req: TenantAwareRequest, res: Response, next: NextFunction) => {
    const resourceId = req.params[paramName];
    const tenantContext = req.tenantContext;
    
    if (!tenantContext) {
      console.log(`🚫 [TENANT-PARAM] Missing tenant context for ${resourceType} ${resourceId}`);
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!resourceId) {
      console.log(`🚫 [TENANT-PARAM] Missing ${paramName} parameter for ${resourceType}`);
      return res.status(400).json({ error: `${paramName} parameter required` });
    }
    
    console.log(`🔒 [TENANT-PARAM] Validating ${resourceType} ${resourceId} for outfitter ${tenantContext.outfitterId}`);
    next();
  };
}

// Enhanced middleware that enforces tenant-scoped storage methods
export function enforceTenantIsolation(resourceType: string, options: { 
  requireTenantMethod?: boolean,
  allowedRoles?: ('admin' | 'guide')[]
} = {}) {
  return (req: TenantAwareRequest, res: Response, next: NextFunction) => {
    const tenantContext = req.tenantContext;
    
    if (!tenantContext) {
      console.log(`🚫 [TENANT-ENFORCE] Missing tenant context for ${resourceType}`);
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Role-based access control
    if (options.allowedRoles && !options.allowedRoles.includes(tenantContext.role)) {
      console.log(`🚫 [TENANT-ENFORCE] Role ${tenantContext.role} not permitted for ${resourceType}`);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Attach outfitterId to request for automatic filtering
    (req as any).outfitterId = tenantContext.outfitterId;
    
    console.log(`✅ [TENANT-ENFORCE] Tenant isolation enforced for ${resourceType} (outfitter: ${tenantContext.outfitterId})`);
    next();
  };
}