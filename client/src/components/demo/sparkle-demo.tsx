import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SparkleEffect, SparkleWrapper, NewInsight } from "@/components/ui/sparkle";
import { Badge } from "@/components/ui/badge";

export const SparkleDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState("basic");
  
  return (
    <Card className="w-full max-w-4xl mx-auto mb-8 border shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            <SparkleWrapper color="purple" size="lg">
              Sparkle Effects Demo
            </SparkleWrapper>
          </CardTitle>
          <Badge variant="outline" className="px-2 py-1">
            Interactive Demo
          </Badge>
        </div>
        <CardDescription>
          Explore various sparkle effects to highlight new insights and important discoveries
        </CardDescription>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mx-4">
          <TabsTrigger value="basic">Basic Examples</TabsTrigger>
          <TabsTrigger value="insights">Insight Highlights</TabsTrigger>
          <TabsTrigger value="customization">Customization</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="p-4 flex flex-col items-center justify-center">
              <h3 className="mb-2 text-sm font-medium">Hover Effect</h3>
              <SparkleEffect trigger="hover" className="h-24 w-24 flex items-center justify-center">
                <div className="text-center cursor-pointer">
                  Hover Me
                </div>
              </SparkleEffect>
            </Card>
            
            <Card className="p-4 flex flex-col items-center justify-center">
              <h3 className="mb-2 text-sm font-medium">Click Effect</h3>
              <SparkleEffect trigger="click" className="h-24 w-24 flex items-center justify-center">
                <div className="text-center cursor-pointer">
                  Click Me
                </div>
              </SparkleEffect>
            </Card>
            
            <Card className="p-4 flex flex-col items-center justify-center">
              <h3 className="mb-2 text-sm font-medium">Auto Effect</h3>
              <SparkleEffect trigger="auto" interval={2500} className="h-24 w-24 flex items-center justify-center">
                <div className="text-center">
                  Auto Sparkle
                </div>
              </SparkleEffect>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="insights" className="px-6 py-4">
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Highlighting New Insights</h3>
              
              <div className="mb-4">
                <p className="mb-2">Regular text with <NewInsight>important insight</NewInsight> highlighted within paragraph.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-2">Privacy Analysis</h4>
                  <p className="text-sm mb-3">User profile shows minimal activity with few public posts.</p>
                  <NewInsight color="blue" size="sm" insight="Security risk: Low">
                    <div className="flex items-center">
                      <span className="text-blue-500 font-medium">Security risk: Low</span>
                    </div>
                  </NewInsight>
                </Card>
                
                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-2">Sentiment Analysis</h4>
                  <p className="text-sm mb-3">Overall sentiment from recent comments and posts:</p>
                  <NewInsight color="green" size="sm" insight="Mostly positive">
                    <div className="flex items-center">
                      <span className="text-green-500 font-medium">Mostly positive</span>
                    </div>
                  </NewInsight>
                </Card>
              </div>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Activity Patterns</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">Time Analysis</h4>
                  <p className="text-sm mb-2">User most active during:</p>
                  <ul className="text-sm space-y-2">
                    <li>Mornings (8-10 AM): 15%</li>
                    <li>Afternoons (1-3 PM): 25%</li>
                    <li>
                      <NewInsight color="purple" highlightText={false}>
                        <span className="font-medium">Evenings (8-11 PM): 60%</span>
                      </NewInsight>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Topic Interests</h4>
                  <p className="text-sm mb-2">Most frequent topics:</p>
                  <ul className="text-sm space-y-2">
                    <li>Technology: 30%</li>
                    <li>
                      <NewInsight color="gold" highlightText={false}>
                        <span className="font-medium">Gaming: 45%</span>
                      </NewInsight>
                    </li>
                    <li>Sports: 15%</li>
                    <li>Other: 10%</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="customization" className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-4">
              <h3 className="text-md font-medium mb-3">Color Variations</h3>
              <div className="grid grid-cols-3 gap-4">
                <SparkleEffect color="default" trigger="click" className="p-2 cursor-pointer">
                  <div className="h-16 w-16 bg-yellow-100 rounded-md flex items-center justify-center">
                    <span className="text-xs">Default</span>
                  </div>
                </SparkleEffect>
                
                <SparkleEffect color="gold" trigger="click" className="p-2 cursor-pointer">
                  <div className="h-16 w-16 bg-amber-100 rounded-md flex items-center justify-center">
                    <span className="text-xs">Gold</span>
                  </div>
                </SparkleEffect>
                
                <SparkleEffect color="purple" trigger="click" className="p-2 cursor-pointer">
                  <div className="h-16 w-16 bg-purple-100 rounded-md flex items-center justify-center">
                    <span className="text-xs">Purple</span>
                  </div>
                </SparkleEffect>
                
                <SparkleEffect color="blue" trigger="click" className="p-2 cursor-pointer">
                  <div className="h-16 w-16 bg-blue-100 rounded-md flex items-center justify-center">
                    <span className="text-xs">Blue</span>
                  </div>
                </SparkleEffect>
                
                <SparkleEffect color="green" trigger="click" className="p-2 cursor-pointer">
                  <div className="h-16 w-16 bg-green-100 rounded-md flex items-center justify-center">
                    <span className="text-xs">Green</span>
                  </div>
                </SparkleEffect>
                
                <SparkleEffect color="red" trigger="click" className="p-2 cursor-pointer">
                  <div className="h-16 w-16 bg-red-100 rounded-md flex items-center justify-center">
                    <span className="text-xs">Red</span>
                  </div>
                </SparkleEffect>
              </div>
            </Card>
            
            <Card className="p-4">
              <h3 className="text-md font-medium mb-3">Size Variations</h3>
              <div className="flex flex-wrap items-end justify-center gap-4">
                <SparkleEffect size="sm" trigger="click" className="cursor-pointer">
                  <div className="flex items-center justify-center">
                    <span className="text-xs">Small</span>
                  </div>
                </SparkleEffect>
                
                <SparkleEffect size="default" trigger="click" className="cursor-pointer">
                  <div className="flex items-center justify-center">
                    <span className="text-xs">Default</span>
                  </div>
                </SparkleEffect>
                
                <SparkleEffect size="lg" trigger="click" className="cursor-pointer">
                  <div className="flex items-center justify-center">
                    <span className="text-xs">Large</span>
                  </div>
                </SparkleEffect>
                
                <SparkleEffect size="xl" trigger="click" className="cursor-pointer">
                  <div className="flex items-center justify-center">
                    <span className="text-xs">X-Large</span>
                  </div>
                </SparkleEffect>
              </div>
            </Card>
          </div>
          
          <Card className="p-4 mt-6">
            <h3 className="text-md font-medium mb-3">Practical Examples</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Button variant="outline" className="relative">
                  <span>Regular Button</span>
                </Button>
                
                <Button className="relative">
                  <SparkleWrapper size="sm" color="gold" trigger="hover">
                    <span>Sparkle on Hover</span>
                  </SparkleWrapper>
                </Button>
                
                <Button variant="destructive" className="relative">
                  <SparkleWrapper size="sm" color="red" trigger="click">
                    <span>Sparkle on Click</span>
                  </SparkleWrapper>
                </Button>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Regular Badge</Badge>
                <Badge>
                  <SparkleWrapper size="sm" color="blue" trigger="hover">
                    Standard Badge
                  </SparkleWrapper>
                </Badge>
                <Badge variant="secondary">
                  <SparkleWrapper size="sm" color="purple" trigger="hover">
                    Secondary Badge
                  </SparkleWrapper>
                </Badge>
                <Badge variant="destructive">
                  <SparkleWrapper size="sm" color="red" trigger="hover">
                    Alert Badge
                  </SparkleWrapper>
                </Badge>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
      
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          Use <code className="text-xs bg-muted px-1 py-0.5 rounded">SparkleEffect</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">SparkleWrapper</code> or <code className="text-xs bg-muted px-1 py-0.5 rounded">NewInsight</code> components
        </p>
        <Button size="sm" variant="outline" onClick={() => setActiveTab("basic")}>
          Reset Demo
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SparkleDemo;