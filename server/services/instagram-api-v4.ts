/**
 * Instagram API Integration Service (V4)
 * 
 * Enhanced version with comprehensive error handling, rate limiting, and exponential backoff
 * for high traffic scenarios. This service follows the same robust design pattern as 
 * the Twitter API service.
 */

import axios from 'axios';
import { Platform, PlatformData, platformDataSchema } from '@shared/schema';
import { log } from '../vite';
import { cacheService } from './cache-service';
import { rateLimiters } from './rate-limiter';
import { instagramOAuth } from './instagram-oauth';

export class InstagramApiServiceV4 {
  private readonly CACHE_TTL = {
    DEFAULT: 3600000,    // 1 hour
    POPULAR: 7200000,    // 2 hours for popular accounts
    ERROR: 300000        // 5 minutes for error responses
  };
  
  // Rate limiting parameters
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests
  private readonly MAX_REQUESTS_PER_WINDOW = 10; // Limit to 10 requests per window
  private readonly RATE_LIMIT_RESET_INTERVAL = 15 * 60 * 1000; // 15 minute window
  
  // API status cache to avoid frequent checks
  private apiStatusCache: { status: { configured: boolean; message: string; operational?: boolean }, timestamp: number } | null = null;
  private readonly API_STATUS_CACHE_TTL = 60 * 1000; // 1 minute cache for API status
  
  constructor() {
    log('Instagram API Service V4 initialized with advanced error handling, caching and rate limiting', 'instagram-api');
  }
  
