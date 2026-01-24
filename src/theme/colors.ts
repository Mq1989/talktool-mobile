// TalkTool Brand Colors
// Based on usetalktool.com design language

export const colors = {
  // Primary - TalkTool brand blue (from website)
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',  // Main brand blue
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Indigo - Accent gradient color
  indigo: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },

  // Semantic colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',

  // Extended semantic
  semantic: {
    success: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
    },
    warning: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
    },
    error: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
    },
  },

  // Neutrals
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },

  // Call-specific
  call: {
    active: '#10B981',
    connecting: '#F59E0B',
    ended: '#6B7280',
    muted: '#EF4444',
  },

  // Voicemail accent (amber)
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
  },

  // Background colors
  background: {
    light: '#FFFFFF',
    dark: '#0F172A',
    subtle: '#F8FAFC',
  },

  // Text colors
  text: {
    light: {
      primary: '#0F172A',
      secondary: '#475569',
      tertiary: '#94A3B8',
    },
    dark: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      tertiary: '#94A3B8',
    },
  },

  // Brand gradients (CSS-like for reference)
  gradients: {
    primary: ['#3B82F6', '#2563EB', '#4F46E5'], // blue-500 -> blue-600 -> indigo-600
    accent: ['#6366F1', '#4F46E5'], // indigo-500 -> indigo-600
    success: ['#10B981', '#059669'], // emerald-500 -> emerald-600
  },
};

export type ColorScheme = 'light' | 'dark';
