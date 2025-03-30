import { Platform } from "@shared/schema";
import { TabItem } from "@/lib/types";

export const AVAILABLE_PLATFORMS: Platform[] = [
  "instagram",
  "facebook",
  "reddit",
  "twitter",
  "linkedin",
  "all"
];

export const RESULT_TABS: TabItem[] = [
  { id: "summary", label: "Summary" },
  { id: "activity", label: "Activity Analysis" },
  { id: "timeline", label: "Interactive Timeline" },
  { id: "content", label: "Content Analysis" },
  { id: "connections", label: "Connections" },
  { id: "recommendations", label: "Recommendations" }
];

export const PAGE_TITLES = {
  home: "Digital Footprint Analyzer",
  search: "Search Digital Footprints",
  results: "Footprint Analysis Results",
  pricing: "Pricing Plans",
  settings: "Account Settings",
  history: "Search History",
  deletion: "Deletion Requests",
  sparkle: "Sparkle Effect for Insights",
  help: "Help & Support"
};

export const NAV_ITEMS = [
  { name: "Search", path: "/search", icon: "search" },
  { name: "Dashboard", path: "/", icon: "dashboard" },
  { name: "Recent Searches", path: "/history", icon: "history" },
  { name: "Deletion Requests", path: "/deletion", icon: "delete" },
  { name: "Sparkle Effects", path: "/sparkle", icon: "auto_awesome" },
  { name: "Settings", path: "/settings", icon: "settings" }
];

export const SIDEBAR_FOOTER_ITEMS = [
  { name: "Help & Support", path: "/help", icon: "help" }
];

export const ERROR_MESSAGES = {
  required: "This field is required",
  minLength: "Input is too short",
  invalidUsername: "Invalid username format",
  serverError: "Server error occurred. Please try again."
};

export const SUCCESS_MESSAGES = {
  search: "Search completed successfully",
  deletion: "Deletion request submitted successfully",
  signup: "Account created successfully",
  login: "Logged in successfully",
  logout: "Logged out successfully"
};

export const DELETION_TIERS = [
  {
    id: "basic",
    name: "Basic Cleanup",
    price: 19,
    description: "Essential protection for casual internet users",
    features: [
      "Single platform cleanup",
      "Remove up to 50 items monthly",
      "Basic privacy recommendations",
      "Email support"
    ]
  },
  {
    id: "pro",
    name: "Pro Cleanup",
    price: 39,
    description: "Comprehensive protection for active users",
    features: [
      "Multi-platform cleanup (up to 3)",
      "Remove up to 200 items monthly",
      "Advanced privacy recommendations",
      "Priority email & chat support",
      "Monthly privacy report"
    ],
    isPopular: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    description: "Maximum protection for public figures",
    features: [
      "All platforms cleanup",
      "Unlimited item removal",
      "Custom privacy strategy",
      "24/7 dedicated support",
      "Real-time monitoring",
      "Digital reputation management"
    ]
  }
];
