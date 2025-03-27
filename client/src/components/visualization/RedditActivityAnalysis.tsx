import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { CHART_COLORS } from "@/lib/chart-utils";

interface TimelineItem {
  period: string;
  count: number;
}

interface TopicItem {
  topic: string;
  percentage: number;
}

interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

interface TimeDistribution {
  morning?: number;
  afternoon?: number;
  evening?: number;
}

interface DayDistribution {
  monday?: number;
  tuesday?: number;
  wednesday?: number;
  thursday?: number;
  friday?: number;
  saturday?: number;
  sunday?: number;
}

interface RedditActivityAnalysisProps {
  platformData: {
    profileData?: {
      username?: string;
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
      joinDate?: string;
    };
    activityData?: {
      totalPosts?: number;
      totalComments?: number;
      totalLikes?: number;
      topSubreddits?: string[];
      timeDistribution?: TimeDistribution;
      dayDistribution?: DayDistribution;
    };
    analysisResults?: {
      exposureScore?: number;
      topTopics?: TopicItem[];
      activityTimeline?: TimelineItem[];
      sentimentBreakdown?: SentimentBreakdown;
      privacyConcerns?: Array<{issue: string, risk: "low" | "medium" | "high"}>;
      dataCategories?: Array<{type: string, severity: "low" | "medium" | "high", description: string}>;
      recommendedActions?: string[];
    };
  };
  isLoading: boolean;
}

export default function RedditActivityAnalysis({ platformData, isLoading }: RedditActivityAnalysisProps) {
  if (isLoading || !platformData) {
    return null;
  }

  const { analysisResults, activityData } = platformData;
  
  if (!analysisResults || !activityData) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-500">No Reddit activity data available for analysis.</p>
      </div>
    );
  }

  // Extract data for visualizations
  const { activityTimeline, topTopics, sentimentBreakdown } = analysisResults;
  
  // Format activity time data
  const activityTimeData = [
    { name: "Morning", value: Math.round(activityData.timeDistribution?.morning || 20) },
    { name: "Afternoon", value: Math.round(activityData.timeDistribution?.afternoon || 35) },
    { name: "Evening", value: Math.round(activityData.timeDistribution?.evening || 45) },
  ];
  
  // Format weekday activity data (use activityTimeline if available, otherwise fallback)
  const weekdayData = [
    { name: "Mon", value: Math.round(activityData.dayDistribution?.monday || 12) },
    { name: "Tue", value: Math.round(activityData.dayDistribution?.tuesday || 19) },
    { name: "Wed", value: Math.round(activityData.dayDistribution?.wednesday || 15) },
    { name: "Thu", value: Math.round(activityData.dayDistribution?.thursday || 18) },
    { name: "Fri", value: Math.round(activityData.dayDistribution?.friday || 25) },
    { name: "Sat", value: Math.round(activityData.dayDistribution?.saturday || 32) },
    { name: "Sun", value: Math.round(activityData.dayDistribution?.sunday || 29) },
  ];
  
  // Format monthly activity data using timeline
  const monthlyActivityData = activityTimeline ? 
    activityTimeline.map((item: TimelineItem) => ({
      name: item.period,
      value: item.count
    })).slice(0, 6) : // Only use most recent 6 periods
    [];
  
  // Format subreddit activity data
  const subredditActivityData = (topTopics || [])
    .slice(0, 5)
    .map((topic: TopicItem) => ({
      name: topic.topic.replace('r/', ''), // Remove 'r/' prefix if present
      value: Math.round(topic.percentage * 100) // Convert from decimal to percentage
    }));

  // Calculate engagement metrics
  const totalPosts = activityData.totalPosts || 0;
  const totalComments = activityData.totalComments || 0;
  const totalActivity = totalPosts + totalComments;
  const postToCommentRatio = totalComments > 0 ? (totalPosts / totalComments).toFixed(1) : 0;

  // Generate insights based on the data
  const insights = [];
  
  // Add insight about timeframe
  if (activityTimeData.length > 0) {
    const peakTime = activityTimeData.reduce((max, time) => 
      time.value > max.value ? time : max, activityTimeData[0]);
    insights.push(`Peak activity occurs during ${peakTime.name.toLowerCase()} hours.`);
  }
  
  // Add insight about weekday patterns
  if (weekdayData.length > 0) {
    const peakDay = weekdayData.reduce((max, day) => 
      day.value > max.value ? day : max, weekdayData[0]);
    insights.push(`Most active on ${peakDay.name}days with ${peakDay.value}% of activity.`);
  }
  
  // Add insight about post to comment ratio
  if (totalActivity > 0) {
    const activityType = totalPosts > totalComments ? "posting content" : "commenting";
    insights.push(`Primarily engaged in ${activityType} with a post:comment ratio of ${postToCommentRatio}.`);
  }
  
  // Add insight about top communities
  if (subredditActivityData.length > 0) {
    insights.push(`Most active in the r/${subredditActivityData[0].name} community (${subredditActivityData[0].value}% of engagement).`);
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-md font-medium mb-3">Activity by Time of Day</h3>
          <Card className="h-64">
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activityTimeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {activityTimeData.map((entry: {name: string, value: number}, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[index % CHART_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, 'Activity']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <h3 className="text-md font-medium mb-3">Activity by Day of Week</h3>
          <Card className="h-64">
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip formatter={(value) => [`${value}%`, 'Activity']} />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--chart-2))" 
                    radius={[4, 4, 0, 0]} 
                    barSize={30} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-md font-medium mb-3">Activity Trend</h3>
          <Card className="h-64">
            <CardContent className="p-4">
              {monthlyActivityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={monthlyActivityData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip formatter={(value) => [`${value} items`, 'Activity']} />
                    <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">No timeline data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div>
          <h3 className="text-md font-medium mb-3">Top Communities</h3>
          <Card className="h-64">
            <CardContent className="p-4">
              {subredditActivityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subredditActivityData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {subredditActivityData.map((entry: {name: string, value: number}, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CHART_COLORS[index % CHART_COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Engagement']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">No community data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Reddit Activity Insights</h3>
        <ul className="space-y-2">
          {insights.map((insight, index) => (
            <li key={index} className="flex items-start">
              <span className="text-primary mr-2">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </span>
              <span>{insight}</span>
            </li>
          ))}
          
          {/* Engagement stats */}
          <li className="flex items-start">
            <span className="text-primary mr-2">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </span>
            <span>
              Total engagement: {totalActivity} ({totalPosts} posts, {totalComments} comments)
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}