  /**
   * Check if the service has valid credentials
   * @returns boolean indicating if credentials are available
   */
  public hasValidCredentials(): boolean {
    // Check for access token from OAuth
    if (instagramOAuth.getAccessToken()) {
      return true;
    }
    
    // Check for INSTAGRAM_ACCESS_TOKEN in environment
    if (process.env.INSTAGRAM_ACCESS_TOKEN) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get API status - used to show which platforms have active connections
   * @returns Status object with configured and operational flags
   */
  public async getApiStatus(): Promise<{ configured: boolean; message: string; operational?: boolean }> {
    // Return cached status if available and recent
    if (this.apiStatusCache && (Date.now() - this.apiStatusCache.timestamp) < this.API_STATUS_CACHE_TTL) {
      return this.apiStatusCache.status;
    }
    
    if (!this.hasValidCredentials()) {
      const status = {
        configured: false,
        message: 'Instagram API not configured. Add INSTAGRAM_ACCESS_TOKEN to environment or complete OAuth flow.'
      };
      this.apiStatusCache = { status, timestamp: Date.now() };
      return status;
    }
    
    // Check if we're currently rate limited by our own tracker
    if (this.isRateLimited()) {
      const status = {
        configured: true,
        operational: false,
        message: 'Instagram API is rate limited. Please try again later.'
      };
      this.apiStatusCache = { status, timestamp: Date.now() };
      return status;
    }
    
    // Attempt a simple API call to verify the credentials work
    try {
      // Update our rate limit counters
      this.updateRateLimitCounters();
      
      const token = instagramOAuth.getAccessToken() || process.env.INSTAGRAM_ACCESS_TOKEN;
      
      // Test with a simple API call using our backoff method
      const testResponse = await this.fetchWithBackoff(
        () => axios.get('https://graph.instagram.com/me', {
          params: {
            access_token: token,
            fields: 'id,username'
          }
        }),
        2, // fewer retries for status check
        500 // shorter initial delay
      );
      
      if (!testResponse || !testResponse.data || !testResponse.data.username) {
        const status = {
          configured: true,
          operational: false,
          message: 'Instagram API credentials are configured but not working. Credentials may be expired or invalid.'
        };
        this.apiStatusCache = { status, timestamp: Date.now() };
        return status;
      }

      const status = {
        configured: true,
        operational: true,
        message: 'Instagram API configured and operational.'
      };
      this.apiStatusCache = { status, timestamp: Date.now() };
      return status;
    } catch (error: any) {
      // Specific error handling based on response codes
      if (error.response?.status === 400 || error.message.includes('400')) {
        const status = {
          configured: true,
          operational: false,
          message: 'Instagram access token is expired or invalid. Please refresh or generate a new token.'
        };
        this.apiStatusCache = { status, timestamp: Date.now() };
        return status;
      }
      
      // Check for rate limiting (429)
      if (error.response?.status === 429 || error.message.includes('429')) {
        // Mark as rate limited in our tracker
        this.handleRateLimitExceeded();
        
        const status = {
          configured: true,
          operational: false,
          message: 'Instagram API is rate limited. Please try again later.'
        };
        this.apiStatusCache = { status, timestamp: Date.now() };
        return status;
      }
      
      // Check for service unavailable (503)
      if (error.response?.status === 503 || error.message.includes('503')) {
        const status = {
          configured: true,
          operational: false,
          message: 'Instagram API service is currently unavailable. Please try again later.'
        };
        this.apiStatusCache = { status, timestamp: Date.now() };
        return status;
      }

      // For other errors, we're configured but not operational
      const status = {
        configured: true,
        operational: false,
        message: `Instagram API configured but encountering errors: ${error.message}`
      };
      this.apiStatusCache = { status, timestamp: Date.now() };
      return status;
    }
  }
  
  /**
   * Fetch user data from Instagram using available methods with caching and rate limiting
   * @param username Instagram username to look up
   * @returns Platform data or null if not found
   */
  public async fetchUserData(username: string): Promise<PlatformData | null> {
    // First check if the API is operational
    if (!this.hasValidCredentials()) {
      log('Cannot fetch Instagram data - API not configured', 'instagram-api');
      return null;
    }
    
    // Normalize username (remove @ if present)
    const normalizedUsername = username.startsWith('@') 
      ? username.substring(1) 
      : username;
    
    // Check cache first
    const cacheKey = `instagram:${normalizedUsername}`;
    const cachedData = cacheService.platformData.get(cacheKey);
    if (cachedData) {
      log(`Using cached Instagram data for ${normalizedUsername}`, 'instagram-api');
      return cachedData;
    }
    
    // Check if we're currently rate limited
    if (this.isRateLimited()) {
      log(`Instagram API rate limiting in effect. Try again later.`, 'instagram-api');
      return null;
    }
    
    // Verify credentials before making the real API call
    const status = await this.getApiStatus();
    if (status.operational === false) {
      // Use a more specific error message based on the status message
      if (status.message.includes('rate limited')) {
        log(`Cannot fetch Instagram data - API is rate limited. Please try again later.`, 'instagram-api');
      } else if (status.message.includes('service is currently unavailable')) {
        log(`Cannot fetch Instagram data - Instagram API service is down. Please try again later.`, 'instagram-api');
      } else {
        log(`Cannot fetch Instagram data - API credentials issue: ${status.message}`, 'instagram-api');
      }
      return null;
    }
    
    try {
      // Log the request and update rate limit counters
      this.updateRateLimitCounters();
      
      log(`Fetching Instagram data for ${normalizedUsername}`, 'instagram-api');
      
      // Try different methods in order of preference
      let result: PlatformData | null = null;
      
      // 1. Try OAuth first if available
      if (instagramOAuth.getAccessToken()) {
        try {
          log('Attempting fetch via OAuth Basic Display API', 'instagram-api');
          result = await this.fetchViaBasicDisplayApi(normalizedUsername);
          if (result) {
            // Cache the successful result
            cacheService.platformData.set(cacheKey, result, this.CACHE_TTL.DEFAULT);
            return result;
          }
        } catch (error: any) {
          if (error.response?.status === 429) {
            this.handleRateLimitExceeded();
            log('Instagram API rate limit exceeded, will retry later', 'instagram-api');
            return null;
          }
          log(`OAuth fetch failed: ${error.message}`, 'instagram-api');
        }
      }
      
      // 2. Try Graph API if access token is available
      if (process.env.INSTAGRAM_ACCESS_TOKEN) {
        try {
          log('Attempting fetch via Graph API', 'instagram-api');
          result = await this.fetchViaGraphApi(normalizedUsername, process.env.INSTAGRAM_ACCESS_TOKEN);
          if (result) {
            // Cache the successful result
            cacheService.platformData.set(cacheKey, result, this.CACHE_TTL.DEFAULT);
            return result;
          }
        } catch (error: any) {
          if (error.response?.status === 429) {
            this.handleRateLimitExceeded();
            log('Instagram API rate limit exceeded, will retry later', 'instagram-api');
            return null;
          }
          log(`Graph API fetch failed: ${error.message}`, 'instagram-api');
        }
      }
      
      // 3. Try public profile as last resort
      try {
        log('Attempting fetch via public profile', 'instagram-api');
        result = await this.fetchViaPublicProfile(normalizedUsername);
        if (result) {
          // Cache the successful result
          cacheService.platformData.set(cacheKey, result, this.CACHE_TTL.DEFAULT);
          return result;
        }
      } catch (error: any) {
        if (error.message.includes('rate limit')) {
          this.handleRateLimitExceeded();
          log('Instagram API rate limit exceeded, will retry later', 'instagram-api');
          return null;
        }
        log(`Public profile fetch failed: ${error.message}`, 'instagram-api');
      }
      
      // All methods failed
      return null;
    } catch (error: any) {
      log(`Error fetching Instagram data: ${error.message}`, 'instagram-api');
      
      if (error.response?.status === 429) {
        log('Instagram API rate limit exceeded, will retry later', 'instagram-api');
        // We'll remember we got rate limited
        this.handleRateLimitExceeded();
      }
      
      return null;
    }
  }
  
  // Rate limiting utilities similar to Twitter API service
  
  /**
   * Check if we're currently rate limited based on our counters
   */
  private isRateLimited(): boolean {
    const now = Date.now();
    
    // Reset counters if window has passed
    if (now - this.lastRequestTime > this.RATE_LIMIT_RESET_INTERVAL) {
      this.requestCount = 0;
      return false;
    }
    
    // Check if we've exceeded our request quota
    return this.requestCount >= this.MAX_REQUESTS_PER_WINDOW;
  }
  
  /**
   * Update our rate limit counters when making a request
   */
  private updateRateLimitCounters(): void {
    const now = Date.now();
    
    // Reset if window has passed
    if (now - this.lastRequestTime > this.RATE_LIMIT_RESET_INTERVAL) {
      this.requestCount = 0;
    }
    
    this.lastRequestTime = now;
    this.requestCount++;
  }
  
  /**
   * Handle a rate limit exceeded error
   */
  private handleRateLimitExceeded(): void {
    // Force our counter to max to prevent further requests
    this.requestCount = this.MAX_REQUESTS_PER_WINDOW;
    this.lastRequestTime = Date.now();
  }
  
  /**
   * Wait for specified time with rate limit awareness
   */
  private async rateLimitedWait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Fetch with exponential backoff for rate limiting
   * @param fetchFn Function that returns a promise to execute the fetch
   * @param maxRetries Maximum number of retries
   * @param initialDelay Initial delay in milliseconds
   */
  private async fetchWithBackoff<T>(
    fetchFn: () => Promise<T>, 
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let delay = initialDelay;
    let retries = 0;
    
    while (true) {
      try {
        return await fetchFn();
      } catch (error: any) {
        if (retries >= maxRetries) {
          throw error;
        }
        
        // Only retry on rate limit errors
        if (error.response?.status !== 429) {
          throw error;
        }
        
        retries++;
        log(`Instagram API rate limited, retrying in ${delay}ms (attempt ${retries}/${maxRetries})`, 'instagram-api');
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Exponential backoff
        delay *= 2;
      }
    }
  }
  
  // Implementation methods for different API approaches
  
  /**
   * Fetch Instagram data using the Basic Display API (requires user authentication)
   * @param username Instagram username
   * @returns Platform data or null
   */
  private async fetchViaBasicDisplayApi(username: string): Promise<PlatformData | null> {
    // Check if we have a valid token from OAuth
    const accessToken = instagramOAuth.getAccessToken();
    if (!accessToken) {
      log('No Instagram access token available from OAuth service', 'instagram-api');
      return null;
    }
    
    try {
      // First get user ID from the token owner (me endpoint)
      const meResponse = await this.fetchWithBackoff(() => 
        axios.get('https://graph.instagram.com/me', {
          params: {
            access_token: accessToken,
            fields: 'id,username'
          }
        })
      );
      
      if (!meResponse.data || !meResponse.data.id) {
        log('Failed to get user ID from Instagram token', 'instagram-api');
        return null;
      }
      
      // Now fetch media to extract some activity data
      const mediaResponse = await this.fetchWithBackoff(() =>
        axios.get('https://graph.instagram.com/me/media', {
          params: {
            access_token: accessToken,
            fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username'
          }
        })
      );
      
      const mediaItems = mediaResponse.data?.data || [];
      
      // For the Basic Display API, we only have the currently logged-in user's data
      // so we need to check if the username matches what we're looking for
      if (meResponse.data.username.toLowerCase() !== username.toLowerCase()) {
        log(`OAuth token user (${meResponse.data.username}) doesn't match requested user (${username})`, 'instagram-api');
        return null;
      }
      
      // With the Basic Display API, we only get limited profile data
      return this.transformBasicDisplayData(meResponse.data, mediaItems, username);
    } catch (error: any) {
      // Handle rate limiting
      if (error.response?.status === 429) {
        log('Instagram Basic Display API rate limit exceeded', 'instagram-api');
        throw new Error('Rate limit exceeded');
      }
      
      log(`Error using Instagram Basic Display API: ${error.message}`, 'instagram-api');
      if (error.response?.data) {
        log(`API error details: ${JSON.stringify(error.response.data)}`, 'instagram-api');
      }
      throw error;
    }
  }
  
  /**
   * Fetch Instagram data using the Graph API (for business/creator accounts)
   * @param username Instagram username
   * @param accessToken Access token to use for API requests
   * @returns Platform data or null
   */
  private async fetchViaGraphApi(username: string, accessToken: string): Promise<PlatformData | null> {
    try {
      // Instagram Graph API requires business discovery with a valid Instagram Business Account ID
      // First get the page ID
      const pageResponse = await this.fetchWithBackoff(() =>
        axios.get('https://graph.facebook.com/v18.0/me/accounts', {
          params: { access_token: accessToken }
        })
      );
      
      if (!pageResponse.data || !pageResponse.data.data || pageResponse.data.data.length === 0) {
        log('No Facebook Pages found', 'instagram-api');
        return null;
      }
      
      // Use the first page by default
      const pageId = pageResponse.data.data[0].id;
      
      // Now get the Instagram Business Account ID
      const accountResponse = await this.fetchWithBackoff(() =>
        axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
          params: {
            fields: 'instagram_business_account',
            access_token: accessToken
          }
        })
      );
      
      if (!accountResponse.data || !accountResponse.data.instagram_business_account) {
        log('No Instagram Business Account found', 'instagram-api');
        return null;
      }
      
      const instagramAccountId = accountResponse.data.instagram_business_account.id;
      
      // Now use business discovery to get data for the target username
      const discoveryResponse = await this.fetchWithBackoff(() =>
        axios.get(`https://graph.facebook.com/v18.0/${instagramAccountId}`, {
          params: {
            fields: 'business_discovery.username(' + username + '){username,website,name,ig_id,id,profile_picture_url,biography,follows_count,followers_count,media_count,media{caption,like_count,comments_count,media_url,permalink,timestamp}}',
            access_token: accessToken
          }
        })
      );
      
      if (!discoveryResponse.data || !discoveryResponse.data.business_discovery) {
        log(`No Instagram data found for username ${username}`, 'instagram-api');
        return null;
      }
      
      const data = discoveryResponse.data.business_discovery;
      return this.transformGraphApiData(data, username);
    } catch (error: any) {
      // Handle rate limiting specifically
      if (error.response?.status === 429) {
        log('Instagram Graph API rate limit exceeded', 'instagram-api');
        throw new Error('Rate limit exceeded');
      }
      
      log(`Error using Graph API: ${error.message}`, 'instagram-api');
      if (error.response?.data) {
        log(`API error details: ${JSON.stringify(error.response.data)}`, 'instagram-api');
      }
      throw error;
    }
  }
  
  /**
   * Fetch Instagram data by scraping the public profile page
   * @param username Instagram username
   * @returns Platform data or null
   */
  private async fetchViaPublicProfile(username: string): Promise<PlatformData | null> {
    try {
      // Try the more reliable public API approach first
      const publicApiUrl = `https://www.instagram.com/${username}/?__a=1&__d=dis`;
      
      const response = await this.fetchWithBackoff(() =>
        axios.get(publicApiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.instagram.com/',
            'X-IG-App-ID': '936619743392459',
            'Cookie': 'ig_did=0; csrftoken=missing; mid=missing;',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin'
          }
        })
      );
      
      // Check different response formats that Instagram may return
      if (response.data?.data?.user) {
        log(`Successfully retrieved user data format 1 for Instagram user ${username}`, 'instagram-api');
        return this.transformPublicData(response.data.data.user, username);
      } else if (response.data?.graphql?.user) {
        log(`Successfully retrieved user data format 2 for Instagram user ${username}`, 'instagram-api');
        return this.transformPublicData(response.data.graphql.user, username);
      }
      
      // Instagram may have rate-limited us or changed their API format
      log('Instagram public API rate limit exceeded or format changed', 'instagram-api');
      throw new Error('Rate limit exceeded or format changed');
    } catch (error: any) {
      if (error.response?.status === 429 || error.message.includes('rate limit')) {
        log('Instagram public API rate limit exceeded', 'instagram-api');
        throw new Error('Rate limit exceeded');
      }
      
      log(`Error accessing Instagram public API: ${error.message}`, 'instagram-api');
      throw error;
    }
  }
  
  /**
   * Transform data from the Basic Display API to our platform format
   * @param userData User data from the API
   * @param mediaItems Media items from the API
   * @param username Username we searched for
   * @returns Formatted platform data
   */
  private transformBasicDisplayData(userData: any, mediaItems: any[], username: string): PlatformData {
    // Calculate activity metrics from media items
    const totalLikes = 0; // Not available in Basic Display API
    const totalComments = 0; // Not available in Basic Display API
    const totalShares = 0; // Not available in Basic Display API
    
    // Create content items from media
    const contentItems = mediaItems.map(item => ({
      type: "post" as const,
      content: item.caption || '',
      timestamp: item.timestamp,
      url: item.permalink,
      mediaUrl: item.media_url,
      thumbnailUrl: item.thumbnail_url,
      mediaType: item.media_type,
      engagement: {
        likes: 0, // Not available in Basic Display API
        comments: 0, // Not available in Basic Display API
        shares: 0 // Not available in Basic Display API
      }
    }));
    
    // Get activity timestamps for timeline
    const activityDates = mediaItems
      .map(item => new Date(item.timestamp).toISOString().split('T')[0])
      .reduce((acc: Record<string, number>, date: string) => {
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    // Convert to timeline format
    const timeline = Object.entries(activityDates)
      .map(([date, count]: [string, number]) => ({
        period: date,
        count
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-10); // Last 10 dates
    
    return {
      platformId: 'instagram' as Platform,
      username: username,
      profileData: {
        displayName: userData.username,
        bio: '', // Not available in Basic Display API
        followerCount: 0, // Not available in Basic Display API
        followingCount: 0, // Not available in Basic Display API
        joinDate: undefined, // Not available in Basic Display API
        profileUrl: `https://instagram.com/${username}`,
        avatarUrl: '', // Not available in Basic Display API
        location: undefined // Not available in Basic Display API
      },
      activityData: {
        totalPosts: mediaItems.length,
        totalComments,
        totalLikes,
        totalShares,
        postsPerDay: (mediaItems.length / 
          Math.max(1, Math.floor((Date.now() - new Date(mediaItems[mediaItems.length - 1]?.timestamp || Date.now()).getTime()) / (1000 * 60 * 60 * 24)))),
        lastActive: mediaItems[0]?.timestamp
      },
      contentData: contentItems,
      analysisResults: {
        exposureScore: 50, // Default value for Basic Display API
        topTopics: [
          { topic: "Uncategorized", percentage: 100 }
        ],
        activityTimeline: timeline,
        sentimentBreakdown: {
          positive: 0.33,
          neutral: 0.34,
          negative: 0.33
        },
        dataCategories: [
          { category: "Posts", severity: "low" },
          { category: "Profile Information", severity: "low" }
        ],
        privacyConcerns: [],
        recommendedActions: [
          "Review privacy settings on Instagram regularly",
          "Check third-party app permissions"
        ],
        platformSpecificMetrics: {
          contentBreakdown: this.calculateContentTypeBreakdown(mediaItems),
          locationCheckIns: [], // Not available in Basic Display API
          engagementRate: 0, // Not available in Basic Display API
          hashtagAnalysis: [] // Not available in Basic Display API
        }
      }
    };
  }
  
  /**
   * Transform data from the Graph API to our platform format
   * @param data Data from the Graph API
   * @param username Username we searched for
   * @returns Formatted platform data
   */
  private transformGraphApiData(data: any, username: string): PlatformData {
    const media = data.media?.data || [];
    
    // Calculate total engagement across media
    const totalLikes = media.reduce((sum: number, item: any) => sum + (item.like_count || 0), 0);
    const totalComments = media.reduce((sum: number, item: any) => sum + (item.comments_count || 0), 0);
    const totalShares = 0; // Not available in Graph API
    
    // Create content items from media
    const contentItems = media.map((item: any) => ({
      type: "post" as const,
      content: item.caption || '',
      timestamp: item.timestamp,
      url: item.permalink,
      mediaUrl: item.media_url,
      engagement: {
        likes: item.like_count || 0,
        comments: item.comments_count || 0,
        shares: 0 // Not available in Graph API
      }
    }));
    
    // Get activity timestamps for timeline
    const activityDates = media
      .map((item: any) => new Date(item.timestamp).toISOString().split('T')[0])
      .reduce((acc: Record<string, number>, date: string) => {
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});
    
    // Convert to timeline format
    const timeline = Object.entries(activityDates)
      .map(([date, count]) => ({
        period: date,
        count
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-10); // Last 10 dates
    
    // Calculate engagement rate (likes + comments) / followers / posts * 100
    const engagementRate = data.followers_count && media.length
      ? (totalLikes + totalComments) / data.followers_count / media.length * 100
      : 0;
    
    return {
      platformId: 'instagram' as Platform,
      username: username,
      profileData: {
        displayName: data.name || username,
        bio: data.biography || '',
        followerCount: data.followers_count || 0,
        followingCount: data.follows_count || 0,
        joinDate: undefined, // Not available in Graph API
        profileUrl: `https://instagram.com/${username}`,
        avatarUrl: data.profile_picture_url || '',
        location: undefined // Not available in Graph API
      },
      activityData: {
        totalPosts: data.media_count || 0,
        totalComments,
        totalLikes,
        totalShares,
        postsPerDay: (data.media_count / 
          Math.max(1, Math.floor((Date.now() - new Date(media[media.length - 1]?.timestamp || Date.now()).getTime()) / (1000 * 60 * 60 * 24)))),
        lastActive: media[0]?.timestamp
      },
      contentData: contentItems,
      analysisResults: {
        exposureScore: calculateExposureScore(data),
        topTopics: extractTopicsFromContent(contentItems),
        activityTimeline: timeline,
        sentimentBreakdown: {
          positive: 0.5,
          neutral: 0.3,
          negative: 0.2
        },
        dataCategories: [
          { category: "Posts", severity: "medium" },
          { category: "Profile Information", severity: "low" },
          { category: "Engagement", severity: "medium" }
        ],
        privacyConcerns: generatePrivacyConcerns(data, media),
        recommendedActions: [
          "Review privacy settings on Instagram regularly",
          "Be aware of location data shared in posts",
          "Check third-party app permissions"
        ],
        platformSpecificMetrics: {
          contentBreakdown: this.calculateContentTypeBreakdown(media),
          locationCheckIns: [], // Not properly available in Graph API
          engagementRate,
          hashtagAnalysis: this.extractHashtags(media)
        }
      }
    };
  }
  
  /**
   * Transform data from the public API to our platform format
   * @param data Data from public API
   * @param username Username we searched for
   * @returns Formatted platform data
   */
  private transformPublicData(data: any, username: string): PlatformData {
    // Extract core profile data
    const profileData = {
      displayName: data.full_name || username,
      bio: data.biography || "",
      followerCount: data.edge_followed_by?.count || 0,
      followingCount: data.edge_follow?.count || 0,
      joinDate: undefined, // Not available in public API
      profileUrl: `https://instagram.com/${username}`,
      avatarUrl: data.profile_pic_url || data.profile_pic_url_hd || '',
      location: undefined // Not directly available
    };
    
    // Extract recent posts if available
    const posts = data.edge_owner_to_timeline_media?.edges || [];
    
    // Calculate engagement from available posts
    const totalPosts = data.edge_owner_to_timeline_media?.count || 0;
    const totalLikes = posts.reduce((sum: number, post: any) => sum + (post.node?.edge_liked_by?.count || post.node?.edge_media_preview_like?.count || 0), 0);
    const totalComments = posts.reduce((sum: number, post: any) => sum + (post.node?.edge_media_to_comment?.count || 0), 0);
    
    // Create content items from posts
    const contentItems = posts.map((post: any) => {
      const node = post.node;
      return {
        type: "post" as const,
        content: node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
        timestamp: new Date(node.taken_at_timestamp * 1000).toISOString(),
        url: `https://instagram.com/p/${node.shortcode}`,
        mediaUrl: node.display_url,
        engagement: {
          likes: node.edge_liked_by?.count || node.edge_media_preview_like?.count || 0,
          comments: node.edge_media_to_comment?.count || 0,
          shares: 0 // Not available in public API
        }
      };
    });
    
    // Extract timestamps from posts for timeline
    const activityDates = posts
      .map((post: any) => {
        const timestamp = post.node?.taken_at_timestamp;
        if (!timestamp) return null;
        return new Date(timestamp * 1000).toISOString().split('T')[0];
      })
      .filter(Boolean)
      .reduce((acc: Record<string, number>, date: string) => {
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});
    
    // Convert to timeline format
    const timeline = Object.entries(activityDates)
      .map(([date, count]) => ({
        period: date,
        count
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-10); // Last 10 days
    
    // Calculate engagement rate
    const engagementRate = profileData.followerCount && posts.length
      ? (totalLikes + totalComments) / profileData.followerCount / posts.length * 100
      : 0;
    
    // Extract content type breakdown
    const mediaTypes = posts.reduce((acc: Record<string, number>, post: any) => {
      const type = post.node?.is_video ? 'videos' : 'photos';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    // Calculate percentages for content breakdown
    const totalItems = Object.values(mediaTypes).reduce((sum: number, count: number) => sum + count, 0) || 1;
    const contentBreakdown: Record<string, number> = {};
    Object.entries(mediaTypes).forEach(([type, count]: [string, number]) => {
      contentBreakdown[type] = count / totalItems;
    });
    
    return {
      platformId: 'instagram' as Platform,
      username: username,
      profileData,
      activityData: {
        totalPosts,
        totalComments,
        totalLikes,
        totalShares: 0, // Not available in public API
        postsPerDay: posts.length > 0 && posts[0].node?.taken_at_timestamp
          ? posts.length / Math.max(1, Math.floor((Date.now() - posts[posts.length-1].node.taken_at_timestamp * 1000) / (1000 * 60 * 60 * 24)))
          : 0,
        lastActive: posts.length > 0 && posts[0].node?.taken_at_timestamp
          ? new Date(posts[0].node.taken_at_timestamp * 1000).toISOString()
          : undefined
      },
      contentData: contentItems,
      analysisResults: {
        exposureScore: calculateExposureScorePublic(data),
        topTopics: extractTopicsFromContent(contentItems),
        activityTimeline: timeline,
        sentimentBreakdown: {
          positive: 0.5,
          neutral: 0.3,
          negative: 0.2
        },
        dataCategories: [
          { category: "Posts", severity: "medium" },
          { category: "Profile Information", severity: "low" },
          { category: "Engagement", severity: "medium" }
        ],
        privacyConcerns: generatePrivacyConcernsPublic(data, posts),
        recommendedActions: [
          "Review privacy settings on Instagram regularly",
          "Check which third-party apps have access to your account",
          "Consider making your account private if you're concerned about exposure"
        ],
        platformSpecificMetrics: {
          contentBreakdown,
          locationCheckIns: [],
          engagementRate,
          hashtagAnalysis: extractHashtagsPublic(posts)
        }
      }
    };
  }
  
  /**
   * Calculate breakdown of content types from media items
   * @param media Media items from API
   * @returns Object with content type percentages
   */
  private calculateContentTypeBreakdown(media: any[]): Record<string, number> {
    if (!media || media.length === 0) {
      return {
        photos: 0.5,
        videos: 0.5
      };
    }
    
    const types: Record<string, number> = {};
    
    // Count by media type
    media.forEach((item: any) => {
      const type = item.media_type 
        ? item.media_type.toLowerCase() 
        : (item.is_video ? 'video' : 'image');
      
      let category: string;
      // Normalize media types
      if (type.includes('video') || type === 'video') {
        category = 'videos';
      } else if (type.includes('carousel')) {
        category = 'carousels';
      } else {
        category = 'photos';
      }
      
      types[category] = (types[category] || 0) + 1;
    });
    
    // Convert to percentages
    const total = Object.values(types).reduce((sum, count) => sum + count, 0);
    const result: Record<string, number> = {};
    
    Object.entries(types).forEach(([type, count]) => {
      result[type] = count / total;
    });
    
    return result;
  }
  
  /**
   * Extract hashtags from media items
   * @param media Media items from API
   * @returns Array of hashtag analysis data
   */
  private extractHashtags(media: any[]): { tag: string; count: number; }[] {
    if (!media || media.length === 0) {
      return [];
    }
    
    const hashtagCounts: Record<string, number> = {};
    
    // Extract hashtags from captions
    media.forEach((item: any) => {
      const caption = item.caption || '';
      const hashtags = caption.match(/#[\w\u0590-\u05FF]+/g) || [];
      
      hashtags.forEach((tag: string) => {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
      });
    });
    
    // Convert to array and sort by count
    return Object.entries(hashtagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 hashtags
  }
}

// Helper functions for analysis

/**
 * Calculate exposure score based on follower count, post frequency and profile completeness
 * @param data Instagram profile data from Graph API
 * @returns Numeric score from 0-100
 */
function calculateExposureScore(data: any): number {
  let score = 50; // Default score
  
  // Add points based on follower count
  const followers = data.followers_count || 0;
  if (followers > 10000) score += 25;
  else if (followers > 1000) score += 15;
  else if (followers > 100) score += 5;
  
  // Add points based on post count
  const posts = data.media_count || 0;
  if (posts > 1000) score += 15;
  else if (posts > 100) score += 10;
  else if (posts > 10) score += 5;
  
  // Add points for profile completeness
  if (data.biography) score += 5;
  if (data.website) score += 5;
  
  // Cap at 100
  return Math.min(100, score);
}

/**
 * Calculate exposure score based on public profile data
 * @param data Instagram profile data from public API
 * @returns Numeric score from 0-100
 */
function calculateExposureScorePublic(data: any): number {
  let score = 50; // Default score
  
  // Add points based on follower count
  const followers = data.edge_followed_by?.count || 0;
  if (followers > 10000) score += 25;
  else if (followers > 1000) score += 15;
  else if (followers > 100) score += 5;
  
  // Add points based on post count
  const posts = data.edge_owner_to_timeline_media?.count || 0;
  if (posts > 1000) score += 15;
  else if (posts > 100) score += 10;
  else if (posts > 10) score += 5;
  
  // Add points for profile completeness
  if (data.biography) score += 5;
  if (data.external_url) score += 5;
  
  // Cap at 100
  return Math.min(100, score);
}

/**
 * Extract topics from content based on caption analysis
 * @param contentItems Content items with captions
 * @returns Array of topic objects with percentages
 */
function extractTopicsFromContent(contentItems: any[]): { topic: string; percentage: number; }[] {
  if (!contentItems || contentItems.length === 0) {
    return [{ topic: "Unknown", percentage: 1.0 }];
  }
  
  const keywords: Record<string, number> = {};
  
  // Simple keyword extraction (would use NLP in a real implementation)
  contentItems.forEach(item => {
    const caption = item.content || '';
    // Remove hashtags and mentions
    const cleanText = caption
      .replace(/#[\w\u0590-\u05FF]+/g, '')
      .replace(/@[\w\u0590-\u05FF]+/g, '');
      
    // Split into words
    const words = cleanText.split(/\s+/).filter((w: string) => w.length > 4);
    
    // Count word frequency
    words.forEach((word: string) => {
      keywords[word.toLowerCase()] = (keywords[word.toLowerCase()] || 0) + 1;
    });
  });
  
  // Use most common words as topics
  const topics = Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([keyword]) => keyword.charAt(0).toUpperCase() + keyword.slice(1));
  
  // If we couldn't extract meaningful topics, use defaults
  if (topics.length === 0) {
    return [
      { topic: "Lifestyle", percentage: 0.6 },
      { topic: "Travel", percentage: 0.4 }
    ];
  }
  
  // Assign percentages
  const result = topics.map((topic, index) => ({
    topic,
    percentage: 1 - (index * 0.25)
  }));
  
  // Normalize percentages
  const total = result.reduce((sum, item) => sum + item.percentage, 0);
  return result.map(item => ({
    topic: item.topic,
    percentage: item.percentage / total
  }));
}

/**
 * Generate privacy concerns based on profile data and media
 * @param data Instagram profile data from Graph API
 * @param media Media items from API
 * @returns Array of privacy concern objects
 */
function generatePrivacyConcerns(data: any, media: any[]): { type: string; severity: "low" | "medium" | "high"; description: string; }[] {
  const concerns: { type: string; severity: "low" | "medium" | "high"; description: string; }[] = [];
  
  // Check follower count
  const followers = data.followers_count || 0;
  if (followers > 10000) {
    concerns.push({
      type: "Large Following",
      severity: "high",
      description: "Having a large follower base increases your digital footprint and visibility."
    });
  } else if (followers > 1000) {
    concerns.push({
      type: "Moderate Following",
      severity: "medium",
      description: "Your moderate following means your content reaches a substantial audience."
    });
  }
  
  // Check post frequency
  const postCount = data.media_count || 0;
  if (postCount > 100) {
    concerns.push({
      type: "Frequent Posting",
      severity: "medium",
      description: "Your frequent posting creates a detailed digital record over time."
    });
  }
  
  // Check for location data in posts
  let hasLocationData = false;
  media.forEach((item: any) => {
    if (item.location) {
      hasLocationData = true;
    }
  });
  
  if (hasLocationData) {
    concerns.push({
      type: "Location Data",
      severity: "high",
      description: "Your posts contain location data which can reveal your frequently visited places."
    });
  }
  
  // Check for profile completeness
  if (data.biography && data.website) {
    concerns.push({
      type: "Profile Information",
      severity: "low",
      description: "Your profile contains personal information that is publicly accessible."
    });
  }
  
  return concerns;
}

/**
 * Generate privacy concerns from public profile data
 * @param data Instagram profile data from public API
 * @param posts Post items from public API
 * @returns Array of privacy concern objects
 */
function generatePrivacyConcernsPublic(data: any, posts: any[]): { type: string; severity: "low" | "medium" | "high"; description: string; }[] {
  const concerns: { type: string; severity: "low" | "medium" | "high"; description: string; }[] = [];
  
  // Check follower count
  const followers = data.edge_followed_by?.count || 0;
  if (followers > 10000) {
    concerns.push({
      type: "Large Following",
      severity: "high",
      description: "Having a large follower base increases your digital footprint and visibility."
    });
  } else if (followers > 1000) {
    concerns.push({
      type: "Moderate Following",
      severity: "medium",
      description: "Your moderate following means your content reaches a substantial audience."
    });
  }
  
  // Check post frequency
  const postCount = data.edge_owner_to_timeline_media?.count || 0;
  if (postCount > 100) {
    concerns.push({
      type: "Frequent Posting",
      severity: "medium",
      description: "Your frequent posting creates a detailed digital record over time."
    });
  }
  
  // Check for location data in posts
  let hasLocationData = false;
  posts.forEach((post: any) => {
    if (post.node?.location) {
      hasLocationData = true;
    }
  });
  
  if (hasLocationData) {
    concerns.push({
      type: "Location Data",
      severity: "high",
      description: "Your posts contain location data which can reveal your frequently visited places."
    });
  }
  
  // Check for profile completeness
  if (data.biography && data.external_url) {
    concerns.push({
      type: "Profile Information",
      severity: "low",
      description: "Your profile contains personal information that is publicly accessible."
    });
  }
  
  return concerns;
}

/**
 * Extract hashtags from public posts
 * @param posts Post items from public API
 * @returns Array of hashtag analysis data
 */
function extractHashtagsPublic(posts: any[]): { tag: string; count: number; }[] {
  if (!posts || posts.length === 0) {
    return [];
  }
  
  const hashtagCounts: Record<string, number> = {};
  
  // Extract hashtags from captions
  posts.forEach((post: any) => {
    const captionEdges = post.node?.edge_media_to_caption?.edges || [];
    const caption = captionEdges.length > 0 ? captionEdges[0].node.text : '';
    const hashtags = caption.match(/#[\w\u0590-\u05FF]+/g) || [];
    
    hashtags.forEach((tag: string) => {
      hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
    });
  });
  
  // Convert to array and sort by count
  return Object.entries(hashtagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 hashtags
}

// Export as a singleton
export const instagramApiV4 = new InstagramApiServiceV4();