/**
 * Instagram API Integration Service using Apify
 * 
 * This service uses the Apify platform to scrape Instagram data reliably:
 * - Handles proper rate limiting and caching
 * - Advanced error handling with detailed diagnostics
 * - Uses the Apify platform instead of deprecated Instagram Basic Display API
 * - Maintains the same response format for compatibility
 */

import { ApifyClient } from 'apify-client';
import { Platform, PlatformData, platformDataSchema } from '@shared/schema';
import { log } from '../vite';
import { cacheService } from './cache-service';
import { rateLimiters } from './rate-limiter';

export class InstagramApiApifyService {
  private readonly CACHE_TTL = {
    DEFAULT: 3600000,    // 1 hour
    POPULAR: 7200000,    // 2 hours for popular accounts
    ERROR: 300000        // 5 minutes for error responses
  };
  
  private apifyClient: ApifyClient | null = null;
  private readonly APIFY_INSTAGRAM_SCRAPER_ACTOR = 'apify/instagram-scraper';
  
  // API status cache to avoid frequent checks
  private apiStatusCache: { status: { configured: boolean; message: string; operational?: boolean }, timestamp: number } | null = null;
  private readonly API_STATUS_CACHE_TTL = 60 * 1000; // 1 minute cache for API status
  
  constructor() {
    // Initialize Apify client if API key is provided
    if (process.env.APIFY_API_KEY) {
      this.apifyClient = new ApifyClient({
        token: process.env.APIFY_API_KEY,
      });
      log('Instagram API Service initialized with Apify client', 'instagram-api');
    } else {
      log('Apify API key not found. Instagram API service will run with limited functionality.', 'instagram-api');
    }
  }
  
  /**
   * Check if the service has valid credentials
   * @returns boolean indicating if credentials are available
   */
  public async hasValidCredentials(): Promise<boolean> {
    return !!this.apifyClient;
  }
  
  /**
   * Get API status - used to show which platforms have active connections
   * @returns Object containing API status details
   */
  public async getApiStatus(): Promise<{ configured: boolean; operational?: boolean; message: string }> {
    // Use cached status if available and not expired
    if (this.apiStatusCache && 
        (Date.now() - this.apiStatusCache.timestamp) < this.API_STATUS_CACHE_TTL) {
      return this.apiStatusCache.status;
    }
    
    // Check if Apify client is configured
    if (!this.apifyClient) {
      const status = {
        configured: false,
        message: 'Instagram API not configured. Missing Apify API key.'
      };
      this.apiStatusCache = { status, timestamp: Date.now() };
      return status;
    }
    
    // Get rate limiter stats
    const stats = rateLimiters.instagram.getStats();
    
    // Check if the Apify API is operational by making a test request
    let operational = false;
    try {
      // Test the connection by getting the actor info
      const actorInfo = await this.apifyClient.actor(this.APIFY_INSTAGRAM_SCRAPER_ACTOR).get();
      if (actorInfo && actorInfo.id) {
        operational = true;
      }
    } catch (error: any) {
      log(`Error checking Apify API status: ${error.message}`, 'instagram-api');
      operational = false;
    }
    
    const status = {
      configured: true,
      operational,
      message: `Instagram API configured with Apify. ${stats.availableTokens}/${stats.maxTokens} API calls available. ${operational ? 'API is operational.' : 'API may be experiencing issues.'}`
    };
    
    // Cache the status
    this.apiStatusCache = { status, timestamp: Date.now() };
    return status;
  }
  
