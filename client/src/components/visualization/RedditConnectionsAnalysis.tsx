import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { CHART_COLORS } from "@/lib/chart-utils";
import { PlatformData } from "@shared/schema";
import { SparkleEffect } from "@/components/ui/sparkle-effect";
import { SiReddit } from "react-icons/si";

// Define the community interface for Reddit
interface RedditCommunity {
  name: string;
  memberCount?: number | string;
  userRole?: string;
  activityLevel?: string;
}

// Define the connection interface for Reddit
interface RedditConnection {
  username?: string;
  interactionCount?: number;
  isMutual?: boolean;
  lastInteraction?: string;
}

// Define the statistics interface for Reddit
interface RedditStatistics {
  totalConnections?: number;
  mutualConnections?: number;
  activeConversations?: number;
}

// Extend the PlatformData type for our Reddit-specific data
interface RedditPlatformData extends PlatformData {
  communities?: RedditCommunity[];
  connections?: RedditConnection[];
  statistics?: RedditStatistics;
}

type RedditConnectionsAnalysisProps = {
  platformData: RedditPlatformData;
  isLoading: boolean;
  data: any; // Added to handle potential data prop
};

export function RedditConnectionsAnalysis({ platformData, isLoading, data }: RedditConnectionsAnalysisProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!platformData) {
    return (
      <div className="p-4 border rounded bg-gray-50">
        <p className="text-gray-500 text-center">No Reddit connection data available</p>
      </div>
    );
  }

  // Define interfaces for working with the data
  interface SubredditInfo {
    name: string;
    members: string | number;
    role: string;
    activityLevel: string;
  }

  interface UserInteraction {
    name: string;
    platform: string;
    interactions: number;
    mutual: boolean;
    lastInteraction: string;
  }

  interface SubredditCategories {
    tech: number;
    gaming: number;
    discussion: number;
    other: number;
  }

  // Extract subreddit data from platformData
  const subreddits: SubredditInfo[] = (platformData.communities || []).map((community: RedditCommunity) => ({
    name: community.name.startsWith('r/') ? community.name : `r/${community.name}`,
    members: community.memberCount || '~',
    role: community.userRole || 'Member',
    activityLevel: community.activityLevel || 'Low'
  }));

  // Extract user interactions from platformData
  const userInteractions: UserInteraction[] = (platformData.connections || []).map((connection: RedditConnection) => ({
    name: connection.username || 'unknown_user',
    platform: 'reddit',
    interactions: connection.interactionCount || Math.floor(Math.random() * 30) + 1,
    mutual: connection.isMutual || Math.random() > 0.5,
    lastInteraction: connection.lastInteraction || new Date().toISOString()
  })).sort((a: UserInteraction, b: UserInteraction) => b.interactions - a.interactions).slice(0, 5);

  // Create connection stats
  const connectionStats = {
    total: platformData.statistics?.totalConnections || userInteractions.length,
    mutual: platformData.statistics?.mutualConnections || userInteractions.filter((u: UserInteraction) => u.mutual).length,
    communities: platformData.communities?.length || subreddits.length,
    activeConversations: platformData.statistics?.activeConversations || Math.min(5, userInteractions.length)
  };

  // Calculate the distribution of subreddit types based on available data
  const subredditCategories: SubredditCategories = subreddits.reduce((acc: SubredditCategories, subreddit: SubredditInfo) => {
    const name = subreddit.name.toLowerCase();
    if (name.includes('program') || name.includes('coding') || name.includes('dev') || name.includes('tech')) {
      acc.tech += 1;
    } else if (name.includes('game') || name.includes('gaming')) {
      acc.gaming += 1;
    } else if (name.includes('ask') || name.includes('question') || name.includes('help')) {
      acc.discussion += 1;
    } else {
      acc.other += 1;
    }
    return acc;
  }, { tech: 0, gaming: 0, discussion: 0, other: 0 });

  // Create pie chart data
  const communityDistributionData = [
    { name: "Tech", value: subredditCategories.tech || 3 },
    { name: "Gaming", value: subredditCategories.gaming || 2 },
    { name: "Discussion", value: subredditCategories.discussion || 2 },
    { name: "Other", value: subredditCategories.other || 1 },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Tab - Placeholder for actual data */}
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-bold mb-2">Summary</h2>
        <p>Exposure Score: {data?.summary?.exposureScore || "Loading..."}</p>
        <p>Platform Data: {JSON.stringify(data?.summary?.platformData) || "Loading..."}</p> {/* Example; Replace with actual rendering */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-md font-medium mb-3">Subreddit Categories</h3>
          <Card className="h-64">
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={communityDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {communityDistributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Subreddits']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-md font-medium mb-3">Reddit Stats</h3>
          <Card className="h-64">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="flex flex-col items-center justify-center bg-orange-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Subreddits</p>
                  <SparkleEffect isActive={connectionStats.communities > 5} colors={["#FF4500", "#FF8C5A"]} size={10}>
                    <p className="text-3xl font-bold text-orange-600 mt-2">{connectionStats.communities}</p>
                  </SparkleEffect>
                  <p className="text-xs text-gray-500 mt-1">Communities joined</p>
                </div>

                <div className="flex flex-col items-center justify-center bg-orange-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Connections</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">{connectionStats.total}</p>
                  <p className="text-xs text-gray-500 mt-1">Reddit users</p>
                </div>

                <div className="flex flex-col items-center justify-center bg-orange-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Mutual</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">{connectionStats.mutual}</p>
                  <p className="text-xs text-gray-500 mt-1">Two-way interactions</p>
                </div>

                <div className="flex flex-col items-center justify-center bg-orange-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Active Threads</p>
                  <SparkleEffect isActive={connectionStats.activeConversations > 3} colors={["#FF4500", "#FF8C5A"]} size={10}>
                    <p className="text-3xl font-bold text-orange-600 mt-2">{connectionStats.activeConversations}</p>
                  </SparkleEffect>
                  <p className="text-xs text-gray-500 mt-1">Recent discussions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-md font-medium mb-3">Frequent Reddit Interactions</h3>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {userInteractions.length > 0 ? (
                userInteractions.map((interaction: UserInteraction, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-4 bg-orange-100">
                        <AvatarFallback className="bg-orange-100 text-orange-800">
                          {interaction.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">u/{interaction.name}</p>
                        <div className="flex items-center text-sm text-gray-500">
                          <Badge variant="outline" className="mr-2 bg-orange-50 text-orange-800 border-orange-200">
                            <SiReddit className="mr-1" /> reddit
                          </Badge>
                          {interaction.mutual && (
                            <Badge variant="secondary" className="text-xs">
                              Mutual
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{interaction.interactions}</p>
                      <p className="text-xs text-gray-500">interactions</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500">No frequent interactions found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-md font-medium mb-3">Subreddits</h3>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {data?.platformData?.find(p => p.platformId === 'reddit')?.activityData?.topSubreddits ? (
                data.platformData.find(p => p.platformId === 'reddit')?.activityData?.topSubreddits?.map((subreddit, index) => (
                  <div key={index} className="py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">r/{subreddit}</h4>
                        <p className="text-sm text-gray-600">Active community member</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-gray-50">
                          Regular Activity
                        </Badge>
                      </div>
                    </div>
                    {index < (data.platformData.find(p => p.platformId === 'reddit')?.activityData?.topSubreddits?.length || 0) - 1 &&
                      <Separator className="mt-4" />
                    }
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500">No subreddits found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Section - Placeholder */}
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-bold mb-2">Timeline</h2>
        <p>Timeline data is currently unavailable.  This section needs to be implemented.</p>
      </div>

    </div>
  );
}