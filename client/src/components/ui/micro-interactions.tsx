import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

// Animated success checkmark
export function SuccessCheckmark({ 
  className, 
  size = "md" 
}: { 
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16"
  };
  
  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <motion.div 
        className="absolute inset-0 rounded-full bg-green-100"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      <motion.div 
        className="absolute inset-0 flex items-center justify-center text-green-600"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3, type: "spring" }}
      >
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="3" 
          className="w-2/3 h-2/3"
        >
          <motion.path
            d="M5 13l4 4L19 7"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

// Animated error indicator
export function ErrorIndicator({ 
  className, 
  size = "md" 
}: { 
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16"
  };
  
  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <motion.div 
        className="absolute inset-0 rounded-full bg-red-100"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      <motion.div 
        className="absolute inset-0 flex items-center justify-center text-red-600"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3, type: "spring" }}
      >
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="3" 
          className="w-2/3 h-2/3"
        >
          <motion.path
            d="M18 6L6 18M6 6l12 12"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

// Animated notification dot
export function NotificationDot({
  className,
  ping = true,
  color = "red"
}: {
  className?: string;
  ping?: boolean;
  color?: "red" | "green" | "blue" | "yellow" | "purple";
}) {
  const colorClasses = {
    red: "bg-red-500",
    green: "bg-green-500",
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500"
  };
  
  return (
    <span className={cn("relative flex h-3 w-3", className)}>
      <span className={cn(
        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
        colorClasses[color],
        !ping && "hidden"
      )} />
      <span className={cn(
        "relative inline-flex rounded-full h-3 w-3",
        colorClasses[color]
      )} />
    </span>
  );
}

// Animated tooltip
interface AnimatedTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  className?: string;
  delayShow?: number;
}

export function AnimatedTooltip({
  content,
  children,
  side = "top",
  align = "center",
  className,
  delayShow = 0.2
}: AnimatedTooltipProps) {
  const [showTooltip, setShowTooltip] = React.useState(false);
  
  const positions = {
    top: { y: -5, originY: 1 },
    bottom: { y: 5, originY: 0 },
    left: { x: -5, originX: 1 },
    right: { x: 5, originX: 0 }
  };
  
  const alignments = {
    start: { justify: "flex-start" },
    center: { justify: "center" },
    end: { justify: "flex-end" }
  };
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      {children}
      
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ 
              opacity: 0, 
              scale: 0.8,
              ...positions[side]
            }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              y: side === "top" ? -8 : side === "bottom" ? 8 : 0,
              x: side === "left" ? -8 : side === "right" ? 8 : 0
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.8,
              ...positions[side] 
            }}
            transition={{ 
              duration: 0.15,
              delay: delayShow
            }}
            style={{
              transformOrigin: `${side === "top" ? "bottom" : side === "bottom" ? "top" : "center"} ${side === "left" ? "right" : side === "right" ? "left" : "center"}`
            }}
            className={cn(
              "absolute z-50 px-3 py-1.5 text-xs font-medium text-white bg-zinc-800 rounded-md shadow-sm whitespace-nowrap",
              side === "top" && "bottom-full mb-2",
              side === "bottom" && "top-full mt-2",
              side === "left" && "right-full mr-2",
              side === "right" && "left-full ml-2",
              align === "start" && "left-0",
              align === "center" && "left-1/2 -translate-x-1/2",
              align === "end" && "right-0",
              className
            )}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Animated button effect (for click feedback)
export function AnimatedButtonEffect({
  className
}: {
  className?: string;
}) {
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = React.useState(false);
  
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsAnimating(true);
  };
  
  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      onClick={handleClick}
    >
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            initial={{ 
              scale: 0,
              opacity: 0.7,
            }}
            animate={{ 
              scale: 4,
              opacity: 0,
            }}
            exit={{ 
              opacity: 0,
            }}
            onAnimationComplete={() => setIsAnimating(false)}
            transition={{ duration: 0.5 }}
            className="absolute bg-white rounded-full pointer-events-none"
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              left: position.x - 10, // Center the effect at click position
              top: position.y - 10,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Animated count/number
interface AnimatedCountProps {
  value: number;
  duration?: number;
  formatFn?: (value: number) => string;
  className?: string;
}

export function AnimatedCount({
  value,
  duration = 1,
  formatFn,
  className
}: AnimatedCountProps) {
  const [displayValue, setDisplayValue] = React.useState(0);
  const previousValue = React.useRef(0);
  
  React.useEffect(() => {
    const startTime = Date.now();
    const startValue = previousValue.current;
    const endValue = value;
    const changeInValue = endValue - startValue;
    
    const updateValue = () => {
      const now = Date.now();
      const elapsedTime = Math.min((now - startTime) / (duration * 1000), 1);
      
      // Ease out function for smoother animation at the end
      const easeOutQuad = (t: number) => t * (2 - t);
      const easedProgress = easeOutQuad(elapsedTime);
      
      setDisplayValue(startValue + changeInValue * easedProgress);
      
      if (elapsedTime < 1) {
        requestAnimationFrame(updateValue);
      } else {
        setDisplayValue(endValue);
        previousValue.current = endValue;
      }
    };
    
    updateValue();
    return () => {
      previousValue.current = displayValue;
    };
  }, [value, duration]);
  
  const displayText = formatFn 
    ? formatFn(displayValue) 
    : Math.round(displayValue).toLocaleString();
  
  return (
    <span className={className}>
      {displayText}
    </span>
  );
}

// Typing animation for text
export function TypingAnimation({
  text,
  speed = 30,
  delay = 0,
  className
}: {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
}) {
  const [displayText, setDisplayText] = React.useState("");
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isComplete, setIsComplete] = React.useState(false);
  
  React.useEffect(() => {
    let timeoutId: number;
    
    if (currentIndex === 0) {
      timeoutId = window.setTimeout(() => {
        setCurrentIndex(1);
      }, delay);
      return () => clearTimeout(timeoutId);
    }
    
    if (currentIndex <= text.length) {
      timeoutId = window.setTimeout(() => {
        setDisplayText(text.substring(0, currentIndex));
        setCurrentIndex(currentIndex + 1);
        
        if (currentIndex === text.length) {
          setIsComplete(true);
        }
      }, speed);
    }
    
    return () => clearTimeout(timeoutId);
  }, [currentIndex, delay, speed, text]);
  
  return (
    <span className={className}>
      {displayText}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          aria-hidden="true"
        >
          |
        </motion.span>
      )}
    </span>
  );
}