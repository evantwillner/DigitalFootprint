import axios from 'axios';
import { Platform, PlatformData } from '@shared/schema';
import { twitterApi } from './twitter-api';
import { redditApi } from './reddit-api';
import { instagramApi } from './instagram-api-v2'; // Updated to use the improved v2 API
import { log } from '../vite';

/**
 * Platform API Service
 * 
 * This service handles the connections to various social media platform APIs
 * to retrieve digital footprint data.
 */
class PlatformApiService {
  private apiKeys: Record<string, string> = {};
  
  constructor() {
    // In production, these would be loaded from environment variables
    this.loadApiKeys();
  }
  
  private loadApiKeys() {
    const supportedPlatforms = ['instagram', 'facebook', 'linkedin'] as const;
    type SupportedPlatform = typeof supportedPlatforms[number];
    
    supportedPlatforms.forEach(platform => {
      const keyName = `${platform.toUpperCase()}_API_KEY`;
      if (process.env[keyName]) {
        this.apiKeys[platform] = process.env[keyName]!;
      }
    });
    
    // Twitter and Reddit are handled by dedicated services
    
    // Log status of API keys for debugging
    log(`API keys loaded for: ${Object.keys(this.apiKeys).join(', ') || 'none'}`, 'platform-api');
  }
  
  /**
   * Fetch user data from a social media platform
   * @param platform Platform to fetch data from
   * @param username Username to look up
   * @returns Platform data or null if not found/accessible
   */
  public async fetchUserData(platform: Exclude<Platform, 'all'>, username: string): Promise<PlatformData | null> {
    log(`Fetching data for ${username} on ${platform}`, 'platform-api');
    
    try {
      // First check if this is a platform we currently support
      const supportedPlatforms = ['instagram', 'facebook', 'reddit', 'twitter', 'linkedin'] as const;
      
      if (!supportedPlatforms.includes(platform as any)) {
        log(`Platform ${platform} is not currently supported`, 'platform-api');
        return null;
      }
      
      // Use platform-specific API services
      if (platform === 'twitter') {
        return await twitterApi.fetchUserData(username);
      }
      
      if (platform === 'reddit') {
        // Handle Reddit usernames that might still have u/ prefix
        let redditUsername = username;
        if (redditUsername.startsWith('u/')) {
          redditUsername = redditUsername.substring(2);
          log(`Removed 'u/' prefix from Reddit username: ${redditUsername}`, 'platform-api');
        } else if (redditUsername.startsWith('/u/')) {
          redditUsername = redditUsername.substring(3);
          log(`Removed '/u/' prefix from Reddit username: ${redditUsername}`, 'platform-api');
        }
        
        // Get data from the Reddit API
        const redditData = await redditApi.fetchUserData(redditUsername);
        
        // Log what we received
        if (redditData) {
          log(`Received Reddit data for ${redditUsername} with platform ID: ${redditData.platformId}`, 'platform-api');
        } else {
          log(`No Reddit data returned for ${redditUsername}`, 'platform-api');
        }
        
        return redditData;
      }
      
      if (platform === 'instagram') {
        // Get data from Instagram API
        log(`Fetching Instagram data for ${username}`, 'platform-api');
        const instagramData = await instagramApi.fetchUserData(username);
        
        // Log what we received
        if (instagramData) {
          log(`Successfully fetched data for ${username} on Instagram (${instagramData.platformId})`, 'platform-api');
        } else {
          log(`No Instagram data returned for ${username}`, 'platform-api');
        }
        
        return instagramData;
      }
      
      // For other platforms, check if we have access to their API
      if (this.apiKeys[platform]) {
        // In a production app, this would make the actual API call
        log(`Using API key for ${platform} to fetch data for ${username}`, 'platform-api');
        return this.mockPlatformResponse(platform, username);
      } else {
        // Use simulation mode
        log(`No API key for ${platform}, using simulated data for ${username}`, 'platform-api');
        return this.mockPlatformResponse(platform, username);
      }
    } catch (error) {
      console.error(`Error fetching data from ${platform} for ${username}:`, error);
      return null;
    }
  }
  
  /**
   * Mock responses for development purposes
   * In production, this would be replaced with actual API calls
   */
  private async mockPlatformResponse(platform: Platform, username: string): Promise<PlatformData> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
    
    // Generate platform-specific data
    const joinDate = new Date();
    joinDate.setFullYear(joinDate.getFullYear() - Math.floor(Math.random() * 5) - 1);
    
