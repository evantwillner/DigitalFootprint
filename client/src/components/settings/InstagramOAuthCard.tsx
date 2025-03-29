import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define interface for Instagram status API response
interface InstagramStatusResponse {
  configured: boolean;
  hasValidToken: boolean;
  needsAuthorization: boolean;
  authorizeUrl: string;
}

export default function InstagramOAuthCard() {
  const { toast } = useToast();
  
  // Query the Instagram OAuth status
  const { data, isLoading, isError, error, refetch } = useQuery<InstagramStatusResponse>({
    queryKey: ['/api/instagram/status'],
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
  
  const handleAuthorize = () => {
    if (data?.authorizeUrl) {
      window.location.href = data.authorizeUrl;
    } else {
      toast({
        title: "Cannot authorize Instagram",
        description: "The authorization URL is not available. Please try again later.",
        variant: "destructive",
      });
    }
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Instagram className="mr-2 h-5 w-5 text-pink-500" />
            Instagram Integration
          </CardTitle>
          <CardDescription>Connect your Instagram account to enhance data analysis</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  // Render error state
  if (isError) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Instagram className="mr-2 h-5 w-5 text-pink-500" />
            Instagram Integration
          </CardTitle>
          <CardDescription>Connect your Instagram account to enhance data analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">
              Error checking Instagram status: {(error as Error)?.message || "Unknown error"}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Instagram className="mr-2 h-5 w-5 text-pink-500" />
            Instagram Integration
          </CardTitle>
          {data?.configured && (
            <Badge variant={data?.hasValidToken ? "success" : "destructive"}>
              {data?.hasValidToken ? "Connected" : "Not Connected"}
            </Badge>
          )}
        </div>
        <CardDescription>
          Connect your Instagram account to enhance data analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!data?.configured ? (
          <div className="rounded-md bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              Instagram API is not properly configured. Please contact the administrator.
            </p>
          </div>
        ) : data?.hasValidToken ? (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">
              Your Instagram account is connected. You can now analyze Instagram data.
            </p>
          </div>
        ) : (
          <div className="rounded-md bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              Connect your Instagram account to enable enhanced Instagram data analysis.
              This will help you get more accurate insights into your digital footprint.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Status
        </Button>
        
        {data?.configured && !data?.hasValidToken && (
          <Button onClick={handleAuthorize}>
            <Instagram className="mr-2 h-4 w-4" />
            Connect Instagram
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}