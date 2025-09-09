import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Enable proper chunking for better caching and code splitting
        manualChunks: {
          // Core React libraries
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-tooltip', '@radix-ui/react-tabs', '@radix-ui/react-select'],
          // Animation and motion libraries
          motion: ['framer-motion'],
          // Backend and data fetching
          backend: ['@supabase/supabase-js', '@tanstack/react-query'],
          // Form and validation
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Heavy utility libraries
          utils: ['date-fns', 'clsx', 'tailwind-merge'],
        },
        // Ensure consistent file hashing for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Enable build optimizations
    target: 'esnext',
    minify: 'esbuild',
    // Optimize chunk size for better caching
    chunkSizeWarningLimit: 1600,
  },
}));
