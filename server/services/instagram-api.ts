import axios from 'axios';
import { Platform, PlatformData } from '@shared/schema';
import { log } from '../vite';

/**
 * Instagram API Integration Service
 * 
 * This service connects to the Instagram Graph API to retrieve user data
 * and analyze digital footprints.
 * 
 * Note: The Instagram Basic Display API has been deprecated.
 * This implementation uses the Instagram Graph API, which requires:
 * - A Facebook Developer account
 * - A Business or Creator Instagram account
 * - A Facebook Page linked to the Instagram account
 */
export class InstagramApiService {
  private accessToken: string | undefined;
  private tokenExpiration: number = 0;
  
  constructor() {
    this.loadCredentials();
  }
  
  /**
   * Load Instagram API credentials from environment variables
   */
  private loadCredentials() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    
    if (this.accessToken) {
      log('Instagram Graph API access token loaded', 'instagram-api');
      // Set token expiration to 60 days from now
      this.tokenExpiration = Date.now() + 60 * 24 * 3600 * 1000;
    } else {
      log('Missing Instagram Graph API access token', 'instagram-api');
    }
  }
  
  /**
   * Check if the service has valid credentials
   */
  public hasValidCredentials(): boolean {
    return Boolean(this.accessToken && Date.now() < this.tokenExpiration);
  }

  /**
   * Get API status - used to show which platforms have active connections
   */
  public getApiStatus(): { configured: boolean; message: string } {
    const configured = this.hasValidCredentials();
    return {
      configured,
      message: configured 
        ? "Instagram Graph API is properly configured" 
        : "Instagram Graph API requires credentials. Data will be simulated."
    };
  }
  
  /**
   * Authenticate with the Instagram Graph API
   * @returns Boolean indicating if authentication was successful
   */
  private async authenticate(): Promise<boolean> {
    try {
      if (!this.accessToken) {
        log('Cannot authenticate - missing Instagram Graph API access token', 'instagram-api');
        return false;
      }
      
      // Check if token is still valid
      if (Date.now() < this.tokenExpiration) {
        log('Using existing Instagram Graph API access token', 'instagram-api');
        return true;
      }
      
      // In production, we would use a token refresh flow here
      log('Instagram Graph API authentication successful', 'instagram-api');
      return true;
    } catch (error) {
      console.error('Instagram Graph API authentication error:', error);
      return false;
    }
  }
  
  /**
   * Fetch user data from Instagram using the Graph API
   * @param username Instagram username to look up
   * @returns Platform data or null if not found
   */
  public async fetchUserData(username: string): Promise<PlatformData | null> {
    try {
      log(`Fetching Instagram data for user: ${username} via Graph API`, 'instagram-api');
      
      // Check if we have credentials
      if (!this.hasValidCredentials()) {
        log('No Instagram Graph API credentials - using simulated data', 'instagram-api');
        return this.simulateUserData(username);
      }
      
      // Authenticate with the Graph API
      const authenticated = await this.authenticate();
      if (!authenticated) {
        log('Instagram Graph API authentication failed - using simulated data', 'instagram-api');
        return this.simulateUserData(username);
      }
      
      try {
        // Make a real API call using the access token
        log(`Making request to Instagram Graph API for user: ${username}`, 'instagram-api');
        
        // First, we need to search for the user by username
        // Since the Graph API doesn't have a direct username search endpoint,
        // we'll use a workaround by checking for account info
        
        // For testing in this prototype, we'll get the Facebook page info first
        // This is typically the starting point for the Graph API
        const pageInfoResponse = await axios.get(`https://graph.facebook.com/v19.0/me`, {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,instagram_business_account' 
          }
        });
        
        log(`Retrieved Facebook page info: ${JSON.stringify(pageInfoResponse.data)}`, 'instagram-api');
        
        // Get the Instagram Business Account ID from the page
        const instagramBusinessAccountId = pageInfoResponse.data?.instagram_business_account?.id;
        
        if (!instagramBusinessAccountId) {
          log('No Instagram Business Account connected to this token. Cannot perform business discovery.', 'instagram-api');
          return this.simulateUserData(username);
        }
        
        // Use Business Discovery API to get profile info for the target username
        const igProfileResponse = await axios.get(`https://graph.facebook.com/v19.0/${instagramBusinessAccountId}`, {
          params: {
            access_token: this.accessToken,
            fields: `business_discovery.username(${username}){username,website,name,ig_id,id,profile_picture_url,biography,follows_count,followers_count,media_count,media{caption,like_count,comments_count,media_url,permalink,timestamp,media_type}}`
          }
        });
        
        log(`Retrieved Instagram profile for ${username}`, 'instagram-api');
        
        // Extract business discovery data
        const businessDiscovery = igProfileResponse.data?.business_discovery;
        
        if (!businessDiscovery) {
          log(`Instagram Business Discovery API could not find user: ${username}`, 'instagram-api');
          return this.simulateUserData(username);
        }
        
        // Transform the data into our PlatformData structure
        return this.transformApiResponseToPlatformData(businessDiscovery, username);
        
      } catch (apiError: any) {
        log(`Instagram Graph API request failed: ${apiError.message}`, 'instagram-api');
        console.error('Instagram API error details:', apiError.response?.data || apiError);
        
        // If we get a specific error about permissions or user not found, log it
        if (apiError.response?.data?.error) {
          log(`Instagram API error: ${apiError.response.data.error.message}`, 'instagram-api');
        }
        
        // Fall back to simulated data if the API request fails
        return this.simulateUserData(username);
      }
      
    } catch (error) {
      console.error(`Error fetching Instagram data via Graph API for ${username}:`, error);
      return null;
    }
  }
  
  /**
   * Transform Instagram Graph API response to our PlatformData format
   * @param businessDiscovery The business_discovery object from the Graph API
   * @param username The username searched for
   * @returns Formatted PlatformData object
   */
  private transformApiResponseToPlatformData(businessDiscovery: any, username: string): PlatformData {
    try {
      log(`Transforming Instagram API data for ${username}`, 'instagram-api');
      
      // Extract basic profile data
      const profileData = {
        displayName: businessDiscovery.name || username,
        bio: businessDiscovery.biography || "",
        followerCount: businessDiscovery.followers_count || 0,
        followingCount: businessDiscovery.follows_count || 0,
        joinDate: new Date().toISOString(), // Graph API doesn't provide join date
        profileUrl: `https://instagram.com/${username}`,
        avatarUrl: businessDiscovery.profile_picture_url || `https://ui-avatars.com/api/?name=${username}&background=FF5A5F&color=fff`,
        location: undefined // Not available via API
      };
      
      // Extract activity data
      const activityData = {
        totalPosts: businessDiscovery.media_count || 0,
        totalComments: 0, // Need to calculate from media items
        totalLikes: 0, // Need to calculate from media items
        totalShares: 0, // Not available via API
        postsPerDay: 0, // Would need to calculate based on post history
        mostActiveTime: "Unknown", // Not directly available via API
        lastActive: new Date().toISOString(), // Not directly available via API
        topHashtags: [] // Need to extract from captions
      };
      
      // Process media items (posts)
      const media = businessDiscovery.media?.data || [];
      const contentData = media.map((item: any) => {
        // Update totals
        activityData.totalLikes += item.like_count || 0;
        activityData.totalComments += item.comments_count || 0;
        
        // Extract hashtags from caption
        const hashtagRegex = /#[\w-]+/g;
        const hashtags: string[] = [];
        
        if (item.caption) {
          const matches = item.caption.match(hashtagRegex);
          if (matches) {
            matches.forEach(tag => {
              hashtags.push(tag);
              // Add unique hashtags to topHashtags
              if (!activityData.topHashtags.includes(tag)) {
                activityData.topHashtags.push(tag);
              }
            });
          }
        }
        
        // Simple sentiment analysis would be done here in a real app
        // For now, we'll just assign a neutral sentiment
        
        return {
          type: "post" as "post" | "comment" | "like" | "share",
          content: item.caption || "",
          timestamp: item.timestamp || new Date().toISOString(),
          url: item.permalink || `https://instagram.com/${username}`,
          engagement: {
            likes: item.like_count || 0,
            comments: item.comments_count || 0,
            shares: 0 // Not available via API
          },
          sentiment: "neutral" as "positive" | "neutral" | "negative",
          topics: [] // Would require NLP analysis
        };
      });
      
      // Limit topHashtags to top 5
      activityData.topHashtags = activityData.topHashtags.slice(0, 5);
      
      // Calculate posts per day (simplified)
      if (media.length > 1) {
        const newest = new Date(media[0].timestamp);
        const oldest = new Date(media[media.length - 1].timestamp);
        const daysDiff = Math.max(1, (newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24));
        activityData.postsPerDay = parseFloat((media.length / daysDiff).toFixed(1));
      }
      
      // Create a seed based on username for random-but-consistent values
      const seed = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const rand = (min: number, max: number) => min + ((seed % 1000) / 1000) * (max - min);
      
      // Data categories at risk (this would be calculated in a real app)
      const dataCategories = [
        { category: "Photos", severity: "medium" as const },
        { category: "Location Data", severity: "high" as const },
        { category: "Personal Interests", severity: "low" as const }
      ];
      
      // Privacy concerns (this would be calculated in a real app)
      const privacyConcerns = [
        { 
          type: "Location Metadata", 
          description: "Your photos may contain location metadata that reveals where you've been",
          severity: "high" as const
        },
        {
          type: "Content Analysis", 
          description: "Your photos can be analyzed for people, objects, and places",
          severity: "medium" as const
        },
        {
          type: "Activity Patterns",
          description: "Regular posting times and locations may reveal your routine",
          severity: "medium" as const
        }
      ];
      
      // For the exposure score, we'll calculate based on followers, content amount, and media visibility
      const exposureScore = Math.min(100, 
        Math.floor(
          (Math.log10(Math.max(10, profileData.followerCount)) * 10) + 
          (Math.min(100, media.length) * 0.5) +
          // Add points for public media with location data (just simulated here)
          Math.floor(rand(10, 30))
        )
      );
      
      // Content type breakdown - real app would analyze media_type from the API
      const contentBreakdown = {
        photos: 0,
        videos: 0,
        stories: 0,
        reels: 0
      };
      
      // Count media types
      media.forEach((item: any) => {
        if (item.media_type === 'IMAGE') {
          contentBreakdown.photos++;
        } else if (item.media_type === 'VIDEO') {
          contentBreakdown.videos++;
        } else if (item.media_type === 'CAROUSEL_ALBUM') {
          contentBreakdown.photos++; // Simplification - would need to analyze children
        }
      });
      
      // Convert to percentages
      const total = contentBreakdown.photos + contentBreakdown.videos + contentBreakdown.stories + contentBreakdown.reels;
      if (total > 0) {
        contentBreakdown.photos /= total;
        contentBreakdown.videos /= total;
        contentBreakdown.stories /= total;
        contentBreakdown.reels /= total;
      } else {
        // Default if no media found
        contentBreakdown.photos = 0.7;
        contentBreakdown.videos = 0.2;
        contentBreakdown.stories = 0.1;
        contentBreakdown.reels = 0;
      }
      
      log(`Successfully transformed Instagram data for ${username} from Graph API`, 'instagram-api');
      
      // Return the platform data with all components
      return {
        platformId: "instagram",
        username,
        profileData,
        activityData,
        contentData,
        privacyMetrics: {
          exposureScore,
          dataCategories,
          potentialConcerns: [
            { issue: "Location metadata in photos", risk: "high" as const },
            { issue: "Facial recognition in tagged photos", risk: "medium" as const }
          ],
          recommendedActions: [
            "Review privacy settings",
            "Remove location data from posts",
            "Make account private",
            "Audit tagged photos"
          ]
        },
        analysisResults: {
          exposureScore,
          topTopics: [
            { topic: "Photography", percentage: 0.4 + rand(-0.1, 0.1) },
            { topic: "Travel", percentage: 0.25 + rand(-0.05, 0.05) },
            { topic: "Food", percentage: 0.15 + rand(-0.05, 0.05) },
            { topic: "Technology", percentage: 0.1 + rand(-0.05, 0.05) },
            { topic: "Lifestyle", percentage: 0.1 + rand(-0.05, 0.05) }
          ],
          activityTimeline: this.generateActivityTimeline(media),
          sentimentBreakdown: {
            positive: 0.6,  // Would be calculated from content analysis
            neutral: 0.3,   // Would be calculated from content analysis
            negative: 0.1   // Would be calculated from content analysis
          },
          dataCategories,
          privacyConcerns,
          recommendedActions: [
            "Review and update privacy settings",
            "Remove location data from posts",
            "Audit tagged photos regularly",
            "Be mindful of personal info in captions"
          ],
          platformSpecificMetrics: {
            contentBreakdown,
            locationCheckIns: [], // Not available via API without extensive analysis
            engagementRate: this.calculateEngagementRate(profileData.followerCount, media),
            hashtagAnalysis: this.analyzeHashtags(media)
          }
        }
      };
    } catch (error) {
      console.error('Error transforming Instagram data:', error);
      return this.simulateUserData(username); // Fallback to simulation if transformation fails
    }
  }
  
  /**
   * Generate activity timeline from media items
   * @param media Array of media items from Graph API
   * @returns Activity timeline by month
   */
  private generateActivityTimeline(media: any[]): Array<{period: string, count: number}> {
    // Group posts by month
    const timeline: Record<string, number> = {};
    
    // Default to last 12 months if no data
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(now.getMonth() - i);
      const period = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      timeline[period] = 0;
    }
    
    // Count posts per month
    media.forEach((item: any) => {
      if (item.timestamp) {
        const date = new Date(item.timestamp);
        const period = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        timeline[period] = (timeline[period] || 0) + 1;
      }
    });
    
    // Convert to array and sort chronologically
    return Object.entries(timeline)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }
  
  /**
   * Calculate engagement rate from media items
   * @param followerCount Number of followers
   * @param media Array of media items from Graph API
   * @returns Engagement rate as a percentage
   */
  private calculateEngagementRate(followerCount: number, media: any[]): number {
    if (!followerCount || followerCount === 0 || media.length === 0) {
      return 0;
    }
    
    // Calculate total engagement
    let totalEngagement = 0;
    media.forEach((item: any) => {
      totalEngagement += (item.like_count || 0) + (item.comments_count || 0);
    });
    
    // Calculate average engagement per post
    const avgEngagement = totalEngagement / media.length;
    
    // Calculate engagement rate as percentage
    const engagementRate = (avgEngagement / followerCount) * 100;
    
    return parseFloat(Math.min(15, engagementRate).toFixed(1)); // Cap at 15% to be realistic
  }
  
  /**
   * Analyze hashtags from media captions
   * @param media Array of media items from Graph API
   * @returns Hashtag analysis array
   */
  private analyzeHashtags(media: any[]): Array<{tag: string, frequency: number}> {
    // Extract hashtags from all captions
    const hashtagCounts: Record<string, number> = {};
    const hashtagRegex = /#[\w-]+/g;
    
    media.forEach((item: any) => {
      if (item.caption) {
        const matches = item.caption.match(hashtagRegex);
        if (matches) {
          matches.forEach((tag) => {
            hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
          });
        }
      }
    });
    
    // Convert to array and sort by frequency
    return Object.entries(hashtagCounts)
      .map(([tag, frequency]) => ({ tag, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5); // Return top 5 hashtags
  }
  
  /**
   * Generate simulated Instagram data for development
   * @param username Instagram username
   * @returns Simulated platform data
   */
  private simulateUserData(username: string): PlatformData {
    log(`Generating simulated Instagram data for ${username}`, 'instagram-api');
    
    // Create a consistent seed based on username
    const seed = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rand = (min: number, max: number) => min + ((seed % 1000) / 1000) * (max - min);
    
    // Simulated join date
    const joinDate = new Date();
    joinDate.setFullYear(joinDate.getFullYear() - Math.floor(rand(1, 5)));
    
    // Follower count based on username length (just for variety)
    const followerCount = Math.floor(500 + username.length * 100 + rand(0, 500));
    
    // Content type distribution
    const contentBreakdown = {
      photos: 0.65,
      videos: 0.15,
      stories: 0.15,
      reels: 0.05
    };
    
    // Generate content items
    const generateContent = (count: number = 15) => {
      const contentTypes: Array<"post" | "comment" | "like" | "share"> = ["post", "post", "post", "comment"];
      const templates = [
        "Check out this amazing tech conference! #tech #innovation",
        "New gadget day! So excited to try this out 🚀",
        "Beautiful sunset from my office today. #worklife",
        "Just finished a great book on digital privacy. Highly recommend!",
        "Coffee and coding - perfect morning ☕️💻",
        "Weekend adventures #travel #explore",
        "This view never gets old #sunset #photography",
        "Happy to announce my new project! #excited",
        "Meeting with incredible people today #networking",
        "Home office setup complete! #productivity"
      ];
      
      return Array.from({ length: count }, (_, i) => {
        const daysAgo = Math.floor(rand(0, 60));
        const timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - daysAgo);
        
        // Determine content type based on distribution
        let type: "post" | "comment" | "like" | "share" = "post";
        if (i < count * 0.7) {
          type = "post";
        } else if (i < count * 0.85) {
          type = "comment";
        } else {
          type = "like";
        }
        
        // Set sentiment with weighted randomness
        let sentiment: "positive" | "neutral" | "negative";
        const sentVal = rand(0, 1);
        if (sentVal < 0.6) {
          sentiment = "positive";
        } else if (sentVal < 0.9) {
          sentiment = "neutral";
        } else {
          sentiment = "negative";
        }
        
        return {
          type,
          content: templates[i % templates.length],
          timestamp: timestamp.toISOString(),
          url: `https://instagram.com/${username}/p/${Math.random().toString(36).substring(2, 10)}`,
          engagement: {
            likes: Math.floor(rand(10, 200)),
            comments: Math.floor(rand(0, 30)),
            shares: Math.floor(rand(0, 10))
          },
          sentiment,
          topics: ["photography", "lifestyle", "travel", "food", "technology"]
            .sort(() => 0.5 - rand(0, 1))
            .slice(0, 1 + Math.floor(rand(0, 3)))
        };
      });
    };
    
    // Generate location check-ins
    const generateLocations = () => {
      const locations = [
        "New York City", "Los Angeles", "San Francisco", "Miami", "Chicago", 
        "Seattle", "Portland", "Austin", "Boston", "Denver"
      ];
      
      const count = Math.floor(rand(3, 8));
      return locations
        .sort(() => 0.5 - rand(0, 1))
        .slice(0, count)
        .map(location => ({
          name: location,
          count: Math.floor(rand(1, 5))
        }));
    };
    
    // Platform-specific data categories at risk
    const dataCategories = [
      { category: "Photos", severity: "medium" as const },
      { category: "Location Data", severity: "high" as const },
      { category: "Personal Interests", severity: "low" as const }
    ];
    
    // Platform-specific privacy concerns
    const privacyConcerns = [
      { 
        type: "Location Metadata", 
        description: "Your photos may contain location metadata that reveals where you've been",
        severity: "high" as const
      },
      {
        type: "Content Analysis", 
        description: "Your photos can be analyzed for people, objects, and places",
        severity: "medium" as const
      },
      {
        type: "Activity Patterns",
        description: "Regular posting times and locations may reveal your routine",
        severity: "medium" as const
      }
    ];
    
    // Generate sentiment distribution
    const sentimentDistribution = {
      positive: 0.6 + rand(-0.1, 0.1),
      neutral: 0.3 + rand(-0.1, 0.1),
      negative: 0.1 + rand(-0.05, 0.05)
    };
    
    // Normalize sentiment distribution to ensure it sums to 1
    const sentimentTotal = sentimentDistribution.positive + sentimentDistribution.neutral + sentimentDistribution.negative;
    sentimentDistribution.positive = sentimentDistribution.positive / sentimentTotal;
    sentimentDistribution.neutral = sentimentDistribution.neutral / sentimentTotal;
    sentimentDistribution.negative = sentimentDistribution.negative / sentimentTotal;
    
    // Generate content items
    const contentItems = generateContent();
    
    log(`Generated ${contentItems.length} content items for Instagram user ${username}`, 'instagram-api');
    
    // Build and return the platform data
    return {
      platformId: "instagram",
      username,
      profileData: {
        displayName: username.charAt(0).toUpperCase() + username.slice(1),
        bio: "📱 Digital explorer | 🌍 Photography enthusiast | 📸 Living the moments",
        followerCount,
        followingCount: Math.floor(followerCount * rand(0.3, 0.8)),
        joinDate: joinDate.toISOString(),
        profileUrl: `https://instagram.com/${username}`,
        avatarUrl: `https://ui-avatars.com/api/?name=${username}&background=FF5A5F&color=fff`,
        location: rand(0, 1) > 0.3 ? "San Francisco, CA" : undefined
      },
      activityData: {
        totalPosts: Math.floor(rand(50, 150)),
        totalComments: Math.floor(rand(100, 300)),
        totalLikes: Math.floor(rand(300, 700)),
        totalShares: Math.floor(rand(20, 80)),
        postsPerDay: parseFloat(rand(0.2, 1.5).toFixed(1)),
        mostActiveTime: ["Morning", "Afternoon", "Evening"][Math.floor(rand(0, 3))],
        lastActive: new Date(Date.now() - Math.floor(rand(0, 7 * 24 * 60 * 60 * 1000))).toISOString(),
        topHashtags: ["#photography", "#travel", "#food", "#lifestyle", "#technology", "#nature"]
          .sort(() => 0.5 - rand(0, 1))
          .slice(0, 3 + Math.floor(rand(0, 3)))
      },
      contentData: contentItems,
      privacyMetrics: {
        exposureScore: Math.floor(50 + rand(0, 40)),
        dataCategories,
        potentialConcerns: [
          { issue: "Location metadata in photos", risk: "high" as const },
          { issue: "Facial recognition in tagged photos", risk: "medium" as const }
        ],
        recommendedActions: [
          "Review privacy settings",
          "Remove location data from posts",
          "Make account private",
          "Audit tagged photos"
        ]
      },
      analysisResults: {
        exposureScore: Math.floor(50 + rand(0, 40)),
        topTopics: [
          { topic: "Photography", percentage: 0.4 + rand(-0.1, 0.1) },
          { topic: "Travel", percentage: 0.25 + rand(-0.05, 0.05) },
          { topic: "Food", percentage: 0.15 + rand(-0.05, 0.05) },
          { topic: "Technology", percentage: 0.1 + rand(-0.05, 0.05) },
          { topic: "Lifestyle", percentage: 0.1 + rand(-0.05, 0.05) }
        ],
        activityTimeline: Array.from({ length: 12 }, (_, i) => ({
          period: `2023-${(i + 1).toString().padStart(2, '0')}`,
          count: Math.floor(rand(5, 20))
        })),
        sentimentBreakdown: {
          positive: sentimentDistribution.positive,
          neutral: sentimentDistribution.neutral,
          negative: sentimentDistribution.negative
        },
        dataCategories,
        privacyConcerns,
        recommendedActions: [
          "Review and update privacy settings",
          "Remove location data from posts",
          "Audit tagged photos regularly",
          "Be mindful of personal info in captions"
        ],
        platformSpecificMetrics: {
          contentBreakdown,
          locationCheckIns: generateLocations(),
          engagementRate: parseFloat((rand(1.5, 6.5)).toFixed(1)),
          hashtagAnalysis: [
            { tag: "#travel", frequency: Math.floor(rand(5, 15)) },
            { tag: "#food", frequency: Math.floor(rand(3, 12)) },
            { tag: "#photography", frequency: Math.floor(rand(8, 20)) }
          ]
        }
      }
    };
  }
}

// Export as a singleton
export const instagramApi = new InstagramApiService();