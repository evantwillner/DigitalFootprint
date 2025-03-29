import axios from 'axios';
import { PlatformData, Platform } from '@shared/schema';
import { log } from '../vite';

/**
 * Instagram API Integration Service
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

    username = username.replace('@', ''); // Remove @ if present

    log(`Fetching Instagram data for ${username} via Graph API`, 'instagram-api');
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
      
      // Create basic profile data
      const profileData = {
        displayName: businessDiscovery.name || username,
        bio: businessDiscovery.biography || "",
        followerCount: businessDiscovery.followers_count || 0,
        followingCount: businessDiscovery.follows_count || 0,
        joinDate: new Date().toISOString(),
        profileUrl: `https://instagram.com/${username}`,
        avatarUrl: businessDiscovery.profile_picture_url || `https://ui-avatars.com/api/?name=${username}&background=FF5A5F&color=fff`,
        location: undefined
      };
      
      // Create activity data
      const activityData = {
        totalPosts: businessDiscovery.media_count || 0,
        totalComments: 0,
        totalLikes: 0,
        totalShares: 0,
        postsPerDay: 0,
        mostActiveTime: "Unknown",
        lastActive: new Date().toISOString(),
        topHashtags: [] as string[]
      };
      
      // Process media items (if present)
      const media = businessDiscovery.media?.data || [];
      
      // Create content data
      const contentData = [];
      
      // Extract hashtags from captions
      const hashtagRegex = /#[\w-]+/g;
      const allHashtags: Record<string, number> = {};
      
      for (const item of media) {
        // Count likes and comments
        activityData.totalLikes += item.like_count || 0;
        activityData.totalComments += item.comments_count || 0;
        
        // Extract hashtags
        if (item.caption) {
          const matches = item.caption.match(hashtagRegex);
          if (matches) {
            matches.forEach((tag: string) => {
              allHashtags[tag] = (allHashtags[tag] || 0) + 1;
            });
          }
        }
        
        // Add to content data
        contentData.push({
          type: "post",
          content: item.caption || "",
          timestamp: item.timestamp || new Date().toISOString(),
          url: item.permalink || `https://instagram.com/${username}`,
          engagement: {
            likes: item.like_count || 0,
            comments: item.comments_count || 0,
            shares: 0
          },
          sentiment: "neutral",
          topics: []
        });
      }
      
      // Get top hashtags
      activityData.topHashtags = Object.entries(allHashtags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag);
      
      // Calculate posts per day if there are posts
      if (media.length > 1) {
        const newest = new Date(media[0].timestamp);
        const oldest = new Date(media[media.length - 1].timestamp);
        const daysDiff = Math.max(1, (newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24));
        activityData.postsPerDay = parseFloat((media.length / daysDiff).toFixed(1));
      }
      
      // Create activity timeline
      const timeline: Record<string, number> = {};
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
      
      // Convert to array and sort
      const activityTimeline = Object.entries(timeline)
        .map(([period, count]) => ({ period, count }))
        .sort((a, b) => a.period.localeCompare(b.period));
      
      // Calculate engagement rate
      const engagementRate = 
        media.length > 0 && profileData.followerCount > 0 
          ? parseFloat((((activityData.totalLikes + activityData.totalComments) / media.length / profileData.followerCount) * 100).toFixed(1))
          : 0;
      
      // Create content type breakdown
      const contentTypes = {
        photos: 0,
        videos: 0,
        stories: 0,
        reels: 0
      };
      
      media.forEach((item: any) => {
        if (item.media_type === 'IMAGE') {
          contentTypes.photos++;
        } else if (item.media_type === 'VIDEO') {
          contentTypes.videos++;
        } else if (item.media_type === 'CAROUSEL_ALBUM') {
          contentTypes.photos++;
        }
      });
      
      // Convert to percentages
      const totalContent = contentTypes.photos + contentTypes.videos + contentTypes.stories + contentTypes.reels;
      const contentBreakdown = {
        photos: totalContent > 0 ? contentTypes.photos / totalContent : 0.7,
        videos: totalContent > 0 ? contentTypes.videos / totalContent : 0.2,
        stories: totalContent > 0 ? contentTypes.stories / totalContent : 0.1,
        reels: totalContent > 0 ? contentTypes.reels / totalContent : 0
      };
      
      // Create hashtag analysis
      const hashtagAnalysis = Object.entries(allHashtags)
        .map(([tag, frequency]) => ({ tag, frequency }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5);
      
      // Create data categories
      const dataCategories = [
        { category: "Photos", severity: "medium" as const },
        { category: "Location Data", severity: "high" as const },
        { category: "Personal Interests", severity: "low" as const }
      ];
      
      // Create privacy concerns
      const privacyConcerns = [
        { issue: "Location metadata in photos", risk: "high" as const },
        { issue: "Facial recognition in tagged photos", risk: "medium" as const }
      ];
      
      // Calculate exposure score
      const exposureScore = Math.min(100, 
        Math.floor(
          (Math.log10(Math.max(10, profileData.followerCount)) * 10) + 
          (Math.min(100, media.length) * 0.5) + 20
        )
      );
      
      // Create top topics (simplified)
      const topTopics = [
        { topic: "Photography", percentage: 0.4 },
        { topic: "Travel", percentage: 0.25 },
        { topic: "Food", percentage: 0.15 },
        { topic: "Technology", percentage: 0.1 },
        { topic: "Lifestyle", percentage: 0.1 }
      ];
      
      // Return the platform data
      return {
        platformId: "instagram",
        username,
        profileData,
        activityData,
        contentData,
        privacyMetrics: {
          exposureScore,
          dataCategories,
          potentialConcerns: privacyConcerns,
          recommendedActions: [
            "Review privacy settings",
            "Remove location data from posts",
            "Make account private",
            "Audit tagged photos"
          ]
        },
        analysisResults: {
          exposureScore,
          topTopics,
          activityTimeline,
          sentimentBreakdown: {
            positive: 0.6,
            neutral: 0.3,
            negative: 0.1
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
            locationCheckIns: [],
            engagementRate,
            hashtagAnalysis
          }
        }
      };
        
    } catch (error) {
      console.error(`Error fetching Instagram data via Graph API for ${username}:`, error);
      // Return null to indicate no data is available
      return null;
    }
  }
}

// Export as a singleton
export const instagramApi = new InstagramApiService();