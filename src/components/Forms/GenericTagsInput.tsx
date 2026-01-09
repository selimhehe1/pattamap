/**
 * GenericTagsInput - Reusable tags input component (Gmail-style)
 *
 * Extracted from LanguagesTagsInput and NationalityTagsInput.
 * Provides fuzzy search, keyboard navigation, and portal dropdown.
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Lightbulb, AlertTriangle } from 'lucide-react';
import '../../styles/components/NationalityTagsInput.css';

export interface TagOption {
  value: string;
  label: Record<string, string>;
}

export interface GenericTagsInputProps<T extends TagOption> {
  /** Currently selected values */
  value: string[] | null;
  /** Callback when selection changes */
  onChange: (values: string[] | null) => void;
  /** Available options to select from */
  options: readonly T[];
  /** Current language code for labels */
  currentLang: string;
  /** Maximum number of selections allowed */
  maxSelection?: number;
  /** Error message to display */
  error?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder when no items selected */
  placeholderEmpty?: string;
  /** Placeholder when items selected but can add more */
  placeholderMore?: string;
  /** Message when no search results found */
  noResultsMessage?: string;
  /** Helper text when nothing selected */
  helperTextEmpty?: string;
  /** Helper text based on selection count (optional) */
  helperTextByCount?: (count: number) => string | null;
  /** Text to show when max selection reached */
  maxIndicatorText?: string | ((count: number) => string);
  /** Max suggestions to show (default: all) */
  maxSuggestions?: number;
  /** Default suggestions count when input empty (default: show all) */
  defaultSuggestionsCount?: number;
  /** Custom label getter (default: uses option.label[currentLang]) */
  getLabel?: (option: T, currentLang: string) => string;
}

/**
 * Fuzzy match: checks if search characters appear in text in order
 */
const fuzzyMatch = (search: string, text: string): boolean => {
  const searchLower = search.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match (faster path)
  if (textLower.includes(searchLower)) return true;

  // Fuzzy match: characters in order
  let searchIndex = 0;
  for (let i = 0; i < textLower.length && searchIndex < searchLower.length; i++) {
    if (textLower[i] === searchLower[searchIndex]) searchIndex++;
  }
  return searchIndex === searchLower.length;
};

