import { cn } from "@/lib/utils";
import { PlatformCardProps } from "@/lib/types";

export default function PlatformCard({
  platform,
  icon,
  name,
  color,
  selected,
  onSelect
}: PlatformCardProps) {
  return (
    <div 
      className={cn(
        "platform-card border rounded-md p-3 flex flex-col items-center justify-center cursor-pointer transition-colors",
        selected 
          ? "border-primary bg-blue-50" 
          : "border-gray-200 hover:bg-blue-50 hover:border-primary"
      )}
      onClick={() => onSelect(platform)}
      data-platform={platform}
    >
      <div className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center text-white",
        color.startsWith("from-") ? `bg-gradient-to-tr ${color}` : color
      )}>
        {icon}
      </div>
      <span className="text-sm font-medium mt-2">{name}</span>
    </div>
  );
}
