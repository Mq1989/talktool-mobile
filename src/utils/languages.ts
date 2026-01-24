/**
 * Language utilities for TalkTool
 * Maps language codes to names, flags, and locales
 * Supports both short codes (en, es) and full locale codes (EN_US, ES_US)
 */

// Extended language code type supporting both formats
export type LanguageCode =
  // Short codes
  | 'en' | 'es' | 'zh' | 'hi' | 'ar' | 'pt' | 'bn' | 'ru'
  | 'ja' | 'pa' | 'de' | 'ko' | 'fr' | 'tr' | 'it' | 'th'
  | 'vi' | 'pl' | 'uk' | 'nl' | 'el' | 'cs' | 'sv' | 'hu'
  | 'fi' | 'da' | 'no' | 'sk' | 'ro' | 'bg' | 'hr' | 'sl'
  | 'et' | 'lv' | 'lt' | 'he' | 'id' | 'ms' | 'tl' | 'sw'
  | 'af' | 'am' | 'az' | 'be' | 'bs' | 'ca' | 'cy' | 'eo'
  | 'eu' | 'fa' | 'ga' | 'gl' | 'gu' | 'ha' | 'ht' | 'hy' | 'sr' | 'nb'
  // Full locale codes (from langs.ts / API)
  | 'AF' | 'AR' | 'CA' | 'ZH_CN' | 'ZH_TW' | 'ZH_HK' | 'HR' | 'CS'
  | 'DA' | 'NL' | 'EN_AU' | 'EN_GB' | 'EN_IE' | 'EN_IN' | 'EN_NZ'
  | 'EN_US' | 'EN_ZA' | 'FI' | 'FR' | 'FR_CA' | 'GL' | 'DE' | 'DE_CH'
  | 'EL' | 'HE' | 'HI' | 'ID' | 'IT' | 'JA' | 'KO' | 'LV' | 'MS'
  | 'NB' | 'FA' | 'PL' | 'PT' | 'PT_BR' | 'RO' | 'RU' | 'SR' | 'SK'
  | 'ES' | 'ES_US' | 'SV' | 'TL' | 'TH' | 'UK' | 'VI';

export interface Language {
  name: string;
  nativeName: string;
  flag: string;
}

/**
 * Comprehensive language data with accurate flags
 * Sourced from langs.ts for locale codes
 */
