import axios from 'axios';
import { Platform, PlatformData } from '@shared/schema';
import { log } from '../vite';
import { stringify } from 'querystring';

/**
 * Reddit API Integration Service
 * 
 * This service connects to the Reddit API to retrieve user data
 * and analyze digital footprints.
 */
export class RedditApiService {
  private clientId: string | undefined;
  private clientSecret: string | undefined;
  private accessToken: string | undefined;
  private tokenExpiration: number = 0;
  
  constructor() {
    this.loadCredentials();
  }
  
  /**
   * Load Reddit API credentials from environment variables
   */
  private loadCredentials() {
    this.clientId = process.env.REDDIT_CLIENT_ID;
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET;
    
    if (this.clientId && this.clientSecret) {
      log('Reddit API credentials loaded', 'reddit-api');
    } else {
      log('Missing Reddit API credentials', 'reddit-api');
    }
  }
  
  /**
   * Check if the service has valid credentials
   */
  public hasValidCredentials(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  /**
   * Get API status - used to show which platforms have active connections
   */
  public getApiStatus(): { configured: boolean; message: string } {
    const configured = this.hasValidCredentials();
    return {
      configured,
      message: configured 
        ? "Reddit API is configured and ready" 
        : "Reddit API is not configured. Add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET to enable."
    };
  }
  
  /**
   * Get OAuth access token for Reddit API
   */
  private async getAccessToken(): Promise<string> {
    // Check if we already have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiration) {
      return this.accessToken;
    }
    
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Reddit API credentials not configured');
    }
    
