import { ChartData } from "@/lib/types";

// Define interface for locations in footprint
export interface LocationData {
  city?: string;
  country?: string;
  count: number;
  coordinates?: [number, number]; // [longitude, latitude]
}

// Define interface for content classification
export interface ContentClassification {
  category: string;
  count: number;
  sentiment: number; // -1 to 1 score
  keywords: string[];
  sample?: string;
}

// Enhanced timeline data interface with additional properties for animations
export interface TimelineActivityData extends ChartData {
  date: Date;  // Original date object for better sorting and filtering
  platforms?: Record<string, number>; // Activity count by platform
  sentiment?: { positive: number, neutral: number, negative: number }; // Sentiment distribution
  contentTypes?: { posts: number, comments: number, likes: number, shares: number }; // Content type distribution
  highlighted?: boolean; // Flag for animation highlighting
  locations?: LocationData[]; // Geographic data
  topics?: ContentClassification[]; // Topic classification
  privacyScore?: number; // Privacy risk score (0-100)
  engagementRate?: number; // Engagement rate as percentage
}

// Generate enhanced timeline data with more details
export function generateTimelineData(months: number = 12, detailed: boolean = false): TimelineActivityData[] | ChartData[] {
  const data: TimelineActivityData[] = [];
  const currentDate = new Date();
  
  // Pattern generator functions for more realistic trends
  const trendGenerator = () => {
    // Create a base value with some randomness
    const baseValue = 15 + Math.sin(Math.random() * Math.PI) * 10;
    // Create an array of multipliers to simulate trend patterns
    const pattern = Array(months).fill(0).map((_, i) => {
      // Add seasonal variation (higher in summer/winter months)
      const seasonal = Math.sin((i / months) * Math.PI * 2) * 0.3 + 1;
      // Add growth trend (activity increases over time)
      const growth = 1 + (i / months) * 0.5;
      // Add some randomness
      const noise = 0.85 + Math.random() * 0.3;
      return seasonal * growth * noise;
    }).reverse();
    
    return (index: number) => Math.floor(baseValue * pattern[index]);
  };
  
  // Create trend generators for each data type
  const activityTrend = trendGenerator();
  const positiveTrend = trendGenerator();
  const neutralTrend = trendGenerator();
  const negativeTrend = trendGenerator();
  const postsTrend = trendGenerator();
  const commentsTrend = trendGenerator();
  const likesTrend = trendGenerator();
  const sharesTrend = trendGenerator();
  
  // Platform-specific trends
  const platformTrends = {
    instagram: trendGenerator(),
    facebook: trendGenerator(),
    twitter: trendGenerator(),
    reddit: trendGenerator(),
    linkedin: trendGenerator()
  };
  
  for (let i = 0; i < months; i++) {
    const date = new Date(currentDate);
    date.setMonth(currentDate.getMonth() - i);
    
    if (detailed) {
      // Generate more detailed data for interactive timeline
      const positiveVal = positiveTrend(i);
      const neutralVal = neutralTrend(i);
      const negativeVal = negativeTrend(i);
      const totalSentiment = positiveVal + neutralVal + negativeVal;
      
      // Sample locations with varying frequencies
      const locations: LocationData[] = [
        { city: "San Francisco", country: "USA", count: Math.floor(Math.random() * 5) + 1, coordinates: [-122.4194, 37.7749] },
        { city: "New York", country: "USA", count: Math.floor(Math.random() * 3) + 1, coordinates: [-74.0060, 40.7128] },
        { city: "London", country: "UK", count: Math.floor(Math.random() * 4), coordinates: [-0.1278, 51.5074] },
        { city: "Tokyo", country: "Japan", count: Math.floor(Math.random() * 2), coordinates: [139.6503, 35.6762] }
      ].filter(loc => loc.count > 0); // Only include locations with non-zero count
      
      // Topic classification with sentiment
      const topics: ContentClassification[] = [
        {
          category: "Technology",
          count: Math.floor(Math.random() * 10) + 5,
          sentiment: 0.3 + Math.random() * 0.4,
          keywords: ["programming", "javascript", "react", "web development"]
        },
        {
          category: "Privacy",
          count: Math.floor(Math.random() * 5) + 1,
          sentiment: -0.2 + Math.random() * 0.6,
          keywords: ["data protection", "privacy concerns", "security", "encryption"]
        },
        {
          category: "Social Media",
          count: Math.floor(Math.random() * 8) + 3,
          sentiment: 0.1 + Math.random() * 0.3,
          keywords: ["facebook", "instagram", "social networks", "online presence"]
        },
        {
          category: "Career",
          count: Math.floor(Math.random() * 6) + 2,
          sentiment: 0.5 + Math.random() * 0.4,
          keywords: ["job", "professional development", "skills", "networking"]
        }
      ];
      
      // Calculate privacy score based on content and platform activity
      const privacyScore = Math.min(80, 30 + Math.floor(
        (platformTrends.facebook(i) * 1.5 + platformTrends.instagram(i) * 1.2 + locations.length * 3) / 4
      ));
      
      // Calculate engagement rate
      const contentCount = postsTrend(i);
      const engagementCount = commentsTrend(i) + likesTrend(i) + sharesTrend(i);
      const engagementRate = contentCount > 0 ? (engagementCount / contentCount) * 100 : 0;
      
      data.unshift({
        name: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        value: activityTrend(i),
        date: new Date(date), // Store the original date object
        platforms: {
          instagram: platformTrends.instagram(i),
          facebook: platformTrends.facebook(i),
          twitter: platformTrends.twitter(i),
          reddit: platformTrends.reddit(i),
          linkedin: platformTrends.linkedin(i)
        },
        sentiment: {
          positive: positiveVal,
          neutral: neutralVal,
          negative: negativeVal
        },
        contentTypes: {
          posts: postsTrend(i),
          comments: commentsTrend(i),
          likes: likesTrend(i),
          shares: sharesTrend(i)
        },
        locations,
        topics,
        privacyScore,
        engagementRate,
        highlighted: false
      });
    } else {
      // Simple data for regular charts
      data.unshift({
        name: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        value: activityTrend(i),
        date: new Date(date)
      });
    }
  }
  
  return data;
}

