import React from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PlatformData } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';

// Colors for charts
const COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57'];
const SENTIMENT_COLORS = {
  positive: '#4CAF50',
  neutral: '#2196F3',
  negative: '#F44336'
};

interface RedditDataChartsProps {
  platformData: PlatformData | undefined;
  isLoading: boolean;
}

export default function RedditDataCharts({ platformData, isLoading }: RedditDataChartsProps) {
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Reddit Activity Analysis</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-72 mb-8" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!platformData || !platformData.analysisResults) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Reddit Activity Analysis</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-center text-gray-500">No Reddit data available for this user.</p>
          <p className="text-center text-gray-500 mt-2">Try searching for a different username or platform.</p>
        </div>
      </div>
    );
  }

  const {
    activityTimeline,
    topTopics,
    sentimentBreakdown
  } = platformData.analysisResults;

  // Console logs for debugging
  console.log("Reddit data charts - timeline data:", activityTimeline);
  console.log("Reddit data charts - topics data:", topTopics);
  console.log("Reddit data charts - sentiment data:", sentimentBreakdown);

  // Format timeline data for chart
  const timelineData = activityTimeline || [];
  
  // Format topic data for chart (top 6 communities)
  const communitiesData = (topTopics || [])
    .slice(0, 6)
    .map(topic => ({
      name: topic.topic.replace('r/', ''), // Remove 'r/' prefix if present
      value: Math.round(topic.percentage * 100) // Convert from decimal to percentage
    }));

  // Prepare sentiment data
  const sentimentData = sentimentBreakdown ? [
    {
      category: 'Content Sentiment',
      positive: Math.round(sentimentBreakdown.positive * 100),
      neutral: Math.round(sentimentBreakdown.neutral * 100),
      negative: Math.round(sentimentBreakdown.negative * 100)
    }
  ] : [];

  // If we're missing any key data, use fallback display
  if (
    !timelineData.length &&
    !communitiesData.length &&
    !sentimentData.length
  ) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Reddit Activity Analysis</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-center text-gray-500">Insufficient data to generate charts.</p>
          <p className="text-center text-gray-500 mt-2">This user may have limited public activity on Reddit.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Reddit Activity Analysis</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Activity Timeline Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Activity Timeline</h2>
          {timelineData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={timelineData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} activities`, 'Count']} />
                  <Legend />
                  <Bar dataKey="count" name="Activity Count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-gray-500 h-72 flex items-center justify-center">
              No timeline data available
            </p>
          )}
        </div>
        
        {/* Communities Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Top Communities</h2>
          {communitiesData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={communitiesData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({name, percent}) => `r/${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {communitiesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, 'Activity']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-gray-500 h-72 flex items-center justify-center">
              No community data available
            </p>
          )}
        </div>
      </div>
      
      {/* Sentiment Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Content Sentiment Analysis</h2>
        {sentimentData.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sentimentData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="category" type="category" />
                <Tooltip formatter={(value) => [`${value}%`, '']} />
                <Legend />
                <Bar dataKey="positive" name="Positive" stackId="a" fill={SENTIMENT_COLORS.positive} />
                <Bar dataKey="neutral" name="Neutral" stackId="a" fill={SENTIMENT_COLORS.neutral} />
                <Bar dataKey="negative" name="Negative" stackId="a" fill={SENTIMENT_COLORS.negative} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-gray-500 h-72 flex items-center justify-center">
            No sentiment data available
          </p>
        )}
      </div>
      
      {/* Additional information on privacy concerns */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Privacy Assessment</h2>
        <div className="space-y-4">
          {platformData.analysisResults.privacyConcerns && platformData.analysisResults.privacyConcerns.length > 0 ? (
            <div>
              <h3 className="font-medium text-lg mb-2">Potential Privacy Concerns</h3>
              <ul className="list-disc list-inside space-y-2">
                {platformData.analysisResults.privacyConcerns.map((concern, index) => (
                  <li key={index} className={`${
                    concern.risk === 'high' ? 'text-red-600' : 
                    concern.risk === 'medium' ? 'text-amber-600' : 
                    'text-blue-600'
                  }`}>
                    {concern.issue} ({concern.risk} risk)
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-center text-gray-500">
              No privacy concerns detected
            </p>
          )}
          
          {platformData.analysisResults.recommendedActions && platformData.analysisResults.recommendedActions.length > 0 ? (
            <div className="mt-4">
              <h3 className="font-medium text-lg mb-2">Recommended Actions</h3>
              <ul className="list-disc list-inside space-y-2">
                {platformData.analysisResults.recommendedActions.map((action, index) => (
                  <li key={index} className="text-gray-700">{action}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}