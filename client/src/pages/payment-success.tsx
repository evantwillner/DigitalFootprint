import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PaymentSuccess() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    // Show success toast on mount
    toast({
      title: "Payment Successful",
      description: "Thank you for your purchase!",
    });
  }, [toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Thank you for your purchase. Your payment has been processed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium">What's Next?</h3>
            <p className="text-sm text-muted-foreground mt-2">
              You can now access all the premium features of our Digital Footprint Analyzer.
              Start exploring your digital footprint across all supported platforms and take
              control of your online presence.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={() => navigate("/search")} 
            className="w-full"
          >
            Start Analyzing
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