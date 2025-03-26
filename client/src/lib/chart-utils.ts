import { ChartData } from "@/lib/types";

// Generate random data for timeline chart
export function generateTimelineData(months: number = 12): ChartData[] {
  const data: ChartData[] = [];
  const currentDate = new Date();
  
  for (let i = 0; i < months; i++) {
    const date = new Date(currentDate);
    date.setMonth(currentDate.getMonth() - i);
    
    data.unshift({
      name: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      value: Math.floor(Math.random() * 30) + 5
    });
  }
  
  return data;
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

// Custom colors for charts
export const CHART_COLORS = [
  "hsl(var(--chart-1))", 
  "hsl(var(--chart-2))", 
  "hsl(var(--chart-3))", 
  "hsl(var(--chart-4))", 
  "hsl(var(--chart-5))"
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
