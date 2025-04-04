import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table definition
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

// Platform enumeration
export const platformEnum = z.enum([
  "all",
  "instagram",
  "facebook",
  "reddit",
  "twitter",
  "linkedin",
  "tiktok",
  "youtube",
  "pinterest",
  "snapchat",
  "github",
  "medium"
]);

export type Platform = z.infer<typeof platformEnum>;

// Schema for platform-specific username
export type PlatformUsername = {
  platform: Platform;
  username: string;
};

// Search query schema with support for both simple and platform-specific usernames
export const searchQuerySchema = z.object({
  // For backwards compatibility and simple single-username searches
  username: z.string().optional(),
  
  // New field for platform-specific usernames
  platformUsernames: z.array(z.object({
    platform: platformEnum,
    username: z.string().min(1, "Username is required")
  })).optional(),
  
  // Platforms to search
  platforms: z.array(platformEnum).min(1, "At least one platform must be selected"),
});

// Ensure at least username or platformUsernames is provided
export const searchQuerySchemaWithValidation = searchQuerySchema.refine(
  data => !!data.username || (!!data.platformUsernames && data.platformUsernames.length > 0),
  {
    message: "Either a global username or platform-specific usernames must be provided",
    path: ["username"]
  }
);

export type SearchQuery = z.infer<typeof searchQuerySchema>;

// History of searches
export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  username: text("username").notNull(),
  platforms: text("platforms").array().notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertSearchHistorySchema = createInsertSchema(searchHistory).omit({
  id: true,
  timestamp: true,
});

// Digital footprint data
export const digitalFootprints = pgTable("digital_footprints", {
  id: serial("id").primaryKey(),
  searchId: integer("search_id").references(() => searchHistory.id),
  platform: text("platform").notNull(),
  username: text("username").notNull(),
  data: jsonb("data").notNull(),
  analysisResults: jsonb("analysis_results").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertDigitalFootprintSchema = createInsertSchema(digitalFootprints).omit({
  id: true,
  timestamp: true,
});

// Deletion request
export const deletionRequests = pgTable("deletion_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  platforms: text("platforms").array().notNull(),
  status: text("status").notNull().default("pending"),
  details: jsonb("details").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertDeletionRequestSchema = createInsertSchema(deletionRequests).omit({
  id: true,
  timestamp: true,
});

// Subscription plan
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  features: text("features").array().notNull(),
  description: text("description").notNull(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  planId: integer("plan_id").references(() => subscriptionPlans.id),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  active: boolean("active").default(true),
});

// Export all types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type DigitalFootprint = typeof digitalFootprints.$inferSelect;
export type InsertDigitalFootprint = z.infer<typeof insertDigitalFootprintSchema>;
export type DeletionRequest = typeof deletionRequests.$inferSelect;
export type InsertDeletionRequest = z.infer<typeof insertDeletionRequestSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type UserSubscription = typeof userSubscriptions.$inferSelect;

// Define a more specific type for DeletionRequest details to use in the frontend
export type DeletionRequestDetails = {
  reason?: string;
  requestedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: unknown;
};

// API response schema for platform data
export const platformDataSchema = z.object({
  platformId: platformEnum,
  username: z.string(),
  profileData: z.object({
    displayName: z.string().optional(),
    bio: z.string().optional(),
    followerCount: z.number().optional(),
    followingCount: z.number().optional(),
    joinDate: z.string().optional(),
    profileUrl: z.string().optional(),
    avatarUrl: z.string().optional(),
    location: z.string().optional(),
    verified: z.boolean().optional(),
  }).optional(),
  activityData: z.object({
    totalPosts: z.number().optional(),
    totalComments: z.number().optional(),
    totalLikes: z.number().optional(),
    totalShares: z.number().optional(),
    postsPerDay: z.number().optional(),
    mostActiveTime: z.string().optional(),
    lastActive: z.string().optional(),
    topSubreddits: z.array(z.string()).optional(),
    topHashtags: z.array(z.string()).optional(),
  }).optional(),
  contentData: z.array(z.object({
    type: z.enum(["post", "comment", "like", "share"]),
    content: z.string().optional(),
    timestamp: z.string(),
    url: z.string().optional(),
    engagement: z.object({
      likes: z.number().optional(),
      comments: z.number().optional(),
      shares: z.number().optional(),
    }).optional(),
    sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
    topics: z.array(z.string()).optional(),
  })).optional(),
  privacyMetrics: z.object({
    exposureScore: z.number(),
    dataCategories: z.array(z.object({
      category: z.string(),
      severity: z.enum(["low", "medium", "high"]),
    })),
    potentialConcerns: z.array(z.object({
      issue: z.string(),
      risk: z.enum(["low", "medium", "high"]),
    })),
    recommendedActions: z.array(z.string()),
  }).optional(),
  analysisResults: z.object({
    exposureScore: z.number(),
    topTopics: z.array(z.object({
      topic: z.string(),
      percentage: z.number(),
    })),
    activityTimeline: z.array(z.object({
      period: z.string(),
      count: z.number(),
    })),
    sentimentBreakdown: z.object({
      positive: z.number(),
      neutral: z.number(),
      negative: z.number(),
    }),
    dataCategories: z.array(z.object({
      category: z.string(),
      severity: z.enum(["low", "medium", "high"]),
    })).optional(),
    privacyConcerns: z.array(z.object({
      type: z.string(),
      description: z.string(),
      severity: z.enum(["low", "medium", "high"]),
    })),
    recommendedActions: z.array(z.string()).optional(),
    platformSpecificMetrics: z.record(z.string(), z.any()).optional(),
  }).optional(),
});

export type PlatformData = z.infer<typeof platformDataSchema>;

// Aggregated response for multiple platforms
export const digitalFootprintResponseSchema = z.object({
  username: z.string(),
  timestamp: z.string(),
  platforms: z.array(platformEnum),
  platformData: z.array(platformDataSchema),
  summary: z.object({
    exposureScore: z.number(),
    platformsFound: z.number(),
    totalContentItems: z.number(),
    breakdownByType: z.object({
      posts: z.number(),
      comments: z.number(),
      likes: z.number(),
      shares: z.number(),
    }),
    topInsights: z.array(z.object({
      insight: z.string(),
      type: z.enum(["info", "warning"]),
    })),
    recommendations: z.array(z.string()),
  }),
  noDataMessage: z.string().optional(),
  platformErrors: z.record(z.string()).optional(),
});

export type DigitalFootprintResponse = z.infer<typeof digitalFootprintResponseSchema>;

// Mock subscription plans
export const subscriptionPlansData = [
  {
    id: 1,
    name: "Basic Cleanup",
    price: 19,
    features: [
      "Single platform cleanup",
      "Remove up to 50 items monthly",
      "Basic privacy recommendations",
      "Email support"
    ],
    description: "Essential protection for casual internet users"
  },
  {
    id: 2,
    name: "Pro Cleanup",
    price: 39,
    features: [
      "Multi-platform cleanup (up to 3)",
      "Remove up to 200 items monthly",
      "Advanced privacy recommendations",
      "Priority email & chat support",
      "Monthly privacy report"
    ],
    description: "Comprehensive protection for active users"
  },
  {
    id: 3,
    name: "Enterprise",
    price: 99,
    features: [
      "All platforms cleanup",
      "Unlimited item removal",
      "Custom privacy strategy",
      "24/7 dedicated support",
      "Real-time monitoring",
      "Digital reputation management"
    ],
    description: "Maximum protection for public figures"
  }
];