// Filter timeline data by date range
export function filterTimelineByDateRange(
  data: TimelineActivityData[],
  startDate: Date,
  endDate: Date
): TimelineActivityData[] {
  return data.filter(item => 
    item.date >= startDate && item.date <= endDate
  );
}

// Get activity breakdown by platform for a specific time period
export function getActivityByPlatform(
  data: TimelineActivityData[],
  period: string
): ChartData[] {
  const periodData = data.find(item => item.name === period);
  
  if (!periodData || !periodData.platforms) {
    return [];
  }
  
  return Object.entries(periodData.platforms).map(([platform, count]) => ({
    name: platform,
    value: count
  }));
}

// Generate sentiment data over time
export function generateSentimentTimeline(data: TimelineActivityData[]): Array<{
  name: string;
  positive: number;
  neutral: number;
  negative: number;
}> {
  return data.map(item => {
    if (!item.sentiment) return { name: item.name, positive: 0, neutral: 0, negative: 0 };
    
    const total = item.sentiment.positive + item.sentiment.neutral + item.sentiment.negative;
    const multiplier = total > 0 ? 100 / total : 0;
    
    return {
      name: item.name,
      positive: Math.round(item.sentiment.positive * multiplier),
      neutral: Math.round(item.sentiment.neutral * multiplier),
      negative: Math.round(item.sentiment.negative * multiplier)
    };
  });
}

