// src/hooks/usePageTracking.ts

import { useEffect } from 'react';
// Assuming you are using react-router-dom for your routing:
import { useLocation } from 'react-router-dom'; 
import { trackPageChange } from '../analytics';

const usePageTracking = (): void => {
  const location = useLocation();

  useEffect(() => {
    // Construct the full path (including query parameters if they exist)
    const path = location.pathname + location.search;
    
    // Call the utility function to track the new page view
    trackPageChange(path, document.title); 

  }, [location]); // Dependency on location ensures the effect re-runs on route change
};

export default usePageTracking;