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
  platform: z.enum(["all", "instagram", "facebook", "reddit", "twitter", "linkedin"]),
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
      platform: "all",
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
      const response = await apiRequest({
        url: "/api/search",
        method: "POST",
        body: data,
        throwOnError: true
      });
      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      // Store search results in sessionStorage for use in results page
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
    // Start search with the form values and selected platforms
    searchMutation.mutate({
      username: values.username,
      platforms: selectedPlatforms.length > 0 ? selectedPlatforms : [values.platform],
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
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
                </FormItem>
              )}
            />
          </div>
          <div>
            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="px-4 py-3">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AVAILABLE_PLATFORMS.map(platform => (
                        <SelectItem key={platform} value={platform}>
                          {PLATFORM_CONFIG[platform].name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="pt-2">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Select Platforms</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
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
        
        <div className="flex items-center space-x-4">
          <Button 
            type="submit" 
            className="px-6 py-3 flex items-center"
            disabled={searchMutation.isPending}
          >
            {searchMutation.isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                  className="mr-2 h-4 w-4"
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
