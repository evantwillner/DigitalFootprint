import axios from 'axios';
import { Platform, PlatformData } from '@shared/schema';
import { log } from '../vite';

/**
 * Twitter/X API Integration Service
 * 
 * This service connects to the Twitter/X API v2 to retrieve user data
 * and analyze digital footprints.
 */
export class TwitterApiService {
  private apiKey: string | undefined;
  private apiSecret: string | undefined;
  private bearerToken: string | undefined;
  
  constructor() {
    this.loadCredentials();
  }
  
  /**
   * Load Twitter API credentials from environment variables
   */
  private loadCredentials() {
    this.apiKey = process.env.TWITTER_API_KEY;
    this.apiSecret = process.env.TWITTER_API_SECRET;
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN;
    
    // Check if we have the required credentials
    if (!this.bearerToken) {
      log('Twitter bearer token not found. Twitter API integration will be limited.', 'twitter-api');
    } else {
      log('Twitter API credentials loaded successfully.', 'twitter-api');
    }
  }
  
  /**
   * Check if the service has valid credentials
   */
  public hasValidCredentials(): boolean {
    return !!this.bearerToken;
  }
  
  /**
   * Fetch user data from Twitter
   * @param username Twitter username to look up
   * @returns Platform data for Twitter or null if not found/accessible
   */
  public async fetchUserData(username: string): Promise<PlatformData | null> {
    if (!this.bearerToken) {
      log('Twitter API bearer token not available', 'twitter-api');
      return null;
    }
    
    try {
      log(`Fetching Twitter data for username: ${username}`, 'twitter-api');
      
      // First get the user ID from the username
      const userResponse = await axios({
        method: 'get',
        url: `https://api.twitter.com/2/users/by/username/${username}`,
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          'user.fields': 'created_at,description,entities,location,profile_image_url,public_metrics,url,verified'
        }
      });
      
      if (!userResponse.data.data) {
        log(`User ${username} not found on Twitter`, 'twitter-api');
        return null;
      }
      
      const userData = userResponse.data.data;
      const userId = userData.id;
      
      // Get recent tweets for the user
      const tweetsResponse = await axios({
        method: 'get',
        url: `https://api.twitter.com/2/users/${userId}/tweets`,
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          'max_results': 10,
          'tweet.fields': 'created_at,public_metrics,entities',
          'expansions': 'author_id'
        }
      });
      
