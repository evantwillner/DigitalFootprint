import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabContentProps } from "@/lib/types";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";
import { RedditRecommendations } from "@/components/visualization/RedditRecommendations";
import { SparkleEffect } from "@/components/ui/sparkle-effect";
import { PLATFORM_CONFIG } from "@/lib/platform-icons";

export default function RecommendationsTab({ data, isLoading }: TabContentProps) {
  const [, setLocation] = useLocation();
  
  // Create a platform data map for easier access
  const platformDataMap = new Map();
  
  // Populate the map with platform-specific data if data exists
  if (data?.platformData) {
    for (const platform of data.platformData) {
      platformDataMap.set(platform.platformId, platform);
    }
  }
  
  // Get available platforms (for extensibility)
  const availablePlatforms = data?.platformData?.map(p => p.platformId) || [];
  
  // Check for specific platforms
  const redditData = platformDataMap.get('reddit');
  
  // Sample privacy recommendations
  const privacyRecommendations = [
    {
      title: "Update Privacy Settings",
      description: "Review and adjust privacy settings on all platforms to limit public visibility of your posts and personal information.",
      platform: "all",
      severity: "high",
    },
    {
      title: "Remove Location Data",
      description: "Remove location information from your profiles and disable geotagging on future posts.",
      platform: "instagram",
      severity: "medium",
    },
    {
      title: "Audit Third-Party App Access",
      description: "Review and revoke access for unnecessary third-party applications connected to your social accounts.",
      platform: "all",
      severity: "high",
    },
    {
      title: "Clean Up Old Posts",
      description: "Delete or archive old posts that contain personal information or no longer represent you.",
      platform: "facebook",
      severity: "medium",
    },
    {
      title: "Update Profile Information",
      description: "Review your public profile information and remove unnecessary personal details.",
      platform: "linkedin",
      severity: "medium",
    },
    {
      title: "Enable Two-Factor Authentication",
      description: "Add an extra layer of security to your accounts by enabling two-factor authentication.",
      platform: "all",
      severity: "high",
    },
  ];
  
  // Sample content removal recommendations
  const contentRemovalRecommendations = [
    {
      content: "Posts containing location information",
      reason: "Reveals your regular locations and potential home/work areas",
      platform: "instagram",
      count: 8,
    },
    {
      content: "Professional details in public comments",
      reason: "Exposes workplace information and job responsibilities",
      platform: "reddit",
      count: 12,
    },
    {
      content: "Personal opinions on controversial topics",
      reason: "Could impact professional image or be taken out of context",
      platform: "twitter",
      count: 5,
    },
    {
      content: "Outdated contact information",
      reason: "Could lead to unwanted communication or security risks",
      platform: "facebook",
      count: 3,
    },
  ];

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-full mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </div>
        <Skeleton className="h-64 mb-8" />
        <Skeleton className="h-32" />
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

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <SparkleEffect isActive colors={["#4F46E5", "#8B5CF6", "#EC4899"]}>
            <h3 className="text-xl font-semibold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
              Privacy Recommendations
            </h3>
          </SparkleEffect>
        </div>
        <p className="text-gray-600 mb-6">
          Based on our analysis of {data.username}'s digital footprint, we recommend the following actions to enhance online privacy and security.
        </p>
      </div>
      
      {/* Platform-specific recommendations */}
      {redditData && (
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="mr-2">
              {PLATFORM_CONFIG.reddit.icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-800">
              Reddit-Specific Recommendations
            </h3>
          </div>
          
          <RedditRecommendations 
            platformData={redditData}
            isLoading={isLoading}
          />
          
          <Separator className="my-8" />
        </div>
      )}
      
      {/* Cross-platform recommendations */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-3">Cross-Platform Privacy Actions</h3>
        <div className="space-y-4">
          {privacyRecommendations.map((recommendation, index) => (
            <Card key={index} className={recommendation.severity === "high" ? "border-red-200" : ""}>
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <SparkleEffect isActive={recommendation.severity === "high"} colors={["#4F46E5", "#6366F1"]} size={10}>
                        <h4 className="font-medium">{recommendation.title}</h4>
                      </SparkleEffect>
                      <Badge 
                        className={`ml-2 ${getSeverityColor(recommendation.severity)}`}
                      >
                        {recommendation.severity}
                      </Badge>
                      <Badge variant="outline" className={`ml-2 ${
                        recommendation.platform === 'reddit' 
                          ? 'bg-orange-50 text-orange-800 border-orange-200' 
                          : recommendation.platform === 'twitter'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : recommendation.platform === 'instagram'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : recommendation.platform === 'facebook'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : ''
                      }`}>
                        {recommendation.platform}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {recommendation.description}
                    </p>
                  </div>
                  <div className="mt-3 md:mt-0 md:ml-4">
                    <Button variant="outline" size="sm">
                      Learn How
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <SparkleEffect isActive colors={["#F43F5E", "#EC4899"]}>
            <h3 className="text-lg font-medium">Cross-Platform Content Removal</h3>
          </SparkleEffect>
          <Badge variant="secondary">Premium Feature</Badge>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {contentRemovalRecommendations.filter(rec => rec.platform !== 'reddit').map((recommendation, index) => (
                <div key={index} className="pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div>
                      <div className="flex items-center mb-1">
                        <h4 className="font-medium">{recommendation.content}</h4>
                        <Badge variant="outline" className={`ml-2 ${
                          recommendation.platform === 'reddit' 
                            ? 'bg-orange-50 text-orange-800 border-orange-200' 
                            : recommendation.platform === 'twitter'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : recommendation.platform === 'instagram'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : recommendation.platform === 'facebook'
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  : ''
                        }`}>
                          {recommendation.platform}
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8 relative overflow-hidden">
        <div className="flex items-center mb-4">
          <SparkleEffect isActive colors={["#4F46E5", "#8B5CF6", "#EC4899"]}>
            <h3 className="text-xl font-semibold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
              Privacy Protection Strategy
            </h3>
          </SparkleEffect>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-50/70 rounded-lg p-4 border border-blue-100">
            <h4 className="font-medium text-gray-900 mb-2">Regular Maintenance</h4>
            <SparkleEffect isActive={true} sparkleCount={8} colors={["#4F46E5", "#6366F1"]} size={10}>
              <p className="text-gray-700 font-medium">Review privacy settings monthly</p>
            </SparkleEffect>
            <p className="text-gray-600 mt-2 text-sm">Keep all platform privacy settings updated to the strictest levels.</p>
          </div>
          
          <div className="bg-blue-50/70 rounded-lg p-4 border border-blue-100">
            <h4 className="font-medium text-gray-900 mb-2">Identity Protection</h4>
            <p className="text-gray-700">Use pseudonyms for personal accounts</p>
            <p className="text-gray-600 mt-2 text-sm">Separate professional and personal identities across platforms.</p>
          </div>
          
          <div className="bg-blue-50/70 rounded-lg p-4 border border-blue-100">
            <h4 className="font-medium text-gray-900 mb-2">Monitoring</h4>
            <SparkleEffect isActive={true} sparkleCount={6} colors={["#10B981", "#059669"]} size={10}>
              <p className="text-gray-700 font-medium">Set up Google Alerts for your name</p>
            </SparkleEffect>
            <p className="text-gray-600 mt-2 text-sm">Stay informed when new content appears online about you.</p>
          </div>
          
          <div className="bg-blue-50/70 rounded-lg p-4 border border-blue-100">
            <h4 className="font-medium text-gray-900 mb-2">Security</h4>
            <p className="text-gray-700">Enable two-factor authentication</p>
            <p className="text-gray-600 mt-2 text-sm">Use a password manager and unique passwords for all accounts.</p>
          </div>
        </div>
        
        <div className="text-center">
          <Link to="/pricing">
            <Button>Get Professional Privacy Assistance</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
