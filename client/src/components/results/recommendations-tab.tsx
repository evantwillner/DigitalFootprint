import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabContentProps } from "@/lib/types";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function RecommendationsTab({ data, isLoading }: TabContentProps) {
  const [, setLocation] = useLocation();
  
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
        <h3 className="text-lg font-medium mb-4">Privacy Recommendations</h3>
        <p className="text-gray-600 mb-6">
          Based on our analysis of {data.username}'s digital footprint, we recommend the following actions to enhance online privacy and security.
        </p>
      </div>
      
      <div className="mb-8">
        <h3 className="text-md font-medium mb-3">Recommended Privacy Actions</h3>
        <div className="space-y-4">
          {privacyRecommendations.map((recommendation, index) => (
            <Card key={index}>
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h4 className="font-medium">{recommendation.title}</h4>
                      <Badge 
                        className={`ml-2 ${getSeverityColor(recommendation.severity)}`}
                      >
                        {recommendation.severity}
                      </Badge>
                      <Badge variant="outline" className="ml-2">
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
          <h3 className="text-md font-medium">Recommended Content Removal</h3>
          <Badge variant="secondary">Premium Feature</Badge>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {contentRemovalRecommendations.map((recommendation, index) => (
                <div key={index} className="pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div>
                      <div className="flex items-center mb-1">
                        <h4 className="font-medium">{recommendation.content}</h4>
                        <Badge variant="outline" className="ml-2">
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
      
      <div className="bg-primary/5 border border-primary/20 p-6 rounded-lg mb-8">
        <h3 className="text-lg font-medium mb-3">Next Steps for Better Digital Privacy</h3>
        <p className="text-gray-600 mb-4">
          Follow these suggestions to maintain a cleaner digital footprint:
        </p>
        <ul className="space-y-2 mb-6">
          <li className="flex items-start">
            <span className="text-primary mr-2">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </span>
            <span>Regularly review and update privacy settings on all platforms</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-2">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </span>
            <span>Consider using pseudonyms for personal accounts not tied to your professional identity</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-2">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </span>
            <span>Set up Google Alerts for your name to monitor when new content appears online</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-2">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </span>
            <span>Use a password manager and enable two-factor authentication on all accounts</span>
          </li>
        </ul>
        <div className="text-center">
          <Link to="/pricing">
            <Button>Get Professional Help</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
