import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SparkleEffect } from '@/components/ui/sparkle-effect';
import { DigitalFootprintResponse } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Sparkles, Zap } from 'lucide-react';

interface Insight {
  id: string;
  title: string;
  description: string;
  type: 'privacy' | 'engagement' | 'sentiment' | 'activity' | 'general';
  importance: 'low' | 'medium' | 'high';
  isNew: boolean;
}

// Function to generate insights based on actual data
const generateInsightsFromData = (data: DigitalFootprintResponse): Insight[] => {
  const insights: Insight[] = [];
  
  // Generate unique ID for each insight
  const generateId = () => Math.random().toString(36).substring(2, 9);
  
  // Add insights based on summary exposure score
  if (data.summary.exposureScore > 60) {
    insights.push({
      id: generateId(),
      title: 'Privacy Risk Detected',
      description: `Your exposure score is ${data.summary.exposureScore}/100, which indicates potential privacy concerns that you may want to address.`,
      type: 'privacy',
      importance: 'high',
      isNew: true
    });
  }
  
  // Check if there are high-risk privacy concerns
  const highRiskConcerns = data.platformData
    .flatMap(platform => platform.analysisResults?.privacyConcerns || [])
    .filter(concern => concern.severity === 'high');
    
  if (highRiskConcerns.length > 0) {
    insights.push({
      id: generateId(),
      title: 'Critical Privacy Concerns',
      description: `We've detected ${highRiskConcerns.length} high-risk privacy issues across your platforms.`,
      type: 'privacy',
      importance: 'high',
      isNew: true
    });
  }
  
  // Add insights based on sentiment analysis
  const redditData = data.platformData.find(p => p.platformId === 'reddit');
  if (redditData?.analysisResults?.sentimentBreakdown) {
    const { positive, negative } = redditData.analysisResults.sentimentBreakdown;
    
    if (negative > 0.4) {
      insights.push({
        id: generateId(),
        title: 'Negative Content Prevalence',
        description: `Your content has a higher than average negative sentiment (${(negative * 100).toFixed(0)}%). This may affect how others perceive your online presence.`,
        type: 'sentiment',
        importance: 'medium',
        isNew: true
      });
    }
    
    if (positive > 0.6) {
      insights.push({
        id: generateId(),
        title: 'Positive Online Presence',
        description: `Your content is predominantly positive (${(positive * 100).toFixed(0)}%), which can enhance your reputation online.`,
        type: 'sentiment',
        importance: 'medium',
        isNew: true
      });
    }
  }
  
  // Add insights based on activity patterns from platforms
  const redditActivityData = data.platformData
    .find(platform => platform.platformId === 'reddit')?.analysisResults?.activityTimeline;
    
  if (redditActivityData && redditActivityData.length > 0) {
    // If we have Reddit activity data, use that for insights
    const totalActivity = redditActivityData.reduce((sum: number, item) => sum + item.count, 0);
    const monthCount = redditActivityData.length;
    const avgActivityPerMonth = totalActivity / monthCount;
    
    if (avgActivityPerMonth > 20) {
      insights.push({
        id: generateId(),
        title: 'High Activity Level',
        description: `You're highly active online with an average of ${Math.round(avgActivityPerMonth)} activities per month, which increases your digital footprint size.`,
        type: 'activity',
        importance: 'medium',
        isNew: true
      });
    }
    
    // Check for sudden activity spikes
    if (redditActivityData.length >= 2) {
      const lastMonth = redditActivityData[redditActivityData.length - 1];
      const previousMonth = redditActivityData[redditActivityData.length - 2];
      
      if (previousMonth.count > 0 && lastMonth.count > previousMonth.count * 1.5) {
        insights.push({
          id: generateId(),
          title: 'Activity Spike Detected',
          description: `Your activity increased by ${Math.round((lastMonth.count / previousMonth.count - 1) * 100)}% in the most recent period, which could attract more attention to your profile.`,
          type: 'activity',
          importance: 'low',
          isNew: true
        });
      }
    }
  }
  
  // Add general insights based on platform count
  const activePlatforms = data.platformData.length;
  if (activePlatforms > 2) {
    insights.push({
      id: generateId(),
      title: 'Cross-Platform Presence',
      description: `You're active on ${activePlatforms} different platforms, which creates a diverse digital footprint.`,
      type: 'general',
      importance: 'low',
      isNew: true
    });
  }
  
  // Check if there's personal information exposure
  const personalInfoRisk = data.platformData
    .flatMap(platform => platform.analysisResults?.dataCategories || [])
    .some(category => category.category.includes("personal") && category.severity !== 'low');
    
  if (personalInfoRisk) {
    insights.push({
      id: generateId(),
      title: 'Personal Information Exposure',
      description: "We've detected personal information in your public content that might be accessible to others.",
      type: 'privacy',
      importance: 'high',
      isNew: true
    });
  }
  
  // Return all generated insights, with a max of 5 to avoid overwhelming the user
  return insights.slice(0, 5);
};

interface NewInsightsProps {
  data: DigitalFootprintResponse;
}

const NewInsights: React.FC<NewInsightsProps> = ({ data }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [showAll, setShowAll] = useState(false);
  
  useEffect(() => {
    // Generate insights based on actual data
    const generatedInsights = generateInsightsFromData(data);
    setInsights(generatedInsights);
  }, [data]);
  
  const displayedInsights = showAll ? insights : insights.slice(0, 3);
  
  const getTypeIcon = (type: Insight['type']) => {
    switch (type) {
      case 'privacy':
        return <Lightbulb className="w-4 h-4" />;
      case 'sentiment':
        return <Sparkles className="w-4 h-4" />;
      case 'activity':
        return <Zap className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };
  
  const getImportanceColor = (importance: Insight['importance']) => {
    switch (importance) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };
  
  if (insights.length === 0) return null;
  
  return (
    <Card className="glass-card rounded-xl border-none shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 border-b border-gray-700">
        <h3 className="text-xl font-medium text-white flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-yellow-400" />
          New Insights Discovered
        </h3>
      </div>
      <CardContent className="p-6">
        <div className="space-y-4">
          {displayedInsights.map((insight) => (
            <div 
              key={insight.id} 
              className="p-4 bg-white/90 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-1 flex items-center">
                    <SparkleEffect isActive={insight.isNew} sparkleCount={3} className="mr-2">
                      {getTypeIcon(insight.type)}
                    </SparkleEffect>
                    {insight.title}
                  </h4>
                  <p className="text-sm text-gray-600">{insight.description}</p>
                </div>
                <Badge className={`${getImportanceColor(insight.importance)} px-2 py-1 text-xs uppercase`}>
                  {insight.importance}
                </Badge>
              </div>
            </div>
          ))}
          
          {insights.length > 3 && (
            <Button 
              variant="outline" 
              className="w-full mt-2 border-dashed"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : `Show ${insights.length - 3} More Insights`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NewInsights;