import { Request, Response, NextFunction } from 'express';
import { TenantAwareRequest } from './tenantValidation';
import { tenantCache, cacheKeys } from '../cache/tenantCache';

interface CacheInvalidationConfig {
  patterns: string[];
  specific?: string[];
  invalidateAll?: boolean;
}

// Cache invalidation mapping for different operations
const invalidationMap = new Map<string, CacheInvalidationConfig>([
  // Booking operations
  ['POST:/api/bookings', { patterns: [cacheKeys.BOOKINGS, cacheKeys.DASHBOARD_STATS, cacheKeys.UPCOMING_BOOKINGS] }],
  ['PUT:/api/bookings', { patterns: [cacheKeys.BOOKINGS, cacheKeys.DASHBOARD_STATS, cacheKeys.UPCOMING_BOOKINGS] }],
  ['DELETE:/api/bookings', { patterns: [cacheKeys.BOOKINGS, cacheKeys.DASHBOARD_STATS, cacheKeys.UPCOMING_BOOKINGS] }],
  
  // Customer operations
  ['POST:/api/customers', { patterns: [cacheKeys.CUSTOMERS, cacheKeys.DASHBOARD_STATS] }],
  ['PUT:/api/customers', { patterns: [cacheKeys.CUSTOMERS] }],
  ['DELETE:/api/customers', { patterns: [cacheKeys.CUSTOMERS, cacheKeys.DASHBOARD_STATS] }],
  
  // Experience operations
  ['POST:/api/experiences', { patterns: [cacheKeys.EXPERIENCES, cacheKeys.DASHBOARD_STATS] }],
  ['PUT:/api/experiences', { patterns: [cacheKeys.EXPERIENCES, cacheKeys.EXPERIENCE_GUIDES] }],
  ['DELETE:/api/experiences', { patterns: [cacheKeys.EXPERIENCES, cacheKeys.EXPERIENCE_GUIDES, cacheKeys.DASHBOARD_STATS] }],
  
  // Location operations
  ['POST:/api/locations', { patterns: [cacheKeys.LOCATIONS] }],
  ['PUT:/api/locations', { patterns: [cacheKeys.LOCATIONS] }],
  ['DELETE:/api/locations', { patterns: [cacheKeys.LOCATIONS] }],
  
  // User operations
  ['POST:/api/users', { patterns: [cacheKeys.USERS] }],
  ['PUT:/api/users', { patterns: [cacheKeys.USERS] }],
  ['DELETE:/api/users', { patterns: [cacheKeys.USERS, cacheKeys.EXPERIENCE_GUIDES] }],
  
  // Settings operations
  ['POST:/api/dashboard/settings', { patterns: [cacheKeys.SETTINGS] }],
  ['PUT:/api/dashboard/settings', { patterns: [cacheKeys.SETTINGS] }],
]);

export function cacheInvalidationMiddleware() {
  return async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
    const tenantContext = req.tenantContext;
    
    if (!tenantContext) {
      return next();
    }

    // Store original end method
    const originalEnd = res.end;
    
    res.end = function(chunk?: any, encoding?: BufferEncoding, cb?: () => void) {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const routeKey = `${req.method}:${req.route?.path || req.path}`;
        const invalidationConfig = invalidationMap.get(routeKey);
        
        if (invalidationConfig) {
          // Perform cache invalidation asynchronously
          setImmediate(async () => {
            try {
              if (invalidationConfig.invalidateAll) {
                await tenantCache.invalidateAll(tenantContext.outfitterId);
                console.log(`🔍 [CACHE-INVALIDATE] Tenant ${tenantContext.outfitterId} invalidated all cache due to ${routeKey}`);
              } else {
                // Invalidate specific patterns
                for (const pattern of invalidationConfig.patterns) {
                  await tenantCache.invalidatePattern(pattern, tenantContext.outfitterId);
                }
                
                // Invalidate specific keys
                if (invalidationConfig.specific) {
                  for (const key of invalidationConfig.specific) {
                    await tenantCache.invalidate(key, tenantContext.outfitterId);
                  }
                }
                
                console.log(`🔍 [CACHE-INVALIDATE] Tenant ${tenantContext.outfitterId} invalidated patterns: ${invalidationConfig.patterns.join(', ')} due to ${routeKey}`);
              }
            } catch (error) {
              console.error(`❌ [CACHE-INVALIDATE] Error invalidating cache for tenant ${tenantContext.outfitterId}:`, error);
            }
          });
        }
      }
      
      return originalEnd.call(this, chunk, encoding, cb);
    };
    
    next();
  };
}

// Manual cache invalidation for specific operations
export async function invalidateTenantCache(outfitterId: number, patterns: string[], specific?: string[]): Promise<void> {
  try {
    for (const pattern of patterns) {
      await tenantCache.invalidatePattern(pattern, outfitterId);
    }
    
    if (specific) {
      for (const key of specific) {
        await tenantCache.invalidate(key, outfitterId);
      }
    }
    
    console.log(`🔍 [MANUAL-CACHE-INVALIDATE] Tenant ${outfitterId} invalidated patterns: ${patterns.join(', ')}`);
  } catch (error) {
    console.error(`❌ [MANUAL-CACHE-INVALIDATE] Error invalidating cache for tenant ${outfitterId}:`, error);
    throw error;
  }
}