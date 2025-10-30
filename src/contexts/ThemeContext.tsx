import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

/**
 * Theme Context - Dark/Light Mode Management
 * Phase 3C - Dark/Light Mode Toggle Implementation
 *
 * Features:
 * - Auto-detect system preference (prefers-color-scheme)
 * - localStorage persistence across sessions
 * - Cross-tab synchronization
 * - Smooth theme transitions
 *
 * Usage:
 * ```tsx
 * import { useTheme } from './contexts/ThemeContext';
 *
 * function MyComponent() {
 *   const { theme, toggleTheme, setTheme } = useTheme();
 *   return <button onClick={toggleTheme}>Current: {theme}</button>;
 * }
 * ```
 */

// ============================================
// TYPES
// ============================================

export type Theme = 'dark' | 'light';

export interface ThemeContextType {
  /** Current active theme */
  theme: Theme;

  /** Toggle between dark and light mode */
  toggleTheme: () => void;

  /** Set a specific theme */
  setTheme: (theme: Theme) => void;

  /** Whether theme is system preference or user preference */
  isSystemPreference: boolean;
}

// ============================================
// CONTEXT
// ============================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'theme-preference';
const SYSTEM_PREFERENCE_QUERY = '(prefers-color-scheme: dark)';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get system color scheme preference
 */
const getSystemPreference = (): Theme => {
  if (typeof window === 'undefined') return 'dark';

  const mediaQuery = window.matchMedia(SYSTEM_PREFERENCE_QUERY);
  return mediaQuery.matches ? 'dark' : 'light';
};

/**
 * Get saved theme from localStorage
 */
const getSavedTheme = (): Theme | null => {
  if (typeof window === 'undefined') return null;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch (error) {
    console.warn('Failed to read theme from localStorage:', error);
  }

  return null;
};

/**
 * Save theme to localStorage
 */
const saveTheme = (theme: Theme): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    console.warn('Failed to save theme to localStorage:', error);
  }
};

/**
 * Apply theme to document
 */
const applyTheme = (theme: Theme): void => {
  if (typeof document === 'undefined') return;

  // Add transitioning class for smooth animation
  document.documentElement.classList.add('theme-transitioning');

  // Set data-theme attribute on BODY (not html) for CSS selector matching
  document.body.setAttribute('data-theme', theme);

  // Remove transitioning class after animation completes
  setTimeout(() => {
    document.documentElement.classList.remove('theme-transitioning');
  }, 300);
};

// ============================================
// PROVIDER COMPONENT
// ============================================

export interface ThemeProviderProps {
  children: ReactNode;
  /** Default theme if no preference is found */
  defaultTheme?: Theme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'dark', // Nightlife theme is dark by default
}) => {
  // Determine initial theme:
  // 1. Check localStorage for user preference
  // 2. Fall back to system preference
  // 3. Fall back to default theme
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = getSavedTheme();
    if (savedTheme) return savedTheme;

    const systemTheme = getSystemPreference();
    return systemTheme || defaultTheme;
  });

  const [isSystemPreference, setIsSystemPreference] = useState<boolean>(
    () => getSavedTheme() === null
  );

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    if (!isSystemPreference) return;

    const mediaQuery = window.matchMedia(SYSTEM_PREFERENCE_QUERY);

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setThemeState(newTheme);
      saveTheme(newTheme);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [isSystemPreference]);

  // Listen for cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const newTheme = e.newValue as Theme;
        if (newTheme === 'dark' || newTheme === 'light') {
          setThemeState(newTheme);
          setIsSystemPreference(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ============================================
  // PUBLIC METHODS
  // ============================================

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    saveTheme(newTheme);
    setIsSystemPreference(false); // User has explicitly chosen a theme
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
    isSystemPreference,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// ============================================
// HOOK
// ============================================

/**
 * Hook to access theme context
 * Must be used within ThemeProvider
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};

export default ThemeContext;
