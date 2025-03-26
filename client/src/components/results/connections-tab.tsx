import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabContentProps } from "@/lib/types";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS } from "@/lib/chart-utils";

export default function ConnectionsTab({ data, isLoading }: TabContentProps) {
  const [, setLocation] = useLocation();
  
  // Sample connections data
  const connectionDistributionData = [
    { name: "Reddit", value: 45 },
    { name: "Twitter", value: 28 },
    { name: "Instagram", value: 18 },
    { name: "Other", value: 9 },
  ];
  
  // Sample most frequent interactions
  const frequentInteractions = [
    { name: "tech_enthusiast", platform: "reddit", interactions: 27, mutual: true },
    { name: "codingmaster", platform: "reddit", interactions: 19, mutual: true },
    { name: "webdev_guru", platform: "twitter", interactions: 16, mutual: false },
    { name: "design_inspiration", platform: "instagram", interactions: 12, mutual: true },
    { name: "javascript_dev", platform: "reddit", interactions: 10, mutual: false },
  ];
  
  // Sample communities/groups
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
        <h3 className="text-lg font-medium mb-4">Network Analysis</h3>
        <p className="text-gray-600 mb-6">
          Analysis of {data.username}'s connections, communities, and interactions across platforms.
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
                    labelLine={false}
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
                  <Tooltip />
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
                  <p className="text-3xl font-bold text-primary mt-2">183</p>
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
                  <p className="text-3xl font-bold text-primary mt-2">28</p>
                  <p className="text-xs text-gray-500 mt-1">Recent interactions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="mb-8">
        <h3 className="text-md font-medium mb-3">Most Frequent Interactions</h3>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {frequentInteractions.map((interaction, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-4">
                      <AvatarFallback className="bg-blue-100 text-primary">
                        {interaction.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{interaction.name}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <Badge variant="outline" className="mr-2">
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
        <h3 className="text-md font-medium mb-3">Communities & Groups</h3>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {communities.map((community, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{community.name}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <Badge variant="outline" className="mr-2">
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
      
      <div className="bg-blue-50 p-6 rounded-lg mb-8">
        <h3 className="text-lg font-medium mb-2">Connection Insights</h3>
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
            <span>Strongest connections are in tech and programming communities, particularly on Reddit.</span>
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
            <span>Regularly engages with a core group of 15-20 accounts across platforms.</span>
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
            <span>Some professional connections may reveal workplace and career details.</span>
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
            <span>Member of several large technology communities that could indicate professional interests and skills.</span>
          </li>
        </ul>
      </div>
    </>
  );
}
