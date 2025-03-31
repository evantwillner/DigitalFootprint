/**
 * Facebook API Service
 * 
 * This service provides methods to interact with the Facebook Graph API 
 * for retrieving user data, posts, and engagement metrics.
 */

import axios from 'axios';
import { PlatformData, platformDataSchema } from '@shared/schema';
import { RateLimiter } from './rate-limiter';
import type { PlatformApiStatus } from '../services/types.d.ts';
import { openAiSentiment } from './openai-sentiment';
import { log } from '../vite';
import { tokenManager } from './token-manager';

class FacebookApiService {
  private appId: string | undefined;
  private appSecret: string | undefined;
  private accessToken: string | undefined;
  private apiBaseUrl = 'https://graph.facebook.com/v17.0';
  private isInitialized: boolean = false;
  
  // Rate limiter for Facebook API requests (200 requests per hour = ~1 request per 18 seconds)
  private rateLimiter = new RateLimiter({ 
    maxTokens: 200, 
    refillRate: 200 / 3600, // 200 tokens per hour
    refillInterval: 1000 // Refill every second
  });
  
  constructor() {
    // Initialize credentials asynchronously
    this.initialize();
  }
  
  /**
   * Initialize the Facebook API service with credentials from token manager
   */
  private async initialize(): Promise<void> {
    try {
      // Try to get credentials from token manager first
      const token = await tokenManager.getToken('facebook', true);
      
      if (token && token.accessToken) {
        this.accessToken = token.accessToken;
        
        // Get additional data if available
        if (token.additionalData) {
          this.appId = token.additionalData.clientId;
          this.appSecret = token.additionalData.clientSecret;
        }
        
        log('Facebook API Service initialized with token from TokenManager', 'facebook-api');
        this.isInitialized = true;
      } else {
        // Fall back to environment variables
        this.appId = process.env.FACEBOOK_APP_ID;
        this.appSecret = process.env.FACEBOOK_APP_SECRET;
        this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
        
        // If we have credentials from environment, store them in token manager
        if (this.isConfigured()) {
          await this.storeCredentialsInTokenManager();
          log('Facebook API Service initialized from environment variables', 'facebook-api');
          this.isInitialized = true;
        } else {
          log('⚠️ Facebook API Service not configured - missing API credentials', 'facebook-api');
        }
      }
    } catch (error) {
      log(`Error initializing Facebook API service: ${error}`, 'facebook-api');
    }
  }
  
  /**
   * Store current credentials in the token manager
   */
  private async storeCredentialsInTokenManager(): Promise<void> {
    if (this.accessToken) {
      await tokenManager.setToken('facebook', {
        accessToken: this.accessToken,
        additionalData: {
          clientId: this.appId,
          clientSecret: this.appSecret
        }
      });
      log('Stored Facebook credentials in token manager', 'facebook-api');
    }
  }
  
  /**
   * Refresh the access token using the token manager
   */
  private async refreshAccessToken(): Promise<boolean> {
    try {
      const newToken = await tokenManager.refreshToken('facebook');
      
      if (newToken && newToken.accessToken) {
        this.accessToken = newToken.accessToken;
        
        // Update additional data if available
        if (newToken.additionalData) {
          this.appId = newToken.additionalData.clientId;
          this.appSecret = newToken.additionalData.clientSecret;
        }
        
        log('Facebook access token refreshed successfully', 'facebook-api');
        return true;
      }
      
      log('Failed to refresh Facebook access token', 'facebook-api');
      return false;
    } catch (error) {
      log(`Error refreshing Facebook access token: ${error}`, 'facebook-api');
      return false;
    }
  }
  
  /**
   * Check if the Facebook API credentials are properly configured
   * @returns Boolean indicating if the API is configured
   */
  private isConfigured(): boolean {
    return !!(this.appId && this.appSecret && this.accessToken);
  }
  
  /**
   * Ensure the service is initialized before making API calls
   */
  private async ensureInitialized(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.isConfigured();
  }
  
