import { Card, CardContent } from "@/components/ui/card";
import { PlatformData } from "@shared/schema";
import { SiInstagram } from "react-icons/si";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { CHART_COLORS } from "@/lib/chart-utils";

interface InstagramContentTopicsProps {
  platformData: PlatformData;
  isLoading?: boolean;
}

export function InstagramContentTopics({ platformData, isLoading }: InstagramContentTopicsProps) {
  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }
  
  if (!platformData || !platformData.analysisResults?.topTopics) {
    return null;
  }
  
  // Extract topics data
  const topicsData = platformData.analysisResults.topTopics.map(topic => ({
    name: topic.topic,
    value: Math.round(topic.percentage * 100)
  }));
  
  // If no topics data, provide a fallback
  if (topicsData.length === 0) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <SiInstagram className="mr-2 text-[#E1306C]" />
            Content Topics
          </h3>
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">No topics data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-white rounded-lg overflow-hidden mb-8">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <SiInstagram className="mr-2 text-[#E1306C]" />
          Content Topics
        </h3>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={topicsData}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {topicsData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Topic Weight']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}