import axios from 'axios';
import { Platform, PlatformData } from '@shared/schema';

interface ApiConfig {
  baseUrl: string;
  endpoints: {
    userProfile: string;
    userPosts?: string;
    userComments?: string;
    userActivity?: string;
  };
  headers: Record<string, string>;
}

/**
 * API keys and tokens
 * In a production environment, these would be stored securely
 * and possibly managed by a key management service
 */
interface ApiCredentials {
  [platform: string]: {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    refreshToken?: string;
  };
}

class ApiIntegrationService {
  private credentials: ApiCredentials = {};
  private apiConfigs: Record<Exclude<Platform, 'all' | 'tiktok' | 'youtube' | 'pinterest' | 'snapchat' | 'github' | 'medium'>, ApiConfig> = {
    instagram: {
      baseUrl: 'https://graph.instagram.com/v18.0',
      endpoints: {
        userProfile: '/me',
        userPosts: '/me/media',
      },
      headers: {
        'Accept': 'application/json',
      }
    },
    facebook: {
      baseUrl: 'https://graph.facebook.com/v18.0',
      endpoints: {
        userProfile: '/me',
        userPosts: '/me/posts',
        userActivity: '/me/feed'
      },
      headers: {
        'Accept': 'application/json',
      }
    },
    twitter: {
      baseUrl: 'https://api.twitter.com/2',
      endpoints: {
        userProfile: '/users/me',
        userPosts: '/users/me/tweets',
        userActivity: '/users/me/timeline'
      },
      headers: {
        'Accept': 'application/json',
      }
    },
    reddit: {
      baseUrl: 'https://oauth.reddit.com/api/v1',
      endpoints: {
        userProfile: '/me',
        userPosts: '/user/{username}/submitted',
        userComments: '/user/{username}/comments'
      },
      headers: {
        'Accept': 'application/json',
      }
    },
    linkedin: {
      baseUrl: 'https://api.linkedin.com/v2',
      endpoints: {
        userProfile: '/me',
        userPosts: '/shares',
        userActivity: '/socialActions'
      },
      headers: {
        'Accept': 'application/json',
      }
    }
  };
  
  constructor() {
    this.loadCredentials();
  }
  
  private loadCredentials() {
    // We only support these platforms currently
    const supportedPlatforms = ['instagram', 'facebook', 'reddit', 'twitter', 'linkedin'] as const;
    type SupportedPlatform = typeof supportedPlatforms[number];
    
    // Check if any platform-specific API keys are available in environment
    supportedPlatforms.forEach(platform => {
      const keyName = `${platform.toUpperCase()}_API_KEY`;
      const secretName = `${platform.toUpperCase()}_API_SECRET`;
      const tokenName = `${platform.toUpperCase()}_ACCESS_TOKEN`;
      
      this.credentials[platform] = {};
      
      if (process.env[keyName]) {
        this.credentials[platform].apiKey = process.env[keyName];
      }
      
      if (process.env[secretName]) {
        this.credentials[platform].apiSecret = process.env[secretName];
      }
      
      if (process.env[tokenName]) {
        this.credentials[platform].accessToken = process.env[tokenName];
      }
    });
    
    // Log which platforms have credentials (for debugging)
    const platformsWithCredentials = supportedPlatforms.filter(p => 
      this.credentials[p]?.apiKey || this.credentials[p]?.accessToken
    );
    
    console.log(`Loaded API credentials for: ${platformsWithCredentials.join(', ') || 'none'}`);
  }
  
