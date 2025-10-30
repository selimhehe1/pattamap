/**
 * ============================================
 * i18n Configuration - PattaMap
 * ============================================
 *
 * Système multilingue avec support de 8 langues:
 * - 🇬🇧 Anglais (en) - Priorité #1
 * - 🇹🇭 Thaï (th) - Marché local
 * - 🇷🇺 Russe (ru) - Communauté forte Pattaya
 * - 🇨🇳 Chinois (cn) - Tourisme croissant
 * - 🇫🇷 Français (fr) - Communauté européenne
 * - 🇮🇳 Hindi (hi) - Marché indien croissant
 * - 🇰🇷 Coréen (ko) - Tourisme asiatique
 * - 🇯🇵 Japonais (ja) - Tourisme asiatique
 *
 * Features:
 * - Détection automatique langue navigateur
 * - Persistance choix utilisateur (localStorage)
 * - Fallback sur anglais si langue non supportée
 *
 * @see https://react.i18next.com/
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from '../locales/en.json';
import th from '../locales/th.json';
import ru from '../locales/ru.json';
import cn from '../locales/cn.json';
import fr from '../locales/fr.json';
import hi from '../locales/hi.json';
import ko from '../locales/ko.json';
import ja from '../locales/ja.json';

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
  // Detect user language
  // Learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)

  // Pass the i18n instance to react-i18next
  .use(initReactI18next)

  // Init i18next
  // For all options: https://www.i18next.com/overview/configuration-options
  .init({
    debug: process.env.NODE_ENV === 'development',

    // Resources (translations)
    resources: {
      en: { translation: en },
      th: { translation: th },
      ru: { translation: ru },
      cn: { translation: cn },
      fr: { translation: fr },
      hi: { translation: hi },
      ko: { translation: ko },
      ja: { translation: ja },
    },

    // Fallback language if detection fails
    fallbackLng: 'en',

    // Default language
    lng: 'en',

    // Namespace
    defaultNS: 'translation',

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
      useSuspense: false, // Disable suspense for easier debugging
    },
  });

export default i18n;
