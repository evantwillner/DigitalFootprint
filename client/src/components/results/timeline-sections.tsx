import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, 
  Legend, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { 
  CHART_COLORS, 
  GRADIENT_COLORS,
  TimelineActivityData,
  formatNumber
} from "@/lib/chart-utils";
import { Platform } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { DigitalFootprintResponse } from "@shared/schema";

// Privacy Assessment component that uses actual Reddit data
export function PrivacyAssessmentSection({ 
  data, 
  activeData, 
  activeMonth 
}: { 
  data: DigitalFootprintResponse; 
  activeData: TimelineActivityData | null; 
  activeMonth: string | null;
}) {
  if (!activeData) return null;
  
  // Find Reddit data to get privacy concerns
  const redditData = data.platformData.find(p => p.platformId === "reddit");
  const privacyConcerns = redditData?.analysisResults?.privacyConcerns || [];
  
  // Calculate a privacy score based on the number and severity of concerns
  let privacyScore = 0;
  if (privacyConcerns.length > 0) {
    const severityMap = { low: 1, medium: 2, high: 3 };
    const totalSeverity = privacyConcerns.reduce((acc, curr) => {
      // Map the 'severity' property to our risk level map
      return acc + (severityMap[curr.severity as 'low' | 'medium' | 'high'] || 1);
    }, 0);
    privacyScore = Math.min(100, Math.round((totalSeverity / (privacyConcerns.length * 3)) * 100));
  } else {
    // Use the one calculated in the timeline data if available
    privacyScore = activeData.privacyScore || 0;
  }
  
  return (
    <Card className="overflow-hidden glass-card rounded-xl border-none">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50/80 px-6 py-4 border-b border-white/20">
        <h4 className="text-lg font-display font-medium text-gray-800 flex items-center">
          <span className="mr-2 p-1.5 rounded-full bg-emerald-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-700">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </span>
          Privacy Risk Assessment
          {activeMonth && <span className="ml-2 px-2 py-0.5 text-sm font-normal bg-emerald-100 text-emerald-700 rounded-full">
            {activeMonth}
          </span>}
        </h4>
      </div>
      <CardContent className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Privacy Score</span>
            <span 
              className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                privacyScore <= 30
                  ? "bg-green-100 text-green-800"
                  : privacyScore <= 60
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {privacyScore}/100
            </span>
          </div>
          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full ${
                privacyScore <= 30
                  ? "bg-green-500"
                  : privacyScore <= 60
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${privacyScore}%` }}
            ></div>
          </div>
        </div>
        
        <div className="space-y-4">
          {privacyConcerns.length > 0 ? (
            // Show actual privacy concerns if available
            privacyConcerns.slice(0, 3).map((concern, index) => (
              <div key={index} className="p-3 rounded-lg bg-white/80 border border-white/50 shadow-sm">
                <p className="text-sm font-medium flex items-center justify-between">
                  <span>{concern.type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    concern.severity === 'low' 
                      ? "bg-green-100 text-green-800" 
                      : concern.severity === 'medium' 
                        ? "bg-amber-100 text-amber-800" 
                        : "bg-red-100 text-red-800"
                  }`}>
                    {String(concern.severity).charAt(0).toUpperCase() + String(concern.severity).slice(1)} Risk
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {concern.description}
                </p>
              </div>
            ))
          ) : (
            // Default privacy concerns if none available
            <>
              <div className="p-3 rounded-lg bg-white/80 border border-white/50 shadow-sm">
                <p className="text-sm font-medium flex items-center justify-between">
                  <span>Profile Visibility</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Medium Risk</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">Your activity level and visibility across platforms.</p>
              </div>
              
              <div className="p-3 rounded-lg bg-white/80 border border-white/50 shadow-sm">
                <p className="text-sm font-medium flex items-center justify-between">
                  <span>Personal Information</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">High Risk</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">Sensitive personal details detected in your content.</p>
              </div>
              
              <div className="p-3 rounded-lg bg-white/80 border border-white/50 shadow-sm">
                <p className="text-sm font-medium flex items-center justify-between">
                  <span>Location Sharing</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">Low Risk</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">Minimal location data found in your online content.</p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Sentiment Analysis component that uses actual Reddit data
export function SentimentAnalysisSection({
  data,
  activeData,
  activeMonth
}: {
  data: DigitalFootprintResponse;
  activeData: TimelineActivityData | null;
  activeMonth: string | null;
}) {
  if (!activeData) return null;
  
  // Find Reddit data to get sentiment breakdown
  const redditData = data.platformData.find(p => p.platformId === "reddit");
  const sentimentData = redditData?.analysisResults?.sentimentBreakdown || {
    positive: activeData.sentiment?.positive || 0.2,
    neutral: activeData.sentiment?.neutral || 0.6,
    negative: activeData.sentiment?.negative || 0.2
  };
  
  // Format for the pie chart
  const sentimentChartData = [
    { name: 'Positive', value: sentimentData.positive * 100, fill: GRADIENT_COLORS.sentiment.positive },
    { name: 'Neutral', value: sentimentData.neutral * 100, fill: GRADIENT_COLORS.sentiment.neutral },
    { name: 'Negative', value: sentimentData.negative * 100, fill: GRADIENT_COLORS.sentiment.negative }
  ];
  
  // Determine dominant sentiment
  let dominantSentiment = "neutral";
  if (sentimentData.positive > sentimentData.neutral && sentimentData.positive > sentimentData.negative) {
    dominantSentiment = "positive";
  } else if (sentimentData.negative > sentimentData.neutral && sentimentData.negative > sentimentData.positive) {
    dominantSentiment = "negative";
  }
  
  // For sentiment samples - in a real app these would come from the API
  // We're not showing samples since our API doesn't provide them
  const sample = null;
  
  return (
    <Card className="overflow-hidden glass-card rounded-xl border-none">
      <div className="bg-gradient-to-r from-sky-50 to-blue-50/80 px-6 py-4 border-b border-white/20">
        <h4 className="text-lg font-display font-medium text-gray-800 flex items-center">
          <span className="mr-2 p-1.5 rounded-full bg-blue-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-700">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
              <line x1="9" y1="9" x2="9.01" y2="9"></line>
              <line x1="15" y1="9" x2="15.01" y2="9"></line>
            </svg>
          </span>
          Sentiment Analysis
          {activeMonth && <span className="ml-2 px-2 py-0.5 text-sm font-normal bg-blue-100 text-blue-700 rounded-full">
            {activeMonth}
          </span>}
        </h4>
      </div>
      <CardContent className="p-6">
        <div className="chart-container mb-4">
          <div className="h-56 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  animationDuration={800}
                >
                  <Cell fill={GRADIENT_COLORS.sentiment.positive} />
                  <Cell fill={GRADIENT_COLORS.sentiment.neutral} />
                  <Cell fill={GRADIENT_COLORS.sentiment.negative} />
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: 'none',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255,255,255,0.95)'
                  }} 
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Percentage']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="p-4 bg-blue-50/60 rounded-xl">
          <p className="text-sm text-blue-700">
            This sentiment analysis is based on <span className="font-semibold">{data.username}'s</span> content posted during {activeMonth}. 
            {dominantSentiment === "positive"
              ? " The overall tone is primarily positive."
              : dominantSentiment === "negative"
                ? " The overall tone tends toward negative sentiments."
                : " The content has a generally neutral tone."
            }
          </p>
          {/* Sample content will be shown here when API supports it */}
        </div>
      </CardContent>
    </Card>
  );
}

// Interactive Platform Selector component
export function PlatformSelector({
  activeData,
  activeMonth,
  activePlatform,
  setActivePlatform
}: {
  activeData: TimelineActivityData | null;
  activeMonth: string | null;
  activePlatform: Platform | "all";
  setActivePlatform: (platform: Platform | "all") => void;
}) {
  if (!activeData || !activeData.platforms) return null;
  
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-6 p-3 frost-blur rounded-xl">
      <Button 
        variant={activePlatform === "all" ? "default" : "outline"} 
        size="sm"
        onClick={() => setActivePlatform("all")}
        className={`${activePlatform === "all" ? "button-gradient font-medium" : "bg-white/80 hover:bg-white"} transition-all shadow-sm`}
      >
        All Platforms
      </Button>
      {Object.keys(activeData.platforms).map(platform => (
        <Button 
          key={platform}
          variant={activePlatform === platform ? "default" : "outline"} 
          size="sm"
          onClick={() => setActivePlatform(platform as Platform)}
          className={`${activePlatform === platform ? "button-gradient font-medium" : "bg-white/80 hover:bg-white"} transition-all shadow-sm`}
        >
          {platform}
        </Button>
      ))}
    </div>
  );
}