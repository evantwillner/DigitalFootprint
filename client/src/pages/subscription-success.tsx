import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SubscriptionSuccess() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    // Show success toast on mount
    toast({
      title: "Subscription Activated",
      description: "Your subscription has been successfully activated!",
    });
  }, [toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Subscription Activated!</CardTitle>
          <CardDescription>
            Thank you for subscribing to our premium service. Your subscription is now active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium">Your Premium Benefits</h3>
            <p className="text-sm text-muted-foreground mt-2">
              With your subscription, you now have access to:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 list-disc pl-5 space-y-1">
              <li>Full digital footprint analysis across all platforms</li>
              <li>Content deletion assistance</li>
              <li>Regular monitoring and alerts</li>
              <li>Priority customer support</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={() => navigate("/deletion")} 
            className="w-full"
          >
            Start Content Deletion
          </Button>
          <Button 
            onClick={() => navigate("/")} 
            variant="outline" 
            className="w-full"
          >
            Return to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}