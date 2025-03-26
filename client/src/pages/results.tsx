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
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 py-6 px-4 rounded-lg mb-6">
        <ResultsHeader
          username={data?.username || "User"}
          platformCount={data?.platforms.length || 0}
          onExport={handleExport}
          onShare={handleShare}
          onPrint={handlePrint}
        />
      </div>

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
          
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-8 mb-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
                  Ready to clean your digital footprint?
                </h3>
                <p className="text-gray-700 mt-2">
                  Our premium service can help you remove unwanted content and secure your online presence.
                </p>
                <div className="flex gap-3 mt-3">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm">Privacy protection</span>
                  </div>
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm">Content removal</span>
                  </div>
                </div>
              </div>
              <Button 
                className="mt-6 md:mt-0 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
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
