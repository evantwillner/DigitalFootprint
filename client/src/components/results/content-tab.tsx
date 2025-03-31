import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabContentProps } from "@/lib/types";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { CHART_COLORS } from "@/lib/chart-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import RedditContentAnalysis from "@/components/visualization/RedditContentAnalysis";
import { FacebookSentimentAnalysis } from "@/components/visualization/FacebookSentimentAnalysis";
import { TwitterSentimentAnalysis } from "@/components/visualization/TwitterSentimentAnalysis";
import { SparkleEffect } from "@/components/ui/sparkle-effect";
import { FileText, MessageCircle, MessageSquare, Eye, BarChart2, PieChart as PieChartIcon } from "lucide-react";
import { PLATFORM_CONFIG } from "@/lib/platform-icons";

export default function ContentTab({ data, isLoading }: TabContentProps) {
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
  const facebookData = platformDataMap.get('facebook');
  const twitterData = platformDataMap.get('twitter');
  
  // Sample sentiment data
  const sentimentData = [
    { name: "Positive", value: 30 },
    { name: "Neutral", value: 60 },
    { name: "Negative", value: 10 },
  ];
  
  // Sample topic data
  const topicData = [
    { name: "Technology", value: 45 },
    { name: "Programming", value: 25 },
    { name: "Gaming", value: 15 },
    { name: "Travel", value: 15 },
  ];

  // Content type distribution
  const contentTypeData = [
    { name: "Posts", value: data?.summary.breakdownByType.posts || 0 },
    { name: "Comments", value: data?.summary.breakdownByType.comments || 0 },
    { name: "Likes", value: data?.summary.breakdownByType.likes || 0 },
    { name: "Shares", value: data?.summary.breakdownByType.shares || 0 },
  ];

  // Sample recent content items
  const recentContent = data?.platformData
    .flatMap(platform => 
      platform.contentData?.map(item => ({
        ...item,
        platform: platform.platformId,
      })) || []
    )
    .sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 5) || [];

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
          <SparkleEffect isActive colors={["#FFD700", "#FF6347", "#87CEEB"]}>
            <h3 className="text-xl font-semibold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">Content Analysis</h3>
          </SparkleEffect>
        </div>
        <p className="text-gray-600 mb-6">
          Analysis of {data.username}'s content topics, sentiment, and posting patterns across platforms.
        </p>
      </div>
      
      {/* Reddit-specific content analysis section */}
      {redditData && (
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="mr-2">
              {PLATFORM_CONFIG.reddit.icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-800">
              Reddit Content Analysis
            </h3>
          </div>
          
          <RedditContentAnalysis 
            platformData={redditData}
            isLoading={isLoading}
          />
        </div>
      )}
      
      {/* Facebook sentiment analysis section */}
      {facebookData && (
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="mr-2">
              {PLATFORM_CONFIG.facebook.icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-800">
              Facebook Content Analysis
            </h3>
          </div>
          
          <FacebookSentimentAnalysis 
            platformData={facebookData}
            isLoading={isLoading}
          />
        </div>
      )}
      
      {/* Twitter/X sentiment analysis section */}
      {twitterData && (
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="mr-2">
              {PLATFORM_CONFIG.twitter.icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-800">
              Twitter/X Content Analysis
            </h3>
          </div>
          
          <TwitterSentimentAnalysis 
            platformData={twitterData}
            isLoading={isLoading}
          />
        </div>
      )}
      
      {/* If no specific platform data, show generic content analysis */}
      {!redditData && !facebookData && !twitterData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-md font-medium mb-3">Content Topics</h3>
              <Card className="h-64">
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topicData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
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
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <h3 className="text-md font-medium mb-3">Sentiment Analysis</h3>
              <Card className="h-64">
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#10b981" /> {/* Positive: green */}
                        <Cell fill="#6b7280" /> {/* Neutral: gray */}
                        <Cell fill="#ef4444" /> {/* Negative: red */}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-md font-medium mb-3">Content Type Distribution</h3>
            <Card className="h-64">
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={contentTypeData} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} items`, 'Count']} />
                    <Legend />
                    <Bar 
                      dataKey="value" 
                      name="Content Count"
                      fill="hsl(var(--chart-3))" 
                      radius={[4, 4, 0, 0]} 
                      barSize={40} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
      
      <div className="mb-8">
        <h3 className="text-md font-medium mb-3">Recent Content Samples</h3>
        <Card>
          <CardContent className="pt-6">
            <ScrollArea className="h-80">
              {recentContent.length > 0 ? (
                <div className="space-y-6">
                  {recentContent.map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-2">
                        <div className="flex items-center">
                          <Badge variant="outline" className="mr-2">
                            {item.platform}
                          </Badge>
                          <Badge className={
                            item.sentiment === "positive" 
                              ? "bg-green-100 text-green-800" 
                              : item.sentiment === "negative"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                          }>
                            {item.sentiment}
                          </Badge>
                          <Badge variant="outline" className="ml-2">
                            {item.type}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 mb-2">
                        {item.content || "No content available"}
                      </p>
                      
                      {item.topics && item.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {item.topics.map((topic, topicIndex) => (
                            <Badge key={topicIndex} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {item.engagement && (
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>{item.engagement.likes} likes</span>
                          <span>{item.engagement.comments} comments</span>
                          <span>{item.engagement.shares} shares</span>
                        </div>
                      )}
                      
                      {index < recentContent.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No content samples available</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8 relative overflow-hidden">
        <div className="flex items-center mb-4">
          <SparkleEffect isActive colors={["#4F46E5", "#8B5CF6", "#EC4899"]}>
            <h3 className="text-xl font-semibold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
              Key Content Discoveries
            </h3>
          </SparkleEffect>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50/70 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center mb-3">
              <PieChartIcon className="h-5 w-5 text-indigo-600 mr-2" />
              <h4 className="font-medium text-gray-900">Content Focus</h4>
            </div>
            <SparkleEffect isActive={true} sparkleCount={8} colors={["#4F46E5", "#6366F1"]} size={10}>
              <p className="text-gray-700 font-medium">Technology and programming topics dominate your content</p>
            </SparkleEffect>
            <p className="text-gray-600 mt-2 text-sm">Your interests are clearly technical, with gaming and travel as secondary topics.</p>
          </div>
          
          <div className="bg-blue-50/70 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center mb-3">
              <MessageCircle className="h-5 w-5 text-amber-500 mr-2" />
              <h4 className="font-medium text-gray-900">Communication Style</h4>
            </div>
            <p className="text-gray-700">Predominantly neutral (60%) and informative communication style</p>
            <p className="text-gray-600 mt-2 text-sm">Your writing tends to be factual and educational rather than emotional.</p>
          </div>
          
          <div className="bg-blue-50/70 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center mb-3">
              <BarChart2 className="h-5 w-5 text-green-500 mr-2" />
              <h4 className="font-medium text-gray-900">Content Breakdown</h4>
            </div>
            <SparkleEffect isActive={true} sparkleCount={6} colors={["#10B981", "#059669"]} size={10}>
              <p className="text-gray-700 font-medium">Comments (53%) make up most of your activity</p>
            </SparkleEffect>
            <p className="text-gray-600 mt-2 text-sm">You engage more by commenting than creating original posts (14%).</p>
          </div>
          
          <div className="bg-red-50/70 rounded-lg p-4 border border-red-100">
            <div className="flex items-center mb-3">
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
                className="text-red-500 mr-2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <h4 className="font-medium text-gray-900">Privacy Concern</h4>
            </div>
            <SparkleEffect isActive={true} sparkleCount={10} colors={["#EF4444", "#DC2626"]} size={10}>
              <p className="text-gray-700 font-medium">Technical expertise and work history are publicly visible</p>
            </SparkleEffect>
            <p className="text-gray-600 mt-2 text-sm">Consider reviewing your public content to protect your professional privacy.</p>
          </div>
        </div>
      </div>
    </>
  );
}
