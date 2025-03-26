import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PlatformDeletionForm } from "@/components/deletion/platform-deletion-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { DeletionRequest } from "@shared/schema";
import { AlertCircle, Loader2, RefreshCcw, ShieldAlert } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageTransition } from "@/components/ui/page-transition";

export default function DeletionManagePage() {
  const [activeTab, setActiveTab] = useState("new-request");
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isLoadingAuth && !user) {
      setLocation("/auth");
    }
  }, [user, isLoadingAuth, setLocation]);
  
  // Fetch existing deletion requests
  const { data: deletionRequests, isLoading: isLoadingRequests, refetch } = useQuery({
    queryKey: ["/api/deletion-requests"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/deletion-requests");
      return res.json() as Promise<DeletionRequest[]>;
    },
    enabled: !!user,
  });
  
  // Handle loading state
  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Get status badge color based on status
  const getStatusBadgeVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case "pending": return "secondary";
      case "in_progress": return "default";
      case "completed": return "outline";
      case "failed": return "destructive";
      default: return "secondary";
    }
  };
  
  return (
    <PageTransition>
      <div className="container max-w-6xl py-10">
        <div className="flex flex-col items-start justify-between gap-4 mb-8 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight heading-gradient-vibrant">Manage Privacy & Deletion</h1>
            <p className="text-lg text-muted-foreground mt-1">
              Take control of your digital footprint by deleting unwanted content
            </p>
          </div>
          <Button 
            variant="outline"
            className="gap-2"
            onClick={() => refetch()}
            disabled={isLoadingRequests}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new-request">New Deletion Request</TabsTrigger>
            <TabsTrigger value="existing-requests">
              Existing Requests
              {deletionRequests && deletionRequests.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {deletionRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="new-request" className="space-y-6 pt-4">
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Important Information</AlertTitle>
              <AlertDescription>
                Our platform helps you remove your digital footprint from social media. Premium users 
                have access to direct API integration for faster removal. This feature requires valid 
                Twitter API credentials.
              </AlertDescription>
            </Alert>
            
            <PlatformDeletionForm />
          </TabsContent>
          
          <TabsContent value="existing-requests" className="pt-4">
            {isLoadingRequests ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !deletionRequests || deletionRequests.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <div className="flex justify-center mb-4">
                    <AlertCircle className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Deletion Requests</h3>
                  <p className="text-muted-foreground">
                    You haven't submitted any deletion requests yet.
                  </p>
                  <Button 
                    className="mt-6"
                    onClick={() => setActiveTab("new-request")}
                  >
                    Create a New Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {deletionRequests.map((request) => (
                  <Card key={request.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">
                            Deletion Request #{request.id}
                            <Badge 
                              variant={getStatusBadgeVariant(request.status)} 
                              className="ml-2"
                            >
                              {request.status.replace('_', ' ')}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            Requested on {new Date(request.timestamp).toLocaleDateString()}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-5">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">Platforms</h4>
                          <div className="flex flex-wrap gap-2">
                            {request.platforms.map((platform) => (
                              <Badge key={platform} variant="outline" className="capitalize">
                                {platform}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h4 className="text-sm font-medium mb-2">Progress</h4>
                          <div className="space-y-2">
                            <Progress 
                              value={
                                request.status === "completed" 
                                  ? 100 
                                  : request.status === "in_progress" 
                                    ? 50 
                                    : request.status === "pending" 
                                      ? 10 
                                      : 0
                              } 
                              className="h-2"
                            />
                            <p className="text-xs text-muted-foreground">
                              {request.status === "completed" 
                                ? "Your content has been deleted successfully." 
                                : request.status === "in_progress" 
                                  ? "Your deletion request is being processed." 
                                  : request.status === "pending" 
                                    ? "Your request is queued and waiting to be processed." 
                                    : "There was an issue processing your request."}
                            </p>
                          </div>
                        </div>
                        
                        {request.details && (
                          <>
                            <Separator />
                            <div>
                              <h4 className="text-sm font-medium mb-1">Details</h4>
                              <div className="bg-muted p-2 rounded-md text-xs font-mono overflow-auto max-h-32">
                                <pre>{JSON.stringify(request.details, null, 2)}</pre>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}