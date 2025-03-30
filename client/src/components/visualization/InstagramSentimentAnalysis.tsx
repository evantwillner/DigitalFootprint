import { Card, CardContent } from "@/components/ui/card";
import { PlatformData } from "@shared/schema";
import { SiInstagram } from "react-icons/si";

interface InstagramSentimentAnalysisProps {
  platformData: PlatformData;
  isLoading?: boolean;
}

export function InstagramSentimentAnalysis({ platformData, isLoading }: InstagramSentimentAnalysisProps) {
  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }
  
  if (!platformData || !platformData.analysisResults?.sentimentBreakdown) {
    return null;
  }
  
  // Extract sentiment data
  const sentimentData = platformData.analysisResults.sentimentBreakdown;
  
  // Convert to percentages
  const positive = Math.round(sentimentData.positive * 100);
  const neutral = Math.round(sentimentData.neutral * 100);
  const negative = Math.round(sentimentData.negative * 100);
  
  return (
    <Card className="bg-white rounded-lg overflow-hidden mb-8">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <SiInstagram className="mr-2 text-[#E1306C]" />
          Instagram Sentiment Analysis
        </h3>
        
        <p className="text-gray-600 mb-6">
          This analysis examines the emotional tone of your digital content:
        </p>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="flex flex-col items-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
              style={{ backgroundColor: "#4ade80" }}
            >
              <span className="text-white text-xl font-bold">{positive}%</span>
            </div>
            <h4 className="text-lg font-medium">Positive</h4>
            <p className="text-sm text-gray-600 text-center mt-1">
              Content with an optimistic or favorable tone
            </p>
          </div>
          
          <div className="flex flex-col items-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
              style={{ backgroundColor: "#666666" }}
            >
              <span className="text-white text-xl font-bold">{neutral}%</span>
            </div>
            <h4 className="text-lg font-medium">Neutral</h4>
            <p className="text-sm text-gray-600 text-center mt-1">
              Content with a balanced or informational tone
            </p>
          </div>
          
          <div className="flex flex-col items-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
              style={{ backgroundColor: "#ef4444" }}
            >
              <span className="text-white text-xl font-bold">{negative}%</span>
            </div>
            <h4 className="text-lg font-medium">Negative</h4>
            <p className="text-sm text-gray-600 text-center mt-1">
              Content with a critical or unfavorable tone
            </p>
          </div>
        </div>
        
        <div className="mt-6 text-sm text-gray-600">
          <p>Note: Sentiment analysis examines language patterns in your digital content to determine overall tone. This can help identify potentially problematic content that might be perceived negatively by others.</p>
        </div>
      </CardContent>
    </Card>
  );
}