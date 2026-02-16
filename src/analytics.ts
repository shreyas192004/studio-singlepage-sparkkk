// src/analytics.ts

// 1. **Install Types:** For full type safety, it's highly recommended to install the official types:
//    npm install --save-dev @types/gtag.js
//    This allows you to use Gtag.Gtag and Gtag.CustomParams interfaces.

// Define the global gtag interface (Fallback if @types/gtag.js isn't installed or configured)
declare global {
  interface Window {
    gtag: Gtag.Gtag | undefined; // Explicitly define as Gtag type or undefined
  }
}

// 2. **Measurement ID & Environment Check:**
// In a production app, the ID should typically come from an environment variable (e.g., in .env.production).
// For this example, we'll use a placeholder variable.
const GA_MEASUREMENT_ID: string = 'G-G********'; 

/**
 * Safely calls the global gtag function.
 * @param command The gtag command (e.g., 'config', 'event')
 * @param target The measurement ID or event name
 * @param params Optional parameters object
 */
const safeGtagCall = (
  command: string,
  target: string,
  params?: Gtag.CustomParams
): void => {
  // Check 1: Ensure we are in a browser environment (avoids SSR errors)
  if (typeof window === 'undefined') {
    return;
  }

  // Check 2: Ensure the gtag function has been successfully loaded
  // (It is set up in your public/index.html file)
  if (typeof window.gtag === 'function') {
    window.gtag(command, target, params);
  } else if (process.env.NODE_ENV !== 'production') {
    // Optional: Log a warning ONLY in non-production environments for debugging
    console.warn("GA: gtag function not available. Analytics call not sent.", { command, target, params });
  }
};

/**
 * Sends a 'page_view' event to Google Analytics 4 for virtual page changes.
 * This is the core function for Single Page Application (SPA) tracking.
 * @param path The relative path of the page (e.g., '/products/new')
 * @param title The page title
 */
export const trackPageChange = (path: string, title: string): void => {
  safeGtagCall('config', GA_MEASUREMENT_ID, {
    // Use the 'config' command with the 'page_path' parameter to manually set the URL
    'page_path': path,
    'page_title': title,
    // Note: The 'send_to' parameter is implicitly handled by the GA_MEASUREMENT_ID in 'config'
    // If you explicitly wanted a page_view event: 
    // window.gtag('event', 'page_view', { page_path: path, page_title: title, send_to: GA_MEASUREMENT_ID });
  });
};


/**
 * Sends a custom event to Google Analytics 4.
 * @param eventName The name of the custom event (e.g., 'search', 'add_to_cart')
 * @param params A map of event parameters
 */
export const trackEvent = (
  eventName: string,
  params: Gtag.CustomParams
): void => {
  safeGtagCall('event', eventName, {
    ...params,
    send_to: GA_MEASUREMENT_ID, // Explicitly target your GA4 property
  });
};