function GenericTagsInput<T extends TagOption>({
  value,
  onChange,
  options,
  currentLang,
  maxSelection = 5,
  error,
  disabled = false,
  placeholderEmpty = 'Type to search...',
  placeholderMore = 'Add another...',
  noResultsMessage = 'No results found',
  helperTextEmpty = 'Click to select',
  helperTextByCount,
  maxIndicatorText,
  maxSuggestions,
  defaultSuggestionsCount,
  getLabel: customGetLabel
}: GenericTagsInputProps<T>): React.ReactElement {
  const [inputValue, setInputValue] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get selected values as array
  const selectedValues = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    // Legacy: convert string to array
    const legacyValue = value as unknown;
    if (typeof legacyValue === 'string' && (legacyValue as string).trim()) {
      return [legacyValue as string];
    }
    return [];
  }, [value]);

  const canAddMore = selectedValues.length < maxSelection;

  // Get label for an option
  const getLabel = useCallback((option: T): string => {
    if (customGetLabel) {
      return customGetLabel(option, currentLang);
    }
    return option.label[currentLang] || option.label['en'] || option.value;
  }, [customGetLabel, currentLang]);

  // Get label for a value (find option first)
  const getLabelForValue = useCallback((val: string): string => {
    const option = options.find(o => o.value === val);
    return option ? getLabel(option) : val;
  }, [options, getLabel]);

  // Filter options based on input
  const filteredSuggestions = useMemo(() => {
    let filtered: T[];

    if (!inputValue.trim()) {
      // Show default suggestions when input empty
      filtered = options.filter(opt => !selectedValues.includes(opt.value)) as T[];
      if (defaultSuggestionsCount) {
        filtered = filtered.slice(0, defaultSuggestionsCount);
      }
    } else {
      // Filter by fuzzy search
      filtered = (options.filter(opt => {
        if (selectedValues.includes(opt.value)) return false;
        const label = getLabel(opt);
        return fuzzyMatch(inputValue, label) || fuzzyMatch(inputValue, opt.value);
      }) as T[]);
    }

    // Apply max suggestions limit
    if (maxSuggestions) {
      filtered = filtered.slice(0, maxSuggestions);
    }

    return filtered;
  }, [inputValue, selectedValues, options, currentLang, getLabel, maxSuggestions, defaultSuggestionsCount]);

  // Handle clicking outside to close dropdown
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
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, [showSuggestions]);

  const handleAdd = useCallback((val: string) => {
    if (!canAddMore) return;
    const newSelection = [...selectedValues, val];
    onChange(newSelection);
    setInputValue('');
    setShowSuggestions(false);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  }, [canAddMore, selectedValues, onChange]);

  const handleRemove = useCallback((val: string) => {
    const newSelection = selectedValues.filter(v => v !== val);
    onChange(newSelection.length > 0 ? newSelection : null);
    inputRef.current?.focus();
  }, [selectedValues, onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(true);
    setFocusedIndex(-1);
  }, []);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.nationality-tag-remove')) return;
    if (!disabled && canAddMore) {
      setShowSuggestions(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [disabled, canAddMore]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFocusedIndex(-1);
      return;
    }

    if (e.key === 'Backspace' && inputValue === '' && selectedValues.length > 0) {
      e.preventDefault();
      handleRemove(selectedValues[selectedValues.length - 1]);
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
      handleAdd(filteredSuggestions[focusedIndex].value);
    }
  }, [inputValue, selectedValues, showSuggestions, filteredSuggestions, focusedIndex, handleRemove, handleAdd]);

  const getPlaceholder = (): string => {
    if (selectedValues.length === 0) return placeholderEmpty;
    if (canAddMore) return placeholderMore;
    return '';
  };

  // Determine max indicator text
  const getMaxIndicator = (): string => {
    if (!maxIndicatorText) return `(Max ${maxSelection})`;
    if (typeof maxIndicatorText === 'function') return maxIndicatorText(selectedValues.length);
    return maxIndicatorText;
  };

  // Determine helper text
  const getHelperText = (): string | null => {
    if (helperTextByCount) {
      return helperTextByCount(selectedValues.length);
    }
    if (selectedValues.length === 0 && !showSuggestions) {
      return helperTextEmpty;
    }
    return null;
  };

  const helperText = getHelperText();

  return (
    <div className="nationality-tags-input-wrapper">
      <div
        ref={containerRef}
        className={`nationality-tags-input-container ${disabled ? 'nationality-tags-input-disabled' : ''} ${showSuggestions ? 'nationality-tags-input-focused' : ''}`}
        onClick={handleContainerClick}
      >
        {selectedValues.map((val) => (
          <div key={val} className="nationality-tag">
            <span className="nationality-tag-text">{getLabelForValue(val)}</span>
            {!disabled && (
              <button
                type="button"
                className="nationality-tag-remove"
                onClick={(e) => { e.stopPropagation(); handleRemove(val); }}
                aria-label={`Remove ${getLabelForValue(val)}`}
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

        {!canAddMore && selectedValues.length > 0 && (
          <span className="nationality-tags-input-max">
            {getMaxIndicator()}
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
          {filteredSuggestions.map((option, index) => (
            <div
              key={option.value}
              className={`nationality-suggestion-item ${index === focusedIndex ? 'nationality-suggestion-item-focused' : ''}`}
              onClick={() => handleAdd(option.value)}
              onMouseEnter={() => setFocusedIndex(index)}
            >
              {getLabel(option)}
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
            {noResultsMessage}
          </div>
        </div>,
        document.body
      )}

      {/* Helper text */}
      {helperText && (
        <div className="nationality-helper-text">
          <Lightbulb size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {helperText}
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
}

export default GenericTagsInput;
