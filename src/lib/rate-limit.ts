// Rate Limiting Utility
// Simple in-memory rate limiter for API routes

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

export function rateLimit(
  key: string,
  config: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 100 }
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

// Rate limit configurations for different endpoints
export const rateLimitConfigs = {
  // Strict: 5 requests per minute
  strict: { windowMs: 60 * 1000, maxRequests: 5 },
  // Moderate: 20 requests per minute
  moderate: { windowMs: 60 * 1000, maxRequests: 20 },
  // Standard: 100 requests per minute
  standard: { windowMs: 60 * 1000, maxRequests: 100 },
  // Upload: 10 requests per minute
  upload: { windowMs: 60 * 1000, maxRequests: 10 },
} as const;

// Helper to get client identifier (IP + user agent)
export function getClientIdentifier(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
             request.headers.get("x-real-ip") ||
             "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  return `${ip}:${userAgent.slice(0, 50)}`;
}