    // Follower counts by platform (typical averages for non-celebrities)
    const followerCount = {
      instagram: Math.floor(500 + Math.random() * 1500),
      facebook: Math.floor(200 + Math.random() * 800),
      twitter: Math.floor(100 + Math.random() * 1000),
      reddit: Math.floor(10 + Math.random() * 100),
      linkedin: Math.floor(200 + Math.random() * 400)
    }[platform as 'instagram' | 'facebook' | 'twitter' | 'reddit' | 'linkedin'] || 100;
    
    // Different bio templates by platform
    const getBio = (platform: Platform) => {
      const bios = {
        instagram: "📱 Digital explorer | 🌍 Tech enthusiast | 📷 Photography lover",
        facebook: "Living life one day at a time. Interests in technology, privacy, and digital world.",
        twitter: "Tweets about tech, digital rights, and programming. Opinions are my own.",
        reddit: `Redditor since ${joinDate.getFullYear()}. Tech, privacy, and memes.`,
        linkedin: "Digital Technology Professional | Privacy Advocate | Software Engineer"
      };
      
      return bios[platform as keyof typeof bios] || "Digital citizen";
    };
    
    // Content templates by platform
    const getContentTemplate = (platform: Platform) => {
      const templates = {
        instagram: [
          "Check out this amazing tech conference! #tech #innovation",
          "New gadget day! So excited to try this out 🚀",
          "Beautiful sunset from my office today. #worklife",
          "Just finished a great book on digital privacy. Highly recommend!",
          "Coffee and coding - perfect morning ☕️💻"
        ],
        facebook: [
          "Had a great time at the tech meetup yesterday. Met some amazing people!",
          "Just realized how much data we share online everyday. Time for a digital detox?",
          "Happy to announce I've started a new project on digital privacy awareness!",
          "Family day at the beach. Perfect weather! ☀️",
          "Just upgraded my home office setup. Productivity level over 9000!"
        ],
        twitter: [
          "The future of privacy in the digital age is concerning. We need better regulations. #DigitalRights",
          "Just read an amazing article on data protection. Worth checking out! #Privacy",
          "Hot take: Most people don't realize how much of their data is being collected daily.",
          "New software update just dropped! Lots of cool features. #TechNews",
          "Conference day! Ready to learn about the latest in cybersecurity. #InfoSec"
        ],
        reddit: [
          "Has anyone else noticed increased tracking after the latest app update?",
          "Just did a complete data audit of my online presence. Here's what I found...",
          "Question: What's the best privacy-focused alternative to Gmail?",
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
      
      return templates[platform as keyof typeof templates] || 
        ["Post about technology", "Comment on digital privacy", "Shared an article about security"];
    };
    
    // Hashtags by platform
    const getHashtags = (platform: Platform) => {
      const tags = {
        instagram: ["#tech", "#photography", "#privacy", "#innovation", "#coding", "#cybersecurity"],
        facebook: ["#memories", "#family", "#friends", "#technology", "#privacy"],
        twitter: ["#privacy", "#technology", "#security", "#digitalrights", "#programming"],
        reddit: [], // Reddit doesn't really use hashtags
        linkedin: ["#career", "#technology", "#privacy", "#innovation", "#leadership"]
      };
      
      const platformTags = tags[platform as keyof typeof tags] || [];
      if (platformTags.length === 0) return undefined;
      
      // Select random subset of hashtags
      return platformTags
        .sort(() => 0.5 - Math.random())
        .slice(0, 2 + Math.floor(Math.random() * 3));
    };
    
    // Generate content items
    const generateContent = (count: number = 10) => {
      const contentTypes: Array<"post" | "comment" | "like" | "share"> = ["post", "comment", "like", "share"];
      const templates = getContentTemplate(platform);
      
      return Array.from({ length: count }, (_, i) => {
        const daysAgo = Math.floor(Math.random() * 60);
        const timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - daysAgo);
        
        return {
          type: contentTypes[Math.floor(Math.random() * contentTypes.length)],
          content: templates[i % templates.length],
          timestamp: timestamp.toISOString(),
          url: `https://${platform}.com/${username}/post${i}`,
          engagement: {
            likes: Math.floor(Math.random() * 100),
            comments: Math.floor(Math.random() * 20),
            shares: Math.floor(Math.random() * 10)
          },
          sentiment: ["positive", "neutral", "negative"][Math.floor(Math.random() * 3)] as "positive" | "neutral" | "negative",
          topics: ["technology", "privacy", "security", "data protection"].slice(0, 1 + Math.floor(Math.random() * 3))
        };
      });
    };
    
    // Get platform-specific privacy concerns
    const getPrivacyConcerns = (platform: Platform) => {
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
          { issue: "Comment history reveals personal details", risk: "medium" as const },
          { issue: "Account activity patterns can be analyzed", risk: "low" as const }
        ],
        linkedin: [
          { issue: "Professional network is publicly visible", risk: "low" as const },
          { issue: "Career history timeline exposed", risk: "low" as const }
        ]
      };
      
