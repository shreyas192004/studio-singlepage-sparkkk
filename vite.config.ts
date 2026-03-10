import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      // Prevent dev server from serving stale HTML
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Ensure Supabase env vars are always available (these are publishable keys)
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify("https://ubqxlkvdbmkvtesmmwvj.supabase.co"),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicXhsa3ZkYm1rdnRlc21td3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MzE4MjYsImV4cCI6MjA3ODIwNzgyNn0.Bti-Rt_KqBXJTMhU8vqhtrdb7qyqBBLn_hNmNcgOek0"),
    // Map the dual-client env vars to the same Lovable Cloud project
    'import.meta.env.VITE_MAIN_SUPABASE_URL': JSON.stringify("https://ubqxlkvdbmkvtesmmwvj.supabase.co"),
    'import.meta.env.VITE_MAIN_SUPABASE_ANON_KEY': JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicXhsa3ZkYm1rdnRlc21td3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MzE4MjYsImV4cCI6MjA3ODIwNzgyNn0.Bti-Rt_KqBXJTMhU8vqhtrdb7qyqBBLn_hNmNcgOek0"),
    'import.meta.env.VITE_AI_SUPABASE_URL': JSON.stringify("https://ubqxlkvdbmkvtesmmwvj.supabase.co"),
    'import.meta.env.VITE_AI_SUPABASE_ANON_KEY': JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicXhsa3ZkYm1rdnRlc21td3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MzE4MjYsImV4cCI6MjA3ODIwNzgyNn0.Bti-Rt_KqBXJTMhU8vqhtrdb7qyqBBLn_hNmNcgOek0"),
  },
}));

