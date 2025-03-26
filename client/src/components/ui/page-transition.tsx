import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import React from "react";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  transition?: "fade" | "slide" | "scale" | "flip" | "reveal";
}

export function PageTransition({
  children,
  className,
  transition = "fade"
}: PageTransitionProps) {
  const [location] = useLocation();
  
  // Different animation variants
  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    slide: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 }
    },
    scale: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 1.02 }
    },
    flip: {
      initial: { opacity: 0, rotateY: 90 },
      animate: { opacity: 1, rotateY: 0 },
      exit: { opacity: 0, rotateY: -90 }
    },
    reveal: {
      initial: { opacity: 0, y: 20, filter: "blur(8px)" },
      animate: { opacity: 1, y: 0, filter: "blur(0px)" },
      exit: { opacity: 0, y: -20, filter: "blur(8px)" }
    }
  };
  
  // Transitions for each animation type
  const transitions = {
    fade: { duration: 0.3 },
    slide: { duration: 0.3, ease: "easeInOut" },
    scale: { duration: 0.4, ease: "easeOut" },
    flip: { duration: 0.5, ease: "easeInOut" },
    reveal: { duration: 0.5, ease: [0.2, 0.65, 0.3, 0.9] }
  };
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={variants[transition].initial}
        animate={variants[transition].animate}
        exit={variants[transition].exit}
        transition={transitions[transition]}
        className={cn("w-full", className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Animated route change indicator (progress bar at top of page)
export function RouteChangeIndicator() {
  const [isChanging, setIsChanging] = React.useState(false);
  const [location, setLocation] = useLocation();
  const prevLocation = React.useRef(location);
  
  React.useEffect(() => {
    const handleRouteChange = () => {
      if (prevLocation.current !== location) {
        setIsChanging(true);
        prevLocation.current = location;
        
        // After animation completes
        const timeout = setTimeout(() => {
          setIsChanging(false);
        }, 500); // Match this with the animation duration
        
        return () => clearTimeout(timeout);
      }
    };
    
    handleRouteChange();
  }, [location]);
  
  return (
    <AnimatePresence>
      {isChanging && (
        <motion.div
          className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 z-50"
          initial={{ width: "0%", opacity: 1 }}
          animate={{ width: "100%", opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </AnimatePresence>
  );
}