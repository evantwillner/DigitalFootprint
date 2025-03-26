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
  formatNumber
} from "@/lib/chart-utils";
import { Platform } from "@shared/schema";

export default function TimelineTab({ data, isLoading }: TabContentProps) {
  const [, setLocation] = useLocation();
  const [timelineData, setTimelineData] = useState<TimelineActivityData[]>([]);
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<Platform | "all">("all");
  const [timeRange, setTimeRange] = useState([0, 100]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1000); // milliseconds between animations
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize with detailed timeline data
  useEffect(() => {
    // In a real app, we would transform the actual data from the API
    // Instead of using a generator function
    const generatedData = generateTimelineData(24, true) as TimelineActivityData[];
    setTimelineData(generatedData);
    
    if (generatedData.length > 0) {
      setActiveMonth(generatedData[generatedData.length - 1].name);
    }
    
    return () => {
      // Clean up animation on unmount
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);
  
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
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Interactive Timeline</h3>
        <p className="text-gray-600 mb-6">
          Explore {data.username}'s social media activity over time with this interactive visualization.
        </p>
      </div>
      
      {/* Main Timeline Chart with Animation */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="mb-4">
            <h4 className="text-md font-medium mb-2 flex items-center">
              Activity Timeline
              {activeMonth && <span className="ml-2 text-sm font-normal text-gray-500">
                Viewing: {activeMonth}
              </span>}
            </h4>
            
            {/* Animation Controls */}
            <div className="flex items-center space-x-2 mb-6">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={togglePlayPause}
                className="w-24"
              >
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => changeSpeed(false)}
                disabled={animationSpeed >= 2000}
              >
                Slower
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => changeSpeed(true)}
                disabled={animationSpeed <= 200}
              >
                Faster
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetAnimation}
              >
                Reset
              </Button>
              <div className="text-sm text-gray-500">
                Speed: {(2200 - animationSpeed) / 2000 * 100}%
              </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Platform Distribution */}
          <Card>
            <CardContent className="p-6">
              <h4 className="text-md font-medium mb-4">Platform Activity in {activeMonth}</h4>
              <div className="h-56">
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
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Button 
                  variant={activePlatform === "all" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setActivePlatform("all")}
                >
                  All
                </Button>
                {Object.keys(activeData.platforms || {}).map(platform => (
                  <Button 
                    key={platform}
                    variant={activePlatform === platform ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setActivePlatform(platform as Platform)}
                  >
                    {platform}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Content Type Distribution */}
          <Card>
            <CardContent className="p-6">
              <h4 className="text-md font-medium mb-4">Content Type in {activeMonth}</h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(activeData.contentTypes || {}).map(([type, count]) => ({
                      name: type,
                      value: count
                    }))}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      width={80}
                    />
                    <Tooltip />
                    <Bar 
                      dataKey="value" 
                      name="Count" 
                      fill="#f43f5e" 
                      animationDuration={800}
                      radius={[0, 4, 4, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Sentiment Analysis */}
      {activeData && activeData.sentiment && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <h4 className="text-md font-medium mb-4">Sentiment Trend</h4>
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
                  margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                >
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
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="positive" 
                    name="Positive" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{
                      r: 4,
                      fill: "#10b981"
                    }}
                    activeDot={{ r: 6 }}
                    animationDuration={800}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="neutral" 
                    name="Neutral" 
                    stroke="#6b7280" 
                    strokeWidth={2}
                    dot={{
                      r: 4,
                      fill: "#6b7280"
                    }}
                    activeDot={{ r: 6 }}
                    animationDuration={800}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="negative" 
                    name="Negative" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{
                      r: 4,
                      fill: "#ef4444"
                    }}
                    activeDot={{ r: 6 }}
                    animationDuration={800}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Analysis Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-8">
        <h3 className="text-lg font-medium mb-4">Timeline Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-2 uppercase tracking-wider text-gray-500">Key Patterns</h4>
            <ul className="space-y-3">
              <li className="flex items-start">
                <div className="mr-2 mt-0.5 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                  </svg>
                </div>
                <span>Activity peaks during weekends and evenings, with consistent posting patterns</span>
              </li>
              <li className="flex items-start">
                <div className="mr-2 mt-0.5 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 8v8M8 12h8"></path>
                  </svg>
                </div>
                <span>Content creation increased by 27% in the last 6 months</span>
              </li>
              <li className="flex items-start">
                <div className="mr-2 mt-0.5 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                  </svg>
                </div>
                <span>Sentiment has become more positive over time (15% increase)</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2 uppercase tracking-wider text-gray-500">Platform Shifts</h4>
            <ul className="space-y-3">
              <li className="flex items-start">
                <div className="mr-2 mt-0.5 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <line x1="20" y1="8" x2="20" y2="14"></line>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                  </svg>
                </div>
                <span>Shifted from primarily using Facebook to more Twitter and Instagram activity</span>
              </li>
              <li className="flex items-start">
                <div className="mr-2 mt-0.5 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </div>
                <span>Content type shifted from mostly posts to more interactive content (comments)</span>
              </li>
              <li className="flex items-start">
                <div className="mr-2 mt-0.5 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="14 2 18 6 7 17 3 17 3 13 14 2"></polygon>
                    <line x1="3" y1="22" x2="21" y2="22"></line>
                  </svg>
                </div>
                <span>LinkedIn activity has increased significantly (43%) in recent months</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}