    try {
      // Use Reddit's OAuth endpoint to get an application-only token
      // See: https://github.com/reddit-archive/reddit/wiki/OAuth2
      const response = await axios({
        method: 'post',
        url: 'https://www.reddit.com/api/v1/access_token',
        auth: {
          username: this.clientId,
          password: this.clientSecret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Digital-Footprint-Analyzer/1.0.0'
        },
        data: stringify({
          grant_type: 'client_credentials',
          device_id: 'DO_NOT_TRACK_THIS_DEVICE'
        })
      });
      
      this.accessToken = response.data.access_token;
      // Set expiration time (Reddit tokens last for 1 hour)
      this.tokenExpiration = Date.now() + (response.data.expires_in * 1000);
      
      log('Reddit API access token obtained successfully', 'reddit-api');
      
      if (!this.accessToken) {
        throw new Error('Received empty access token from Reddit API');
      }
      
      return this.accessToken;
    } catch (error) {
      log(`Error obtaining Reddit access token: ${error}`, 'reddit-api');
      throw new Error('Failed to authenticate with Reddit API');
    }
  }
  
  /**
   * Make an API request to Reddit
   */
  private async makeApiRequest(endpoint: string): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const response = await axios({
        method: 'get',
        url: `https://oauth.reddit.com${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Digital-Footprint-Analyzer/1.0.0'
        }
      });
      
      return response.data;
    } catch (error: any) {
      log(`Reddit API request failed: ${error.message}`, 'reddit-api');
      throw error;
    }
  }
  
  /**
   * Create mock data for a Reddit user if real data isn't available
   * This is temporary while developing and testing
   */
  private mockPlatformResponse(username: string): PlatformData {
    log(`Creating mock data for Reddit user: ${username}`, 'reddit-api');
    
    // Current date for reference
    const now = new Date();
    
    // Generate join date (1-5 years ago)
    const joinDate = new Date();
    joinDate.setFullYear(joinDate.getFullYear() - (1 + Math.floor(Math.random() * 4)));
    
    // Generate random content counts
    const postCount = Math.floor(Math.random() * 300) + 50;
    const commentCount = Math.floor(Math.random() * 1000) + 200;
    const followerCount = Math.floor(Math.random() * 500) + 10;
    
    // Generate topics 
    const topics = [
      { topic: "Technology", percentage: 45 },
      { topic: "Privacy", percentage: 30 },
      { topic: "Data Security", percentage: 25 }
    ];
    
    // Generate fake activity timeline
    const activityTimeline = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return {
        period: `${now.getFullYear()}-${month.toString().padStart(2, '0')}`,
        count: Math.floor(Math.random() * 30) + 5
      };
    });
    
    // Generate mock platform data
    return {
      platformId: 'reddit',
      username,
      profileData: {
        displayName: username,
        bio: "This is a simulated Reddit profile for development testing purposes.",
        followerCount,
        joinDate: joinDate.toISOString(),
        profileUrl: `https://reddit.com/user/${username}`,
        avatarUrl: "",
      },
      activityData: {
        totalPosts: postCount,
        totalComments: commentCount,
        postsPerDay: Number(((postCount + commentCount) / 365).toFixed(2)),
        topSubreddits: ["programming", "technology", "science", "news", "AskReddit"],
      },
      contentData: Array.from({ length: 10 }, (_, i) => ({
        type: i % 2 === 0 ? "post" as const : "comment" as const,
        content: `This is a sample ${i % 2 === 0 ? "post" : "comment"} #${i + 1} for demonstration purposes.`,
        timestamp: new Date(now.getTime() - (i * 86400000 * 7)).toISOString(),
        url: `https://reddit.com/r/sample/comments/${i}`,
        engagement: {
          likes: Math.floor(Math.random() * 100),
          comments: i % 2 === 0 ? Math.floor(Math.random() * 20) : undefined,
        },
        sentiment: ["positive", "neutral", "negative"][Math.floor(Math.random() * 3)] as "positive" | "neutral" | "negative",
        topics: ["Technology", "Privacy", "Data Security"].slice(0, 1 + Math.floor(Math.random() * 2)),
      })),
      privacyMetrics: {
        exposureScore: 65,
        dataCategories: [
          { category: "Public Comments", severity: "low" },
          { category: "Opinions", severity: "medium" },
          { category: "Personal Interests", severity: "low" },
        ],
        potentialConcerns: [
          { issue: "Comment history reveals interests", risk: "low" },
          { issue: "Account activity patterns can be analyzed", risk: "medium" },
        ],
        recommendedActions: [
          "Review privacy settings",
          "Consider using alt accounts for sensitive topics",
          "Regularly audit comment history",
          "Use a VPN when accessing Reddit",
        ],
      },
      analysisResults: {
        exposureScore: 65,
        topTopics: topics,
        activityTimeline,
        sentimentBreakdown: {
          positive: 0.3,
          neutral: 0.5,
          negative: 0.2,
        },
        dataCategories: [
          { category: "Public Comments", severity: "low" },
          { category: "Opinions", severity: "medium" },
          { category: "Personal Interests", severity: "low" },
        ],
        privacyConcerns: [
          {
            type: "Data aggregation",
            description: "Your Reddit history could be analyzed for patterns",
            severity: "medium"
          }
        ],
        recommendedActions: [
          "Review privacy settings",
          "Consider using alt accounts for sensitive topics",
          "Regularly audit comment history",
          "Use a VPN when accessing Reddit",
        ]
      }
    };
  }
  
  /**
   * Fetch user data from Reddit
   * @param username Reddit username to look up
   * @returns Platform data or null if not found/accessible
   */
  public async fetchUserData(username: string): Promise<PlatformData | null> {
    if (!this.hasValidCredentials()) {
      log('Skipping Reddit API call due to missing credentials', 'reddit-api');
      return null;
    }
    
    try {
      log(`Fetching Reddit data for user: ${username}`, 'reddit-api');
      
      // Get user profile data
      const userData = await this.makeApiRequest(`/user/${username}/about`);
      log(`Reddit user data received: ${JSON.stringify(userData).substring(0, 300)}...`, 'reddit-api');
      
      // Check if we found a user
      if (!userData || !userData.data) {
        log(`Reddit user ${username} not found or returned empty data`, 'reddit-api');
        return null; // Return null when user is not found
      }
      
      // Get user's recent posts
      const userPosts = await this.makeApiRequest(`/user/${username}/submitted?limit=25`);
      log(`Reddit posts received: ${userPosts.data.children.length}`, 'reddit-api');
      
      // Get user's recent comments
      const userComments = await this.makeApiRequest(`/user/${username}/comments?limit=25`);
      log(`Reddit comments received: ${userComments.data.children.length}`, 'reddit-api');
      
      // Process the raw data into our standardized format
      const result = this.processRedditData(username, userData.data, userPosts.data.children, userComments.data.children);
      log(`Processed Reddit data for ${username}`, 'reddit-api');
      return result;
    } catch (error: any) {
      // Handle 404 - User not found
      if (error.response && error.response.status === 404) {
        log(`Reddit user ${username} not found`, 'reddit-api');
        return null; // Return null when user not found
      }
      
      log(`Error fetching Reddit data: ${error.message}`, 'reddit-api');
      throw error;
    }
  }
  
  /**
   * Process the raw Reddit API data into our standardized format
   */
  private processRedditData(
    username: string, 
    profile: any, 
    posts: any[], 
    comments: any[]
  ): PlatformData {
    // Extract profile information
    const profileData = {
      displayName: profile.name,
      bio: profile.subreddit?.public_description || '',
      followerCount: profile.subreddit?.subscribers || 0,
      joinDate: new Date(profile.created_utc * 1000).toISOString(),
      profileUrl: `https://reddit.com/user/${username}`,
      avatarUrl: profile.icon_img || profile.subreddit?.icon_img || '',
    };
    
    // Extract activity data
    const activityData = {
      totalPosts: profile.link_karma || 0,
      totalComments: profile.comment_karma || 0,
      postsPerDay: this.calculatePostsPerDay(
        posts.length + comments.length,
        new Date(profile.created_utc * 1000)
      ),
      topSubreddits: this.extractTopSubreddits(posts, comments),
    };
    
    // Process content data
    const contentData = [
      ...posts.map(post => ({
        type: "post" as const,
        content: post.data.title + (post.data.selftext ? `: ${post.data.selftext.substring(0, 200)}...` : ''),
        timestamp: new Date(post.data.created_utc * 1000).toISOString(),
        url: `https://reddit.com${post.data.permalink}`,
        engagement: {
          likes: post.data.score,
          comments: post.data.num_comments,
        },
        sentiment: this.analyzeSentiment(post.data.title + ' ' + (post.data.selftext || '')),
        topics: this.extractTopics(post.data.title + ' ' + (post.data.selftext || '')),
      })),
      ...comments.map(comment => ({
        type: "comment" as const,
        content: comment.data.body?.substring(0, 200) + '...',
        timestamp: new Date(comment.data.created_utc * 1000).toISOString(),
        url: `https://reddit.com${comment.data.permalink}`,
        engagement: {
          likes: comment.data.score,
        },
        sentiment: this.analyzeSentiment(comment.data.body || ''),
        topics: this.extractTopics(comment.data.body || ''),
      }))
    ];
    
    // Generate analysis results
    const analysisResults = this.analyzeRedditData(profile, posts, comments);
    
    // Map to platform data schema
    return {
      platformId: 'reddit',
      username,
      profileData,
      activityData,
      contentData,
      privacyMetrics: {
        exposureScore: analysisResults.exposureScore,
        dataCategories: analysisResults.dataCategories,
        potentialConcerns: analysisResults.potentialConcerns,
        recommendedActions: analysisResults.recommendedActions,
      },
      analysisResults,
    };
  }
  
  /**
   * Calculate posts per day based on account age and activity
   */
  private calculatePostsPerDay(totalActivity: number, joinDate: Date): number {
    const accountAgeInDays = (Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24);
    return accountAgeInDays > 0 ? Number((totalActivity / accountAgeInDays).toFixed(2)) : 0;
  }
  
  /**
   * Extract top subreddits from posts and comments
   */
  private extractTopSubreddits(posts: any[], comments: any[]): string[] {
    const subredditCounts: Record<string, number> = {};
    
    posts.forEach(item => {
      if (item.data && item.data.subreddit) {
        const subreddit = item.data.subreddit;
        if (subreddit) {
          subredditCounts[subreddit] = (subredditCounts[subreddit] || 0) + 1;
        }
      }
    });
    
    comments.forEach(item => {
      if (item.data && item.data.subreddit) {
        const subreddit = item.data.subreddit;
        if (subreddit) {
          subredditCounts[subreddit] = (subredditCounts[subreddit] || 0) + 1;
        }
      }
    });
    
    return Object.entries(subredditCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([subreddit]) => subreddit);
  }
  
  /**
   * Simple sentiment analysis (for demo purposes)
   * In a production app, you would use a proper NLP service
   */
  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['good', 'great', 'awesome', 'excellent', 'love', 'like', 'best', 'amazing'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'worst', 'horrible'];
    
    const lowerText = text.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) positiveScore += matches.length;
    });
    
    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) negativeScore += matches.length;
    });
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }
  
  /**
   * Extract topics from text (basic implementation)
   * In a production app, you would use a proper topic modeling service
   */
  private extractTopics(text: string): string[] {
    // Define topic categories and keywords
    const topicKeywords: Record<string, string[]> = {
      'Technology': ['tech', 'computer', 'software', 'hardware', 'program', 'code', 'app', 'developer'],
      'Gaming': ['game', 'play', 'console', 'xbox', 'playstation', 'nintendo', 'steam'],
      'Movies': ['movie', 'film', 'cinema', 'actor', 'director', 'watch'],
      'Music': ['music', 'song', 'band', 'album', 'concert', 'listen'],
      'Sports': ['sport', 'team', 'player', 'game', 'match', 'league', 'score'],
      'Politics': ['politic', 'government', 'election', 'vote', 'president', 'party'],
      'Science': ['science', 'research', 'study', 'discover', 'scientist'],
      'Food': ['food', 'cook', 'recipe', 'eat', 'restaurant', 'meal', 'diet'],
      'Travel': ['travel', 'vacation', 'trip', 'country', 'visit', 'flight', 'hotel'],
      'Fashion': ['fashion', 'clothes', 'wear', 'style', 'outfit', 'dress'],
    };
    
    const lowerText = text.toLowerCase();
    const matches: Record<string, number> = {};
    
    // Check for each topic
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const keywordMatches = (lowerText.match(regex) || []).length;
        if (keywordMatches > 0) {
          matches[topic] = (matches[topic] || 0) + keywordMatches;
        }
      });
    });
    
    // Return top 3 topics
    return Object.entries(matches)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic);
  }
  
  /**
   * Analyze Reddit data to generate insights
   */
  private analyzeRedditData(profile: any, posts: any[], comments: any[]): any {
    // Calculate exposure score (0-100)
    const exposureScore = this.calculateExposureScore(profile, posts, comments);
    
    // Generate data categories
    const dataCategories = this.identifyDataCategories(profile, posts, comments);
    
    // Generate potential privacy concerns
    const potentialConcerns = this.identifyPrivacyConcerns(profile, posts, comments);
    
    // Generate recommended actions
    const recommendedActions = this.generateRecommendations(profile, posts, comments);
    
    // Generate topic breakdown
    const topTopics = this.generateTopicBreakdown(posts, comments);
    
    // Generate activity timeline
    const activityTimeline = this.generateActivityTimeline(posts, comments);
    
    // Generate sentiment breakdown
    const sentimentBreakdown = this.generateSentimentBreakdown(posts, comments);
    
    return {
      exposureScore,
      topTopics,
      activityTimeline,
      sentimentBreakdown,
      privacyConcerns: potentialConcerns,
      dataCategories,
      recommendedActions,
    };
  }
  
  /**
   * Calculate an exposure score based on various metrics
   */
  private calculateExposureScore(profile: any, posts: any[], comments: any[]): number {
    // Factors that contribute to exposure:
    // 1. Account age (older = more exposure)
    // 2. Karma (higher = more exposure)
    // 3. Post frequency (higher = more exposure)
    // 4. Subreddit diversity (more subreddits = more exposure)
    // 5. Content sensitivity (more personal details = more exposure)
    
    const accountAgeScore = Math.min(100, ((Date.now() - profile.created_utc * 1000) / (1000 * 60 * 60 * 24 * 365)) * 20);
    const karmaScore = Math.min(100, (profile.link_karma + profile.comment_karma) / 1000 * 10);
    
    const postFrequency = posts.length + comments.length;
    const postFrequencyScore = Math.min(100, postFrequency * 2);
    
    const uniqueSubreddits = new Set<string>();
    [...posts, ...comments].forEach(item => {
      if (item.data && item.data.subreddit) {
        uniqueSubreddits.add(item.data.subreddit);
      }
    });
    const subredditDiversityScore = Math.min(100, uniqueSubreddits.size * 5);
    
    // Calculate the final score (weighted average)
    return Math.round(
      (accountAgeScore * 0.2) +
      (karmaScore * 0.3) +
      (postFrequencyScore * 0.3) +
      (subredditDiversityScore * 0.2)
    );
  }
  
  /**
   * Identify data categories present in user's content
   */
  private identifyDataCategories(profile: any, posts: any[], comments: any[]): Array<{category: string, severity: "low" | "medium" | "high"}> {
    const categories: Array<{category: string, severity: "low" | "medium" | "high"}> = [];
    
    // Common data categories to check for
    categories.push({ category: "Public Comments", severity: "low" });
    
    if (profile.link_karma > 1000 || posts.length > 10) {
      categories.push({ category: "Post History", severity: "medium" });
    }
    
    if (profile.comment_karma > 1000 || comments.length > 20) {
      categories.push({ category: "Comment History", severity: "medium" });
    }
    
    // Check for personal opinions in content
    const hasOpinions = [...posts, ...comments].some(item => {
      const text = item.data.title || item.data.body || '';
      return text.toLowerCase().includes('i think') || 
             text.toLowerCase().includes('i believe') || 
             text.toLowerCase().includes('in my opinion');
    });
    
    if (hasOpinions) {
      categories.push({ category: "Personal Opinions", severity: "medium" });
    }
    
    // Check for political content
    const politicalKeywords = ['politics', 'election', 'democrat', 'republican', 'government', 'president'];
    const hasPolitical = [...posts, ...comments].some(item => {
      const text = item.data.title || item.data.body || '';
      return politicalKeywords.some(keyword => text.toLowerCase().includes(keyword));
    });
    
    if (hasPolitical) {
      categories.push({ category: "Political Views", severity: "high" });
    }
    
    return categories;
  }
  
  /**
   * Identify potential privacy concerns based on user's Reddit activity
   */
  private identifyPrivacyConcerns(profile: any, posts: any[], comments: any[]): Array<{issue: string, risk: "low" | "medium" | "high"}> {
    const concerns: Array<{issue: string, risk: "low" | "medium" | "high"}> = [];
    
    // Account age - older accounts may have more exposure
    const accountAgeInYears = (Date.now() - profile.created_utc * 1000) / (1000 * 60 * 60 * 24 * 365);
    if (accountAgeInYears > 5) {
      concerns.push({ issue: "Long-term account with potential historical content", risk: "medium" });
    }
    
    // High activity - more posts/comments means more data
    if (profile.link_karma + profile.comment_karma > 10000) {
      concerns.push({ issue: "High activity level increases digital footprint", risk: "medium" });
    }
    
    // Check for personal information
    const personalInfoRegex = /my (name|age|birthday|address|phone|email)/i;
    const hasPersonalInfo = [...posts, ...comments].some(item => {
      const text = item.data.title || item.data.body || '';
      return personalInfoRegex.test(text);
    });
    
    if (hasPersonalInfo) {
      concerns.push({ issue: "Potential personal information shared in posts/comments", risk: "high" });
    }
    
    // Comment history reveals interests
    concerns.push({ issue: "Comment history reveals interests and preferences", risk: "low" });
    
    // Account activity patterns
    concerns.push({ issue: "Account activity patterns can be analyzed", risk: "medium" });
    
    return concerns;
  }
  
  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(profile: any, posts: any[], comments: any[]): string[] {
    const recommendations: string[] = [];
    
    // Basic recommendations for all users
    recommendations.push("Review your Reddit privacy settings");
    recommendations.push("Consider using alt accounts for sensitive topics");
    
    // Add based on specific patterns
    if ([...posts, ...comments].length > 50) {
      recommendations.push("Regularly audit your comment history");
    }
    
    if (profile.link_karma + profile.comment_karma > 5000) {
      recommendations.push("Review your most popular posts for sensitive information");
    }
    
    recommendations.push("Use a VPN when accessing Reddit");
    
    return recommendations;
  }
  
  /**
   * Generate topic breakdown from posts and comments
   */
  private generateTopicBreakdown(posts: any[], comments: any[]): Array<{topic: string, percentage: number}> {
    const topicCounts: Record<string, number> = {};
    let totalTopicCount = 0;
    
    // Count topics in posts
    posts.forEach(post => {
      if (post.data) {
        const topics = this.extractTopics(post.data.title + ' ' + (post.data.selftext || ''));
        topics.forEach(topic => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          totalTopicCount++;
        });
      }
    });
    
    // Count topics in comments
    comments.forEach(comment => {
      if (comment.data && comment.data.body) {
        const topics = this.extractTopics(comment.data.body);
        topics.forEach(topic => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          totalTopicCount++;
        });
      }
    });
    
    // If we didn't find any topics, return default ones
    if (totalTopicCount === 0) {
      return [
        { topic: "Technology", percentage: 45 },
        { topic: "Privacy", percentage: 30 },
        { topic: "Data Security", percentage: 25 }
      ];
    }
    
    // Convert to percentages
    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({
        topic,
        percentage: Math.round((count / totalTopicCount) * 100)
      }));
  }
  
  /**
   * Generate activity timeline from posts and comments
   */
  private generateActivityTimeline(posts: any[], comments: any[]): Array<{period: string, count: number}> {
    // Group by month
    const timeline: Record<string, number> = {};
    const now = new Date();
    
    // Initialize timeline with the last 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(now);
      date.setMonth(now.getMonth() - i);
      const period = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      timeline[period] = 0;
    }
    
    // Count posts by month
    [...posts, ...comments].forEach(item => {
      if (item.data && item.data.created_utc) {
        const date = new Date(item.data.created_utc * 1000);
        const period = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (timeline[period] !== undefined) {
          timeline[period]++;
        }
      }
    });
    
    // Convert to array and sort by period
    return Object.entries(timeline)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }
  
  /**
   * Generate sentiment breakdown from posts and comments
   */
  private generateSentimentBreakdown(posts: any[], comments: any[]): {positive: number, neutral: number, negative: number} {
    let positive = 0;
    let neutral = 0;
    let negative = 0;
    
    // Analyze posts
    posts.forEach(post => {
      if (post.data) {
        const sentiment = this.analyzeSentiment(post.data.title + ' ' + (post.data.selftext || ''));
        if (sentiment === 'positive') positive++;
        else if (sentiment === 'negative') negative++;
        else neutral++;
      }
    });
    
    // Analyze comments
    comments.forEach(comment => {
      if (comment.data && comment.data.body) {
        const sentiment = this.analyzeSentiment(comment.data.body);
        if (sentiment === 'positive') positive++;
        else if (sentiment === 'negative') negative++;
        else neutral++;
      }
    });
    
    const total = posts.length + comments.length;
    
    if (total === 0) {
      return { positive: 0.33, neutral: 0.34, negative: 0.33 };
    }
    
    // Convert to percentages (as decimal)
    return {
      positive: Number((positive / total).toFixed(2)),
      neutral: Number((neutral / total).toFixed(2)),
      negative: Number((negative / total).toFixed(2))
    };
  }
}

export const redditApi = new RedditApiService();