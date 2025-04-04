import { useEffect, useState } from "react";
import { DigitalFootprintResponse, Platform } from "@shared/schema";
import { useLocation } from "wouter";

interface UsePlatformDataResult {
  data: DigitalFootprintResponse | undefined;
  isLoading: boolean;
  error: Error | null;
}

// Sample data for demonstration purposes
const SAMPLE_DATA: DigitalFootprintResponse = {
  username: "johndoe",
  timestamp: new Date().toISOString(),
  platforms: ["instagram", "twitter", "facebook", "reddit", "linkedin"],
  platformErrors: {
    "twitter": "Twitter API rate limit exceeded. Some data may be incomplete."
  },
  platformData: [
    {
      platformId: "instagram",
      username: "johndoe",
      profileData: {
        displayName: "John Doe",
        bio: "Digital enthusiast | Tech lover | Privacy advocate",
        followerCount: 1243,
        followingCount: 567,
        joinDate: "2018-05-12T00:00:00Z",
        profileUrl: "https://instagram.com/johndoe",
        avatarUrl: "https://example.com/avatar.jpg",
        location: "San Francisco, CA"
      },
      activityData: {
        totalPosts: 128,
        totalComments: 342,
        totalLikes: 982,
        totalShares: 56,
        postsPerDay: 0.8,
        mostActiveTime: "Evening",
        lastActive: "2023-11-15T18:23:00Z",
        topHashtags: ["#tech", "#privacy", "#digital", "#photography"]
      },
      contentData: Array.from({ length: 10 }, (_, i) => ({
        type: ["post", "comment", "like", "share"][Math.floor(Math.random() * 4)] as "post" | "comment" | "like" | "share",
        content: `Sample content item ${i + 1} - Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
        timestamp: new Date(Date.now() - i * 86400000 * 5).toISOString(),
        url: `https://instagram.com/post${i}`,
        engagement: {
          likes: Math.floor(Math.random() * 100),
          comments: Math.floor(Math.random() * 20),
          shares: Math.floor(Math.random() * 10)
        },
        sentiment: ["positive", "neutral", "negative"][Math.floor(Math.random() * 3)] as "positive" | "neutral" | "negative",
        topics: ["Technology", "Privacy", "Digital Rights"]
      }))
    },
    {
      platformId: "twitter",
      username: "johndoe",
      profileData: {
        displayName: "John Doe",
        bio: "Tweeting about tech and privacy",
        followerCount: 892,
        followingCount: 412,
        joinDate: "2016-03-21T00:00:00Z",
        profileUrl: "https://twitter.com/johndoe",
        avatarUrl: "https://example.com/avatar_twitter.jpg"
      },
      activityData: {
        totalPosts: 1238,
        totalComments: 853,
        totalLikes: 4271,
        totalShares: 321,
        postsPerDay: 2.3,
        mostActiveTime: "Morning",
        lastActive: "2023-11-16T09:45:00Z",
        topHashtags: ["#technology", "#privacy", "#infosec", "#ai"]
      },
      contentData: Array.from({ length: 8 }, (_, i) => ({
        type: ["post", "comment", "like", "share"][Math.floor(Math.random() * 4)] as "post" | "comment" | "like" | "share",
        content: `Sample Twitter content ${i + 1} - Sharing thoughts on the latest tech trends.`,
        timestamp: new Date(Date.now() - i * 86400000 * 3).toISOString(),
        url: `https://twitter.com/status${i}`,
        engagement: {
          likes: Math.floor(Math.random() * 50),
          comments: Math.floor(Math.random() * 15),
          shares: Math.floor(Math.random() * 8)
        },
        sentiment: ["positive", "neutral", "negative"][Math.floor(Math.random() * 3)] as "positive" | "neutral" | "negative",
        topics: ["AI", "Machine Learning", "Privacy"]
      }))
    },
    {
      platformId: "facebook",
      username: "johndoe",
      profileData: {
        displayName: "John Doe",
        followerCount: 427,
        followingCount: 352,
        joinDate: "2010-08-14T00:00:00Z",
        profileUrl: "https://facebook.com/johndoe"
      },
      activityData: {
        totalPosts: 342,
        totalComments: 762,
        totalLikes: 2183,
        totalShares: 86,
        postsPerDay: 0.5,
        mostActiveTime: "Evening",
        lastActive: "2023-11-14T20:30:00Z"
      }
    },
    {
      platformId: "reddit",
      username: "johndoe",
      profileData: {
        displayName: "JohnDoe",
        joinDate: "2015-11-30T00:00:00Z",
        profileUrl: "https://reddit.com/user/johndoe"
      },
      activityData: {
        totalPosts: 87,
        totalComments: 412,
        totalLikes: 1327,
        postsPerDay: 0.3,
        mostActiveTime: "Late Night",
        lastActive: "2023-11-16T01:15:00Z",
        topSubreddits: ["r/technology", "r/privacy", "r/programming", "r/dataisbeautiful"]
      }
    },
    {
      platformId: "linkedin",
      username: "johndoe",
      profileData: {
        displayName: "John Doe",
        bio: "Technology Professional | Privacy Advocate",
        followerCount: 623,
        joinDate: "2012-05-23T00:00:00Z",
        profileUrl: "https://linkedin.com/in/johndoe",
        location: "San Francisco Bay Area"
      },
      activityData: {
        totalPosts: 64,
        totalComments: 128,
        totalLikes: 346,
        totalShares: 28,
        postsPerDay: 0.2,
        mostActiveTime: "Afternoon",
        lastActive: "2023-11-15T14:00:00Z"
      }
    }
  ],
  summary: {
    exposureScore: 72,
    platformsFound: 5,
    totalContentItems: 1859,
    breakdownByType: {
      posts: 487,
      comments: 876,
      likes: 428,
      shares: 68
    },
    topInsights: [
      {
        insight: "Active on multiple platforms with consistent personal branding",
        type: "info"
      },
      {
        insight: "Significant public engagement on Twitter may expose personal opinions",
        type: "warning"
      },
      {
        insight: "Regular activity patterns could reveal daily schedule",
        type: "warning"
      },
      {
        insight: "Uses similar usernames across platforms making cross-platform identification easy",
        type: "warning"
      }
    ],
    recommendations: [
      "Review privacy settings on Instagram and Facebook",
      "Consider using different usernames across platforms",
      "Check third-party app permissions regularly",
      "Set up alerts for mentions of your name online",
      "Review and clean up old posts that may contain sensitive information"
    ]
  }
};

