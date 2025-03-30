/**
 * Reddit API Direct Integration
 * 
 * This service provides access to Reddit's API using direct API calls
 * instead of relying on the snoowrap library. This approach gives us
 * more control over the API interaction and error handling.
 */

import axios from 'axios';
import { Platform, PlatformData } from '@shared/schema';
import { log } from '../vite';
import type { PlatformApiStatus } from './types.d.ts';
import { openAiSentiment } from './openai-sentiment';

export class RedditApiService {
  private isConfigured: boolean = false;
  private isOperational: boolean = false;

  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  
  constructor() {
    try {
      if (process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET) {
        log('Initializing Reddit API with provided credentials', 'reddit-api');
        this.isConfigured = true;
        log('Reddit API Service configured for application-only OAuth', 'reddit-api');
      } else {
        log('⚠️ Reddit API Service not configured - missing API keys', 'reddit-api');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`Error initializing Reddit API: ${errorMsg}`, 'reddit-api');
      this.isConfigured = false;
    }
  }
  
  /**
   * Get an OAuth access token from Reddit using the application-only flow
   * This follows Reddit's documented OAuth flow for application-only tokens
   */
  private async getAccessToken(): Promise<string> {
    try {
      if (this.accessToken && Date.now() < this.tokenExpiry) {
        // Use existing token if it's still valid
        return this.accessToken as string;
      }
      
      // We need to get a new access token
      log('Getting new Reddit access token...', 'reddit-api');
      
      // Create the authorization string (base64 encoded client_id:client_secret)
      const authString = Buffer.from(
        `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
      ).toString('base64');
      
      // Make the token request
      const response = await axios.post(
        'https://www.reddit.com/api/v1/access_token',
        'grant_type=client_credentials',
        {
          headers: {
            'User-Agent': 'DigitalFootprintTracker/1.0.0 (by /u/anonymous_user)',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${authString}`
          }
        }
      );
      
      // Process the response
      const data = response.data;
      if (data && data.access_token) {
        this.accessToken = data.access_token;
        // Store token expiry time (with a 5-minute safety margin)
        this.tokenExpiry = Date.now() + ((data.expires_in - 300) * 1000);
        
        log(`Successfully obtained Reddit access token, expires in ${data.expires_in} seconds`, 'reddit-api');
        return this.accessToken as string;
      } else {
        throw new Error('Invalid response from Reddit OAuth endpoint');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`Error getting Reddit access token: ${errorMsg}`, 'reddit-api');
      
      // Log detailed error if it's an Axios response error
      if (axios.isAxiosError(error) && error.response) {
        log(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`, 'reddit-api');
      }
      
      throw new Error(`Failed to get Reddit access token: ${errorMsg}`);
    }
  }

  /**
   * Make a direct API call to Reddit
   */
  private async callRedditApi(endpoint: string): Promise<any> {
    try {
      // Get an access token (or use existing one)
      const accessToken = await this.getAccessToken();
      
      // Make the API request
      const response = await axios.get(`https://oauth.reddit.com${endpoint}`, {
        headers: {
          'User-Agent': 'DigitalFootprintTracker/1.0.0 (by /u/anonymous_user)',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      return response.data;
    } catch (error) {
      // Handle specific error cases
      if (axios.isAxiosError(error)) {
        if (error.response) {
          if (error.response.status === 401) {
            // Clear token to force a refresh on next call
            this.accessToken = null;
            log('Reddit access token expired, will request a new one on next call', 'reddit-api');
            throw new Error('AUTH_ERROR: Reddit API authentication failed. Token expired or invalid.');
          } else if (error.response.status === 404) {
            throw new Error(`NOT_FOUND: Resource not found at ${endpoint}`);
          } else if (error.response.status === 403) {
            throw new Error(`PRIVACY_ERROR: Access forbidden to ${endpoint}`);
          } else if (error.response.status === 429) {
            throw new Error(`RATE_LIMITED: Reddit API rate limit exceeded. Please try again later.`);
          }
        }
      }
      
      // For other errors, rethrow with context
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`API_ERROR: Error calling Reddit API: ${errorMsg}`);
    }
  }

  /**
   * Checks if the Reddit API credentials are valid and working
   */
  public async verifyCredentials(): Promise<boolean> {
    try {
      // Try to access a public endpoint to verify API
      log('Verifying Reddit API connectivity...', 'reddit-api');
      const subreddit = await this.callRedditApi('/r/announcements/about');
      
      if (subreddit && subreddit.data && subreddit.data.display_name) {
        log(`Reddit API verification successful: accessed r/${subreddit.data.display_name}`, 'reddit-api');
        this.isOperational = true;
        return true;
      } else {
        log('Reddit API verification failed: could not retrieve subreddit data', 'reddit-api');
        this.isOperational = false;
        return false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`Reddit API credential verification failed: ${errorMsg}`, 'reddit-api');
      this.isOperational = false;
      return false;
    }
  }

