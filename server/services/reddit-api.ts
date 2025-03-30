/**
 * Reddit API Integration
 * 
 * This service provides access to Reddit's API through snoowrap
 * to fetch user data, post history, and subreddit activity.
 */

import Snoowrap from 'snoowrap';
import { Platform, PlatformData } from '@shared/schema';
import { log } from '../vite';
import type { PlatformApiStatus } from './types.d.ts';

export class RedditApiService {
  private readonly client: Snoowrap | null = null;
  private isConfigured: boolean = false;
  private isOperational: boolean = false;

  constructor() {
    try {
      if (process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET) {
        this.client = new Snoowrap({
          userAgent: 'DigitalFootprintTracker/1.0.0',
          clientId: process.env.REDDIT_CLIENT_ID,
          clientSecret: process.env.REDDIT_CLIENT_SECRET,
          // Using script-type app authentication (read-only)
          username: process.env.REDDIT_USERNAME || '',
          password: process.env.REDDIT_PASSWORD || '',
        });
        
        // Configure rate limiting and request throttling
        if (this.client) {
          this.client.config({
            requestDelay: 1000, // 1 second between requests
            continueAfterRatelimitError: true,
            retryErrorCodes: [502, 503, 504, 522],
            maxRetryAttempts: 3
          });
          
          this.isConfigured = true;
          log('Reddit API Service initialized', 'reddit-api');
        }
      } else {
        log('⚠️ Reddit API Service not configured - missing API keys', 'reddit-api');
      }
    } catch (error) {
      log(`Error initializing Reddit API: ${error}`, 'reddit-api');
      this.client = null;
      this.isConfigured = false;
    }
  }

