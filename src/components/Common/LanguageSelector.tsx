/**
 * ============================================
 * LanguageSelector - Multilingual Support
 * ============================================
 *
 * Composant pour changer la langue de l'application.
 * Supporte 4 langues: EN, TH, RU, CN
 *
 * Features:
 * - Détection automatique langue navigateur
 * - Persistance choix localStorage
 * - Design nightlife premium (dropdown)
 * - Accessible (aria-labels, keyboard nav)
 */

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../utils/i18n';
import '../../styles/components/language-selector.css';
import '../../styles/components/language-bottom-sheet.css';

// Flag country codes for flagcdn.com (ISO 3166-1 alpha-2)
const LANGUAGE_FLAG_CODES: Record<SupportedLanguage, string> = {
  en: 'gb',  // United Kingdom
  th: 'th',  // Thailand
  ru: 'ru',  // Russia
  cn: 'cn',  // China
  fr: 'fr',  // France
  hi: 'in',  // India
  ko: 'kr',  // South Korea
  ja: 'jp'   // Japan
};

// Get flag image URL from flagcdn.com
const getFlagUrl = (langCode: SupportedLanguage): string => {
  const countryCode = LANGUAGE_FLAG_CODES[langCode];
  return `https://flagcdn.com/w40/${countryCode}.png`;
};

