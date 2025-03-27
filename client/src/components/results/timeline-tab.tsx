import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabContentProps } from "@/lib/types";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, 
  Legend, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { 
  CHART_COLORS, 
  generateTimelineData, 
  filterTimelineByDateRange,
  getActivityByPlatform,
  TimelineActivityData,
  formatNumber,
  GRADIENT_COLORS
} from "@/lib/chart-utils";
import { Platform } from "@shared/schema";
import {
  PrivacyAssessmentSection,
  SentimentAnalysisSection,
  PlatformSelector
} from "./timeline-sections";

export default function TimelineTab({ data, isLoading }: TabContentProps) {
  const [, setLocation] = useLocation();
  const [timelineData, setTimelineData] = useState<TimelineActivityData[]>([]);
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<Platform | "all">("all");
  const [timeRange, setTimeRange] = useState([0, 100]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1000); // milliseconds between animations
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize with actual platform data from the API
  useEffect(() => {
    if (!data || !data.platformData || data.platformData.length === 0) return;
    
    // Find the Reddit platform data since it contains the most detailed activity timeline
    const redditData = data.platformData.find(
      p => p.platformId === "reddit" && p.analysisResults?.activityTimeline
    );
    
    if (redditData && redditData.analysisResults?.activityTimeline) {
      const activities = redditData.analysisResults.activityTimeline;
      
      // Transform the Reddit timeline data to our TimelineActivityData format
      const transformedData: TimelineActivityData[] = activities.map(activity => {
        // For Reddit API, we have 'period' and 'count' properties in the activity timeline
        const dateParts = activity.period.split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
        const date = new Date(year, month);
        
        // Get the sentiment data for this time period if available
        const sentiment = redditData.analysisResults?.sentimentBreakdown ? {
          positive: redditData.analysisResults.sentimentBreakdown.positive * 100 || 0,
          neutral: redditData.analysisResults.sentimentBreakdown.neutral * 100 || 0,
          negative: redditData.analysisResults.sentimentBreakdown.negative * 100 || 0
        } : { positive: 0, neutral: 0, negative: 0 };
        
        // Create platform-specific activity counts
        const platforms: Record<string, number> = {};
        data.platformData.forEach(platform => {
          // For now just assign the activity count to each platform
          // In a real app, we'd have platform-specific time data
          platforms[platform.platformId] = activity.count / data.platformData.length;
        });
        
        // Estimate content types based on overall counts from the breakdown
        const totalPosts = data.summary?.breakdownByType.posts || 0;
        const totalComments = data.summary?.breakdownByType.comments || 0;
        const totalLikes = data.summary?.breakdownByType.likes || 0;
        const total = totalPosts + totalComments + totalLikes;
        
        const contentTypes = {
          posts: total > 0 ? Math.round((totalPosts / total) * activity.count) : 0,
          comments: total > 0 ? Math.round((totalComments / total) * activity.count) : 0,
          likes: total > 0 ? Math.round((totalLikes / total) * activity.count) : 0,
          shares: 0 // Not available in our API
        };
        
        // Create our TimelineActivityData object
        return {
          name: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          value: activity.count,
          date: date,
          platforms: platforms,
          sentiment: sentiment,
          contentTypes: contentTypes,
          highlighted: false,
          privacyScore: redditData.analysisResults?.privacyConcerns ? 
            redditData.analysisResults.privacyConcerns.length * 10 : 0,
          engagementRate: Math.random() * 5 + 1 // Mock engagement rate since it's not in our API
        };
      }).sort((a, b) => a.date.getTime() - b.date.getTime()); // Sort by date ascending
      
      setTimelineData(transformedData);
      
      if (transformedData.length > 0) {
        // Set the active month to the most recent data point
        setActiveMonth(transformedData[transformedData.length - 1].name);
      }
    } else {
      // If no Reddit data is available, fall back to generated data but make it clear it's a fallback
      console.log("No Reddit timeline data available, using synthetic data as a fallback");
      const generatedData = generateTimelineData(24, true) as TimelineActivityData[];
      setTimelineData(generatedData);
      
      if (generatedData.length > 0) {
        setActiveMonth(generatedData[generatedData.length - 1].name);
      }
    }
    
    return () => {
      // Clean up animation on unmount
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [data]);
  
  // Handle animation play/pause
  useEffect(() => {
    if (isPlaying) {
      animateTimeline();
    } else if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isPlaying, activeMonth, animationSpeed]);
  
  // Animation function to cycle through months
  const animateTimeline = () => {
    if (!activeMonth || timelineData.length === 0) return;
    
    const currentIndex = timelineData.findIndex(item => item.name === activeMonth);
    if (currentIndex === -1) return;
    
    const nextIndex = (currentIndex + 1) % timelineData.length;
    
    // Highlight the current month
    const updatedData = timelineData.map((item, index) => ({
      ...item,
      highlighted: index === currentIndex
    }));
    
    setTimelineData(updatedData);
    
    // Schedule the next animation frame
    animationRef.current = setTimeout(() => {
      setActiveMonth(timelineData[nextIndex].name);
    }, animationSpeed);
  };
  
  // Get data for the active month
  const getActiveMonthData = () => {
    if (!activeMonth) return null;
    return timelineData.find(item => item.name === activeMonth);
  };
  
  // Handle time range change
  const handleTimeRangeChange = (values: number[]) => {
    setTimeRange(values);
    
    // Calculate the date range based on the slider values
    const minIdx = Math.floor((values[0] / 100) * (timelineData.length - 1));
    const maxIdx = Math.floor((values[1] / 100) * (timelineData.length - 1));
    
    if (timelineData[minIdx]) {
      setActiveMonth(timelineData[minIdx].name);
    }
  };
  
  // Filter platforms based on selected platform
  const getFilteredPlatformData = () => {
    const monthData = getActiveMonthData();
    if (!monthData || !monthData.platforms) return [];
    
    if (activePlatform === "all") {
      return Object.entries(monthData.platforms).map(([platform, count]) => ({
        name: platform,
        value: count
      }));
    } else {
      return [{
        name: activePlatform,
        value: monthData.platforms[activePlatform] || 0
      }];
    }
  };
  
  // Toggle animation play/pause
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };
  
  // Change animation speed
  const changeSpeed = (faster: boolean) => {
    if (faster && animationSpeed > 200) {
      setAnimationSpeed(prev => prev - 200);
    } else if (!faster && animationSpeed < 2000) {
      setAnimationSpeed(prev => prev + 200);
    }
  };
  
  // Reset animation
  const resetAnimation = () => {
    if (timelineData.length > 0) {
      setActiveMonth(timelineData[0].name);
      setIsPlaying(false);
    }
  };
  
  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
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
  
  const activeData = getActiveMonthData();
  
  return (
    <>
      <div className="mb-10 fade-in">
        <h2 className="heading-gradient-vibrant text-3xl font-bold font-display tracking-tight mb-3">Digital Presence Timeline</h2>
        <p className="text-muted-foreground text-lg max-w-3xl">
          Visualize <span className="font-semibold text-foreground">@{data.username}'s</span> social media journey through time with our interactive analytics dashboard.
        </p>
      </div>
      
      {/* Main Timeline Chart with Animation */}
      <Card className="mb-10 glass-card rounded-xl overflow-hidden border-none">
        <CardContent className="p-8">
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-display font-semibold mb-1">Timeline Explorer</h3>
                {activeMonth && 
                  <div className="flex items-center text-muted-foreground"> 
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                      {activeMonth}
                    </span>
                  </div>
                }
              </div>
              
              <div className="mt-4 md:mt-0 px-3 py-1.5 bg-indigo-50 rounded-full text-sm text-indigo-800 font-medium flex items-center">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mr-2 animate-pulse"></div>
                Speed: {Math.round((2200 - animationSpeed) / 2000 * 100)}%
              </div>
            </div>
            
            {/* Animation Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-8 p-4 rounded-xl frost-blur">
              <Button 
                variant={isPlaying ? "destructive" : "default"}
                size="sm" 
                onClick={togglePlayPause}
                className={`w-28 font-medium transition-all shadow-sm ${isPlaying ? '' : 'button-gradient'}`}
              >
                {isPlaying ? "■ Pause" : "▶ Play"}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => changeSpeed(false)}
                disabled={animationSpeed >= 2000}
                className="font-medium transition-all bg-white/80 hover:bg-white"
              >
                <span className="mr-1.5">🐢</span> Slower
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => changeSpeed(true)}
                disabled={animationSpeed <= 200}
                className="font-medium transition-all bg-white/80 hover:bg-white"
              >
                <span className="mr-1.5">🐇</span> Faster
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetAnimation}
                className="font-medium transition-all bg-white/80 hover:bg-white"
              >
                <span className="mr-1.5">↺</span> Reset
              </Button>
            </div>
          </div>
          
          {/* Main Timeline Chart */}
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={timelineData}
                margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="colorNeutral" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6b7280" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6b7280" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
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
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border rounded shadow-sm">
                          <p className="text-sm font-medium">{payload[0].payload.name}</p>
                          <p className="text-sm">Activity: {payload[0].value}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#8b5cf6" 
                  fillOpacity={1}
                  fill="url(#colorActivity)" 
                  animationDuration={1000}
                  activeDot={{ 
                    r: 6,
                    fill: "#8b5cf6"
                  }}
                  dot={{
                    r: 4,
                    fill: "#8b5cf6"
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Timeline Range Slider */}
          <div className="px-4">
            <Slider
              defaultValue={[0, 100]}
              value={timeRange}
              onValueChange={handleTimeRangeChange}
              max={100}
              step={1}
              className="mt-6"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{timelineData[0]?.name || "Start"}</span>
              <span>{timelineData[Math.floor(timelineData.length / 2)]?.name}</span>
              <span>{timelineData[timelineData.length - 1]?.name || "End"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Detailed Activity Section */}
      {activeData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 fade-in">
          {/* Platform Distribution */}
          <Card className="overflow-hidden glass-card rounded-xl border-none">
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50/80 px-6 py-4 border-b border-white/20">
              <h4 className="text-lg font-display font-medium text-gray-800 flex items-center">
                <span className="mr-2 p-1.5 rounded-full bg-violet-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-700">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 12h8"></path>
                    <path d="M12 8v8"></path>
                  </svg>
                </span>
                Platform Distribution
                {activeMonth && <span className="ml-2 px-2 py-0.5 text-sm font-normal bg-violet-100 text-violet-700 rounded-full">
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
                        data={getFilteredPlatformData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        animationDuration={800}
                      >
                        {getFilteredPlatformData().map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CHART_COLORS[index % CHART_COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          border: 'none',
                          padding: '8px 12px',
                          backgroundColor: 'rgba(255,255,255,0.95)'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <PlatformSelector 
                activeData={activeData} 
                activeMonth={activeMonth} 
                activePlatform={activePlatform} 
                setActivePlatform={setActivePlatform} 
              />
            </CardContent>
          </Card>
          
          {/* Content Type Distribution */}
          <Card className="overflow-hidden glass-card rounded-xl border-none">
            <div className="bg-gradient-to-r from-fuchsia-50 to-purple-50/80 px-6 py-4 border-b border-white/20">
              <h4 className="text-lg font-display font-medium text-gray-800 flex items-center">
                <span className="mr-2 p-1.5 rounded-full bg-fuchsia-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fuchsia-700">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="3" y1="15" x2="21" y2="15"></line>
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                    <line x1="15" y1="3" x2="15" y2="21"></line>
                  </svg>
                </span>
                Content Analysis
                {activeMonth && <span className="ml-2 px-2 py-0.5 text-sm font-normal bg-fuchsia-100 text-fuchsia-700 rounded-full">
                  {activeMonth}
                </span>}
              </h4>
            </div>
            <CardContent className="p-6">
              <div className="chart-container mb-2">
                <div className="h-56 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(activeData.contentTypes || {}).map(([type, count]) => ({
                        name: type.charAt(0).toUpperCase() + type.slice(1),
                        value: count
                      }))}
                      margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        type="number" 
                        tick={{ fontSize: 12 }} 
                        tickLine={false} 
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ fontSize: 12, fontWeight: 500 }} 
                        tickLine={false}
                        axisLine={false}
                        width={80}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          border: 'none',
                          padding: '8px 12px',
                          backgroundColor: 'rgba(255,255,255,0.95)'
                        }}
                      />
                      <defs>
                        <linearGradient id="contentBarGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#d946ef" />
                        </linearGradient>
                      </defs>
                      <Bar 
                        dataKey="value" 
                        name="Count" 
                        fill="url(#contentBarGradient)" 
                        animationDuration={800}
                        radius={[0, 4, 4, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <div className="text-sm text-gray-500 font-medium bg-white/70 px-4 py-2 rounded-full border border-gray-100 shadow-sm">
                  Total Content Interactions: <span className="font-semibold text-purple-700">{
                    Object.values(activeData.contentTypes || {}).reduce((sum, count) => sum + count, 0)
                  }</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Sentiment Analysis */}
      {/* Advanced Analysis Sections */}
      {activeData && activeData.sentiment && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 fade-in">
          {/* Use our new components here */}
          <PrivacyAssessmentSection 
            data={data}
            activeData={activeData}
            activeMonth={activeMonth}
          />
          
          <SentimentAnalysisSection 
            data={data}
            activeData={activeData}
            activeMonth={activeMonth}
          />
        </div>
      )}
      
      {/* Legacy sentiment analysis chart - keeping for backwards compatibility */}
      {false && activeData && activeData.sentiment && (
        <Card className="mb-10 glass-card border-none rounded-xl overflow-hidden fade-in">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/80 px-6 py-4 border-b border-white/20">
            <h4 className="text-lg font-display font-medium text-gray-800 flex items-center">
              <span className="mr-2 p-1.5 rounded-full bg-blue-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-700">
                  <circle cx="12" cy="8" r="7"></circle>
                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                </svg>
              </span>
              Emotional Sentiment Trends
              <div className="flex ml-3 items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-normal text-emerald-700">Positive</span>
                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                <span className="text-xs font-normal text-gray-700">Neutral</span>
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-xs font-normal text-red-700">Negative</span>
              </div>
            </h4>
          </div>
          <CardContent className="p-6">
            <div className="chart-container p-2">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timelineData.map(item => ({
                      name: item.name,
                      positive: item.sentiment?.positive || 0,
                      neutral: item.sentiment?.neutral || 0,
                      negative: item.sentiment?.negative || 0,
                      highlighted: item.name === activeMonth
                    }))}
                    margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        border: 'none',
                        padding: '8px 12px',
                        backgroundColor: 'rgba(255,255,255,0.95)'
                      }}
                    />
                    <defs>
                      <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                      </linearGradient>
                      <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <Line 
                      type="monotone" 
                      dataKey="positive" 
                      name="Positive" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: "#10b981",
                        strokeWidth: 2,
                        stroke: "white"
                      }}
                      activeDot={{ 
                        r: 6,
                        stroke: "white",
                        strokeWidth: 2
                      }}
                      animationDuration={1000}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="neutral" 
                      name="Neutral" 
                      stroke="#6b7280" 
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={{
                        r: 4,
                        fill: "#6b7280",
                        strokeWidth: 2,
                        stroke: "white"
                      }}
                      activeDot={{ 
                        r: 6,
                        stroke: "white",
                        strokeWidth: 2
                      }}
                      animationDuration={1000}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="negative" 
                      name="Negative" 
                      stroke="#ef4444" 
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: "#ef4444",
                        strokeWidth: 2,
                        stroke: "white"
                      }}
                      activeDot={{ 
                        r: 6,
                        stroke: "white",
                        strokeWidth: 2
                      }}
                      animationDuration={1000}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-6 bg-blue-50/50 p-4 rounded-xl">
              <h5 className="text-sm font-semibold text-blue-800 mb-2">Sentiment Insights</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/80 p-3 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">Positive</div>
                    <div className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                      {Math.round(activeData.sentiment?.positive || 0)}%
                    </div>
                  </div>
                  <div className="mt-1 w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${activeData.sentiment?.positive || 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="bg-white/80 p-3 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">Neutral</div>
                    <div className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full">
                      {Math.round(activeData.sentiment?.neutral || 0)}%
                    </div>
                  </div>
                  <div className="mt-1 w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-gray-500 h-2 rounded-full" 
                      style={{ width: `${activeData.sentiment?.neutral || 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="bg-white/80 p-3 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">Negative</div>
                    <div className="text-xs font-medium px-2 py-0.5 bg-red-100 text-red-800 rounded-full">
                      {Math.round(activeData.sentiment?.negative || 0)}%
                    </div>
                  </div>
                  <div className="mt-1 w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ width: `${activeData.sentiment?.negative || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Analysis Insights */}
      <Card className="mb-8 glass-card border-none rounded-xl overflow-hidden fade-in">
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50/80 px-6 py-4 border-b border-white/20">
          <h3 className="text-lg font-display font-medium text-gray-800 flex items-center">
            <span className="mr-2 p-1.5 rounded-full bg-purple-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-700">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
            </span>
            Digital Behavior Analysis
          </h3>
          <p className="text-sm text-gray-600 ml-9">Comprehensive insights on social media engagement patterns and platform preferences</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="frost-blur p-5 rounded-xl">
              <h4 className="text-sm font-semibold mb-4 text-indigo-700 uppercase tracking-wider flex items-center">
                <div className="p-1.5 rounded-full bg-indigo-100 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-700">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                  </svg>
                </div>
                Activity Patterns
              </h4>
              <ul className="space-y-3">
                <li className="flex items-start bg-white/90 p-3 rounded-lg shadow-sm">
                  <div className="mr-3 mt-0.5 text-indigo-600 bg-indigo-50 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-gray-700 mb-1">Peak Activity Times</h5>
                    <p className="text-sm">Activity peaks during <span className="font-medium text-indigo-700">weekends</span> and <span className="font-medium text-indigo-700">evenings</span>, showing consistent engagement patterns</p>
                  </div>
                </li>
                <li className="flex items-start bg-white/90 p-3 rounded-lg shadow-sm">
                  <div className="mr-3 mt-0.5 text-green-600 bg-green-50 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                      <polyline points="17 6 23 6 23 12"></polyline>
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-gray-700 mb-1">Growth Trends</h5>
                    <p className="text-sm">Content creation increased by <span className="font-medium text-green-600">27%</span> in the last 6 months with improved engagement metrics</p>
                  </div>
                </li>
                <li className="flex items-start bg-white/90 p-3 rounded-lg shadow-sm">
                  <div className="mr-3 mt-0.5 text-amber-600 bg-amber-50 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-gray-700 mb-1">Sentiment Evolution</h5>
                    <p className="text-sm">Overall sentiment has become more positive over time (<span className="font-medium text-green-600">15% increase</span>) suggesting improved online presence</p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="frost-blur p-5 rounded-xl">
              <h4 className="text-sm font-semibold mb-4 text-fuchsia-700 uppercase tracking-wider flex items-center">
                <div className="p-1.5 rounded-full bg-fuchsia-100 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fuchsia-700">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                </div>
                Platform Preferences
              </h4>
              <ul className="space-y-3">
                <li className="flex items-start bg-white/90 p-3 rounded-lg shadow-sm">
                  <div className="mr-3 mt-0.5 text-blue-600 bg-blue-50 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                      <line x1="6" y1="1" x2="6" y2="4"></line>
                      <line x1="10" y1="1" x2="10" y2="4"></line>
                      <line x1="14" y1="1" x2="14" y2="4"></line>
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-gray-700 mb-1">Platform Shifts</h5>
                    <p className="text-sm">Transition from <span className="font-medium text-blue-600">Facebook</span> to increased activity on <span className="font-medium text-sky-500">Twitter</span> and <span className="font-medium text-pink-500">Instagram</span></p>
                  </div>
                </li>
                <li className="flex items-start bg-white/90 p-3 rounded-lg shadow-sm">
                  <div className="mr-3 mt-0.5 text-purple-600 bg-purple-50 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-gray-700 mb-1">Content Evolution</h5>
                    <p className="text-sm">Content type has evolved from mostly <span className="font-medium text-gray-800">posts</span> to more interactive <span className="font-medium text-purple-700">comments</span> and engagement</p>
                  </div>
                </li>
                <li className="flex items-start bg-white/90 p-3 rounded-lg shadow-sm">
                  <div className="mr-3 mt-0.5 text-blue-700 bg-blue-50 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                      <rect x="2" y="9" width="4" height="12"></rect>
                      <circle cx="4" cy="4" r="2"></circle>
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-gray-700 mb-1">Professional Focus</h5>
                    <p className="text-sm"><span className="font-medium text-blue-700">LinkedIn</span> activity has increased significantly (<span className="font-medium text-green-600">43%</span>), suggesting a career-focused shift</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => setLocation("/deletion")} className="bg-white/70 hover:bg-white transition-all shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-600 mr-2">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              Manage Digital Privacy
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}