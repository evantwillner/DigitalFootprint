import axios from 'axios';
import { PlatformData, Platform } from '@shared/schema';
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
      log('Instagram API access token loaded', 'instagram-api');
      this.tokenExpiration = Date.now() + (30 * 24 * 60 * 60 * 1000); // Set to expire in 30 days
    } else {
      log('Instagram API access token not found in environment variables', 'instagram-api');
    }
  }

  /**
   * Check if the service has valid credentials
   */
  public hasValidCredentials(): boolean {
    // Check if we have the token and it's not expired
    return !!this.accessToken && Date.now() < this.tokenExpiration;
  }

  /**
   * Get API status - used to show which platforms have active connections
   */
  public getApiStatus(): { configured: boolean; message: string } {
    if (this.hasValidCredentials()) {
      return { 
        configured: true, 
        message: "Instagram API connection configured and ready" 
      };
    } else {
      return { 
        configured: false, 
        message: "Instagram API connection not configured. Access token missing." 
      };
    }
  }

  /**
   * Fetch user data from Instagram using the Graph API
   * @param username Instagram username to look up
   * @returns Platform data or null if not found
   */
  public async fetchUserData(username: string): Promise<PlatformData | null> {
    if (!this.hasValidCredentials()) {
      log('Cannot fetch Instagram data: no valid credentials', 'instagram-api');
      return null;
    }

    log(`Fetching Instagram data for ${username} via Graph API`, 'instagram-api');
    try {
      try {
        // First, get the page ID using the access token
        const pageInfoResponse = await axios.get('https://graph.facebook.com/v19.0/me', {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,instagram_business_account'
          }
        });
        
        // Get the Instagram Business Account ID from the page
        const instagramBusinessAccountId = pageInfoResponse.data?.instagram_business_account?.id;
        
        if (!instagramBusinessAccountId) {
          log('No Instagram Business Account connected to this token. Cannot perform business discovery.', 'instagram-api');
          return null;
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
          return null;
        }
        
        // Transform the data into our PlatformData structure
        try {
          return this.transformApiResponseToPlatformData(businessDiscovery, username);
        } catch (transformError) {
          log(`Error transforming Instagram data: ${transformError}`, 'instagram-api');
          console.error('Error in transformApiResponseToPlatformData:', transformError);
          return null;
        }
        
      } catch (apiError: any) {
        log(`Instagram Graph API request failed: ${apiError.message}`, 'instagram-api');
        console.error('Instagram API error details:', apiError.response?.data || apiError);
        
        // If we get a specific error about permissions or user not found, log it
        if (apiError.response?.data?.error) {
          log(`Instagram API error: ${apiError.response.data.error.message}`, 'instagram-api');
        }
        
        // Return null to indicate no data is available
        return null;
      }
      
    } catch (error) {
      console.error(`Error fetching Instagram data via Graph API for ${username}:`, error);
      // Return null to indicate no data is available
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
      topHashtags: [] as string[] // Need to extract from captions
    };
    
    // Process media items (posts)
    const media = businessDiscovery.media?.data || [];
    
    // Handle accounts with no posts
    if (media.length === 0) {
      log(`Instagram user ${username} has no posts to analyze`, 'instagram-api');
    }
    
    // Initialize contentData as empty array for accounts with no posts
    let contentData: any[] = [];
    
    if (media.length > 0) {
      contentData = media.map((item: any) => {
      // Update totals
      activityData.totalLikes += item.like_count || 0;
      activityData.totalComments += item.comments_count || 0;
      
      // Extract hashtags from caption
      const hashtagRegex = /#[\w-]+/g;
      const hashtags: string[] = [];
      
      if (item.caption) {
        const matches = item.caption.match(hashtagRegex);
        if (matches) {
          matches.forEach((tag: string) => {
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
        activityTimeline: this.buildActivityTimeline(media),
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
  }

  /**
   * Generate activity timeline from media items
   * @param media Array of media items from Graph API
   * @returns Activity timeline by month
   */
  private buildActivityTimeline(media: any[]): Array<{period: string, count: number}> {
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
          matches.forEach((tag: string) => {
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
}

// Export as a singleton
export const instagramApi = new InstagramApiService();