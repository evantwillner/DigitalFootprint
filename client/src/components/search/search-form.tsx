import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PlatformCard from "@/components/search/platform-card";
import { PLATFORM_CONFIG } from "@/lib/platform-icons";
import { AVAILABLE_PLATFORMS } from "@/lib/constants";
import { useState } from "react";
import { Platform } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";

// Form schema with validation rules
const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

type SearchFormValues = z.infer<typeof formSchema>;

export default function SearchForm() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["instagram"]);

  // Initialize the form
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  });

  // Toggle platform selection
  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev => {
      // If the platform is already selected, remove it
      if (prev.includes(platform)) {
        // Don't allow removing all platforms
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter(p => p !== platform);
      }
      // Otherwise, add it
      return [...prev, platform];
    });
  };

  // Handle search mutation
  const searchMutation = useMutation({
    mutationFn: async (data: { username: string, platforms: Platform[] }) => {
      const response = await apiRequest("POST", "/api/search", data);
      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      // Store search results in sessionStorage for use in results page
      console.log("Search successful, storing results:", data);
      sessionStorage.setItem("searchResults", JSON.stringify(data));
      navigate("/results");
    },
    onError: (error) => {
      toast({
        title: "Search failed",
        description: error.message || "There was an error processing your search. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: SearchFormValues) => {
    // Use the selected platforms from the platform cards
    const platforms = selectedPlatforms;
    
    // Process username to handle platform-specific formats
    let username = values.username.trim();
    
    // Handle Reddit-specific username format (u/username or /u/username)
    if ((username.startsWith("u/") || username.startsWith("/u/")) && 
        (platforms.includes("reddit") || platforms.includes("all"))) {
      // Remove 'u/' or '/u/' prefix
      username = username.startsWith("u/") ? username.substring(2) : username.substring(3);
      console.log("Detected Reddit username format, converted to:", username);
    }
    
    // Start search with the form values and selected platforms
    searchMutation.mutate({
      username: username,
      platforms: platforms,
    });
    
    // For debugging
    console.log("Submitting search:", {
      username: username,
      platforms: platforms,
    });
  };

  // Handle advanced search options (not implemented in this demo)
  const handleAdvancedSearch = () => {
    toast({
      title: "Advanced Search",
      description: "Advanced search options are coming soon!",
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Centered username input */}
        <div className="max-w-xl mx-auto">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter username to search"
                    {...field}
                    className="px-4 py-3"
                  />
                </FormControl>
                <FormMessage />
                <div className="text-xs text-gray-500 mt-1">
                  For Reddit, you can enter username with or without the u/ prefix
                </div>
              </FormItem>
            )}
          />
        </div>
        
        <div className="pt-2">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Select Platforms</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {/* Exclude "all" from the platform cards */}
            {AVAILABLE_PLATFORMS.filter(p => p !== "all").map(platform => (
              <PlatformCard
                key={platform}
                platform={platform}
                icon={PLATFORM_CONFIG[platform].icon}
                name={PLATFORM_CONFIG[platform].name}
                color={PLATFORM_CONFIG[platform].color}
                selected={selectedPlatforms.includes(platform)}
                onSelect={togglePlatform}
              />
            ))}
          </div>
        </div>
        
        {/* Centered buttons with enhanced styling */}
        <div className="flex items-center justify-center space-x-4 mt-8">
          <Button 
            type="submit" 
            className="px-8 py-3 flex items-center text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-primary to-primary/80"
            disabled={searchMutation.isPending}
          >
            {searchMutation.isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching...
              </>
            ) : (
              <>
                <svg 
                  xmlns="http://www.w3.org/2000/svg"
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="mr-2 h-5 w-5"
                >
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.3-4.3"/>
                </svg>
                Search Now
              </>
            )}
          </Button>
          <Button 
            type="button" 
            variant="outline"
            className="px-6 py-3"
            onClick={handleAdvancedSearch}
          >
            Advanced Options
          </Button>
        </div>
      </form>
    </Form>
  );
}
