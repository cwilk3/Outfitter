import { createHash } from 'crypto';

// In-memory cache with tenant isolation (production would use Redis)
class TenantAwareCache {
  private cache = new Map<string, { data: any; expiry: number; outfitterId: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  private generateKey(baseKey: string, outfitterId: number, params?: any): string {
    const keyData = { baseKey, outfitterId, params };
    const hash = createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
    return `tenant:${outfitterId}:${baseKey}:${hash.substring(0, 16)}`;
  }

  async get<T>(key: string, outfitterId: number, params?: any): Promise<T | null> {
    const cacheKey = this.generateKey(key, outfitterId, params);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check expiry
    if (Date.now() > entry.expiry) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Validate tenant isolation
    if (entry.outfitterId !== outfitterId) {
      console.error(`🚨 [CACHE-SECURITY] Cross-tenant cache access attempt: expected ${outfitterId}, found ${entry.outfitterId}`);
      return null;
    }

    console.log(`🔍 [CACHE-HIT] Tenant ${outfitterId} cache hit for key: ${key}`);
    return entry.data as T;
  }

  async set<T>(key: string, data: T, outfitterId: number, params?: any, ttlMs?: number): Promise<void> {
    const cacheKey = this.generateKey(key, outfitterId, params);
    const ttl = ttlMs || this.defaultTTL;
    
    this.cache.set(cacheKey, {
      data,
      expiry: Date.now() + ttl,
      outfitterId
    });

    console.log(`🔍 [CACHE-SET] Tenant ${outfitterId} cached data for key: ${key}`);
  }

  async invalidate(key: string, outfitterId: number, params?: any): Promise<void> {
    const cacheKey = this.generateKey(key, outfitterId, params);
    this.cache.delete(cacheKey);
    console.log(`🔍 [CACHE-INVALIDATE] Tenant ${outfitterId} invalidated cache for key: ${key}`);
  }

  async invalidatePattern(pattern: string, outfitterId: number): Promise<void> {
    const tenantPrefix = `tenant:${outfitterId}:${pattern}`;
    let invalidatedCount = 0;

    for (const [key] of this.cache.entries()) {
      if (key.startsWith(tenantPrefix)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    console.log(`🔍 [CACHE-INVALIDATE-PATTERN] Tenant ${outfitterId} invalidated ${invalidatedCount} entries for pattern: ${pattern}`);
  }

  async invalidateAll(outfitterId: number): Promise<void> {
    const tenantPrefix = `tenant:${outfitterId}:`;
    let invalidatedCount = 0;

    for (const [key] of this.cache.entries()) {
      if (key.startsWith(tenantPrefix)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    console.log(`🔍 [CACHE-INVALIDATE-ALL] Tenant ${outfitterId} invalidated ${invalidatedCount} total cache entries`);
  }

  // Cache warming for frequently accessed data
  async warmCache(outfitterId: number, warmingData: { key: string; data: any; ttl?: number }[]): Promise<void> {
    for (const item of warmingData) {
      await this.set(item.key, item.data, outfitterId, undefined, item.ttl);
    }
    console.log(`🔍 [CACHE-WARM] Tenant ${outfitterId} warmed cache with ${warmingData.length} entries`);
  }

  // Cache statistics for monitoring
  getStats(outfitterId?: number): { totalEntries: number; tenantEntries?: number } {
    const totalEntries = this.cache.size;
    
    if (outfitterId) {
      const tenantPrefix = `tenant:${outfitterId}:`;
      const tenantEntries = Array.from(this.cache.keys()).filter(key => key.startsWith(tenantPrefix)).length;
      return { totalEntries, tenantEntries };
    }

    return { totalEntries };
  }
}

export const tenantCache = new TenantAwareCache();

// Cache invalidation helpers
export const cacheKeys = {
  DASHBOARD_STATS: 'dashboard:stats',
  UPCOMING_BOOKINGS: 'dashboard:upcoming-bookings',
  EXPERIENCES: 'experiences',
  EXPERIENCE_GUIDES: 'experience:guides',
  CUSTOMERS: 'customers',
  LOCATIONS: 'locations',
  BOOKINGS: 'bookings',
  USERS: 'users',
  SETTINGS: 'settings'
} as const;

// Decorator for caching storage methods
export function cached(cacheKey: string, ttlMs?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const outfitterId = args[args.length - 1]; // Assume outfitterId is last parameter
      
      if (typeof outfitterId !== 'number') {
        return method.apply(this, args);
      }

      const cached = await tenantCache.get(cacheKey, outfitterId, args.slice(0, -1));
      if (cached !== null) {
        return cached;
      }

      const result = await method.apply(this, args);
      if (result !== undefined) {
        await tenantCache.set(cacheKey, result, outfitterId, args.slice(0, -1), ttlMs);
      }

      return result;
    };
  };
}