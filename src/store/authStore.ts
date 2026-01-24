import { create } from 'zustand';
import type { User } from '../types/user.types';

// Extended user info that we store locally (complements Clerk user data)
interface LocalUserData {
  defaultLanguage: string;
  companyName?: string;
  phoneNumbers?: string[];
  minutesBalance?: number;
  plan?: string;
}

interface AuthState {
  // Local user data (supplements Clerk)
  localUserData: LocalUserData | null;
  isLoading: boolean;

  // Actions
  setLocalUserData: (data: LocalUserData) => void;
  updateLocalUserData: (data: Partial<LocalUserData>) => void;
  setLoading: (isLoading: boolean) => void;
  clearLocalData: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  localUserData: null,
  isLoading: false,

  setLocalUserData: (data) =>
    set({
      localUserData: data,
      isLoading: false,
    }),

  updateLocalUserData: (data) =>
    set((state) => ({
      localUserData: state.localUserData
        ? { ...state.localUserData, ...data }
        : { defaultLanguage: 'en', ...data },
    })),

  setLoading: (isLoading) =>
    set({
      isLoading,
    }),

  clearLocalData: () =>
    set({
      localUserData: null,
      isLoading: false,
    }),
}));