      return concerns[platform as keyof typeof concerns] || [
        { issue: "Digital footprint across platforms", risk: "medium" as const }
      ];
    };
    
    // Get data categories at risk
    const getDataCategories = (platform: Platform) => {
      const categories = {
        instagram: [
          { category: "Photos", severity: "medium" as const },
          { category: "Location Data", severity: "high" as const },
          { category: "Personal Interests", severity: "low" as const }
        ],
        facebook: [
          { category: "Personal Relationships", severity: "medium" as const },
          { category: "Life Events", severity: "medium" as const },
          { category: "Political Views", severity: "high" as const }
        ],
        twitter: [
          { category: "Opinions", severity: "medium" as const },
          { category: "Frequent Contacts", severity: "low" as const },
          { category: "Real-time Location", severity: "high" as const }
        ],
        reddit: [
          { category: "Anonymous Activity", severity: "low" as const },
          { category: "Personal Interests", severity: "medium" as const },
          { category: "Opinions", severity: "medium" as const }
        ],
        linkedin: [
          { category: "Professional History", severity: "low" as const },
          { category: "Education", severity: "low" as const },
          { category: "Professional Network", severity: "low" as const }
        ]
      };
      
      return categories[platform as keyof typeof categories] || [
        { category: "Online Presence", severity: "medium" as const }
      ];
    };
    
    // Return platform-specific data
    return {
      platformId: platform as Exclude<Platform, 'all'>,
      username,
      profileData: {
        displayName: username.charAt(0).toUpperCase() + username.slice(1),
        bio: getBio(platform),
        followerCount,
        followingCount: Math.floor(followerCount * (0.5 + Math.random() * 0.5)),
        joinDate: joinDate.toISOString(),
        profileUrl: `https://${platform}.com/${username}`,
        avatarUrl: `https://example.com/avatars/${platform}/${username}.jpg`,
        location: Math.random() > 0.3 ? "San Francisco, CA" : undefined
      },
      activityData: {
        totalPosts: Math.floor(Math.random() * 100) + 10,
        totalComments: Math.floor(Math.random() * 300) + 20,
        totalLikes: Math.floor(Math.random() * 500) + 30,
        totalShares: Math.floor(Math.random() * 50) + 5,
        postsPerDay: parseFloat((Math.random() * 1.5).toFixed(1)),
        mostActiveTime: ["Morning", "Afternoon", "Evening"][Math.floor(Math.random() * 3)],
        lastActive: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
        topHashtags: getHashtags(platform)
      },
      contentData: generateContent(),
      privacyMetrics: {
        exposureScore: 30 + Math.floor(Math.random() * 50),
        dataCategories: getDataCategories(platform),
        potentialConcerns: getPrivacyConcerns(platform),
        recommendedActions: [
          "Review privacy settings",
          "Remove location data from posts",
          "Check third-party app permissions",
          "Consider making your account private"
        ]
      },
      analysisResults: {
        exposureScore: 30 + Math.floor(Math.random() * 50),
        topTopics: [
          { topic: "Technology", percentage: 0.4 + Math.random() * 0.2 },
          { topic: "Privacy", percentage: 0.2 + Math.random() * 0.2 },
          { topic: "Data Security", percentage: 0.1 + Math.random() * 0.1 },
          { topic: "Digital Rights", percentage: 0.1 + Math.random() * 0.1 }
        ],
        activityTimeline: Array.from({ length: 12 }, (_, i) => ({
          period: `2023-${(i + 1).toString().padStart(2, '0')}`,
          count: Math.floor(Math.random() * 20) + 5
        })),
        sentimentBreakdown: {
          positive: 0.2 + Math.random() * 0.3,
          neutral: 0.3 + Math.random() * 0.4,
          negative: 0.1 + Math.random() * 0.2
        },
        privacyConcerns: [
          {
            type: `${platform} Privacy Issue`,
            description: `Your ${platform} account may be exposing personal information`,
            severity: ["low", "medium", "high"][Math.floor(Math.random() * 3)] as "low" | "medium" | "high"
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
}

// Export as a singleton
export const platformApi = new PlatformApiService();