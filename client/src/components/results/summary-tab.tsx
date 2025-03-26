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
  
  console.log("Found Reddit data:", redditData);
  
  // Use Reddit data if available, otherwise use first platform or generate fallback data
  const platformToUse = redditData || data.platformData[0];
  
  console.log("Using platform data:", platformToUse);
  console.log("Platform activity timeline:", platformToUse?.analysisResults?.activityTimeline);
  console.log("Platform topics:", platformToUse?.analysisResults?.topTopics);
  
  const timelineData = platformToUse?.analysisResults?.activityTimeline?.map(item => ({
    name: item.period,
    value: item.count
  })) || generateTimelineData();
  
  const topicData = platformToUse?.analysisResults?.topTopics?.map(item => ({
    name: item.topic,
    value: item.percentage
  })) || generateTopicData();

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
              Based on the analysis of <span className="font-medium">{data.username}</span>'s public digital footprint across {data.platforms.join(", ")}, we've generated the following insights:
            </p>
            <ul className="space-y-2 text-gray-700">
              {data.summary.topInsights.map((insight, index) => (
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
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      
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
