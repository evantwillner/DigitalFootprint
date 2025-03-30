import { 
  User, InsertUser, 
  SearchQuery, SearchHistory, InsertSearchHistory,
  DigitalFootprint, InsertDigitalFootprint,
  DeletionRequest, InsertDeletionRequest,
  Platform, PlatformData, DigitalFootprintResponse,
  PlatformUsername, subscriptionPlansData
} from "@shared/schema";
import session from 'express-session';
import createMemoryStore from 'memorystore';

const MemoryStore = createMemoryStore(session);

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateStripeCustomerId(userId: number, customerId: string): Promise<User>;
  updateStripeSubscriptionId(userId: number, subscriptionId: string): Promise<User>;
  updateUserStripeInfo(userId: number, info: { customerId: string, subscriptionId: string }): Promise<User>;
  
  // Search history operations
  saveSearch(search: InsertSearchHistory): Promise<SearchHistory>;
  getSearchHistoryByUser(userId: number): Promise<SearchHistory[]>;
  
  // Digital footprint operations
  saveDigitalFootprint(footprint: InsertDigitalFootprint): Promise<DigitalFootprint>;
  getDigitalFootprintById(id: number): Promise<DigitalFootprint | undefined>;
  getDigitalFootprintsByUsername(username: string): Promise<DigitalFootprint[]>;
  
  // Deletion request operations
  createDeletionRequest(request: InsertDeletionRequest): Promise<DeletionRequest>;
  getDeletionRequestsByUser(userId: number): Promise<DeletionRequest[]>;
  
  // Subscription plans
  getSubscriptionPlans(): Promise<typeof subscriptionPlansData>;
  
  // Platform data operations
  fetchPlatformData(username: string, platform: Platform): Promise<PlatformData | null>;
  aggregateDigitalFootprint(searchQuery: SearchQuery): Promise<DigitalFootprintResponse>;
  
  // Session store for express-session
  sessionStore: any; // Using any for now to avoid type issues
}

