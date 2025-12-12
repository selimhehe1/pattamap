/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Supabase
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;

  // API
  readonly VITE_API_URL: string;

  // Sentry
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_SENTRY_ENVIRONMENT: string;
  readonly VITE_SENTRY_ENABLE_TRACING: string;
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE: string;

  // Google Analytics
  readonly VITE_GA_MEASUREMENT_ID: string;
  readonly VITE_GA_DEBUG: string;

  // SEO
  readonly VITE_SITE_URL: string;

  // Feature Flags
  readonly VITE_FEATURE_VIP_SYSTEM: string;
  readonly VITE_FEATURE_PAYMENTS: string;
  readonly VITE_FEATURE_GAMIFICATION: string;
  readonly VITE_FEATURE_PUSH_NOTIFICATIONS: string;

  // Cloudinary (if used)
  readonly VITE_CLOUDINARY_CLOUD_NAME: string;
  readonly VITE_CLOUDINARY_UPLOAD_PRESET: string;

  // VAPID (Push Notifications)
  readonly VITE_VAPID_PUBLIC_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
