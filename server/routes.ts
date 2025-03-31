import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { log } from "./vite";
import { 
  SearchQuery, 
  searchQuerySchema,
  searchQuerySchemaWithValidation,
  Platform, 
  platformEnum, 
  insertUserSchema,
  insertDeletionRequestSchema
} from "@shared/schema";
import { ZodError, z } from "zod";
import { fromZodError } from "zod-validation-error";
import { login, logout, register, getCurrentUser } from "./auth";
import { requireAuth, loadUser, requireOwnership } from "./middleware/auth";
import { setupSession, trackActivity } from "./middleware/session";
import Stripe from "stripe";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up Stripe
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  // Set up session middleware
  setupSession(app);
  
  // Apply user loading middleware
  app.use(loadUser);
  
  // API routes prefix
  const apiRouter = express.Router();
  app.use("/api", apiRouter);
  
  // Error handler for API validation and platform-specific errors
  const handleApiError = (err: unknown, res: Response) => {
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({ 
        message: "Validation error", 
        errors: validationError.details 
      });
    }
    
    // Handle specific platform API error types
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    // Rate limiting errors
    if (errorMessage.includes('RATE_LIMITED') || errorMessage.includes('rate limit exceeded')) {
      return res.status(429).json({ 
        message: "Rate limit exceeded", 
        error: errorMessage 
      });
    }
    
    // Authentication errors
    if (errorMessage.includes('AUTH_ERROR') || errorMessage.includes('authentication failed')) {
      return res.status(401).json({ 
        message: "API authentication error", 
        error: errorMessage 
      });
    }
    
    // Permission errors
    if (errorMessage.includes('PERMISSION_ERROR') || errorMessage.includes('permission')) {
      return res.status(403).json({ 
        message: "API permission error", 
        error: errorMessage 
      });
    }
    
    // Not found errors
    if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('not found')) {
      return res.status(404).json({ 
        message: "Resource not found", 
        error: errorMessage 
      });
    }
    
    // Log the full error for debugging
    console.error("API Error:", err);
    
    // Generic server error for unhandled cases
    return res.status(500).json({ 
      message: "Internal server error", 
      error: errorMessage 
    });
  };

  // Search for digital footprint
  apiRouter.post("/search", async (req: Request, res: Response) => {
    try {
      // Parse and validate the search query using the enhanced schema with validation
      const searchQuery = searchQuerySchemaWithValidation.parse(req.body);
      
      // Check platform API status first to identify issues before processing the search
      // Import platform API service to check API status
      const { platformApi } = await import('./services/platform-api');
      const platformStatus = await platformApi.getPlatformStatus();
      
      // Identify platforms with operational issues
      const platformErrors: Record<string, string> = {};
      const platformsToSearch = searchQuery.platforms.includes("all") 
        ? ["instagram", "twitter", "reddit", "facebook", "linkedin"] as Platform[]
        : searchQuery.platforms;
      
      // Check each platform status
      for (const platform of platformsToSearch) {
        // Skip platforms that don't have a specific API integration yet
        if (!platformStatus[platform]) continue;
        
        // For Twitter specifically, check operational status
        if (platform === "twitter" && platformStatus.twitter) {
          // Type safety handling for Twitter status
          const twitterStatus = platformStatus.twitter as unknown as { 
            configured: boolean; 
            operational: boolean; 
            message: string 
          };
          
          console.log("Twitter API status:", twitterStatus);
          
          // Always add Twitter error message if available, even if the API is operational
          // This ensures errors like rate limiting are captured
          if (twitterStatus.message && twitterStatus.message !== 'Twitter API configured and operational.') {
            console.log("Adding Twitter error:", twitterStatus.message);
            platformErrors.twitter = twitterStatus.message;
          }
        }
        
        // For other platforms, check their available status
        else if (platformStatus[platform]) {
          // Type safety handling for other platform status formats
          const platformInfo = platformStatus[platform] as unknown as { 
            available?: boolean; 
            configured?: boolean;
            operational?: boolean;
            message: string 
          };

          console.log(`${platform} API status:`, platformInfo);

          if ((platformInfo.available === false) || 
              (platformInfo.configured === false) || 
              (platformInfo.operational === false)) {
            console.log(`Adding ${platform} error:`, platformInfo.message);
            platformErrors[platform] = platformInfo.message;
          }
        }
      }
      
      // Log all platform errors found
      console.log("All platform errors collected:", platformErrors);
      
      // Process the search and get digital footprint data
      const result = await storage.aggregateDigitalFootprint(searchQuery);
      
      // Merge the API status errors with any platform errors found during fetching
      console.log("Platform errors from API status:", platformErrors);
      console.log("Platform errors from result:", result.platformErrors);
      
      // Create a merged platform errors object
      // Ensure both objects are initialized before spreading
      const resultPlatformErrors = result.platformErrors || {};
      
      // Log platform errors before merging
      console.log("Platform errors from API route:", platformErrors);
      console.log("Platform errors from aggregate function:", resultPlatformErrors);
      
      const mergedPlatformErrors = {
        ...resultPlatformErrors,
        ...platformErrors
      };
      
      // Debug what we're actually sending
      console.log("Merged platform errors to return:", mergedPlatformErrors);
      
      // Update the result with the merged errors
      // Always include platform errors in the result, even if empty object
      result.platformErrors = mergedPlatformErrors;
      
      // Determine username to save in history
      const usernameForHistory = searchQuery.username || 
        (searchQuery.platformUsernames && searchQuery.platformUsernames.length > 0 ? 
          searchQuery.platformUsernames.map((pu: { platform: Platform, username: string }) => 
            `${pu.platform}:${pu.username}`).join(', ') : 
          "unknown");
      
      // Save the search to history (if user is authenticated)
      if (req.session?.userId) {
        await storage.saveSearch({
          userId: req.session.userId,
          username: usernameForHistory,
          platforms: searchQuery.platforms,
        });
      }
      
      return res.json(result);
    } catch (err) {
      return handleApiError(err, res);
    }
  });
  
  // Get subscription plans
  apiRouter.get("/plans", async (_req: Request, res: Response) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      return res.json(plans);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });
  
  // Create deletion request (requires authentication)
  apiRouter.post("/deletion-request", requireAuth, async (req: Request, res: Response) => {
    try {
      // Get the user to verify they exist and ownership
      const user = await storage.getUser(req.session!.userId!);
      if (!user) {
        return res.status(404).json({ 
          message: "User not found",
          error: "Your user account could not be verified." 
        });
      }
      
      // Validate that the username in the request matches the authenticated user
      if (req.body.username && req.body.username !== user.username) {
        return res.status(403).json({ 
          message: "Forbidden",
          error: "You can only request deletion for your own account." 
        });
      }
      
      // Parse and validate the deletion request with proper security measures
      const deletionRequest = insertDeletionRequestSchema.parse({
        ...req.body,
        // Always use the session userId to prevent spoofing
        userId: req.session!.userId!,
        // Store detailed information for audit purposes
        details: { 
          reason: req.body.reason || "User requested deletion via authenticated session",
          requestedAt: new Date().toISOString(),
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"]
        }
      });
      
      // Log the deletion request (for audit/compliance purposes)
      console.log(`Deletion request initiated by user ${user.username} (ID: ${user.id}) for platforms: ${deletionRequest.platforms.join(", ")}`);
      
      // Create the deletion request
      const result = await storage.createDeletionRequest(deletionRequest);
      
      // In a production environment, you might also want to:
      // 1. Send confirmation email to the user's verified email address
      // 2. Trigger appropriate workflows for each platform
      // 3. Update user record with deletion request status
      
      return res.status(201).json(result);
    } catch (err) {
      // Log all errors for security monitoring
      console.error("Deletion request error:", err);
      
      // Enhanced error handling for all API errors
      return handleApiError(err, res);
    }
  });
  
  // Platform-specific deletion request schema
  const platformDeletionSchema = z.object({
    platform: platformEnum,
    username: z.string().min(1, "Username is required"),
    options: z.object({
      deleteAll: z.boolean().optional().default(false),
      deleteTweets: z.boolean().optional().default(false),
      deleteComments: z.boolean().optional().default(false),
      deleteLikes: z.boolean().optional().default(false)
    })
  });
  
  // Handle platform-specific deletion through integrated APIs
  apiRouter.post("/platform-deletion", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session!.userId!);
      if (!user) {
        return res.status(404).json({ 
          message: "User not found",
          error: "Your user account could not be verified." 
        });
      }
      
      // Validate the request data
      const requestData = platformDeletionSchema.parse(req.body);
      
      // Check that the username matches the authenticated user or their OAuth-connected accounts
      // In a real app, you would check the user's connected accounts here
      
      // Platform-specific handling
      if (requestData.platform === 'twitter') {
        // Import the Twitter API service (lazy loading to avoid circular dependency)
        const { twitterApi } = await import('./services/twitter-api');
        
        // Process the deletion request
        const result = await twitterApi.requestDataDeletion(
          requestData.username,
          requestData.options
        );
        
        if (result.success) {
          // Log the successful request to the database
          const deletionRequest = await storage.createDeletionRequest({
            userId: req.session!.userId!,
            platforms: [requestData.platform],
            status: 'in_progress',
            details: {
              requestType: 'platform_api',
              username: requestData.username,
              options: requestData.options,
              requestId: result.requestId,
              message: result.message,
              requestedAt: new Date().toISOString()
            }
          });
          
          return res.status(200).json({
            success: true,
            message: result.message,
            requestId: result.requestId,
            deletionId: deletionRequest.id
          });
        } else {
          return res.status(400).json({
            success: false,
            message: result.message
          });
        }
      } else {
        // For other platforms (to be implemented)
        return res.status(400).json({
          success: false,
          message: `Deletion from ${requestData.platform} is not yet supported through our API integration`
        });
      }
    } catch (err) {
      // Use the comprehensive API error handler
      return handleApiError(err, res);
    }
  });
  
  // Get status of connected platform APIs
  apiRouter.get("/platform-api-status", requireAuth, async (_req: Request, res: Response) => {
    try {
      // Lazy-load the API services to avoid circular dependencies
      const { twitterApi } = await import('./services/twitter-api');
      const { redditApi } = await import('./services/reddit-api');
      const { platformApi } = await import('./services/platform-api');
      const { instagramOAuth } = await import('./services/instagram-oauth');
      
      // Get cache stats and rate limiter info for UI display
      const { cacheService } = await import('./services/cache-service');
      const { rateLimiters } = await import('./services/rate-limiter');
      
      const cacheStats = cacheService.platformData.getStats();
      const instagramRateLimits = rateLimiters.instagram.getStats();
      
      // Get platform statuses (async calls)
      const twitterStatus = await twitterApi.getApiStatus();
      const platformStatus = await platformApi.getPlatformStatus();
      
      const status = {
        twitter: {
          configured: twitterStatus.configured,
          operational: twitterStatus.operational !== undefined ? twitterStatus.operational : false,
          message: twitterStatus.message
        },
        reddit: redditApi.getApiStatus(),
        instagram: (await platformStatus).instagram,
        // Add other platforms as they're implemented
        facebook: (await platformStatus).facebook,
        instagram_oauth: {
          configured: instagramOAuth.isConfigured(),
          message: (() => {
            const isConfigured = instagramOAuth.isConfigured();
            if (!isConfigured) return "Instagram OAuth not configured";
            return instagramOAuth.hasValidToken() 
              ? "Instagram OAuth configured with valid token" 
              : "Instagram OAuth configured but needs authorization";
          })()
        },
        system: {
          cache: {
            size: cacheStats.size,
            maxSize: cacheStats.maxSize,
            utilization: Math.round(cacheStats.utilization * 100)
          },
          rateLimiter: {
            instagram: {
              availableTokens: instagramRateLimits.availableTokens,
              maxTokens: instagramRateLimits.maxTokens,
              queueLength: instagramRateLimits.queueLength,
              requestCount: instagramRateLimits.platformCounts.instagram || 0
            }
          }
        }
      };
      
      return res.json(status);
    } catch (err) {
      console.error("Error checking API status:", err);
      return res.status(500).json({
        message: "Error checking API status"
      });
    }
  });
  
  // User registration
  apiRouter.post("/register", register);
  
  // User login
  apiRouter.post("/login", login);
  
  // User logout
  apiRouter.post("/logout", logout);
  
  // Get current user (if authenticated)
  apiRouter.get("/user", getCurrentUser);
  
  // New detailed API status endpoint that includes more information about tokens
  apiRouter.get("/platform-api-detailed-status", requireAuth, async (_req: Request, res: Response) => {
    try {
      // Import necessary modules
      const axios = await import('axios');
      const { tokenManager } = await import('./services/token-manager');
      
      // Get the platforms we want to check
      const platforms = ['twitter', 'facebook', 'instagram', 'reddit'] as const;
      
      // Create a detailed status object with information about each platform
      const detailedStatus: Record<string, any> = {};
      
      // For each platform, check token existence, expiry, and verification
      for (const platform of platforms) {
        const token = await tokenManager.getToken(platform, false);
        
        detailedStatus[platform] = {
          hasToken: !!token,
          tokenExpired: token ? (token.expiresAt ? Date.now() > token.expiresAt : false) : true,
          tokenDetails: token ? {
            expiresAt: token.expiresAt ? new Date(token.expiresAt).toISOString() : 'never',
            hasRefreshToken: !!token.refreshToken,
            additionalDataKeys: token.additionalData ? Object.keys(token.additionalData) : []
          } : null
        };
        
        // If we have a token, try to verify it with the API
        if (token) {
          try {
            let apiVerified = false;
            let apiResponse = null;
            let apiError = null;
            
            switch (platform) {
              case 'twitter':
                try {
                  const response = await axios.default.get('https://api.twitter.com/2/users/by/username/elonmusk', {
                    headers: { 'Authorization': `Bearer ${token.accessToken}` }
                  });
                  apiVerified = response.status === 200;
                  apiResponse = response.status === 200 ? response.data : null;
                } catch (e: any) {
                  apiError = {
                    message: e.message,
                    status: e.response?.status,
                    data: e.response?.data
                  };
                }
                break;
                
              case 'facebook':
                try {
                  const response = await axios.default.get('https://graph.facebook.com/v17.0/me', {
                    params: { access_token: token.accessToken }
                  });
                  apiVerified = response.status === 200 && !!response.data?.id;
                  apiResponse = response.status === 200 ? response.data : null;
                } catch (e: any) {
                  apiError = {
                    message: e.message,
                    status: e.response?.status,
                    data: e.response?.data
                  };
                }
                break;
                
              case 'instagram':
                try {
                  const response = await axios.default.get('https://graph.instagram.com/me', {
                    params: {
                      access_token: token.accessToken,
                      fields: 'id,username'
                    }
                  });
                  apiVerified = response.status === 200 && !!response.data?.id;
                  apiResponse = response.status === 200 ? response.data : null;
                } catch (e: any) {
                  apiError = {
                    message: e.message,
                    status: e.response?.status,
                    data: e.response?.data
                  };
                }
                break;
                
              case 'reddit':
                try {
                  const response = await axios.default.get('https://oauth.reddit.com/api/v1/me', {
                    headers: {
                      'Authorization': `Bearer ${token.accessToken}`,
                      'User-Agent': 'Digital Wellness Platform/1.0'
                    }
                  });
                  apiVerified = response.status === 200 && !!response.data;
                  apiResponse = response.status === 200 ? response.data : null;
                } catch (e: any) {
                  apiError = {
                    message: e.message,
                    status: e.response?.status,
                    data: e.response?.data
                  };
                }
                break;
            }
            
            detailedStatus[platform].apiVerified = apiVerified;
            detailedStatus[platform].apiResponse = apiResponse;
            detailedStatus[platform].apiError = apiError;
          } catch (verifyError: any) {
            detailedStatus[platform].apiVerified = false;
            detailedStatus[platform].verifyError = verifyError.message;
          }
        }
      }
      
      return res.json(detailedStatus);
    } catch (err: any) {
      console.error("Error checking detailed API status:", err);
      return res.status(500).json({
        message: "Error checking detailed API status",
        error: err.message
      });
    }
  });
  
  // Get search history for current user
  apiRouter.get("/search-history", requireAuth, async (req: Request, res: Response) => {
    try {
      // Get search history
      const history = await storage.getSearchHistoryByUser(req.session!.userId!);
      
      return res.json(history);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to fetch search history" });
    }
  });
  
  // Get deletion requests for current user
  apiRouter.get("/deletion-requests", requireAuth, async (req: Request, res: Response) => {
    try {
      // Get deletion requests
      const requests = await storage.getDeletionRequestsByUser(req.session!.userId!);
      
      return res.json(requests);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to fetch deletion requests" });
    }
  });

  // Stripe payment route for one-time payments
  apiRouter.post("/create-payment-intent", requireAuth, async (req: Request, res: Response) => {
    try {
      const { amount } = req.body;
      
      if (!amount || isNaN(amount)) {
        return res.status(400).json({ message: "Valid amount is required" });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId: req.session!.userId!.toString(),
        },
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Stripe payment error:", error);
      res.status(500).json({ 
        message: "Error creating payment intent", 
        error: error.message 
      });
    }
  });

  // Create or retrieve a subscription
  apiRouter.post("/get-or-create-subscription", requireAuth, async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If user already has a subscription, retrieve it
    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        // Check if there's a payment intent to return
        const latestInvoice = subscription.latest_invoice;
        if (typeof latestInvoice === 'string') {
          const invoice = await stripe.invoices.retrieve(latestInvoice);
          const paymentIntentId = invoice.payment_intent;
          
          if (typeof paymentIntentId === 'string') {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            
            return res.json({
              subscriptionId: subscription.id,
              clientSecret: paymentIntent.client_secret,
            });
          }
        }
        
        return res.json({
          subscriptionId: subscription.id,
          status: subscription.status,
        });
      } catch (error: any) {
        console.error("Error retrieving subscription:", error);
        // If the subscription doesn't exist anymore, we'll create a new one
      }
    }
    
    // No subscription exists, create a customer and subscription
    try {
      // Get the selected plan from the request body, default to Pro
      const planName = req.body.planName || "Pro Cleanup";
      const plans = await storage.getSubscriptionPlans();
      const selectedPlan = plans.find(p => p.name === planName);
      
      if (!selectedPlan) {
        return res.status(400).json({ message: "Invalid plan selected" });
      }
      
      // Create or get the Stripe customer
      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        // Create a new customer
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
          metadata: {
            userId: user.id.toString(),
          },
        });
        
        customerId = customer.id;
        // Update user with new customer ID
        await storage.updateStripeCustomerId(user.id, customerId);
      }
      
      // First create a product
      const product = await stripe.products.create({
        name: selectedPlan.name,
        description: selectedPlan.description,
      });
      
      // Create a price for the product
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: selectedPlan.price * 100, // price in cents
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
      });
      
      // Create the subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: price.id,
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
      
      // Update user with subscription ID
      await storage.updateStripeSubscriptionId(user.id, subscription.id);
      
      // Get client secret from the invoice
      const invoice = subscription.latest_invoice;
      let clientSecret = null;
      
      if (invoice && typeof invoice !== 'string' && invoice.payment_intent) {
        const paymentIntent = invoice.payment_intent;
        if (typeof paymentIntent !== 'string' && paymentIntent.client_secret) {
          clientSecret = paymentIntent.client_secret;
        }
      }
      
      return res.json({
        subscriptionId: subscription.id,
        clientSecret,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      return res.status(500).json({ 
        message: "Error creating subscription", 
        error: error.message 
      });
    }
  });

  // Instagram OAuth routes
  apiRouter.get("/instagram/auth", async (_req: Request, res: Response) => {
    try {
      // Use dynamic import to avoid circular dependencies
      const { instagramOAuth } = await import('./services/instagram-oauth');
      
      if (!instagramOAuth.isConfigured()) {
        return res.status(500).json({
          success: false,
          message: "Instagram OAuth is not properly configured"
        });
      }
      
      // Get the authorization URL and redirect the user
      const authUrl = instagramOAuth.getAuthorizationUrl();
      return res.redirect(authUrl);
    } catch (error: any) {
      console.error("Instagram auth error:", error);
      return res.status(500).json({
        success: false,
        message: "Error initiating Instagram authorization",
        error: error.message
      });
    }
  });
  
  apiRouter.get("/instagram/callback", async (req: Request, res: Response) => {
    try {
      const { code } = req.query;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({
          success: false,
          message: "Authorization code is missing"
        });
      }
      
      // Use dynamic import to avoid circular dependencies
      const { instagramOAuth } = await import('./services/instagram-oauth');
      
      // Exchange code for token
      const tokenResponse = await instagramOAuth.exchangeCodeForToken(code);
      
      // Get a long-lived token
      const longLivedToken = await instagramOAuth.getLongLivedToken(tokenResponse.accessToken);
      
      // Redirect to a success page or return JSON based on the client's needs
      return res.json({
        success: true,
        message: "Instagram authorization successful",
        expiresIn: longLivedToken.expiresIn
      });
    } catch (error: any) {
      console.error("Instagram callback error:", error);
      return res.status(500).json({
        success: false,
        message: "Error processing Instagram authorization",
        error: error.message
      });
    }
  });
  
  // Check Instagram login status
  apiRouter.get("/instagram/status", async (_req: Request, res: Response) => {
    try {
      // Use dynamic import to avoid circular dependencies
      const { instagramOAuth } = await import('./services/instagram-oauth');
      
      const isConfigured = instagramOAuth.isConfigured();
      const hasValidToken = instagramOAuth.hasValidToken();
      
      return res.json({
        configured: isConfigured,
        hasValidToken: hasValidToken, 
        needsAuthorization: isConfigured && !hasValidToken,
        authorizeUrl: isConfigured ? instagramOAuth.getAuthorizationUrl() : null
      });
    } catch (error: any) {
      console.error("Instagram status error:", error);
      return res.status(500).json({
        success: false,
        message: "Error checking Instagram authorization status",
        error: error.message
      });
    }
  });
  
  // Get OAuth authorization URL for Instagram without authentication
  apiRouter.get("/debug/instagram-auth", async (_req: Request, res: Response) => {
    try {
      // Use dynamic import to avoid circular dependencies
      const { instagramOAuth } = await import('./services/instagram-oauth');
      
      if (!instagramOAuth.isConfigured()) {
        return res.status(400).json({
          success: false,
          message: "Instagram OAuth is not properly configured"
        });
      }
      
      // Return the URL rather than redirecting for testing purposes
      const authUrl = instagramOAuth.getAuthorizationUrl();
      const isConfigured = instagramOAuth.isConfigured();
      const hasValidToken = instagramOAuth.hasValidToken();
      
      return res.json({
        success: true,
        message: "Instagram authentication URL generated",
        authUrl: authUrl,
        isConfigured: isConfigured,
        hasValidToken: hasValidToken
      });
    } catch (error: any) {
      console.error("Error generating Instagram auth URL:", error);
      return res.status(500).json({
        success: false,
        message: "Error generating Instagram authorization URL",
        error: error.message
      });
    }
  });
  
  // API test endpoint - for debugging purposes
  apiRouter.get("/test/instagram/:username", async (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      console.log(`Testing Instagram API for username: ${username}`);
      
      // Use dynamic import to avoid circular dependencies
      const { instagramApi } = await import('./services/instagram-api');
      
      // Try to fetch data from Instagram
      const result = await instagramApi.fetchUserData(username);
      
      if (result) {
        // Only return basic profile info to avoid exposing sensitive data
        const apiStatus = await instagramApi.getApiStatus();
        
        // Extract data with null checks
        const profileData = result.profileData || {};
        const activityData = result.activityData || {};
        
        // Format bio with length check
        let bioText = "No bio available";
        if (profileData.bio) {
          bioText = profileData.bio.substring(0, 50);
          if (profileData.bio.length > 50) {
            bioText += '...';
          }
        }
        
        const testResult = {
          success: true,
          message: "Successfully retrieved Instagram data",
          apiStatus,
          username: result.username,
          displayName: profileData.displayName || "Unknown",
          bio: bioText,
          followerCount: profileData.followerCount || 0,
          postCount: activityData.totalPosts || 0,
          dataAvailable: true
        };
        res.json(testResult);
      } else {
        res.status(404).json({
          success: false,
          message: "No data found for this username",
          apiStatus: await instagramApi.getApiStatus(),
          username,
          dataAvailable: false
        });
      }
    } catch (error: any) {
      console.error(`Error testing Instagram API: ${error.message}`);
      res.status(500).json({
        success: false,
        message: `API error: ${error.message}`,
        error: error.message,
        dataAvailable: false
      });
    }
  });

  // Check Twitter API status without authentication
  apiRouter.get("/twitter-api-status", async (_req: Request, res: Response) => {
    try {
      // Lazy-load the API service to avoid circular dependencies
      const { twitterApi } = await import('./services/twitter-api');
      
      const status = await twitterApi.getApiStatus();
      
      return res.json({
        status,
        configured: status.configured,
        operational: status.operational,
        message: status.message
      });
    } catch (err) {
      console.error("Error checking Twitter API status:", err);
      return res.status(500).json({ message: "Error checking Twitter API status" });
    }
  });
  
  // Check Facebook API status without authentication
  apiRouter.get("/facebook-api-status", async (_req: Request, res: Response) => {
    try {
      // Lazy-load the API service to avoid circular dependencies
      const { facebookApi } = await import('./services/facebook-api');
      
      const status = await facebookApi.getApiStatus();
      
      return res.json({
        status,
        configured: status.configured,
        operational: status.operational,
        message: status.message
      });
    } catch (err) {
      console.error("Error checking Facebook API status:", err);
      return res.status(500).json({ message: "Error checking Facebook API status" });
    }
  });
  
  // Twitter API test endpoint - for debugging purposes
  apiRouter.get("/test/twitter/:username", async (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      console.log(`Testing Twitter API for username: ${username}`);
      
      // Use dynamic import to avoid circular dependencies
      const { twitterApi } = await import('./services/twitter-api');
      
      // Check the API status
      const apiStatus = await twitterApi.getApiStatus();
      
      if (!apiStatus.configured || apiStatus.operational === false) {
        // Get a more specific error message based on the API status
        let errorMessage = "Twitter API is not configured";
        
        if (apiStatus.configured && apiStatus.operational === false) {
          if (apiStatus.message.includes('rate limited')) {
            errorMessage = "Twitter API is rate limited. Please try again later.";
          } else if (apiStatus.message.includes('service is currently unavailable')) {
            errorMessage = "Twitter API service is currently unavailable. Please try again later.";
          } else {
            errorMessage = "Twitter API credentials are invalid or expired";
          }
        }
        
        return res.status(400).json({
          success: false,
          message: errorMessage,
          apiStatus,
          username,
          dataAvailable: false
        });
      }
      
      // Try to fetch data from Twitter
      const result = await twitterApi.fetchUserData(username);
      
      if (result) {
        // Only return basic profile info to avoid exposing sensitive data
        const profileData = result.profileData || {};
        const activityData = result.activityData || {};
        
        // Format bio with length check
        let bioText = "No bio available";
        if (profileData.bio) {
          bioText = profileData.bio.substring(0, 50);
          if (profileData.bio.length > 50) {
            bioText += '...';
          }
        }
        
        const testResult = {
          success: true,
          message: "Successfully retrieved Twitter data",
          apiStatus,
          username: result.username,
          displayName: profileData.displayName || "Unknown",
          bio: bioText,
          followerCount: profileData.followerCount || 0,
          postCount: activityData.totalPosts || 0,
          dataAvailable: true
        };
        res.json(testResult);
      } else {
        res.status(404).json({
          success: false,
          message: "No data found for this username",
          apiStatus,
          username,
          dataAvailable: false
        });
      }
    } catch (error: any) {
      console.error(`Error testing Twitter API: ${error.message}`);
      res.status(500).json({
        success: false,
        message: `API error: ${error.message}`,
        error: error.message,
        dataAvailable: false
      });
    }
  });

  // Facebook API test endpoint - for debugging purposes
  apiRouter.get("/test/facebook/:username", async (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      console.log(`Testing Facebook API for username: ${username}`);
      
      // Use dynamic import to avoid circular dependencies
      const { facebookApi } = await import('./services/facebook-api');
      
      // Check the API status
      const apiStatus = await facebookApi.getApiStatus();
      
      if (!apiStatus.configured || apiStatus.operational === false) {
        // Get a more specific error message based on the API status
        let errorMessage = "Facebook API is not configured";
        
        if (apiStatus.configured && apiStatus.operational === false) {
          if (apiStatus.message.includes('rate limited')) {
            errorMessage = "Facebook API is rate limited. Please try again later.";
          } else if (apiStatus.message.includes('service is currently unavailable')) {
            errorMessage = "Facebook API service is currently unavailable. Please try again later.";
          } else {
            errorMessage = "Facebook API credentials are invalid or expired";
          }
        }
        
        return res.status(400).json({
          success: false,
          message: errorMessage,
          apiStatus,
          username,
          dataAvailable: false
        });
      }
      
      // Try to fetch data from Facebook
      const result = await facebookApi.fetchUserData(username);
      
      if (result) {
        // Only return basic profile info to avoid exposing sensitive data
        const profileData = result.profileData || {};
        const activityData = result.activityData || {};
        
        // Format bio with length check
        let bioText = "No bio available";
        if (profileData.bio) {
          bioText = profileData.bio.substring(0, 50);
          if (profileData.bio.length > 50) {
            bioText += '...';
          }
        }
        
        const testResult = {
          success: true,
          message: "Successfully retrieved Facebook data",
          apiStatus,
          username: result.username,
          displayName: profileData.displayName || "Unknown",
          bio: bioText,
          followerCount: profileData.followerCount || 0,
          postCount: activityData.totalPosts || 0,
          dataAvailable: true
        };
        res.json(testResult);
      } else {
        res.status(404).json({
          success: false,
          message: "No data found for this username",
          apiStatus,
          username,
          dataAvailable: false
        });
      }
    } catch (error: any) {
      console.error(`Error testing Facebook API: ${error.message}`);
      res.status(500).json({
        success: false,
        message: `API error: ${error.message}`,
        error: error.message,
        dataAvailable: false
      });
    }
  });

  // Test Reddit API endpoint - public access with explicit JSON response
  apiRouter.get("/public/test/reddit/:username", async (req: Request, res: Response) => {
    // Set explicit content type to ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    try {
      const { username } = req.params;
      console.log(`Testing Reddit API for username: ${username}`);
      
      // Use dynamic import to avoid circular dependencies
      const { redditApi } = await import('./services/reddit-api');
      
      // Check the API status
      const apiStatus = await redditApi.getApiStatus();
      
      if (!apiStatus.configured || apiStatus.operational === false) {
        // Get a more specific error message based on the API status
        let errorMessage = "Reddit API is not configured";
        if (apiStatus.configured && !apiStatus.operational) {
          errorMessage = "Reddit API credentials are not valid";
        }
        
        return res.status(503).json({
          success: false,
          message: errorMessage,
          apiStatus,
          username,
          dataAvailable: false
        });
      }
      
      // Try to fetch data from Reddit
      const result = await redditApi.fetchUserData(username);
      
      if (result) {
        // Return the Reddit data
        res.json({
          success: true,
          data: result,
          apiStatus,
          username,
          dataAvailable: true
        });
      } else {
        res.status(404).json({
          success: false,
          message: "No data found for this username",
          apiStatus,
          username,
          dataAvailable: false
        });
      }
    } catch (error: any) {
      console.error(`Error testing Reddit API: ${error.message}`);
      res.status(500).json({
        success: false,
        message: `API error: ${error.message}`,
        error: error.message,
        dataAvailable: false
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}