interface LanguageSelectorProps {
  /** Display variant */
  variant?: 'dropdown' | 'inline' | 'menu-item' | 'mobile-sheet';
  /** Affichage compact (dropdown) ou liste inline (pour mobile menu) - DEPRECATED, use variant instead */
  compact?: boolean;
  /** Classe CSS additionnelle */
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant,
  compact = true,
  className = '',
}) => {
  const { i18n } = useTranslation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [sheetClosing, setSheetClosing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalDropdownRef = useRef<HTMLDivElement>(null); // Ref for Portal dropdown
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const changeLanguage = (lng: SupportedLanguage) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('pattamap_language', lng);
    setShowDropdown(false); // Close dropdown after selection
    setShowModal(false); // Close modal after selection
    closeSheet(); // Close sheet after selection
  };

  // Close sheet with animation
  const closeSheet = () => {
    if (showSheet) {
      setSheetClosing(true);
      setTimeout(() => {
        setShowSheet(false);
        setSheetClosing(false);
      }, 300); // Match animation duration
    }
  };

  const currentLanguage = i18n.language as SupportedLanguage;
  const currentConfig = SUPPORTED_LANGUAGES[currentLanguage] || SUPPORTED_LANGUAGES.en;

  // Determine actual variant (backward compatibility with compact prop)
  const actualVariant = variant || (compact ? 'dropdown' : 'inline');

  // Close dropdown when clicking outside (for menu-item variant with Portal)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Ignore clicks on language buttons (extra safety layer)
      if (target.closest?.('.language-menu-dropdown-option')) {
        return;
      }

      // For menu-item variant, check Portal dropdown and button
      if (actualVariant === 'menu-item') {
        const clickedInsideButton = buttonRef.current?.contains(target);
        const clickedInsideDropdown = portalDropdownRef.current?.contains(target);

        if (!clickedInsideButton && !clickedInsideDropdown) {
          setShowDropdown(false);
        }
      }
      // For dropdown variant, check regular dropdown ref
      else if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown, actualVariant]);

  // Close modal when clicking outside or pressing ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowModal(false);
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [showModal]);

  // Handle ESC key and body scroll lock for bottom sheet
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSheet();
      }
    };

    if (showSheet) {
      document.addEventListener('keydown', handleEscKey);
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscKey);
        document.body.style.overflow = '';
      };
    }
  }, [showSheet]);

  // Position dropdown when it opens (menu-item variant only)
  useEffect(() => {
    if (actualVariant === 'menu-item' && showDropdown && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 256; // 16rem - Vertical list width
      const spacing = 8; // var(--spacing-2)
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Position dropdown to the left of the button, or to the right if not enough space
      let left = buttonRect.left - dropdownWidth - spacing;

      // If dropdown would go off-screen to the left, position it to the right of the button
      if (left < spacing) {
        left = buttonRect.right + spacing;

        // If still off-screen to the right, center it horizontally
        if (left + dropdownWidth > viewportWidth - spacing) {
          left = Math.max(spacing, (viewportWidth - dropdownWidth) / 2);
        }
      }

      // Position dropdown below the button (viewport coordinates for position: fixed)
      let top = buttonRect.bottom + spacing;

      // If dropdown would go off-screen at the bottom, position it above the button
      const dropdownHeight = 336; // ~6 languages × 48px + padding (vertical list)
      if (top + dropdownHeight > viewportHeight - spacing) {
        top = buttonRect.top - dropdownHeight - spacing;

        // If still off-screen at the top, position it at the top of viewport
        if (top < spacing) {
          top = spacing;
        }
      }

      // Apply position after Portal has rendered
      setTimeout(() => {
        const dropdown = document.body.querySelector('.language-menu-dropdown') as HTMLElement;
        if (dropdown) {
          dropdown.style.left = `${left}px`;
          dropdown.style.top = `${top}px`;
        }
      }, 0);
    }
  }, [showDropdown, actualVariant]);

  // Mobile Sheet variant - Premium bottom sheet for mobile
  if (actualVariant === 'mobile-sheet') {
    return (
      <>
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setShowSheet(true)}
          className="language-sheet-trigger"
          aria-label={`Current language: ${currentConfig.nativeName}. Tap to change language`}
          aria-haspopup="dialog"
          data-testid="language-selector"
        >
          <Globe size={18} className="language-sheet-trigger-icon" />
          <span className="language-sheet-trigger-code">
            {currentConfig.code.toUpperCase()}
          </span>
        </button>

        {/* Bottom Sheet Portal */}
        {showSheet && ReactDOM.createPortal(
          <>
            {/* Backdrop */}
            <div
              className="language-sheet-backdrop"
              onClick={closeSheet}
              aria-hidden="true"
            />

            {/* Bottom Sheet */}
            <div
              className={`language-sheet ${sheetClosing ? 'closing' : ''}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="language-sheet-title"
            >
              {/* Drag Handle */}
              <div className="language-sheet-handle" />

              {/* Header */}
              <div className="language-sheet-header">
                <h2 id="language-sheet-title" className="language-sheet-title">
                  <span className="language-sheet-title-icon">
                    <Globe size={18} />
                  </span>
                  Select Language
                </h2>
                <button
                  type="button"
                  onClick={closeSheet}
                  className="language-sheet-close"
                  aria-label="Close language selector"
                >
                  ✕
                </button>
              </div>

              {/* Language Grid */}
              <div className="language-sheet-grid">
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, config]) => {
                  const langCode = code as SupportedLanguage;
                  const isActive = currentLanguage === code || i18n.language.startsWith(code);

                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => changeLanguage(langCode)}
                      className={`language-sheet-card ${isActive ? 'active' : ''}`}
                      aria-label={`Switch to ${config.name}`}
                      aria-pressed={isActive}
                    >
                      <img
                        src={getFlagUrl(langCode)}
                        alt={config.name}
                        className="language-sheet-flag"
                        width={40}
                        height={30}
                        loading="lazy"
                      />
                      <span className="language-sheet-code">{config.code.toUpperCase()}</span>
                      <span className="language-sheet-name">{config.nativeName}</span>
                      <span className="language-sheet-check" aria-hidden="true">✓</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>,
          document.body
        )}
      </>
    );
  }

  // Menu Item variant (inline dropdown, no modal)
  if (actualVariant === 'menu-item') {
    return (
      <div className="language-menu-item-container" ref={dropdownRef} data-testid="language-selector">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="menu-item-modern"
          aria-label={`Current language: ${currentConfig.nativeName}. Click to change language`}
          aria-expanded={showDropdown}
          aria-haspopup="true"
          title={`Language: ${currentConfig.nativeName}`}
        >
          <span className="menu-item-icon">
            <Globe size={18} />
          </span>
          <span className="menu-item-text">
            {currentConfig.code.toUpperCase()}
          </span>
        </button>

        {/* Inline Dropdown - Rendered via Portal to escape menu stacking context */}
        {showDropdown && ReactDOM.createPortal(
          <div
            ref={portalDropdownRef}
            className="language-menu-dropdown"
            role="menu"
            aria-label="Language selection"
          >
            <div className="language-menu-dropdown-grid">
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, config]) => {
                const isActive = currentLanguage === code || i18n.language.startsWith(code);

                return (
                  <button
                    key={code}
                    onClick={() => changeLanguage(code as SupportedLanguage)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`language-menu-dropdown-option ${isActive ? 'active' : ''}`}
                    role="menuitem"
                    aria-label={`Switch to ${config.name}`}
                    type="button"
                    data-testid="language-option"
                  >
                    <span className="language-menu-dropdown-code">{config.code.toUpperCase()}</span>
                    <span className="language-menu-dropdown-native">{config.nativeName}</span>
                    {isActive && <span className="language-menu-dropdown-check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  // Compact mode: Dropdown menu
  if (actualVariant === 'dropdown') {
    return (
      <div className={`language-selector-dropdown-container ${className}`} ref={dropdownRef} data-testid="language-selector">
        {/* Main button showing current language */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="language-selector-btn"
          aria-label={`Current language: ${currentConfig.nativeName}. Click to change language`}
          aria-expanded={showDropdown}
          aria-haspopup="true"
          type="button"
        >
          <span className="language-code">
            {currentConfig.code}
          </span>
          <span className="language-dropdown-arrow">{showDropdown ? '▲' : '▼'}</span>
        </button>

        {/* Dropdown menu */}
        {showDropdown && (
          <div className="language-dropdown-menu">
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, config]) => {
              const isActive = currentLanguage === code || i18n.language.startsWith(code);

              return (
                <button
                  key={code}
                  onClick={() => changeLanguage(code as SupportedLanguage)}
                  className={`language-dropdown-item ${isActive ? 'active' : ''}`}
                  aria-label={`Switch to ${config.name}`}
                  type="button"
                >
                  <span className="language-code">
                    {config.code}
                  </span>
                  <span className="language-name">{config.nativeName}</span>
                  {isActive && <span className="language-check">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Non-compact mode: Inline list (for mobile menu)
  return (
    <div className={`language-selector ${className}`} data-testid="language-selector">
      {Object.entries(SUPPORTED_LANGUAGES).map(([code, config]) => {
        const isActive = currentLanguage === code || i18n.language.startsWith(code);

        return (
          <button
            key={code}
            onClick={() => changeLanguage(code as SupportedLanguage)}
            className={`language-btn ${isActive ? 'active' : ''}`}
            aria-label={`Switch to ${config.name}`}
            aria-pressed={isActive}
            title={config.nativeName}
            type="button"
          >
            <span className="language-code">
              {config.code}
            </span>
            <span className="language-name">{config.nativeName}</span>
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSelector;
