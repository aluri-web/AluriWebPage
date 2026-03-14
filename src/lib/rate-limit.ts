/**
 * Rate limiter con Upstash Redis para producción.
 * Fallback a in-memory si las credenciales de Upstash no están configuradas.
 *
 * Configuración requerida en .env.local:
 *   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=AXxx...
 *
 * Uso (igual que antes — la API no cambia):
 *   const { allowed, remaining } = await apiLimiter.check(identifier)
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ============================
// Tipos (misma interfaz pública)
// ============================

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

// ============================
// Detección de modo
// ============================

const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// ============================
// In-memory fallback (dev/CI)
// ============================

interface InMemoryEntry { count: number; resetAt: number }
const memStores = new Map<string, Map<string, InMemoryEntry>>()

let cleanupScheduled = false
function scheduleCleanup() {
  if (cleanupScheduled) return
  cleanupScheduled = true
  setInterval(() => {
    const now = Date.now()
    for (const [, store] of memStores) {
      for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key)
      }
    }
  }, 60_000).unref?.()
}

function createInMemoryLimiter(config: RateLimitConfig) {
  const key = `${config.maxRequests}:${config.windowMs}`
  if (!memStores.has(key)) memStores.set(key, new Map())
  const store = memStores.get(key)!
  scheduleCleanup()

  return {
    async check(identifier: string): Promise<RateLimitResult> {
      const now = Date.now()
      const entry = store.get(identifier)
      if (!entry || now > entry.resetAt) {
        store.set(identifier, { count: 1, resetAt: now + config.windowMs })
        return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs }
      }
      entry.count++
      if (entry.count > config.maxRequests) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt }
      }
      return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
    }
  }
}

// ============================
// Upstash limiter
// ============================

function createUpstashLimiter(prefix: string, config: RateLimitConfig) {
  const windowSec = Math.ceil(config.windowMs / 1000)
  const limiter = new Ratelimit({
    redis: redis!,
    prefix: `ratelimit:${prefix}`,
    limiter: Ratelimit.slidingWindow(config.maxRequests, `${windowSec} s`),
    analytics: true,
  })

  return {
    async check(identifier: string): Promise<RateLimitResult> {
      const result = await limiter.limit(identifier)
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      }
    }
  }
}

// ============================
// Factory
// ============================

function createRateLimiter(prefix: string, config: RateLimitConfig) {
  const limiter = hasUpstash
    ? createUpstashLimiter(prefix, config)
    : createInMemoryLimiter(config)

  return {
    check: (identifier: string) => limiter.check(identifier),

    headers(result: RateLimitResult): Record<string, string> {
      return {
        'X-RateLimit-Limit': String(config.maxRequests),
        'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      }
    }
  }
}

// ============================
// Rate limiters pre-configurados
// ============================

/** Login: 5 intentos / 15 min por IP */
export const loginLimiter = createRateLimiter('login', { maxRequests: 5, windowMs: 15 * 60 * 1000 })

/** API general: 100 req/min por IP o API key */
export const apiLimiter = createRateLimiter('api', { maxRequests: 100, windowMs: 60 * 1000 })

/** Uploads: 20 archivos / 10 min por usuario */
export const uploadLimiter = createRateLimiter('upload', { maxRequests: 20, windowMs: 10 * 60 * 1000 })

/** Cron: 2 ejecuciones / hora */
export const cronLimiter = createRateLimiter('cron', { maxRequests: 2, windowMs: 60 * 60 * 1000 })

/** Password reset: 3 / hora por email */
export const passwordResetLimiter = createRateLimiter('pwreset', { maxRequests: 3, windowMs: 60 * 60 * 1000 })

/**
 * Helper: extrae IP del request (Next.js)
 */
export function getClientIp(request: Request): string {
  const headers = request.headers
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || headers.get('x-real-ip')
    || 'unknown'
}
