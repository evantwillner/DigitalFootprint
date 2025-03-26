import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabContentProps } from "@/lib/types";
import { Platform } from "@shared/schema";
import { PLATFORM_CONFIG } from "@/lib/platform-icons";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { CHART_COLORS, generateTimelineData, generateTopicData } from "@/lib/chart-utils";

// Summary stat card component
const StatCard = ({ title, value, subValue, description, progress, additional }: { 
  title: string; 
  value: string | number; 
  subValue?: string; 
  description?: string;
  progress?: number;
  additional?: React.ReactNode;
}) => (
  <div className="bg-blue-50 p-4 rounded-lg">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="18" 
        height="18" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="text-primary"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    </div>
    <div className="mt-2 flex items-baseline">
      <p className="text-3xl font-bold text-primary">{value}</p>
      {subValue && <p className="ml-2 text-sm text-gray-600">{subValue}</p>}
    </div>
    {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
    {progress !== undefined && (
      <div className="mt-3 w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-primary h-2.5 rounded-full" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    )}
    {additional && <div className="mt-3">{additional}</div>}
  </div>
);

export default function SummaryTab({ data, isLoading }: TabContentProps) {
  const [, setLocation] = useLocation();
  
  // Generate platform icons based on the found platforms
  const renderPlatformIcons = (platforms: Platform[]) => {
    return (
      <div className="flex space-x-2">
        {platforms.map(platform => (
          <div 
            key={platform}
            className={`h-8 w-8 rounded-full flex items-center justify-center text-white ${
              PLATFORM_CONFIG[platform].color.startsWith("from-")
                ? `bg-gradient-to-tr ${PLATFORM_CONFIG[platform].color}`
                : PLATFORM_CONFIG[platform].color
            }`}
          >
            <span className="transform scale-75">
              {PLATFORM_CONFIG[platform].icon}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No data available. Please conduct a search first.</p>
        <Button onClick={() => setLocation("/search")}>Go to Search</Button>
      </div>
    );
  }

  // Data for charts - use actual platform data if available
  let redditData = null;
  // Check if we have Reddit data specifically
  for (const platform of data.platformData) {
    if (platform.platformId === 'reddit') {
      redditData = platform;
      break;
    }
  }
  
  // Use Reddit data if available, otherwise use first platform or generate fallback data
  const platformToUse = redditData || data.platformData[0];
  
  // Parse Reddit-specific stats
  let redditSpecificStats = {
    accountAge: "",
    karmaPerYear: 0,
    topSubreddits: [] as string[],
    postToCommentRatio: 0,
    accountCreated: "",
    commentKarma: 0,
    postKarma: 0,
  };

  if (redditData) {
    // Convert joinDate to a more human-readable format and calculate account age
    const joinDate = new Date(redditData.profileData?.joinDate || "");
    const now = new Date();
    const yearDiff = now.getFullYear() - joinDate.getFullYear();
    
    redditSpecificStats.accountAge = yearDiff === 1 
      ? "1 year" 
      : `${yearDiff} years`;
    
    redditSpecificStats.accountCreated = joinDate.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Calculate karma per year
    const totalKarma = (redditData.activityData?.totalPosts || 0) + (redditData.activityData?.totalComments || 0);
    redditSpecificStats.karmaPerYear = Math.round(totalKarma / Math.max(yearDiff, 1));
    
    // Get top subreddits
    redditSpecificStats.topSubreddits = redditData.activityData?.topSubreddits || [];
    
    // Post to comment ratio
    const posts = redditData.activityData?.totalPosts || 0;
    const comments = redditData.activityData?.totalComments || 0;
    redditSpecificStats.postToCommentRatio = comments > 0 ? Math.round((posts / comments) * 10) / 10 : 0;
    
    // Store karma values
    redditSpecificStats.commentKarma = redditData.activityData?.totalComments || 0;
    redditSpecificStats.postKarma = redditData.activityData?.totalPosts || 0;
  }
  
  // Format timeline data
  const timelineData = platformToUse?.analysisResults?.activityTimeline?.map(item => ({
    name: item.period,
    value: item.count
  })) || generateTimelineData();
  
  // Format topic data
  const topicData = platformToUse?.analysisResults?.topTopics?.map(item => ({
    name: item.topic,
    value: item.percentage
  })) || generateTopicData();

  // Generate Reddit-specific insights if Reddit data is available
  let redditInsights: {insight: string, type: "info" | "warning"}[] = [];
  let redditRecommendations: string[] = [];
  
  if (redditData) {
    // Add insight about total karma/posts - directly from the data
    const totalPosts = redditData.activityData?.totalPosts || 0;
    const totalComments = redditData.activityData?.totalComments || 0;
    
    redditInsights.push({
      insight: `Account has ${totalPosts + totalComments} total karma points, with ${totalPosts} from posts and ${totalComments} from comments.`,
      type: "info"
    });
    
    // Add insight about when the account was created - directly from the data
    const joinDate = new Date(redditData.profileData?.joinDate || "");
    const formattedDate = joinDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    redditInsights.push({
      insight: `Reddit account created in ${formattedDate}.`,
      type: "info"
    });
    
    // Add insights based on Reddit account age
    if (redditSpecificStats.accountAge.includes("1 year") || 
        (redditSpecificStats.accountAge.includes("years") && parseInt(redditSpecificStats.accountAge) <= 2)) {
      redditInsights.push({
        insight: "Relatively new Reddit account (less than 2 years old) may have limited historical data.",
        type: "info"
      });
    } else if (redditSpecificStats.accountAge.includes("years") && parseInt(redditSpecificStats.accountAge) >= 7) {
      redditInsights.push({
        insight: "Long-term Reddit account (over 7 years) has a substantial digital history that may contain forgotten content.",
        type: "warning"
      });
      redditRecommendations.push("Review historical posts from the early years of your Reddit account to identify outdated personal information.");
    }
    
    // Add insights based on karma and activity level
    if (redditSpecificStats.karmaPerYear > 5000) {
      redditInsights.push({
        insight: "Very high Reddit activity level suggests significant digital exposure.",
        type: "warning"
      });
      redditRecommendations.push("Consider using Reddit's bulk edit tools to review and clean up your extensive post history.");
    } else if (redditSpecificStats.karmaPerYear < 100) {
      redditInsights.push({
        insight: "Low Reddit activity level indicates minimal digital exposure on this platform.",
        type: "info"
      });
    }
    
    // Add insights based on post/comment ratio
    if (redditSpecificStats.postToCommentRatio > 3) {
      redditInsights.push({
        insight: "Primarily creates new content rather than commenting, increasing visibility.",
        type: "warning"
      });
      redditRecommendations.push("Review your submissions to ensure no personally identifiable information is exposed in your posts.");
    } else if (redditSpecificStats.postToCommentRatio < 0.2) {
      redditInsights.push({
        insight: "Mostly comments on others' content rather than creating new posts.",
        type: "info"
      });
      redditRecommendations.push("Check your comment history for personal details that may have been shared in discussions.");
    }
    
    // Add insights based on number of subreddits
    if (redditSpecificStats.topSubreddits.length > 0) {
      const subredditList = redditSpecificStats.topSubreddits.slice(0, 3).map(s => `r/${s}`).join(", ");
      
      if (redditSpecificStats.topSubreddits.length > 10) {
        redditInsights.push({
          insight: `Active in many different subreddits (${redditSpecificStats.topSubreddits.length} total), including ${subredditList}.`,
          type: "warning"
        });
        redditRecommendations.push("Review posts across different subreddits to ensure consistency in privacy practices.");
      } else if (redditSpecificStats.topSubreddits.length <= 3) {
        redditInsights.push({
          insight: `Activity concentrated in just a few subreddits: ${subredditList}.`,
          type: "info"
        });
      } else {
        redditInsights.push({
          insight: `Active in ${redditSpecificStats.topSubreddits.length} subreddits, including ${subredditList}.`,
          type: "info"
        });
      }
    }
    
    // Additional Reddit-specific privacy concerns
    if (redditData.profileData?.bio) {
      redditInsights.push({
        insight: "Your Reddit profile contains a public bio that may reveal personal information.",
        type: "warning"
      });
      redditRecommendations.push("Review your Reddit bio for personal information that could be removed.");
    }
    
    // Add recommendation about Reddit's archiving policies
    redditRecommendations.push("Be aware that Reddit content is frequently archived by third-party services even after deletion.");
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Digital Exposure Score" 
          value={data.summary.exposureScore} 
          subValue="/ 100" 
          description={
            data.summary.exposureScore > 75 
              ? "High online visibility" 
              : data.summary.exposureScore > 50 
                ? "Moderate-high online visibility" 
                : "Moderate online visibility"
          }
          progress={data.summary.exposureScore}
        />
        
        <StatCard 
          title="Platforms Found" 
          value={data.summary.platformsFound}
          description={data.platforms.join(", ")}
          additional={renderPlatformIcons(data.platforms as Platform[])}
        />
        
        <StatCard 
          title="Content Items" 
          value={data.summary.totalContentItems} 
          subValue="total items" 
          description="Posts, comments, likes, shares"
          additional={
            <div className="grid grid-cols-4 gap-1 text-center">
              <div>
                <p className="text-xs text-gray-600">Posts</p>
                <p className="font-medium text-gray-800">{data.summary.breakdownByType.posts}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Comments</p>
                <p className="font-medium text-gray-800">{data.summary.breakdownByType.comments}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Likes</p>
                <p className="font-medium text-gray-800">{data.summary.breakdownByType.likes}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Shares</p>
                <p className="font-medium text-gray-800">{data.summary.breakdownByType.shares}</p>
              </div>
            </div>
          }
        />
      </div>
      
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">Digital Footprint Summary</h3>
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-700 mb-3">
              Based on the analysis of <span className="font-medium">{data.username}</span>'s public Reddit activity, we've generated the following Reddit-specific insights:
            </p>
            <ul className="space-y-2 text-gray-700">
              {/* Only use Reddit-specific insights that we've dynamically generated */}
              {redditInsights.length > 0 ? (
                redditInsights.map((insight, index) => (
                  <li key={index} className="flex items-start">
                    <span className={`mr-2 mt-0.5 ${insight.type === 'warning' ? 'text-warning' : 'text-primary'}`}>
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
                        {insight.type === 'warning' ? (
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        ) : (
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        )}
                        {insight.type === 'warning' ? (
                          <path d="M12 9v4" />
                        ) : (
                          <polyline points="9 11 12 14 22 4" />
                        )}
                        {insight.type === 'warning' && <path d="M12 16h.01" />}
                      </svg>
                    </span>
                    <span>{insight.insight}</span>
                  </li>
                ))
              ) : (
                <li>
                  <p className="text-gray-500">No insights available for this Reddit account.</p>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
      
      {redditData && (
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4">Reddit Account Details</h3>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Account Age</h4>
                  <p className="text-xl font-semibold">{redditSpecificStats.accountAge}</p>
                  <p className="text-sm text-gray-500 mt-1">Created on {redditSpecificStats.accountCreated}</p>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Total Karma</h4>
                  <p className="text-xl font-semibold">{redditSpecificStats.postKarma + redditSpecificStats.commentKarma}</p>
                  <div className="flex text-sm text-gray-500 mt-1 justify-between">
                    <span>Post: {redditSpecificStats.postKarma}</span>
                    <span>Comment: {redditSpecificStats.commentKarma}</span>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Karma Per Year</h4>
                  <p className="text-xl font-semibold">{redditSpecificStats.karmaPerYear}</p>
                  <p className="text-sm text-gray-500 mt-1">Activity level: {
                    redditSpecificStats.karmaPerYear > 5000 
                      ? "Very High" 
                      : redditSpecificStats.karmaPerYear > 1000 
                        ? "High" 
                        : redditSpecificStats.karmaPerYear > 200 
                          ? "Moderate" 
                          : "Low"
                  }</p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Post/Comment Ratio</h4>
                  <p className="text-xl font-semibold">{redditSpecificStats.postToCommentRatio}:1</p>
                  <p className="text-sm text-gray-500 mt-1">{
                    redditSpecificStats.postToCommentRatio > 2 
                      ? "Primarily a content creator" 
                      : redditSpecificStats.postToCommentRatio > 0.5 
                        ? "Balanced creator/commenter" 
                        : "Primarily a commenter"
                  }</p>
                </div>
                
                <div className="border rounded-lg p-4 md:col-span-2">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Top Subreddits</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {redditSpecificStats.topSubreddits.length > 0 ? (
                      redditSpecificStats.topSubreddits.map((subreddit, index) => (
                        <span 
                          key={index} 
                          className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-medium text-gray-700"
                        >
                          r/{subreddit}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">No subreddit data available</p>
                    )}
                  </div>
                </div>
              </div>
              
              {redditRecommendations.length > 0 && (
                <div className="mt-6 border-t pt-6">
                  <h4 className="text-base font-medium text-gray-900 mb-3">Reddit-Specific Recommendations</h4>
                  <ul className="space-y-2">
                    {redditRecommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2 text-primary">
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="18" 
                            height="18" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                            <path d="m9 12 2 2 4-4"/>
                          </svg>
                        </span>
                        <span className="text-gray-700">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="text-lg font-medium mb-4">Activity Timeline</h3>
          <Card className="h-64">
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
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
                    width={30}
                  />
                  <Tooltip />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--chart-1))" 
                    radius={[4, 4, 0, 0]} 
                    barSize={20} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-4">Content Topics</h3>
          <Card className="h-64">
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topicData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {topicData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[index % CHART_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Ready to clean your digital footprint?</h3>
            <p className="text-gray-600 mt-1">Our premium service can help you remove unwanted content and secure your online presence.</p>
          </div>
          <Button 
            className="mt-4 md:mt-0 px-6 py-3 bg-[#10b981] hover:bg-[#0d9488]"
            onClick={() => setLocation("/pricing")}
          >
            Explore Clean-up Options
          </Button>
        </div>
      </div>
    </>
  );
}
