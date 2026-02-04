/**
 * Simple LRU (Least Recently Used) Cache implementation
 * Used for server-side caching of frequently accessed data
 * 
 * Features:
 * - TTL (Time To Live) support
 * - Max size limit with automatic eviction
 * - User-scoped caching for multi-tenant support
 */

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 100, defaultTTL: number = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL; // Default 1 minute
  }

  /**
   * Get a value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }

  /**
   * Set a value in cache with optional TTL
   */
  set(key: string, value: T, ttl?: number): void {
    // Delete existing entry to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all entries matching a pattern (useful for invalidation)
   */
  invalidatePattern(pattern: string): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Global cache instances (persist across requests in development/production)
// Using different caches for different data types allows independent TTLs and sizing

// Categories cache: Changes rarely, 5 minute TTL, up to 50 users
export const categoriesCache = new LRUCache<unknown[]>(50, 5 * 60 * 1000);

// Members cache: Changes occasionally, 5 minute TTL
export const membersCache = new LRUCache<unknown[]>(50, 5 * 60 * 1000);

// Dashboard summary cache: Shorter TTL (30 seconds) as it shows real-time data
export const dashboardCache = new LRUCache<unknown>(100, 30 * 1000);

/**
 * Helper function to generate user-scoped cache keys
 */
export function userCacheKey(userId: string, prefix: string, ...params: string[]): string {
  return `${prefix}:${userId}:${params.join(':')}`;
}

/**
 * Invalidate all caches for a user
 */
export function invalidateUserCaches(userId: string): void {
  categoriesCache.invalidatePattern(userId);
  membersCache.invalidatePattern(userId);
  dashboardCache.invalidatePattern(userId);
}

export default LRUCache;
