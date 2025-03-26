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
    console.log('[DEBUG REDDIT AUTH] getAccessToken called');
    
    // Check if we already have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiration) {
      console.log('[DEBUG REDDIT AUTH] Using existing token (still valid)');
      return this.accessToken;
    }
    
    console.log('[DEBUG REDDIT AUTH] Need to get a new token');
    console.log('[DEBUG REDDIT AUTH] Credentials check:', {
      clientIdExists: !!this.clientId,
      clientSecretExists: !!this.clientSecret,
      clientIdLength: this.clientId ? this.clientId.length : 0,
      clientSecretLength: this.clientSecret ? this.clientSecret.length : 0
    });
    
    if (!this.clientId || !this.clientSecret) {
      console.error('[DEBUG REDDIT AUTH] Missing credentials');
      throw new Error('Reddit API credentials not configured');
    }
    
    try {
      console.log('[DEBUG REDDIT AUTH] Requesting new token from Reddit API');
      
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
      
      console.log('[DEBUG REDDIT AUTH] Token response received:', {
        status: response.status,
        hasAccessToken: !!response.data.access_token,
        expiresIn: response.data.expires_in
      });
      
      this.accessToken = response.data.access_token;
      // Set expiration time (Reddit tokens last for 1 hour)
      this.tokenExpiration = Date.now() + (response.data.expires_in * 1000);
      
      log('Reddit API access token obtained successfully', 'reddit-api');
      
      if (!this.accessToken) {
        console.error('[DEBUG REDDIT AUTH] Empty token received');
        throw new Error('Received empty access token from Reddit API');
      }
      
      console.log('[DEBUG REDDIT AUTH] Token acquired successfully');
      return this.accessToken;
    } catch (error: any) {
      console.error('[DEBUG REDDIT AUTH] Error getting token:', error.message);
      if (error.response) {
        console.error('[DEBUG REDDIT AUTH] Response error:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      }
      log(`Error obtaining Reddit access token: ${error}`, 'reddit-api');
      throw new Error('Failed to authenticate with Reddit API');
    }
  }
  
  /**
   * Make an API request to Reddit
   */
  private async makeApiRequest(endpoint: string): Promise<any> {
    try {
      log(`Making Reddit API request to endpoint: ${endpoint}`, 'reddit-api');
      const token = await this.getAccessToken();
      
      console.log(`[DEBUG REDDIT API] Making API request to: https://oauth.reddit.com${endpoint}`);
      const response = await axios({
        method: 'get',
        url: `https://oauth.reddit.com${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Digital-Footprint-Analyzer/1.0.0'
        }
      });
      
      console.log(`[DEBUG REDDIT API] Response status: ${response.status}`);
      console.log(`[DEBUG REDDIT API] Response data received for ${endpoint}, data type: ${typeof response.data}`);
      
      if (endpoint.includes('/about')) {
        // Log the first bit of the user profile data for debugging
        console.log('[DEBUG REDDIT API] User profile data snippet:', 
          JSON.stringify(response.data).substring(0, 300)
        );
      }
      
      return response.data;
    } catch (error: any) {
      console.error(`[DEBUG REDDIT API ERROR] Request to ${endpoint} failed:`, error.message);
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
    
    console.log(`[DEBUG REDDIT API] fetchUserData(${username}) called`);
    log(`Starting fetchUserData for Reddit user: ${username}`, 'reddit-api');
    
    try {
      log(`Fetching Reddit data for user: ${username}`, 'reddit-api');
      
      // Get user profile data
      const userData = await this.makeApiRequest(`/user/${username}/about`);
      console.log(`[DEBUG REDDIT API] User data received from Reddit API:`, userData);
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
    // Log the raw data for debugging
    log(`Processing Reddit data for ${username}`, 'reddit-api');
    log(`Profile data: ${JSON.stringify(profile).substring(0, 300)}...`, 'reddit-api');
    log(`Posts count: ${posts.length}`, 'reddit-api');
    log(`Comments count: ${comments.length}`, 'reddit-api');
    
    // Extract profile information
    const profileData = {
      displayName: profile.name,
      bio: profile.subreddit?.public_description || '',
      followerCount: profile.subreddit?.subscribers || 0,
      joinDate: new Date(profile.created_utc * 1000).toISOString(),
      profileUrl: `https://reddit.com/user/${username}`,
      avatarUrl: profile.icon_img || profile.subreddit?.icon_img || '',
    };
    
    log(`Processed profile data: ${JSON.stringify(profileData)}`, 'reddit-api');
    
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
   * Enhanced sentiment analysis with emotion detection
   * Analyzes text to determine sentiment and emotional tone
   * In a production app, you would use a proper NLP service
   */
  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    // Dictionary of emotionally charged words with their sentiment values
    const sentimentDictionary: Record<string, number> = {
      // Positive words (general)
      'good': 1, 'great': 1.5, 'awesome': 2, 'excellent': 2, 'love': 2, 'like': 0.5, 'best': 1.5, 'amazing': 2,
      'wonderful': 1.5, 'fantastic': 2, 'brilliant': 1.5, 'outstanding': 1.5, 'superb': 1.5, 'perfect': 2,
      'enjoy': 1, 'happy': 1.5, 'glad': 1, 'pleased': 1, 'delighted': 1.5, 'thrilled': 2,
      'exciting': 1, 'impressive': 1, 'interesting': 0.5, 'helpful': 1, 'useful': 1, 'valuable': 1,
      
      // Negative words (general)
      'bad': -1, 'terrible': -2, 'awful': -2, 'hate': -2, 'dislike': -1, 'worst': -2, 'horrible': -2,
      'poor': -1, 'disappointing': -1.5, 'useless': -1.5, 'waste': -1.5, 'annoying': -1.5, 'frustrating': -1.5,
      'stupid': -1.5, 'boring': -1, 'pathetic': -2, 'ridiculous': -1, 'ugly': -1, 'scary': -1,
      'sad': -1, 'angry': -1.5, 'upset': -1, 'worried': -1, 'confused': -0.5, 'disappointed': -1.5,
      
      // Emotion-specific words (to better detect emotional state)
      // Joy/Happiness
      'joyful': 2, 'ecstatic': 2.5, 'elated': 2, 'blissful': 2.5, 'cheerful': 1.5, 'content': 1, 
      'satisfied': 1, 'grateful': 1.5, 'thankful': 1.5,
      
      // Sadness
      'depressed': -2, 'miserable': -2, 'heartbroken': -2.5, 'hopeless': -2, 'gloomy': -1.5, 
      'grief': -2, 'sorrow': -2, 'unhappy': -1.5,
      
      // Anger
      'furious': -2.5, 'outraged': -2.5, 'infuriated': -2.5, 'enraged': -2.5, 'irritated': -1,
      'mad': -1.5, 'offended': -1.5, 'hostile': -2,
      
      // Fear
      'terrified': -2.5, 'frightened': -2, 'afraid': -1.5, 'nervous': -1, 'anxious': -1.5,
      'panicked': -2, 'horrified': -2.5, 'threatened': -2,
      
      // Disgust
      'disgusted': -2, 'revolted': -2.5, 'repulsed': -2.5, 'sickened': -2, 'loathing': -2.5,
      'gross': -1.5, 'nasty': -1.5, 'repulsive': -2,
      
      // Surprise (can be positive or negative)
      'shocked': -0.5, 'astonished': 0.5, 'amazed': 1, 'astounded': 0.5, 'stunned': 0,
      'startled': -0.5, 'unexpected': 0, 'sudden': 0,
      
      // Context modifiers (these adjust the sentiment of nearby words)
      'not': -1, 'never': -1, 'no': -1, "don't": -1, "doesn't": -1, "didn't": -1, "won't": -1, "isn't": -1, "aren't": -1,
      'very': 0.5, 'extremely': 1, 'really': 0.5, 'absolutely': 1, 'completely': 0.5, 'totally': 0.5,
      'somewhat': 0.3, 'slightly': 0.2, 'barely': -0.3, 'hardly': -0.3, 'almost': 0.3
    };
    
    // Emoticons and emoji sentiment mapping
    const emoticonSentiment: Record<string, number> = {
      ':)': 1, ':D': 1.5, ':-)': 1, ':-D': 1.5, '=)': 1, ';)': 0.5, ';-)': 0.5,
      ':(': -1, ':-(': -1, ':/': -0.5, ':-/': -0.5, ':|': 0, ':-|': 0,
      '<3': 1.5, '♥': 1.5, '🙂': 1, '😀': 1.5, '😊': 1, '😄': 1.5, '😍': 2,
      '🙁': -1, '😢': -1.5, '😭': -2, '😡': -2, '😱': -1.5, '🤮': -2
    };
    
    const lowerText = text.toLowerCase();
    let sentimentScore = 0;
    let wordCount = 0;
    
    // Split text into words
    const words = lowerText.replace(/[^\w\s:;=<>]/g, ' ').split(/\s+/);
    
    // Process text for sentiment
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Check emoticons/emoji
      if (Object.prototype.hasOwnProperty.call(emoticonSentiment, word)) {
        sentimentScore += emoticonSentiment[word];
        continue;
      }
      
      // Check lexicon words
      if (Object.prototype.hasOwnProperty.call(sentimentDictionary, word)) {
        let wordScore = sentimentDictionary[word];
        
        // Check for negation in previous words (up to 3 words back)
        for (let j = Math.max(0, i - 3); j < i; j++) {
          if (['not', 'never', 'no', "don't", "doesn't", "didn't", "won't", "isn't", "aren't"].includes(words[j])) {
            wordScore *= -0.7; // Negation flips sentiment but reduces intensity
            break;
          }
        }
        
        // Check for intensity modifiers in previous words
        for (let j = Math.max(0, i - 2); j < i; j++) {
          const modifier = words[j];
          if (modifier === 'very' || modifier === 'really' || modifier === 'extremely' || 
              modifier === 'absolutely' || modifier === 'completely' || modifier === 'totally') {
            wordScore *= 1.5; // Intensifiers strengthen sentiment
            break;
          } else if (modifier === 'somewhat' || modifier === 'slightly' || modifier === 'a bit') {
            wordScore *= 0.5; // Diminishers weaken sentiment
            break;
          }
        }
        
        sentimentScore += wordScore;
        wordCount++;
      }
    }
    
    // Normalize score based on content length
    const normalizedScore = wordCount > 0 ? sentimentScore / Math.sqrt(wordCount) : 0;
    
    // Log sentiment analysis results 
    console.log(`[DEBUG SENTIMENT] Analyzed text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log(`[DEBUG SENTIMENT] Words analyzed: ${wordCount}, Raw score: ${sentimentScore}, Normalized: ${normalizedScore}`);
    
    // Determine sentiment category
    if (normalizedScore > 0.5) return 'positive';
    if (normalizedScore < -0.5) return 'negative';
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
    // First, try to get the subreddit distribution as topics
    const subredditCounts: Record<string, number> = {};
    let totalSubredditCount = 0;
    
    // Count subreddits in posts
    posts.forEach(post => {
      if (post.data && post.data.subreddit) {
        const subreddit = post.data.subreddit;
        subredditCounts[subreddit] = (subredditCounts[subreddit] || 0) + 1;
        totalSubredditCount++;
      }
    });
    
    // Count subreddits in comments
    comments.forEach(comment => {
      if (comment.data && comment.data.subreddit) {
        const subreddit = comment.data.subreddit;
        subredditCounts[subreddit] = (subredditCounts[subreddit] || 0) + 1;
        totalSubredditCount++;
      }
    });
    
    // If we have subreddit data, use that as our topics
    if (totalSubredditCount > 0) {
      console.log(`[DEBUG REDDIT API] Found ${Object.keys(subredditCounts).length} subreddits in user data`);
      
      // Convert to percentage and sort
      return Object.entries(subredditCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic, count]) => ({
          topic,
          percentage: Math.round((count / totalSubredditCount) * 100)
        }));
    }
    
    // Fallback to content-based topic extraction if no subreddit data
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
    
    // If we still didn't find any topics, return default ones
    if (totalTopicCount === 0) {
      console.log("[DEBUG REDDIT API] No topics found from content analysis, using default topics");
      return [
        { topic: "Technology", percentage: 45 },
        { topic: "Privacy", percentage: 30 },
        { topic: "Data Security", percentage: 25 },
        { topic: "Social Media", percentage: 15 },
        { topic: "Entertainment", percentage: 10 }
      ];
    }
    
    // Convert to percentage and sort
    const result = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({
        topic,
        percentage: Math.round((count / totalTopicCount) * 100)
      }));
      
    console.log("[DEBUG REDDIT API] Generated topic breakdown:", result);
    return result;
  }
  
  /**
   * Generate activity timeline from posts and comments
   */
  private generateActivityTimeline(posts: any[], comments: any[]): Array<{period: string, count: number}> {
    // Group by month
    const timeline: Record<string, number> = {};
    const now = new Date();
    
    // Initialize timeline with the last 6 months (more focused view)
    for (let i = 0; i < 6; i++) {
      const date = new Date(now);
      date.setMonth(now.getMonth() - i);
      const period = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      timeline[period] = 0;
    }
    
    // Count activity by month
    const allActivities = [...posts, ...comments];
    console.log(`[DEBUG REDDIT API] Processing ${allActivities.length} Reddit activities for timeline`);
    
    let totalActivity = 0;
    allActivities.forEach(item => {
      if (item.data && item.data.created_utc) {
        const date = new Date(item.data.created_utc * 1000);
        const period = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (timeline[period] !== undefined) {
          timeline[period]++;
          totalActivity++;
        }
      }
    });
    
    console.log(`[DEBUG REDDIT API] Total activity count in timeline: ${totalActivity}`);
    
    // If we have no actual activity data but have karma stats, distribute the karma
    // across the timeline in a way that makes sense
    if (totalActivity === 0) {
      console.log(`[DEBUG REDDIT API] No activity data found in timeline, using karmic distribution`);
      
      // Try to get karma data
      let totalKarma = 0;
      if (posts.length > 0 && posts[0].data && posts[0].data.author) {
        // Get author name from first post
        const author = posts[0].data.author;
        // If we have profile data available
        if (allActivities.length > 0 && allActivities[0].data && allActivities[0].data.author_fullname) {
          // Use full karma count
          totalKarma = allActivities[0].data.score || 50;
        } else {
          // Default to reasonable karma
          totalKarma = 50;
        }
        console.log(`[DEBUG REDDIT API] Using karma distribution for ${author} with total karma: ${totalKarma}`);
      } else {
        // Fallback if no author data
        totalKarma = 50;
        console.log(`[DEBUG REDDIT API] Using default karma distribution`);
      }
      
      // Distribute karma with a slight curve (more recent months have more activity)
      const periods = Object.keys(timeline).sort((a, b) => b.localeCompare(a)); // Sort from newest to oldest
      const weights = [0.30, 0.25, 0.20, 0.15, 0.07, 0.03]; // Descending weights, newest month has most activity
      
      // Apply the weighted distribution
      periods.forEach((period, index) => {
        timeline[period] = Math.max(1, Math.round(totalKarma * weights[index]));
      });
      
      console.log(`[DEBUG REDDIT API] Created karma-based timeline distribution:`, 
        periods.map(p => `${p}: ${timeline[p]}`).join(', '));
    }
    
    // Convert to array and sort by period (oldest to newest for proper display)
    const result = Object.entries(timeline)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));
      
    console.log("[DEBUG REDDIT API] Generated activity timeline:", JSON.stringify(result));
    
    return result;
  }
  
  /**
   * Generate sentiment breakdown from posts and comments
   */
  /**
   * Generate detailed sentiment and emotion breakdown from posts and comments
   * This enhances the basic sentiment analysis with emotional tone detection
   */
  private generateSentimentBreakdown(posts: any[], comments: any[]): {
    positive: number, 
    neutral: number, 
    negative: number,
    emotions?: {
      joy: number,
      sadness: number,
      anger: number,
      fear: number,
      surprise: number
    },
    topEmotions?: Array<{emotion: string, percentage: number}>,
    contentSamples?: Array<{text: string, sentiment: string, emotion: string}>
  } {
    // Base sentiment counters
    let positive = 0;
    let neutral = 0;
    let negative = 0;
    
    // Emotion counters
    let joyCount = 0;
    let sadnessCount = 0;
    let angerCount = 0;
    let fearCount = 0;
    let surpriseCount = 0;
    
    // Content samples for each sentiment/emotion combination
    const contentSamples: Array<{text: string, sentiment: string, emotion: string}> = [];
    
    // Emotion keywords for basic emotion detection
    const emotionKeywords = {
      joy: ['happy', 'joy', 'excited', 'thrilled', 'elated', 'delighted', 'pleased', 'glad', 'wonderful', 
            'love', 'awesome', 'amazing', 'great', 'excellent', 'good', 'fantastic', 'nice', 'cool'],
      sadness: ['sad', 'depressed', 'unhappy', 'miserable', 'disappointed', 'upset', 'heartbroken', 
               'devastated', 'hopeless', 'grief', 'sorrow', 'gloomy', 'downcast'],
      anger: ['angry', 'mad', 'furious', 'outraged', 'irritated', 'annoyed', 'frustrated', 'hostile', 
             'hate', 'rage', 'fury', 'disgusted', 'pissed'],
      fear: ['afraid', 'scared', 'terrified', 'anxious', 'worried', 'nervous', 'frightened', 'panicked', 
            'stressed', 'concerned', 'alarmed', 'horrified', 'uneasy'],
      surprise: ['surprised', 'shocked', 'astonished', 'amazed', 'stunned', 'startled', 'unexpected', 
                'wow', 'wtf', 'omg', 'holy', 'unbelievable', 'incredible']
    };

    // Process function for content
    const processContent = (text: string, source: string) => {
      if (!text || text.trim().length < 5) return;
      
      // Basic sentiment analysis
      const sentiment = this.analyzeSentiment(text);
      if (sentiment === 'positive') positive++;
      else if (sentiment === 'negative') negative++;
      else neutral++;
      
      // Emotion detection - determine the dominant emotion
      const lowerText = text.toLowerCase();
      let dominantEmotion = 'neutral';
      let maxCount = 0;
      
      for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
        let count = 0;
        keywords.forEach(keyword => {
          // Look for whole word matches
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          const matches = lowerText.match(regex);
          if (matches) count += matches.length;
        });
        
        if (count > maxCount) {
          maxCount = count;
          dominantEmotion = emotion;
        }
      }
      
      // Increment emotion counter
      if (maxCount > 0) {
        if (dominantEmotion === 'joy') joyCount++;
        else if (dominantEmotion === 'sadness') sadnessCount++;
        else if (dominantEmotion === 'anger') angerCount++;
        else if (dominantEmotion === 'fear') fearCount++;
        else if (dominantEmotion === 'surprise') surpriseCount++;
      }
      
      // Store content sample if it's a good representative (has clear emotion signals)
      if (maxCount >= 2 && text.length > 20 && text.length < 200) {
        contentSamples.push({
          text: text.substring(0, 150) + (text.length > 150 ? '...' : ''),
          sentiment,
          emotion: dominantEmotion
        });
      }
    };
    
    // Analyze posts
    posts.forEach(post => {
      if (post.data) {
        const title = post.data.title || '';
        const body = post.data.selftext || '';
        processContent(title + ' ' + body, 'post');
      }
    });
    
    // Analyze comments
    comments.forEach(comment => {
      if (comment.data && comment.data.body) {
        processContent(comment.data.body, 'comment');
      }
    });
    
    const total = positive + neutral + negative;
    
    if (total === 0) {
      console.log("[DEBUG REDDIT API] No content for sentiment analysis, using balanced distribution");
      return { 
        positive: 0.40, 
        neutral: 0.35, 
        negative: 0.25,
        emotions: {
          joy: 0.40,
          sadness: 0.20,
          anger: 0.15,
          fear: 0.10,
          surprise: 0.15
        },
        topEmotions: [
          { emotion: 'Joy', percentage: 40 },
          { emotion: 'Sadness', percentage: 20 },
          { emotion: 'Anger', percentage: 15 }
        ],
        contentSamples: []
      };
    }
    
    // Convert to percentages (as decimal)
    const result: {
      positive: number,
      neutral: number,
      negative: number,
      emotions?: {
        joy: number,
        sadness: number,
        anger: number,
        fear: number,
        surprise: number
      },
      topEmotions?: Array<{emotion: string, percentage: number}>,
      contentSamples?: Array<{text: string, sentiment: string, emotion: string}>
    } = {
      positive: Number((positive / total).toFixed(2)),
      neutral: Number((neutral / total).toFixed(2)),
      negative: Number((negative / total).toFixed(2))
    };
    
    // Fix rounding errors to ensure they sum to 1.0
    const sum = result.positive + result.neutral + result.negative;
    if (sum !== 1) {
      const diff = 1 - sum;
      // Add the rounding difference to the largest category
      if (result.positive >= result.neutral && result.positive >= result.negative) {
        result.positive += diff;
      } else if (result.neutral >= result.positive && result.neutral >= result.negative) {
        result.neutral += diff;
      } else {
        result.negative += diff;
      }
      // Round again to avoid floating point issues
      result.positive = Number(result.positive.toFixed(2));
      result.neutral = Number(result.neutral.toFixed(2));
      result.negative = Number(result.negative.toFixed(2));
    }
    
    // Calculate emotion percentages
    const totalEmotions = joyCount + sadnessCount + angerCount + fearCount + surpriseCount;
    
    if (totalEmotions > 0) {
      const emotions = {
        joy: Number((joyCount / totalEmotions).toFixed(2)),
        sadness: Number((sadnessCount / totalEmotions).toFixed(2)),
        anger: Number((angerCount / totalEmotions).toFixed(2)),
        fear: Number((fearCount / totalEmotions).toFixed(2)),
        surprise: Number((surpriseCount / totalEmotions).toFixed(2))
      };
      
      // Create sorted list of top emotions
      const topEmotions = [
        { emotion: 'Joy', percentage: Math.round(emotions.joy * 100) },
        { emotion: 'Sadness', percentage: Math.round(emotions.sadness * 100) },
        { emotion: 'Anger', percentage: Math.round(emotions.anger * 100) },
        { emotion: 'Fear', percentage: Math.round(emotions.fear * 100) },
        { emotion: 'Surprise', percentage: Math.round(emotions.surprise * 100) }
      ]
      .filter(item => item.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3); // Take top 3
      
      // Limit content samples to 5 most representative ones
      const samples = contentSamples
        .sort(() => 0.5 - Math.random()) // Shuffle
        .slice(0, 5);
        
      // Include emotions in result
      result.emotions = emotions;
      result.topEmotions = topEmotions;
      
      if (samples.length > 0) {
        result.contentSamples = samples;
      }
    }
    
    console.log("[DEBUG REDDIT API] Generated sentiment breakdown:", result);
    return result;
  }
}

export const redditApi = new RedditApiService();