  /**
   * Fetch user data from Instagram using Apify with caching and rate limiting
   * @param username Instagram username to look up (with or without @)
   * @returns Platform data or null if not found
   */
  public async fetchUserData(username: string): Promise<PlatformData | null> {
    // Normalize username (remove @ if present)
    const normalizedUsername = username.startsWith('@') 
      ? username.substring(1) 
      : username;
    
    // Generate cache key
    const cacheKey = `instagram:${normalizedUsername}`;
    
    // Check cache first
    const cachedData = cacheService.platformData.get(cacheKey);
    if (cachedData) {
      log(`Using cached data for Instagram user ${normalizedUsername}`, 'instagram-api');
      return cachedData;
    }
    
    // First check API status
    const apiStatus = await this.getApiStatus();
    if (!apiStatus.configured) {
      log(`Instagram API not configured: ${apiStatus.message}`, 'instagram-api');
      return null;
    }
    
    // Data not in cache, request it with rate limiting
    try {
      log(`Fetching Instagram data for ${normalizedUsername} with rate limiting`, 'instagram-api');
      
      // Schedule the fetch through the rate limiter
      const result = await rateLimiters.instagram.schedule({
        execute: () => this.executeDataFetch(normalizedUsername),
        platform: 'instagram',
        username: normalizedUsername,
        // Higher priority for authenticated requests
        priority: await this.hasValidCredentials() ? 2 : 1
      });
      
      // If we got results, cache them
      if (result) {
        // Determine cache TTL based on follower count
        let cacheTtl = this.CACHE_TTL.DEFAULT;
        if (result.profileData && result.profileData.followerCount && result.profileData.followerCount > 10000) {
          // Popular accounts change less frequently, cache longer
          cacheTtl = this.CACHE_TTL.POPULAR;
        }
        
        cacheService.platformData.set(cacheKey, result, cacheTtl);
      }
      
      return result;
    } catch (error: any) {
      log(`Error fetching Instagram data for ${normalizedUsername}: ${error.message}`, 'instagram-api');
      
      // Cache error results too, but for a shorter time
      // This prevents hammering the API with requests that are likely to fail
      if (error.response && (error.response.status === 404 || error.response.status === 429)) {
        cacheService.platformData.set(cacheKey, null, this.CACHE_TTL.ERROR);
      }
      
      return null;
    }
  }
  
  /**
   * Execute the actual data fetch using Apify
   * @param username Normalized username
   * @returns Platform data or null
   */
  private async executeDataFetch(username: string): Promise<PlatformData | null> {
    if (!this.apifyClient) {
      log('Cannot fetch Instagram data: Apify client not initialized', 'instagram-api');
      return null;
    }
    
    try {
      // Run the Instagram scraper actor with the profile URL
      const run = await this.apifyClient.actor(this.APIFY_INSTAGRAM_SCRAPER_ACTOR).call({
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: 'details',
        proxy: {
          useApifyProxy: true,
        },
      });
      
      // Get the dataset items from the run
      const dataset = await this.apifyClient.dataset(run.defaultDatasetId).listItems();
      
      if (!dataset.items.length) {
        log(`No data found for Instagram user ${username}`, 'instagram-api');
        return null;
      }
      
      // Extract the profile data from the first item (should be only one)
      const profileData = dataset.items[0];
      
      // Transform the data to our standard format
      const result = this.transformApifyData(profileData, username);
      return result;
    } catch (error: any) {
      log(`Error in Apify Instagram data fetch: ${error.message}`, 'instagram-api');
      
      // Transform specific Apify errors into more understandable formats
      if (error.message.includes('not found') || error.message.includes('doesn\'t exist')) {
        throw new Error(`NOT_FOUND: Instagram user ${username} not found`);
      }
      
      if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
        throw new Error(`RATE_LIMITED: Apify API rate limit exceeded for Instagram queries.`);
      }
      
      if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        throw new Error(`AUTH_ERROR: Apify API authentication failed. Please check your API key.`);
      }
      
