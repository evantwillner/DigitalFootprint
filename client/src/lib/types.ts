import { 
  SearchQuery, 
  Platform, 
  PlatformData, 
  DigitalFootprintResponse 
} from "@shared/schema";

export interface PlatformCardProps {
  platform: Platform;
  icon: React.ReactNode;
  name: string;
  color: string;
  selected: boolean;
  onSelect: (platform: Platform) => void;
}

export interface PlatformConfig {
  name: string;
  icon: React.ReactNode;
  color: string;
}

export interface SearchFormValues {
  username: string;
  platform?: Platform;
  selectedPlatforms?: Platform[];
  platformUsernames?: { platform: Platform, username: string }[];
}

export interface TabContentProps {
  data: DigitalFootprintResponse | undefined;
  isLoading: boolean;
}

export interface PricingCardProps {
  name: string;
  price: number;
  description: string;
  features: string[];
  isPopular?: boolean;
  onSelect: (planName: string) => void;
}

export interface InsightItem {
  insight: string;
  type: "info" | "warning";
}

export interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  description?: string;
  icon?: React.ReactNode;
  progress?: number;
  additional?: React.ReactNode;
}

export interface ChartData {
  name: string;
  value: number;
}

export interface TabItem {
  id: string;
  label: string;
}
