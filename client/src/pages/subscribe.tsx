import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface SubscribeFormProps {
  planName: string;
}

const SubscribeForm = ({ planName }: SubscribeFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/subscription-success",
        },
      });

      if (error) {
        toast({
          title: "Subscription Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Payment success is handled by return_url redirect
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <PaymentElement />
      </div>
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Subscribe Now"
        )}
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  // Get plan name from URL search params
  const [planName, setPlanName] = useState("Pro Cleanup");
  
  useEffect(() => {
    // Extract plan name from URL if available
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get('plan');
    if (planParam) {
      setPlanName(planParam);
    }
  }, []);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to continue with subscription",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Create or get subscription as soon as the page loads
    const getOrCreateSubscription = async () => {
      try {
        setIsLoading(true);
        const res = await apiRequest("POST", "/api/get-or-create-subscription", { planName });
        const data = await res.json();
        
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else if (data.status === 'active') {
          // User already has an active subscription
          toast({
            title: "Active Subscription",
            description: "You already have an active subscription",
          });
          navigate("/");
        } else {
          // Something went wrong
          toast({
            title: "Error",
            description: "Unable to set up subscription. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error setting up subscription:", error);
        toast({
          title: "Error",
          description: "There was a problem setting up your subscription. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    getOrCreateSubscription();
  }, [user, navigate, toast, planName]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Error</CardTitle>
            <CardDescription>
              Unable to initialize subscription. Please try again later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/pricing")}>
              Back to Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Set up Stripe Elements appearance
  const appearance: any = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#0284c7',
    },
  };

  // Make SURE to wrap the form in <Elements> which provides the Stripe context
  return (
    <div className="max-w-md mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>Complete Subscription</CardTitle>
          <CardDescription>
            {planName} - Monthly Subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Elements 
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance,
            }}
          >
            <SubscribeForm planName={planName} />
          </Elements>
        </CardContent>
      </Card>
    </div>
  );
}