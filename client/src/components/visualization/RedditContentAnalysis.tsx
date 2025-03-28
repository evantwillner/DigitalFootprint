import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformData } from "@shared/schema";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { CHART_COLORS } from "@/lib/chart-utils";

interface RedditContentAnalysisProps {
  platformData: PlatformData;
  isLoading: boolean;
}

export default function RedditContentAnalysis({ platformData, isLoading }: RedditContentAnalysisProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  // Extract topic data from the Reddit data
  const topicData = platformData.analysisResults?.topTopics?.map((topic, index) => ({
    name: topic.topic,
    value: topic.percentage
  })) || [
    { name: "Technology", value: 45 },
    { name: "Programming", value: 25 },
    { name: "Gaming", value: 15 },
    { name: "Travel", value: 15 },
  ];

  // Extract sentiment data
  const sentimentData = [
    { 
      name: "Positive", 
      value: platformData.analysisResults?.sentimentBreakdown?.positive || 30 
    },
    { 
      name: "Neutral", 
      value: platformData.analysisResults?.sentimentBreakdown?.neutral || 60 
    },
    { 
      name: "Negative", 
      value: platformData.analysisResults?.sentimentBreakdown?.negative || 10 
    },
  ];

  // Content type distribution
  const contentTypeData = [
    { 
      name: "Posts", 
      value: platformData.activityData?.totalPosts || 0 
    },
    { 
      name: "Comments", 
      value: platformData.activityData?.totalComments || 0 
    },
    { 
      name: "Upvotes", 
      value: platformData.activityData?.totalLikes || 0 
    },
    { 
      name: "Awards", 
      value: platformData.activityData?.totalShares || 0 
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Content Topics</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={topicData}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {topicData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, 'Content Weight']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Sentiment Analysis</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sentimentData}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                <Cell fill="#10b981" /> {/* Positive: green */}
                <Cell fill="#6b7280" /> {/* Neutral: gray */}
                <Cell fill="#ef4444" /> {/* Negative: red */}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm md:col-span-2">
        <h2 className="text-xl font-semibold mb-4">Content Type Distribution</h2>
        <div className="h-72">
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
              <Bar dataKey="value" name="Content Count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}