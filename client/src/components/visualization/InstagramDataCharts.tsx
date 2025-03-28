import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformData } from "@shared/schema";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from "recharts";
import { SparkleEffect } from "@/components/ui/sparkle-effect";
import { SiInstagram } from "react-icons/si";
import { CHART_COLORS } from "@/lib/chart-utils";

interface InstagramDataChartsProps {
  platformData: PlatformData;
  isLoading: boolean;
}

export function InstagramDataCharts({ platformData, isLoading }: InstagramDataChartsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  
  if (!platformData) {
    return (
      <div className="p-4 border rounded bg-gray-50">
        <p className="text-gray-500 text-center">No Instagram data available</p>
      </div>
    );
  }

  // Extract data from the platformData
  const contentBreakdown = platformData.analysisResults?.platformSpecificMetrics?.contentBreakdown as Record<string, number> || {};
  
  // Handle case when contentBreakdown is missing or empty
  const contentBreakdownData = Object.keys(contentBreakdown).length > 0 
    ? Object.entries(contentBreakdown).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Math.round(value * 100) // Convert from decimal to percentage
      }))
    : [
        { name: "No data", value: 100 }
      ];
  
  // Create privacy risk data from the privacyMetrics
  const privacyMetrics = platformData.privacyMetrics?.dataCategories || [];
  const riskCounts = {
    "High Risk": 0,
    "Medium Risk": 0,
    "Low Risk": 0
  };
  
  privacyMetrics.forEach(item => {
    if (item.severity === "high") riskCounts["High Risk"]++;
    if (item.severity === "medium") riskCounts["Medium Risk"]++;
    if (item.severity === "low") riskCounts["Low Risk"]++;
  });
  
  const privacyRiskData = Object.entries(riskCounts).map(([name, value]) => ({
    name,
    value
  }));
  
  // Get location data
  const locationCheckIns = platformData.analysisResults?.platformSpecificMetrics?.locationCheckIns as Array<{name: string, count: number}> || [];
  const locationData = locationCheckIns.length > 0
    ? locationCheckIns.map(location => ({
        name: location.name,
        value: location.count
      })).sort((a, b) => b.value - a.value).slice(0, 5) // Top 5 locations
    : [{ name: "No location data", value: 0 }];
  
  // Profile stats
  const profileData = platformData.profileData || {};
  const profileStatsData = [
    { name: "Followers", value: profileData.followerCount || 0 },
    { name: "Following", value: profileData.followingCount || 0 },
    { name: "Posts", value: platformData.activityData?.totalPosts || 0 },
  ];
  
  // Engagement rate
  const engagementRate = platformData.analysisResults?.platformSpecificMetrics?.engagementRate as number || 0;
  const engagementFormatted = `${engagementRate.toFixed(1)}%`;
  
  // Average likes per post calculation
  const totalLikes = platformData.activityData?.totalLikes || 0;
  const totalPosts = platformData.activityData?.totalPosts || 1; // Avoid division by zero
  const avgLikesPerPost = Math.round(totalLikes / totalPosts);
  
  // Label renderer for pie charts
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${name}: ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Content Breakdown Chart */}
        <div>
          <h3 className="text-md font-medium mb-3 flex items-center">
            <SiInstagram className="mr-2 text-[#E1306C]" />
            Content Breakdown
          </h3>
          <Card className="h-64">
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contentBreakdownData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    dataKey="value"
                    label={renderCustomizedLabel}
                  >
                    {contentBreakdownData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        
        {/* Privacy Risk Assessment */}
        <div>
          <h3 className="text-md font-medium mb-3 flex items-center">
            <SiInstagram className="mr-2 text-[#E1306C]" />
            Privacy Risk Assessment
          </h3>
          <Card className="h-64">
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={privacyRiskData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    dataKey="value"
                    label={renderCustomizedLabel}
                  >
                    <Cell fill="#ef4444" /> {/* High: red */}
                    <Cell fill="#f97316" /> {/* Medium: orange */}
                    <Cell fill="#22c55e" /> {/* Low: green */}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        
        {/* Location Check-ins */}
        <div>
          <h3 className="text-md font-medium mb-3 flex items-center">
            <SiInstagram className="mr-2 text-[#E1306C]" />
            Location Check-ins
          </h3>
          <Card className="h-64">
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#E1306C" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        
        {/* Account Stats */}
        <div>
          <h3 className="text-md font-medium mb-3 flex items-center">
            <SiInstagram className="mr-2 text-[#E1306C]" />
            Account Stats
          </h3>
          <Card className="h-64">
            <CardContent className="p-4">
              <div className="h-full flex flex-col justify-between">
                <ResponsiveContainer width="100%" height="70%">
                  <BarChart data={profileStatsData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#E1306C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                
                <div className="flex items-center justify-center mt-2">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Engagement Rate</p>
                    <SparkleEffect isActive colors={["#E1306C", "#F77737"]} size={10}>
                      <p className="text-xl font-bold text-[#E1306C]">{engagementFormatted}</p>
                    </SparkleEffect>
                    <p className="text-xs text-gray-400">{avgLikesPerPost} avg. likes per post</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Exposure Score */}
      <div>
        <h3 className="text-md font-medium mb-3 flex items-center">
          <SiInstagram className="mr-2 text-[#E1306C]" />
          Exposure Score
        </h3>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <div className="mb-2">
                <SparkleEffect isActive={true} colors={["#E1306C", "#F77737"]} size={12}>
                  <p className="text-3xl font-bold text-[#E1306C]">
                    {platformData.privacyMetrics?.exposureScore
                      ? (platformData.privacyMetrics.exposureScore / 10).toFixed(1)
                      : '?'} / 10
                  </p>
                </SparkleEffect>
              </div>
              <p className="text-gray-600 text-center mb-4">
                {platformData.privacyMetrics?.exposureScore && platformData.privacyMetrics.exposureScore > 70
                  ? "Your Instagram account has a high level of public visibility."
                  : platformData.privacyMetrics?.exposureScore && platformData.privacyMetrics.exposureScore > 40
                  ? "Your Instagram account has a moderate level of public visibility."
                  : "Your Instagram account has a low level of public visibility."}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-pink-500 h-2.5 rounded-full" 
                  style={{ width: `${platformData.privacyMetrics?.exposureScore
                    ? Math.min(platformData.privacyMetrics.exposureScore, 100)
                    : 0}%` }}
                ></div>
              </div>
              <div className="w-full flex justify-between mt-1">
                <span className="text-xs text-gray-500">Low Exposure</span>
                <span className="text-xs text-gray-500">High Exposure</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}