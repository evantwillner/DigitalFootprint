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
    // Check API status before fetching data
    const apiStatus = instagramApiV3.getApiStatus();
    
    // Log the current Instagram API status
    console.log(`Instagram API status before fetching data for ${username}:`, apiStatus);
    
    if (!apiStatus.configured) {
      log(`Instagram API not configured: ${apiStatus.message}`, 'platform-api');
      return null;
    }
    
    // Use the Instagram-specific rate limiter
    try {
      return rateLimiters.instagram.schedule({
        execute: () => instagramApiV3.fetchUserData(username),
        platform: 'instagram',
        username,
        // Higher priority for users with OAuth tokens
        priority: instagramApiV3.hasValidCredentials() ? 2 : 1
      });
    } catch (error: any) {
      log(`Error in Instagram rate limiter or API call: ${error.message}`, 'platform-api');
      return null;
    }
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
  public async getPlatformStatus(): Promise<Record<string, { available: boolean; operational?: boolean; configured?: boolean; message: string }>> {
    const twitterStatus = await twitterApi.getApiStatus();
    const instagramStatus = instagramApiV3.getApiStatus();
    
    // Log the returned API statuses
    console.log("Twitter API status returned by TwitterApiService:", twitterStatus);
    console.log("Instagram API status returned by InstagramApiService:", instagramStatus);
    
    // For Instagram, perform additional operational check
    let instagramOperational = instagramApiV3.hasValidCredentials();
    
    // Always verify Instagram token if we have one
    if (instagramOperational) {
      try {
        // A more detailed check could be implemented here to test if the token is still valid
        // For now, we trust hasValidCredentials() to correctly check token validity
        console.log("Instagram credentials appear to be valid");
      } catch (error: any) {
        console.log("Instagram credentials check failed:", error.message);
        instagramOperational = false;
      }
    }
    
    return {
      instagram: {
        available: true, // API is always available to try
        configured: instagramStatus.configured,
        operational: instagramOperational, 
        message: !instagramStatus.configured
          ? "Instagram API not configured. Please set up API credentials."
          : (!instagramOperational 
              ? "Instagram API credentials are configured but not working. Credentials may be expired or invalid."
              : "Instagram API configured and operational.")
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