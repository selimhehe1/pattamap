import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Lightbulb, AlertTriangle } from 'lucide-react';
import { ALL_COUNTRIES, getCountryLabel } from '../../constants/countries';
import { logger } from '../../utils/logger';
import '../../styles/components/NationalityTagsInput.css';

interface NationalityTagsInputProps {
  value: string[] | null;
  onChange: (nationalities: string[] | null) => void;
  error?: string;
  disabled?: boolean;
  maxSelection?: number;
}

/**
 * Tags input component for nationality selection (Gmail-style)
 * - Type to search countries with fuzzy matching
 * - Selected countries appear as inline badges/tags
 * - Max 2 selections (automatic "half/mixed" when 2 selected)
 * - Mobile-friendly with touch optimization
 */
export const NationalityTagsInput: React.FC<NationalityTagsInputProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  maxSelection = 2
}) => {
  const { t: _t, i18n } = useTranslation();
  const currentLang = (i18n.language.split('-')[0] || 'en') as 'en' | 'th' | 'ru' | 'cn' | 'fr' | 'hi';

  const [inputValue, setInputValue] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get selected nationalities (ensure array and handle legacy string values)
  const selectedNationalities = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    // Legacy: convert string to array (in case of old data)
    if (typeof (value as any) === 'string' && (value as any).trim()) {
      return [(value as any)];
    }
    return [];
  }, [value]);

  const canAddMore = selectedNationalities.length < maxSelection;

  // Fuzzy search: matches characters in order (tolerates typos)
  const fuzzyMatch = (search: string, text: string): boolean => {
    const searchLower = search.toLowerCase();
    const textLower = text.toLowerCase();

    // Exact match
    if (textLower.includes(searchLower)) return true;

    // Fuzzy match: characters in order
    let searchIndex = 0;
    for (let i = 0; i < textLower.length && searchIndex < searchLower.length; i++) {
      if (textLower[i] === searchLower[searchIndex]) searchIndex++;
    }
    return searchIndex === searchLower.length;
  };

  // Filter countries based on input value
  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) {
      return ALL_COUNTRIES.slice(0, 20); // Show top 20 by default
    }

    return ALL_COUNTRIES.filter(country => {
      // Already selected
      if (selectedNationalities.includes(country.value)) return false;

      // Search in current language label
      const currentLabel = country.label[currentLang];
      // Also search in English value
      const englishValue = country.value;

      return fuzzyMatch(inputValue, currentLabel) || fuzzyMatch(inputValue, englishValue);
    }).slice(0, 10); // Limit to 10 suggestions
  }, [inputValue, selectedNationalities, currentLang]);

  // Debug logging (after filteredSuggestions is defined)
  useEffect(() => {
    logger.debug('NationalityTagsInput:', {
      value,
      selectedNationalities,
      canAddMore,
      showSuggestions,
      inputValue,
      filteredCount: filteredSuggestions.length
    });
  }, [value, selectedNationalities, showSuggestions, inputValue, filteredSuggestions, canAddMore]);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Don't close if clicking inside the container
      if (containerRef.current && containerRef.current.contains(target)) {
        return;
      }

      // Don't close if clicking inside the portal dropdown
      if (target.closest('.nationality-suggestions-portal')) {
        return;
      }

      // Close dropdown
      setShowSuggestions(false);
      setFocusedIndex(-1);
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  // Calculate dropdown position when showing suggestions
  // Smart positioning: show above if not enough space below
  useEffect(() => {
    if (showSuggestions && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 200; // max-height from CSS
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Show above if: not enough space below AND more space above
      const showAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setDropdownPosition({
        top: showAbove
          ? rect.top + window.scrollY - dropdownHeight - 4  // Above the input
          : rect.bottom + window.scrollY + 4,               // Below the input
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [showSuggestions]);

  // Handle adding a nationality
  const handleAddNationality = (countryValue: string) => {
    if (!canAddMore) return;

    const newSelection = [...selectedNationalities, countryValue];
    onChange(newSelection);
    setInputValue('');
    setShowSuggestions(false);
    setFocusedIndex(-1);

    // Keep focus on input
    inputRef.current?.focus();
  };

  // Handle removing a nationality
  const handleRemoveNationality = (countryValue: string) => {
    const newSelection = selectedNationalities.filter(n => n !== countryValue);
    onChange(newSelection.length > 0 ? newSelection : null);

    // Keep focus on input
    inputRef.current?.focus();
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);
    setFocusedIndex(-1);
  };

  // Handle input focus
  const handleInputFocus = () => {
    // Don't auto-open dropdown on focus to avoid reopening after selection
    // Dropdown will open when user clicks container or starts typing
    logger.debug('Input focused, canAddMore:', canAddMore);
  };

  // Handle container click to show dropdown even if empty
  const handleContainerClickToShow = () => {
    if (!disabled && canAddMore) {
      logger.debug('Container clicked, showing suggestions');
      setShowSuggestions(true);
      // Focus input after showing suggestions
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Escape: Close suggestions
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFocusedIndex(-1);
      return;
    }

    // Backspace on empty input: Remove last tag
    if (e.key === 'Backspace' && inputValue === '' && selectedNationalities.length > 0) {
      e.preventDefault();
      handleRemoveNationality(selectedNationalities[selectedNationalities.length - 1]);
      return;
    }

    if (!showSuggestions || filteredSuggestions.length === 0) return;

    // Arrow Down: Next suggestion
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
      return;
    }

    // Arrow Up: Previous suggestion
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
      return;
    }

    // Enter or Tab: Select focused suggestion
    if ((e.key === 'Enter' || e.key === 'Tab') && focusedIndex >= 0) {
      e.preventDefault();
      handleAddNationality(filteredSuggestions[focusedIndex].value);
      return;
    }
  };

  // Handle container click (show dropdown and focus input)
  const handleContainerClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on a remove button
    if ((e.target as HTMLElement).closest('.nationality-tag-remove')) {
      return;
    }

    if (!disabled) {
      handleContainerClickToShow();
    }
  };

  // Get display label for nationality
  const getDisplayLabel = (countryValue: string): string => {
    return getCountryLabel(countryValue, currentLang);
  };

  // Determine placeholder text
  const getPlaceholder = (): string => {
    if (selectedNationalities.length === 0) {
      return 'Type to search countries...';
    } else if (canAddMore) {
      return 'Add another...';
    } else {
      return '';
    }
  };

  return (
    <div className="nationality-tags-input-wrapper">
      <div
        ref={containerRef}
        className={`nationality-tags-input-container ${disabled ? 'nationality-tags-input-disabled' : ''} ${showSuggestions ? 'nationality-tags-input-focused' : ''}`}
        onClick={handleContainerClick}
      >
        {/* Selected nationalities as tags */}
        {selectedNationalities.map((nationality) => (
          <div key={nationality} className="nationality-tag">
            <span className="nationality-tag-text">{getDisplayLabel(nationality)}</span>
            {!disabled && (
              <button
                type="button"
                className="nationality-tag-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveNationality(nationality);
                }}
                aria-label={`Remove ${getDisplayLabel(nationality)}`}
              >
                ×
              </button>
            )}
          </div>
        ))}

        {/* Input field */}
        {canAddMore && !disabled && (
          <input
            ref={inputRef}
            type="text"
            className="nationality-tags-input-field"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            disabled={disabled}
            autoComplete="off"
          />
        )}

        {/* Max reached indicator */}
        {!canAddMore && selectedNationalities.length > 0 && (
          <span className="nationality-tags-input-max">
            {selectedNationalities.length === 2 ? '(Half/Mixed)' : ''}
          </span>
        )}
      </div>

      {/* Suggestions dropdown (rendered in portal) */}
      {showSuggestions && canAddMore && dropdownPosition && (
        <>
          {filteredSuggestions.length > 0 && ReactDOM.createPortal(
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
              {filteredSuggestions.map((country, index) => (
                <div
                  key={country.value}
                  className={`nationality-suggestion-item ${index === focusedIndex ? 'nationality-suggestion-item-focused' : ''}`}
                  onClick={() => handleAddNationality(country.value)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  {country.label[currentLang]}
                </div>
              ))}
            </div>,
            document.body
          )}

          {/* No results message */}
          {inputValue && filteredSuggestions.length === 0 && ReactDOM.createPortal(
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
                No countries found
              </div>
            </div>,
            document.body
          )}
        </>
      )}

      {/* Helper text */}
      {selectedNationalities.length === 0 && !showSuggestions && (
        <div className="nationality-helper-text">
          <Lightbulb size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Click to select your nationality (max 2 for half/mixed)
        </div>
      )}
      {selectedNationalities.length === 1 && !showSuggestions && (
        <div className="nationality-helper-text">
          <Lightbulb size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Click to add a second nationality for half/mixed heritage
        </div>
      )}
      {selectedNationalities.length === 2 && (
        <div className="nationality-helper-text">
          <Lightbulb size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> 2 nationalities selected (Half/Mixed)
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="nationality-error-text">
          <AlertTriangle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {error}
        </div>
      )}
    </div>
  );
};

export default NationalityTagsInput;