/**
 * Custom hook for retrieving digital footprint data
 * This hook checks sessionStorage for existing results from actual API responses
 * and redirects to search if no data is found
 */
export default function usePlatformData(): UsePlatformDataResult {
  const [data, setData] = useState<DigitalFootprintResponse>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Try to get data from sessionStorage
        const storedData = sessionStorage.getItem("searchResults");
        console.log("usePlatformData: Checking for stored data in sessionStorage");
        
        if (storedData) {
          // Use stored data if available
          console.log("usePlatformData: Found stored data");
          const parsedData = JSON.parse(storedData) as DigitalFootprintResponse;
          
          if (!parsedData) {
            console.error("usePlatformData: Parsed data is null or undefined");
            throw new Error("Invalid search results data format");
          }
          
          // Check if we have real platform data or sample data
          if (parsedData.platformData && parsedData.platformData.length > 0) {
            const platform = parsedData.platformData[0].platformId;
            const username = parsedData.platformData[0].username;
            console.log(`usePlatformData: Found real data for ${username} on ${platform}`);
            console.log("usePlatformData: Profile data:", parsedData.platformData[0].profileData);
            console.log("usePlatformData: Activity data:", parsedData.platformData[0].activityData);
            
            // Special debugging for chart-related data
            if (parsedData.platformData[0].analysisResults) {
              const results = parsedData.platformData[0].analysisResults;
              
              console.log("usePlatformData: Analysis results found");
              
              // Debug timeline data
              if (results.activityTimeline) {
                console.log("usePlatformData: Activity timeline data:", results.activityTimeline);
                // Check if timeline has reasonable data for visualization
                const hasNonZeroValues = results.activityTimeline.some(item => item.count > 0);
                console.log("usePlatformData: Timeline has non-zero values:", hasNonZeroValues);
              } else {
                console.warn("usePlatformData: No activity timeline data found");
              }
              
              // Debug topic breakdown
              if (results.topTopics) {
                console.log("usePlatformData: Topic breakdown data:", results.topTopics);
                // Check if topics have reasonable percentages
                const totalPercentage = results.topTopics.reduce((sum, topic) => sum + topic.percentage, 0);
                console.log("usePlatformData: Total topic percentage:", totalPercentage);
              } else {
                console.warn("usePlatformData: No topic breakdown data found");
              }
              
              // Debug sentiment data
              if (results.sentimentBreakdown) {
                console.log("usePlatformData: Sentiment data:", results.sentimentBreakdown);
                const sentimentSum = results.sentimentBreakdown.positive + 
                                     results.sentimentBreakdown.neutral + 
                                     results.sentimentBreakdown.negative;
                console.log("usePlatformData: Sentiment proportions sum:", sentimentSum);
              } else {
                console.warn("usePlatformData: No sentiment data found");
              }
            } else {
              console.warn("usePlatformData: No analysis results found");
            }
          } else {
            console.warn("usePlatformData: No platform data found in results");
            // Add a message to the data object to explain that no data was found
            parsedData.noDataMessage = "No data found for this username. The user may not exist or has no public data available.";
          }
          
          setData(parsedData);
          console.log("usePlatformData: Data set successfully");
        } else {
          // No data found - redirect to search
          console.warn("usePlatformData: No search results found in sessionStorage");
          navigate("/search");
          throw new Error("No search results found. Please perform a search first.");
        }
      } catch (err) {
        console.error("usePlatformData error:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  return { data, isLoading, error };
}
