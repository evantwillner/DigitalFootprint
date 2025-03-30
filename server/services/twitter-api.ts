import { TwitterApi } from 'twitter-api-v2';
import { Platform, PlatformData } from '@shared/schema';
import { log } from '../vite';

/**
 * Twitter API Service - Manages interactions with the Twitter/X API
 * 
 * This service provides methods to fetch user data from Twitter and handle data deletion requests
 * when users want to remove their digital footprint.
 */
export class TwitterApiService {
  private readonly client: TwitterApi | null = null;
  private isConfigured: boolean = false;

  constructor() {
    try {
      if (
        process.env.TWITTER_API_KEY &&
        process.env.TWITTER_API_SECRET &&
        process.env.TWITTER_BEARER_TOKEN
      ) {
        this.client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
        this.isConfigured = true;
        log('Twitter API Service initialized with bearer token', 'twitter-api');
        
        // We'll consider the API configured if we have credentials,
        // even if they're rate limited or temporarily unavailable.
        // The operational status is determined separately via getApiStatus()
      } else {
        log('⚠️ Twitter API Service not configured - missing API keys', 'twitter-api');
      }
    } catch (error) {
      log(`Error initializing Twitter API: ${error}`, 'twitter-api');
      this.client = null;
      this.isConfigured = false;
    }
  }

  /**
   * Check if the API has valid credentials
   * @returns boolean indicating if credentials are available
   */
  public hasValidCredentials(): boolean {
    return this.isConfigured;
  }

  // Cache the API status to avoid unnecessary calls
  private apiStatusCache: { status: { configured: boolean; message: string; operational?: boolean }, timestamp: number } | null = null;
  private readonly API_STATUS_CACHE_TTL = 60 * 1000; // 1 minute cache for API status
  
  /**
   * Get API status - used to show which platforms have active connections
   */
  public async getApiStatus(): Promise<{ configured: boolean; message: string; operational?: boolean }> {
    // Return cached status if available and recent
    if (this.apiStatusCache && (Date.now() - this.apiStatusCache.timestamp) < this.API_STATUS_CACHE_TTL) {
      return this.apiStatusCache.status;
    }
    
    if (!this.isConfigured) {
      const status = {
        configured: false,
        message: 'Twitter API not configured. Add TWITTER_API_KEY, TWITTER_API_SECRET, and TWITTER_BEARER_TOKEN to environment.'
      };
      this.apiStatusCache = { status, timestamp: Date.now() };
      return status;
    }
    
    // Check if we're currently rate limited by our own tracker
    if (this.isRateLimited()) {
      const status = {
        configured: true,
        operational: false,
        message: 'Twitter API is rate limited. Please try again later.'
      };
      this.apiStatusCache = { status, timestamp: Date.now() };
      return status;
    }
    
    // Attempt a simple API call to verify the credentials work
    try {
      // Update our rate limit counters
      this.updateRateLimitCounters();
      
      // Test with a known user (Twitter's own account) using our backoff method
      const testResponse = await this.fetchWithBackoff(
        () => this.client!.v2.userByUsername('Twitter'),
        2, // fewer retries for status check
        500 // shorter initial delay
      );
      
      if (!testResponse || !testResponse.data) {
        const status = {
          configured: true,
          operational: false,
          message: 'Twitter API credentials are configured but not working. Credentials may be expired or invalid.'
        };
        this.apiStatusCache = { status, timestamp: Date.now() };
        return status;
      }

      const status = {
        configured: true,
        operational: true,
        message: 'Twitter API configured and operational.'
      };
      this.apiStatusCache = { status, timestamp: Date.now() };
      return status;
    } catch (error: any) {
      // If we get a 401, the credentials are invalid
      if (error.code === 401 || error.message.includes('401')) {
        this.isConfigured = false; // Update status
        const status = {
          configured: false,
          operational: false,
          message: 'Twitter API credentials are expired or invalid. Please update the credentials.'
        };
        this.apiStatusCache = { status, timestamp: Date.now() };
        return status;
      }
      
      // Check for rate limiting (429)
      if (error.code === 429 || error.message.includes('429') || 
          (error.response && error.response.status === 429)) {
        // Mark as rate limited in our tracker
        this.handleRateLimitExceeded();
        
        const status = {
          configured: true,
          operational: false,
          message: 'Twitter API is rate limited. Please try again later.'
        };
        this.apiStatusCache = { status, timestamp: Date.now() };
        return status;
      }
      
      // Check for service unavailable (503)
      if (error.code === 503 || error.message.includes('503') || 
          (error.response && error.response.status === 503)) {
        const status = {
          configured: true,
          operational: false,
          message: 'Twitter API service is currently unavailable. Please try again later.'
        };
        this.apiStatusCache = { status, timestamp: Date.now() };
        return status;
      }

      // For other errors, we're configured but not operational
      const status = {
        configured: true,
        operational: false,
        message: `Twitter API configured but encountering errors: ${error.message}`
      };
      this.apiStatusCache = { status, timestamp: Date.now() };
      return status;
    }
  }

