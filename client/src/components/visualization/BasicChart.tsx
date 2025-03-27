import React from 'react';

export default function BasicChart() {
  return (
    <div className="container mx-auto p-8">
      <h2 className="text-2xl font-bold mb-4">Basic Chart Test</h2>
      
      <div className="bg-blue-100 border border-blue-200 rounded-lg p-8 mb-8">
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-4">Chart Placeholder</div>
            <p className="text-gray-600">This is a basic placeholder to verify components load correctly</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-100 border border-green-200 rounded-lg p-4">
          <div className="h-48 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">Timeline Chart</div>
              <p className="text-gray-600">Simple placeholder for timeline</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="h-48 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">Communities Chart</div>
              <p className="text-gray-600">Simple placeholder for communities</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}