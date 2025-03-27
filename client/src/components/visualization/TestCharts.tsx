import React from 'react';
import RedditVisualization from './RedditCharts';

/**
 * Simple test component to verify RedditVisualization works
 */
export default function TestCharts() {
  return (
    <div className="container mx-auto py-8">
      <h2 className="text-2xl font-bold mb-6">Reddit Data Visualization Test</h2>
      <RedditVisualization />
    </div>
  );
}