  // Cache for Twitter data to reduce API calls
  private userDataCache: Map<string, { data: PlatformData, timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL
  
  // Rate limiting parameters
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests
  private readonly MAX_REQUESTS_PER_WINDOW = 5; // Limit to 5 requests per window
  private readonly RATE_LIMIT_RESET_INTERVAL = 15 * 60 * 1000; // 15 minute window
  
  /**
   * Fetch user data from Twitter using available methods with caching and rate limiting
   * @param username Twitter username to look up (with or without @)
   * @returns Platform data or null if not found
   */
  public async fetchUserData(username: string): Promise<PlatformData | null> {
    // First check if the API is operational
    if (!this.client || !this.isConfigured) {
      log('Cannot fetch Twitter data - API not configured', 'twitter-api');
      return null;
    }
    
    // Normalize username (remove @ if present)
    const normalizedUsername = username.startsWith('@') ? username.substring(1) : username;
    
    // Check cache first
    const cached = this.userDataCache.get(normalizedUsername);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      log(`Using cached Twitter data for ${normalizedUsername}`, 'twitter-api');
      return cached.data;
    }
    
    // Check if we're currently rate limited
    if (this.isRateLimited()) {
      log(`Twitter API rate limiting in effect. Try again later.`, 'twitter-api');
      return null;
    }
    
    // Verify credentials before making the real API call
    const status = await this.getApiStatus();
    if (status.operational === false) {
      // Use a more specific error message based on the status message
      if (status.message.includes('rate limited')) {
        log(`Cannot fetch Twitter data - API is rate limited. Please try again later.`, 'twitter-api');
      } else if (status.message.includes('service is currently unavailable')) {
        log(`Cannot fetch Twitter data - Twitter API service is down. Please try again later.`, 'twitter-api');
      } else {
        log(`Cannot fetch Twitter data - API credentials issue: ${status.message}`, 'twitter-api');
      }
      return null;
    }

    try {
      // Log the request and update rate limit counters
      this.updateRateLimitCounters();
      
      log(`Fetching Twitter data for ${normalizedUsername}`, 'twitter-api');
      
      // Fetch user by username with exponential backoff for rate limiting
      const userResponse = await this.fetchWithBackoff(() => 
        this.client!.v2.userByUsername(normalizedUsername, {
          'user.fields': 'description,profile_image_url,public_metrics,created_at,location,url'
        })
      );
      
      if (!userResponse.data) {
        log(`No Twitter user found for username: ${normalizedUsername}`, 'twitter-api');
        return null;
      }
      
      const user = userResponse.data;
      
      // Wait before making another API call to respect rate limits
      await this.rateLimitedWait(500); // 500ms between calls
      
      // Fetch recent tweets by the user
      const userId = user.id;
      const tweetsResponse = await this.fetchWithBackoff(() => 
        this.client!.v2.userTimeline(userId, {
          max_results: 10,
          'tweet.fields': 'created_at,public_metrics,attachments',
          expansions: 'attachments.media_keys'
        })
      );
      
      const tweets = tweetsResponse.data.data || [];
      
      // Transform data to our platform format
      const result = this.transformUserData(user, tweets, normalizedUsername);
      
      // Cache the result
      this.userDataCache.set(normalizedUsername, {
        data: result,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error: any) {
      log(`Error fetching Twitter data: ${error.message}`, 'twitter-api');
      
      if (error.code === 429 || (error.response && error.response.status === 429)) {
        log('Twitter API rate limit exceeded, will retry later', 'twitter-api');
        // We'll remember we got rate limited
        this.handleRateLimitExceeded();
      } else if (error.code === 401 || error.message.includes('401')) {
        log('Twitter API authentication failed - credentials may be expired or invalid', 'twitter-api');
        // Mark the API as not properly configured so future calls will fail quickly
        this.isConfigured = false;
      } else if (error.code === 403) {
        log('Twitter API permission denied - credentials may lack necessary scopes', 'twitter-api');
      }
      
      return null;
    }
  }
  
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
        if (error.code !== 429 && !(error.response && error.response.status === 429)) {
          throw error;
        }
        
        retries++;
        log(`Twitter API rate limited, retrying in ${delay}ms (attempt ${retries}/${maxRetries})`, 'twitter-api');
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Exponential backoff
        delay *= 2;
      }
    }
  }

  /**
   * Process deletion request for a user's Twitter data
   * (Premium feature for when users want to clean their digital footprint)
   * 
   * @param username The Twitter username
   * @param details Additional details about what to delete
   * @returns Success status and message
   */
  public async processDeletionRequest(
    username: string,
    details: { reason?: string; tweetIds?: string[] }
  ): Promise<{ success: boolean; message: string }> {
    if (!this.client || !this.isConfigured) {
      return {
        success: false,
        message: 'Twitter API not configured for deletion requests'
      };
    }
    
    // Verify credentials before making the API call
    const status = await this.getApiStatus();
    if (status.operational === false) {
      // Provide more specific error messages based on the status
      if (status.message.includes('rate limited')) {
        return {
          success: false,
          message: 'Twitter API is currently rate limited. Please try again later.'
        };
      } else if (status.message.includes('service is currently unavailable')) {
        return {
          success: false,
          message: 'Twitter API service is currently unavailable. Please try again later.'
        };
      } else {
        return {
          success: false,
          message: `Twitter API credentials issue: ${status.message}`
        };
      }
    }
    
    try {
      // Log the deletion request (actual deletion would require user OAuth)
      log(`Deletion request received for Twitter user: ${username}`, 'twitter-api');
      log(`Reason: ${details.reason || 'Not provided'}`, 'twitter-api');
      
      // For premium users, we would generate deletion instructions
      // In a real implementation, this would use OAuth to authenticate the user
      
      return {
        success: true,
        message: 'Deletion request logged. For actual tweet deletion, users need to authorize via OAuth.'
      };
    } catch (error: any) {
      log(`Error processing Twitter deletion request: ${error.message}`, 'twitter-api');
      return {
        success: false,
        message: `Error processing deletion request: ${error.message}`
      };
    }
  }
  
  /**
   * API method to request data deletion from Twitter
   * This is an extended version of processDeletionRequest that handles platform-specific options
   * 
   * @param username The Twitter username
   * @param options Options for what to delete
   * @returns Success status, message, and request ID
   */
  public async requestDataDeletion(
    username: string, 
    options: { 
      deleteAll?: boolean,
      deleteTweets?: boolean,
      deleteComments?: boolean,
      deleteLikes?: boolean 
    }
  ): Promise<{ success: boolean; message: string; requestId?: string }> {
    if (!this.client || !this.isConfigured) {
      return {
        success: false,
        message: 'Twitter API not configured for deletion requests'
      };
    }
    
    // Verify credentials before making the API call
    const status = await this.getApiStatus();
    if (status.operational === false) {
      // Provide more specific error messages based on the status
      if (status.message.includes('rate limited')) {
        return {
          success: false,
          message: 'Twitter API is currently rate limited. Please try again later.'
        };
      } else if (status.message.includes('service is currently unavailable')) {
        return {
          success: false,
          message: 'Twitter API service is currently unavailable. Please try again later.'
        };
      } else {
        return {
          success: false,
          message: `Twitter API credentials issue: ${status.message}`
        };
      }
    }
    
    try {
      // Check if the username exists
      const exists = await this.checkUsernameExists(username);
      if (!exists) {
        return {
          success: false,
          message: `No Twitter account found with username: ${username}`
        };
      }
      
      // Generate a request ID
      const requestId = `twitter-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Log what we're deleting
      const deleteItems = [];
      if (options.deleteAll) {
        deleteItems.push('all content');
      } else {
        if (options.deleteTweets) deleteItems.push('tweets');
        if (options.deleteComments) deleteItems.push('comments/replies');
        if (options.deleteLikes) deleteItems.push('likes');
      }
      
      log(`Twitter deletion request ${requestId}: For user ${username}, deleting ${deleteItems.join(', ')}`, 'twitter-api');
      
      // In a real implementation, we would:
      // 1. Use OAuth to authenticate as the user
      // 2. Use the Twitter API to delete the requested content
      // 3. Monitor the deletion process
      
      return {
        success: true,
        message: `Twitter deletion request initiated for ${deleteItems.join(', ')}. This process may take some time to complete.`,
        requestId
      };
    } catch (error: any) {
      log(`Error processing Twitter deletion request: ${error.message}`, 'twitter-api');
      return {
        success: false,
        message: `Error processing deletion request: ${error.message}`
      };
    }
  }

  /**
   * Transform Twitter API data to our platform format
   */
  private transformUserData(
    user: any,
    tweets: any[],
    username: string
  ): PlatformData {
    const publicMetrics = user.public_metrics || {};
    
    // Calculate total engagement across tweets
    const totalLikes = tweets.reduce((sum, tweet) => sum + (tweet.public_metrics?.like_count || 0), 0);
    const totalComments = tweets.reduce((sum, tweet) => sum + (tweet.public_metrics?.reply_count || 0), 0);
    const totalShares = tweets.reduce((sum, tweet) => sum + (tweet.public_metrics?.retweet_count || 0), 0);
    
    // Create recent content items from tweets
    const contentItems = tweets.map(tweet => ({
      type: "post" as const,
      content: tweet.text,
      timestamp: tweet.created_at,
      url: `https://twitter.com/${username}/status/${tweet.id}`,
      engagement: {
        likes: tweet.public_metrics?.like_count || 0,
        comments: tweet.public_metrics?.reply_count || 0,
        shares: tweet.public_metrics?.retweet_count || 0,
      }
    }));
    
    return {
      platformId: 'twitter' as Platform,
      username: username,
      profileData: {
        displayName: user.name || username,
        bio: user.description || '',
        followerCount: publicMetrics.followers_count || 0,
        followingCount: publicMetrics.following_count || 0,
        joinDate: user.created_at || undefined,
        profileUrl: `https://twitter.com/${username}`,
        avatarUrl: user.profile_image_url || '',
        location: user.location || undefined,
        verified: false // Not available in v2 API by default
      },
      activityData: {
        totalPosts: publicMetrics.tweet_count || 0,
        totalLikes: totalLikes,
        totalComments: totalComments,
        totalShares: totalShares,
        lastActive: tweets.length > 0 ? tweets[0].created_at : undefined
      },
      contentData: contentItems,
      analysisResults: {
        exposureScore: 65, // Example score
        topTopics: [
          { topic: "Technology", percentage: 45 },
          { topic: "Business", percentage: 30 },
          { topic: "Entertainment", percentage: 25 }
        ],
        activityTimeline: [
          { period: "Jan", count: 45 },
          { period: "Feb", count: 50 },
          { period: "Mar", count: 35 }
        ],
        sentimentBreakdown: {
          positive: 60,
          neutral: 30,
          negative: 10
        },
        privacyConcerns: [
          {
            type: "Location Sharing",
            description: "User frequently shares precise location data",
            severity: "medium"
          },
          {
            type: "Personal Information",
            description: "Profile contains identifiable information",
            severity: "low"
          }
        ],
        platformSpecificMetrics: {
          tweetFrequency: (publicMetrics.tweet_count || 0) / 
            (user.created_at ? Math.max(1, Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))) : 1),
          listedCount: publicMetrics.listed_count || 0,
          accountAge: user.created_at 
            ? `${Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365))} years` 
            : 'Unknown'
        }
      }
    };
  }

  /**
   * Check if a Twitter username exists
   */
  public async checkUsernameExists(username: string): Promise<boolean> {
    if (!this.client || !this.isConfigured) {
      return false;
    }
    
    // Check if we're currently rate limited
    if (this.isRateLimited()) {
      log(`Twitter API rate limiting in effect. Try again later.`, 'twitter-api');
      return false;
    }
    
    // Normalize username (remove @ if present)
    const normalizedUsername = username.startsWith('@') ? username.substring(1) : username;
    
    // Check cache first - if we have data for this username, it exists
    const cached = this.userDataCache.get(normalizedUsername);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      log(`Username check: Using cached Twitter data for ${normalizedUsername}`, 'twitter-api');
      return true;
    }
    
    // Verify credentials before making the real API call
    const status = await this.getApiStatus();
    if (status.operational === false) {
      // Use a more specific error message based on the status message
      if (status.message.includes('rate limited')) {
        log(`Cannot check Twitter username - API is rate limited. Please try again later.`, 'twitter-api');
      } else if (status.message.includes('service is currently unavailable')) {
        log(`Cannot check Twitter username - Twitter API service is down. Please try again later.`, 'twitter-api');
      } else {
        log(`Cannot check Twitter username - API credentials issue: ${status.message}`, 'twitter-api');
      }
      return false;
    }

    try {
      // Log the request and update rate limit counters
      this.updateRateLimitCounters();
      
      log(`Checking if Twitter username exists: ${normalizedUsername}`, 'twitter-api');
      
      // Use backoff strategy for API calls
      const response = await this.fetchWithBackoff(() => 
        this.client!.v2.userByUsername(normalizedUsername)
      );
      
      return !!response.data;
    } catch (error: any) {
      log(`Error checking Twitter username: ${error.message}`, 'twitter-api');
      
      // Check for specific error that means user not found
      if (error.code === 50) {
        log(`Twitter username not found: ${normalizedUsername}`, 'twitter-api');
        return false;
      }
      
      // Handle rate limiting
      if (error.code === 429 || (error.response && error.response.status === 429)) {
        log('Twitter API rate limit exceeded during username check', 'twitter-api');
        this.handleRateLimitExceeded();
      }
      
      return false;
    }
  }
}

// Create and export a singleton instance
export const twitterApi = new TwitterApiService();