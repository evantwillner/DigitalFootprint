import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PricingCardProps } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function PricingCard({
  name,
  price,
  description,
  features,
  isPopular = false,
  onSelect
}: PricingCardProps) {
  return (
    <Card className={cn(
      "overflow-hidden",
      isPopular ? "border-2 border-primary relative shadow-md" : "border border-gray-200 shadow-sm"
    )}>
      {isPopular && (
        <div className="absolute top-0 right-0 bg-primary text-white text-xs font-medium px-3 py-1 rounded-bl-lg">
          MOST POPULAR
        </div>
      )}
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-2">{name}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <div className="flex items-baseline mb-4">
          <span className="text-3xl font-bold">${price}</span>
          <span className="text-gray-500 ml-1">/month</span>
        </div>
        <ul className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <span className="text-[#10b981] mr-2 text-sm">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </span>
              <span className="text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          onClick={() => onSelect(name)}
          className={cn(
            "w-full py-3",
            isPopular 
              ? "bg-primary text-white hover:bg-blue-600" 
              : "bg-white border border-primary text-primary hover:bg-blue-50"
          )}
        >
          Choose {name.split(' ')[0]}
        </Button>
      </CardContent>
    </Card>
  );
}