  /**
   * Verify the Facebook API credentials by making a test request
   * @returns Object with API status details
   */
  public async getApiStatus(): Promise<PlatformApiStatus> {
    // Ensure we're initialized
    await this.ensureInitialized();
    
    if (!this.isConfigured()) {
      return {
        configured: false,
        operational: false,
        message: 'Facebook API credentials not configured. This may be resolved automatically through the token management service.'
      };
    }
    
    try {
      // Check if we can schedule an API request by checking rate limiter stats
      const stats = this.rateLimiter.getStats();
      if (stats.availableTokens <= 0) {
        return {
          configured: true,
          operational: false,
          message: 'Facebook API is rate limited. Please try again later.'
        };
      }
      
      // Try to make a simple request to verify the credentials
      const response = await axios.get(`${this.apiBaseUrl}/me`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,name'
        }
      });
      
      if (response.status === 200 && response.data && response.data.id) {
        return {
          configured: true,
          operational: true,
          message: 'Facebook API is operational.'
        };
      } else {
        return {
          configured: true,
          operational: false,
          message: 'Facebook API returned an unexpected response. Please check your credentials.'
        };
      }
    } catch (error: any) {
      let errorMessage = 'Facebook API request failed';
      let shouldTryRefresh = false;
      
      if (error.response) {
        // The request was made and the server responded with a non-2xx status
        const statusCode = error.response.status;
        const errorData = error.response.data?.error;
        
        if (statusCode === 401 || statusCode === 403 || 
            (errorData && errorData.code === 190)) {
          errorMessage = 'Facebook API authentication failed. Your access token may be invalid or expired.';
          shouldTryRefresh = true;
        } else if (statusCode === 429 || (errorData && errorData.code === 4)) {
          errorMessage = 'Facebook API rate limit exceeded. Please try again later.';
        } else if (errorData && errorData.message) {
          errorMessage = `Facebook API error: ${errorData.message}`;
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'Facebook API service is currently unavailable. No response received.';
      }
      
      // If we got an auth error, try to refresh the token
      if (shouldTryRefresh) {
        log('Facebook API authentication failed - attempting token refresh', 'facebook-api');
        
        // Try to refresh the token
        const refreshed = await this.refreshAccessToken();
        
        if (refreshed) {
          // Retry the request with the new token
          try {
            const retryResponse = await axios.get(`${this.apiBaseUrl}/me`, {
              params: {
                access_token: this.accessToken,
                fields: 'id,name'
              }
            });
            
            if (retryResponse.status === 200 && retryResponse.data && retryResponse.data.id) {
              return {
                configured: true,
                operational: true,
                message: 'Facebook API token refreshed and now operational.'
              };
            }
          } catch (retryError) {
            log(`Retry after token refresh also failed: ${retryError}`, 'facebook-api');
          }
        }
        
        // If we couldn't refresh or the retry failed, return an error
        return {
          configured: true,
          operational: false,
          message: `${errorMessage} Automatic token refresh was attempted.`
        };
      }
      
      return {
        configured: true,
        operational: false,
        message: errorMessage
      };
    }
  }
  
  /**
   * Fetch Facebook user data for a specific username
   * @param username The Facebook username to look up
   * @returns Platform data object or null if not found
   */
  public async fetchUserData(username: string): Promise<PlatformData | null> {
    // Ensure we're initialized and configured
    const isConfigured = await this.ensureInitialized();
    
    if (!isConfigured) {
      log('Facebook API is not configured. Unable to fetch user data.', 'facebook-api');
      return null;
    }
    
    // Verify API status
    const apiStatus = await this.getApiStatus();
    if (apiStatus.operational === false) {
      log(`Cannot fetch Facebook data - API status: ${apiStatus.message}`, 'facebook-api');
      return null;
    }
    
    // Use rate limiter to schedule the API request
    try {
      return await this.rateLimiter.schedule({
        execute: () => this._fetchUserData(username),
        platform: 'facebook',
        username,
        cost: 1,
        priority: 1
      });
    } catch (error: any) {
      log(`Error fetching Facebook user data: ${error.message}`, 'facebook-api');
      
      // Check if it's an authentication error that we can try to recover from
      if (error.message && error.message.includes('AUTH_ERROR')) {
        log('Authentication error detected, attempting token refresh', 'facebook-api');
        
        // Try to refresh the token
        const refreshed = await this.refreshAccessToken();
        
        if (refreshed) {
          log('Token refreshed, retrying fetch', 'facebook-api');
          
          // Retry the fetch with the new token
          try {
            return await this.rateLimiter.schedule({
              execute: () => this._fetchUserData(username),
              platform: 'facebook',
              username,
              cost: 1,
              priority: 2  // Higher priority for retry
            });
          } catch (retryError) {
            log(`Retry after token refresh also failed: ${retryError}`, 'facebook-api');
          }
        }
      }
      
      return null;
    }
  }
  
  /**
   * Internal method to fetch Facebook user data (executed via rate limiter)
   * @param username The Facebook username to look up
   * @returns Platform data object or null if not found
   */
  private async _fetchUserData(username: string): Promise<PlatformData | null> {
    
    try {
      // First, try to find the user by username
      const userResponse = await axios.get(`${this.apiBaseUrl}/${username}`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,name,username,about,link,picture.type(large),fan_count,category'
        }
      });
      
      if (!userResponse.data || !userResponse.data.id) {
        log(`No Facebook user found with the given username: ${username}`, 'facebook-api');
        return null;
      }
      
      const userId = userResponse.data.id;
      const displayName = userResponse.data.name || username;
      const profilePictureUrl = userResponse.data.picture?.data?.url || '';
      const bio = userResponse.data.about || '';
      const followerCount = userResponse.data.fan_count || 0;
      const category = userResponse.data.category || 'User';
      
      // Fetch the user's posts
      const postsResponse = await axios.get(`${this.apiBaseUrl}/${userId}/posts`, {
        params: {
          access_token: this.accessToken,
          fields: 'message,created_time,type,permalink_url,likes.summary(true),comments.summary(true),shares',
          limit: 25
        }
      });
      
      const posts = postsResponse.data?.data || [];
      const contentData = posts.map((post: any) => {
        return {
          id: post.id,
          type: post.type || 'post',
          content: post.message || '',
          timestamp: post.created_time,
          url: post.permalink_url || '',
          engagement: {
            likes: post.likes?.summary?.total_count || 0,
            comments: post.comments?.summary?.total_count || 0,
            shares: post.shares?.count || 0
          },
          platform: 'facebook'
        };
      });
      
      // Calculate activity metrics
      const totalPosts = contentData.length;
      const lastActive = contentData.length > 0 ? 
        new Date(contentData[0].timestamp).toISOString() : 
        new Date().toISOString();
      
      // Analyze content for privacy metrics
      const privacyMetrics = this.analyzePrivacyMetrics(contentData);
      const hashtagAnalysis = this.analyzeHashtags(contentData);
      const sentimentAnalysis = await this.analyzeSentiment(contentData);
      
      // Log sentiment analysis results
      log(`Facebook sentiment analysis for ${username}: Positive: ${sentimentAnalysis.sentimentBreakdown.positive}%, Neutral: ${sentimentAnalysis.sentimentBreakdown.neutral}%, Negative: ${sentimentAnalysis.sentimentBreakdown.negative}%`, 'facebook-api');
      
      // Construct the platform data object
      const platformData: PlatformData = {
        platformId: 'facebook',
        username,
        profileData: {
          displayName,
          bio,
          avatarUrl: profilePictureUrl,
          followerCount,
          followingCount: 0, // Not available via API
          joinDate: new Date().toISOString(), // Facebook doesn't provide this
          profileUrl: userResponse.data.link || `https://facebook.com/${username}`,
          verified: false // Hard to determine without specific field
        },
        activityData: {
          lastActive,
          // Replace frequencyScore with proper postsPerDay calculation
          postsPerDay: totalPosts > 0 ? (totalPosts / 30) : 0, // Estimate based on posts fetched
          totalPosts,
          totalLikes: contentData.reduce((sum: number, post: any) => sum + (post.engagement?.likes || 0), 0),
          totalComments: contentData.reduce((sum: number, post: any) => sum + (post.engagement?.comments || 0), 0),
          totalShares: contentData.reduce((sum: number, post: any) => sum + (post.engagement?.shares || 0), 0),
          topHashtags: this.analyzeHashtags(contentData).topHashtags.map(item => item.tag)
        },
        contentData,
        privacyMetrics: {
          exposureScore: this.calculateFrequencyScore(contentData),
          dataCategories: [
            { category: "Profile Information", severity: "low" },
            { category: "Post Content", severity: "medium" },
            { category: "Activity Data", severity: "low" }
          ],
          potentialConcerns: [{
            issue: "Public profile exposure",
            risk: "medium"
          }],
          recommendedActions: [
            "Review privacy settings",
            "Check tagged photos"
          ]
        },
        analysisResults: {
          exposureScore: this.calculateFrequencyScore(contentData),
          topTopics: this.analyzeTopics(contentData).topTopics.map(t => ({ 
            topic: t.topic, 
            percentage: t.confidence / 100 
          })),
          activityTimeline: [],
          sentimentBreakdown: sentimentAnalysis.sentimentBreakdown,
          dataCategories: [
            { category: "Profile Information", severity: "low" },
            { category: "Post Content", severity: "medium" }
          ],
          privacyConcerns: [{
            type: "Public profile exposure",
            severity: "medium",
            description: "Your Facebook profile is publicly accessible"
          }],
          recommendedActions: [
            "Review privacy settings",
            "Check tagged photos"
          ],
          platformSpecificMetrics: {
            contentBreakdown: this.analyzeContentTypes(contentData).breakdown.reduce((obj, item) => {
              obj[item.type] = item.percentage;
              return obj;
            }, {} as Record<string, number>),
            locationCheckIns: this.extractLocationData(contentData).mostFrequentLocations.map(l => l.name),
            engagementRate: this.calculateEngagementRate(contentData, followerCount),
            hashtagAnalysis: this.analyzeHashtags(contentData).topHashtags
          }
        },
        // platformErrors array is not in the schema, so we don't include it
      };
      
      // Validate the platform data with Zod schema
      const validationResult = platformDataSchema.safeParse(platformData);
      if (!validationResult.success) {
        log(`Facebook data validation failed: ${JSON.stringify(validationResult.error.issues)}`, 'facebook-api');
        return null;
      }
      
      return platformData;
    } catch (error: any) {
      log(`Error fetching Facebook user data: ${error.message}`, 'facebook-api');
      
      // Extract detailed error information from Facebook API response
      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        log(`Facebook API error details: ${JSON.stringify(fbError)}`, 'facebook-api');
        
        // Check for specific permission issues
        if (fbError.code === 100) {
          if (fbError.message.includes('missing permission')) {
            log('Facebook API permission error: The access token is missing required permissions.', 'facebook-api');
            log('Required permissions may include: pages_read_engagement, Page Public Content Access', 'facebook-api');
            
            // Throw a more specific error that can be caught by the platform API
            throw new Error('PERMISSION_ERROR: Facebook API requires additional permissions to access this data.');
          }
          
          if (fbError.message.includes('Object does not exist')) {
            log('Facebook API error: The requested username or ID does not exist or is not accessible.', 'facebook-api');
            throw new Error('NOT_FOUND: The Facebook username or page does not exist or cannot be accessed.');
          }
        }
        
        // Rate limiting detection
        if (fbError.code === 4 || fbError.message.includes('rate limit')) {
          log('Facebook API rate limit exceeded.', 'facebook-api');
          throw new Error('RATE_LIMITED: Facebook API rate limit exceeded. Please try again later.');
        }
        
        // Authentication errors
        if (fbError.code === 190) {
          log('Facebook API authentication error: The access token is invalid or has expired.', 'facebook-api');
          throw new Error('AUTH_ERROR: Facebook API authentication failed. Access token may be invalid or expired.');
        }
      }
      
      // Default error case
      return null;
    }
  }
  
  /**
   * Calculate frequency score based on posting patterns
   * @param contentData User content data
   * @returns Frequency score from 0-100
   */
  private calculateFrequencyScore(contentData: any[]): number {
    if (contentData.length === 0) {
      return 0;
    }
    
    // Sort by timestamp descending
    const sortedContent = [...contentData].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Only consider content from the last 90 days
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    const recentContent = sortedContent.filter(item => 
      new Date(item.timestamp) >= ninetyDaysAgo
    );
    
    // Calculate score based on volume and recency
    const recentContentRatio = recentContent.length / Math.max(contentData.length, 1);
    const volumeScore = Math.min(recentContent.length / 30, 1) * 50; // Max 50 points for 30+ posts
    const recencyScore = recentContentRatio * 50; // Max 50 points for all content being recent
    
    return Math.round(volumeScore + recencyScore);
  }
  
  /**
   * Calculate engagement rate for content
   * @param contentData User content data
   * @param followerCount User's follower count
   * @returns Engagement rate as a percentage
   */
  private calculateEngagementRate(contentData: any[], followerCount: number): number {
    if (contentData.length === 0 || followerCount === 0) {
      return 0;
    }
    
    const totalEngagements = contentData.reduce((sum: number, post: any) => {
      const engagement = post.engagement || {};
      return sum + (engagement.likes || 0) + (engagement.comments || 0) + (engagement.shares || 0);
    }, 0);
    
    const averageEngagementPerPost = totalEngagements / contentData.length;
    const engagementRate = (averageEngagementPerPost / followerCount) * 100;
    
    return parseFloat(engagementRate.toFixed(2));
  }
  
  /**
   * Analyze hashtags in user content
   * @param contentData User content data
   * @returns Hashtag analysis data
   */
  private analyzeHashtags(contentData: any[]): { 
    totalHashtags: number; 
    topHashtags: Array<{ tag: string; count: number; }>; 
  } {
    const hashtagCounts: Record<string, number> = {};
    
    // Extract hashtags from content
    contentData.forEach(post => {
      if (!post.content) return;
      
      const hashtags = post.content.match(/#\w+/g) || [];
      hashtags.forEach((tag: string) => {
        const normalizedTag = tag.toLowerCase();
        hashtagCounts[normalizedTag] = (hashtagCounts[normalizedTag] || 0) + 1;
      });
    });
    
    // Convert to array and sort
    const hashtagArray = Object.entries(hashtagCounts).map(([tag, count]) => ({
      tag,
      count: count as number
    }));
    
    hashtagArray.sort((a, b) => b.count - a.count);
    
    return {
      totalHashtags: Object.keys(hashtagCounts).length,
      topHashtags: hashtagArray.slice(0, 10)
    };
  }
  
  /**
   * Extract mentions from user content
   * @param contentData User content data
   * @returns Mentions analysis data
   */
  private analyzeMentions(contentData: any[]): { 
    totalMentions: number; 
    topMentions: Array<{ username: string; count: number; }>; 
  } {
    const mentionCounts: Record<string, number> = {};
    
    // Extract mentions from content
    contentData.forEach(post => {
      if (!post.content) return;
      
      const mentions = post.content.match(/@\w+/g) || [];
      mentions.forEach((mention: string) => {
        const normalizedMention = mention.toLowerCase();
        mentionCounts[normalizedMention] = (mentionCounts[normalizedMention] || 0) + 1;
      });
    });
    
    // Convert to array and sort
    const mentionArray = Object.entries(mentionCounts).map(([username, count]) => ({
      username,
      count: count as number
    }));
    
    mentionArray.sort((a, b) => b.count - a.count);
    
    return {
      totalMentions: Object.keys(mentionCounts).length,
      topMentions: mentionArray.slice(0, 10)
    };
  }
  
  /**
   * Extract location data from user content
   * @param contentData User content data
   * @returns Location data analysis
   */
  private extractLocationData(contentData: any[]): {
    totalLocationsTagged: number;
    mostFrequentLocations: Array<{ name: string; count: number; }>;
  } {
    // For Facebook, we don't have easy access to location tags through the API
    // This would require additional requests that may hit rate limits
    return {
      totalLocationsTagged: 0,
      mostFrequentLocations: []
    };
  }
  
  /**
   * Analyze sentiment of user content
   * @param contentData User content data
   * @returns Sentiment analysis data
   */
  /**
   * Analyze sentiment of content using OpenAI with fallback to keyword analysis
   * @param contentData Array of content items to analyze
   * @returns Sentiment analysis results
   */
  private async analyzeSentiment(contentData: any[]): Promise<{
    overallSentiment: 'positive' | 'neutral' | 'negative';
    sentimentScore: number;
    sentimentBreakdown: {
      positive: number;
      neutral: number;
      negative: number;
    };
  }> {
    // Check if there's content to analyze
    if (!contentData || contentData.length === 0) {
      return {
        overallSentiment: 'neutral',
        sentimentScore: 0,
        sentimentBreakdown: {
          positive: 33,
          neutral: 34,
          negative: 33
        }
      };
    }
    
    // Check if OpenAI service is operational
    const openAiStatus = openAiSentiment.getStatus();
    
    if (openAiStatus.operational) {
      try {
        // Use OpenAI batch sentiment analysis for more accurate results
        log('Using OpenAI for Facebook sentiment analysis', 'facebook-api');
        
        // Extract content text for analysis
        const contentTexts = contentData
          .filter(post => post.content && post.content.length > 0)
          .map(post => post.content);
        
        // If we have content to analyze
        if (contentTexts.length > 0) {
          const results = await openAiSentiment.analyzeSentimentBatch(contentTexts);
          
          log(`Facebook sentiment analysis complete. Positive: ${results.positive.toFixed(2)}, Neutral: ${results.neutral.toFixed(2)}, Negative: ${results.negative.toFixed(2)}`, 'facebook-api');
          
          // Convert decimal values to percentages
          const sentimentBreakdown = {
            positive: Math.round(results.positive * 100),
            neutral: Math.round(results.neutral * 100),
            negative: Math.round(results.negative * 100)
          };
          
          // Calculate sentiment score (-100 to 100)
          const sentimentScore = Math.round((results.positive - results.negative) * 100);
          
          // Determine overall sentiment
          let overallSentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
          if (sentimentScore > 20) {
            overallSentiment = 'positive';
          } else if (sentimentScore < -20) {
            overallSentiment = 'negative';
          }
          
          return {
            overallSentiment,
            sentimentScore,
            sentimentBreakdown
          };
        }
      } catch (error) {
        // Log error and fall back to simple calculation
        log(`Error using OpenAI for Facebook sentiment analysis: ${error}. Falling back to simple calculation.`, 'facebook-api');
      }
    }
    
    // Fallback to simple keyword-based sentiment analysis
    log('Using simple sentiment analysis for Facebook content', 'facebook-api');
    
    // Simple sentiment analysis based on keywords
    const positiveWords = [
      'happy', 'great', 'excellent', 'good', 'love', 'awesome', 'amazing',
      'wonderful', 'best', 'fantastic', 'beautiful', 'perfect', 'thanks', 'thank you'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'hate', 'dislike', 'horrible', 'worst',
      'sucks', 'disappointed', 'poor', 'sad', 'angry', 'upset', 'unfortunately'
    ];
    
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    
    contentData.forEach(post => {
      if (!post.content) {
        neutralCount++;
        return;
      }
      
      const content = post.content.toLowerCase();
      let isPositive = false;
      let isNegative = false;
      
      // Check for positive keywords
      for (const word of positiveWords) {
        if (content.includes(word)) {
          isPositive = true;
          break;
        }
      }
      
      // Check for negative keywords
      for (const word of negativeWords) {
        if (content.includes(word)) {
          isNegative = true;
          break;
        }
      }
      
      if (isPositive && !isNegative) {
        positiveCount++;
      } else if (!isPositive && isNegative) {
        negativeCount++;
      } else {
        neutralCount++;
      }
    });
    
    const total = Math.max(contentData.length, 1);
    const positivePercentage = (positiveCount / total) * 100;
    const neutralPercentage = (neutralCount / total) * 100;
    const negativePercentage = (negativeCount / total) * 100;
    
    // Calculate sentiment score (-100 to 100)
    const sentimentScore = Math.round(((positiveCount - negativeCount) / total) * 100);
    
    // Determine overall sentiment
    let overallSentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (sentimentScore > 20) {
      overallSentiment = 'positive';
    } else if (sentimentScore < -20) {
      overallSentiment = 'negative';
    }
    
    return {
      overallSentiment,
      sentimentScore,
      sentimentBreakdown: {
        positive: Math.round(positivePercentage),
        neutral: Math.round(neutralPercentage),
        negative: Math.round(negativePercentage)
      }
    };
  }
  
  /**
   * Analyze topics in user content
   * @param contentData User content data
   * @returns Topics analysis data
   */
  private analyzeTopics(contentData: any[]): {
    topTopics: Array<{ topic: string; confidence: number; }>;
  } {
    // Simple topic detection based on keywords
    const topicKeywords: Record<string, string[]> = {
      'Technology': ['tech', 'technology', 'software', 'hardware', 'app', 'digital', 'mobile', 'computer', 'programming', 'code', 'data'],
      'Business': ['business', 'entrepreneur', 'startup', 'company', 'market', 'product', 'service', 'customer', 'investment', 'finance', 'money'],
      'Health': ['health', 'fitness', 'workout', 'exercise', 'diet', 'nutrition', 'wellness', 'healthy', 'medical', 'doctor', 'hospital'],
      'Travel': ['travel', 'vacation', 'trip', 'journey', 'destination', 'adventure', 'explore', 'tourism', 'hotel', 'flight', 'beach', 'holiday'],
      'Food': ['food', 'recipe', 'restaurant', 'cook', 'cooking', 'meal', 'breakfast', 'lunch', 'dinner', 'delicious', 'taste', 'flavor'],
      'Fashion': ['fashion', 'style', 'outfit', 'clothes', 'dress', 'wear', 'design', 'brand', 'trendy', 'accessories', 'beauty', 'makeup'],
      'Sports': ['sports', 'game', 'team', 'player', 'win', 'match', 'competition', 'tournament', 'score', 'championship', 'ball', 'play'],
      'Entertainment': ['movie', 'film', 'tv', 'show', 'music', 'song', 'actor', 'actress', 'singer', 'celebrity', 'performance', 'concert', 'entertainment'],
      'Education': ['education', 'school', 'university', 'college', 'learn', 'teacher', 'student', 'class', 'course', 'knowledge', 'study', 'academic'],
      'Politics': ['politics', 'government', 'election', 'vote', 'political', 'policy', 'president', 'campaign', 'debate', 'law', 'democratic', 'republican']
    };
    
    const topicCounts: Record<string, number> = {};
    const totalWords = contentData.reduce((count: number, post: any) => count + (post.content?.split(/\s+/).length || 0), 0);
    
    // Count topic mentions
    contentData.forEach(post => {
      if (!post.content) return;
      
      const content = post.content.toLowerCase();
      
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        keywords.forEach(keyword => {
          if (content.includes(keyword)) {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          }
        });
      });
    });
    
    // Convert to confidence scores and sort
    const topicConfidence = Object.entries(topicCounts).map(([topic, count]) => ({
      topic,
      confidence: Math.min(Math.round((count / Math.max(contentData.length, 1)) * 100), 100)
    }));
    
    topicConfidence.sort((a, b) => b.confidence - a.confidence);
    
    return {
      topTopics: topicConfidence.slice(0, 5)
    };
  }
  
  /**
   * Analyze content types in user posts
   * @param contentData User content data
   * @returns Content type breakdown
   */
  private analyzeContentTypes(contentData: any[]): {
    breakdown: Array<{ type: string; percentage: number; }>;
  } {
    if (contentData.length === 0) {
      return { breakdown: [] };
    }
    
    const typeCounts: Record<string, number> = {};
    
    contentData.forEach(post => {
      const type = post.type || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    const total = contentData.length;
    const breakdown = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      percentage: Math.round((count / total) * 100)
    }));
    
    breakdown.sort((a, b) => b.percentage - a.percentage);
    
    return { breakdown };
  }
  
  /**
   * Analyze privacy metrics for user content
   * @param contentData User content data
   * @returns Privacy metrics analysis
   */
  private analyzePrivacyMetrics(contentData: any[]): {
    exposureScore: number;
    potentialConcerns: Array<{ issue: string; risk: 'high' | 'medium' | 'low'; details?: string; }>;
    recommendedActions: string[];
  } {
    const personalInfoKeywords = [
      'address', 'phone', 'email', 'password', 'ssn', 'social security',
      'credit card', 'bank account', 'license', 'passport', 'birth date',
      'birthday', 'home', 'live at', 'living in', 'cell number', 'mobile number'
    ];
    
    const locationKeywords = [
      'i\'m at', 'right now at', 'currently at', 'checked in', 'visiting',
      'staying at', 'vacationing at', 'on holiday at', 'working at', 'live in'
    ];
    
    const sensitiveTopics = [
      'politics', 'religion', 'medical', 'health', 'disease', 'illness',
      'dating', 'relationship', 'breakup', 'divorce', 'fired', 'quit job',
      'salary', 'income', 'money', 'debt', 'addiction', 'therapy', 'counseling'
    ];
    
    const concerns: Array<{ issue: string; risk: 'high' | 'medium' | 'low'; details?: string; }> = [];
    
    // Analyze personal information exposure
    let personalInfoExposure = 0;
    let locationExposure = 0;
    let sensitiveTopicsExposure = 0;
    
    contentData.forEach(post => {
      if (!post.content) return;
      
      const content = post.content.toLowerCase();
      
      // Check for personal information
      personalInfoKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          personalInfoExposure++;
          // Check if this concern already exists
          const existingConcern = concerns.find(c => 
            c.issue === 'Personal Information Exposure'
          );
          
          if (!existingConcern) {
            concerns.push({
              issue: 'Personal Information Exposure',
              risk: 'high',
              details: 'Your posts may contain personal or sensitive information.'
            });
          }
        }
      });
      
      // Check for location information
      locationKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          locationExposure++;
          // Check if this concern already exists
          const existingConcern = concerns.find(c => 
            c.issue === 'Location Information Sharing'
          );
          
          if (!existingConcern) {
            concerns.push({
              issue: 'Location Information Sharing',
              risk: 'medium',
              details: 'You frequently share your location, which could pose privacy risks.'
            });
          }
        }
      });
      
      // Check for sensitive topics
      sensitiveTopics.forEach(keyword => {
        if (content.includes(keyword)) {
          sensitiveTopicsExposure++;
          // Check if this concern already exists
          const existingConcern = concerns.find(c => 
            c.issue === 'Sensitive Topics Discussion'
          );
          
          if (!existingConcern) {
            concerns.push({
              issue: 'Sensitive Topics Discussion',
              risk: 'medium',
              details: 'Your posts discuss sensitive topics that may impact your privacy.'
            });
          }
        }
      });
    });
    
    // Check for high engagement posts
    const highEngagementPosts = contentData.filter(post => {
      const engagement = post.engagement || {};
      const totalEngagement = (engagement.likes || 0) + (engagement.comments || 0) + (engagement.shares || 0);
      return totalEngagement > 100; // Arbitrary threshold
    });
    
    if (highEngagementPosts.length > 0) {
      concerns.push({
        issue: 'High Visibility Content',
        risk: 'low',
        details: 'You have posts with high engagement that increase your digital visibility.'
      });
    }
    
    // Calculate exposure score (0-100)
    const personalInfoFactor = Math.min(personalInfoExposure / Math.max(contentData.length, 1), 1) * 40;
    const locationFactor = Math.min(locationExposure / Math.max(contentData.length, 1), 1) * 30;
    const sensitiveTopicsFactor = Math.min(sensitiveTopicsExposure / Math.max(contentData.length, 1), 1) * 20;
    const highEngagementFactor = Math.min(highEngagementPosts.length / Math.max(contentData.length, 1), 1) * 10;
    
    const exposureScore = Math.round(personalInfoFactor + locationFactor + sensitiveTopicsFactor + highEngagementFactor);
    
    // Sort concerns by risk level
    concerns.sort((a, b) => {
      const riskLevels: Record<string, number> = { 'high': 3, 'medium': 2, 'low': 1 };
      return riskLevels[b.risk] - riskLevels[a.risk];
    });
    
    // Generate recommended actions
    const recommendedActions: string[] = [];
    
    if (personalInfoExposure > 0) {
      recommendedActions.push('Review and remove posts containing personal information');
    }
    
    if (locationExposure > 0) {
      recommendedActions.push('Limit sharing your real-time location in posts');
    }
    
    if (sensitiveTopicsExposure > 0) {
      recommendedActions.push('Consider the privacy implications of discussing sensitive topics publicly');
    }
    
    if (highEngagementPosts.length > 0) {
      recommendedActions.push('Review privacy settings for high-engagement posts');
    }
    
    // Add general recommendations
    recommendedActions.push('Regularly review your Facebook privacy settings');
    recommendedActions.push('Consider using Facebook\'s Privacy Checkup tool');
    recommendedActions.push('Be mindful of what you share in future posts');
    
    return {
      exposureScore,
      potentialConcerns: concerns,
      recommendedActions
    };
  }
}

// Export a singleton instance
export const facebookApi = new FacebookApiService();