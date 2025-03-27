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

// Hard-coded data for guaranteed rendering
const timelineData = [
  { month: 'Jan', posts: 20, comments: 40 },
  { month: 'Feb', posts: 15, comments: 30 },
  { month: 'Mar', posts: 25, comments: 45 },
  { month: 'Apr', posts: 30, comments: 55 },
  { month: 'May', posts: 18, comments: 35 },
  { month: 'Jun', posts: 22, comments: 40 },
];

const communitiesData = [
  { name: 'AskReddit', value: 35 },
  { name: 'gaming', value: 25 },
  { name: 'pics', value: 15 },
  { name: 'technology', value: 12 },
  { name: 'worldnews', value: 8 },
  { name: 'movies', value: 5 },
];

const COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57'];

export default function RedditChartsBasic() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Reddit Activity Analysis</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Activity Timeline Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Activity Timeline</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={timelineData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="posts" name="Posts" fill="#8884d8" />
                <Bar dataKey="comments" name="Comments" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Communities Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Top Communities</h2>
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
                <Tooltip formatter={(value) => [`${value} posts/comments`, 'Activity']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Sentiment Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Content Sentiment Analysis</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { category: 'Posts', positive: 60, neutral: 30, negative: 10 },
                { category: 'Comments', positive: 45, neutral: 40, negative: 15 },
                { category: 'Overall', positive: 52, neutral: 35, negative: 13 },
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="category" type="category" />
              <Tooltip />
              <Legend />
              <Bar dataKey="positive" name="Positive" stackId="a" fill="#4CAF50" />
              <Bar dataKey="neutral" name="Neutral" stackId="a" fill="#2196F3" />
              <Bar dataKey="negative" name="Negative" stackId="a" fill="#F44336" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Activity Heatmap */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Activity Distribution</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { hour: '00:00', value: 5 },
                { hour: '03:00', value: 2 },
                { hour: '06:00', value: 3 },
                { hour: '09:00', value: 12 },
                { hour: '12:00', value: 25 },
                { hour: '15:00', value: 30 },
                { hour: '18:00', value: 45 },
                { hour: '21:00', value: 20 },
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} activities`, 'Count']} />
              <Legend />
              <Bar dataKey="value" name="Activity Count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}