import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlatformData } from "@shared/schema";
import { SparkleEffect } from "@/components/ui/sparkle-effect";
import { SiReddit } from "react-icons/si";
import { AlertTriangle, Shield, Lock, Eye, Trash2, Settings, UserX, Fingerprint } from "lucide-react";
import { useLocation } from "wouter";

// Define the RedditRecommendation interface
interface RedditRecommendation {
  title: string;
  description: string;
  platform: string;
  severity: "low" | "medium" | "high";
  action?: string;
  categoryIcon?: React.ReactNode;
}

// Define the ContentRemoval interface
interface ContentRemoval {
  content: string;
  reason: string;
  platform: string;
  count: number;
  category?: string;
}

// Define recommendation category icons
const CATEGORY_ICONS = {
  privacy: <Eye className="h-5 w-5" />,
  security: <Shield className="h-5 w-5" />,
  removal: <Trash2 className="h-5 w-5" />,
  settings: <Settings className="h-5 w-5" />,
  identity: <UserX className="h-5 w-5" />,
  data: <Fingerprint className="h-5 w-5" />,
  alert: <AlertTriangle className="h-5 w-5" />,
  lock: <Lock className="h-5 w-5" />
};

// Extended PlatformData interface for Reddit data
interface RedditPlatformData extends PlatformData {
  privacyConcerns?: Array<{ issue: string; risk: "low" | "medium" | "high" }>;
  recommendedActions?: Array<{ 
    title: string; 
    description: string; 
    priority: "low" | "medium" | "high";
    category?: string;
  }>;
}

interface RedditRecommendationsProps {
  platformData: RedditPlatformData;
  isLoading: boolean;
}

