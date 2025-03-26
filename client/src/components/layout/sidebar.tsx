import { Link, useLocation } from "wouter";
import { NAV_ITEMS, SIDEBAR_FOOTER_ITEMS } from "@/lib/constants";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <aside className="w-full md:w-64 bg-white border-r border-gray-200 md:min-h-screen">
      <div className="p-4 flex justify-between items-center md:justify-center md:py-6">
        <div className="flex items-center space-x-2">
          <span className="text-primary text-3xl">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          <span className="text-xl font-semibold">DigitalClear</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden" 
          onClick={toggleMobileMenu}
        >
          <span className="sr-only">Toggle menu</span>
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
            className="h-6 w-6"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </Button>
      </div>
      
      <nav className={cn("p-4", isMobileMenuOpen ? "block" : "hidden md:block")}>
        <ul className="space-y-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path;
            
            return (
              <li key={item.path} className={cn(
                "rounded-md", 
                isActive ? "bg-blue-50" : ""
              )}>
                <Link to={item.path}>
                  <div className={cn(
                    "flex items-center space-x-3 p-3 rounded-md font-medium",
                    isActive 
                      ? "text-primary" 
                      : "text-gray-600 hover:text-primary hover:bg-blue-50"
                  )}>
                    <span className="material-icons">{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className={cn(
        "absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200",
        isMobileMenuOpen ? "block" : "hidden md:block"
      )}>
        {SIDEBAR_FOOTER_ITEMS.map((item) => (
          <Link key={item.path} to={item.path}>
            <div className="flex items-center space-x-3 text-gray-600 hover:text-primary p-3 rounded-md hover:bg-blue-50">
              <span className="material-icons">{item.icon}</span>
              <span>{item.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}
