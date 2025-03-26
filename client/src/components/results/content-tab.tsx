import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabContentProps } from "@/lib/types";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { CHART_COLORS } from "@/lib/chart-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function ContentTab({ data, isLoading }: TabContentProps) {
  const [, setLocation] = useLocation();
  
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

  // Sample content type distribution
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
        <h3 className="text-lg font-medium mb-4">Content Analysis</h3>
        <p className="text-gray-600 mb-6">
          Analysis of {data.username}'s content topics, sentiment, and posting patterns across platforms.
        </p>
      </div>
      
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
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="mb-8">
        <h3 className="text-md font-medium mb-3">Content Type Distribution</h3>
        <Card className="h-64">
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contentTypeData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
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
                <Tooltip />
                <Bar 
                  dataKey="value" 
                  fill="hsl(var(--chart-3))" 
                  radius={[4, 4, 0, 0]} 
                  barSize={40} 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
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
      
      <div className="bg-blue-50 p-6 rounded-lg mb-8">
        <h3 className="text-lg font-medium mb-2">Content Insights</h3>
        <ul className="space-y-2">
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
            <span>Content primarily focuses on technology and programming topics with occasional posts about gaming and travel.</span>
          </li>
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
            <span>Tone analysis indicates predominantly neutral (60%) and informative communication style with occasional technical advice.</span>
          </li>
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
            <span>Comments (53%) make up the majority of content, followed by likes (27%), original posts (14%), and shares (6%).</span>
          </li>
          <li className="flex items-start">
            <span className="text-warning mr-2">
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
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <span>Potentially sensitive information about technical expertise and work history is visible in public posts.</span>
          </li>
        </ul>
      </div>
    </>
  );
}
