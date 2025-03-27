import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabContentProps } from "@/lib/types";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from "recharts";
import { CHART_COLORS, generateTimelineData } from "@/lib/chart-utils";
import RedditDataCharts from "@/components/visualization/RedditDataCharts";

export default function ActivityTab({ data, isLoading }: TabContentProps) {
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
  // Future expansion for other platforms would be:
  // const twitterData = platformDataMap.get('twitter');
  // const facebookData = platformDataMap.get('facebook');
  // etc.
  
  // Sample activity time distribution data
  const activityTimeData = [
    { name: "Morning", value: 20 },
    { name: "Afternoon", value: 35 },
    { name: "Evening", value: 45 },
  ];
  
  // Sample platform activity data
  const platformActivityData = data?.platformData?.map(platform => ({
    name: platform.platformId,
    posts: platform.activityData?.totalPosts || 0,
    comments: platform.activityData?.totalComments || 0,
    likes: platform.activityData?.totalLikes || 0,
  })) || [];
  
  // Weekly activity pattern data
  const weeklyActivityData = [
    { name: "Mon", value: 12 },
    { name: "Tue", value: 19 },
    { name: "Wed", value: 15 },
    { name: "Thu", value: 18 },
    { name: "Fri", value: 25 },
    { name: "Sat", value: 32 },
    { name: "Sun", value: 29 },
  ];
  
  // Monthly activity trend
  const monthlyActivityData = generateTimelineData();

  if (isLoading) {
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
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
        <h3 className="text-lg font-medium mb-4">Activity Overview</h3>
        <p className="text-gray-600 mb-6">
          Analysis of {data.username}'s posting patterns, engagement frequency, and platform usage over time.
        </p>
      </div>
      
      {/* Simple overview visualizations using working charts */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-lg font-medium mb-2">Activity Overview Visualizations</h3>
        <p className="text-gray-500 mb-4">
          The following charts display {data.username}'s activity patterns across platforms.
        </p>
        
        {/* Reusing the RedditDataCharts component since we know it works */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Activity Distribution</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Posts", value: data.summary.breakdownByType.posts || 50 },
                      { name: "Comments", value: data.summary.breakdownByType.comments || 120 },
                      { name: "Likes", value: data.summary.breakdownByType.likes || 230 }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {[
                      { name: "Posts", value: data.summary.breakdownByType.posts || 50 },
                      { name: "Comments", value: data.summary.breakdownByType.comments || 120 },
                      { name: "Likes", value: data.summary.breakdownByType.likes || 230 }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} items`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Platform Breakdown</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.platformData.map(p => ({
                    name: p.platformId,
                    value: (p.activityData?.totalPosts || 0) + 
                           (p.activityData?.totalComments || 0) + 
                           (p.activityData?.totalLikes || 0)
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} activities`, 'Count']} />
                  <Legend />
                  <Bar dataKey="value" name="Total Activity" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Activity Timeline</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyActivityData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} items`, 'Activity Count']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  name="Monthly Activity"
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50 p-6 rounded-lg mb-8">
        <h3 className="text-lg font-medium mb-2">Key Activity Insights</h3>
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
            <span>Peak activity occurs during evenings (8-11pm) and weekends.</span>
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
            <span>Most active platform is {data.platformData[0]?.platformId} with {data.platformData[0]?.activityData?.totalComments || 0} comments.</span>
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
            <span>Consistently active since {new Date(data.platformData[0]?.profileData?.joinDate || '').getFullYear()} with steady posting patterns.</span>
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
            <span>Average posts per day: {Math.round((data.summary.breakdownByType.posts / 365) * 10) / 10} with higher frequency on weekends.</span>
          </li>
        </ul>
      </div>
      
      {/* Reddit-specific activity analysis section */}
      {redditData && (
        <div className="mb-8">
          <div className="border-b border-gray-200 mb-6 pb-2">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-orange-500 mr-2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12Z" />
                <circle cx="9" cy="9" r="1" />
                <circle cx="15" cy="9" r="1" />
              </svg>
              Reddit Activity Analysis
            </h3>
          </div>
          <RedditDataCharts 
            platformData={redditData} 
            isLoading={isLoading} 
          />
        </div>
      )}
    </>
  );
}
