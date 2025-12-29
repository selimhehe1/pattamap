import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Languages, Lightbulb, AlertTriangle } from 'lucide-react';
import { logger } from '../../utils/logger';
import '../../styles/components/NationalityTagsInput.css'; // Reuse same styles

// Common languages in Pattaya context
export const AVAILABLE_LANGUAGES = [
  { value: 'Thai', label: { en: 'Thai', th: 'ไทย', ru: 'Тайский', cn: '泰语', fr: 'Thaï', hi: 'थाई' } },
  { value: 'English', label: { en: 'English', th: 'อังกฤษ', ru: 'Английский', cn: '英语', fr: 'Anglais', hi: 'अंग्रेज़ी' } },
  { value: 'Chinese', label: { en: 'Chinese', th: 'จีน', ru: 'Китайский', cn: '中文', fr: 'Chinois', hi: 'चीनी' } },
  { value: 'Russian', label: { en: 'Russian', th: 'รัสเซีย', ru: 'Русский', cn: '俄语', fr: 'Russe', hi: 'रूसी' } },
  { value: 'Japanese', label: { en: 'Japanese', th: 'ญี่ปุ่น', ru: 'Японский', cn: '日语', fr: 'Japonais', hi: 'जापानी' } },
  { value: 'Korean', label: { en: 'Korean', th: 'เกาหลี', ru: 'Корейский', cn: '韩语', fr: 'Coréen', hi: 'कोरियाई' } },
  { value: 'German', label: { en: 'German', th: 'เยอรมัน', ru: 'Немецкий', cn: '德语', fr: 'Allemand', hi: 'जर्मन' } },
  { value: 'French', label: { en: 'French', th: 'ฝรั่งเศส', ru: 'Французский', cn: '法语', fr: 'Français', hi: 'फ़्रांसीसी' } },
  { value: 'Arabic', label: { en: 'Arabic', th: 'อาหรับ', ru: 'Арабский', cn: '阿拉伯语', fr: 'Arabe', hi: 'अरबी' } },
  { value: 'Hindi', label: { en: 'Hindi', th: 'ฮินดี', ru: 'Хинди', cn: '印地语', fr: 'Hindi', hi: 'हिन्दी' } },
  { value: 'Spanish', label: { en: 'Spanish', th: 'สเปน', ru: 'Испанский', cn: '西班牙语', fr: 'Espagnol', hi: 'स्पेनिश' } },
  { value: 'Italian', label: { en: 'Italian', th: 'อิตาลี', ru: 'Итальянский', cn: '意大利语', fr: 'Italien', hi: 'इतालवी' } },
  { value: 'Vietnamese', label: { en: 'Vietnamese', th: 'เวียดนาม', ru: 'Вьетнамский', cn: '越南语', fr: 'Vietnamien', hi: 'वियतनामी' } },
  { value: 'Indonesian', label: { en: 'Indonesian', th: 'อินโดนีเซีย', ru: 'Индонезийский', cn: '印度尼西亚语', fr: 'Indonésien', hi: 'इंडोनेशियाई' } },
] as const;

interface LanguagesTagsInputProps {
  value: string[] | null;
  onChange: (languages: string[] | null) => void;
  error?: string;
  disabled?: boolean;
  maxSelection?: number;
}

/**
 * Tags input component for language selection (Gmail-style)
 * - Type to search languages with fuzzy matching
 * - Selected languages appear as inline badges/tags
 * - Max 5 selections by default
 */
