import React, { useState, useEffect } from "react";
import { cva, type VariantProps } from "class-variance-authority";

// Sparkle variants for customization
const sparkleVariants = cva(
  "relative inline-flex items-center justify-center",
  {
    variants: {
      size: {
        default: "h-8 w-8",
        sm: "h-6 w-6",
        lg: "h-10 w-10",
        xl: "h-12 w-12",
      },
      color: {
        default: "text-yellow-300",
        gold: "text-amber-400",
        purple: "text-purple-500",
        blue: "text-blue-400",
        green: "text-emerald-400",
        red: "text-rose-500",
      },
      intensity: {
        low: "opacity-70",
        medium: "opacity-85",
        high: "opacity-100",
      },
    },
    defaultVariants: {
      size: "default",
      color: "default",
      intensity: "medium",
    },
  }
);

// Particle configuration for the sparkle effect
const particleConfig = {
  count: 8,         // Number of particles
  speed: 0.7,       // Movement speed
  lifetime: 1000,   // Milliseconds before disappearing
  size: 3,          // Size of sparkle particles
  spread: 50,       // Maximum distance from center
};

// Individual particle component
interface ParticleProps {
  x: number;
  y: number;
  color: string;
  size: number;
  lifetime: number;
}

// Single sparkle particle
const Particle: React.FC<ParticleProps> = ({ x, y, color, size, lifetime }) => {
  const [opacity, setOpacity] = useState(1);
  
  useEffect(() => {
    const fadeInterval = setInterval(() => {
      setOpacity((prev) => Math.max(0, prev - 0.05));
    }, lifetime / 20);
    
    return () => clearInterval(fadeInterval);
  }, [lifetime]);
  
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        opacity,
        transform: `scale(${opacity})`,
        transition: "transform 100ms ease-out",
      }}
    />
  );
};

// Main component props
export interface SparkleEffectProps extends VariantProps<typeof sparkleVariants> {
  active?: boolean;
  trigger?: "hover" | "click" | "auto";
  interval?: number; // Auto trigger interval in ms
  className?: string;
  children?: React.ReactNode;
}

// Main Sparkle component
export const SparkleEffect: React.FC<SparkleEffectProps> = ({
  active = false,
  trigger = "hover",
  interval = 3000,
  size,
  color,
  intensity,
  className = "",
  children,
}) => {
  const [particles, setParticles] = useState<ParticleProps[]>([]);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [isActive, setIsActive] = useState(active);
  
  // Color mapping based on variant
  const getColorValue = () => {
    switch (color) {
      case "gold": return "#fbbf24";
      case "purple": return "#a855f7";
      case "blue": return "#60a5fa";
      case "green": return "#34d399";
      case "red": return "#f43f5e";
      default: return "#fcd34d"; // default yellow
    }
  };
  
  // Function to create the sparkle effect
  const createSparkle = () => {
    if (!containerRef) return;
    
    const containerRect = containerRef.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    
    const newParticles = [];
    
    // Create particles in a circular pattern
    for (let i = 0; i < particleConfig.count; i++) {
      const angle = (i / particleConfig.count) * 2 * Math.PI;
      const distance = Math.random() * particleConfig.spread;
      
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      newParticles.push({
        x,
        y,
        color: getColorValue(),
        size: particleConfig.size + Math.random() * 2,
        lifetime: particleConfig.lifetime,
      });
    }
    
    setParticles(newParticles);
    
    // Clean up particles after their lifetime
    setTimeout(() => {
      setParticles([]);
    }, particleConfig.lifetime);
  };
  
  // Auto trigger for sparkles
  useEffect(() => {
    if (trigger === "auto" || isActive) {
      const autoInterval = setInterval(() => {
        createSparkle();
      }, interval);
      
      return () => clearInterval(autoInterval);
    }
  }, [trigger, isActive, interval]);
  
  // Initial sparkle on mount if active
  useEffect(() => {
    if (active) {
      createSparkle();
    }
  }, [active]);
  
  // Update active state when prop changes
  useEffect(() => {
    setIsActive(active);
  }, [active]);
  
  // Event handlers
  const handleInteraction = () => {
    if (trigger === "click") {
      createSparkle();
    }
  };
  
  const handleMouseEnter = () => {
    if (trigger === "hover") {
      createSparkle();
    }
  };
  
  return (
    <div
      ref={setContainerRef}
      className={`${sparkleVariants({ size, color, intensity })} ${className}`}
      onClick={handleInteraction}
      onMouseEnter={handleMouseEnter}
    >
      {particles.map((particle, index) => (
        <Particle
          key={`particle-${index}`}
          x={particle.x}
          y={particle.y}
          color={particle.color}
          size={particle.size}
          lifetime={particle.lifetime}
        />
      ))}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// Higher-order component for wrapping elements with sparkle effect
export interface SparkleWrapperProps extends SparkleEffectProps {
  tag?: keyof JSX.IntrinsicElements;
}

export const SparkleWrapper: React.FC<SparkleWrapperProps> = ({
  tag = "div",
  className = "",
  children,
  ...sparkleProps
}) => {
  const Component = tag as any;
  
  return (
    <Component className={`relative ${className}`}>
      <SparkleEffect {...sparkleProps}>
        {children}
      </SparkleEffect>
    </Component>
  );
};

// Helper component for specifically highlighting new insights
export interface NewInsightProps extends Omit<SparkleEffectProps, 'trigger' | 'interval'> {
  insight?: string;
  highlightText?: boolean;
}

export const NewInsight: React.FC<NewInsightProps> = ({
  insight,
  highlightText = true,
  className = "",
  children,
  ...sparkleProps
}) => {
  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <SparkleEffect
        trigger="auto"
        interval={5000}
        color="gold"
        {...sparkleProps}
      >
        <div className={`${highlightText ? "text-amber-500 font-medium" : ""}`}>
          {children || insight}
        </div>
      </SparkleEffect>
      {insight && highlightText && (
        <span className="text-xs text-amber-600 mt-1 opacity-80">New insight!</span>
      )}
    </div>
  );
};

export default SparkleEffect;