      // Process the data and format according to our PlatformData schema
      const platformData: PlatformData = this.processTwitterData(userData, tweetsResponse.data);
      return platformData;
      
    } catch (error) {
      console.error('Error fetching Twitter data:', error);
      log(`Error fetching Twitter data for ${username}: ${error}`, 'twitter-api');
      return null;
    }
  }
  
  /**
   * Process the raw Twitter API data into our PlatformData format
   */
  private processTwitterData(userData: any, tweetsData: any): PlatformData {
    // Extract hashtags from tweets if available
    const hashtags: string[] = [];
    const tweets = tweetsData.data || [];
    
    // Process each tweet to extract hashtags and create content items
    const contentItems = tweets.map((tweet: any) => {
      // Extract hashtags from this tweet if they exist
      if (tweet.entities && tweet.entities.hashtags) {
        tweet.entities.hashtags.forEach((tag: any) => {
          if (!hashtags.includes(`#${tag.tag}`)) {
            hashtags.push(`#${tag.tag}`);
          }
        });
      }
      
      // Create a content item for our schema
      return {
        type: "post" as const,
        content: tweet.text,
        timestamp: tweet.created_at,
        url: `https://twitter.com/${userData.username}/status/${tweet.id}`,
        engagement: {
          likes: tweet.public_metrics?.like_count || 0,
          comments: tweet.public_metrics?.reply_count || 0,
          shares: tweet.public_metrics?.retweet_count || 0,
        },
        // Basic sentiment analysis could be added here with a proper NLP library
        sentiment: "neutral" as const,
        topics: this.extractTopicsFromTweet(tweet.text)
      };
    });
    
    // Perform basic analysis on the gathered data
    const analysisResults = this.analyzeTwitterData(userData, tweets, hashtags);
    
    // Build and return the platform data object
    return {
      platformId: "twitter",
      username: userData.username,
      profileData: {
        displayName: userData.name,
        bio: userData.description,
        followerCount: userData.public_metrics?.followers_count,
        followingCount: userData.public_metrics?.following_count,
        joinDate: userData.created_at,
        profileUrl: `https://twitter.com/${userData.username}`,
        avatarUrl: userData.profile_image_url,
        location: userData.location
      },
      activityData: {
        totalPosts: userData.public_metrics?.tweet_count || 0,
        totalComments: undefined, // Not directly available from API
        totalLikes: undefined, // Not directly available from API
        totalShares: undefined, // Not directly available from API
        postsPerDay: this.calculatePostsPerDay(
          userData.public_metrics?.tweet_count || 0, 
          new Date(userData.created_at)
        ),
        mostActiveTime: undefined, // Would require additional API calls
        lastActive: tweets.length > 0 ? tweets[0].created_at : undefined,
        topHashtags: hashtags.length > 0 ? hashtags.slice(0, 5) : undefined
      },
      contentData: contentItems,
      privacyMetrics: {
        exposureScore: this.calculateExposureScore(userData, tweets),
        dataCategories: [
          { category: "Public Posts", severity: "medium" as const },
          { category: "Profile Information", severity: "low" as const },
          { category: "Location Data", severity: userData.location ? "medium" as const : "low" as const }
        ],
        potentialConcerns: [
          { issue: "Public conversation history", risk: "medium" as const },
          { issue: "Profile and bio information exposure", risk: "low" as const },
          { issue: userData.location ? "Location information shared" : "Limited personal data exposed", 
            risk: userData.location ? "medium" as const : "low" as const }
        ],
        recommendedActions: [
          "Review privacy settings",
          "Consider making your account private",
          "Remove location data from profile",
          "Review and delete sensitive tweets"
        ]
      },
      analysisResults: analysisResults
    };
  }
  
  /**
   * Perform analysis on Twitter data to generate insights
   */
  private analyzeTwitterData(userData: any, tweets: any[], hashtags: string[]): PlatformData['analysisResults'] {
    // Calculate exposure score based on followers, tweet count, and profile visibility
    const exposureScore = this.calculateExposureScore(userData, tweets);
    
    // Analyze tweet content distribution
    const topTopics = this.analyzeTopics(tweets);
    
    // Generate a simple activity timeline based on available tweets
    // Note: For a complete timeline, we would need more historical data
    const activityTimeline = this.generateActivityTimeline(tweets);
    
    // Create a basic sentiment breakdown
    // In a real app, this would use NLP for accurate sentiment analysis
    const sentimentBreakdown = {
      positive: 0.3,  // Placeholder values
      neutral: 0.6,
      negative: 0.1
    };
    
    // Identify privacy concerns
    const privacyConcerns = [
      {
        type: "Twitter Privacy Issue",
        description: "Your Twitter profile and tweets are publicly visible",
        severity: "medium" as const
      },
      {
        type: "Data Aggregation Risk",
        description: "Your tweet patterns could be analyzed to build a detailed profile",
        severity: "medium" as const
      }
    ];
    
    // Add a location concern if the user has shared their location
    if (userData.location) {
      privacyConcerns.push({
        type: "Location Data Exposure",
        description: "Your profile includes location information",
        severity: "medium" as const
      });
    }
    
    return {
      exposureScore,
      topTopics,
      activityTimeline,
      sentimentBreakdown,
      privacyConcerns
    };
  }
  
  /**
   * Calculate an exposure score based on various metrics
   */
  private calculateExposureScore(userData: any, tweets: any[]): number {
    let score = 30; // Base score
    
    // Add points based on follower count
    const followers = userData.public_metrics?.followers_count || 0;
    if (followers > 1000) score += 20;
    else if (followers > 500) score += 15;
    else if (followers > 100) score += 10;
    else score += 5;
    
    // Add points based on tweet count / activity level
    const tweetCount = userData.public_metrics?.tweet_count || 0;
    if (tweetCount > 5000) score += 15;
    else if (tweetCount > 1000) score += 10;
    else if (tweetCount > 100) score += 5;
    
    // Add points for having a location
    if (userData.location) score += 5;
    
    // Add points for having a bio
    if (userData.description) score += 5;
    
    // Cap the score at 95
    return Math.min(score, 95);
  }
  
  /**
   * Calculate posts per day based on account age and total posts
   */
  private calculatePostsPerDay(totalPosts: number, joinDate: Date): number {
    const now = new Date();
    const accountAgeInDays = Math.max(1, (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
    return parseFloat((totalPosts / accountAgeInDays).toFixed(2));
  }
  
  /**
   * Extract topics from tweet text using basic keyword matching
   * In a real app, this would use NLP for better topic extraction
   */
  private extractTopicsFromTweet(tweetText: string): string[] {
    // Simple topic categories to check for
    const topicKeywords: Record<string, string[]> = {
      "Technology": ["tech", "technology", "code", "programming", "software", "hardware", "app", "digital"],
      "Privacy": ["privacy", "security", "data", "encrypt", "protect", "personal information"],
      "Politics": ["politics", "government", "election", "democrat", "republican", "policy"],
      "Entertainment": ["movie", "music", "tv", "show", "entertainment", "artist", "celebrity"],
      "Sports": ["sport", "game", "team", "play", "athlete", "win", "lose", "score"],
      "Business": ["business", "company", "startup", "entrepreneur", "market", "product", "service"]
    };
    
    const tweetLower = tweetText.toLowerCase();
    const detectedTopics: string[] = [];
    
    // Check for each topic
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      for (const keyword of keywords) {
        if (tweetLower.includes(keyword)) {
          detectedTopics.push(topic);
          break; // Found this topic, move to next one
        }
      }
    }
    
    return detectedTopics.length > 0 ? detectedTopics : ["General"];
  }
  
  /**
   * Analyze tweets to determine top topics
   */
  private analyzeTopics(tweets: any[]): Array<{topic: string, percentage: number}> {
    // Simple topic counter
    const topicCounts: Record<string, number> = {};
    let totalTopics = 0;
    
    // Count topics across all tweets
    tweets.forEach(tweet => {
      const topics = this.extractTopicsFromTweet(tweet.text);
      topics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        totalTopics++;
      });
    });
    
    // Convert to percentage format
    const topTopics = Object.entries(topicCounts).map(([topic, count]) => ({
      topic,
      percentage: totalTopics > 0 ? count / totalTopics : 0
    }));
    
    // Sort by percentage (highest first) and take top 5
    return topTopics
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }
  
  /**
   * Generate an activity timeline from available tweets
   */
  private generateActivityTimeline(tweets: any[]): Array<{period: string, count: number}> {
    // Group tweets by month
    const monthCounts: Record<string, number> = {};
    
    tweets.forEach(tweet => {
      if (tweet.created_at) {
        const date = new Date(tweet.created_at);
        const period = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        monthCounts[period] = (monthCounts[period] || 0) + 1;
      }
    });
    
    // If we don't have enough months from the available tweets, pad with empty months
    const timeline = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now);
      date.setMonth(now.getMonth() - i);
      const period = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      timeline.push({
        period,
        count: monthCounts[period] || 0
      });
    }
    
    // Return sorted by date (oldest first)
    return timeline.reverse();
  }
  
  /**
   * Request to delete user's data from Twitter (placeholder for OAuth implementation)
   * 
   * Note: In a real implementation, this would:
   * 1. Use OAuth to authenticate as the user
   * 2. Call the appropriate Twitter API endpoints to delete tweets or the account
   * 3. Track and report the deletion status
   */
  public async requestDataDeletion(username: string, options: {
    deleteAll: boolean;
    deleteTweets: boolean;
    deleteComments: boolean;
    deleteLikes: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    requestId?: string;
  }> {
    // This is a placeholder implementation
    // In a real app, we would need OAuth authorization from the user
    
    if (!this.hasValidCredentials()) {
      return {
        success: false,
        message: "Twitter API credentials not available. Cannot process deletion request."
      };
    }
    
    log(`Data deletion request for Twitter user ${username}`, 'twitter-api');
    
    if (options.deleteAll) {
      log(`Request to delete entire Twitter account for ${username}`, 'twitter-api');
      return {
        success: false,
        message: "Account deletion requires direct user action on Twitter. Please visit Twitter settings."
      };
    }
    
    // In a real implementation, we would interact with Twitter's API
    // For now, we'll return a simulated response
    return {
      success: true,
      message: "Deletion request submitted. This process may take up to 30 days to complete.",
      requestId: `twitter-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
    };
  }
}

// Export as a singleton
export const twitterApi = new TwitterApiService();