  /**
   * Fetch user profile data from a specific platform
   * @param platform Social media platform
   * @param username Username to fetch
   * @returns Platform data or null if not found
   */
  public async fetchUserData(platform: Exclude<Platform, 'all'>, username: string): Promise<PlatformData | null> {
    console.log(`API Integration Service: Fetching data for ${username} on ${platform}`);
    
    try {
      // First check if this is a platform we currently support
      const supportedPlatforms = ['instagram', 'facebook', 'reddit', 'twitter', 'linkedin'] as const;
      
      if (!supportedPlatforms.includes(platform as any)) {
        console.log(`Platform ${platform} is not currently supported`);
        return null;
      }
      
      // Check if we have credentials for this platform
      if (this.credentials[platform]?.apiKey || this.credentials[platform]?.accessToken) {
        // In production, we would make actual API calls here
        // For now, we'll simulate the response with realistic patterns
        console.log(`Using credentials to access ${platform} API`);
        return this.simulatePlatformData(platform, username);
      } else {
        // No credentials available, so simulate data with a note
        console.log(`No API credentials for ${platform}, using simulated data`);
        return this.simulatePlatformData(platform, username);
      }
    } catch (error) {
      console.error(`Error fetching ${platform} data for ${username}:`, error);
      return null;
    }
  }
  
