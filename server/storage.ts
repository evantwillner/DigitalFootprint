import { 
  User, InsertUser, 
  SearchQuery, SearchHistory, InsertSearchHistory,
  DigitalFootprint, InsertDigitalFootprint,
  DeletionRequest, InsertDeletionRequest,
  Platform, PlatformData, DigitalFootprintResponse,
  subscriptionPlansData
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
  aggregateDigitalFootprint(username: string, platforms: Platform[]): Promise<DigitalFootprintResponse>;
  
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
    const user: User = { ...insertUser, id, createdAt };
    this.users.set(id, user);
    return user;
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
  
  // Platform data operations - these would normally call external APIs
  async fetchPlatformData(username: string, platform: Platform): Promise<PlatformData | null> {
    // This is a simulation of fetching data from external APIs
    // In a real application, this would make actual API calls to the respective platforms
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulation response - in production, this would be real API data
    const simulatedData: PlatformData = {
      platformId: platform,
      username: username,
      profileData: {
        displayName: username,
        bio: platform === "instagram" ? "Photography enthusiast | Tech lover" : "Software developer with passion for code",
        followerCount: Math.floor(Math.random() * 1000) + 100,
        followingCount: Math.floor(Math.random() * 500) + 50,
        joinDate: new Date(2018, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
        profileUrl: `https://${platform}.com/${username}`,
        location: Math.random() > 0.5 ? "San Francisco, CA" : undefined,
      },
      activityData: {
        totalPosts: Math.floor(Math.random() * 50) + 10,
        totalComments: Math.floor(Math.random() * 200) + 50,
        totalLikes: Math.floor(Math.random() * 100) + 30,
        totalShares: Math.floor(Math.random() * 30) + 5,
        postsPerDay: parseFloat((Math.random() * 2).toFixed(1)),
        mostActiveTime: ["Evening (8-11pm)", "Weekends", "Morning (6-9am)"][Math.floor(Math.random() * 3)],
        lastActive: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
        topSubreddits: platform === "reddit" ? ["programming", "webdev", "javascript", "reactjs", "node"].slice(0, Math.floor(Math.random() * 3) + 2) : undefined,
        topHashtags: platform === "instagram" ? ["tech", "coding", "developer", "javascript", "webdesign"].slice(0, Math.floor(Math.random() * 3) + 2) : undefined,
      },
      contentData: Array.from({ length: 10 }, (_, i) => ({
        type: ["post", "comment", "like", "share"][Math.floor(Math.random() * 4)] as any,
        content: Math.random() > 0.3 ? "Sample content about technology and programming" : undefined,
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(),
        url: `https://${platform}.com/${username}/status/${Math.floor(Math.random() * 10000000)}`,
        engagement: {
          likes: Math.floor(Math.random() * 50),
          comments: Math.floor(Math.random() * 20),
          shares: Math.floor(Math.random() * 10),
        },
        sentiment: ["positive", "neutral", "negative"][Math.floor(Math.random() * 3)] as any,
        topics: ["technology", "programming", "gaming", "travel"].slice(0, Math.floor(Math.random() * 3) + 1),
      })),
      analysisResults: {
        exposureScore: Math.floor(Math.random() * 30) + 50,
        topTopics: [
          { topic: "Technology", percentage: 0.45 },
          { topic: "Programming", percentage: 0.25 },
          { topic: "Gaming", percentage: 0.15 },
          { topic: "Travel", percentage: 0.15 },
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
            type: "Personal Information",
            description: "Location data found in profile (San Francisco area)",
            severity: "medium",
          },
          {
            type: "Professional Information",
            description: "Profession (software developer) and technical skillset disclosed",
            severity: "low",
          },
        ],
      },
    };
    
    return simulatedData;
  }
  
  async aggregateDigitalFootprint(username: string, platforms: Platform[]): Promise<DigitalFootprintResponse> {
    // In a production environment, this would fetch real data from platforms
    const platformsToFetch = platforms.includes("all") 
      ? ["instagram", "facebook", "reddit", "twitter", "linkedin"] as Platform[]
      : platforms;
    
    const platformDataPromises = platformsToFetch.map(platform => 
      this.fetchPlatformData(username, platform)
    );
    
    const platformDataResults = await Promise.all(platformDataPromises);
    const validPlatformData = platformDataResults.filter(result => result !== null) as PlatformData[];
    
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
    const response: DigitalFootprintResponse = {
      username,
      timestamp: new Date().toISOString(),
      platforms: platformsToFetch,
      platformData: validPlatformData,
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

// Export the storage instance
export const storage = new MemStorage();