// Get top locations from timeline data
export function getTopLocations(data: TimelineActivityData[]): LocationData[] {
  // Aggregate all location data
  const locationMap = new Map<string, LocationData>();
  
  data.forEach(item => {
    if (!item.locations) return;
    
    item.locations.forEach(loc => {
      const key = `${loc.city || ""}|${loc.country || ""}`;
      
      if (locationMap.has(key)) {
        const existing = locationMap.get(key)!;
        existing.count += loc.count;
      } else {
        locationMap.set(key, { ...loc });
      }
    });
  });
  
  // Convert to array and sort by count
  return Array.from(locationMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Return top 10 locations
}

// Get topics trend over time
export function getTopicsTrend(data: TimelineActivityData[]): Array<{
  period: string;
  [key: string]: string | number;
}> {
  return data.map(item => {
    if (!item.topics) return { period: item.name };
    
    const result: { period: string; [key: string]: string | number } = { period: item.name };
    
    item.topics.forEach(topic => {
      result[topic.category] = topic.count;
    });
    
    return result;
  });
}

// Calculate privacy risk factors
export function calculatePrivacyRiskFactors(data: TimelineActivityData[]): Array<{
  factor: string;
  score: number;
  description: string;
}> {
  // Extract max values from the entire dataset
  const maxPlatformActivity = Math.max(...data.flatMap(item => 
    item.platforms ? Object.values(item.platforms) : [0]
  ));
  
  const locationCount = data.reduce((sum, item) => 
    sum + (item.locations?.length || 0), 0
  );
  
  const totalNegativeSentiment = data.reduce((sum, item) => 
    sum + (item.sentiment?.negative || 0), 0
  );
  
  // Calculate risk factors
  return [
    {
      factor: "Profile Visibility",
      score: Math.min(100, Math.round((maxPlatformActivity / 30) * 100)),
      description: "Based on your activity level across platforms"
    },
    {
      factor: "Location Sharing",
      score: Math.min(100, Math.round((locationCount / data.length) * 50)),
      description: "Based on geographic data in your posts"
    },
    {
      factor: "Content Sensitivity",
      score: Math.min(100, Math.round((totalNegativeSentiment / (data.length * 10)) * 100)),
      description: "Based on potentially sensitive or negative content"
    },
    {
      factor: "Temporal Patterns",
      score: Math.round(Math.random() * 40) + 20,
      description: "Based on predictable posting patterns and routines"
    },
    {
      factor: "Personal Information",
      score: Math.round(Math.random() * 50) + 30,
      description: "Based on personal details shared in content"
    }
  ];
}

// Generate topic distribution data
export function generateTopicData(): ChartData[] {
  return [
    { name: "Technology", value: 45 },
    { name: "Programming", value: 25 },
    { name: "Gaming", value: 15 },
    { name: "Travel", value: 15 }
  ];
}

// Generate sentiment data
export function generateSentimentData(): ChartData[] {
  return [
    { name: "Positive", value: 30 },
    { name: "Neutral", value: 60 },
    { name: "Negative", value: 10 }
  ];
}

// Generate engagement data
export function generateEngagementData(): ChartData[] {
  return [
    { name: "Comments", value: 183 },
    { name: "Likes", value: 91 },
    { name: "Shares", value: 21 },
    { name: "Posts", value: 47 }
  ];
}

// Generate time distribution data (when is the user most active)
export function generateTimeDistribution(): Array<{ hour: number; count: number }> {
  return Array.from({ length: 24 }, (_, hour) => {
    // Create a realistic pattern with higher activity in evenings
    let baseValue = 5;
    
    // Morning bump (8-10am)
    if (hour >= 8 && hour <= 10) {
      baseValue = 15;
    }
    // Lunch time (12-1pm)
    else if (hour >= 12 && hour <= 13) {
      baseValue = 20;
    }
    // Evening peak (7-10pm)
    else if (hour >= 19 && hour <= 22) {
      baseValue = 30;
    }
    // Late night (11pm-2am)
    else if (hour >= 23 || hour <= 2) {
      baseValue = 12;
    }
    
    // Add some randomness
    const value = baseValue + Math.floor(Math.random() * (baseValue * 0.4));
    
    return {
      hour,
      count: value
    };
  });
}

// Custom colors for charts - using modern gradient palette
export const CHART_COLORS = [
  "#8b5cf6", // Violet
  "#f43f5e", // Rose
  "#06b6d4", // Cyan
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#ec4899", // Pink
  "#3b82f6", // Blue
  "#84cc16"  // Lime
];

// Color gradients for special charts
export const GRADIENT_COLORS = {
  activity: {
    start: "#8b5cf6",
    end: "#ec4899"
  },
  engagement: {
    start: "#10b981",
    end: "#84cc16"
  },
  sentiment: {
    positive: "#10b981",
    neutral: "#6b7280",
    negative: "#f43f5e"
  },
  privacy: {
    safe: "#84cc16",
    moderate: "#f59e0b",
    risk: "#f43f5e"
  }
};

// Format large numbers (e.g., 1000 -> 1K)
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Format percentages
export function formatPercent(num: number): string {
  return `${Math.round(num)}%`;
}

// Generate custom tooltip content for charts
export function customTooltip(props: any): any {
  const { active, payload, label } = props;
  
  if (active && payload && payload.length) {
    return {
      label,
      name: payload[0].name,
      value: payload[0].value,
      payload: payload[0].payload
    };
  }
  
  return null;
}

// Get privacy score color based on value
export function getPrivacyScoreColor(score: number): string {
  if (score <= 30) return GRADIENT_COLORS.privacy.safe;
  if (score <= 60) return GRADIENT_COLORS.privacy.moderate;
  return GRADIENT_COLORS.privacy.risk;
}
