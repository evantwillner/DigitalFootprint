import { Button } from "@/components/ui/button";
import { Download, Share, Printer, Clock } from "lucide-react";

interface ResultsHeaderProps {
  username: string;
  platformCount: number;
  onExport: () => void;
  onShare: () => void;
  onPrint: () => void;
}

export default function ResultsHeader({
  username,
  platformCount,
  onExport,
  onShare,
  onPrint
}: ResultsHeaderProps) {
  return (
    <div className="fade-in flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b">
      <div>
        <h1 className="heading-gradient mb-1">Digital Footprint Analysis</h1>
        <div className="flex items-center text-muted-foreground">
          <Clock className="h-4 w-4 mr-1.5 text-purple-400" />
          <p>
            Analysis for <span className="font-semibold text-foreground">@{username}</span> across <span className="font-semibold text-foreground">{platformCount} platforms</span>
          </p>
        </div>
      </div>
      <div className="mt-4 md:mt-0">
        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="flex items-center gap-1.5 transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            className="flex items-center gap-1.5 transition-all"
          >
            <Share className="h-4 w-4" />
            <span>Share</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="flex items-center gap-1.5 transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
