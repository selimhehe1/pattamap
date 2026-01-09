/**
 * LanguagesTagsInput - Language selection tags input
 *
 * Refactored to use GenericTagsInput for better maintainability.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import GenericTagsInput, { TagOption } from './GenericTagsInput';

// Common languages in Pattaya context
export const AVAILABLE_LANGUAGES: readonly TagOption[] = [
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
  const currentLang = i18n.language.split('-')[0] || 'en';

  return (
    <GenericTagsInput
      value={value}
      onChange={onChange}
      options={AVAILABLE_LANGUAGES}
      currentLang={currentLang}
      maxSelection={maxSelection}
      error={error}
      disabled={disabled}
      placeholderEmpty="Type to search languages..."
      placeholderMore="Add another..."
      noResultsMessage="No languages found"
      helperTextEmpty="Click to select languages you speak"
    />
  );
};

export default LanguagesTagsInput;