  /**
   * Checks if valid API credentials are present
   */
  public hasValidCredentials(): boolean {
    return this.isConfigured;
  }
  
  /**
   * Get the API status for the Reddit API
   */
  public async getApiStatus(): Promise<PlatformApiStatus> {
    // Verify credentials if we haven't done so yet
    if (this.isConfigured && !this.isOperational) {
      await this.verifyCredentials();
    }
    
    return {
      configured: this.isConfigured,
      operational: this.isOperational,
      message: !this.isConfigured 
        ? "Reddit API requires credentials. Please add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET."
        : !this.isOperational
          ? "Reddit API credentials are invalid or expired. Please update the credentials."
          : "Reddit API is operational."
    };
  }
  
  /**
   * Fetch user data from Reddit
   * @param username Reddit username
   * @returns Platform data or null if not found
   */
  public async fetchUserData(username: string): Promise<PlatformData | null> {
    try {
      log(`Fetching Reddit data for user: ${username}`, 'reddit-api');
      
      // Get user information
      const userData = await this.callRedditApi(`/user/${username}/about`);
      if (!userData || !userData.data) {
        throw new Error(`NOT_FOUND: Reddit user ${username} not found.`);
      }
      
      const user = userData.data;
      
      // Check if account is suspended
      if (user.is_suspended) {
        throw new Error(`PRIVACY_ERROR: Reddit user ${username} account is suspended.`);
      }
      
      // Get recent submissions (posts)
      const postsData = await this.callRedditApi(`/user/${username}/submitted?limit=25`);
      const submissions = postsData?.data?.children || [];
      
      // Get recent comments
      const commentsData = await this.callRedditApi(`/user/${username}/comments?limit=50`);
      const comments = commentsData?.data?.children || [];
      
      // Extract user karma values
      const postKarma = user.link_karma || 0;
      const commentKarma = user.comment_karma || 0;
      
      // Determine top subreddits based on where user posts/comments
      const subredditCounts: Record<string, number> = {};
      
      // Count posts per subreddit
      submissions.forEach((post: any) => {
        const subreddit = post.data.subreddit;
        subredditCounts[subreddit] = (subredditCounts[subreddit] || 0) + 1;
      });
      
      // Count comments per subreddit
      comments.forEach((comment: any) => {
        const subreddit = comment.data.subreddit;
        subredditCounts[subreddit] = (subredditCounts[subreddit] || 0) + 1;
      });
      
      // Sort and get top 5 subreddits
      const topSubreddits = Object.entries(subredditCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(entry => entry[0]);
      
      // Calculate posts per day (average)
      const accountAgeInDays = (Date.now() / 1000 - user.created_utc) / 86400;
      const postsPerDay = accountAgeInDays > 0 
        ? (submissions.length / accountAgeInDays) 
        : 0;
      
      // First, prepare content data structure without sentiment analysis
      const formattedPosts = submissions.slice(0, 10).map((post: any) => ({
        type: 'post' as const,
        content: post.data.title + (post.data.selftext ? `\n\n${post.data.selftext.substring(0, 300)}${post.data.selftext.length > 300 ? '...' : ''}` : ''),
        timestamp: new Date(post.data.created_utc * 1000).toISOString(),
        url: `https://reddit.com${post.data.permalink}`,
        engagement: {
          likes: post.data.ups,
          comments: post.data.num_comments
        },
        sentiment: 'neutral' as 'positive' | 'neutral' | 'negative', // Default, will be updated
        topics: [post.data.subreddit]
      }));
      
      const formattedComments = comments.slice(0, 15).map((comment: any) => ({
        type: 'comment' as const,
        content: comment.data.body.substring(0, 300) + (comment.data.body.length > 300 ? '...' : ''),
        timestamp: new Date(comment.data.created_utc * 1000).toISOString(),
        url: `https://reddit.com${comment.data.permalink}`,
        engagement: {
          likes: comment.data.ups
        },
        sentiment: 'neutral' as 'positive' | 'neutral' | 'negative', // Default, will be updated
        topics: [comment.data.subreddit]
      }));
      
      // Combine and sort by timestamp
      const contentData = [...formattedPosts, ...formattedComments].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Process sentiment analysis
      const openAiStatus = openAiSentiment.getStatus();
      if (openAiStatus.operational) {
        try {
          // Extract just the texts for batch analysis
          const contentTexts = contentData.map(item => item.content);
          
          // Perform batch sentiment analysis with OpenAI
          log(`Analyzing sentiment for ${contentTexts.length} content items`, 'reddit-api');
          const batchResults = await openAiSentiment.analyzeSentimentBatch(contentTexts);
          
          // Apply sentiment results to the content data
          batchResults.detailedBreakdown.forEach((result, index) => {
            if (index < contentData.length) {
              contentData[index].sentiment = result.sentiment;
            }
          });
          
        } catch (error) {
          log(`Failed to perform batch sentiment analysis: ${error}. Processing individually.`, 'reddit-api');
          
          // Process each content item individually
          for (let i = 0; i < contentData.length; i++) {
            try {
              contentData[i].sentiment = await this.determineSentiment(contentData[i].content);
            } catch (err) {
              log(`Error determining sentiment for content item: ${err}`, 'reddit-api');
            }
          }
        }
      } else {
        // OpenAI not available, process individually using simple sentiment
        log('OpenAI not available. Using simple sentiment analysis for each content item.', 'reddit-api');
        for (let i = 0; i < contentData.length; i++) {
          contentData[i].sentiment = this.determineSimpleSentiment(contentData[i].content);
        }
      }
      
      // Calculate exposure score (1-100) based on karma and activity
      const karmaTotal = postKarma + commentKarma;
      let exposureScore = 30; // Base score
      
      // Add score based on karma (up to +40)
      if (karmaTotal > 100000) exposureScore += 40;
      else if (karmaTotal > 50000) exposureScore += 35;
      else if (karmaTotal > 10000) exposureScore += 30;
      else if (karmaTotal > 5000) exposureScore += 25;
      else if (karmaTotal > 1000) exposureScore += 20;
      else if (karmaTotal > 500) exposureScore += 15;
      else if (karmaTotal > 100) exposureScore += 10;
      else exposureScore += 5;
      
      // Add score based on account age (up to +30)
      const accountAgeInYears = accountAgeInDays / 365;
      if (accountAgeInYears > 10) exposureScore += 30;
      else if (accountAgeInYears > 7) exposureScore += 25;
      else if (accountAgeInYears > 5) exposureScore += 20;
      else if (accountAgeInYears > 3) exposureScore += 15;
      else if (accountAgeInYears > 1) exposureScore += 10;
      else exposureScore += 5;
      
      // Construct platform data response
      const platformData: PlatformData = {
        platformId: 'reddit',
        username,
        profileData: {
          displayName: username,
          bio: user.subreddit?.public_description || '',
          followerCount: user.subreddit?.subscribers || 0,
          joinDate: new Date(user.created_utc * 1000).toISOString(),
          profileUrl: `https://reddit.com/user/${username}`,
          avatarUrl: user.icon_img || user.subreddit?.icon_img || ''
        },
        activityData: {
          totalPosts: postKarma,
          totalComments: commentKarma,
          postsPerDay,
          topSubreddits
        },
        contentData,
        privacyMetrics: {
          exposureScore,
          dataCategories: [
            { category: "Personal Identification", severity: "medium" },
            { category: "Public Comments & Posts", severity: "low" },
            { category: "Engagement History", severity: "low" },
            { category: "Community Membership", severity: "low" }
          ],
          potentialConcerns: [
            { 
              issue: `Long-term digital trail (account ${accountAgeInYears > 1 ? Math.floor(accountAgeInYears) + ' years' : 'under 1 year'} old)`, 
              risk: accountAgeInYears > 3 ? "medium" : "low" 
            },
            { 
              issue: `Account visibility due to karma level (${karmaTotal.toLocaleString()} total karma)`, 
              risk: karmaTotal > 10000 ? "medium" : "low" 
            },
            { 
              issue: "Post and comment history publicly viewable", 
              risk: "low" 
            }
          ],
          recommendedActions: [
            "Regularly review your Reddit post and comment history",
            "Consider using different usernames across platforms",
            "Review your subreddit memberships for potentially revealing information",
            "Check privacy settings in your Reddit preferences",
            "Consider periodically deleting older content"
          ]
        },
        analysisResults: {
          exposureScore,
          sentimentBreakdown: await this.calculateSentimentBreakdown(contentData),
          topTopics: this.extractTopTopics(topSubreddits, contentData),
          // Generate activity timeline data
          activityTimeline: this.generateActivityTimeline(submissions, comments),
          // Include privacy concerns from potentialConcerns
          privacyConcerns: [
            { 
              type: "account_age",
              severity: accountAgeInYears > 3 ? "medium" : "low",
              description: `Long-term digital trail (account ${accountAgeInYears > 1 ? Math.floor(accountAgeInYears) + ' years' : 'under 1 year'} old)`
            },
            { 
              type: "engagement_visibility",
              severity: karmaTotal > 10000 ? "medium" : "low",
              description: `Account visibility due to karma level (${karmaTotal.toLocaleString()} total karma)`
            },
            { 
              type: "content_visibility",
              severity: "low",
              description: "Post and comment history publicly viewable"
            }
          ],
          // Include data categories 
          dataCategories: [
            { category: "Personal Identification", severity: "medium" },
            { category: "Public Comments & Posts", severity: "low" },
            { category: "Engagement History", severity: "low" },
            { category: "Community Membership", severity: "low" }
          ],
          // Include recommended actions
          recommendedActions: [
            "Regularly review your Reddit post and comment history",
            "Consider using different usernames across platforms",
            "Review your subreddit memberships for potentially revealing information",
            "Check privacy settings in your Reddit preferences",
            "Consider periodically deleting older content"
          ]
        }
      };
      
      return platformData;
    } catch (error: any) {
      log(`Error fetching Reddit data for ${username}: ${error.message}`, 'reddit-api');
      
      // Handle specific Reddit API errors
      if (error.message.includes('NOT_FOUND')) {
        throw new Error(`NOT_FOUND: Reddit user ${username} not found.`);
      } else if (error.message.includes('PRIVACY_ERROR')) {
        throw new Error(`PRIVACY_ERROR: Reddit user ${username} has a private account or is blocking data access.`);
      } else if (error.message.includes('RATE_LIMITED')) {
        throw new Error(`RATE_LIMITED: Reddit API rate limit exceeded. Please try again later.`);
      } else if (error.message.includes('AUTH_ERROR')) {
        throw new Error(`AUTH_ERROR: Reddit API authentication failed. Please update your API credentials.`);
      }
      
      // Generic error
      throw new Error(`API_ERROR: Error retrieving Reddit data: ${error.message}`);
    }
  }
  
  /**
   * Simple sentiment analysis based on text content
   * @param text Content to analyze
   * @returns Sentiment category
   */
  /**
   * Simple fallback sentiment analysis using word matching
   * Used as a backup when OpenAI is not available
   */
  private determineSimpleSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    if (!text) return 'neutral';
    
    const positiveWords = ['happy', 'good', 'great', 'excellent', 'awesome', 'amazing', 'love', 'best', 'thanks', 'appreciate', 'helpful', 'perfect', 'recommend'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'sucks', 'disappointed', 'disappointing', 'unfortunately', 'issue', 'problem', 'error', 'fail'];
    
    const textLower = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (textLower.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (textLower.includes(word)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
  
  /**
   * Determine sentiment of text using OpenAI when available,
   * falling back to simple analysis when needed
   */
  private async determineSentiment(text: string): Promise<'positive' | 'neutral' | 'negative'> {
    if (!text) return 'neutral';
    
    // Check if OpenAI service is available and operational
    const openAiStatus = openAiSentiment.getStatus();
    
    if (openAiStatus.operational && text.length > 0) {
      try {
        // Try to use OpenAI for more accurate sentiment analysis
        log('Using OpenAI for sentiment analysis', 'reddit-api');
        const result = await openAiSentiment.analyzeSentiment(text);
        return result.sentiment;
      } catch (error) {
        // Log error and fall back to simple sentiment analysis
        log(`Error using OpenAI for sentiment analysis: ${error}. Falling back to simple analysis.`, 'reddit-api');
        return this.determineSimpleSentiment(text);
      }
    } else {
      // Use simple sentiment analysis if OpenAI is not available
      if (!openAiStatus.operational) {
        log('OpenAI service not operational. Using simple sentiment analysis.', 'reddit-api');
      }
      return this.determineSimpleSentiment(text);
    }
  }
  
  /**
   * Calculate sentiment breakdown from content data
   * @param contentData Array of content items
   * @returns Sentiment percentages between 0-1
   */
  private async calculateSentimentBreakdown(contentData: any[]): Promise<{ positive: number, neutral: number, negative: number }> {
    if (!contentData || contentData.length === 0) {
      return { positive: 0.33, neutral: 0.34, negative: 0.33 };
    }
    
    // Check if OpenAI service is operational
    const openAiStatus = openAiSentiment.getStatus();
    
    if (openAiStatus.operational) {
      try {
        // Use OpenAI batch sentiment analysis for more accurate results
        log('Using OpenAI for batch sentiment analysis', 'reddit-api');
        
        // Extract content text for analysis
        const contentTexts = contentData
          .filter(item => item.content && item.content.length > 0)
          .map(item => item.content);
        
        // If we have content to analyze
        if (contentTexts.length > 0) {
          const results = await openAiSentiment.analyzeSentimentBatch(contentTexts);
          log(`OpenAI sentiment analysis complete. Positive: ${results.positive.toFixed(2)}, Neutral: ${results.neutral.toFixed(2)}, Negative: ${results.negative.toFixed(2)}`, 'reddit-api');
          return results;
        }
      } catch (error) {
        // Log error and fall back to simple calculation
        log(`Error using OpenAI for batch sentiment analysis: ${error}. Falling back to simple calculation.`, 'reddit-api');
      }
    }
    
    // Fallback to simple counting if OpenAI fails or isn't available
    let positive = 0, neutral = 0, negative = 0;
    
    for (const item of contentData) {
      // If the item already has a sentiment, use it
      if (item.sentiment) {
        if (item.sentiment === 'positive') positive++;
        else if (item.sentiment === 'negative') negative++;
        else neutral++;
      } else {
        // Otherwise try to calculate it
        const sentiment = await this.determineSimpleSentiment(item.content || '');
        if (sentiment === 'positive') positive++;
        else if (sentiment === 'negative') negative++;
        else neutral++;
      }
    }
    
    const total = contentData.length;
    return {
      positive: parseFloat((positive / total).toFixed(2)),
      neutral: parseFloat((neutral / total).toFixed(2)),
      negative: parseFloat((negative / total).toFixed(2))
    };
  }
  
  /**
   * Generate activity timeline from posts and comments
   * @param posts User's posts
   * @param comments User's comments
   * @returns Activity timeline with periods and counts
   */
  private generateActivityTimeline(posts: any[], comments: any[]): Array<{ period: string, count: number }> {
    // No activity, return empty timeline
    if (posts.length === 0 && comments.length === 0) {
      return [
        { period: 'Past day', count: 0 },
        { period: 'Past week', count: 0 },
        { period: 'Past month', count: 0 },
        { period: 'Past year', count: 0 },
        { period: 'Older', count: 0 }
      ];
    }
    
    // Get current time
    const now = Date.now() / 1000; // Convert to seconds for Reddit timestamps
    
    // Time periods in seconds
    const day = 24 * 60 * 60;
    const week = 7 * day;
    const month = 30 * day;
    const year = 365 * day;
    
    // Initialize counts
    let pastDayCount = 0;
    let pastWeekCount = 0;
    let pastMonthCount = 0;
    let pastYearCount = 0;
    let olderCount = 0;
    
    // Helper function to categorize content by time
    const categorizeByTime = (item: any) => {
      const createdTime = item.data.created_utc;
      const timeElapsed = now - createdTime;
      
      if (timeElapsed <= day) {
        pastDayCount++;
      } else if (timeElapsed <= week) {
        pastWeekCount++;
      } else if (timeElapsed <= month) {
        pastMonthCount++;
      } else if (timeElapsed <= year) {
        pastYearCount++;
      } else {
        olderCount++;
      }
    };
    
    // Categorize posts and comments into time periods
    posts.forEach(categorizeByTime);
    comments.forEach(categorizeByTime);
    
    // Create timeline data
    return [
      { period: 'Past day', count: pastDayCount },
      { period: 'Past week', count: pastWeekCount },
      { period: 'Past month', count: pastMonthCount },
      { period: 'Past year', count: pastYearCount },
      { period: 'Older', count: olderCount }
    ];
  }

  /**
   * Extract top topics from subreddits and content data
   * @param subreddits Top subreddits
   * @param contentData Content data
   * @returns Top topics with percentages
   */
  private extractTopTopics(subreddits: string[], contentData: any[]): Array<{ topic: string, percentage: number }> {
    // Use subreddits as the primary topics
    const subredditTopics = subreddits.slice(0, 5).map((subreddit, index) => {
      // Weight by position (higher for index 0, lower for index 4)
      const weight = 1 - (index * 0.15);
      return {
        topic: subreddit,
        percentage: Math.round(weight * 20)
      };
    });
    
    // Ensure percentages add up to 100
    const totalPercentage = subredditTopics.reduce((sum, topic) => sum + topic.percentage, 0);
    if (totalPercentage !== 100) {
      // Adjust the first topic to make the total 100
      const diff = 100 - totalPercentage;
      if (subredditTopics.length > 0) {
        subredditTopics[0].percentage += diff;
      }
    }
    
    // If no topics, return a default
    if (subredditTopics.length === 0) {
      return [{ topic: 'No activity', percentage: 100 }];
    }
    
    return subredditTopics;
  }
}

export const redditApi = new RedditApiService();