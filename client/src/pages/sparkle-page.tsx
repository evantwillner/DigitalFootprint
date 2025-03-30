import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SparkleEffect } from '@/components/ui/sparkle-effect';
import { PAGE_TITLES } from '@/lib/constants';
import { Sparkles, Bell, ExternalLink, RefreshCw, Flag, Lightbulb, Heart, AlertCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

// Sample insights for demonstration
const SAMPLE_INSIGHTS = [
  {
    id: 1,
    title: "High Privacy Risk Detected",
    description: "Your public profile contains potentially sensitive information that could be accessed by others.",
    type: "warning",
    importance: "high"
  },
  {
    id: 2,
    title: "Positive Sentiment Growth",
    description: "Your recent content has shown a 23% increase in positive sentiment compared to previous months.",
    type: "success", 
    importance: "medium"
  },
  {
    id: 3,
    title: "Engagement Opportunity",
    description: "Based on your activity patterns, posting between 6-8 PM could increase your engagement by up to 35%.",
    type: "info",
    importance: "medium"
  },
  {
    id: 4,
    title: "Personal Information Exposure",
    description: "We've detected location data attached to 12 of your recent posts that may reveal your regular locations.",
    type: "warning",
    importance: "high"
  },
  {
    id: 5,
    title: "Cross-Platform Presence",
    description: "Your digital footprint spans 4 platforms with consistent username usage, making your online presence easy to connect.",
    type: "info",
    importance: "low"
  }
];

// Icons based on insight type
const getInsightIcon = (type: string) => {
  switch (type) {
    case 'warning': 
      return <AlertCircle className="h-5 w-5 text-amber-500" />;
    case 'success': 
      return <Lightbulb className="h-5 w-5 text-green-500" />;
    case 'info': 
      return <Bell className="h-5 w-5 text-blue-500" />;
    default: 
      return <Bell className="h-5 w-5 text-blue-500" />;
  }
};

// Badge colors based on importance
const getImportanceColor = (importance: string) => {
  switch (importance) {
    case 'high': 
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium': 
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': 
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default: 
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// The demo component showcasing various sparkle effects
const SparkleDemo = () => {
  const [activeInsights, setActiveInsights] = useState<number[]>([1, 2]);
  const [sparkleCount, setSparkleCount] = useState<number>(5);
  const [sparkleSize, setSparkleSize] = useState<number>(16);
  const [activeTrigger, setActiveTrigger] = useState<string>('auto');
  const [colorScheme, setColorScheme] = useState<string>("gold");
  const [highlightInline, setHighlightInline] = useState<boolean>(false);
  
  const colorOptions = {
    gold: ["#FFC700", "#FFD700", "#F5BC00", "#FFAA00"],
    rainbow: ["#FF6B6B", "#4DCCBD", "#9B5DE5", "#F15BB5"],
    ocean: ["#00B4D8", "#0077B6", "#48CAE4", "#90E0EF"],
    forest: ["#52B788", "#2D6A4F", "#95D5B2", "#74C69D"]
  };
  
  const toggleInsight = (id: number) => {
    setActiveInsights(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };
  
  // Render the sample paragraph with inline sparkles
  const renderWithInlineSparkles = (text: string) => {
    if (!highlightInline) return <p>{text}</p>;
    
    const words = text.split(' ');
    const keyWords = ['privacy risk', 'sensitive information', 'engagement', 'positive sentiment', 'activity patterns'];
    
    return (
      <p>
        {words.map((word, i) => {
          // Check if any key word contains this word (case insensitive)
          const shouldSparkle = keyWords.some(
            keyword => keyword.toLowerCase().includes(word.toLowerCase())
          );
          
          return (
            <React.Fragment key={i}>
              {shouldSparkle ? (
                <SparkleEffect 
                  isActive={true}
                  sparkleCount={3}
                  size={14}
                  colors={colorOptions[colorScheme as keyof typeof colorOptions]}
                  className="font-medium text-primary"
                >
                  {word}
                </SparkleEffect>
              ) : (
                word
              )}{' '}
            </React.Fragment>
          );
        })}
      </p>
    );
  };
  
  return (
    <div className="container py-8 fade-in">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="heading-gradient text-3xl font-bold">{PAGE_TITLES.sparkle}</h1>
            <p className="text-gray-500 mt-1">
              Test and customize visual effects for highlighting new insights
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1">
              <RefreshCw className="h-4 w-4" />
              Reset
            </Button>
            <Button size="sm" className="gap-1">
              <ExternalLink className="h-4 w-4" />
              View in Results
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Sparkle Effect Controls</CardTitle>
              <CardDescription>
                Customize how insight highlights appear
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="trigger-mode">Trigger Mode</Label>
                <Select 
                  value={activeTrigger}
                  onValueChange={setActiveTrigger}
                >
                  <SelectTrigger id="trigger-mode">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatic (Always On)</SelectItem>
                    <SelectItem value="hover">On Hover</SelectItem>
                    <SelectItem value="click">On Click</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="color-scheme">Color Scheme</Label>
                <Select 
                  value={colorScheme}
                  onValueChange={setColorScheme}
                >
                  <SelectTrigger id="color-scheme">
                    <SelectValue placeholder="Select colors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="rainbow">Rainbow</SelectItem>
                    <SelectItem value="ocean">Ocean</SelectItem>
                    <SelectItem value="forest">Forest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sparkle-count">Sparkle Count: {sparkleCount}</Label>
                </div>
                <Slider 
                  id="sparkle-count"
                  min={1} 
                  max={12} 
                  step={1}
                  value={[sparkleCount]}
                  onValueChange={(value) => setSparkleCount(value[0])}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sparkle-size">Sparkle Size: {sparkleSize}px</Label>
                </div>
                <Slider 
                  id="sparkle-size"
                  min={8} 
                  max={30} 
                  step={1}
                  value={[sparkleSize]}
                  onValueChange={(value) => setSparkleSize(value[0])}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2 pt-2">
                <Label htmlFor="highlight-inline">Highlight in paragraph text</Label>
                <Switch 
                  id="highlight-inline"
                  checked={highlightInline}
                  onCheckedChange={setHighlightInline}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex flex-col">
              <div className="text-sm text-muted-foreground mb-2">
                <p className="flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-yellow-400" />
                  Toggle insights below to enable/disable effects:
                </p>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {SAMPLE_INSIGHTS.map(insight => (
                  <Button
                    key={insight.id}
                    size="sm"
                    variant={activeInsights.includes(insight.id) ? "default" : "outline"}
                    onClick={() => toggleInsight(insight.id)}
                    className="text-xs"
                  >
                    Insight {insight.id}
                  </Button>
                ))}
              </div>
            </CardFooter>
          </Card>
          
          {/* Preview Panel */}
          <Card className="lg:col-span-8">
            <CardHeader>
              <CardTitle>Sparkle Effect Preview</CardTitle>
              <CardDescription>
                See how the sparkle effect looks on different UI elements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="insights">
                <TabsList className="mb-4">
                  <TabsTrigger value="insights">Insight Cards</TabsTrigger>
                  <TabsTrigger value="paragraph">Paragraph Text</TabsTrigger>
                  <TabsTrigger value="buttons">Buttons & UI</TabsTrigger>
                </TabsList>
                
                <TabsContent value="insights" className="space-y-4">
                  {SAMPLE_INSIGHTS.map(insight => (
                    <div 
                      key={insight.id}
                      className={`p-4 bg-white rounded-lg border border-gray-200 shadow-sm ${
                        activeInsights.includes(insight.id) ? 'ring-2 ring-primary/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900 mb-1 flex items-center">
                            <SparkleEffect 
                              isActive={activeInsights.includes(insight.id)}
                              trigger={activeTrigger as "hover" | "click" | "auto"} 
                              sparkleCount={sparkleCount}
                              size={sparkleSize}
                              colors={colorOptions[colorScheme as keyof typeof colorOptions]}
                              className="mr-2"
                            >
                              {getInsightIcon(insight.type)}
                            </SparkleEffect>
                            {insight.title}
                          </h4>
                          <p className="text-sm text-gray-600">{insight.description}</p>
                        </div>
                        <div className={`px-2 py-1 text-xs font-medium rounded border ${getImportanceColor(insight.importance)}`}>
                          {insight.importance}
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>
                
                <TabsContent value="paragraph">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <SparkleEffect 
                            isActive={activeInsights.includes(1)} 
                            sparkleCount={sparkleCount}
                            size={sparkleSize}
                            colors={colorOptions[colorScheme as keyof typeof colorOptions]}
                          >
                            <Lightbulb className="h-5 w-5 text-amber-500" />
                          </SparkleEffect>
                          <h3 className="text-lg font-semibold">Understanding Your Digital Footprint</h3>
                        </div>
                        
                        {renderWithInlineSparkles(
                          "Your digital footprint analysis has detected potential privacy risks. Our system found sensitive information in your public profiles that might be accessible to others. Your engagement metrics show positive sentiment growth in recent months. Based on your activity patterns, we recommend adjusting privacy settings."
                        )}
                        
                        <div className="mt-4 flex items-center gap-3">
                          <SparkleEffect 
                            isActive={activeInsights.includes(2)}
                            trigger={activeTrigger as "hover" | "click" | "auto"}
                            sparkleCount={sparkleCount}
                            size={sparkleSize}
                            colors={colorOptions[colorScheme as keyof typeof colorOptions]}
                          >
                            <Button size="sm" variant="outline" className="gap-1">
                              <Heart className="h-4 w-4" />
                              <span>Follow</span>
                            </Button>
                          </SparkleEffect>
                          
                          <Button size="sm" variant="outline" className="gap-1">
                            <Flag className="h-4 w-4" />
                            <span>Report Issue</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="buttons">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Button States</h3>
                          <div className="flex flex-wrap gap-3">
                            <SparkleEffect 
                              isActive={activeInsights.includes(1)}
                              trigger={activeTrigger as "hover" | "click" | "auto"}
                              sparkleCount={sparkleCount}
                              size={sparkleSize}
                              colors={colorOptions[colorScheme as keyof typeof colorOptions]}
                            >
                              <Button>Primary Action</Button>
                            </SparkleEffect>
                            
                            <SparkleEffect 
                              isActive={activeInsights.includes(2)}
                              trigger={activeTrigger as "hover" | "click" | "auto"}
                              sparkleCount={sparkleCount}
                              size={sparkleSize}
                              colors={colorOptions[colorScheme as keyof typeof colorOptions]}
                            >
                              <Button variant="outline">Secondary</Button>
                            </SparkleEffect>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Component Integration</h3>
                          <div className="flex flex-col gap-3">
                            <SparkleEffect 
                              isActive={activeInsights.includes(3)}
                              trigger={activeTrigger as "hover" | "click" | "auto"}
                              sparkleCount={sparkleCount}
                              size={sparkleSize}
                              colors={colorOptions[colorScheme as keyof typeof colorOptions]}
                              className="inline-block"
                            >
                              <Card className="w-full">
                                <CardContent className="pt-6">
                                  <div className="flex items-center justify-center h-24">
                                    <p className="text-center text-gray-500">Card with sparkle effect</p>
                                  </div>
                                </CardContent>
                              </Card>
                            </SparkleEffect>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Export the page component
export default SparkleDemo;