export const LanguagesTagsInput: React.FC<LanguagesTagsInputProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  maxSelection = 5
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language.split('-')[0] || 'en') as 'en' | 'th' | 'ru' | 'cn' | 'fr' | 'hi';

  const [inputValue, setInputValue] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get selected languages
  const selectedLanguages = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [];
  }, [value]);

  const canAddMore = selectedLanguages.length < maxSelection;

  // Get label for a language in current locale
  const getLanguageLabel = (langValue: string): string => {
    const lang = AVAILABLE_LANGUAGES.find(l => l.value === langValue);
    return lang ? lang.label[currentLang] || lang.label.en : langValue;
  };

  // Fuzzy search
  const fuzzyMatch = (search: string, text: string): boolean => {
    const searchLower = search.toLowerCase();
    const textLower = text.toLowerCase();
    if (textLower.includes(searchLower)) return true;
    let searchIndex = 0;
    for (let i = 0; i < textLower.length && searchIndex < searchLower.length; i++) {
      if (textLower[i] === searchLower[searchIndex]) searchIndex++;
    }
    return searchIndex === searchLower.length;
  };

  // Filter languages based on input
  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) {
      return AVAILABLE_LANGUAGES.filter(lang => !selectedLanguages.includes(lang.value));
    }
    return AVAILABLE_LANGUAGES.filter(lang => {
      if (selectedLanguages.includes(lang.value)) return false;
      return fuzzyMatch(inputValue, lang.label[currentLang]) || fuzzyMatch(inputValue, lang.value);
    });
  }, [inputValue, selectedLanguages, currentLang]);

  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (containerRef.current && containerRef.current.contains(target)) return;
      if (target.closest('.nationality-suggestions-portal')) return;
      setShowSuggestions(false);
      setFocusedIndex(-1);
    };
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  // Calculate dropdown position
  useEffect(() => {
    if (showSuggestions && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [showSuggestions]);

  const handleAddLanguage = (langValue: string) => {
    if (!canAddMore) return;
    const newSelection = [...selectedLanguages, langValue];
    onChange(newSelection);
    setInputValue('');
    setShowSuggestions(false);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  };

  const handleRemoveLanguage = (langValue: string) => {
    const newSelection = selectedLanguages.filter(l => l !== langValue);
    onChange(newSelection.length > 0 ? newSelection : null);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(true);
    setFocusedIndex(-1);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.nationality-tag-remove')) return;
    if (!disabled && canAddMore) {
      setShowSuggestions(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFocusedIndex(-1);
      return;
    }
    if (e.key === 'Backspace' && inputValue === '' && selectedLanguages.length > 0) {
      e.preventDefault();
      handleRemoveLanguage(selectedLanguages[selectedLanguages.length - 1]);
      return;
    }
    if (!showSuggestions || filteredSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
    }
    if ((e.key === 'Enter' || e.key === 'Tab') && focusedIndex >= 0) {
      e.preventDefault();
      handleAddLanguage(filteredSuggestions[focusedIndex].value);
    }
  };

  const getPlaceholder = (): string => {
    if (selectedLanguages.length === 0) return 'Type to search languages...';
    if (canAddMore) return 'Add another...';
    return '';
  };

  logger.debug('LanguagesTagsInput:', { value, selectedLanguages, showSuggestions });

  return (
    <div className="nationality-tags-input-wrapper">
      <div
        ref={containerRef}
        className={`nationality-tags-input-container ${disabled ? 'nationality-tags-input-disabled' : ''} ${showSuggestions ? 'nationality-tags-input-focused' : ''}`}
        onClick={handleContainerClick}
      >
        {selectedLanguages.map((lang) => (
          <div key={lang} className="nationality-tag">
            <span className="nationality-tag-text">{getLanguageLabel(lang)}</span>
            {!disabled && (
              <button
                type="button"
                className="nationality-tag-remove"
                onClick={(e) => { e.stopPropagation(); handleRemoveLanguage(lang); }}
                aria-label={`Remove ${getLanguageLabel(lang)}`}
              >
                ×
              </button>
            )}
          </div>
        ))}

        {canAddMore && !disabled && (
          <input
            ref={inputRef}
            type="text"
            className="nationality-tags-input-field"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            disabled={disabled}
            autoComplete="off"
          />
        )}

        {!canAddMore && selectedLanguages.length > 0 && (
          <span className="nationality-tags-input-max">
            (Max {maxSelection})
          </span>
        )}
      </div>

      {/* Dropdown portal */}
      {showSuggestions && canAddMore && dropdownPosition && filteredSuggestions.length > 0 && ReactDOM.createPortal(
        <div
          className="nationality-suggestions nationality-suggestions-portal"
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 100002
          }}
        >
          {filteredSuggestions.map((lang, index) => (
            <div
              key={lang.value}
              className={`nationality-suggestion-item ${index === focusedIndex ? 'nationality-suggestion-item-focused' : ''}`}
              onClick={() => handleAddLanguage(lang.value)}
              onMouseEnter={() => setFocusedIndex(index)}
            >
              {lang.label[currentLang]}
            </div>
          ))}
        </div>,
        document.body
      )}

      {showSuggestions && canAddMore && dropdownPosition && inputValue && filteredSuggestions.length === 0 && ReactDOM.createPortal(
        <div
          className="nationality-suggestions nationality-suggestions-portal"
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 100002
          }}
        >
          <div className="nationality-suggestion-item nationality-suggestion-item-disabled">
            No languages found
          </div>
        </div>,
        document.body
      )}

      {/* Helper text */}
      {selectedLanguages.length === 0 && !showSuggestions && (
        <div className="nationality-helper-text">
          <Lightbulb size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Click to select languages you speak
        </div>
      )}

      {error && (
        <div className="nationality-error-text">
          <AlertTriangle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {error}
        </div>
      )}
    </div>
  );
};

export default LanguagesTagsInput;
