import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FullscreenLoaderProps {
  isLoading: boolean;
  message?: string;
  overlay?: boolean;
  className?: string;
}

export function FullscreenLoader({
  isLoading,
  message = "Loading your experience...",
  overlay = true,
  className
}: FullscreenLoaderProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center",
            overlay ? "bg-background/80 backdrop-blur-sm" : "",
            className
          )}
        >
          <div className="flex flex-col items-center max-w-sm text-center">
            <motion.div 
              className="relative w-24 h-24"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Outer spinning rings */}
              <motion.div
                className="absolute inset-0 border-4 border-primary/20 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ 
                  duration: 8, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
              />
              
              <motion.div
                className="absolute inset-2 border-4 border-transparent border-t-primary/40 border-r-primary/40 rounded-full"
                animate={{ rotate: -360 }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
              />
              
              {/* Pulsing inner circle */}
              <motion.div
                className="absolute inset-4 bg-gradient-to-br from-primary/80 to-primary rounded-full"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Particles */}
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-primary rounded-full"
                  initial={{ 
                    x: 0, 
                    y: 0,
                    scale: 0
                  }}
                  animate={{ 
                    x: [0, Math.cos(i * Math.PI/2.5) * 40],
                    y: [0, Math.sin(i * Math.PI/2.5) * 40],
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeOut"
                  }}
                />
              ))}
            </motion.div>
            
            <motion.p
              className="mt-6 text-base font-medium bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-foreground"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {message}
            </motion.p>
            
            <motion.div 
              className="flex space-x-1 mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary/60"
                  animate={{ 
                    y: [0, -5, 0],
                    opacity: [0.4, 1, 0.4]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}