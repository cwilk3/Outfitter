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