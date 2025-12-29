/**
 * Simple in-memory cache to prevent duplicate folder/spreadsheet creation
 * during parallel requests
 */

interface CacheEntry {
  value: string
  timestamp: number
}

interface LockEntry {
  promise: Promise<string>
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const locks = new Map<string, LockEntry>()
const CACHE_TTL = 60000 // 1 minute
const LOCK_TTL = 30000 // 30 seconds

/**
 * Get a cached value
 */
export function getCached(key: string): string | null {
  const entry = cache.get(key)
  if (!entry) return null
  
  // Check if expired
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  
  return entry.value
}

/**
 * Set a cached value
 */
export function setCached(key: string, value: string): void {
  cache.set(key, {
    value,
    timestamp: Date.now(),
  })
}

/**
 * Get or create a lock for a key (prevents parallel creation)
 * Returns the existing promise if one is in progress, or null if none
 */
export function getLock(key: string): Promise<string> | null {
  const lock = locks.get(key)
  if (!lock) return null
  
  // Check if expired
  if (Date.now() - lock.timestamp > LOCK_TTL) {
    locks.delete(key)
    return null
  }
  
  return lock.promise
}

/**
 * Set a lock for a key
 */
export function setLock(key: string, promise: Promise<string>): void {
  locks.set(key, {
    promise,
    timestamp: Date.now(),
  })
  
  // Clean up lock when promise resolves/rejects
  promise
    .then(() => {
      // Keep lock for a bit to prevent immediate re-creation
      setTimeout(() => locks.delete(key), 1000)
    })
    .catch(() => {
      locks.delete(key)
    })
}

/**
 * Clear cache for a specific key
 */
export function clearCache(key: string): void {
  cache.delete(key)
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  cache.clear()
  locks.clear()
}