// In-memory implementation of the storage interface
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private searches: Map<number, SearchHistory>;
  private footprints: Map<number, DigitalFootprint>;
  private deletionRequests: Map<number, DeletionRequest>;
  
  private currentUserId: number;
  private currentSearchId: number;
  private currentFootprintId: number;
  private currentRequestId: number;
  
  public sessionStore: any; // Memory-based session store
  
  constructor() {
    this.users = new Map();
    this.searches = new Map();
    this.footprints = new Map();
    this.deletionRequests = new Map();
    
    this.currentUserId = 1;
    this.currentSearchId = 1;
    this.currentFootprintId = 1;
    this.currentRequestId = 1;
    
    // Initialize the memory store for sessions
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const createdAt = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt,
      stripeCustomerId: null, 
      stripeSubscriptionId: null 
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateStripeCustomerId(userId: number, customerId: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = { ...user, stripeCustomerId: customerId };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateStripeSubscriptionId(userId: number, subscriptionId: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = { ...user, stripeSubscriptionId: subscriptionId };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateUserStripeInfo(userId: number, info: { customerId: string, subscriptionId: string }): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = { 
      ...user, 
      stripeCustomerId: info.customerId,
      stripeSubscriptionId: info.subscriptionId 
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  // Search history operations
  async saveSearch(search: InsertSearchHistory): Promise<SearchHistory> {
    const id = this.currentSearchId++;
    const timestamp = new Date();
    const newSearch: SearchHistory = { 
      ...search, 
      id, 
      timestamp,
      userId: search.userId || null,
    };
    this.searches.set(id, newSearch);
    return newSearch;
  }
  
  async getSearchHistoryByUser(userId: number): Promise<SearchHistory[]> {
    return Array.from(this.searches.values()).filter(
      (search) => search.userId === userId
    );
  }
  
  // Digital footprint operations
  async saveDigitalFootprint(footprint: InsertDigitalFootprint): Promise<DigitalFootprint> {
    const id = this.currentFootprintId++;
    const timestamp = new Date();
    const newFootprint: DigitalFootprint = { 
      ...footprint, 
      id, 
      timestamp,
      searchId: footprint.searchId || null 
    };
    this.footprints.set(id, newFootprint);
    return newFootprint;
  }
  
  async getDigitalFootprintById(id: number): Promise<DigitalFootprint | undefined> {
    return this.footprints.get(id);
  }
  
  async getDigitalFootprintsByUsername(username: string): Promise<DigitalFootprint[]> {
    return Array.from(this.footprints.values()).filter(
      (footprint) => footprint.username === username
    );
  }
  
  // Deletion request operations
  async createDeletionRequest(request: InsertDeletionRequest): Promise<DeletionRequest> {
    const id = this.currentRequestId++;
    const timestamp = new Date();
    const newRequest: DeletionRequest = { 
      ...request, 
      id, 
      status: "pending", 
      timestamp,
      userId: request.userId || null
    };
    this.deletionRequests.set(id, newRequest);
    return newRequest;
  }
  
  async getDeletionRequestsByUser(userId: number): Promise<DeletionRequest[]> {
    return Array.from(this.deletionRequests.values()).filter(
      (request) => request.userId === userId
    );
  }
  
  // Subscription plans
  async getSubscriptionPlans() {
    return subscriptionPlansData;
  }
  
  // Platform data operations using our specialized API service
  async fetchPlatformData(username: string, platform: Platform): Promise<PlatformData | null> {
    try {
      console.log(`Fetching platform data for ${username} on ${platform}`);
      
      // Import our platform API service
      const { platformApi } = await import('./services/platform-api');
      
      if (platform === "all") {
        // Special case for "all" platform - return overview data
        return this.getAggregateData(username);
      }
      
      // For specific platforms, use the API integration service
      const result = await platformApi.fetchUserData(platform, username);
      
      // Log the result for debugging
      if (result) {
        console.log(`Successfully fetched data for ${username} on ${platform} (${result.platformId})`);
      } else {
        console.log(`No data returned for ${username} on ${platform}`);
      }
      
      return result;
    } catch (error: any) {
      console.error(`Error fetching platform data for ${username} on ${platform}:`, error);
      
      // Important: Rethrow specific error types to be handled by the aggregateDigitalFootprint method
      // This ensures privacy errors, rate limiting and other expected errors are properly communicated to the client
      if (error.message && (
        error.message.includes('PRIVACY_ERROR') || 
        error.message.includes('AUTH_ERROR') || 
        error.message.includes('RATE_LIMITED') ||
        error.message.includes('NOT_FOUND')
      )) {
        throw error;
      }
      
      return null;
    }
  }
  
  // Helper method to generate aggregate data for the "all" platform view
  private async getAggregateData(username: string): Promise<PlatformData> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Create an aggregate view with overview information
    return {
      platformId: "all",
      username,
      profileData: {
        displayName: username.charAt(0).toUpperCase() + username.slice(1),
        bio: "Multi-platform digital presence",
        followerCount: Math.floor(Math.random() * 2000) + 100,
        followingCount: Math.floor(Math.random() * 1000) + 50,
        joinDate: new Date(Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        profileUrl: `https://example.com/${username}`,
        avatarUrl: "https://example.com/avatar.jpg",
      },
      activityData: {
        totalPosts: Math.floor(Math.random() * 300) + 10,
        totalComments: Math.floor(Math.random() * 500) + 20,
        totalLikes: Math.floor(Math.random() * 1000) + 50,
        totalShares: Math.floor(Math.random() * 100) + 5,
        postsPerDay: parseFloat((Math.random() * 2).toFixed(1)),
        mostActiveTime: "Various times across platforms",
        lastActive: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
        topHashtags: ["#technology", "#privacy", "#digital", "#security"]
      },
      contentData: Array.from({ length: 10 }, (_, i) => ({
        type: ["post", "comment", "like", "share"][Math.floor(Math.random() * 4)] as any,
        content: ["Cross-platform activity analysis", "Digital presence summary", "Privacy impact assessment"][Math.floor(Math.random() * 3)],
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(),
        url: `https://example.com/${username}/overview`,
        engagement: {
          likes: Math.floor(Math.random() * 100),
          comments: Math.floor(Math.random() * 40),
          shares: Math.floor(Math.random() * 20),
        },
        sentiment: ["positive", "neutral", "negative"][Math.floor(Math.random() * 3)] as any,
        topics: ["digital footprint", "privacy", "online presence", "data security"].slice(0, Math.floor(Math.random() * 3) + 1),
      })),
      privacyMetrics: {
        exposureScore: Math.floor(Math.random() * 30) + 50,
        dataCategories: [
          { category: "Cross-Platform Information", severity: "high" },
          { category: "Aggregate Activity Patterns", severity: "medium" },
          { category: "Digital Identity", severity: "medium" }
        ],
        potentialConcerns: [
          { issue: "Digital identity linkage across platforms", risk: "high" },
          { issue: "Comprehensive profile building possible", risk: "medium" }
        ],
        recommendedActions: [
          "Audit all connected accounts",
          "Use different usernames across platforms",
          "Regularly review privacy settings on all platforms",
          "Consider using privacy-focused alternatives"
        ]
      },
      analysisResults: {
        exposureScore: Math.floor(Math.random() * 30) + 50,
        topTopics: [
          { topic: "Technology", percentage: 0.45 },
          { topic: "Privacy", percentage: 0.25 },
          { topic: "Digital Life", percentage: 0.15 },
          { topic: "Social", percentage: 0.15 },
        ],
        activityTimeline: Array.from({ length: 12 }, (_, i) => ({
          period: `2023-${(i + 1).toString().padStart(2, '0')}`,
          count: Math.floor(Math.random() * 30) + 5,
        })),
        sentimentBreakdown: {
          positive: 0.3,
          neutral: 0.6,
          negative: 0.1,
        },
        privacyConcerns: [
          {
            type: "Cross-Platform Exposure",
            description: "Your identity can be tracked across multiple platforms",
            severity: "high",
          },
          {
            type: "Digital Footprint",
            description: "Significant online presence with consistent activity patterns",
            severity: "medium",
          },
        ],
      }
    };
  }
  
  async aggregateDigitalFootprint(searchQuery: SearchQuery): Promise<DigitalFootprintResponse> {
    // In a production environment, this would fetch real data from platforms
    const platformsToFetch = searchQuery.platforms.includes("all") 
      ? ["instagram", "facebook", "reddit", "twitter", "linkedin"] as Platform[]
      : searchQuery.platforms;
    
    // Determine which username to use for each platform and track any errors
    const platformErrors: Record<string, string> = {};
    
    // Use Promise.allSettled to handle both successful and failed promises
    const platformDataPromises = platformsToFetch.map(platform => {
      // Create a promise that includes the platform information
      return new Promise<{platform: Platform, data: PlatformData | null}>((resolve) => {
        let username = '';
        
        // Check if we have a platform-specific username
        if (searchQuery.platformUsernames) {
          const platformUsername = searchQuery.platformUsernames.find(
            (pu: { platform: Platform, username: string }) => pu.platform === platform
          );
          if (platformUsername) {
            username = platformUsername.username;
            
            // Use the platform-specific username if available
            this.fetchPlatformData(username, platform)
              .then(data => resolve({platform, data}))
              .catch((error: any) => {
                // Catch specific errors and add them to platformErrors
                if (error.message) {
                  console.log(`Adding ${platform} error for ${username}: ${error.message}`);
                  
                  if (error.message.includes('PRIVACY_ERROR')) {
                    platformErrors[platform] = `The ${platform} user ${username} has a private account or is blocking data access.`;
                  } else if (error.message.includes('NOT_FOUND')) {
                    platformErrors[platform] = `Username ${username} not found on ${platform}.`;
                  } else if (error.message.includes('RATE_LIMITED')) {
                    platformErrors[platform] = `${platform} API rate limit exceeded. Please try again later.`;
                  } else if (error.message.includes('AUTH_ERROR')) {
                    platformErrors[platform] = `${platform} API authentication error.`;
                  } else {
                    platformErrors[platform] = `Error accessing ${platform} data: ${error.message}`;
                  }
                }
                
                // Return null for this platform since we encountered an error
                resolve({platform, data: null});
              });
            return;
          }
        }
        
        // Fall back to the global username
        if (searchQuery.username) {
          username = searchQuery.username;
          
          this.fetchPlatformData(username, platform)
            .then(data => resolve({platform, data}))
            .catch((error: any) => {
              // Catch specific errors and add them to platformErrors
              if (error.message) {
                console.log(`Adding ${platform} error for ${username}: ${error.message}`);
                
                if (error.message.includes('PRIVACY_ERROR')) {
                  platformErrors[platform] = `The ${platform} user ${username} has a private account or is blocking data access.`;
                } else if (error.message.includes('NOT_FOUND')) {
                  platformErrors[platform] = `Username ${username} not found on ${platform}.`;
                } else if (error.message.includes('RATE_LIMITED')) {
                  platformErrors[platform] = `${platform} API rate limit exceeded. Please try again later.`;
                } else if (error.message.includes('AUTH_ERROR')) {
                  platformErrors[platform] = `${platform} API authentication error.`;
                } else {
                  platformErrors[platform] = `Error accessing ${platform} data: ${error.message}`;
                }
              }
              
              // Return null for this platform since we encountered an error
              resolve({platform, data: null});
            });
          return;
        }
        
        // If no username is available for this platform, return null
        resolve({platform, data: null});
      });
    });
    
    // Wait for all platform data fetches to complete (both successful and failed)
    const platformDataResults = await Promise.all(platformDataPromises);
    
    // Extract just the data from the results
    const validPlatformData = platformDataResults
      .map(result => result.data)
      .filter(result => result !== null) as PlatformData[];
    
    // Calculate aggregated statistics
    let totalPosts = 0;
    let totalComments = 0;
    let totalLikes = 0;
    let totalShares = 0;
    let totalExposureScore = 0;
    
    validPlatformData.forEach(data => {
      if (data.activityData) {
        totalPosts += data.activityData.totalPosts || 0;
        totalComments += data.activityData.totalComments || 0;
        totalLikes += data.activityData.totalLikes || 0;
        totalShares += data.activityData.totalShares || 0;
      }
      if (data.analysisResults) {
        totalExposureScore += data.analysisResults.exposureScore;
      }
    });
    
    // Calculate average exposure score
    const averageExposureScore = Math.round(
      validPlatformData.length > 0 ? totalExposureScore / validPlatformData.length : 0
    );
    
    // Generate summary insights
    const insights = [
      {
        insight: `Most active on ${validPlatformData[0]?.platformId || "platforms"} with ${totalComments} comments across various topics.`,
        type: "info" as const,
      },
      {
        insight: "Content primarily focuses on technology, programming, and gaming topics with occasional posts about travel.",
        type: "info" as const,
      },
      {
        insight: "Peak activity occurs during evenings (8-11pm) and weekends, with consistent posting patterns since 2018.",
        type: "info" as const,
      },
      {
        insight: "Tone analysis indicates predominantly neutral and informative communication style with occasional technical advice.",
        type: "info" as const,
      },
      {
        insight: "Potential personal information disclosed includes general location (San Francisco area), profession (software developer), and technical skillset.",
        type: "warning" as const,
      },
    ];
    
    // Generate recommendations
    const recommendations = [
      "Review and update privacy settings on all platforms",
      "Consider removing location data from public profiles",
      "Check third-party app permissions that may have access to your accounts",
      "Set up alerts for new mentions of your username across platforms",
      "Regularly audit and clean up old posts and comments",
    ];
    
    // Create the aggregated response
    // Use the global username for the response, or create a composite username if only platform-specific ones exist
    const responseUsername = searchQuery.username || 
      (searchQuery.platformUsernames && searchQuery.platformUsernames.length > 0 ? 
        searchQuery.platformUsernames.map((pu: { platform: Platform, username: string }) => 
          `${pu.platform}:${pu.username}`).join(', ') : 
        "unknown");
        
    // Check platform status for APIs that didn't return data
    try {
      const { platformApi } = await import('./services/platform-api');
      const platformStatus = await platformApi.getPlatformStatus();
      
      // Additional API-status related errors (we already have platform-specific errors from above)
      
      // Check Twitter API status specifically
      if (platformsToFetch.includes("twitter") && platformStatus.twitter) {
        const twitterStatus = platformStatus.twitter as unknown as { 
          configured: boolean; 
          operational: boolean; 
          message: string 
        };
        
        // Log Twitter API status for debugging
        console.log("Twitter API status check during response creation:", twitterStatus);
        
        // If Twitter API credentials are configured but not operational or contains an error message, add error
        if (twitterStatus.message && twitterStatus.message !== 'Twitter API configured and operational.') {
          platformErrors.twitter = twitterStatus.message;
          console.log("Adding Twitter error to response:", twitterStatus.message);
        }
      }
      
      // Check Instagram API status
      if (platformsToFetch.includes("instagram") && platformStatus.instagram) {
        const instagramStatus = platformStatus.instagram as unknown as { 
          available?: boolean; 
          configured?: boolean; 
          message: string 
        };
        
        // Log Instagram API status for debugging
        console.log("Instagram API status check during response creation:", instagramStatus);
        
        // If Instagram API is not available or configured, add error message
        if ((instagramStatus.available === false || instagramStatus.configured === false) && instagramStatus.message) {
          platformErrors.instagram = instagramStatus.message;
          console.log("Adding Instagram error to response:", instagramStatus.message);
        }
      }
      
      // Check if Instagram OAuth has issues
      if (platformsToFetch.includes("instagram") && platformStatus.instagram_oauth) {
        const instagramOAuthStatus = platformStatus.instagram_oauth as unknown as { 
          configured: boolean; 
          message: string 
        };
        
        // Log Instagram OAuth status for debugging
        console.log("Instagram OAuth status check during response creation:", instagramOAuthStatus);
        
        // If Instagram OAuth is not configured correctly, add error message
        if (instagramOAuthStatus.configured === false && instagramOAuthStatus.message) {
          // Only add this if we don't already have an Instagram error
          if (!platformErrors.instagram) {
            platformErrors.instagram = instagramOAuthStatus.message;
            console.log("Adding Instagram OAuth error to response:", instagramOAuthStatus.message);
          }
        }
      }
      
      // Create the final response including any platform errors
      const response: DigitalFootprintResponse = {
        username: responseUsername,
        timestamp: new Date().toISOString(),
        platforms: platformsToFetch,
        platformData: validPlatformData,
        platformErrors: Object.keys(platformErrors).length > 0 ? platformErrors : {},
        summary: {
          exposureScore: averageExposureScore,
          platformsFound: validPlatformData.length,
          totalContentItems: totalPosts + totalComments + totalLikes + totalShares,
          breakdownByType: {
            posts: totalPosts,
            comments: totalComments,
            likes: totalLikes,
            shares: totalShares,
          },
          topInsights: insights,
          recommendations,
        },
      };
      
      // Log if platform errors were added to the response
      if (platformErrors && Object.keys(platformErrors).length > 0) {
        console.log("Platform errors added to digital footprint response:", platformErrors);
      }
      
      return response;
    } catch (error) {
      console.error("Error checking platform status:", error);
      
      // If error occurs when checking platform status, still include our already collected platform errors
      const response: DigitalFootprintResponse = {
        username: responseUsername,
        timestamp: new Date().toISOString(),
        platforms: platformsToFetch,
        platformData: validPlatformData,
        platformErrors: Object.keys(platformErrors).length > 0 ? platformErrors : {},
        summary: {
          exposureScore: averageExposureScore,
          platformsFound: validPlatformData.length,
          totalContentItems: totalPosts + totalComments + totalLikes + totalShares,
          breakdownByType: {
            posts: totalPosts,
            comments: totalComments,
            likes: totalLikes,
            shares: totalShares,
          },
          topInsights: insights,
          recommendations,
        },
      };
    
      return response;
    }
  }
}

// Export the storage instance
export const storage = new MemStorage();
