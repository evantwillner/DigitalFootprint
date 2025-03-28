import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabContentProps } from "@/lib/types";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { CHART_COLORS } from "@/lib/chart-utils";
import { RedditConnectionsAnalysis } from "@/components/visualization/RedditConnectionsAnalysis";
import { SparkleEffect } from "@/components/ui/sparkle-effect";
import { PLATFORM_CONFIG } from "@/lib/platform-icons";

export default function ConnectionsTab({ data, isLoading }: TabContentProps) {
  const [, setLocation] = useLocation();
  
  // Create a platform data map for easier access
  const platformDataMap = new Map();
  
  // Populate the map with platform-specific data if data exists
  if (data?.platformData) {
    for (const platform of data.platformData) {
      platformDataMap.set(platform.platformId, platform);
    }
  }
  
  // Get available platforms (for extensibility)
  const availablePlatforms = data?.platformData?.map(p => p.platformId) || [];
  
  // Check for specific platforms
  const redditData = platformDataMap.get('reddit');
  
  // Sample connections data for overall view
  const connectionDistributionData = [
    { name: "Reddit", value: 45 },
    { name: "Twitter", value: 28 },
    { name: "Instagram", value: 18 },
    { name: "Other", value: 9 },
  ];
  
  // Sample most frequent interactions across all platforms
  const frequentInteractions = [
    { name: "tech_enthusiast", platform: "reddit", interactions: 27, mutual: true },
    { name: "codingmaster", platform: "reddit", interactions: 19, mutual: true },
    { name: "webdev_guru", platform: "twitter", interactions: 16, mutual: false },
    { name: "design_inspiration", platform: "instagram", interactions: 12, mutual: true },
    { name: "javascript_dev", platform: "reddit", interactions: 10, mutual: false },
  ];
  
  // Sample communities/groups across all platforms
  const communities = [
    { name: "r/programming", platform: "reddit", members: "3.2M", role: "Member" },
    { name: "r/webdev", platform: "reddit", members: "1.5M", role: "Active Commenter" },
    { name: "r/javascript", platform: "reddit", members: "1.8M", role: "Member" },
    { name: "Web Developers", platform: "facebook", members: "450K", role: "Member" },
    { name: "ReactJS Group", platform: "facebook", members: "320K", role: "Member" },
  ];

  if (isLoading) {
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-64 mb-8" />
        <Skeleton className="h-80" />
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

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <SparkleEffect isActive colors={["#4F46E5", "#8B5CF6", "#EC4899"]}>
            <h3 className="text-xl font-semibold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">Network Analysis</h3>
          </SparkleEffect>
        </div>
        <p className="text-gray-600 mb-6">
          Analysis of {data.username}'s connections, communities, and interactions across platforms.
        </p>
      </div>
      
      {/* Reddit-specific connections analysis section */}
      {redditData && (
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="mr-2">
              {PLATFORM_CONFIG.reddit.icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-800">
              Reddit Network Analysis
            </h3>
          </div>
          
          <RedditConnectionsAnalysis 
            platformData={redditData}
            isLoading={isLoading}
          />
          
          <Separator className="my-8" />
        </div>
      )}
      
      {/* Overall platform analysis - always show this */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4">Cross-Platform Connections</h3>
        <p className="text-gray-600 mb-4">
          Overview of connections and communities across all social platforms.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="text-md font-medium mb-3">Connection Distribution</h3>
          <Card className="h-64">
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={connectionDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {connectionDistributionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[index % CHART_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Connections']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <h3 className="text-md font-medium mb-3">Connection Stats</h3>
          <Card className="h-64">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="flex flex-col items-center justify-center bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Total Connections</p>
                  <SparkleEffect isActive colors={["#4F46E5", "#6366F1"]} size={10}>
                    <p className="text-3xl font-bold text-primary mt-2">183</p>
                  </SparkleEffect>
                  <p className="text-xs text-gray-500 mt-1">Across all platforms</p>
                </div>
                
                <div className="flex flex-col items-center justify-center bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Mutual Connections</p>
                  <p className="text-3xl font-bold text-primary mt-2">47</p>
                  <p className="text-xs text-gray-500 mt-1">Connected on multiple platforms</p>
                </div>
                
                <div className="flex flex-col items-center justify-center bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Communities</p>
                  <p className="text-3xl font-bold text-primary mt-2">12</p>
                  <p className="text-xs text-gray-500 mt-1">Groups, subreddits, etc.</p>
                </div>
                
                <div className="flex flex-col items-center justify-center bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Active Conversations</p>
                  <SparkleEffect isActive colors={["#4F46E5", "#6366F1"]} size={10}>
                    <p className="text-3xl font-bold text-primary mt-2">28</p>
                  </SparkleEffect>
                  <p className="text-xs text-gray-500 mt-1">Recent interactions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="mb-8">
        <h3 className="text-md font-medium mb-3">Most Frequent Cross-Platform Interactions</h3>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {frequentInteractions.map((interaction, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-4">
                      <AvatarFallback className={`${
                        interaction.platform === 'reddit' 
                          ? 'bg-orange-100 text-orange-800' 
                          : interaction.platform === 'twitter'
                            ? 'bg-blue-100 text-blue-800'
                            : interaction.platform === 'instagram'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}>
                        {interaction.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{
                        interaction.platform === 'reddit' 
                          ? `u/${interaction.name}`
                          : interaction.name
                      }</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <Badge variant="outline" className={`mr-2 ${
                          interaction.platform === 'reddit' 
                            ? 'bg-orange-50 text-orange-800 border-orange-200' 
                            : interaction.platform === 'twitter'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : interaction.platform === 'instagram'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : ''
                        }`}>
                          {interaction.platform}
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mb-8">
        <h3 className="text-md font-medium mb-3">Communities Across Platforms</h3>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {communities.map((community, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{community.name}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <Badge variant="outline" className={`mr-2 ${
                          community.platform === 'reddit' 
                            ? 'bg-orange-50 text-orange-800 border-orange-200' 
                            : community.platform === 'twitter'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : community.platform === 'facebook'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : ''
                        }`}>
                          {community.platform}
                        </Badge>
                        <span>{community.members} members</span>
                      </div>
                    </div>
                    <Badge>{community.role}</Badge>
                  </div>
                  {index < communities.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8 relative overflow-hidden">
        <div className="flex items-center mb-4">
          <SparkleEffect isActive colors={["#4F46E5", "#8B5CF6", "#EC4899"]}>
            <h3 className="text-xl font-semibold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
              Network Insights
            </h3>
          </SparkleEffect>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50/70 rounded-lg p-4 border border-blue-100">
            <h4 className="font-medium text-gray-900 mb-2">Connection Patterns</h4>
            <SparkleEffect isActive={true} sparkleCount={8} colors={["#4F46E5", "#6366F1"]} size={10}>
              <p className="text-gray-700 font-medium">Strong tech community presence on Reddit</p>
            </SparkleEffect>
            <p className="text-gray-600 mt-2 text-sm">Your strongest connections are in programming and technology communities.</p>
          </div>
          
          <div className="bg-blue-50/70 rounded-lg p-4 border border-blue-100">
            <h4 className="font-medium text-gray-900 mb-2">Engagement Pattern</h4>
            <p className="text-gray-700">Regular engagement with 15-20 core accounts</p>
            <p className="text-gray-600 mt-2 text-sm">You have consistent interactions with a small group of users across platforms.</p>
          </div>
          
          <div className="bg-red-50/70 rounded-lg p-4 border border-red-100">
            <h4 className="font-medium text-gray-900 mb-2">Privacy Concern</h4>
            <SparkleEffect isActive={true} sparkleCount={8} colors={["#EF4444", "#DC2626"]} size={10}>
              <p className="text-gray-700 font-medium">Professional connections reveal workplace details</p>
            </SparkleEffect>
            <p className="text-gray-600 mt-2 text-sm">Your network may expose career information through mutual connections.</p>
          </div>
          
          <div className="bg-blue-50/70 rounded-lg p-4 border border-blue-100">
            <h4 className="font-medium text-gray-900 mb-2">Professional Interests</h4>
            <p className="text-gray-700">Member of large technology communities</p>
            <p className="text-gray-600 mt-2 text-sm">Your community memberships indicate professional interests in development.</p>
          </div>
        </div>
      </div>
    </>
  );
}
