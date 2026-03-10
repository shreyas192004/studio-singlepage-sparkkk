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
    // Publishable keys injected as global constants (Vite eats import.meta.env.VITE_* before define runs)
    __MAIN_SUPABASE_URL__: JSON.stringify("https://zlftueekablulqufinhv.supabase.co"),
    __MAIN_SUPABASE_ANON_KEY__: JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZnR1ZWVrYWJsdWxxdWZpbmh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNjk5MDYsImV4cCI6MjA4NTc0NTkwNn0.0jpgMeQCzeJY5xYfTizxUEm33PcUr0EKgLQuR9TMqNA"),
    __AI_SUPABASE_URL__: JSON.stringify("https://ubqxlkvdbmkvtesmmwvj.supabase.co"),
    __AI_SUPABASE_ANON_KEY__: JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicXhsa3ZkYm1rdnRlc21td3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MzE4MjYsImV4cCI6MjA3ODIwNzgyNn0.Bti-Rt_KqBXJTMhU8vqhtrdb7qyqBBLn_hNmNcgOek0"),
  },
}));

