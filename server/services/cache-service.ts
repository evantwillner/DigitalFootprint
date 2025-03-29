/**
 * Cache Service
 * 
 * Provides a scalable in-memory caching system with TTL and LRU capabilities
 * to reduce the number of API calls to external services like Instagram.
 */

import { PlatformData } from '@shared/schema';
import { log } from '../vite';

interface CacheItem<T> {
  value: T;
  expiry: number;
  lastAccessed: number;
}

export class CacheService<T> {
  private cache: Map<string, CacheItem<T>>;
  private maxSize: number;
  private defaultTTL: number; // Time-to-live in ms
  
  constructor(options: { maxSize?: number; defaultTTL?: number } = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 1000; // Default max 1000 items
    this.defaultTTL = options.defaultTTL || 3600000; // Default 1 hour
    
    // Start periodic cleanup to prevent memory leaks
    setInterval(() => this.cleanup(), 300000); // Clean every 5 minutes
  }
  
  /**
   * Set a value in the cache with a custom TTL
   */
  set(key: string, value: T, ttl: number = this.defaultTTL): void {
    // Enforce cache size limit (LRU eviction)
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    const now = Date.now();
    this.cache.set(key, {
      value,
      expiry: now + ttl,
      lastAccessed: now
    });
    
    log(`Cache set: ${key} (expires in ${ttl}ms)`, 'cache');
  }
  
  /**
   * Get a value from cache
   * @returns The cached value or null if not found or expired
   */
  get(key: string): T | null {
    const item = this.cache.get(key);
    const now = Date.now();
    
    if (!item) {
      log(`Cache miss: ${key}`, 'cache');
      return null;
    }
    
    // Check if expired
    if (now > item.expiry) {
      log(`Cache expired: ${key}`, 'cache');
      this.cache.delete(key);
      return null;
    }
    
    // Update last accessed time
    item.lastAccessed = now;
    log(`Cache hit: ${key}`, 'cache');
    return item.value;
  }
  
  /**
   * Delete a cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
    log(`Cache deleted: ${key}`, 'cache');
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    log('Cache cleared', 'cache');
  }
  
  /**
   * Remove expired items from cache
   */
  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    // Convert entries to array to avoid iteration issues
    Array.from(this.cache.entries()).forEach(([key, item]) => {
      if (now > item.expiry) {
        this.cache.delete(key);
        expiredCount++;
      }
    });
    
    if (expiredCount > 0) {
      log(`Cache cleanup: removed ${expiredCount} expired items`, 'cache');
    }
  }
  
  /**
   * Evict least recently used entries when cache is full
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    // Convert entries to array to avoid iteration issues
    Array.from(this.cache.entries()).forEach(([key, item]) => {
      if (item.lastAccessed < oldestTime) {
        oldestKey = key;
        oldestTime = item.lastAccessed;
      }
    });
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      log(`Cache eviction (LRU): ${oldestKey}`, 'cache');
    }
  }
  
  /**
   * Get stats about the cache
   */
  getStats(): { size: number; maxSize: number; utilization: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: this.cache.size / this.maxSize
    };
  }
}

// Create specialized caches for different data types
export const platformDataCache = new CacheService<PlatformData>({
  maxSize: 5000,
  defaultTTL: 3600000 // 1 hour for platform data
});

// Export a unified cache service
export const cacheService = {
  platformData: platformDataCache
};