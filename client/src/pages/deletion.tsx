import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Platform, insertDeletionRequestSchema, platformEnum } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { AVAILABLE_PLATFORMS, ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, CheckCircle } from "lucide-react";

const deletionFormSchema = z.object({
  username: z.string().min(1, ERROR_MESSAGES.required),
  platforms: z.array(platformEnum).min(1, "Select at least one platform"),
  consent: z.boolean().refine(val => val === true, {
    message: "You must consent to the data processing"
  })
});

type DeletionFormValues = z.infer<typeof deletionFormSchema>;

export default function Deletion() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const form = useForm<DeletionFormValues>({
    resolver: zodResolver(deletionFormSchema),
    defaultValues: {
      username: "",
      platforms: [],
      consent: false
    }
  });

  // Production-ready submission handler with proper error handling
  const onSubmit = async (values: DeletionFormValues) => {
    setSubmitting(true);
    try {
      const response = await apiRequest({
        url: "/api/deletion-request",
        method: "POST",
        body: {
          username: values.username,
          platforms: values.platforms,
          // Could include additional reason information from form
          reason: "User-initiated deletion request via web form"
        },
        // Don't throw automatically - handle specific status codes
        throwOnError: false
      });
      
      // Handle different response statuses properly
      if (response.status === 401) {
        // Unauthorized - user needs to log in
        toast({
          title: "Authentication Required",
          description: "Please log in to submit a deletion request.",
          variant: "destructive"
        });
        
        // In a real app, we'd redirect to login
        // navigate("/login?redirect=/deletion");
        
        // For the demo, just show an error and allow another attempt
        setSubmitting(false);
        return;
      }
      
      if (response.status === 403) {
        // Forbidden - e.g., trying to delete someone else's account
        toast({
          title: "Access Denied",
          description: "You can only request deletion for your own account.",
          variant: "destructive"
        });
        setSubmitting(false);
        return;
      }
      
      if (!response.ok) {
        // Generic error handling for other errors
        const errorData = await response.json().catch(() => null);
        toast({
          title: "Error",
          description: errorData?.error || ERROR_MESSAGES.serverError,
          variant: "destructive"
        });
        setSubmitting(false);
        return;
      }
      
      // Success path
      setSubmitSuccess(true);
      toast({
        title: "Success",
        description: SUCCESS_MESSAGES.deletion,
        variant: "default"
      });
      form.reset();
    } catch (error) {
      // Network/connection errors
      console.error("Deletion request error:", error);
      toast({
        title: "Connection Error",
        description: "Could not connect to the server. Please check your internet connection and try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Deletion Requests</h1>
        <p className="text-gray-500">Request to remove your digital footprint from specific platforms.</p>
      </div>

      {submitSuccess ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <h2 className="text-2xl font-semibold text-center">Deletion Request Submitted</h2>
              <p className="text-center text-gray-500 max-w-md">
                Your deletion request has been successfully submitted. We will process your request and notify you when completed.
              </p>
              <Button onClick={() => setSubmitSuccess(false)} className="mt-4">
                Submit Another Request
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Submit a Deletion Request</CardTitle>
            <CardDescription>
              Complete this form to request removal of your data from various platforms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Platforms</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {AVAILABLE_PLATFORMS.filter(p => p !== "all").map((platform) => (
                      <FormField
                        key={platform}
                        control={form.control}
                        name="platforms"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={platform}
                              className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(platform)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, platform])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== platform
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal capitalize">
                                {platform}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  {form.formState.errors.platforms && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.platforms.message}
                    </p>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="consent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          I consent to the processing of my data for the purpose of fulfilling this deletion request.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <div className="bg-blue-50 px-4 py-3 rounded-md flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">Important Note</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Some platforms require authentication for deletion requests. 
                      You may need to authorize our app to complete the deletion process.
                    </p>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Processing..." : "Submit Deletion Request"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="bg-gray-50 px-6 border-t flex-col items-start">
            <h3 className="font-medium text-sm">Deletion Process Timeline</h3>
            <p className="text-sm text-muted-foreground">
              After submission, your request will be processed within 30 days as required by regulations. 
              You'll receive updates on the status of your request via email.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}