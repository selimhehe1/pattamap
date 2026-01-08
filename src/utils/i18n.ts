/**
 * ============================================
 * i18n Configuration - PattaMap
 * ============================================
 *
 * Système multilingue avec support de 8 langues:
 * - English (en) - Priorité #1
 * - Thai (th) - Marché local
 * - Russian (ru) - Communauté forte Pattaya
 * - Chinese (cn) - Tourisme croissant
 * - French (fr) - Communauté européenne
 * - Hindi (hi) - Marché indien croissant
 * - Korean (ko) - Tourisme asiatique
 * - Japanese (ja) - Tourisme asiatique
 *
 * Features:
 * - Lazy-loading des langues via HTTP (optimisation bundle)
 * - Détection automatique langue navigateur
 * - Persistance choix utilisateur (localStorage)
 * - Fallback sur anglais si langue non supportée
 *
 * @see https://react.i18next.com/
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

// Supported languages
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', code: 'EN', nativeName: 'English' },
  th: { name: 'Thai', code: 'TH', nativeName: 'ไทย' },
  ru: { name: 'Russian', code: 'RU', nativeName: 'Русский' },
  cn: { name: 'Chinese', code: 'CN', nativeName: '中文' },
  fr: { name: 'French', code: 'FR', nativeName: 'Français' },
  hi: { name: 'Hindi', code: 'HI', nativeName: 'हिन्दी' },
  ko: { name: 'Korean', code: 'KO', nativeName: '한국어' },
  ja: { name: 'Japanese', code: 'JA', nativeName: '日本語' },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// i18next configuration
i18n
  // Load translations via HTTP (lazy-loading)
  .use(HttpBackend)

  // Detect user language
  .use(LanguageDetector)

  // Pass the i18n instance to react-i18next
  .use(initReactI18next)

  // Init i18next
  .init({
    debug: process.env.NODE_ENV === 'development',

    // Backend configuration for loading JSON files
    backend: {
      loadPath: '/locales/{{lng}}.json',
    },

    // Fallback language if detection fails
    fallbackLng: 'en',

    // Supported languages
    supportedLngs: ['en', 'th', 'ru', 'cn', 'fr', 'hi', 'ko', 'ja'],

    // Namespace
    defaultNS: 'translation',
    ns: ['translation'],

    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    // Detection options
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator', 'htmlTag'],

      // Keys to lookup language from
      lookupLocalStorage: 'pattamap_language',

      // Cache user language
      caches: ['localStorage'],
    },

    // React options
    react: {
      useSuspense: true, // Enable suspense for loading states
    },
  });

export default i18n;