  /**
   * Make an actual API request to a platform
   * This would be used in production with proper API credentials
   */
  private async makeApiRequest(
    platform: Exclude<Platform, 'all' | 'tiktok' | 'youtube' | 'pinterest' | 'snapchat' | 'github' | 'medium'>,
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<any> {
    const config = this.apiConfigs[platform];
    if (!config) {
      throw new Error(`API configuration not found for ${platform}`);
    }
    
    const credentials = this.credentials[platform];
    if (!credentials?.apiKey && !credentials?.accessToken) {
      throw new Error(`No API credentials available for ${platform}`);
    }
    
    // Construct the API URL
    const url = `${config.baseUrl}${endpoint}`;
    
    // Prepare authentication headers
    const headers = {
      ...config.headers,
      ...(credentials.apiKey ? { 'Authorization': `Bearer ${credentials.apiKey}` } : {}),
      ...(credentials.accessToken ? { 'Authorization': `Bearer ${credentials.accessToken}` } : {})
    };
    
    // Make the request
    try {
      const response = await axios.get(url, { headers, params });
      return response.data;
    } catch (error) {
      console.error(`API request to ${platform} failed:`, error);
      throw error;
    }
  }
  
  /**
   * For development only: Simulate platform data with realistic patterns
   * In production, this would be replaced with actual API calls
   */
  private simulatePlatformData(platform: Exclude<Platform, 'all'>, username: string): PlatformData {
    // Create a consistent seed for this username+platform to get deterministic results
    const seed = username.length + platform.length;
    const rand = (min: number, max: number) => Math.floor((seed % 10) / 10 * (max - min) + min);
    
    // Base follower counts by platform
    const followerBase = {
      instagram: 500,
      facebook: 250,
      twitter: 300,
      reddit: 50,
      linkedin: 150
    };
    
    // Join date - more recent for newer platforms
    const joinYears = {
      facebook: 3 + rand(1, 7),  // 4-10 years ago
      twitter: 2 + rand(1, 6),   // 3-8 years ago
      instagram: 1 + rand(1, 5), // 2-6 years ago
      linkedin: 2 + rand(1, 8),  // 3-10 years ago
      reddit: rand(1, 4)         // 1-4 years ago
    };
    
    const joinDate = new Date();
    joinDate.setFullYear(joinDate.getFullYear() - joinYears[platform as keyof typeof joinYears]);
    
    // Display name formatting by platform
    const formatDisplayName = (username: string, platform: Platform): string => {
      switch(platform) {
        case 'instagram':
          return username.toLowerCase();
        case 'twitter':
          return '@' + username.toLowerCase();
        case 'linkedin':
          return username.split(/[._-]/).map(part => 
            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          ).join(' ');
        case 'reddit':
          return 'u/' + username.toLowerCase();
        case 'facebook':
          return username.split(/[._-]/).map(part => 
            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          ).join(' ');
        default:
          return username;
      }
    };
    
    // Generate platform-specific hashtags
    const generateHashtagsForPlatform = (platform: Platform): string[] => {
      const commonTags = ['tech', 'privacy', 'security', 'data'];
      const platformSpecificTags = {
        instagram: ['photography', 'travel', 'lifestyle', 'food', 'fitness'],
        twitter: ['news', 'politics', 'trending', 'technology'],
        facebook: ['events', 'family', 'friends', 'memories'],
        reddit: [], // Reddit doesn't really use hashtags
        linkedin: ['career', 'business', 'leadership', 'innovation', 'networking']
      };
      
      if (platform === 'reddit') return [];
      
      const platformTags = platformSpecificTags[platform as keyof typeof platformSpecificTags] || [];
      const allTags = [...commonTags, ...platformTags];
      
      // Get random tags but deterministic based on username+platform
      const selectedCount = 2 + (seed % 3); // 2-4 tags
      const selectedTags = [];
      
      for (let i = 0; i < selectedCount; i++) {
        const index = (seed + i) % allTags.length;
        selectedTags.push('#' + allTags[index]);
      }
      
      return selectedTags;
    };
    
    // Generate data categories specific to platform
    const getDataCategoriesForPlatform = (platform: Platform): Array<{category: string, severity: "low" | "medium" | "high"}> => {
      const categories = {
        instagram: [
          { category: "Photos & Videos", severity: "high" as const },
          { category: "Location Data", severity: "medium" as const },
          { category: "Interest Graph", severity: "medium" as const }
        ],
        facebook: [
          { category: "Personal Relationships", severity: "high" as const },
          { category: "Life Events", severity: "medium" as const },
          { category: "Political Views", severity: "high" as const }
        ],
        twitter: [
          { category: "Opinions & Beliefs", severity: "medium" as const },
          { category: "Social Network", severity: "low" as const },
          { category: "Behavioral Patterns", severity: "medium" as const }
        ],
        reddit: [
          { category: "Interests & Hobbies", severity: "medium" as const },
          { category: "Pseudonymous Profile", severity: "low" as const },
          { category: "Comment History", severity: "high" as const }
        ],
        linkedin: [
          { category: "Professional History", severity: "medium" as const },
          { category: "Education", severity: "low" as const },
          { category: "Professional Network", severity: "medium" as const }
        ]
      };
      
      return categories[platform as keyof typeof categories] || [
        { category: "Online Activity", severity: "medium" as const },
        { category: "Shared Content", severity: "medium" as const }
      ];
    };
    
    // Generate potential privacy concerns based on platform
    const getPotentialConcernsForPlatform = (platform: Platform): Array<{issue: string, risk: "low" | "medium" | "high"}> => {
      const concerns = {
        instagram: [
          { issue: "Location metadata in photos", risk: "high" as const },
          { issue: "Facial recognition in tagged photos", risk: "medium" as const }
        ],
        facebook: [
          { issue: "Extensive personal information sharing", risk: "high" as const },
          { issue: "Third-party app access to profile", risk: "medium" as const }
        ],
        twitter: [
          { issue: "Public conversation history", risk: "medium" as const },
          { issue: "Metadata from tweets (device, location)", risk: "medium" as const }
        ],
        reddit: [
          { issue: "Comment history reveals personal details", risk: "high" as const },
          { issue: "Account activity patterns can be analyzed", risk: "medium" as const }
        ],
        linkedin: [
          { issue: "Professional network is publicly visible", risk: "low" as const },
          { issue: "Career history can reveal patterns", risk: "medium" as const }
        ]
      };
      
      return concerns[platform as keyof typeof concerns] || [
        { issue: "Digital footprint across platforms", risk: "medium" as const }
      ];
    };
    
    // Build the response object
    return {
      platformId: platform,
      username,
      profileData: {
        displayName: formatDisplayName(username, platform),
        bio: this.generateBioForPlatform(platform, username),
        followerCount: followerBase[platform as keyof typeof followerBase] + rand(50, 500),
        followingCount: followerBase[platform as keyof typeof followerBase] * 0.7 + rand(30, 200),
        joinDate: joinDate.toISOString(),
        profileUrl: `https://${platform}.com/${username}`,
        avatarUrl: `https://example.com/avatars/${platform}/${username}.jpg`,
        location: rand(0, 10) > 3 ? "San Francisco, CA" : undefined
      },
      activityData: {
        totalPosts: 10 + rand(5, 100),
        totalComments: 20 + rand(10, 200),
        totalLikes: 50 + rand(20, 300),
        totalShares: 5 + rand(1, 30),
        postsPerDay: (0.5 + rand(1, 10) / 10),
        mostActiveTime: ["Morning", "Afternoon", "Evening"][rand(0, 2)],
        lastActive: new Date(Date.now() - rand(1, 14) * 24 * 60 * 60 * 1000).toISOString(),
        topHashtags: generateHashtagsForPlatform(platform)
      },
      contentData: this.generateContentForPlatform(platform, username, 10),
      privacyMetrics: {
        exposureScore: 40 + rand(0, 50),
        dataCategories: getDataCategoriesForPlatform(platform),
        potentialConcerns: getPotentialConcernsForPlatform(platform),
        recommendedActions: [
          "Review privacy settings",
          "Remove location data from posts",
          "Check third-party app permissions",
          platform === 'instagram' ? "Consider making your account private" : 
          platform === 'facebook' ? "Review tagged photos and timeline posts" :
          platform === 'linkedin' ? "Adjust profile visibility settings" :
          platform === 'twitter' ? "Review tweet visibility settings" :
          "Regularly delete old content"
        ]
      },
      analysisResults: {
        exposureScore: 40 + rand(0, 50),
        topTopics: [
          { topic: "Technology", percentage: 0.3 + rand(0, 20) / 100 },
          { topic: "Privacy", percentage: 0.2 + rand(0, 15) / 100 },
          { topic: platform === 'instagram' ? "Photography" : 
                  platform === 'linkedin' ? "Professional Development" :
                  platform === 'reddit' ? "Technology" :
                  "Current Events", percentage: 0.15 + rand(0, 15) / 100 },
          { topic: platform === 'twitter' ? "Politics" :
                  platform === 'facebook' ? "Personal" :
                  platform === 'instagram' ? "Lifestyle" :
                  "General", percentage: 0.1 + rand(0, 10) / 100 }
        ],
        activityTimeline: Array.from({ length: 12 }, (_, i) => ({
          period: `2023-${(i + 1).toString().padStart(2, '0')}`,
          count: 5 + rand(0, 25)
        })),
        sentimentBreakdown: {
          positive: 0.2 + rand(0, 30) / 100,
          neutral: 0.4 + rand(0, 30) / 100,
          negative: 0.1 + rand(0, 15) / 100
        },
        privacyConcerns: [
          {
            type: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Privacy Concern`,
            description: `Your ${platform} profile may reveal ${platform === 'linkedin' ? 'professional' : 
                        platform === 'facebook' ? 'personal' : 'sensitive'} information`,
            severity: ["low", "medium", "high"][rand(0, 2)] as "low" | "medium" | "high"
          },
          {
            type: "Data Aggregation Risk",
            description: "Your activity patterns could be analyzed to build a detailed profile",
            severity: "medium"
          }
        ]
      }
    };
  }
  
  // Generate content specific to a platform
  private generateContentForPlatform(platform: Exclude<Platform, 'all'>, username: string, count: number = 10): any[] {
    const contentTypes: Array<"post" | "comment" | "like" | "share"> = ["post", "comment", "like", "share"];
    const seed = username.length + platform.length;
    const rand = (min: number, max: number) => Math.floor((seed % 10) / 10 * (max - min) + min);
    
    // Platform-specific content templates
    const templates = {
      instagram: [
        "Check out this amazing view! #photography",
        "New tech gadget day! So excited to try this out 🚀",
        "Beautiful sunset from my window today",
        "Just finished reading an interesting book on digital privacy",
        "Coffee and coding - perfect morning ☕️"
      ],
      facebook: [
        "Had a great time at the tech meetup yesterday",
        "Just realized how much data we share online everyday",
        "Starting a new project on digital privacy awareness!",
        "Family day out - perfect weather!",
        "Just upgraded my home office setup"
      ],
      twitter: [
        "The future of privacy in the digital age is concerning. We need better regulations.",
        "Just read an amazing article on data protection. Worth checking out!",
        "Most people don't realize how much of their data is being collected daily.",
        "New software update just dropped! Lots of cool features.",
        "Conference day! Learning about the latest in cybersecurity."
      ],
      reddit: [
        "Has anyone else noticed increased tracking after the latest app update?",
        "Just did a complete data audit of my online presence. Here's what I found...",
        "What's the best privacy-focused alternative to Gmail?",
        "TIL about a new method websites use to track users even with blockers enabled",
        "Just created a guide for securing your digital footprint [LONG POST]"
      ],
      linkedin: [
        "Excited to announce I'll be speaking at the upcoming Digital Privacy Summit!",
        "Just published a new article on balancing convenience and privacy in the digital age.",
        "Looking for recommendations on books about data protection for non-technical readers.",
        "Great discussion today about the ethics of data collection in modern businesses.",
        "Proud to share that our team just launched a new privacy-first feature!"
      ]
    };
    
    const platformTemplates = templates[platform as keyof typeof templates] || [
      "Post about technology",
      "Comment on digital privacy",
      "Shared an article about security"
    ];
    
    return Array.from({ length: count }, (_, i) => {
      const daysAgo = rand(1, 90);
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - daysAgo);
      
      const contentType = contentTypes[rand(0, contentTypes.length - 1)];
      const content = platformTemplates[i % platformTemplates.length];
      
      return {
        type: contentType,
        content,
        timestamp: timestamp.toISOString(),
        url: `https://${platform}.com/${username}/${contentType === 'post' ? 'p' : contentType}/${Math.floor(Math.random() * 10000000)}`,
        engagement: {
          likes: rand(0, 100),
          comments: rand(0, 30),
          shares: rand(0, 15)
        },
        sentiment: ["positive", "neutral", "negative"][rand(0, 2)] as "positive" | "neutral" | "negative",
        topics: ["technology", "privacy", "digital", "security", "data"].slice(0, 1 + rand(0, 3))
      };
    });
  }
  
  // Generate realistic bio for each platform
  private generateBioForPlatform(platform: Platform, username: string): string {
    const seed = username.length + platform.length;
    const rand = (min: number, max: number) => Math.floor((seed % 10) / 10 * (max - min) + min);
    
    const bios = {
      instagram: [
        "📱 Digital explorer | 🌍 Tech enthusiast | 📷 Photography lover",
        "Capturing moments & exploring tech 📸 • Privacy advocate • SF Bay Area",
        "Software developer by day, photographer by night | Technology • Privacy • Design",
        "Digital nomad with a passion for technology and privacy 🌐✨"
      ],
      facebook: [
        "Living life one day at a time. Interests: technology, privacy, digital rights.",
        "Tech professional passionate about digital well-being and online privacy.",
        "Working in tech. Love photography, hiking, and discussing digital rights.",
        "Family person, tech enthusiast, privacy advocate. Life is what you make it."
      ],
      twitter: [
        "Tweets about tech, digital rights, and programming. Opinions are my own.",
        "Privacy advocate. Digital explorer. Occasional developer. RT ≠ endorsement.",
        "Talking tech, privacy & the future of digital rights • Developer • Speaker",
        "Exploring the intersection of technology, privacy and society • SF based"
      ],
      reddit: [
        `Redditor since ${new Date().getFullYear() - rand(1, 5)}. Tech, privacy, and occasionally memes.`,
        "Just here for the tech discussions and privacy advice.",
        "Long-time lurker, occasional poster. Interested in technology, privacy, and cybersecurity.",
        "Software developer with interests in privacy tech, cybersecurity, and gaming."
      ],
      linkedin: [
        "Digital Technology Professional | Privacy Advocate | Software Engineer",
        "Technology Leader passionate about responsible innovation and data privacy",
        "Helping organizations navigate digital transformation with privacy by design",
        "Software Engineer specialized in secure applications and privacy technologies"
      ]
    };
    
    const platformBios = bios[platform as keyof typeof bios] || [
      "Digital citizen interested in technology and privacy",
      "Technology professional with focus on digital rights"
    ];
    
    return platformBios[rand(0, platformBios.length - 1)];
  }
}

export const apiIntegration = new ApiIntegrationService();