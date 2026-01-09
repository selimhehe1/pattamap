/**
 * NationalityTagsInput - Nationality selection tags input
 *
 * Refactored to use GenericTagsInput for better maintainability.
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ALL_COUNTRIES, getCountryLabel, CountryOption } from '../../constants/countries';
import GenericTagsInput from './GenericTagsInput';
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
  const { i18n } = useTranslation();
  const currentLang = i18n.language.split('-')[0] || 'en';

  // Custom label getter using the countries module
  const getLabel = useCallback((option: CountryOption, lang: string): string => {
    return getCountryLabel(option.value, lang as 'en' | 'th' | 'ru' | 'cn' | 'fr' | 'hi');
  }, []);

  // Helper text based on selection count
  const helperTextByCount = useCallback((count: number): string | null => {
    if (count === 0) return 'Click to select your nationality (max 2 for half/mixed)';
    if (count === 1) return 'Click to add a second nationality for half/mixed heritage';
    if (count === 2) return '2 nationalities selected (Half/Mixed)';
    return null;
  }, []);

  // Max indicator text
  const maxIndicatorText = useCallback((count: number): string => {
    return count === 2 ? '(Half/Mixed)' : '';
  }, []);

  return (
    <GenericTagsInput
      value={value}
      onChange={onChange}
      options={ALL_COUNTRIES as unknown as CountryOption[]}
      currentLang={currentLang}
      maxSelection={maxSelection}
      error={error}
      disabled={disabled}
      placeholderEmpty="Type to search countries..."
      placeholderMore="Add another..."
      noResultsMessage="No countries found"
      helperTextByCount={helperTextByCount}
      maxIndicatorText={maxIndicatorText}
      maxSuggestions={10}
      defaultSuggestionsCount={20}
      getLabel={getLabel}
    />
  );
};

export default NationalityTagsInput;
