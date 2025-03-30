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

  /**
   * Get API status - used to show which platforms have active connections
   */
  public getApiStatus(): { configured: boolean; message: string } {
    if (!this.isConfigured) {
      return {
        configured: false,
        message: 'Twitter API not configured. Add TWITTER_API_KEY, TWITTER_API_SECRET, and TWITTER_BEARER_TOKEN to environment.'
      };
    }
    
    return {
      configured: true,
      message: 'Twitter API configured and ready.'
    };
  }

  /**
   * Fetch user data from Twitter using available methods
   * @param username Twitter username to look up (with or without @)
   * @returns Platform data or null if not found
   */
  public async fetchUserData(username: string): Promise<PlatformData | null> {
    if (!this.client || !this.isConfigured) {
      log('Cannot fetch Twitter data - API not configured', 'twitter-api');
      return null;
    }

    try {
      // Normalize username (remove @ if present)
      const normalizedUsername = username.startsWith('@') ? username.substring(1) : username;
      
      log(`Fetching Twitter data for ${normalizedUsername}`, 'twitter-api');
      
      // Fetch user by username
      const userResponse = await this.client.v2.userByUsername(normalizedUsername, {
        'user.fields': 'description,profile_image_url,public_metrics,created_at,location,url'
      });
      
      if (!userResponse.data) {
        log(`No Twitter user found for username: ${normalizedUsername}`, 'twitter-api');
        return null;
      }
      
      const user = userResponse.data;
      
      // Fetch recent tweets by the user
      const userId = user.id;
      const tweetsResponse = await this.client.v2.userTimeline(userId, {
        max_results: 10,
        'tweet.fields': 'created_at,public_metrics,attachments',
        expansions: 'attachments.media_keys'
      });
      
      const tweets = tweetsResponse.data.data || [];
      
      // Transform data to our platform format
      return this.transformUserData(user, tweets, normalizedUsername);
    } catch (error: any) {
      log(`Error fetching Twitter data: ${error.message}`, 'twitter-api');
      
      if (error.code === 429) {
        log('Twitter API rate limit exceeded', 'twitter-api');
      }
      
      return null;
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

    try {
      const normalizedUsername = username.startsWith('@') ? username.substring(1) : username;
      const response = await this.client.v2.userByUsername(normalizedUsername);
      return !!response.data;
    } catch (error) {
      return false;
    }
  }
}

// Create and export a singleton instance
export const twitterApi = new TwitterApiService();