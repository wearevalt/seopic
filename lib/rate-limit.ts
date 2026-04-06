interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export function rateLimit(key: string, config: RateLimitConfig): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { success: true, remaining: config.limit - 1 };
  }

  if (entry.count >= config.limit) {
    return { success: false, remaining: 0 };
  }

  entry.count += 1;
  return { success: true, remaining: config.limit - entry.count };
}

// Per-minute rate limiting (abuse prevention)
export function rateLimitPerMinute(key: string, limit = 10): { success: boolean; remaining: number } {
  return rateLimit(key, { limit, windowMs: 60_000 });
}

// Per-hour rate limiting (stricter)
export function rateLimitPerHour(key: string, limit = 100): { success: boolean; remaining: number } {
  return rateLimit(key, { limit, windowMs: 3600_000 });
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}
