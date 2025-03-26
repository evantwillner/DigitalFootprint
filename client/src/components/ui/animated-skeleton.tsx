import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AnimatedSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "card" | "text" | "circular" | "image" | "profile" | "metric";
  count?: number;
  animate?: boolean;
}

export function AnimatedSkeleton({
  className,
  variant = "text",
  count = 1,
  animate = true,
  ...props
}: AnimatedSkeletonProps) {
  
  const renderSkeleton = (index: number) => {
    // The animation overlay with gradient
    const animationOverlay = animate ? (
      <motion.div
        className="absolute inset-0 w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: [0.05, 0.15, 0.05] 
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "easeInOut",
          delay: index * 0.1
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shine" />
      </motion.div>
    ) : null;
    
    // Pulse animation for subtle breathing effect
    const pulseAnimation = animate ? {
      animate: { 
        opacity: [0.7, 0.9, 0.7],
        scale: variant === "circular" ? [0.97, 1, 0.97] : undefined
      },
      transition: { 
        repeat: Infinity,
        duration: 2,
        ease: "easeInOut", 
        delay: index * 0.05
      }
    } : {};
    
    switch (variant) {
      case "card":
        return (
          <motion.div
            key={index}
            className={cn(
              "h-[180px] rounded-lg bg-muted/70 overflow-hidden relative",
              className
            )}
            {...pulseAnimation}
            {...props}
          >
            {animationOverlay}
            <div className="absolute bottom-0 w-full px-4 py-4 space-y-2">
              <div className="h-4 w-2/3 rounded-md bg-muted/90" />
              <div className="h-3 w-4/5 rounded-md bg-muted/90" />
              <div className="h-3 w-1/2 rounded-md bg-muted/90" />
            </div>
          </motion.div>
        );
      
      case "circular":
        return (
          <motion.div
            key={index}
            className={cn(
              "w-12 h-12 rounded-full bg-muted/70 relative",
              className
            )}
            {...pulseAnimation}
            {...props}
          >
            {animationOverlay}
          </motion.div>
        );
      
      case "image":
        return (
          <motion.div
            key={index}
            className={cn(
              "h-40 rounded-md bg-muted/70 relative overflow-hidden",
              className
            )}
            {...pulseAnimation}
            {...props}
          >
            {animationOverlay}
          </motion.div>
        );
        
      case "profile":
        return (
          <motion.div
            key={index}
            className={cn(
              "flex items-center space-x-4 relative",
              className
            )}
            {...props}
          >
            <motion.div
              className="w-10 h-10 rounded-full bg-muted/70 relative overflow-hidden"
              {...pulseAnimation}
            >
              {animationOverlay}
            </motion.div>
            
            <div className="space-y-2 flex-1">
              <motion.div 
                className="h-4 w-3/4 rounded-md bg-muted/70 relative overflow-hidden"
                {...pulseAnimation}
              >
                {animationOverlay}
              </motion.div>
              <motion.div 
                className="h-3 w-1/2 rounded-md bg-muted/70 relative overflow-hidden"
                {...pulseAnimation}
                transition={{ 
                  ...pulseAnimation.transition,
                  delay: (index * 0.05) + 0.1 
                }}
              >
                {animationOverlay}
              </motion.div>
            </div>
          </motion.div>
        );
        
      case "metric":
        return (
          <motion.div
            key={index}
            className={cn(
              "space-y-2 relative",
              className
            )}
            {...props}
          >
            <motion.div 
              className="h-8 w-1/2 rounded-md bg-muted/70 relative overflow-hidden"
              {...pulseAnimation}
            >
              {animationOverlay}
            </motion.div>
            <motion.div 
              className="h-4 w-3/4 rounded-md bg-muted/70 relative overflow-hidden"
              {...pulseAnimation}
              transition={{ 
                ...pulseAnimation.transition,
                delay: (index * 0.05) + 0.1 
              }}
            >
              {animationOverlay}
            </motion.div>
          </motion.div>
        );
        
      default: // text
        return (
          <motion.div
            key={index}
            className={cn(
              "h-4 rounded-md bg-muted/70 relative overflow-hidden",
              className
            )}
            {...pulseAnimation}
            {...props}
          >
            {animationOverlay}
          </motion.div>
        );
    }
  };
  
  return (
    <div className="w-full">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={count > 1 ? "mb-3" : undefined}>
          {renderSkeleton(index)}
        </div>
      ))}
    </div>
  );
}