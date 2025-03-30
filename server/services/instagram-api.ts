/**
 * Instagram API Integration Service
 * 
 * Comprehensive Instagram API implementation with:
 * - Multiple API access methods (Graph API, Basic Display API, Public API)
 * - Advanced error handling with detailed diagnostics
 * - Automatic token refresh and management
 * - Built-in rate limiting with exponential backoff
 * - Request caching for improved performance
 * - Robust data transformation for consistent output format
 */

import axios from 'axios';
import { Platform, PlatformData, platformDataSchema } from '@shared/schema';
import { log } from '../vite';
import { cacheService } from './cache-service';
import { rateLimiters } from './rate-limiter';
import { instagramOAuth } from './instagram-oauth';
import { tokenManager } from './token-manager';

export class InstagramApiService {
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
    log('Instagram API Service initialized with advanced error handling, caching and rate limiting', 'instagram-api');
  }
  
  /**
   * Helper method to get a value from a nested object using a dot-path notation
   * Also supports array indices as [index]
   * @param obj Object to extract value from
   * @param path Path in dot notation, e.g., 'user.profile.name' or 'data.[0].user'
   * @returns The value at the path or undefined if not found
   */
  private getValueByPath(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    
    // Split the path by dots, but handle array notation specially
    const parts: string[] = [];
    let currentPart = '';
    let inBrackets = false;
    
    for (let i = 0; i < path.length; i++) {
      const char = path[i];
      
      if (char === '.' && !inBrackets) {
        if (currentPart) {
          parts.push(currentPart);
          currentPart = '';
        }
      } else if (char === '[') {
        if (currentPart) {
          parts.push(currentPart);
          currentPart = '';
        }
        inBrackets = true;
        currentPart += char;
      } else if (char === ']') {
        currentPart += char;
        inBrackets = false;
      } else {
        currentPart += char;
      }
    }
    
    if (currentPart) {
      parts.push(currentPart);
    }
    
    // Traverse the object using the path parts
    let current = obj;
    
    for (const part of parts) {
      if (part.includes('[') && part.includes(']')) {
        // Handle array access
        const indexMatch = part.match(/\[(\d+)\]/);
        if (indexMatch) {
          const index = parseInt(indexMatch[1], 10);
          const arrayName = part.split('[')[0];
          
          // If we have an array name, first access that property
          if (arrayName && current[arrayName] !== undefined) {
            current = current[arrayName];
          }
          
          // Then access the array index
          if (Array.isArray(current) && index < current.length) {
            current = current[index];
          } else {
            return undefined;
          }
        }
      } else if (current[part] !== undefined) {
        // Standard property access
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
  
  /**
   * Check if the service has valid credentials
   * @returns boolean indicating if credentials are available
   */
  public async hasValidCredentials(): Promise<boolean> {
    // Check for valid token in token manager
    const hasToken = await tokenManager.hasValidToken('instagram');
    if (hasToken) {
      return true;
    }
    
    // Check for access token from OAuth as fallback
    const oauthToken = await instagramOAuth.getAccessToken();
    if (oauthToken) {
      // Store the token in token manager for future use
      await tokenManager.setToken('instagram', {
        accessToken: oauthToken!, // Non-null assertion as we've already checked it's not null
        // Instagram Basic Display tokens last 60 days
        expiresAt: Date.now() + (60 * 24 * 60 * 60 * 1000)
      });
      return true;
    }
    
    // Check for INSTAGRAM_ACCESS_TOKEN in environment
    if (process.env.INSTAGRAM_ACCESS_TOKEN) {
      // Store the token in token manager for future use
      await tokenManager.setToken('instagram', {
        accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
        // Long-lived tokens can last up to 60 days
        expiresAt: Date.now() + (60 * 24 * 60 * 60 * 1000)
      });
      return true;
    }
    
    return false;
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
    
    // Check if credentials are available
    const hasCredentials = await this.hasValidCredentials();
    if (!hasCredentials) {
      const status = {
        configured: false,
        message: 'Instagram API not configured. Please set up OAuth or API key.'
      };
      this.apiStatusCache = { status, timestamp: Date.now() };
      return status;
    }
    
    // Get token information
    const token = await tokenManager.getToken('instagram');
    const oauthToken = await instagramOAuth.getAccessToken();
    const tokenType = token ? 'TokenManager' : 
                    (oauthToken !== null) ? 'OAuth' : 'API Key';
    
    // Get rate limiter stats
    const stats = rateLimiters.instagram.getStats();
    
    // Check if token is valid by performing a test request
    let operational = false;
    try {
      // Only perform validation request if we don't have recent success
      // or if we've never checked operational status
      if (this.apiStatusCache === null || 
          this.apiStatusCache.status.operational === undefined || 
          this.apiStatusCache.status.operational === false) {
        
        // We'll make a light request to validate the token
        // Using either /me endpoint for OAuth tokens or a simple user search for API keys
        if (token || oauthToken) {
          const accessToken = token?.accessToken || oauthToken!;
          
          // Check if token is going to expire soon
          const expiresAt = token?.expiresAt;
          const isExpiringSoon = expiresAt && (expiresAt - Date.now() < 24 * 60 * 60 * 1000); // 24 hours
          
          if (isExpiringSoon) {
            // Try to refresh the token
            try {
              await tokenManager.refreshToken('instagram');
              operational = true;
            } catch (refreshError) {
              log(`Failed to refresh Instagram token: ${refreshError}`, 'instagram-api');
              operational = false;
            }
          } else {
            // Make minimal API request to validate token
            try {
              // Try Graph API /me endpoint for validation
              const meResponse = await axios.get('https://graph.instagram.com/me', {
                params: { 
                  fields: 'id,username',
                  access_token: accessToken
                }
              });
              
              if (meResponse.data && meResponse.data.id) {
                operational = true;
              }
            } catch (validationError: any) {
              log(`Instagram token validation failed: ${validationError.message}`, 'instagram-api');
              
              // Check if the token is invalid
              if (validationError.response?.data?.error?.type === 'OAuthException') {
                operational = false;
              }
            }
          }
        } else if (process.env.INSTAGRAM_ACCESS_TOKEN) {
          // Try to use the environment token for validation
          try {
            const response = await axios.get('https://graph.instagram.com/me', {
              params: { 
                fields: 'id,username',
                access_token: process.env.INSTAGRAM_ACCESS_TOKEN
              }
            });
            if (response.data && response.data.id) {
              operational = true;
              
              // Store the token for future use
              await tokenManager.setToken('instagram', {
                accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
                expiresAt: Date.now() + (60 * 24 * 60 * 60 * 1000) // 60 days
              });
            }
          } catch (error: any) {
            log(`Instagram API key validation failed: ${error.message}`, 'instagram-api');
            operational = false;
          }
        }
      } else {
        // Reuse previous operational status if we have a recent check
        operational = this.apiStatusCache.status.operational || false;
      }
    } catch (error: any) {
      log(`Error checking Instagram API status: ${error.message}`, 'instagram-api');
      operational = false;
    }
    
    const status = {
      configured: true,
      operational,
      message: `Instagram ${tokenType} configured. ${stats.availableTokens}/${stats.maxTokens} API calls available. ${operational ? 'API is operational.' : 'API credentials may be invalid or expired.'}`
    };
    
    // Cache the status
    this.apiStatusCache = { status, timestamp: Date.now() };
    return status;
  }
  
  /**
   * Fetch user data from Instagram using available methods with caching and rate limiting
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
        const minimalErrorData = this.createMinimalErrorData(normalizedUsername, error);
        cacheService.platformData.set(cacheKey, minimalErrorData, this.CACHE_TTL.ERROR);
        return minimalErrorData;
      }
      
      return null;
    }
  }
  
  /**
   * Execute the actual data fetch with multiple fallback strategies
   * @param username Normalized username
   * @returns Platform data or null
   */
  private async executeDataFetch(username: string): Promise<PlatformData | null> {
    // Try different methods in order of preference:
    // 1. TokenManager-based access (most reliable and provides refresh capability)
    // 2. OAuth-based API access (reliable but may require user login)
    // 3. Graph API with access token (good for business accounts)
    // 4. Public profile scraping (limited but works for public accounts)
    
    let result: PlatformData | null = null;
    let errorMessages: string[] = [];
    
    // 1. Try TokenManager first if available
    const token = await tokenManager.getToken('instagram');
    if (token) {
      try {
        log('Attempting fetch via TokenManager with Basic Display API', 'instagram-api');
        result = await this.fetchViaBasicDisplayApi(username, token.accessToken);
        if (result) return result;
      } catch (error: any) {
        const errorMsg = `TokenManager fetch failed: ${error.message}`;
        log(errorMsg, 'instagram-api');
        errorMessages.push(errorMsg);
        
        // If we got an authentication error, try to refresh the token
        if (error.response?.data?.error?.type === 'OAuthException') {
          try {
            log('Attempting to refresh Instagram token', 'instagram-api');
            await tokenManager.refreshToken('instagram');
            // Try again with the refreshed token
            const refreshedToken = await tokenManager.getToken('instagram');
            if (refreshedToken) {
              result = await this.fetchViaBasicDisplayApi(username, refreshedToken.accessToken);
              if (result) return result;
            }
          } catch (refreshError: any) {
            log(`Token refresh failed: ${refreshError.message}`, 'instagram-api');
          }
        }
        // Continue to next method
      }
    }
    
    // 2. Try OAuth if available
    const oauthAccessToken = await instagramOAuth.getAccessToken();
    if (oauthAccessToken) {
      try {
        log('Attempting fetch via OAuth Basic Display API', 'instagram-api');
        result = await this.fetchViaBasicDisplayApi(username, oauthAccessToken);
        if (result) return result;
      } catch (error: any) {
        const errorMsg = `OAuth fetch failed: ${error.message}`;
        log(errorMsg, 'instagram-api');
        errorMessages.push(errorMsg);
        // Continue to next method
      }
    }
    
    // 3. Try Graph API if access token is available
    if (process.env.INSTAGRAM_ACCESS_TOKEN) {
      try {
        log('Attempting fetch via Graph API', 'instagram-api');
        result = await this.fetchViaGraphApi(username, process.env.INSTAGRAM_ACCESS_TOKEN);
        if (result) return result;
      } catch (error: any) {
        const errorMsg = `Graph API fetch failed: ${error.message}`;
        log(errorMsg, 'instagram-api');
        errorMessages.push(errorMsg);
        // Continue to next method
      }
    }
    
    // 4. Try public profile as last resort
    try {
      log('Attempting fetch via public profile', 'instagram-api');
      result = await this.fetchViaPublicProfile(username);
      if (result) return result;
    } catch (error: any) {
      const errorMsg = `Public profile fetch failed: ${error.message}`;
      log(errorMsg, 'instagram-api');
      errorMessages.push(errorMsg);
      // All methods failed
    }
    
    // If we got here, all methods failed
    log(`All Instagram API methods failed for username ${username}. Errors: ${errorMessages.join('; ')}`, 'instagram-api');
    return null;
  }
  
  /**
   * Create minimal data for error responses
   * @param username Username that caused the error
   * @param error The error that occurred
   * @returns Minimal platform data
   */
  private createMinimalErrorData(username: string, error: any): PlatformData {
    const isRateLimited = error.response?.status === 429;
    const isNotFound = error.response?.status === 404;
    
    const minimalData: PlatformData = {
      platformId: "instagram",
      username,
      profileData: {
        displayName: username,
        bio: "",
        followerCount: 0,
        followingCount: 0,
        joinDate: new Date().toISOString(),
        profileUrl: `https://instagram.com/${username}`,
        avatarUrl: `https://ui-avatars.com/api/?name=${username}&background=FF5A5F&color=fff`,
        location: undefined,
        verified: false
      },
      activityData: {
        totalPosts: 0,
        totalComments: 0,
        totalLikes: 0,
        totalShares: 0,
        postsPerDay: 0,
        mostActiveTime: "Unknown",
        lastActive: new Date().toISOString(),
        topHashtags: []
      },
      contentData: [],
      privacyMetrics: {
        exposureScore: 0,
        dataCategories: [
          { category: "Profile Information", severity: "low" }
        ],
        potentialConcerns: [
          { issue: isRateLimited ? "API rate limit exceeded" : 
                 isNotFound ? "Profile not found" : 
                 "Profile not accessible", risk: "low" }
        ],
        recommendedActions: [
          isRateLimited ? "Try again later" : 
          isNotFound ? "Verify username is correct" : 
          "Verify username and privacy settings"
        ]
      },
      analysisResults: {
        exposureScore: 0,
        topTopics: [{ topic: "Unknown", percentage: 1.0 }],
        activityTimeline: [],
        sentimentBreakdown: {
          positive: 0.33,
          neutral: 0.34,
          negative: 0.33
        },
        dataCategories: [
          { category: "Profile Information", severity: "low" }
        ],
        privacyConcerns: [
          { 
            type: isRateLimited ? "Rate limiting" : 
                 isNotFound ? "Profile not found" : 
                 "Profile access", 
            severity: "low",
            description: isRateLimited 
              ? "Instagram API rate limit reached. Try again later." 
              : isNotFound
              ? "Instagram profile not found. Verify the username."
              : "Could not access Instagram profile data."
          }
        ],
        recommendedActions: [
          isRateLimited ? "Try again later" : 
          isNotFound ? "Verify username is correct" : 
          "Verify username and privacy settings"
        ],
        platformSpecificMetrics: {
          contentBreakdown: {
            photos: 0,
            videos: 0,
            stories: 0,
            reels: 0
          },
          locationCheckIns: [],
          engagementRate: 0,
          hashtagAnalysis: []
        }
      }
    };
    
    return minimalData;
  }
  
  /**
   * Fetch Instagram data using the Basic Display API
   * @param username Instagram username
   * @param accessToken Access token to use
   * @returns Platform data or null
   */
  private async fetchViaBasicDisplayApi(username: string, accessToken: string): Promise<PlatformData | null> {
    try {
      // First get our own user ID and details
      const meResponse = await axios.get('https://graph.instagram.com/me', {
        params: { 
          fields: 'id,username,account_type',
          access_token: accessToken
        }
      });
      
      if (!meResponse.data || !meResponse.data.id) {
        log('Failed to get Instagram user ID from /me endpoint', 'instagram-api');
        return null;
      }
      
      // Check if we're trying to fetch the authenticated user
      const userId = meResponse.data.id;
      const loggedInUsername = meResponse.data.username;
      
      // If we're looking for the currently authenticated user
      if (loggedInUsername.toLowerCase() === username.toLowerCase()) {
        // Get the user's profile
        const profileResponse = await axios.get(`https://graph.instagram.com/${userId}`, {
          params: {
            fields: 'id,username,media_count',
            access_token: accessToken
          }
        });
        
        // Get the user's media
        const mediaResponse = await axios.get(`https://graph.instagram.com/${userId}/media`, {
          params: {
            fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,children{media_url,media_type}',
            access_token: accessToken
          }
        });
        
        // Transform the data
        return this.transformBasicDisplayApiData(profileResponse.data, mediaResponse.data);
      } else {
        // Currently, Basic Display API only allows accessing the authenticated user's data
        // Future versions of this method could try to search for the user using a different endpoint
        log(`Basic Display API can only access authenticated user data (${loggedInUsername}), not ${username}`, 'instagram-api');
        return null;
      }
    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.status === 400 && 
          error.response?.data?.error?.type === 'OAuthException') {
        log(`Instagram Basic Display API OAuth error: ${error.response.data.error.message}`, 'instagram-api');
        // Token may be invalid or expired
        throw new Error(`Instagram token error: ${error.response.data.error.message}`);
      }
      
      log(`Error in Basic Display API: ${error.message}`, 'instagram-api');
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
      const pageResponse = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
        params: { access_token: accessToken }
      });
      
      if (!pageResponse.data || !pageResponse.data.data || pageResponse.data.data.length === 0) {
        log('No Facebook Pages found', 'instagram-api');
        return null;
      }
      
      // Use the first page by default
      const pageId = pageResponse.data.data[0].id;
      
      // Now get the Instagram Business Account ID
      const accountResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: accessToken
        }
      });
      
      if (!accountResponse.data || !accountResponse.data.instagram_business_account) {
        log('No Instagram Business Account found', 'instagram-api');
        return null;
      }
      
      const instagramAccountId = accountResponse.data.instagram_business_account.id;
      
      // Now use business discovery to get data for the target username
      const discoveryResponse = await axios.get(`https://graph.facebook.com/v18.0/${instagramAccountId}`, {
        params: {
          fields: 'business_discovery.username(' + username + '){username,website,name,ig_id,id,profile_picture_url,biography,follows_count,followers_count,media_count,media{caption,like_count,comments_count,media_url,permalink,timestamp}}',
          access_token: accessToken
        }
      });
      
      if (!discoveryResponse.data || !discoveryResponse.data.business_discovery) {
        log(`No Instagram data found for username ${username}`, 'instagram-api');
        return null;
      }
      
      const data = discoveryResponse.data.business_discovery;
      return this.transformGraphApiData(data, username);
    } catch (error: any) {
      // Handle rate limiting specifically
      if (error.response && error.response.status === 429) {
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
   * This approach doesn't rely on API endpoints that might be rate-limited
   * @param username Instagram username
   * @returns Platform data or null
   */
  private async fetchViaPublicProfile(username: string): Promise<PlatformData | null> {
    try {
      // Try the more reliable public API approach first
      // This URL returns JSON data directly without needing specific query hashes
      const publicApiUrl = `https://www.instagram.com/${username}/?__a=1&__d=dis`;
      
      const response = await axios.get(publicApiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.instagram.com/',
          'X-IG-App-ID': '936619743392459',
          'Cookie': 'ig_did=0; csrftoken=missing; mid=missing;', // Minimal required cookies
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin'
        }
      });
      
      // Check different response formats that Instagram may return
      if (response.data?.data?.user) {
        log(`Successfully retrieved user data format 1 for Instagram user ${username}`, 'instagram-api');
        return this.transformPublicData(response.data.data.user, username);
      } else if (response.data?.graphql?.user) {
        log(`Successfully retrieved user data format 2 for Instagram user ${username}`, 'instagram-api');
        return this.transformPublicData(response.data.graphql.user, username);
      } else if (response.data?.user) {
        log(`Successfully retrieved user data format 3 for Instagram user ${username}`, 'instagram-api');
        return this.transformPublicData(response.data.user, username);
      } else {
        log(`Unrecognized data format from Instagram public API for ${username}`, 'instagram-api');
        log(`Response data: ${JSON.stringify(response.data)}`, 'instagram-api');
        return null;
      }
    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.status === 404) {
        log(`Instagram user ${username} not found (404)`, 'instagram-api');
        throw new Error(`Instagram user ${username} not found`);
      } else if (error.response?.status === 429) {
        log(`Instagram public API rate limit exceeded for ${username}`, 'instagram-api');
        throw new Error('Rate limit exceeded');
      }
      
      log(`Error in public profile fetch: ${error.message}`, 'instagram-api');
      if (error.response?.data) {
        log(`API error details: ${JSON.stringify(error.response.data)}`, 'instagram-api');
      }
      throw error;
    }
  }
  
  /**
   * Transform Basic Display API data to our standard platform data format
   * @param profile Profile data from the basic display API
   * @param media Media data from the basic display API
   * @returns Standardized platform data
   */
  private transformBasicDisplayApiData(profile: any, media: any): PlatformData {
    try {
      // Extract hashtags from all captions
      const allCaptions = media?.data?.map((item: any) => item.caption || '').filter(Boolean) || [];
      const hashtagObjects = this.extractHashtags(allCaptions.join(' '));
      // Convert hashtag objects to strings for the schema
      const hashtags = hashtagObjects.map(h => h.tag);
      
      // Count media types
      const mediaItems = media?.data || [];
      let photoCount = 0;
      let videoCount = 0;
      
      for (const item of mediaItems) {
        if (item.media_type === 'IMAGE') {
          photoCount++;
        } else if (item.media_type === 'VIDEO' || item.media_type === 'REEL') {
          videoCount++;
        } else if (item.media_type === 'CAROUSEL_ALBUM' && item.children?.data) {
          // Count items in carousel
          for (const child of item.children.data) {
            if (child.media_type === 'IMAGE') {
              photoCount++;
            } else if (child.media_type === 'VIDEO') {
              videoCount++;
            }
          }
        }
      }
      
      // Build the platform data object
      const platformData: PlatformData = {
        platformId: 'instagram',
        username: profile.username,
        profileData: {
          displayName: profile.username,
          bio: profile.biography || '',
          followerCount: Number(profile.followers_count || 0),
          followingCount: Number(profile.follows_count || 0),
          joinDate: '', // Not available in Basic Display API
          profileUrl: `https://instagram.com/${profile.username}`,
          avatarUrl: profile.profile_picture_url || `https://ui-avatars.com/api/?name=${profile.username}&background=C13584&color=fff`,
          location: undefined, // Not available in Basic Display API
          verified: false // Not available in Basic Display API
        },
        activityData: {
          totalPosts: Number(profile.media_count || 0),
          totalComments: 0, // Not easily available
          totalLikes: 0, // Not easily available
          totalShares: 0, // Not available for Instagram
          postsPerDay: 0, // Would need to calculate from media timestamps
          mostActiveTime: "Unknown", // Would need to analyze posting patterns
          lastActive: mediaItems.length > 0 ? mediaItems[0].timestamp : new Date().toISOString(),
          topHashtags: hashtags.slice(0, 5) // Now it's just strings
        },
        contentData: mediaItems.slice(0, 10).map((item: any) => ({
          type: "post", // Map all Instagram content to "post" type since we don't have comments, likes, shares
          content: item.caption || '',
          timestamp: item.timestamp,
          url: item.permalink,
          engagement: {
            likes: 0, // Not available in Basic Display API
            comments: 0, // Not available in Basic Display API
            shares: 0, // Not available for Instagram
          },
          sentiment: "neutral", // Would need sentiment analysis
          topics: this.extractHashtags(item.caption || '').map(h => h.tag)
        })),
        privacyMetrics: {
          exposureScore: this.calculateExposureScore(
            Number(profile.followers_count || 0), 
            Number(profile.media_count || 0)
          ),
          dataCategories: [
            { category: "Profile Information", severity: profile.biography ? "medium" : "low" },
            { category: "Content", severity: mediaItems.length > 0 ? "medium" : "low" }
          ],
          potentialConcerns: this.generatePrivacyConcerns(profile, mediaItems),
          recommendedActions: this.generateRecommendedActions(profile, mediaItems)
        },
        analysisResults: {
          exposureScore: this.calculateExposureScore(
            Number(profile.followers_count || 0), 
            Number(profile.media_count || 0)
          ),
          topTopics: this.generateTopTopics(mediaItems),
          activityTimeline: this.generateActivityTimeline(mediaItems),
          sentimentBreakdown: {
            positive: 0.33, // Would need sentiment analysis
            neutral: 0.34, // Would need sentiment analysis
            negative: 0.33 // Would need sentiment analysis
          },
          dataCategories: [
            { category: "Profile Information", severity: profile.biography ? "medium" : "low" },
            { category: "Photos", severity: photoCount > 0 ? "medium" : "low" },
            { category: "Videos", severity: videoCount > 0 ? "medium" : "low" }
          ],
          privacyConcerns: this.generatePrivacyConcerns(profile, mediaItems)
                           .map(c => ({ 
                             type: c.issue, 
                             severity: c.risk as "low" | "medium" | "high",
                             description: `${c.issue} may expose personal information.`
                           })),
          recommendedActions: this.generateRecommendedActions(profile, mediaItems),
          platformSpecificMetrics: {
            contentBreakdown: {
              photos: photoCount,
              videos: videoCount,
              stories: 0, // Not available in Basic Display API
              reels: 0 // Not tracked separately in Basic Display API
            },
            locationCheckIns: this.extractLocations(mediaItems),
            engagementRate: 0, // Would need likes/comments data
            hashtagAnalysis: hashtagObjects.slice(0, 10).map(h => ({ 
              tag: h.tag,
              count: h.count,
              category: this.categorizeHashtag(h.tag)
            }))
          }
        }
      };
      
      return platformData;
    } catch (error: any) {
      log(`Error transforming Basic Display API data: ${error.message}`, 'instagram-api');
      throw error;
    }
  }
  
  /**
   * Transform Graph API data to our standard platform data format
   * @param data Data from the Graph API
   * @param username Username for reference
   * @returns Standardized platform data
   */
  private transformGraphApiData(data: any, username: string): PlatformData {
    try {
      // Extract hashtags from all captions
      const allCaptions = data.media?.data?.map((item: any) => item.caption || '').filter(Boolean) || [];
      const hashtagObjects = this.extractHashtags(allCaptions.join(' '));
      
      // Count media types (limited information in Graph API)
      const mediaItems = data.media?.data || [];
      let photoCount = 0;
      let videoCount = 0;
      
      // In Graph API we don't have explicit media_type, but we can guess from media_url
      for (const item of mediaItems) {
        if (item.media_url) {
          const urlLower = item.media_url.toLowerCase();
          if (urlLower.endsWith('.mp4') || urlLower.endsWith('.mov')) {
            videoCount++;
          } else {
            photoCount++;
          }
        } else {
          // Default to photo if we can't determine
          photoCount++;
        }
      }
      
      // Build the platform data object
      const platformData: PlatformData = {
        platformId: 'instagram',
        username: data.username,
        profileData: {
          displayName: data.name || data.username,
          bio: data.biography || '',
          followerCount: Number(data.followers_count || 0),
          followingCount: Number(data.follows_count || 0),
          joinDate: '', // Not available in Graph API
          profileUrl: `https://instagram.com/${data.username}`,
          avatarUrl: data.profile_picture_url || `https://ui-avatars.com/api/?name=${data.username}&background=C13584&color=fff`,
          location: undefined, // Not available in Graph API
          verified: false // Not available in Graph API
        },
        activityData: {
          totalPosts: Number(data.media_count || 0),
          totalComments: mediaItems.reduce((sum: number, item: any) => sum + Number(item.comments_count || 0), 0),
          totalLikes: mediaItems.reduce((sum: number, item: any) => sum + Number(item.like_count || 0), 0),
          totalShares: 0, // Not available for Instagram
          postsPerDay: 0, // Would need to calculate from media timestamps
          mostActiveTime: "Unknown", // Would need to analyze posting patterns
          lastActive: mediaItems.length > 0 ? mediaItems[0].timestamp : new Date().toISOString(),
          topHashtags: hashtagObjects.slice(0, 5).map(h => h.tag)
        },
        contentData: mediaItems.slice(0, 10).map((item: any) => ({
          type: "post", // Map all Instagram content to "post" type since we don't have comments, likes, shares
          content: item.caption || '',
          timestamp: item.timestamp,
          url: item.permalink,
          engagement: {
            likes: Number(item.like_count || 0),
            comments: Number(item.comments_count || 0),
            shares: 0, // Not available for Instagram
          },
          sentiment: "neutral", // Would need sentiment analysis
          topics: this.extractHashtags(item.caption || '').map(h => h.tag)
        })),
        privacyMetrics: {
          exposureScore: this.calculateExposureScore(
            Number(data.followers_count || 0), 
            Number(data.media_count || 0)
          ),
          dataCategories: [
            { category: "Profile Information", severity: data.biography ? "medium" : "low" },
            { category: "Content", severity: mediaItems.length > 0 ? "medium" : "low" }
          ],
          potentialConcerns: this.generatePrivacyConcerns(data, mediaItems),
          recommendedActions: this.generateRecommendedActions(data, mediaItems)
        },
        analysisResults: {
          exposureScore: this.calculateExposureScore(
            Number(data.followers_count || 0), 
            Number(data.media_count || 0)
          ),
          topTopics: this.generateTopTopics(mediaItems),
          activityTimeline: this.generateActivityTimeline(mediaItems),
          sentimentBreakdown: {
            positive: 0.33, // Would need sentiment analysis
            neutral: 0.34, // Would need sentiment analysis 
            negative: 0.33 // Would need sentiment analysis
          },
          dataCategories: [
            { category: "Profile Information", severity: data.biography ? "medium" : "low" },
            { category: "Photos", severity: photoCount > 0 ? "medium" : "low" },
            { category: "Videos", severity: videoCount > 0 ? "medium" : "low" }
          ],
          privacyConcerns: this.generatePrivacyConcerns(data, mediaItems)
                           .map(c => ({ 
                             type: c.issue, 
                             severity: c.risk as "low" | "medium" | "high",
                             description: `${c.issue} may expose personal information.`
                           })),
          recommendedActions: this.generateRecommendedActions(data, mediaItems),
          platformSpecificMetrics: {
            contentBreakdown: {
              photos: photoCount,
              videos: videoCount,
              stories: 0, // Not available in Graph API
              reels: 0 // Not tracked separately in Graph API
            },
            locationCheckIns: this.extractLocations(mediaItems),
            engagementRate: this.calculateEngagementRate(
              mediaItems,
              Number(data.followers_count || 0)
            ),
            hashtagAnalysis: hashtagObjects.slice(0, 10).map(h => ({ 
              tag: h.tag,
              count: h.count,
              category: this.categorizeHashtag(h.tag)
            }))
          }
        }
      };
      
      return platformData;
    } catch (error: any) {
      log(`Error transforming Graph API data: ${error.message}`, 'instagram-api');
      throw error;
    }
  }
  
  /**
   * Transform public API data to our standard platform data format
   * @param user User data from the public API
   * @param username Username for reference
   * @returns Standardized platform data
   */
  private transformPublicData(user: any, username: string): PlatformData {
    try {
      // Handle different formats of Instagram public API response
      // Extract media data based on where it might be in the API response
      let mediaEdges: any[] = [];
      
      if (user.edge_owner_to_timeline_media?.edges) {
        mediaEdges = user.edge_owner_to_timeline_media.edges;
      } else if (user.edge_felix_video_timeline?.edges) {
        // This is for IGTV/Reels
        mediaEdges = user.edge_felix_video_timeline.edges;
      }
      
      // Extract hashtags from all captions
      const allCaptions = mediaEdges.map(edge => 
        edge.node.edge_media_to_caption?.edges?.[0]?.node.text || ''
      ).filter(Boolean);
      
      const hashtagObjects = this.extractHashtags(allCaptions.join(' '));
      
      // Count media types
      let photoCount = 0;
      let videoCount = 0;
      let reelsCount = 0;
      
      for (const edge of mediaEdges) {
        const node = edge.node;
        if (node.is_video) {
          if (node.product_type === 'reels') {
            reelsCount++;
          } else {
            videoCount++;
          }
        } else {
          photoCount++;
        }
      }
      
      // Transform to our standard format
      const platformData: PlatformData = {
        platformId: 'instagram',
        username: user.username || username,
        profileData: {
          displayName: user.full_name || user.username || username,
          bio: user.biography || '',
          followerCount: Number(user.edge_followed_by?.count || 0),
          followingCount: Number(user.edge_follow?.count || 0),
          joinDate: '', // Not available in public API
          profileUrl: `https://instagram.com/${user.username || username}`,
          avatarUrl: user.profile_pic_url || `https://ui-avatars.com/api/?name=${username}&background=C13584&color=fff`,
          location: undefined, // Not consistently available
          verified: !!user.is_verified
        },
        activityData: {
          totalPosts: Number(user.edge_owner_to_timeline_media?.count || 0),
          totalComments: 0, // Would need to compute from each post
          totalLikes: 0, // Would need to compute from each post
          totalShares: 0, // Not available for Instagram
          postsPerDay: 0, // Would need more historical data
          mostActiveTime: "Unknown", // Would need more historical data
          lastActive: mediaEdges.length > 0 ? 
            new Date(mediaEdges[0].node.taken_at_timestamp * 1000).toISOString() : 
            new Date().toISOString(),
          topHashtags: hashtagObjects.slice(0, 5).map(h => h.tag)
        },
        contentData: mediaEdges.slice(0, 10).map(edge => {
          const node = edge.node;
          const caption = node.edge_media_to_caption?.edges?.[0]?.node.text || '';
          return {
            type: "post", // Map all Instagram content to "post" type since we don't have comments, likes, shares
            content: caption,
            timestamp: new Date(node.taken_at_timestamp * 1000).toISOString(),
            url: `https://www.instagram.com/p/${node.shortcode}/`,
            engagement: {
              likes: Number(node.edge_media_preview_like?.count || 0),
              comments: Number(node.edge_media_to_comment?.count || 0),
              shares: 0, // Not available
            },
            sentiment: "neutral", // Would need sentiment analysis
            topics: this.extractHashtags(caption).map(h => h.tag)
          };
        }),
        privacyMetrics: {
          exposureScore: this.calculateExposureScore(
            Number(user.edge_followed_by?.count || 0),
            Number(user.edge_owner_to_timeline_media?.count || 0)
          ),
          dataCategories: [
            { category: "Profile Information", severity: user.biography ? "medium" : "low" },
            { category: "Content", severity: mediaEdges.length > 0 ? "medium" : "low" }
          ],
          potentialConcerns: this.generatePrivacyConcerns(user, mediaEdges),
          recommendedActions: this.generateRecommendedActions(user, mediaEdges)
        },
        analysisResults: {
          exposureScore: this.calculateExposureScore(
            Number(user.edge_followed_by?.count || 0),
            Number(user.edge_owner_to_timeline_media?.count || 0)
          ),
          topTopics: this.generateTopTopics(mediaEdges),
          activityTimeline: this.generateActivityTimeline(mediaEdges),
          sentimentBreakdown: {
            positive: 0.33, // Would need sentiment analysis
            neutral: 0.34, // Would need sentiment analysis
            negative: 0.33 // Would need sentiment analysis
          },
          dataCategories: [
            { category: "Profile Information", severity: user.biography ? "medium" : "low" },
            { category: "Photos", severity: photoCount > 0 ? "medium" : "low" },
            { category: "Videos", severity: videoCount > 0 ? "medium" : "low" },
            { category: "Reels", severity: reelsCount > 0 ? "medium" : "low" }
          ],
          privacyConcerns: this.generatePrivacyConcerns(user, mediaEdges)
                           .map(c => ({ 
                             type: c.issue, 
                             severity: c.risk as "low" | "medium" | "high",
                             description: `${c.issue} may expose personal information.`
                           })),
          recommendedActions: this.generateRecommendedActions(user, mediaEdges),
          platformSpecificMetrics: {
            contentBreakdown: {
              photos: photoCount,
              videos: videoCount,
              stories: 0, // Not available in public API
              reels: reelsCount
            },
            locationCheckIns: this.extractLocationsFromPublicApi(mediaEdges),
            engagementRate: this.calculateEngagementRateFromPublicApi(
              mediaEdges,
              Number(user.edge_followed_by?.count || 0)
            ),
            hashtagAnalysis: hashtagObjects.slice(0, 10).map(h => ({ 
              tag: h.tag,
              count: h.count,
              category: this.categorizeHashtag(h.tag)
            }))
          }
        }
      };
      
      return platformData;
    } catch (error: any) {
      log(`Error transforming public API data: ${error.message}`, 'instagram-api');
      throw error;
    }
  }
  
  /**
   * Extract hashtags from a text string
   * @param text Text to extract hashtags from
   * @returns Array of hashtags with frequency counts
   */
  private extractHashtags(text: string): Array<{tag: string, count: number}> {
    if (!text) return [];
    
    // Match hashtags: # followed by word characters (0-9, a-z, A-Z, _)
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex) || [];
    
    // Count frequency of each hashtag
    const tagFrequency = new Map<string, number>();
    for (const match of matches) {
      const tag = match.toLowerCase();
      tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
    }
    
    // Convert to array and sort by frequency
    return Array.from(tagFrequency.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }
  
  /**
   * Extract mentions from a text string
   * @param text Text to extract mentions from
   * @returns Array of usernames mentioned
   */
  private extractMentions(text: string): string[] {
    if (!text) return [];
    
    // Match mentions: @ followed by word characters (0-9, a-z, A-Z, _)
    // but not including emails (which have @ followed by domain)
    const mentionRegex = /@(\w+)(?![.\w])/g;
    const matches = text.match(mentionRegex) || [];
    
    // Get unique mentions without the @ symbol using Array.from for better compatibility
    return Array.from(new Set(matches))
      .map(match => match.substring(1));
  }
  
  /**
   * Extract location data from media items
   * @param mediaItems Array of media items
   * @returns Array of location data
   */
  private extractLocations(mediaItems: any[]): Array<{name: string, count: number}> {
    if (!mediaItems?.length) return [];
    
    // Count frequency of each location
    const locationFrequency = new Map<string, number>();
    
    for (const item of mediaItems) {
      if (item.location?.name) {
        const locationName = item.location.name;
        locationFrequency.set(locationName, (locationFrequency.get(locationName) || 0) + 1);
      }
    }
    
    // Convert to array and sort by frequency
    return Array.from(locationFrequency.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }
  
  /**
   * Extract location data from public API media edges
   * @param mediaEdges Array of media edges from public API
   * @returns Array of location data
   */
  private extractLocationsFromPublicApi(mediaEdges: any[]): Array<{name: string, count: number}> {
    if (!mediaEdges?.length) return [];
    
    // Count frequency of each location
    const locationFrequency = new Map<string, number>();
    
    for (const edge of mediaEdges) {
      const node = edge.node;
      if (node.location?.name) {
        const locationName = node.location.name;
        locationFrequency.set(locationName, (locationFrequency.get(locationName) || 0) + 1);
      }
    }
    
    // Convert to array and sort by frequency
    return Array.from(locationFrequency.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }
  
  /**
   * Calculate engagement rate from media items
   * Engagement rate = (likes + comments) / followers * 100
   * @param mediaItems Array of media items
   * @param followerCount Number of followers
   * @returns Engagement rate as a percentage
   */
  private calculateEngagementRate(mediaItems: any[], followerCount: number): number {
    if (!mediaItems?.length || !followerCount) return 0;
    
    let totalLikes = 0;
    let totalComments = 0;
    
    // Use the most recent 10 posts for engagement calculation
    const recentItems = mediaItems.slice(0, 10);
    
    for (const item of recentItems) {
      totalLikes += Number(item.like_count || 0);
      totalComments += Number(item.comments_count || 0);
    }
    
    const totalEngagements = totalLikes + totalComments;
    const avgEngagementPerPost = totalEngagements / recentItems.length;
    const engagementRate = (avgEngagementPerPost / followerCount) * 100;
    
    return parseFloat(engagementRate.toFixed(2));
  }
  
  /**
   * Calculate engagement rate from public API media edges
   * @param mediaEdges Array of media edges from public API
   * @param followerCount Number of followers
   * @returns Engagement rate as a percentage
   */
  private calculateEngagementRateFromPublicApi(mediaEdges: any[], followerCount: number): number {
    if (!mediaEdges?.length || !followerCount) return 0;
    
    let totalLikes = 0;
    let totalComments = 0;
    
    // Use the most recent 10 posts for engagement calculation
    const recentEdges = mediaEdges.slice(0, 10);
    
    for (const edge of recentEdges) {
      const node = edge.node;
      totalLikes += Number(node.edge_media_preview_like?.count || 0);
      totalComments += Number(node.edge_media_to_comment?.count || 0);
    }
    
    const totalEngagements = totalLikes + totalComments;
    const avgEngagementPerPost = totalEngagements / recentEdges.length;
    const engagementRate = (avgEngagementPerPost / followerCount) * 100;
    
    return parseFloat(engagementRate.toFixed(2));
  }
  
  /**
   * Calculate exposure score based on followers and content quantity
   * @param followerCount Number of followers
   * @param postsCount Number of posts
   * @returns Exposure score (0-100)
   */
  private calculateExposureScore(followerCount: number, postsCount: number): number {
    if (!followerCount && !postsCount) return 0;
    
    // Follower score: 0-60 points
    let followerScore = 0;
    if (followerCount < 100) followerScore = 5;
    else if (followerCount < 1000) followerScore = 20;
    else if (followerCount < 10000) followerScore = 30;
    else if (followerCount < 100000) followerScore = 40;
    else if (followerCount < 1000000) followerScore = 50;
    else followerScore = 60;
    
    // Content score: 0-40 points
    let contentScore = 0;
    if (postsCount < 5) contentScore = 5;
    else if (postsCount < 20) contentScore = 15;
    else if (postsCount < 50) contentScore = 25;
    else if (postsCount < 100) contentScore = 30;
    else contentScore = 40;
    
    return followerScore + contentScore;
  }
  
  /**
   * Generate potential privacy concerns based on profile data
   * @param profile Profile data
   * @param mediaItems Media items
   * @returns Array of potential concerns
   */
  private generatePrivacyConcerns(profile: any, mediaItems: any[]): Array<{issue: string, risk: "low" | "medium" | "high"}> {
    const concerns: Array<{issue: string, risk: "low" | "medium" | "high"}> = [];
    
    // Check follower count
    const followerCount = Number(profile.followers_count || 
                               profile.edge_followed_by?.count || 0);
    
    if (followerCount > 10000) {
      concerns.push({
        issue: "High follower count",
        risk: "medium"
      });
    }
    
    // Check for public contact info
    if (profile.biography && 
        (profile.biography.includes('@') || 
         profile.biography.includes('email') ||
         profile.biography.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/))) {
      concerns.push({
        issue: "Contact information in bio",
        risk: "high"
      });
    }
    
    // Check for location data
    if (mediaItems?.length) {
      // Count posts with location data
      let postsWithLocation = 0;
      
      for (const item of mediaItems) {
        // Different API formats have location in different places
        if (item.location?.name || 
            (item.node && item.node.location?.name)) {
          postsWithLocation++;
        }
      }
      
      if (postsWithLocation > 0) {
        const riskLevel = postsWithLocation > 5 ? "high" : "medium";
        concerns.push({
          issue: "Location data in posts",
          risk: riskLevel
        });
      }
    }
    
    // Check profile verification
    if (profile.is_verified !== true) {
      concerns.push({
        issue: "Unverified account",
        risk: "low"
      });
    }
    
    return concerns;
  }
  
  /**
   * Generate recommended actions based on profile data
   * @param profile Profile data
   * @param mediaItems Media items
   * @returns Array of recommended actions
   */
  private generateRecommendedActions(profile: any, mediaItems: any[]): string[] {
    const actions: string[] = [];
    
    // Check follower count
    const followerCount = Number(profile.followers_count || 
                               profile.edge_followed_by?.count || 0);
    
    if (followerCount > 10000) {
      actions.push("Consider setting your account to private if you share personal content");
    }
    
    // Check for public contact info
    if (profile.biography && 
        (profile.biography.includes('@') || 
         profile.biography.includes('email') ||
         profile.biography.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/))) {
      actions.push("Remove contact information from your bio to prevent spam and harassment");
    }
    
    // Check for location data
    if (mediaItems?.length) {
      // Count posts with location data
      let postsWithLocation = 0;
      
      for (const item of mediaItems) {
        // Different API formats have location in different places
        if (item.location?.name || 
            (item.node && item.node.location?.name)) {
          postsWithLocation++;
        }
      }
      
      if (postsWithLocation > 0) {
        actions.push("Review posts with location data and consider removing exact locations");
      }
    }
    
    // Check profile verification
    if (profile.is_verified !== true && followerCount > 1000) {
      actions.push("Consider applying for account verification to prevent impersonation");
    }
    
    // If no specific recommendations, add a general one
    if (actions.length === 0) {
      actions.push("Review your privacy settings and consider setting your account to private");
    }
    
    return actions;
  }
  
  /**
   * Generate top topics based on media items
   * @param mediaItems Media items to analyze
   * @returns Array of top topics
   */
  private generateTopTopics(mediaItems: any[]): Array<{topic: string, percentage: number}> {
    if (!mediaItems?.length) {
      return [{ topic: "Unknown", percentage: 1.0 }];
    }
    
    // Simplified topic extraction using hashtags
    const allCaptions: string[] = [];
    
    // Handle different API formats
    for (const item of mediaItems) {
      if (item.caption) {
        allCaptions.push(item.caption);
      } else if (item.node?.edge_media_to_caption?.edges?.[0]?.node.text) {
        allCaptions.push(item.node.edge_media_to_caption.edges[0].node.text);
      }
    }
    
    const hashtagObjects = this.extractHashtags(allCaptions.join(' '));
    
    if (!hashtagObjects.length) {
      return [{ topic: "Personal", percentage: 1.0 }];
    }
    
    // Group hashtags into topics
    const topicMap: Record<string, number> = {
      "Travel": 0,
      "Fashion": 0,
      "Food": 0,
      "Fitness": 0,
      "Technology": 0,
      "Business": 0,
      "Art": 0,
      "Music": 0,
      "Personal": 0
    };
    
    const travelKeywords = ['travel', 'vacation', 'trip', 'adventure', 'explore', 'wanderlust', 'world'];
    const fashionKeywords = ['fashion', 'style', 'outfit', 'streetstyle', 'model', 'beauty'];
    const foodKeywords = ['food', 'foodie', 'foodporn', 'cook', 'restaurant', 'recipe', 'yummy'];
    const fitnessKeywords = ['fitness', 'gym', 'workout', 'health', 'fit', 'training', 'sport'];
    const techKeywords = ['tech', 'technology', 'coding', 'programming', 'developer', 'software'];
    const businessKeywords = ['business', 'entrepreneur', 'startup', 'success', 'marketing'];
    const artKeywords = ['art', 'artist', 'creative', 'design', 'photographer', 'photo', 'crafts'];
    const musicKeywords = ['music', 'musician', 'band', 'concert', 'song', 'singer', 'dj'];
    
    for (const { tag } of hashtagObjects) {
      const lowerTag = tag.toLowerCase();
      
      if (travelKeywords.some(keyword => lowerTag.includes(keyword))) {
        topicMap.Travel++;
      } else if (fashionKeywords.some(keyword => lowerTag.includes(keyword))) {
        topicMap.Fashion++;
      } else if (foodKeywords.some(keyword => lowerTag.includes(keyword))) {
        topicMap.Food++;
      } else if (fitnessKeywords.some(keyword => lowerTag.includes(keyword))) {
        topicMap.Fitness++;
      } else if (techKeywords.some(keyword => lowerTag.includes(keyword))) {
        topicMap.Technology++;
      } else if (businessKeywords.some(keyword => lowerTag.includes(keyword))) {
        topicMap.Business++;
      } else if (artKeywords.some(keyword => lowerTag.includes(keyword))) {
        topicMap.Art++;
      } else if (musicKeywords.some(keyword => lowerTag.includes(keyword))) {
        topicMap.Music++;
      } else {
        topicMap.Personal++;
      }
    }
    
    // Convert to percentage and sort
    const totalCount = Object.values(topicMap).reduce((sum, count) => sum + count, 0) || 1;
    
    return Object.entries(topicMap)
      .map(([topic, count]) => ({
        topic,
        percentage: parseFloat((count / totalCount).toFixed(2))
      }))
      .filter(item => item.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage);
  }
  
  /**
   * Generate activity timeline based on media items
   * @param mediaItems Media items to analyze
   * @returns Array of activity timeline points
   */
  private generateActivityTimeline(mediaItems: any[]): Array<{period: string, count: number}> {
    if (!mediaItems?.length) {
      return [];
    }
    
    // Group posts by month
    const monthCounts = new Map<string, number>();
    
    // Handle different API formats
    for (const item of mediaItems) {
      let timestamp: string | number | undefined;
      
      if (item.timestamp) {
        timestamp = item.timestamp;
      } else if (item.node?.taken_at_timestamp) {
        timestamp = item.node.taken_at_timestamp * 1000; // Convert from seconds to ms
      }
      
      if (timestamp) {
        const date = new Date(timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
      }
    }
    
    // Convert to array and sort by date
    return Array.from(monthCounts.entries())
      .map(([date, count]) => ({ period: date, count }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }
  
  /**
   * Categorize a hashtag into a general topic
   * @param hashtag Hashtag text (without #)
   * @returns Category name
   */
  private categorizeHashtag(hashtag: string): string {
    const tag = hashtag.replace(/^#/, '').toLowerCase();
    
    const categories = [
      { name: "Travel", keywords: ['travel', 'vacation', 'trip', 'adventure', 'explore', 'wanderlust'] },
      { name: "Fashion", keywords: ['fashion', 'style', 'outfit', 'ootd', 'streetstyle', 'model'] },
      { name: "Food", keywords: ['food', 'foodie', 'foodporn', 'cook', 'restaurant', 'recipe'] },
      { name: "Fitness", keywords: ['fitness', 'gym', 'workout', 'health', 'fit', 'training'] },
      { name: "Technology", keywords: ['tech', 'technology', 'coding', 'programming', 'developer'] },
      { name: "Business", keywords: ['business', 'entrepreneur', 'startup', 'success', 'marketing'] },
      { name: "Art", keywords: ['art', 'artist', 'creative', 'design', 'photography', 'photo'] },
      { name: "Music", keywords: ['music', 'musician', 'band', 'concert', 'song', 'singer'] },
      { name: "Sports", keywords: ['sports', 'football', 'soccer', 'basketball', 'baseball'] },
      { name: "Beauty", keywords: ['beauty', 'makeup', 'skincare', 'cosmetics', 'beauty'] },
      { name: "Family", keywords: ['family', 'kids', 'baby', 'children', 'parents'] },
      { name: "Nature", keywords: ['nature', 'outdoors', 'wildlife', 'mountains', 'beach'] }
    ];
    
    for (const category of categories) {
      if (category.keywords.some(keyword => tag.includes(keyword))) {
        return category.name;
      }
    }
    
    return "Personal";
  }
  
  /**
   * Wait for a specified amount of time
   * Used for implementing exponential backoff
   * @param ms Time to wait in milliseconds
   * @returns Promise that resolves after the wait
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Implement exponential backoff for rate limiting
   * @param fn Function to retry
   * @param maxRetries Maximum number of retries
   * @param baseDelay Base delay in milliseconds
   * @returns Result of the function or throws an error
   */
  private async withExponentialBackoff<T>(
    fn: () => Promise<T>, 
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let retries = 0;
    
    while (true) {
      try {
        return await fn();
      } catch (error: any) {
        // If we're rate limited or got a server error, retry with backoff
        if ((error.response?.status === 429 || error.response?.status >= 500) && 
            retries < maxRetries) {
          
          retries++;
          const delay = baseDelay * Math.pow(2, retries) + Math.random() * 1000;
          
          log(`Rate limited or server error. Retrying in ${Math.round(delay / 1000)} seconds... (Attempt ${retries}/${maxRetries})`, 'instagram-api');
          
          await this.delay(delay);
          continue;
        }
        
        throw error;
      }
    }
  }
}

// Create singleton instance
export const instagramApi = new InstagramApiService();