  /**
   * Checks if the Reddit API credentials are valid and working
   */
  public async verifyCredentials(): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      // Try to fetch a simple resource to test credentials
      await this.client.getSubreddit('announcements').created_utc;
      this.isOperational = true;
      return true;
    } catch (error) {
      log(`Reddit API credential verification failed: ${error}`, 'reddit-api');
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
    if (!this.client) {
      throw new Error('AUTH_ERROR: Reddit API client not initialized');
    }
    
    try {
      log(`Fetching Reddit data for user: ${username}`, 'reddit-api');
      
      // Get the Reddit user
      const user = await this.client.getUser(username);
      
      // Get user profile data
      const about = await user.fetch();
      
      // Check if account exists but is suspended
      if (about.is_suspended) {
        throw new Error(`PRIVACY_ERROR: Reddit user ${username} account is suspended.`);
      }
      
      // Get recent submissions (posts)
      const submissions = await user.getSubmissions({limit: 25});
      
      // Get recent comments
      const comments = await user.getComments({limit: 50});
      
      // Extract user karma values
      const postKarma = about.link_karma || 0;
      const commentKarma = about.comment_karma || 0;
      
      // Determine top subreddits based on where user posts/comments
      const subredditCounts: Record<string, number> = {};
      
      // Count posts per subreddit
      submissions.forEach((post: any) => {
        const subreddit = post.subreddit.display_name;
        subredditCounts[subreddit] = (subredditCounts[subreddit] || 0) + 1;
      });
      
      // Count comments per subreddit
      comments.forEach((comment: any) => {
        const subreddit = comment.subreddit.display_name;
        subredditCounts[subreddit] = (subredditCounts[subreddit] || 0) + 1;
      });
      
      // Sort and get top 5 subreddits
      const topSubreddits = Object.entries(subredditCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(entry => entry[0]);
      
      // Calculate posts per day (average)
      const accountAgeInDays = (Date.now() / 1000 - about.created_utc) / 86400;
      const postsPerDay = accountAgeInDays > 0 
        ? (submissions.length / accountAgeInDays) 
        : 0;
      
      // Format content data
      const contentData = [
        // Add posts/submissions
        ...submissions.slice(0, 10).map((post: any) => ({
          type: 'post' as const,
          content: post.title + (post.selftext ? `\n\n${post.selftext.substring(0, 300)}${post.selftext.length > 300 ? '...' : ''}` : ''),
          timestamp: new Date(post.created_utc * 1000).toISOString(),
          url: `https://reddit.com${post.permalink}`,
          engagement: {
            likes: post.ups,
            comments: post.num_comments
          },
          sentiment: this.determineSentiment(post.title + post.selftext),
          topics: [post.subreddit.display_name]
        })),
        
        // Add comments
        ...comments.slice(0, 15).map((comment: any) => ({
          type: 'comment' as const,
          content: comment.body.substring(0, 300) + (comment.body.length > 300 ? '...' : ''),
          timestamp: new Date(comment.created_utc * 1000).toISOString(),
          url: `https://reddit.com${comment.permalink}`,
          engagement: {
            likes: comment.ups
          },
          sentiment: this.determineSentiment(comment.body),
          topics: [comment.subreddit.display_name]
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
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
          bio: about.subreddit?.public_description || '',
          followerCount: about.subreddit?.subscribers || 0,
          joinDate: new Date(about.created_utc * 1000).toISOString(),
          profileUrl: `https://reddit.com/user/${username}`,
          avatarUrl: about.icon_img || about.subreddit?.icon_img || ''
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
          sentimentBreakdown: this.calculateSentimentBreakdown(contentData),
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
      if (error.statusCode === 404 || error.message.includes('not found')) {
        throw new Error(`NOT_FOUND: Reddit user ${username} not found.`);
      } else if (error.statusCode === 403 || error.message.includes('forbidden') || error.message.includes('PRIVACY_ERROR')) {
        throw new Error(`PRIVACY_ERROR: Reddit user ${username} has a private account or is blocking data access.`);
      } else if (error.statusCode === 429 || error.message.includes('rate limit')) {
        throw new Error(`RATE_LIMITED: Reddit API rate limit exceeded. Please try again later.`);
      } else if (!this.client || error.message.includes('AUTH_ERROR')) {
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
  private determineSentiment(text: string): 'positive' | 'neutral' | 'negative' {
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
   * Calculate sentiment breakdown from content data
   * @param contentData Array of content items
   * @returns Sentiment percentages
   */
  private calculateSentimentBreakdown(contentData: any[]): { positive: number, neutral: number, negative: number } {
    if (!contentData || contentData.length === 0) {
      return { positive: 33, neutral: 34, negative: 33 };
    }
    
    let positive = 0, neutral = 0, negative = 0;
    
    contentData.forEach(item => {
      if (item.sentiment === 'positive') positive++;
      else if (item.sentiment === 'negative') negative++;
      else neutral++;
    });
    
    const total = contentData.length;
    return {
      positive: Math.round((positive / total) * 100),
      neutral: Math.round((neutral / total) * 100),
      negative: Math.round((negative / total) * 100)
    };
  }
  
  /**
   * Generate activity timeline from submissions and comments
   * @param submissions User's submitted posts
   * @param comments User's comments
   * @returns Activity timeline with periods and counts
   */
  private generateActivityTimeline(submissions: any[], comments: any[]): Array<{ period: string, count: number }> {
    // Combine submissions and comments to get all activity
    const allActivity = [...submissions, ...comments];
    
    // No activity, return empty timeline
    if (allActivity.length === 0) {
      return [
        { period: 'Past day', count: 0 },
        { period: 'Past week', count: 0 },
        { period: 'Past month', count: 0 },
        { period: 'Past year', count: 0 },
        { period: 'Older', count: 0 }
      ];
    }
    
    // Get current time
    const now = new Date().getTime() / 1000; // Convert to seconds for Reddit timestamps
    
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
    
    // Categorize activity into time periods
    allActivity.forEach(item => {
      const createdTime = item.created_utc || item.created;
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
    });
    
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
      subredditTopics[0].percentage += diff;
    }
    
    return subredditTopics;
  }
}

export const redditApi = new RedditApiService();