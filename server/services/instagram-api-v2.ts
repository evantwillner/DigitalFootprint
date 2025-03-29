import axios from 'axios';
import { PlatformData, Platform } from '@shared/schema';
import { log } from '../vite';
import { instagramOAuth } from './instagram-oauth';

/**
 * Instagram API Integration Service with support for different account types
 * 
 * This service combines multiple approaches to retrieve Instagram data:
 * 1. Instagram Graph API (for business/creator accounts)
 * 2. Public Data API endpoints (for any public Instagram account)
 * 3. Instagram Basic Display API (for personal accounts with OAuth authorization)
 */
export class InstagramApiService {
  constructor() {
    // Constructor is now minimal as the OAuth service handles token management
    log('Instagram API service initialized', 'instagram-api');
  }

  /**
   * Check if the service has valid credentials
   */
  public hasValidCredentials(): boolean {
    // Either we have a valid token through the OAuth service
    // or the OAuth service itself is properly configured for auth flow
    return instagramOAuth.hasValidToken() || instagramOAuth.isConfigured();
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
        message: "Instagram API connection not configured. Required credentials missing." 
      };
    }
  }

  /**
   * Fetch user data from Instagram using available methods
   * @param username Instagram username to look up (with or without @)
   * @returns Platform data or null if not found
   */
  public async fetchUserData(username: string): Promise<PlatformData | null> {
    if (!this.hasValidCredentials()) {
      log('Cannot fetch Instagram data: no valid credentials', 'instagram-api');
      return null;
    }

    // Remove @ if present
    username = username.replace('@', '');
    
    log(`Fetching Instagram data for ${username}`, 'instagram-api');
    
    try {
      // Try different approaches in order of reliability
      
      // 1. First try Graph API if we have access token via OAuth
      const accessToken = instagramOAuth.getAccessToken();
      if (accessToken) {
        try {
          const graphApiData = await this.fetchViaGraphApi(username, accessToken);
          if (graphApiData) {
            log(`Successfully retrieved data for ${username} via Graph API`, 'instagram-api');
            return graphApiData;
          }
        } catch (error) {
          log(`Error fetching via Graph API: ${error}`, 'instagram-api');
          // Continue to next approach
        }
      } else {
        log('No valid Instagram access token available from OAuth service', 'instagram-api');
      }
      
      // 2. Try public data approach
      try {
        const publicData = await this.fetchViaPublicData(username);
        if (publicData) {
          log(`Successfully retrieved data for ${username} via public data`, 'instagram-api');
          return publicData;
        }
      } catch (error) {
        log(`Error fetching via public data: ${error}`, 'instagram-api');
        // Continue to next approach
      }
      
      // 3. Try Basic Display API if we have OAuth configured
      if (instagramOAuth.isConfigured()) {
        try {
          const basicDisplayData = await this.fetchViaBasicDisplayApi(username);
          if (basicDisplayData) {
            log(`Successfully retrieved data for ${username} via Basic Display API`, 'instagram-api');
            return basicDisplayData;
          }
        } catch (error) {
          log(`Error fetching via Basic Display API: ${error}`, 'instagram-api');
        }
      }
      
      // No approach succeeded
      log(`Could not retrieve Instagram data for ${username} with any available method`, 'instagram-api');
      return null;
      
    } catch (error) {
      console.error(`Error fetching Instagram data for ${username}:`, error);
      return null;
    }
  }

  /**
   * Fetch Instagram data using the Graph API (for business/creator accounts)
   * @param username Instagram username
   * @param accessToken Access token to use for API requests
   * @returns Platform data or null
   */
  private async fetchViaGraphApi(username: string, accessToken: string): Promise<PlatformData | null> {
    if (!accessToken) return null;
    
    try {
      // Get the page ID and check for Instagram business account
      const pageInfoResponse = await axios.get('https://graph.facebook.com/v19.0/me', {
        params: {
          access_token: accessToken,
          fields: 'id,name,instagram_business_account'
        }
      });
      
      // Extract the Instagram Business Account ID, if available
      const instagramBusinessAccountId = pageInfoResponse.data?.instagram_business_account?.id;
      
      if (!instagramBusinessAccountId) {
        log('No Instagram Business Account connected to this token. Cannot use Graph API.', 'instagram-api');
        return null;
      }
      
      // Use Business Discovery API to get profile info for the target username
      const igProfileResponse = await axios.get(`https://graph.facebook.com/v19.0/${instagramBusinessAccountId}`, {
        params: {
          access_token: accessToken,
          fields: `business_discovery.username(${username}){username,website,name,ig_id,id,profile_picture_url,biography,follows_count,followers_count,media_count,media{caption,like_count,comments_count,media_url,permalink,timestamp,media_type}}`
        }
      });
      
      // Extract business discovery data
      const businessDiscovery = igProfileResponse.data?.business_discovery;
      
      if (!businessDiscovery) {
        log(`Instagram Business Discovery API could not find user: ${username}`, 'instagram-api');
        return null;
      }
      
      return this.transformGraphApiData(businessDiscovery, username);
      
    } catch (error: any) {
      log(`Instagram Graph API error: ${error.message}`, 'instagram-api');
      if (error.response?.data?.error) {
        log(`API error details: ${JSON.stringify(error.response.data.error)}`, 'instagram-api');
      }
      throw error;
    }
  }

  /**
   * Fetch Instagram data using public data endpoints
   * Note: This approach is limited but can work for public profiles
   * @param username Instagram username
   * @returns Platform data or null
   */
  private async fetchViaPublicData(username: string): Promise<PlatformData | null> {
    try {
      // First try to get basic profile info from public data, but using a proxy to avoid rate limits
      const publicProfileUrl = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
      
      // Make the request with proper headers to mimic a browser
      // Note: In production, we might need a proxy service to avoid rate limiting/blocking
      const response = await axios.get(publicProfileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'X-Instagram-AJAX': '1',
          'X-IG-App-ID': '936619743392459', // Public Instagram Web App ID
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.data?.data?.user) {
        log(`No user data found for ${username} via public API`, 'instagram-api');
        return null;
      }
      
      const userData = response.data.data.user;
      
      // Transform data to our platform data format
      return this.transformPublicData(userData, username);
      
    } catch (error: any) {
      log(`Instagram public data API error: ${error.message}`, 'instagram-api');
      if (error.response?.data) {
        log(`API error details: ${JSON.stringify(error.response.data)}`, 'instagram-api');
      }
      throw error;
    }
  }

  /**
   * Fetch Instagram data using the Basic Display API (requires user authentication)
   * Note: This method uses the OAuth flow to access user data
   * @param username Instagram username
   * @returns Platform data or null
   */
  private async fetchViaBasicDisplayApi(username: string): Promise<PlatformData | null> {
    // Check if we have a valid token from OAuth
    const accessToken = instagramOAuth.getAccessToken();
    if (!accessToken) {
      log('No Instagram access token available from OAuth service', 'instagram-api');
      return null;
    }
    
    try {
      // For the Basic Display API, we first need to get the user's own profile
      const meResponse = await axios.get('https://graph.instagram.com/me', {
        params: {
          access_token: accessToken,
          fields: 'id,username,account_type,media_count'
        }
      });
      
      const me = meResponse.data;
      log(`Got Instagram user profile: ${me.username} (${me.account_type})`, 'instagram-api');
      
      // If this is the user we're looking for, get more details
      if (me.username.toLowerCase() === username.toLowerCase()) {
        log(`Username matched authenticated user, fetching detailed profile`, 'instagram-api');
        
        // Get media for this user
        const mediaResponse = await axios.get(`https://graph.instagram.com/me/media`, {
          params: {
            access_token: accessToken,
            fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,children'
          }
        });
        
        const mediaData = mediaResponse.data.data || [];
        
        // Build profile data from the me endpoint and media
        const profileData = {
          displayName: me.username,
          bio: "",  // Basic Display API doesn't provide bio
          followerCount: 0,  // Basic Display API doesn't provide follower count
          followingCount: 0, // Basic Display API doesn't provide following count
          joinDate: new Date().toISOString(),
          profileUrl: `https://instagram.com/${username}`,
          avatarUrl: `https://ui-avatars.com/api/?name=${username}&background=FF5A5F&color=fff`,
          location: undefined
        };
        
        // Convert media to our content format
        const contentData = mediaData.map((item: any) => ({
          type: "post" as "post" | "comment" | "like" | "share",
          content: item.caption || "",
          timestamp: item.timestamp,
          url: item.permalink,
          engagement: {
            likes: 0, // Basic Display API doesn't provide engagement metrics
            comments: 0,
            shares: 0
          },
          sentiment: "neutral" as "positive" | "neutral" | "negative",
          topics: []
        }));
        
        // Create activity data
        const activityData = {
          totalPosts: me.media_count || contentData.length,
          totalComments: 0,
          totalLikes: 0,
          totalShares: 0,
          postsPerDay: 0,
          mostActiveTime: "Unknown",
          lastActive: contentData.length > 0 ? contentData[0].timestamp : new Date().toISOString(),
          topHashtags: [] as string[]
        };
        
        // Calculate exposure score based on limited data
        const exposureScore = Math.min(100, Math.floor((Math.log10(Math.max(10, me.media_count)) * 15) + 30));
        
        // Return platform data
        return {
          platformId: "instagram",
          username,
          profileData,
          activityData,
          contentData,
          privacyMetrics: {
            exposureScore,
            dataCategories: [
              { category: "Photos", severity: "medium" as const },
              { category: "Personal Content", severity: "medium" as const }
            ],
            potentialConcerns: [
              { issue: "Public profile visibility", risk: "medium" as const }
            ],
            recommendedActions: [
              "Review privacy settings",
              "Consider making account private",
              "Review tagged photos"
            ]
          },
          analysisResults: {
            exposureScore,
            topTopics: [
              { topic: "Personal", percentage: 0.7 },
              { topic: "Lifestyle", percentage: 0.3 }
            ],
            activityTimeline: [],
            sentimentBreakdown: {
              positive: 0.6,
              neutral: 0.3,
              negative: 0.1
            },
            dataCategories: [
              { category: "Photos", severity: "medium" as const }
            ],
            privacyConcerns: [
              { 
                type: "Public visibility", 
                severity: "medium" as const,
                description: "Your Instagram content is visible to everyone" 
              }
            ],
            recommendedActions: [
              "Review privacy settings",
              "Consider making your account private"
            ],
            platformSpecificMetrics: {
              contentBreakdown: {
                photos: 0.7,
                videos: 0.2,
                stories: 0.1,
                reels: 0
              },
              locationCheckIns: [],
              engagementRate: 0,
              hashtagAnalysis: []
            }
          }
        };
        
      } else {
        // If this is not the user we're looking for, we can't get their data
        // with the Basic Display API - it only allows access to the authenticated user's data
        log(`OAuth token is for user ${me.username}, not ${username}`, 'instagram-api');
        return null;
      }
    } catch (error: any) {
      log(`Error using Instagram Basic Display API: ${error.message}`, 'instagram-api');
      if (error.response?.data) {
        log(`API error details: ${JSON.stringify(error.response.data)}`, 'instagram-api');
      }
      throw error;
    }
  }

  /**
   * Transform Graph API data to our platform format
   * @param data API response data
   * @param username Username we searched for
   * @returns Formatted platform data
   */
  private transformGraphApiData(data: any, username: string): PlatformData {
    // Create profile data
    const profileData = {
      displayName: data.name || username,
      bio: data.biography || "",
      followerCount: data.followers_count || 0,
      followingCount: data.follows_count || 0,
      joinDate: new Date().toISOString(), // Not provided by API
      profileUrl: `https://instagram.com/${username}`,
      avatarUrl: data.profile_picture_url || `https://ui-avatars.com/api/?name=${username}&background=FF5A5F&color=fff`,
      location: undefined // Not provided by API
    };
    
    // Process media items
    const media = data.media?.data || [];
    
    // Initialize activity data
    const activityData = {
      totalPosts: data.media_count || 0,
      totalComments: 0,
      totalLikes: 0,
      totalShares: 0,
      postsPerDay: 0,
      mostActiveTime: "Unknown", // Would need analysis
      lastActive: media.length > 0 ? media[0].timestamp : new Date().toISOString(),
      topHashtags: [] as string[]
    };
    
    // Process content data and extract activity metrics
    const contentData = [];
    const hashtagCounts: Record<string, number> = {};
    const hashtagRegex = /#[\w-]+/g;
    
    for (const item of media) {
      // Update activity totals
      activityData.totalLikes += item.like_count || 0;
      activityData.totalComments += item.comments_count || 0;
      
      // Extract hashtags from caption
      if (item.caption) {
        const matches = item.caption.match(hashtagRegex);
        if (matches) {
          matches.forEach((tag: string) => {
            hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
          });
        }
      }
      
      // Add to content data
      contentData.push({
        type: "post" as "post" | "comment" | "like" | "share",
        content: item.caption || "",
        timestamp: item.timestamp || new Date().toISOString(),
        url: item.permalink || `https://instagram.com/${username}`,
        engagement: {
          likes: item.like_count || 0,
          comments: item.comments_count || 0,
          shares: 0 // Not available
        },
        sentiment: "neutral" as "positive" | "neutral" | "negative", // Would need analysis
        topics: [] // Would need analysis
      });
    }
    
    // Get top hashtags
    activityData.topHashtags = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
    
    // Calculate posts per day if we have posts
    if (media.length > 1) {
      const newest = new Date(media[0].timestamp);
      const oldest = new Date(media[media.length - 1].timestamp);
      const daysDiff = Math.max(1, (newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24));
      activityData.postsPerDay = parseFloat((media.length / daysDiff).toFixed(1));
    }
    
    // Build activity timeline
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
    
    // Convert to array format for activity timeline
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
    const hashtagAnalysis = Object.entries(hashtagCounts)
      .map(([tag, frequency]) => ({ tag, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
    
    // Create privacy metrics
    const dataCategories = [
      { category: "Photos", severity: "medium" as const },
      { category: "Location Data", severity: "high" as const },
      { category: "Personal Interests", severity: "low" as const }
    ];
    
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
    
    // Return complete platform data
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
          { topic: "Photography", percentage: 0.4 },
          { topic: "Travel", percentage: 0.25 },
          { topic: "Food", percentage: 0.15 },
          { topic: "Technology", percentage: 0.1 },
          { topic: "Lifestyle", percentage: 0.1 }
        ],
        activityTimeline,
        sentimentBreakdown: {
          positive: 0.6,
          neutral: 0.3,
          negative: 0.1
        },
        dataCategories,
        privacyConcerns: [
          { 
            type: "Location metadata", 
            severity: "high" as const,
            description: "Your photos may contain location metadata that reveals where you've been" 
          },
          {
            type: "Facial recognition", 
            severity: "medium" as const,
            description: "Your photos can be analyzed for people, objects, and places"
          }
        ],
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
  }
  
  /**
   * Transform public data to our platform format
   * @param data Data from public API
   * @param username Username we searched for
   * @returns Formatted platform data
   */
  private transformPublicData(data: any, username: string): PlatformData {
    // Extract core profile data
    const profileData = {
      displayName: data.full_name || username,
      bio: data.biography || "",
      followerCount: data.edge_followed_by?.count || 0,
      followingCount: data.edge_follow?.count || 0,
      joinDate: new Date().toISOString(), // Not provided by API
      profileUrl: `https://instagram.com/${username}`,
      avatarUrl: data.profile_pic_url_hd || data.profile_pic_url || `https://ui-avatars.com/api/?name=${username}&background=FF5A5F&color=fff`,
      location: undefined // Not provided by API
    };
    
    // Media data isn't as complete from public API
    const mediaEdges = data.edge_owner_to_timeline_media?.edges || [];
    const media = mediaEdges.map((edge: any) => edge.node);
    
    // Initialize activity data
    const activityData = {
      totalPosts: data.edge_owner_to_timeline_media?.count || 0,
      totalComments: 0,
      totalLikes: 0,
      totalShares: 0,
      postsPerDay: 0,
      mostActiveTime: "Unknown", // Would need analysis
      lastActive: media.length > 0 && media[0].taken_at_timestamp 
        ? new Date(media[0].taken_at_timestamp * 1000).toISOString() 
        : new Date().toISOString(),
      topHashtags: [] as string[]
    };
    
    // Process content data and extract activity metrics
    const contentData = [];
    const hashtagCounts: Record<string, number> = {};
    const hashtagRegex = /#[\w-]+/g;
    
    for (const item of media) {
      // Update activity totals
      const likes = item.edge_liked_by?.count || item.edge_media_preview_like?.count || 0;
      const comments = item.edge_media_to_comment?.count || 0;
      activityData.totalLikes += likes;
      activityData.totalComments += comments;
      
      // Extract hashtags from caption
      const caption = item.edge_media_to_caption?.edges?.[0]?.node?.text || "";
      if (caption) {
        const matches = caption.match(hashtagRegex);
        if (matches) {
          matches.forEach((tag: string) => {
            hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
          });
        }
      }
      
      // Add to content data
      contentData.push({
        type: "post" as "post" | "comment" | "like" | "share",
        content: caption,
        timestamp: item.taken_at_timestamp 
          ? new Date(item.taken_at_timestamp * 1000).toISOString()
          : new Date().toISOString(),
        url: `https://instagram.com/p/${item.shortcode}`,
        engagement: {
          likes,
          comments,
          shares: 0 // Not available
        },
        sentiment: "neutral" as "positive" | "neutral" | "negative", // Would need analysis
        topics: [] // Would need analysis
      });
    }
    
    // Get top hashtags
    activityData.topHashtags = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
    
    // Calculate posts per day if we have posts
    if (media.length > 1 && media[0].taken_at_timestamp && media[media.length - 1].taken_at_timestamp) {
      const newest = new Date(media[0].taken_at_timestamp * 1000);
      const oldest = new Date(media[media.length - 1].taken_at_timestamp * 1000);
      const daysDiff = Math.max(1, (newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24));
      activityData.postsPerDay = parseFloat((media.length / daysDiff).toFixed(1));
    }
    
    // Build activity timeline (with limited data)
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
      if (item.taken_at_timestamp) {
        const date = new Date(item.taken_at_timestamp * 1000);
        const period = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        timeline[period] = (timeline[period] || 0) + 1;
      }
    });
    
    // Convert to array format for activity timeline
    const activityTimeline = Object.entries(timeline)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));
    
    // Calculate engagement rate
    const engagementRate = 
      media.length > 0 && profileData.followerCount > 0 
        ? parseFloat((((activityData.totalLikes + activityData.totalComments) / media.length / profileData.followerCount) * 100).toFixed(1))
        : 0;
    
    // Create content type breakdown from what we know
    // This is limited with public API
    const mediaTypes = {
      photos: 0,
      videos: 0,
      stories: 0,
      reels: 0
    };
    
    media.forEach((item: any) => {
      if (item.is_video) {
        mediaTypes.videos++;
      } else {
        mediaTypes.photos++;
      }
    });
    
    // Convert to percentages
    const totalContent = mediaTypes.photos + mediaTypes.videos + mediaTypes.stories + mediaTypes.reels;
    const contentBreakdown = {
      photos: totalContent > 0 ? mediaTypes.photos / totalContent : 0.7,
      videos: totalContent > 0 ? mediaTypes.videos / totalContent : 0.2,
      stories: totalContent > 0 ? mediaTypes.stories / totalContent : 0.1,
      reels: totalContent > 0 ? mediaTypes.reels / totalContent : 0
    };
    
    // Create hashtag analysis
    const hashtagAnalysis = Object.entries(hashtagCounts)
      .map(([tag, frequency]) => ({ tag, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
    
    // Create privacy metrics
    const dataCategories = [
      { category: "Photos", severity: "medium" as const },
      { category: "Location Data", severity: "high" as const },
      { category: "Personal Interests", severity: "low" as const }
    ];
    
    // Calculate exposure score
    const exposureScore = Math.min(100, 
      Math.floor(
        (Math.log10(Math.max(10, profileData.followerCount)) * 10) + 
        (Math.min(100, media.length) * 0.5) + 20
      )
    );
    
    // Return complete platform data
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
          { topic: "Photography", percentage: 0.4 },
          { topic: "Travel", percentage: 0.25 },
          { topic: "Food", percentage: 0.15 },
          { topic: "Technology", percentage: 0.1 },
          { topic: "Lifestyle", percentage: 0.1 }
        ],
        activityTimeline,
        sentimentBreakdown: {
          positive: 0.6,
          neutral: 0.3,
          negative: 0.1
        },
        dataCategories,
        privacyConcerns: [
          { 
            type: "Location metadata", 
            severity: "high" as const,
            description: "Your photos may contain location metadata that reveals where you've been" 
          },
          {
            type: "Facial recognition", 
            severity: "medium" as const,
            description: "Your photos can be analyzed for people, objects, and places" 
          }
        ],
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
  }
}

// Export as a singleton
export const instagramApi = new InstagramApiService();