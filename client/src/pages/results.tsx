import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DigitalFootprintResponse } from "@shared/schema";
import { PAGE_TITLES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import ResultsHeader from "@/components/results/results-header";
import ResultsTabs from "@/components/results/results-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import usePlatformData from "@/hooks/use-platform-data";

export default function Results() {
  const { data, isLoading, error } = usePlatformData();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Create a direct link to navigate to the timeline tab
  useEffect(() => {
    if (data && !isLoading) {
      toast({
        title: "Interactive Timeline Available",
        description: "Click on the 'Interactive Timeline' tab to explore the animated timeline view",
      });
    }
  }, [data, isLoading, toast]);

  // Handle export action
  const handleExport = () => {
    toast({
      title: "Export",
      description: "Export functionality coming soon!",
    });
  };

  // Handle share action
  const handleShare = () => {
    toast({
      title: "Share",
      description: "Share functionality coming soon!",
    });
  };

  // Handle print action
  const handlePrint = () => {
    window.print();
    toast({
      title: "Print",
      description: "Preparing document for printing...",
    });
  };

  // Show error toast if there's an error loading data
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to load results. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <div className="max-w-4xl mx-auto fade-in">
      <ResultsHeader
        username={data?.username || "User"}
        platformCount={data?.platforms.length || 0}
        onExport={handleExport}
        onShare={handleShare}
        onPrint={handlePrint}
      />

      {error ? (
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px]">
            <div className="text-center">
              <span className="material-icons text-4xl text-red-500 mb-4">error</span>
              <h2 className="text-xl font-semibold mb-2">Error Loading Results</h2>
              <p className="text-gray-600 mb-6">
                {error.message || "We encountered an issue while loading the results."}
              </p>
              <Button onClick={() => navigate("/search")}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <ResultsTabs data={data} isLoading={isLoading} />
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Ready to clean your digital footprint?</h3>
                <p className="text-gray-600 mt-1">
                  Our premium service can help you remove unwanted content and secure your online presence.
                </p>
              </div>
              <Button 
                className="mt-4 md:mt-0 px-6 py-3 bg-[#10b981] hover:bg-[#0d9488]"
                onClick={() => navigate("/pricing")}
              >
                Explore Clean-up Options
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
