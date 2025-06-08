import { Request, Response, NextFunction } from 'express';
import { TenantAwareRequest } from './tenantValidation';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  quotaEnabled?: boolean;
  dailyQuota?: number;
}

interface RateLimitEntry {
  requests: number[];
  dailyCount: number;
  dailyReset: number;
}

class TenantRateLimiter {
  private limits = new Map<number, RateLimitEntry>();
  public configs = new Map<string, RateLimitConfig>();

  constructor() {
    // Default configurations for different endpoints
    this.setConfig('default', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 1000,
      quotaEnabled: true,
      dailyQuota: 50000
    });

    this.setConfig('auth', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      message: 'Too many authentication attempts'
    });

    this.setConfig('api', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      quotaEnabled: true,
      dailyQuota: 10000
    });

    this.setConfig('public', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 50,
      quotaEnabled: true,
      dailyQuota: 5000
    });
  }

  setConfig(key: string, config: RateLimitConfig): void {
    this.configs.set(key, config);
  }

  private getOrCreateEntry(outfitterId: number): RateLimitEntry {
    let entry = this.limits.get(outfitterId);
    
    if (!entry) {
      entry = {
        requests: [],
        dailyCount: 0,
        dailyReset: this.getNextDayTimestamp()
      };
      this.limits.set(outfitterId, entry);
    }

    return entry;
  }

  private getNextDayTimestamp(): number {
    const tomorrow = new Date();
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow.getTime();
  }

  private cleanExpiredRequests(requests: number[], windowMs: number): number[] {
    const now = Date.now();
    return requests.filter(timestamp => now - timestamp < windowMs);
  }

  private resetDailyCountIfNeeded(entry: RateLimitEntry): void {
    const now = Date.now();
    if (now >= entry.dailyReset) {
      entry.dailyCount = 0;
      entry.dailyReset = this.getNextDayTimestamp();
    }
  }

  checkLimit(outfitterId: number, configKey: string = 'default'): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    dailyRemaining?: number;
    message?: string;
  } {
    const config = this.configs.get(configKey) || this.configs.get('default')!;
    const entry = this.getOrCreateEntry(outfitterId);
    const now = Date.now();

    // Clean expired requests
    entry.requests = this.cleanExpiredRequests(entry.requests, config.windowMs);

    // Reset daily count if needed
    this.resetDailyCountIfNeeded(entry);

    // Check rate limit
    const currentRequests = entry.requests.length;
    const allowed = currentRequests < config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - currentRequests);
    const resetTime = now + config.windowMs;

    // Check daily quota if enabled
    let dailyRemaining: number | undefined;
    let quotaExceeded = false;

    if (config.quotaEnabled && config.dailyQuota) {
      dailyRemaining = Math.max(0, config.dailyQuota - entry.dailyCount);
      quotaExceeded = entry.dailyCount >= config.dailyQuota;
    }

    const finalAllowed = allowed && !quotaExceeded;

    // Record request if allowed
    if (finalAllowed) {
      entry.requests.push(now);
      entry.dailyCount++;
    }

    return {
      allowed: finalAllowed,
      remaining,
      resetTime,
      dailyRemaining,
      message: !finalAllowed ? (quotaExceeded ? 'Daily quota exceeded' : config.message) : undefined
    };
  }

  getUsageStats(outfitterId: number): {
    currentWindow: number;
    dailyUsage: number;
    dailyQuota: number;
    windowResetTime: number;
    dailyResetTime: number;
  } {
    const entry = this.getOrCreateEntry(outfitterId);
    const config = this.configs.get('default')!;
    
    // Clean expired requests for accurate count
    entry.requests = this.cleanExpiredRequests(entry.requests, config.windowMs);
    this.resetDailyCountIfNeeded(entry);

    return {
      currentWindow: entry.requests.length,
      dailyUsage: entry.dailyCount,
      dailyQuota: config.dailyQuota || 0,
      windowResetTime: Date.now() + config.windowMs,
      dailyResetTime: entry.dailyReset
    };
  }

  // Reset limits for a specific tenant (admin function)
  resetTenantLimits(outfitterId: number): void {
    this.limits.delete(outfitterId);
    console.log(`🔍 [RATE-LIMIT-RESET] Reset all rate limits for tenant ${outfitterId}`);
  }

  // Get all tenant usage (monitoring function)
  getAllUsage(): Map<number, ReturnType<TenantRateLimiter['getUsageStats']>> {
    const usage = new Map();
    for (const [outfitterId] of this.limits) {
      usage.set(outfitterId, this.getUsageStats(outfitterId));
    }
    return usage;
  }
}

export const tenantRateLimiter = new TenantRateLimiter();

// Middleware factory for different rate limit configurations
export function createTenantRateLimit(configKey: string = 'default') {
  return (req: TenantAwareRequest, res: Response, next: NextFunction) => {
    const tenantContext = req.tenantContext;
    
    if (!tenantContext) {
      // Allow requests without tenant context to pass through
      return next();
    }

    const result = tenantRateLimiter.checkLimit(tenantContext.outfitterId, configKey);

    // Set rate limit headers
    const config = tenantRateLimiter.configs.get(configKey);
    res.setHeader('X-RateLimit-Limit', config?.maxRequests || 1000);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
    res.setHeader('X-Tenant-ID', tenantContext.outfitterId);

    if (result.dailyRemaining !== undefined) {
      res.setHeader('X-RateLimit-Daily-Remaining', result.dailyRemaining);
    }

    if (!result.allowed) {
      console.warn(`🚨 [RATE-LIMIT-EXCEEDED] Tenant ${tenantContext.outfitterId} exceeded ${configKey} rate limit`);
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: result.message || 'Too many requests',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        dailyQuotaRemaining: result.dailyRemaining
      });
    }

    console.log(`🔍 [RATE-LIMIT-OK] Tenant ${tenantContext.outfitterId} ${configKey} rate limit: ${result.remaining} remaining`);
    next();
  };
}

// Predefined middleware for common use cases
export const defaultRateLimit = createTenantRateLimit('default');
export const apiRateLimit = createTenantRateLimit('api');
export const publicRateLimit = createTenantRateLimit('public');
export const authRateLimit = createTenantRateLimit('auth');