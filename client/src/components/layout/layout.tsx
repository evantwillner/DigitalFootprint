import Sidebar from "@/components/layout/sidebar";
import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
