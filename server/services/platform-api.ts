/**
 * Unified Platform API Service
 * 
 * This service coordinates all platform-specific API integrations
 * with caching, rate limiting, and unified error handling.
 */

import { Platform, PlatformData } from '@shared/schema';
import { log } from '../vite';
import { instagramApiV3 } from './instagram-api-v3';
import { twitterApi } from './twitter-api';
import { cacheService } from './cache-service';
import { rateLimiters } from './rate-limiter';

class PlatformApiService {
  private readonly CACHE_TTL = {
    DEFAULT: 3600000,    // 1 hour
    POPULAR: 7200000,    // 2 hours for popular accounts
    ERROR: 300000        // 5 minutes for error responses
  };
  
  constructor() {
    log('Platform API Service initialized', 'platform-api');
  }
  
  /**
   * Fetch user data from a specific platform
   * @param platform The platform to fetch data from
   * @param username Username to lookup on the platform
   * @returns Platform data or null if not found
   */
  public async fetchUserData(platform: Platform, username: string): Promise<PlatformData | null> {
    // Normalize and sanitize username
    const normalizedUsername = username.trim().replace(/^@/, '');
    
    // Generate cache key for this lookup
    const cacheKey = `${platform}:${normalizedUsername}`;
    
    // Check cache first
    const cachedData = cacheService.platformData.get(cacheKey);
    if (cachedData) {
      log(`Using cached data for ${platform} user ${normalizedUsername}`, 'platform-api');
      return cachedData;
    }
    
    // Data not in cache, fetch from appropriate platform API
    try {
      log(`Fetching data for ${normalizedUsername} from ${platform}`, 'platform-api');
      
      let result: PlatformData | null = null;
      
      // Route to the appropriate platform API
      if (platform === 'instagram') {
        result = await this.fetchInstagramData(normalizedUsername);
      } else if (platform === 'twitter') {
        result = await this.fetchTwitterData(normalizedUsername);
      } else {
        log(`Platform ${platform} not implemented yet`, 'platform-api');
        return null;
      }
      
      // If we got results, cache them
      if (result) {
        // Determine cache TTL based on followership
        let cacheTtl = this.CACHE_TTL.DEFAULT;
        
        // Popular accounts change less frequently, cache longer
        if (result.profileData?.followerCount && result.profileData.followerCount > 10000) {
          cacheTtl = this.CACHE_TTL.POPULAR;
        }
        
        cacheService.platformData.set(cacheKey, result, cacheTtl);
      }
      
      return result;
    } catch (error: any) {
      log(`Error fetching data for ${normalizedUsername} from ${platform}: ${error.message}`, 'platform-api');
      return null;
    }
  }
  
  /**
   * Fetch Instagram data using our rate-limited and cached API
   * @param username Instagram username
   * @returns Platform data or null
   */
  private async fetchInstagramData(username: string): Promise<PlatformData | null> {
    // Use the Instagram-specific rate limiter
    return rateLimiters.instagram.schedule({
      execute: () => instagramApiV3.fetchUserData(username),
      platform: 'instagram',
      username,
      // Higher priority for users with OAuth tokens
      priority: instagramApiV3.hasValidCredentials() ? 2 : 1
    });
  }
  
  /**
   * Fetch Twitter data
   * @param username Twitter username
   * @returns Platform data or null
   */
  private async fetchTwitterData(username: string): Promise<PlatformData | null> {
    // For Twitter, we don't need to use the rate limiter as the client handles it
    try {
      const cacheKey = `twitter:${username}`;
      log(`Fetching Twitter data for ${username}`, 'platform-api');
      
      // Check cache first
      const cachedData = cacheService.platformData.get(cacheKey);
      if (cachedData) {
        log(`Using cached Twitter data for ${username}`, 'platform-api');
        return cachedData;
      }
      
      // Check API status before fetching data
      const apiStatus = await twitterApi.getApiStatus();
      if (!apiStatus.configured || apiStatus.operational === false) {
        log(`Twitter API not operational: ${apiStatus.message}`, 'platform-api');
        return null;
      }
      
      // Not in cache, fetch from API
      const result = await twitterApi.fetchUserData(username);
      
      if (result) {
        // Cache for 1 hour (or longer for popular accounts)
        let cacheTtl = this.CACHE_TTL.DEFAULT;
        if (result.profileData?.followerCount && result.profileData.followerCount > 10000) {
          cacheTtl = this.CACHE_TTL.POPULAR;
        }
        cacheService.platformData.set(cacheKey, result, cacheTtl);
      }
      
      return result;
    } catch (error: any) {
      log(`Error fetching Twitter data: ${error.message}`, 'platform-api');
      return null;
    }
  }
  
  /**
   * Check platform API status
   * @returns Status of all platform APIs
   */
  public async getPlatformStatus(): Promise<Record<string, { available: boolean; operational?: boolean; message: string }>> {
    const twitterStatus = await twitterApi.getApiStatus();
    
    return {
      instagram: {
        available: instagramApiV3.hasValidCredentials(),
        message: instagramApiV3.getApiStatus().message
      },
      twitter: {
        available: twitterStatus.configured,
        operational: twitterStatus.operational,
        message: twitterStatus.message
      }
      // Add other platforms as they are implemented
    };
  }
}

// Create singleton instance
export const platformApi = new PlatformApiService();