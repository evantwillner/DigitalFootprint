import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Platform } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

// Form schema for platform deletion
const platformDeletionSchema = z.object({
  platform: z.string(),
  username: z.string().min(1, "Username is required"),
  options: z.object({
    deleteAll: z.boolean().optional().default(false),
    deleteTweets: z.boolean().optional().default(false),
    deleteComments: z.boolean().optional().default(false),
    deleteLikes: z.boolean().optional().default(false)
  })
});

type PlatformDeletionValues = z.infer<typeof platformDeletionSchema>;

export function PlatformDeletionForm() {
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    message: string;
    requestId?: string;
  } | null>(null);
  
  const { toast } = useToast();
  
  // Get all supported platforms and their API status
  const { data: apiStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["/api/platform-api-status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/platform-api-status");
      return res.json();
    },
    // Don't refetch too often
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Form setup
  const form = useForm<PlatformDeletionValues>({
    resolver: zodResolver(platformDeletionSchema),
    defaultValues: {
      platform: "twitter",
      username: "",
      options: {
        deleteAll: false,
        deleteTweets: true,
        deleteComments: true,
        deleteLikes: true
      }
    }
  });
  
  // Watch values to show/hide appropriate options
  const watchPlatform = form.watch("platform");
  const watchDeleteAll = form.watch("options.deleteAll");
  
  // Mutation for deletion request
  const deletionMutation = useMutation({
    mutationFn: async (values: PlatformDeletionValues) => {
      const res = await apiRequest("POST", "/api/platform-deletion", values);
      return res.json();
    },
    onSuccess: (data) => {
      // Clear any existing submission result
      setSubmissionResult(null);
      
      if (data.success) {
        toast({
          title: "Deletion Request Submitted",
          description: data.message,
          variant: "default"
        });
        
        // Show detailed result
        setSubmissionResult({
          success: true,
          message: data.message,
          requestId: data.requestId
        });
        
        // Invalidate deletion requests cache
        queryClient.invalidateQueries({ queryKey: ["/api/deletion-requests"] });
        
        // Reset form
        form.reset();
      } else {
        toast({
          title: "Deletion Request Failed",
          description: data.message,
          variant: "destructive"
        });
        
        // Show detailed error
        setSubmissionResult({
          success: false,
          message: data.message
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Request Failed",
        description: error.message,
        variant: "destructive"
      });
      
      // Show detailed error
      setSubmissionResult({
        success: false,
        message: error.message
      });
    }
  });
  
  const onSubmit = (values: PlatformDeletionValues) => {
    deletionMutation.mutate(values);
  };
  
  type ApiStatusData = Record<string, { configured: boolean; message: string }>;
  
  // Helper to determine if a platform is supported
  const isPlatformSupported = (platform: string): boolean => {
    if (!apiStatus) return false;
    const typedStatus = apiStatus as ApiStatusData;
    return platform in typedStatus && typedStatus[platform]?.configured;
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="heading-gradient-vibrant">Platform Content Deletion</CardTitle>
        <CardDescription>
          Request deletion of your content from specific social media platforms
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingStatus ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Platform API Status Alerts */}
            <div className="mb-6 space-y-3">
              {apiStatus && Object.entries(apiStatus as ApiStatusData).map(([platform, status]) => (
                <Alert 
                  key={platform}
                  variant={status.configured ? "default" : "destructive"}
                  className="bg-opacity-10"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="capitalize">{platform}</AlertTitle>
                  <AlertDescription>
                    {status.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a platform" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="twitter">Twitter (X)</SelectItem>
                          <SelectItem value="facebook" disabled={!isPlatformSupported("facebook")}>
                            Facebook
                          </SelectItem>
                          <SelectItem value="instagram" disabled={!isPlatformSupported("instagram")}>
                            Instagram
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the platform you want to delete content from
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your username" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your username on {watchPlatform}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="options.deleteAll"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Delete entire account</FormLabel>
                          <FormDescription>
                            Request to delete your entire {watchPlatform} account and all associated data
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  {!watchDeleteAll && watchPlatform === "twitter" && (
                    <>
                      <FormField
                        control={form.control}
                        name="options.deleteTweets"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Delete tweets</FormLabel>
                              <FormDescription>
                                Delete your tweets from Twitter
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="options.deleteComments"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Delete replies</FormLabel>
                              <FormDescription>
                                Delete your replies to other tweets
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="options.deleteLikes"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Remove likes</FormLabel>
                              <FormDescription>
                                Remove your likes from tweets
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full button-gradient" 
                  disabled={deletionMutation.isPending}
                >
                  {deletionMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Submit Deletion Request"
                  )}
                </Button>
              </form>
            </Form>
            
            {/* Submission Result */}
            {submissionResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <Alert variant={submissionResult.success ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{submissionResult.success ? "Success" : "Error"}</AlertTitle>
                  <AlertDescription>
                    {submissionResult.message}
                    {submissionResult.requestId && (
                      <p className="mt-2 text-sm font-mono">
                        Request ID: {submissionResult.requestId}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          Note: Deletion requests may take up to 30 days to process completely.
        </p>
      </CardFooter>
    </Card>
  );
}