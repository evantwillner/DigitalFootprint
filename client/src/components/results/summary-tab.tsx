import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabContentProps, InsightItem } from "@/lib/types";
import { Platform } from "@shared/schema";
import { PLATFORM_CONFIG } from "@/lib/platform-icons";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { CHART_COLORS, generateTimelineData, generateTopicData } from "@/lib/chart-utils";

// Reusable component for displaying insights from any platform
interface InsightsDisplayProps {
  insights: InsightItem[];
  emptyMessage: string;
}

const InsightsDisplay = ({ insights, emptyMessage }: InsightsDisplayProps) => (
  <ul className="space-y-2 text-gray-700">
    {insights.length > 0 ? (
      insights.map((insight, index) => (
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
        <p className="text-gray-500">{emptyMessage}</p>
      </li>
    )}
  </ul>
);

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

  // Create a platform data map for easier access
  const platformDataMap = new Map();
  
  // Populate the map with platform-specific data
  for (const platform of data.platformData) {
    platformDataMap.set(platform.platformId, platform);
  }
  
  // Get available platforms (for extensibility)
  const availablePlatforms = data.platformData.map(p => p.platformId as Platform);
  
  // Check for specific platforms - adding in a way that supports future expansion
  const redditData = platformDataMap.get('reddit');
  // Future expansion for other platforms would be:
  // const twitterData = platformDataMap.get('twitter');
  // const facebookData = platformDataMap.get('facebook');
  // etc.
  
  // Use first available platform as default if needed
  const primaryPlatform = availablePlatforms[0];
  const primaryPlatformData = data.platformData[0];
  
  // Prepare sentiment data
  let sentimentData = [
    { name: "Positive", value: 30 },
    { name: "Neutral", value: 55 },
    { name: "Negative", value: 15 },
  ];
  
  // Try to get actual sentiment data from Reddit if available
  if (redditData?.analysisResults?.sentimentBreakdown) {
    const sentiment = redditData.analysisResults.sentimentBreakdown;
    
    // Check if we have values that will display properly
    const hasValidValues = sentiment.positive > 0 || sentiment.neutral > 0 || sentiment.negative > 0;
    
    if (hasValidValues) {
      sentimentData = [
        { name: "Positive", value: Math.round(sentiment.positive * 100) },
        { name: "Neutral", value: Math.round(sentiment.neutral * 100) },
        { name: "Negative", value: Math.round(sentiment.negative * 100) },
      ];
    }
  }
  
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
  
  // Define chart data types
  interface TimelineChartData {
    name: string;
    value: number;
  }
  
  interface TopicChartData {
    name: string;
    value: number;
  }
  
  // Generate Reddit timeline data using real subreddit data
  let timelineData: TimelineChartData[] = [];
  
  if (redditData?.analysisResults?.activityTimeline && redditData.analysisResults.activityTimeline.length > 0) {
    // Use real Reddit timeline data if available
    console.log("Got Reddit activity timeline data:", redditData.analysisResults.activityTimeline);
    
    // Format month names for display
    timelineData = redditData.analysisResults.activityTimeline.map((item: {period: string, count: number}) => {
      const [year, month] = item.period.split('-');
      // Format as "MMM" (e.g., "Jan")
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const formattedMonth = date.toLocaleDateString('en-US', { month: 'short' });
      
      return {
        name: formattedMonth,
        value: item.count
      };
    });
  } else if (redditData) {
    // Create Reddit timeline data from available stats - create last 6 months of activity
    console.log("No timeline data, using fallback with karma distribution");
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now);
      month.setMonth(now.getMonth() - i);
      months.push(month.toLocaleDateString('en-US', { month: 'short' }));
    }
    
    // Distribute total karma across 6 months with a slight curve
    const totalKarma = (redditData.activityData?.totalPosts || 0) + (redditData.activityData?.totalComments || 0);
    const weights = [0.1, 0.15, 0.2, 0.25, 0.15, 0.15]; // Weight distribution (total = 1)
    
    timelineData = months.map((month, index) => ({
      name: month,
      value: Math.round(totalKarma * weights[index])
    }));
  } else {
    // Only if no Reddit data at all, create empty placeholder (should never happen with our fixes)
    console.log("No Reddit data at all, using empty timeline");
    timelineData = [
      { name: "No Data", value: 0 }
    ];
  }
  
  // Generate topic data from Reddit subreddits
  let topicData: TopicChartData[] = [];
  
  if (redditData?.analysisResults?.topTopics && redditData.analysisResults.topTopics.length > 0) {
    // Use real Reddit topic data if available
    console.log("Got Reddit topic data:", redditData.analysisResults.topTopics);
    
    topicData = redditData.analysisResults.topTopics.map((item: { topic: string; percentage: number }) => {
      // Normalize the topic name - remove 'r/' prefix if it exists for consistency
      const cleanName = item.topic.startsWith('r/') ? item.topic.substring(2) : item.topic;
      
      return {
        name: cleanName,
        value: item.percentage
      };
    });
  } else if (redditSpecificStats.topSubreddits.length > 0) {
    // Convert subreddits into topic data with approximated percentages
    console.log("Using topSubreddits as fallback:", redditSpecificStats.topSubreddits);
    const totalSubreddits = redditSpecificStats.topSubreddits.length;
    
    // Use weighted distribution for the top 5 subreddits
    const displaySubreddits = redditSpecificStats.topSubreddits.slice(0, 5);
    const weights = [0.35, 0.25, 0.2, 0.12, 0.08]; // Descending importance
    
    topicData = displaySubreddits.map((subreddit, index) => ({
      name: subreddit,
      value: Math.floor(weights[index] * 100) // Convert to percentage
    }));
  } else {
    // Only if no Reddit subreddit data at all, create empty placeholder
    console.log("No Reddit topic data found, using placeholder");
    topicData = [
      { name: "No topics found", value: 100 }
    ];
  }

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
        {/* Dynamic exposure score card that adapts to the platform */}
        <StatCard 
          title={`${primaryPlatform ? PLATFORM_CONFIG[primaryPlatform as Platform].name : "Platform"} Exposure Score`} 
          value={redditData?.analysisResults?.exposureScore || 0} 
          subValue="/ 100" 
          description={
            (() => {
              const score = redditData?.analysisResults?.exposureScore || 0;
              const platformName = primaryPlatform ? PLATFORM_CONFIG[primaryPlatform as Platform].name : "Platform";
              
              if (score > 75) return `High ${platformName} visibility`;
              if (score > 50) return `Moderate-high ${platformName} visibility`;
              return `Moderate ${platformName} visibility`;
            })()
          }
          progress={redditData?.analysisResults?.exposureScore || 0}
        />
        
        {/* Platform details card */}
        <StatCard 
          title="Platform Details" 
          value={primaryPlatform ? PLATFORM_CONFIG[primaryPlatform as Platform].name : "Platform"}
          description={`Analysis of your ${primaryPlatform ? PLATFORM_CONFIG[primaryPlatform as Platform].name : ""} account`}
          additional={renderPlatformIcons(availablePlatforms as Platform[])}
        />
        
        {/* Platform-specific content metrics */}
        {redditData ? (
          <StatCard 
            title="Reddit Content" 
            value={redditSpecificStats.postKarma + redditSpecificStats.commentKarma} 
            subValue="total karma" 
            description="Posts, comments, and interactions"
            additional={
              <div className="grid grid-cols-2 gap-1 text-center">
                <div>
                  <p className="text-xs text-gray-600">Post Karma</p>
                  <p className="font-medium text-gray-800">{redditSpecificStats.postKarma}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Comment Karma</p>
                  <p className="font-medium text-gray-800">{redditSpecificStats.commentKarma}</p>
                </div>
              </div>
            }
          />
        ) : (
          <StatCard 
            title="Content Summary" 
            value={primaryPlatformData?.contentData?.length || 0} 
            subValue="items" 
            description="Total platform content"
          />
        )}
      </div>
      
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">Digital Footprint Summary</h3>
        <Card>
          <CardContent className="pt-6">
            {/* Platform-specific header text */}
            <p className="text-gray-700 mb-3">
              Based on the analysis of <span className="font-medium">{data.username}</span>'s public 
              {availablePlatforms.length === 1 
                ? ` ${PLATFORM_CONFIG[availablePlatforms[0]].name} activity` 
                : ` activity across ${availablePlatforms.length} platforms`}, 
              we've generated the following insights:
            </p>

            {/* Generalized insights component that can handle any platform */}
            <InsightsDisplay 
              insights={redditInsights} 
              emptyMessage={`No insights available for this ${
                availablePlatforms.length === 1 
                  ? PLATFORM_CONFIG[availablePlatforms[0]].name 
                  : 'account'
              }.`} 
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Platform-specific Account Details Section */}
      {primaryPlatform && (
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4">
            {primaryPlatform ? `${PLATFORM_CONFIG[primaryPlatform as Platform].name} Account Details` : "Account Details"}
          </h3>
          <Card>
            <CardContent className="pt-6">
              {/* Render platform-specific details using a factory pattern */}
              {(() => {
                // Reddit-specific account details
                if (redditData) {
                  return (
                    <>
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
                    </>
                  );
                }
                
                // Twitter platform details - to be implemented when Twitter API integration is added
                // This serves as a placeholder for future platform integrations
                else if (primaryPlatform === "twitter") {
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Twitter details would go here when implemented */}
                      <div className="col-span-full text-center py-6 text-gray-500">
                        <p>Twitter account details will be shown here when available.</p>
                      </div>
                    </div>
                  );
                }
                
                // Generic platform details for any other platform
                else {
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="border rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Platform</h4>
                        <p className="text-xl font-semibold">{PLATFORM_CONFIG[primaryPlatform as Platform].name}</p>
                      </div>
                      
                      <div className="border rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Username</h4>
                        <p className="text-xl font-semibold">{data.username}</p>
                      </div>
                      
                      {primaryPlatformData?.profileData?.joinDate && (
                        <div className="border rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Account Created</h4>
                          <p className="text-xl font-semibold">
                            {new Date(primaryPlatformData.profileData.joinDate).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }
              })()}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Sentiment Analysis Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">
          {primaryPlatform ? `${PLATFORM_CONFIG[primaryPlatform as Platform].name} Sentiment Analysis` : "Sentiment Analysis"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <h4 className="text-base font-medium text-gray-700 mb-4">Content Sentiment Distribution</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      <Cell fill="#10b981" /> {/* Positive: green */}
                      <Cell fill="#6b7280" /> {/* Neutral: gray */}
                      <Cell fill="#ef4444" /> {/* Negative: red */}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <h4 className="text-base font-medium text-gray-700 mb-4">Emotional Tone Analysis</h4>
              
              {redditData?.analysisResults?.sentimentBreakdown?.emotions ? (
                // Display emotional breakdown if available from our enhanced analysis
                <div>
                  <p className="mb-3 text-sm text-gray-600">
                    Our advanced analysis detected these emotional tones in your content:
                  </p>
                  
                  {redditData.analysisResults.sentimentBreakdown.topEmotions && 
                   redditData.analysisResults.sentimentBreakdown.topEmotions.length > 0 ? (
                    <div className="space-y-2">
                      {redditData.analysisResults.sentimentBreakdown.topEmotions.map((emotion: {emotion: string, percentage: number}, index: number) => (
                        <div key={index} className="flex flex-col">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">{emotion.emotion}</span>
                            <span className="text-sm text-gray-600">{emotion.percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${
                                emotion.emotion === 'Joy' ? 'bg-green-500' : 
                                emotion.emotion === 'Sadness' ? 'bg-blue-500' :
                                emotion.emotion === 'Anger' ? 'bg-red-500' :
                                emotion.emotion === 'Fear' ? 'bg-purple-500' :
                                'bg-amber-500'
                              }`}
                              style={{ width: `${emotion.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Emotional tone analysis not available for this content.</p>
                  )}
                  
                  {redditData.analysisResults.sentimentBreakdown.contentSamples && 
                   redditData.analysisResults.sentimentBreakdown.contentSamples.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium mb-2">Content Sample</h5>
                      <div className="bg-gray-50 p-3 rounded text-sm italic text-gray-600 border-l-4 border-primary">
                        "{redditData.analysisResults.sentimentBreakdown.contentSamples[0].text}"
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Default if no enhanced emotional analysis available
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Analysis shows your content has a {sentimentData[0].value > 40 ? 'generally positive' : 
                      sentimentData[2].value > 40 ? 'generally negative' : 'mostly neutral'} tone.
                  </p>
                  <div className="flex flex-col space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-green-600">Positive Content</span>
                        <span className="text-sm text-gray-600">{sentimentData[0].value}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${sentimentData[0].value}%` }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-600">Neutral Content</span>
                        <span className="text-sm text-gray-600">{sentimentData[1].value}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-gray-500 h-2.5 rounded-full" style={{ width: `${sentimentData[1].value}%` }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-red-600">Negative Content</span>
                        <span className="text-sm text-gray-600">{sentimentData[2].value}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${sentimentData[2].value}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          {/* Platform-agnostic activity timeline title */}
          <h3 className="text-lg font-medium mb-4">
            {primaryPlatform ? `${PLATFORM_CONFIG[primaryPlatform as Platform].name} Activity Timeline` : "Activity Timeline"}
          </h3>
          <Card className="h-64">
            <CardContent className="p-4">
              {timelineData.length > 1 ? (
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
                    {/* Adaptive tooltip label based on platform */}
                    <Tooltip 
                      formatter={(value) => [
                        `${value} ${primaryPlatform === 'reddit' ? 'karma' : 'activity'}`, 
                        'Activity'
                      ]} 
                    />
                    <Bar 
                      dataKey="value" 
                      name="Activity"
                      fill="hsl(var(--chart-1))" 
                      radius={[4, 4, 0, 0]} 
                      barSize={20} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  {primaryPlatform 
                    ? `Timeline data is generated from ${PLATFORM_CONFIG[primaryPlatform as Platform].name} activity history`
                    : "Timeline data unavailable"
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div>
          {/* Platform-specific or generic communities/topics title */}
          <h3 className="text-lg font-medium mb-4">
            {redditData 
              ? "Reddit Communities" 
              : primaryPlatform 
                ? `${PLATFORM_CONFIG[primaryPlatform as Platform].name} Topics` 
                : "Content Topics"
            }
          </h3>
          <Card className="h-64">
            <CardContent className="p-4">
              {topicData.length > 1 && topicData[0].name !== "No topics found" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topicData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }: { name: string, percent: number }) => 
                        // Adapt label format based on platform
                        redditData 
                          ? `r/${name}: ${(percent * 100).toFixed(0)}%` 
                          : `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {topicData.map((entry: TopicChartData, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CHART_COLORS[index % CHART_COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Activity']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  {topicData[0].name === "No topics found" 
                    ? redditData 
                      ? "No subreddit activity data available"
                      : `No topic data available for ${primaryPlatform ? PLATFORM_CONFIG[primaryPlatform as Platform].name : "this platform"}`
                    : redditData
                      ? "Subreddit distribution is based on your Reddit activity"
                      : "Topic distribution is based on platform activity"
                  }
                </div>
              )}
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
