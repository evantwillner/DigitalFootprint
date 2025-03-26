import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";

const spinnerVariants = cva(
  "relative inline-flex items-center justify-center overflow-hidden",
  {
    variants: {
      size: {
        sm: "w-6 h-6",
        md: "w-10 h-10", 
        lg: "w-16 h-16",
        xl: "w-24 h-24",
      },
      variant: {
        default: "text-primary",
        success: "text-green-500",
        warning: "text-amber-500", 
        error: "text-red-500",
        info: "text-blue-500"
      }
    },
    defaultVariants: {
      size: "md",
      variant: "default"
    },
  }
);

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  message?: string;
  showMessage?: boolean;
}

export function LoadingSpinner({
  className,
  size,
  variant,
  message = "Loading...",
  showMessage = false,
  ...props
}: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3" {...props}>
      <div className={cn(spinnerVariants({ size, variant }), className)}>
        <motion.div 
          className="absolute w-full h-full border-4 rounded-full opacity-30"
          style={{ borderColor: "currentColor" }}
        />
        
        <motion.div 
          className="absolute w-full h-full border-4 border-transparent rounded-full" 
          style={{ borderTopColor: "currentColor" }}
          animate={{ rotate: 360 }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />
        
        <motion.div
          className="absolute w-2/3 h-2/3 border-4 border-transparent rounded-full"
          style={{ borderBottomColor: "currentColor" }}
          animate={{ rotate: -360 }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />
      </div>
      
      {showMessage && (
        <motion.p 
          className="text-center text-sm font-medium text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}