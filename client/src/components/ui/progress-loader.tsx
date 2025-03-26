import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";

interface ProgressLoaderProps {
  value?: number;
  indeterminate?: boolean;
  showLabel?: boolean;
  className?: string;
  color?: "default" | "success" | "warning" | "error";
  message?: string;
  autoIncrement?: boolean;
}

export function ProgressLoader({
  value = 0,
  indeterminate = false,
  showLabel = true,
  className,
  color = "default",
  message,
  autoIncrement = false,
}: ProgressLoaderProps) {
  const [progressValue, setProgressValue] = useState(value);
  
  // Auto increment for indeterminate progress situations
  useEffect(() => {
    if (!indeterminate && !autoIncrement) {
      setProgressValue(value);
      return;
    }
    
    if (autoIncrement) {
      // Cap the auto progress at 90% to avoid false completion appearance
      if (progressValue < 90) {
        const timer = setTimeout(() => {
          // Slow down as we approach 90%
          const increment = Math.max(0.1, (90 - progressValue) / 15);
          setProgressValue((prev) => Math.min(prev + increment, 90));
        }, 300);
        
        return () => clearTimeout(timer);
      }
    }
  }, [indeterminate, progressValue, value, autoIncrement]);
  
  // Reset to real value when provided
  useEffect(() => {
    if (!indeterminate && !autoIncrement && value !== progressValue) {
      setProgressValue(value);
    }
  }, [value, indeterminate, autoIncrement, progressValue]);
  
  // Color classes
  const colorClasses = {
    default: "from-primary/50 to-primary",
    success: "from-green-500/50 to-green-500",
    warning: "from-amber-500/50 to-amber-500",
    error: "from-red-500/50 to-red-500"
  };
  
  return (
    <div className={cn("w-full max-w-md", className)}>
      <div className="relative">
        <Progress 
          value={indeterminate ? undefined : progressValue} 
          className={cn(
            "h-2.5 rounded-full overflow-hidden", 
            indeterminate ? "animate-pulse" : ""
          )}
        />
        
        {indeterminate && (
          <motion.div 
            className={cn(
              "absolute h-full top-0 left-0 bottom-0 w-1/4 bg-gradient-to-r rounded-full", 
              colorClasses[color]
            )}
            animate={{ 
              x: ["-100%", "400%"],
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 2,
              ease: "easeInOut",
            }}
          />
        )}
      </div>
      
      <div className="flex items-center justify-between mt-2">
        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}
        
        {showLabel && !indeterminate && (
          <motion.span 
            key={Math.floor(progressValue)}
            className="text-xs font-medium text-muted-foreground ml-auto"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {Math.floor(progressValue)}%
          </motion.span>
        )}
      </div>
    </div>
  );
}