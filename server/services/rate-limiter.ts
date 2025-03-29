/**
 * Rate Limiter Service
 * 
 * This service implements a token bucket algorithm to manage API rate limits.
 * It queues requests when approaching rate limits to ensure the application
 * doesn't exceed Instagram's limits while still processing all requests.
 */

import { log } from '../vite';

interface RateLimitOptions {
  maxTokens: number;    // Maximum number of tokens (bucket capacity)
  refillRate: number;   // Tokens added per second
  refillInterval: number; // Milliseconds between refills
}

interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  platform: string;
  username?: string;
  priority: number;
}

export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefill: number;
  private refillInterval: number;
  private queue: QueuedRequest<any>[];
  private processing: boolean;
  private platformCounters: Map<string, number>;
  
  constructor(options: RateLimitOptions) {
    this.tokens = options.maxTokens;
    this.maxTokens = options.maxTokens;
    this.refillRate = options.refillRate;
    this.refillInterval = options.refillInterval || 1000;
    this.lastRefill = Date.now();
    this.queue = [];
    this.processing = false;
    this.platformCounters = new Map();
    
    // Start token refill process
    setInterval(() => this.refillTokens(), this.refillInterval);
  }
  
  /**
   * Schedules an operation that consumes tokens from the rate limiter
   * @returns Promise that resolves with the operation result
   */
  async schedule<T>(options: {
    execute: () => Promise<T>;
    platform: string;
    username?: string;
    cost?: number;
    priority?: number;
  }): Promise<T> {
    const { execute, platform, username, cost = 1, priority = 1 } = options;
    
    // Refill tokens as needed
    this.refillTokens();
    
    // Check if we have enough tokens and no queue
    if (this.tokens >= cost && this.queue.length === 0) {
      this.tokens -= cost;
      this.incrementPlatformCounter(platform);
      
      try {
        log(`Direct execution for ${platform}${username ? '/' + username : ''} (${cost} tokens)`, 'rate-limiter');
        return await execute();
      } catch (error) {
        throw error;
      }
    }
    
    // Not enough tokens or there's a queue, so add to queue
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        execute,
        resolve,
        reject,
        platform,
        username,
        priority
      };
      
      // Add to queue with priority ordering
      this.addToQueue(request);
      log(`Queued request for ${platform}${username ? '/' + username : ''} (queue size: ${this.queue.length})`, 'rate-limiter');
      
      // Start processing queue if not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  /**
   * Add a request to the queue, sorted by priority
   */
  private addToQueue<T>(request: QueuedRequest<T>): void {
    // Find insertion point based on priority (higher priority first)
    let index = this.queue.findIndex(item => item.priority < request.priority);
    if (index === -1) {
      // If no lower priority found, add to end
      index = this.queue.length;
    }
    
    this.queue.splice(index, 0, request);
  }
  
  /**
   * Process queued requests as tokens become available
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;
    
    try {
      while (this.queue.length > 0) {
        // Wait for tokens if needed
        await this.waitForTokens();
        
        // Get the highest priority request
        const request = this.queue.shift();
        if (!request) continue;
        
        // Consume a token
        this.tokens -= 1;
        this.incrementPlatformCounter(request.platform);
        
        // Execute the request
        try {
          log(`Processing queued request for ${request.platform}${request.username ? '/' + request.username : ''}`, 'rate-limiter');
          const result = await request.execute();
          request.resolve(result);
        } catch (error) {
          log(`Error processing queued request: ${error}`, 'rate-limiter');
          request.reject(error as Error);
        }
      }
    } finally {
      this.processing = false;
    }
  }
  
  /**
   * Wait until tokens are available
   */
  private waitForTokens(tokensNeeded: number = 1): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        this.refillTokens();
        if (this.tokens >= tokensNeeded) {
          resolve();
        } else {
          // Calculate time until next token will be available
          const timeToNextToken = Math.ceil((tokensNeeded - this.tokens) / this.refillRate * 1000);
          setTimeout(check, Math.min(timeToNextToken, this.refillInterval));
        }
      };
      
      check();
    });
  }
  
  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // in seconds
    
    if (elapsed > 0) {
      const tokensToAdd = elapsed * this.refillRate;
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
      
      // If we've refilled and have queued requests, process them
      if (this.tokens > 0 && this.queue.length > 0 && !this.processing) {
        this.processQueue();
      }
    }
  }
  
  /**
   * Increment counter for specific platform
   */
  private incrementPlatformCounter(platform: string): void {
    const current = this.platformCounters.get(platform) || 0;
    this.platformCounters.set(platform, current + 1);
  }
  
  /**
   * Get stats about rate limiter usage
   */
  getStats(): {
    availableTokens: number;
    maxTokens: number;
    queueLength: number;
    platformCounts: Record<string, number>;
  } {
    const platformCounts: Record<string, number> = {};
    this.platformCounters.forEach((count, platform) => {
      platformCounts[platform] = count;
    });
    
    return {
      availableTokens: this.tokens,
      maxTokens: this.maxTokens,
      queueLength: this.queue.length,
      platformCounts
    };
  }
  
  /**
   * Reset all platform counters
   */
  resetCounters(): void {
    this.platformCounters.clear();
  }
}

// Create Instagram-specific rate limiter with appropriate limits
// Instagram Graph API has a rate limit of ~200 requests per user per hour
export const instagramRateLimiter = new RateLimiter({
  maxTokens: 100,       // Start with 100 tokens
  refillRate: 0.05,     // ~180 requests per hour (3 per minute)
  refillInterval: 10000  // Refill every 10 seconds
});

// Create a general rate limiter for other platforms
export const generalRateLimiter = new RateLimiter({
  maxTokens: 500,
  refillRate: 1,        // 60 requests per minute
  refillInterval: 5000  // Refill every 5 seconds
});

// Export unified rate limiters
export const rateLimiters = {
  instagram: instagramRateLimiter,
  general: generalRateLimiter
};