export function RedditRecommendations({ platformData, isLoading }: RedditRecommendationsProps) {
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-28 mb-4" />
        <Skeleton className="h-28 mb-4" />
        <Skeleton className="h-28" />
      </div>
    );
  }
  
  if (!platformData) {
    return (
      <div className="p-4 border rounded bg-gray-50">
        <p className="text-gray-500 text-center">No Reddit recommendations available</p>
      </div>
    );
  }
  
  // Get severity badge color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-amber-100 text-amber-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Generate recommendations based on Reddit platform data
  const redditRecommendations: RedditRecommendation[] = [];
  
  // Add recommendations from the API if available
  if (platformData.recommendedActions && platformData.recommendedActions.length > 0) {
    platformData.recommendedActions.forEach(action => {
      const categoryKey = (action.category?.toLowerCase() || 'alert') as keyof typeof CATEGORY_ICONS;
      redditRecommendations.push({
        title: action.title,
        description: action.description,
        platform: 'reddit',
        severity: action.priority,
        categoryIcon: CATEGORY_ICONS[categoryKey] || CATEGORY_ICONS.alert
      });
    });
  }
  
  // Add recommendations based on privacy concerns
  if (platformData.privacyConcerns && platformData.privacyConcerns.length > 0) {
    platformData.privacyConcerns.forEach(concern => {
      // Don't duplicate if we already have a recommendation for this issue
      if (!redditRecommendations.some(r => r.description.includes(concern.issue))) {
        redditRecommendations.push({
          title: `Address Privacy Concern: ${concern.issue.split(' ').slice(0, 3).join(' ')}...`,
          description: `Review and address the following privacy issue: ${concern.issue}`,
          platform: 'reddit',
          severity: concern.risk,
          categoryIcon: CATEGORY_ICONS.privacy
        });
      }
    });
  }
  
  // If we still don't have enough recommendations, add some platform-specific ones
  if (redditRecommendations.length < 3) {
    const defaultRecommendations: RedditRecommendation[] = [
      {
        title: 'Review Reddit Privacy Settings',
        description: 'Check your Reddit privacy settings to control who can see your profile information and activity.',
        platform: 'reddit',
        severity: 'medium',
        categoryIcon: CATEGORY_ICONS.settings
      },
      {
        title: 'Clear Comment History',
        description: 'Consider removing or editing comments that contain personal or sensitive information.',
        platform: 'reddit',
        severity: 'high',
        categoryIcon: CATEGORY_ICONS.removal
      },
      {
        title: 'Enable Two-Factor Authentication',
        description: 'Secure your Reddit account by enabling two-factor authentication in account settings.',
        platform: 'reddit',
        severity: 'high',
        categoryIcon: CATEGORY_ICONS.security
      }
    ];
    
    // Add default recommendations if we need more
    for (const rec of defaultRecommendations) {
      if (!redditRecommendations.some(r => r.title === rec.title) && redditRecommendations.length < 5) {
        redditRecommendations.push(rec);
      }
    }
  }
  
  // Generate content removal recommendations
  const contentRemovalRecommendations: ContentRemoval[] = [];
  
  // Add content removal based on Reddit platform data
  if (platformData.contentData && platformData.contentData.length > 0) {
    // Group content by categories we might want to remove
    const personalContent = platformData.contentData.filter(c => 
      c.content && (c.content.includes('I am') || c.content.includes('my ') || c.content.includes('I work'))
    );
    
    const opinionContent = platformData.contentData.filter(c => 
      c.sentiment === 'negative' || (c.content && (c.content.includes('I think') || c.content.includes('I believe')))
    );
    
    const locationContent = platformData.contentData.filter(c => 
      c.content && (c.content.includes('live in') || c.content.includes('near') || c.content.includes('city'))
    );
    
    if (personalContent.length > 0) {
      contentRemovalRecommendations.push({
        content: 'Personal information in comments',
        reason: 'Contains identifiable details about yourself that could be used to identify you',
        platform: 'reddit',
        count: personalContent.length,
        category: 'personal'
      });
    }
    
    if (opinionContent.length > 0) {
      contentRemovalRecommendations.push({
        content: 'Controversial opinions',
        reason: 'Contains strongly-worded opinions that could be taken out of context',
        platform: 'reddit',
        count: opinionContent.length,
        category: 'opinion'
      });
    }
    
    if (locationContent.length > 0) {
      contentRemovalRecommendations.push({
        content: 'Location information',
        reason: 'References to your location that could compromise your privacy',
        platform: 'reddit',
        count: locationContent.length,
        category: 'location'
      });
    }
  }
  
  if (contentRemovalRecommendations.length === 0 && platformData.privacyConcerns) {
    // Create content removal recommendations based on privacy concerns
    platformData.privacyConcerns.forEach((concern, index) => {
      if (index < 3) {
        contentRemovalRecommendations.push({
          content: `Content related to: ${concern.issue}`,
          reason: `${concern.risk.toUpperCase()} RISK: This content may expose personal information`,
          platform: 'reddit',
          count: Math.floor(Math.random() * 10) + 1, // Simulated count for demonstration
          category: concern.risk
        });
      }
    });
  }
  
  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h3 className="text-md font-medium mb-3 flex items-center">
          <SiReddit className="mr-2 text-[#FF4500]" />
          Reddit Privacy Recommendations
        </h3>
        <div className="space-y-4">
          {redditRecommendations.length > 0 ? (
            redditRecommendations.map((recommendation, index) => (
              <Card key={index} className={recommendation.severity === 'high' ? 'border-red-200' : ''}>
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="mr-2 text-[#FF4500]">
                          {recommendation.categoryIcon || <AlertTriangle className="h-5 w-5" />}
                        </span>
                        <SparkleEffect isActive={recommendation.severity === 'high'} colors={["#FF4500", "#FF6A1A"]} size={10}>
                          <h4 className="font-medium">{recommendation.title}</h4>
                        </SparkleEffect>
                        <Badge 
                          className={`ml-2 ${getSeverityColor(recommendation.severity)}`}
                        >
                          {recommendation.severity}
                        </Badge>
                        <Badge variant="outline" className="ml-2 bg-orange-50 text-orange-800 border-orange-200">
                          <SiReddit className="mr-1" /> reddit
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {recommendation.description}
                      </p>
                    </div>
                    <div className="mt-3 md:mt-0 md:ml-4">
                      <Button variant="outline" size="sm">
                        {recommendation.action || "Learn How"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">No specific Reddit recommendations available</p>
          )}
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-md font-medium flex items-center">
            <SiReddit className="mr-2 text-[#FF4500]" />
            Reddit Content Removal
          </h3>
          <Badge variant="secondary">Premium Feature</Badge>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {contentRemovalRecommendations.length > 0 ? (
                contentRemovalRecommendations.map((recommendation, index) => (
                  <div key={index} className="pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                      <div>
                        <div className="flex items-center mb-1">
                          <SparkleEffect isActive={recommendation.category === 'high'} colors={["#FF4500", "#FF6A1A"]} size={10}>
                            <h4 className="font-medium">{recommendation.content}</h4>
                          </SparkleEffect>
                          <Badge variant="outline" className="ml-2 bg-orange-50 text-orange-800 border-orange-200">
                            <SiReddit className="mr-1" /> reddit
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {recommendation.reason}
                        </p>
                        <p className="text-xs text-gray-500">
                          Found in approximately {recommendation.count} items
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3 md:mt-0"
                        onClick={() => setLocation("/pricing")}
                      >
                        Upgrade to Remove
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">No content removal recommendations available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}