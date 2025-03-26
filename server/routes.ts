import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  SearchQuery, 
  searchQuerySchema, 
  Platform, 
  platformEnum, 
  insertUserSchema,
  insertDeletionRequestSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes prefix
  const apiRouter = express.Router();
  app.use("/api", apiRouter);
  
  // Error handler for Zod validation errors
  const handleZodError = (err: unknown, res: Response) => {
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({ 
        message: "Validation error", 
        errors: validationError.details 
      });
    }
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  };

  // Search for digital footprint
  apiRouter.post("/search", async (req: Request, res: Response) => {
    try {
      // Parse and validate the search query
      const searchQuery = searchQuerySchema.parse(req.body);
      
      // Process the search and get digital footprint data
      const result = await storage.aggregateDigitalFootprint(
        searchQuery.username,
        searchQuery.platforms
      );
      
      // Save the search to history (if user is authenticated)
      if (req.session?.userId) {
        await storage.saveSearch({
          userId: req.session.userId,
          username: searchQuery.username,
          platforms: searchQuery.platforms,
        });
      }
      
      return res.json(result);
    } catch (err) {
      return handleZodError(err, res);
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
  apiRouter.post("/deletion-request", async (req: Request, res: Response) => {
    try {
      // Production security: Ensure user is authenticated
      if (!req.session?.userId) {
        return res.status(401).json({ 
          message: "Authentication required",
          error: "You must be logged in to submit a deletion request." 
        });
      }
      
      // Get the user to verify they exist and ownership
      const user = await storage.getUser(req.session.userId);
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
        userId: req.session.userId,
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
      // Enhanced error handling
      if (err instanceof ZodError) {
        return handleZodError(err, res);
      }
      
      // Log all errors for security monitoring
      console.error("Deletion request error:", err);
      return res.status(500).json({ 
        message: "Internal server error",
        error: "An unexpected error occurred while processing your deletion request."
      });
    }
  });
  
  // User registration
  apiRouter.post("/register", async (req: Request, res: Response) => {
    try {
      // Parse and validate user data
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      // Create the user
      const user = await storage.createUser(userData);
      
      // Set the user ID in session
      if (req.session) {
        req.session.userId = user.id;
      }
      
      // Return user data (excluding password)
      const { password, ...userWithoutPassword } = user;
      return res.status(201).json(userWithoutPassword);
    } catch (err) {
      return handleZodError(err, res);
    }
  });
  
  // User login
  apiRouter.post("/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      
      // Find the user
      const user = await storage.getUserByUsername(username);
      
      // Check if user exists and password matches
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Set the user ID in session
      if (req.session) {
        req.session.userId = user.id;
      }
      
      // Return user data (excluding password)
      const { password: _, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // User logout
  apiRouter.post("/logout", (req: Request, res: Response) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to logout" });
        }
        res.clearCookie("connect.sid");
        return res.json({ message: "Logged out successfully" });
      });
    } else {
      return res.json({ message: "No active session" });
    }
  });
  
  // Get current user (if authenticated)
  apiRouter.get("/user", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Get user data
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        if (req.session) {
          req.session.destroy(() => {});
        }
        return res.status(401).json({ message: "User not found" });
      }
      
      // Return user data (excluding password)
      const { password, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get search history for current user
  apiRouter.get("/search-history", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Get search history
      const history = await storage.getSearchHistoryByUser(req.session.userId);
      
      return res.json(history);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to fetch search history" });
    }
  });
  
  // Get deletion requests for current user
  apiRouter.get("/deletion-requests", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Get deletion requests
      const requests = await storage.getDeletionRequestsByUser(req.session.userId);
      
      return res.json(requests);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to fetch deletion requests" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}
