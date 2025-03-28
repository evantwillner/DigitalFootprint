import React, { useEffect, useState } from 'react';

interface SparkleProps {
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}

const generateSparklePosition = () => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  size: Math.random() * 0.6 + 0.4, // Between 0.4 and 1
  delay: Math.random() * 0.5,
  rotation: Math.random() * 360,
});

const Sparkle: React.FC<SparkleProps> = ({ 
  color = "#FFC700", 
  size = 16, 
  style = {} 
}) => {
  const [position] = useState(generateSparklePosition());
  
  return (
    <span
      className="absolute inline-block animate-sparkle-fade"
      style={{
        left: position.left,
        top: position.top,
        width: size * position.size,
        height: size * position.size,
        animationDelay: `${position.delay}s`,
        transform: `rotate(${position.rotation}deg)`,
        ...style
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M80 0C80 0 84.2846 41.2925 101.496 58.504C118.707 75.7154 160 80 160 80C160 80 118.707 84.2846 101.496 101.496C84.2846 118.707 80 160 80 160C80 160 75.7154 118.707 58.504 101.496C41.2925 84.2846 0 80 0 80C0 80 41.2925 75.7154 58.504 58.504C75.7154 41.2925 80 0 80 0Z"
          fill={color}
        />
      </svg>
    </span>
  );
};

interface SparkleEffectProps {
  children: React.ReactNode;
  isActive?: boolean;
  sparkleCount?: number;
  colors?: string[];
  className?: string;
  size?: number;
}

export const SparkleEffect: React.FC<SparkleEffectProps> = ({
  children,
  isActive = true,
  sparkleCount = 5,
  colors = ["#FFC700", "#FF6B6B", "#4DCCBD", "#9B5DE5"],
  className = "",
  size = 16
}) => {
  const [sparkles, setSparkles] = useState<number[]>([]);

  useEffect(() => {
    if (!isActive) {
      setSparkles([]);
      return;
    }
    
    // Initial sparkles
    setSparkles(Array.from({ length: sparkleCount }, (_, i) => i));
    
    // Refreshing sparkles periodically
    const interval = setInterval(() => {
      setSparkles(prev => {
        if (prev.length === 0) return [];
        
        // Remove one random sparkle and add a new one
        const sparkleIndexToRemove = Math.floor(Math.random() * prev.length);
        const newSparkles = [...prev];
        newSparkles.splice(sparkleIndexToRemove, 1);
        return [...newSparkles, prev.length];
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isActive, sparkleCount]);
  
  return (
    <div className={`relative inline-block ${className}`}>
      {isActive && sparkles.map(id => (
        <Sparkle 
          key={id} 
          color={colors[id % colors.length]}
          size={size}
        />
      ))}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default SparkleEffect;