import Sidebar from "@/components/layout/sidebar";
import { useLocation } from "wouter";
import React, { useEffect } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  
  // This effect handles page transitions and scroll resets
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  // Check if we're on the auth page
  const isAuthPage = location === "/auth";
  
  if (isAuthPage) {
    return <main className="min-h-screen">{children}</main>;
  }
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50/40">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="fade-in max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
