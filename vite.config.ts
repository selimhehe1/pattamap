/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'backend/**', 'build/**'],
    css: true,
    testTimeout: 10000,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Use injectManifest to include custom push notification handlers
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.ico', 'logo192.png', 'logo512.png'],
      manifest: {
        name: 'PattaMap - Pattaya Entertainment Directory',
        short_name: 'PattaMap',
        description: 'Premium Nightlife & Entertainment Directory for Pattaya, Thailand',
        theme_color: '#000000',
        background_color: '#0a0a14',
        display: 'standalone',
        orientation: 'portrait-primary',
        categories: ['entertainment', 'lifestyle', 'travel'],
        lang: 'en',
        icons: [
          {
            src: 'favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon'
          },
          {
            src: 'logo192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'logo512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Increase the max file size for precaching (default is 2MB)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },
      devOptions: {
        enabled: false, // Disable SW in development to avoid caching issues
        type: 'module'
      }
    })
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 3000
  },
  build: {
    outDir: 'build',
    sourcemap: true,
    // Optimize CSS
    cssCodeSplit: true,
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        // Function-based manualChunks to properly capture submodules
        manualChunks(id) {
          // React core - capture ALL submodules including react-dom/client
          if (id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/scheduler')) {
            return 'vendor';
          }
          if (id.includes('node_modules/react-router')) {
            return 'vendor';
          }
          // UI libs
          if (id.includes('node_modules/framer-motion') ||
              id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/react-icons')) {
            return 'ui';
          }
          // Query
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'query';
          }
          // i18n
          if (id.includes('node_modules/i18next')) {
            return 'i18n';
          }
          // Supabase
          if (id.includes('node_modules/@supabase')) {
            return 'supabase';
          }
          // Sentry
          if (id.includes('node_modules/@sentry')) {
            return 'sentry';
          }
          // Charts
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3')) {
            return 'charts';
          }
          // Utils
          if (id.includes('node_modules/dompurify')) {
            return 'utils';
          }
          // Helmet
          if (id.includes('node_modules/@dr.pogodin/react-helmet')) {
            return 'helmet';
          }
          // Toast
          if (id.includes('node_modules/react-hot-toast')) {
            return 'toast';
          }
          // Analytics
          if (id.includes('node_modules/react-ga4')) {
            return 'analytics';
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src',
      '@shared': '/shared'
    },
    // Force single React instance to prevent "Invalid hook call" errors
    dedupe: ['react', 'react-dom', 'react-router-dom']
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime'
    ],
    // Force cache invalidation - increment this to force rebuild
    esbuildOptions: {
      define: {
        __VITE_CACHE_VERSION__: '"2"'
      }
    }
  }
});
