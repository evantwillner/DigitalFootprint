import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout/layout";
import Home from "@/pages/home";
import Search from "@/pages/search";
import Results from "@/pages/results";
import Pricing from "@/pages/pricing";
import Deletion from "@/pages/deletion";
import DeletionManagePage from "@/pages/deletion-manage";
import Checkout from "@/pages/checkout";
import Subscribe from "@/pages/subscribe";
import PaymentSuccess from "@/pages/payment-success";
import SubscriptionSuccess from "@/pages/subscription-success";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import AuthPage from "@/pages/auth-page";
import { PageTransition, RouteChangeIndicator } from "@/components/ui/page-transition";
import { FullscreenLoader } from "@/components/ui/fullscreen-loader";
import { useState, useEffect } from "react";

// Initial app loading animation
function AppLoader() {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Show initial loading screen briefly
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  return <FullscreenLoader isLoading={isLoading} message="Preparing your digital footprint tools..." />;
}

function Router() {
  return (
    <PageTransition transition="reveal">
      <Switch>
        <ProtectedRoute path="/" component={Home} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/search" component={Search} />
        <Route path="/results" component={Results} />
        <Route path="/pricing" component={Pricing} />
        <ProtectedRoute path="/deletion" component={Deletion} />
        <ProtectedRoute path="/deletion-manage" component={DeletionManagePage} />
        <ProtectedRoute path="/checkout" component={Checkout} />
        <ProtectedRoute path="/subscribe" component={Subscribe} />
        <ProtectedRoute path="/payment-success" component={PaymentSuccess} />
        <ProtectedRoute path="/subscription-success" component={SubscriptionSuccess} />
        <Route component={NotFound} />
      </Switch>
    </PageTransition>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppLoader />
        <RouteChangeIndicator />
        <Layout>
          <Router />
        </Layout>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
