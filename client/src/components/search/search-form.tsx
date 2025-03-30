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

// Define the local type for form submission
type FormValues = z.infer<typeof formSchema>;

export default function SearchForm() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["instagram"]);

  // Initialize the form
  const form = useForm<FormValues>({
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
    mutationFn: async (data: { 
      username: string, 
      platforms: Platform[],
      platformUsernames?: { platform: Platform, username: string }[]
    }) => {
      const response = await apiRequest("POST", "/api/search", data);
      const result = await response.json();
      
      // Check for platform-specific errors in the response
      if (result.platformErrors && Object.keys(result.platformErrors).length > 0) {
        console.log("Platform errors found in search response:", result.platformErrors);
        
        // Create a warning toast for each platform with errors
        for (const [platform, error] of Object.entries(result.platformErrors)) {
          console.log(`Creating toast for ${platform} error:`, error);
          
          toast({
            title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} API Issue`,
            description: error as string,
            variant: "destructive",
            duration: 5000, // Show for 5 seconds
          });
        }
      } else {
        console.log("No platform errors found in search response");
      }
      
      return result;
    },
    onSuccess: (data) => {
      // Store search results in sessionStorage for use in results page
      console.log("Search successful, storing results:", data);
      sessionStorage.setItem("searchResults", JSON.stringify(data));
      navigate("/results");
    },
    onError: (error) => {
      // Check if the error includes API operational status information
      const errorMessage = error.message || "";
      
      if (errorMessage.includes("rate limited") || errorMessage.includes("operational")) {
        toast({
          title: "API Availability Issue",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Search failed",
          description: errorMessage || "There was an error processing your search. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Form submission handler
  const onSubmit = (values: FormValues) => {
    // Use the selected platforms from the platform cards
    const platforms = selectedPlatforms;
    
    // Process username to handle platform-specific formats
    let username = values.username.trim();
    let platformUsernames: { platform: Platform, username: string }[] = [];
    
    // Check if input contains platform-specific username format
    // Format example: "reddit: johndoe, instagram: john.doe, twitter: realjohndoe"
    if (username.includes(":") && username.includes(",")) {
      // Split by comma and process each platform-username pair
      const pairs = username.split(",").map((pair: string) => pair.trim());
      
      for (const pair of pairs) {
        // Split each pair by colon
        const [platformStr, usernameStr] = pair.split(":").map((part: string) => part.trim());
        
        // Convert platform string to actual Platform type if it's valid
        const platform = platformStr.toLowerCase() as Platform;
        
        // Check if the extracted platform is valid and in the selected platforms
        if (platforms.includes(platform) && usernameStr) {
          // Handle Reddit-specific username format
          let cleanUsername = usernameStr;
          if ((cleanUsername.startsWith("u/") || cleanUsername.startsWith("/u/")) && platform === "reddit") {
            cleanUsername = cleanUsername.startsWith("u/") ? cleanUsername.substring(2) : cleanUsername.substring(3);
          }
          
          platformUsernames.push({
            platform: platform,
            username: cleanUsername
          });
        }
      }
      
      console.log("Parsed platform-specific usernames:", platformUsernames);
      
      // If we successfully parsed platform-usernames, use them
      if (platformUsernames.length > 0) {
        searchMutation.mutate({
          username: "", // Empty main username when using platform-specific ones
          platforms: platforms,
          platformUsernames: platformUsernames
        });
        
        // For debugging
        console.log("Submitting search with platform-specific usernames:", {
          platforms: platforms,
          platformUsernames: platformUsernames
        });
        return;
      }
    }
    
    // If we reach here, it means the input wasn't in platform-specific format
    // Handle Reddit-specific username format (u/username or /u/username)
    if ((username.startsWith("u/") || username.startsWith("/u/")) && 
        (platforms.includes("reddit") || platforms.includes("all"))) {
      // Remove 'u/' or '/u/' prefix
      username = username.startsWith("u/") ? username.substring(2) : username.substring(3);
      console.log("Detected Reddit username format, converted to:", username);
    }
    
    // Start search with the standard format (single username for all platforms)
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
                <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md mt-3 border border-blue-100">
                  <p className="font-medium mb-1">New! Multiple Usernames Across Platforms</p>
                  <p className="text-xs text-gray-700 mb-1">
                    You can now search with different usernames for each platform using this format:
                  </p>
                  <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 block my-1">
                    reddit: johndoe, instagram: john.doe, twitter: realjohndoe
                  </code>
                  <p className="text-xs text-gray-700">
                    This is perfect if you use different usernames across platforms!
                  </p>
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
