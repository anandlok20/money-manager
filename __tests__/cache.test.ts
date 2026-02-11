/**
 * Money Manager - LRU Cache Tests
 * Tests for the caching layer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import LRUCache, { 
  categoriesCache, 
  membersCache, 
  userCacheKey, 
  invalidateUserCaches 
} from '@/lib/cache/lru-cache';

describe('LRU Cache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>(3, 1000); // Max 3 items, 1 second TTL
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should overwrite existing values', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });

    it('should delete values', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should return false when deleting non-existent key', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('should clear all values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('LRU Eviction', () => {
    it('should evict oldest item when at capacity', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // This should evict key1
      
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should update LRU order on get', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Access key1 to make it most recently used
      cache.get('key1');
      
      cache.set('key4', 'value4'); // This should evict key2 (oldest)
      
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('TTL Expiration', () => {
    it('should return undefined for expired items', async () => {
      cache.set('key1', 'value1', 50); // 50ms TTL
      
      expect(cache.get('key1')).toBe('value1');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should use default TTL when not specified', () => {
      const shortTTLCache = new LRUCache<string>(10, 50);
      shortTTLCache.set('key1', 'value1');
      
      expect(shortTTLCache.get('key1')).toBe('value1');
    });
  });

  describe('Pattern Invalidation', () => {
    it('should invalidate keys matching pattern', () => {
      cache.set('user:123:categories', 'cat1');
      cache.set('user:123:members', 'mem1');
      cache.set('user:456:categories', 'cat2');
      
      const deleted = cache.invalidatePattern('user:123');
      
      expect(deleted).toBe(2);
      expect(cache.get('user:123:categories')).toBeUndefined();
      expect(cache.get('user:123:members')).toBeUndefined();
      expect(cache.get('user:456:categories')).toBe('cat2');
    });

    it('should return 0 when no keys match pattern', () => {
      cache.set('key1', 'value1');
      const deleted = cache.invalidatePattern('nonexistent');
      expect(deleted).toBe(0);
    });
  });

  describe('Stats', () => {
    it('should return correct stats', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const stats = cache.stats();
      
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
    });
  });
});

describe('Cache Helper Functions', () => {
  describe('userCacheKey', () => {
    it('should generate correct cache key', () => {
      const key = userCacheKey('user123', 'categories', 'EXPENSE', 'false');
      expect(key).toBe('categories:user123:EXPENSE:false');
    });

    it('should handle single param', () => {
      const key = userCacheKey('user123', 'members', 'active');
      expect(key).toBe('members:user123:active');
    });
  });

  describe('invalidateUserCaches', () => {
    it('should invalidate all user caches', () => {
      // Set some values
      categoriesCache.set('categories:user123:all', [{ name: 'Food' }]);
      membersCache.set('members:user123:active', [{ name: 'John' }]);
      
      invalidateUserCaches('user123');
      
      expect(categoriesCache.get('categories:user123:all')).toBeUndefined();
      expect(membersCache.get('members:user123:active')).toBeUndefined();
    });
  });
});

describe('Global Cache Instances', () => {
  it('categoriesCache should be available', () => {
    expect(categoriesCache).toBeDefined();
  });

  it('membersCache should be available', () => {
    expect(membersCache).toBeDefined();
  });
});
