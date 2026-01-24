import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LanguageCode } from '../utils/languages';

interface SettingsState {
  defaultLanguage: LanguageCode;
  defaultSpeakerMode: boolean;
  enableHaptics: boolean;
  theme: 'light' | 'dark' | 'system';

  setDefaultLanguage: (language: LanguageCode) => void;
  setDefaultSpeakerMode: (enabled: boolean) => void;
  setEnableHaptics: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultLanguage: 'en',
      defaultSpeakerMode: false,
      enableHaptics: true,
      theme: 'system',

      setDefaultLanguage: (language) =>
        set({
          defaultLanguage: language,
        }),

      setDefaultSpeakerMode: (enabled) =>
        set({
          defaultSpeakerMode: enabled,
        }),

      setEnableHaptics: (enabled) =>
        set({
          enableHaptics: enabled,
        }),

      setTheme: (theme) =>
        set({
          theme,
        }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