export const languages: Record<string, Language> = {
  // ===== Full Locale Codes (from langs.ts) =====
  AF: { name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦' },
  AR: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  CA: { name: 'Catalan', nativeName: 'Català', flag: '🇪🇸' },
  ZH_CN: { name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳' },
  ZH_TW: { name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼' },
  ZH_HK: { name: 'Cantonese', nativeName: '廣東話', flag: '🇭🇰' },
  HR: { name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷' },
  CS: { name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
  DA: { name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  NL: { name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  EN_AU: { name: 'English (Australia)', nativeName: 'English', flag: '🇦🇺' },
  EN_GB: { name: 'English (UK)', nativeName: 'English', flag: '🇬🇧' },
  EN_IE: { name: 'English (Ireland)', nativeName: 'English', flag: '🇮🇪' },
  EN_IN: { name: 'English (India)', nativeName: 'English', flag: '🇮🇳' },
  EN_NZ: { name: 'English (New Zealand)', nativeName: 'English', flag: '🇳🇿' },
  EN_US: { name: 'English (US)', nativeName: 'English', flag: '🇺🇸' },
  EN_ZA: { name: 'English (South Africa)', nativeName: 'English', flag: '🇿🇦' },
  FI: { name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  FR: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  FR_CA: { name: 'French (Canada)', nativeName: 'Français', flag: '🇨🇦' },
  GL: { name: 'Galician', nativeName: 'Galego', flag: '🇪🇸' },
  DE: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  DE_CH: { name: 'German (Swiss)', nativeName: 'Deutsch', flag: '🇨🇭' },
  EL: { name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  HE: { name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' },
  HI: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  ID: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  IT: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  JA: { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  KO: { name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  LV: { name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻' },
  MS: { name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  NB: { name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  FA: { name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷' },
  PL: { name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  PT: { name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  PT_BR: { name: 'Portuguese (Brazil)', nativeName: 'Português', flag: '🇧🇷' },
  RO: { name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  RU: { name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  SR: { name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸' },
  SK: { name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰' },
  ES: { name: 'Spanish (Spain)', nativeName: 'Español', flag: '🇪🇸' },
  ES_US: { name: 'Spanish (US/Mexico)', nativeName: 'Español', flag: '🇲🇽' },
  SV: { name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  TL: { name: 'Filipino', nativeName: 'Tagalog', flag: '🇵🇭' },
  TH: { name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  UK: { name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  VI: { name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },

  // ===== Short Codes (fallbacks & aliases) =====
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  pt: { name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
  ru: { name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  ja: { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  ko: { name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  tr: { name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  it: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  th: { name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  pl: { name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  uk: { name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  el: { name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  cs: { name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
  sv: { name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  hu: { name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
  fi: { name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  da: { name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  no: { name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  nb: { name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  sk: { name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰' },
  ro: { name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  bg: { name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬' },
  hr: { name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷' },
  sl: { name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮' },
  sr: { name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸' },
  et: { name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪' },
  lv: { name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻' },
  lt: { name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹' },
  he: { name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  tl: { name: 'Filipino', nativeName: 'Tagalog', flag: '🇵🇭' },
  sw: { name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪' },
  af: { name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦' },
  am: { name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹' },
  az: { name: 'Azerbaijani', nativeName: 'Azərbaycan', flag: '🇦🇿' },
  be: { name: 'Belarusian', nativeName: 'Беларуская', flag: '🇧🇾' },
  bs: { name: 'Bosnian', nativeName: 'Bosanski', flag: '🇧🇦' },
  ca: { name: 'Catalan', nativeName: 'Català', flag: '🇪🇸' },
  cy: { name: 'Welsh', nativeName: 'Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  eo: { name: 'Esperanto', nativeName: 'Esperanto', flag: '🌍' },
  eu: { name: 'Basque', nativeName: 'Euskara', flag: '🇪🇸' },
  fa: { name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷' },
  ga: { name: 'Irish', nativeName: 'Gaeilge', flag: '🇮🇪' },
  gl: { name: 'Galician', nativeName: 'Galego', flag: '🇪🇸' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  ha: { name: 'Hausa', nativeName: 'Hausa', flag: '🇳🇬' },
  ht: { name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen', flag: '🇭🇹' },
  hy: { name: 'Armenian', nativeName: 'Հայdelays', flag: '🇦🇲' },
};

/**
 * Normalize a language code to handle various formats
 * Converts: 'en-US' -> 'EN_US', 'en_us' -> 'EN_US', etc.
 */
function normalizeLanguageCode(code: string): string {
  if (!code) return '';

  // Normalize: replace hyphens with underscores, uppercase
  const normalized = code.replace(/-/g, '_').toUpperCase();

  // Check if it's a full locale code
  if (languages[normalized]) {
    return normalized;
  }

  // Try lowercase for short codes
  const lower = code.toLowerCase().replace(/-/g, '_').split('_')[0];
  if (languages[lower]) {
    return lower;
  }

  // Return the normalized version (may not exist in our map)
  return normalized;
}

export const popularLanguages: LanguageCode[] = [
  'EN_US', 'ES_US', 'ZH_CN', 'HI', 'AR', 'PT_BR', 'RU', 'JA', 'KO', 'FR', 'DE', 'VI'
];

/**
 * Get the display name for a language code
 * Handles both short codes (en) and locale codes (EN_US)
 */
export function getLanguageName(code: string | LanguageCode): string {
  if (!code) return 'Unknown';
  const normalized = normalizeLanguageCode(code);
  return languages[normalized]?.name ?? code;
}

/**
 * Default flag to use when language is unknown
 * Uses US flag since EN_US is the app's default language
 */
const DEFAULT_FLAG = '🇺🇸';

/**
 * Get the flag emoji for a language code
 * Handles both short codes (en) and locale codes (EN_US)
 * Returns US flag as default if no match found (EN_US is the app default)
 */
export function getLanguageFlag(code: string | LanguageCode): string {
  if (!code) return DEFAULT_FLAG;
  const normalized = normalizeLanguageCode(code);
  return languages[normalized]?.flag ?? DEFAULT_FLAG;
}

/**
 * Get the native name for a language
 */
export function getLanguageNativeName(code: string | LanguageCode): string {
  if (!code) return '';
  const normalized = normalizeLanguageCode(code);
  return languages[normalized]?.nativeName ?? code;
}

/**
 * Get full language data for a code
 */
export function getLanguageData(code: string | LanguageCode): Language | null {
  if (!code) return null;
  const normalized = normalizeLanguageCode(code);
  return languages[normalized] ?? null;
}

export function getAllLanguages(): Array<{ code: string } & Language> {
  // Return unique languages (prefer locale codes over short codes)
  const localeKeys = Object.keys(languages).filter(k => k === k.toUpperCase());
  return localeKeys.map((code) => ({
    code,
    ...languages[code],
  }));
}

export function getPopularLanguages(): Array<{ code: LanguageCode } & Language> {
  return popularLanguages.map((code) => ({
    code,
    ...languages[code],
  }));
}

/**
 * Maps short language codes to full locale codes for Twilio STT.
 * The server expects locale codes like 'en-US' for speech-to-text.
 */
export const languageToLocale: Record<string, string> = {
  en: 'en-US',
  es: 'es-MX',
  zh: 'zh-CN',
  hi: 'hi-IN',
  ar: 'ar-SA',
  pt: 'pt-BR',
  bn: 'bn-IN',
  ru: 'ru-RU',
  ja: 'ja-JP',
  pa: 'pa-IN',
  de: 'de-DE',
  ko: 'ko-KR',
  fr: 'fr-FR',
  tr: 'tr-TR',
  it: 'it-IT',
  th: 'th-TH',
  vi: 'vi-VN',
  pl: 'pl-PL',
  uk: 'uk-UA',
  nl: 'nl-NL',
  el: 'el-GR',
  cs: 'cs-CZ',
  sv: 'sv-SE',
  hu: 'hu-HU',
  fi: 'fi-FI',
  da: 'da-DK',
  no: 'nb-NO',
  nb: 'nb-NO',
  sk: 'sk-SK',
  ro: 'ro-RO',
  bg: 'bg-BG',
  hr: 'hr-HR',
  sl: 'sl-SI',
  sr: 'sr-RS',
  et: 'et-EE',
  lv: 'lv-LV',
  lt: 'lt-LT',
  he: 'he-IL',
  id: 'id-ID',
  ms: 'ms-MY',
  tl: 'fil-PH',
  sw: 'sw-KE',
  af: 'af-ZA',
  am: 'am-ET',
  az: 'az-AZ',
  be: 'be-BY',
  bs: 'bs-BA',
  ca: 'ca-ES',
  cy: 'cy-GB',
  eo: 'eo',
  eu: 'eu-ES',
  fa: 'fa-IR',
  ga: 'ga-IE',
  gl: 'gl-ES',
  gu: 'gu-IN',
  ha: 'ha-NG',
  ht: 'ht-HT',
  hy: 'hy-AM',
};

/**
 * Get the locale code for a language code.
 * Used when making calls to send proper locale to Twilio server.
 */
export function getLocaleForLanguage(code: string | LanguageCode): string {
  if (!code) return 'en-US';

  // If it's already a locale code (contains underscore or hyphen), convert format
  if (code.includes('_') || code.includes('-')) {
    return code.replace('_', '-');
  }

  const lower = code.toLowerCase();
  return languageToLocale[lower] ?? `${lower}-${lower.toUpperCase()}`;
}
