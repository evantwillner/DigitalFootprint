import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SummaryTab from "@/components/results/summary-tab";
import ActivityTab from "@/components/results/activity-tab";
import TimelineTab from "@/components/results/timeline-tab";
import ContentTab from "@/components/results/content-tab";
import ConnectionsTab from "@/components/results/connections-tab";
import RecommendationsTab from "@/components/results/recommendations-tab";
import { DigitalFootprintResponse } from "@shared/schema";
import { RESULT_TABS } from "@/lib/constants";

interface ResultsTabsProps {
  data: DigitalFootprintResponse | undefined;
  isLoading: boolean;
}

export default function ResultsTabs({ data, isLoading }: ResultsTabsProps) {
  const [activeTab, setActiveTab] = useState("summary");

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
      <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-gray-200 overflow-x-auto">
          <TabsList className="h-auto p-0">
            {RESULT_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="py-4 px-6 rounded-none border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-medium"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        
        <TabsContent value="summary" className="p-6">
          <SummaryTab data={data} isLoading={isLoading} />
        </TabsContent>
        
        <TabsContent value="activity" className="p-6">
          <ActivityTab data={data} isLoading={isLoading} />
        </TabsContent>
        
        <TabsContent value="timeline" className="p-6">
          <TimelineTab data={data} isLoading={isLoading} />
        </TabsContent>
        
        <TabsContent value="content" className="p-6">
          <ContentTab data={data} isLoading={isLoading} />
        </TabsContent>
        
        <TabsContent value="connections" className="p-6">
          <ConnectionsTab data={data} isLoading={isLoading} />
        </TabsContent>
        
        <TabsContent value="recommendations" className="p-6">
          <RecommendationsTab data={data} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
