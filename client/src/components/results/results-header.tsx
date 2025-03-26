import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-semibold">Digital Footprint Results</h2>
        <p className="text-gray-600">
          Showing analysis for <span className="font-medium">{username}</span> across {platformCount} platforms
        </p>
      </div>
      <div className="mt-3 md:mt-0">
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onExport}
            title="Export"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onShare}
            title="Share"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
              <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrint}
            title="Print"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect width="12" height="8" x="6" y="14" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
