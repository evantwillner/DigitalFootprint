import { ChartData } from "@/lib/types";

// Enhanced timeline data interface with additional properties for animations
export interface TimelineActivityData extends ChartData {
  date: Date;  // Original date object for better sorting and filtering
  platforms?: Record<string, number>; // Activity count by platform
  sentiment?: { positive: number, neutral: number, negative: number }; // Sentiment distribution
  contentTypes?: { posts: number, comments: number, likes: number, shares: number }; // Content type distribution
  highlighted?: boolean; // Flag for animation highlighting
}

// Generate enhanced timeline data with more details
export function generateTimelineData(months: number = 12, detailed: boolean = false): TimelineActivityData[] | ChartData[] {
  const data: TimelineActivityData[] = [];
  const currentDate = new Date();
  
  for (let i = 0; i < months; i++) {
    const date = new Date(currentDate);
    date.setMonth(currentDate.getMonth() - i);
    
    if (detailed) {
      // Generate more detailed data for interactive timeline
      data.unshift({
        name: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        value: Math.floor(Math.random() * 30) + 5,
        date: new Date(date), // Store the original date object
        platforms: {
          instagram: Math.floor(Math.random() * 20),
          facebook: Math.floor(Math.random() * 15),
          twitter: Math.floor(Math.random() * 25),
          reddit: Math.floor(Math.random() * 10),
          linkedin: Math.floor(Math.random() * 5)
        },
        sentiment: {
          positive: 20 + Math.floor(Math.random() * 30),
          neutral: 30 + Math.floor(Math.random() * 40),
          negative: 5 + Math.floor(Math.random() * 15)
        },
        contentTypes: {
          posts: Math.floor(Math.random() * 10),
          comments: Math.floor(Math.random() * 20),
          likes: Math.floor(Math.random() * 30),
          shares: Math.floor(Math.random() * 5)
        },
        highlighted: false
      });
    } else {
      // Simple data for regular charts
      data.unshift({
        name: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        value: Math.floor(Math.random() * 30) + 5,
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

// Custom colors for charts - using vibrant color palette
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

// Generate custom tooltip content for charts
export function customTooltip(props: any): any {
  // The JSX implementation should be handled by the component using this function
  // Here we'll just return the data needed for tooltip
  const { active, payload } = props;
  
  if (active && payload && payload.length) {
    return {
      name: payload[0].name,
      value: payload[0].value
    };
  }
  
  return null;
}