      throw error;
    }
  }
  
  /**
   * Transform Apify data to our standard platform data format
   * @param data Profile data from Apify
   * @param username Original username requested
   * @returns Standardized platform data
   */
  private transformApifyData(data: any, username: string): PlatformData {
    try {
      // Extract hashtags from post captions
      const allCaptions = (data.latestPosts || []).map((post: any) => post.caption || '').filter(Boolean);
      const hashtagRegex = /#(\w+)/g;
      const allHashtags = new Set<string>();
      
      allCaptions.forEach((caption: string) => {
        const matches = caption.match(hashtagRegex);
        if (matches) {
          matches.forEach(tag => {
            // Remove the # and add to set
            allHashtags.add(tag.substring(1));
          });
        }
      });
      
      // Count media types
      const posts = data.latestPosts || [];
      let photoCount = 0;
      let videoCount = 0;
      
      posts.forEach((post: any) => {
        if (post.type === 'Image' || post.type === 'Sidecar') {
          photoCount++;
        } else if (post.type === 'Video') {
          videoCount++;
        }
      });
      
      // Build the platform data object
      const platformData: PlatformData = {
        platformId: 'instagram',
        username: data.username || username,
        profileData: {
          displayName: data.fullName || data.username || username,
          bio: data.biography || '',
          followerCount: Number(data.followersCount || 0),
          followingCount: Number(data.followsCount || 0),
          location: data.location || '',
          profileUrl: data.externalUrl || '',
          avatarUrl: data.profilePicUrl || '',
          verified: data.verified || false
        },
        activityData: {
          totalPosts: Number(data.postsCount || 0),
          mostActiveTime: this.extractPostTimes(posts).join(', '),
          lastActive: this.getLastActiveTime(posts)
        },
        contentData: this.transformPosts(posts),
        analysisResults: {
          exposureScore: 0.5, // Placeholder value
          topTopics: Array.from(allHashtags).slice(0, 5).map(topic => ({
            topic,
            percentage: 0.1 // Placeholder percentage
          })),
          activityTimeline: [
            { period: 'last week', count: posts.filter((p: any) => new Date(p.timestamp || '').getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length }
          ],
          sentimentBreakdown: {
            positive: 0.33,
            neutral: 0.34,
            negative: 0.33
          },
          privacyConcerns: [{
            type: 'Information Disclosure',
            description: 'Public Instagram profile with personal content',
            severity: 'medium'
          }]
        }
      };
      
      return platformData;
    } catch (error: any) {
      log(`Error transforming Apify data: ${error.message}`, 'instagram-api');
      
      // Return basic profile with available data
      return {
        platformId: 'instagram',
        username: username,
        profileData: {
          displayName: data.username || username,
          bio: data.biography || '',
          followerCount: Number(data.followersCount || 0),
          followingCount: Number(data.followsCount || 0)
        },
        activityData: {
          totalPosts: Number(data.postsCount || 0)
        },
        contentData: []
      };
    }
  }
  
  /**
   * Calculate how often a user posts based on their latest posts
   * @param posts Array of post objects
   * @returns String describing post frequency
   */
  private calculatePostFrequency(posts: any[]): string {
    if (!posts.length || posts.length < 2) return 'unknown';
    
    try {
      // Convert timestamps to dates
      const dates = posts
        .map(post => post.timestamp || post.taken_at)
        .filter(Boolean)
        .map(timestamp => new Date(timestamp))
        .sort((a, b) => b.getTime() - a.getTime());
      
      if (dates.length < 2) return 'unknown';
      
      // Calculate average time between posts
      let totalDays = 0;
      for (let i = 1; i < dates.length; i++) {
        const timeDiff = dates[i-1].getTime() - dates[i].getTime();
        totalDays += timeDiff / (1000 * 60 * 60 * 24);
      }
      
      const avgDays = totalDays / (dates.length - 1);
      
      // Determine frequency category
      if (avgDays < 1) return 'multiple times per day';
      if (avgDays < 2) return 'daily';
      if (avgDays < 7) return 'several times per week';
      if (avgDays < 14) return 'weekly';
      if (avgDays < 31) return 'bi-weekly';
      if (avgDays < 60) return 'monthly';
      if (avgDays < 182) return 'every few months';
      return 'infrequently';
    } catch (error) {
      return 'unknown';
    }
  }
  
  /**
   * Extract times of day when user typically posts
   * @param posts Array of post objects
   * @returns Array of hour categories
   */
  private extractPostTimes(posts: any[]): string[] {
    if (!posts.length) return [];
    
    try {
      const hourCounts: Record<string, number> = {
        'morning': 0,
        'afternoon': 0,
        'evening': 0,
        'night': 0
      };
      
      // Get timestamps from posts
      posts.forEach(post => {
        const timestamp = post.timestamp || post.taken_at;
        if (!timestamp) return;
        
        const date = new Date(timestamp);
        const hour = date.getHours();
        
        if (hour >= 5 && hour < 12) hourCounts.morning++;
        else if (hour >= 12 && hour < 17) hourCounts.afternoon++;
        else if (hour >= 17 && hour < 21) hourCounts.evening++;
        else hourCounts.night++;
      });
      
      // Sort by count and return top categories
      return Object.entries(hourCounts)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([time]) => time);
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Get the last active time based on most recent post
   * @param posts Array of post objects
   * @returns ISO date string or empty string
   */
  private getLastActiveTime(posts: any[]): string {
    if (!posts.length) return '';
    
    try {
      // Get all timestamps
      const timestamps = posts
        .map(post => post.timestamp || post.taken_at)
        .filter(Boolean)
        .map(ts => new Date(ts).getTime());
      
      if (!timestamps.length) return '';
      
      // Get most recent timestamp
      const mostRecent = new Date(Math.max(...timestamps));
      return mostRecent.toISOString();
    } catch (error) {
      return '';
    }
  }
  
  /**
   * Transform posts into our standardized content data format
   * @param posts Array of post objects from Apify
   * @returns Array of standardized content items
   */
  private transformPosts(posts: any[]): any[] {
    if (!posts.length) return [];
    
    return posts.slice(0, 10).map(post => {
      try {
        return {
          id: post.id,
          url: post.url || `https://www.instagram.com/p/${post.shortCode}/`,
          timestamp: post.timestamp || post.taken_at || '',
          type: post.type ? post.type.toLowerCase() : 'unknown',
          content: post.caption || '',
          mediaUrl: post.imageUrl || post.displayUrl || '',
          previewUrl: post.thumbnailUrl || post.displayUrl || '',
          videoUrl: post.videoUrl || '',
          location: post.locationName || '',
          engagement: {
            likes: post.likesCount || 0,
            comments: post.commentsCount || 0,
            shares: 0,
            bookmarks: 0
          },
          hashtags: this.extractHashtagsFromText(post.caption || ''),
          mentions: this.extractMentionsFromText(post.caption || '')
        };
      } catch (error) {
        // Return a simplified version if there's an error
        return {
          id: post.id || '',
          url: post.url || '',
          timestamp: post.timestamp || '',
          type: 'unknown',
          content: post.caption || ''
        };
      }
    });
  }
  
  /**
   * Calculate average engagement metrics
   * @param posts Array of post objects
   * @param metric Which metric to average
   * @returns Average value
   */
  private calculateAverageEngagement(posts: any[], metric: string): number {
    if (!posts.length) return 0;
    
    try {
      let total = 0;
      let count = 0;
      
      posts.forEach(post => {
        if (post[metric] !== undefined) {
          total += Number(post[metric]);
          count++;
        }
      });
      
      return count > 0 ? Math.round(total / count) : 0;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Get top performing posts by engagement
   * @param posts Array of post objects
   * @returns Array of post IDs
   */
  private getTopPosts(posts: any[]): string[] {
    if (!posts.length) return [];
    
    try {
      // Calculate total engagement for each post
      const postsWithEngagement = posts.map(post => {
        const totalEngagement = (post.likesCount || 0) + (post.commentsCount || 0);
        return {
          id: post.id || post.shortCode,
          engagement: totalEngagement
        };
      });
      
      // Sort by engagement and return top 3
      return postsWithEngagement
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 3)
        .map(post => post.id);
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Extract hashtags from text
   * @param text Text to extract hashtags from
   * @returns Array of hashtag strings (without #)
   */
  private extractHashtagsFromText(text: string): string[] {
    if (!text) return [];
    
    try {
      const hashtagRegex = /#(\w+)/g;
      const matches = text.match(hashtagRegex) || [];
      
      // Remove the # symbol and return unique tags
      return Array.from(new Set(matches.map(tag => tag.substring(1))));
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Extract mentions from text
   * @param text Text to extract mentions from
   * @returns Array of username strings (without @)
   */
  private extractMentionsFromText(text: string): string[] {
    if (!text) return [];
    
    try {
      const mentionRegex = /@(\w+)/g;
      const matches = text.match(mentionRegex) || [];
      
      // Remove the @ symbol and return unique mentions
      return Array.from(new Set(matches.map(mention => mention.substring(1))));
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Extract all mentions from a text
   * @param text Text containing mentions
   * @returns Array of usernames
   */
  private extractMentions(text: string): string[] {
    return this.extractMentionsFromText(text);
  }
}

// Export a singleton instance
export const instagramApiApify = new InstagramApiApifyService();