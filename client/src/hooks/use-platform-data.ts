import { useEffect, useState } from "react";
import { DigitalFootprintResponse } from "@shared/schema";
import { useLocation } from "wouter";

interface UsePlatformDataResult {
  data: DigitalFootprintResponse | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom hook for retrieving digital footprint data
 * This hook checks sessionStorage for existing results
 * or redirects to the search page if none are found
 */
export default function usePlatformData(): UsePlatformDataResult {
  const [data, setData] = useState<DigitalFootprintResponse>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Try to get data from sessionStorage
        const storedData = sessionStorage.getItem("searchResults");
        
        if (storedData) {
          const parsedData = JSON.parse(storedData) as DigitalFootprintResponse;
          setData(parsedData);
        } else {
          // If no data found, redirect to search page
          navigate("/search");
          throw new Error("No search results found. Please perform a search first.");
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  return { data, isLoading, error };
}
