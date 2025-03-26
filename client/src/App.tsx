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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={Search} />
      <Route path="/results" component={Results} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/deletion" component={Deletion} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Router />
      </Layout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
