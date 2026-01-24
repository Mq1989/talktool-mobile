# Claude Code Prompt: TalkTool Expo Mobile App

## Project Overview

Build a production-ready Expo (React Native) mobile app for **TalkTool** - a real-time phone translation service that provides sub-2-second latency translation across 50+ languages. The app serves as the mobile companion to usetalktool.com, allowing users to manage their account, initiate translated calls, and monitor usage.

---

## Core Product Context

TalkTool is a B2B real-time phone translation platform that:
- Provides sub-2-second latency translation during live phone calls
- Supports 50+ languages
- Uses AWS Speech-to-Text, Google Translate, and OpenAI Text-to-Speech
- Integrates with Twilio for media streams
- Targets healthcare providers, immigration law firms, and international business consultancies

---

## Technical Requirements

### Expo Configuration
```bash
# Initialize with Expo SDK 51+
npx create-expo-app talktool-mobile --template expo-template-blank-typescript

# Required Expo packages
npx expo install expo-router expo-secure-store expo-notifications expo-av expo-haptics expo-clipboard expo-linking
```

### Core Dependencies
```json
{
  "dependencies": {
    "@react-navigation/native": "^6.x",
    "@tanstack/react-query": "^5.x",
    "zustand": "^4.x",
    "axios": "^1.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "@hookform/resolvers": "^3.x",
    "date-fns": "^3.x",
    "expo-router": "~3.x"
  }
}
```

---

## App Architecture

### Directory Structure
```
talktool-mobile/
├── app/                          # Expo Router file-based routing
│   ├── (auth)/                   # Auth group (unauthenticated)
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/                   # Main app tabs (authenticated)
│   │   ├── index.tsx             # Dashboard/Home
│   │   ├── calls.tsx             # Call history
│   │   ├── contacts.tsx          # Saved contacts
│   │   └── settings.tsx          # Account settings
│   ├── call/
│   │   └── [id].tsx              # Active call screen
│   ├── _layout.tsx               # Root layout
│   └── +not-found.tsx
├── src/
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Avatar.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── call/
│   │   │   ├── LanguageSelector.tsx
│   │   │   ├── CallControls.tsx
│   │   │   ├── TranscriptionDisplay.tsx
│   │   │   └── CallTimer.tsx
│   │   └── common/
│   │       ├── Header.tsx
│   │       └── EmptyState.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCalls.ts
│   │   ├── useWebSocket.ts
│   │   └── useNotifications.ts
│   ├── services/
│   │   ├── api.ts                # Axios instance & interceptors
│   │   ├── auth.service.ts
│   │   ├── calls.service.ts
│   │   └── websocket.service.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── callStore.ts
│   │   └── settingsStore.ts
│   ├── types/
│   │   ├── api.types.ts
│   │   ├── call.types.ts
│   │   └── user.types.ts
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   └── languages.ts
│   └── theme/
│       ├── colors.ts
│       ├── typography.ts
│       └── spacing.ts
```

---

## Feature Specifications

### 1. Authentication Flow

#### Login Screen
- Email/password authentication
- "Remember me" with secure token storage
- Social login options (Google, Apple)
- Link to registration and password reset

#### Registration Screen
- Email, password, company name fields
- Password strength indicator
- Terms of service acceptance
- Email verification flow

#### Implementation
```typescript
// src/store/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}
```

---

### 2. Dashboard / Home Screen

Display:
- **Usage summary card**: Minutes used / minutes remaining this billing period
- **Quick dial**: Initiate new translated call with one tap
- **Recent calls**: Last 5 calls with caller info and language pair
- **Account status**: Plan type, renewal date

```typescript
// Dashboard data structure
interface DashboardData {
  usage: {
    minutesUsed: number;
    minutesRemaining: number;
    billingPeriodEnd: Date;
  };
  recentCalls: Call[];
  accountStatus: {
    plan: 'starter' | 'professional' | 'enterprise';
    renewalDate: Date;
    isActive: boolean;
  };
}
```

---

### 3. Initiate Call Flow

#### New Call Screen
1. **Select languages**
   - "Your language" dropdown (default from settings)
   - "Their language" dropdown
   - Swap button between languages
   
2. **Enter phone number**
   - International phone input with country code picker
   - Recent numbers suggestions
   - Contact picker integration

3. **Call options**
   - Speaker mode toggle
   - Recording consent toggle (if enabled for account)

4. **Initiate call button**
   - Shows estimated wait time
   - Triggers WebSocket connection to backend

```typescript
// src/types/call.types.ts
interface CallInitiation {
  fromLanguage: LanguageCode;
  toLanguage: LanguageCode;
  phoneNumber: string;
  enableRecording: boolean;
  speakerMode: boolean;
}

interface ActiveCall {
  id: string;
  status: 'connecting' | 'ringing' | 'active' | 'ended';
  startTime: Date | null;
  duration: number;
  fromLanguage: LanguageCode;
  toLanguage: LanguageCode;
  transcriptions: Transcription[];
}

interface Transcription {
  id: string;
  timestamp: Date;
  originalText: string;
  translatedText: string;
  speaker: 'user' | 'remote';
  language: LanguageCode;
}
```

---

### 4. Active Call Screen

#### UI Elements
- **Call timer**: Duration display (MM:SS)
- **Language indicators**: Shows active language pair
- **Live transcription panel**: 
  - Scrolling view of transcriptions
  - Color-coded by speaker (user vs remote)
  - Original text with translation below
- **Call controls**:
  - Mute/unmute microphone
  - Speaker toggle
  - End call button (prominent, red)
  - Minimize to floating window

#### WebSocket Integration
```typescript
// src/services/websocket.service.ts
class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  
  connect(callId: string, token: string): void;
  disconnect(): void;
  onTranscription(callback: (transcription: Transcription) => void): void;
  onCallStateChange(callback: (state: CallState) => void): void;
  onError(callback: (error: Error) => void): void;
}
```

---

### 5. Call History Screen

#### Features
- **List view** of all past calls
- **Filter options**: Date range, language, duration
- **Search**: By phone number or contact name
- **Call detail modal**:
  - Full transcription history
  - Call recording playback (if available)
  - Export transcript option
  - Add to contacts option

```typescript
interface CallHistoryItem {
  id: string;
  phoneNumber: string;
  contactName?: string;
  fromLanguage: LanguageCode;
  toLanguage: LanguageCode;
  startTime: Date;
  duration: number; // seconds
  hasRecording: boolean;
  hasTranscript: boolean;
}
```

---

### 6. Contacts Screen

#### Features
- **Contact list**: Saved contacts with preferred languages
- **Add contact**: Name, phone, preferred language
- **Quick call**: Tap contact to initiate call with saved preferences
- **Import contacts**: Option to import from phone contacts

```typescript
interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  preferredLanguage: LanguageCode;
  notes?: string;
  lastCalled?: Date;
  totalCalls: number;
}
```

---

### 7. Settings Screen

#### Sections
- **Profile**: Name, email, company, profile photo
- **Preferences**:
  - Default "my language"
  - Default speaker mode
  - Notification preferences
- **Subscription**: Current plan, usage, upgrade options
- **Security**: Change password, enable 2FA
- **Support**: Help center link, contact support
- **Legal**: Terms, privacy policy
- **Sign out**

---

## API Integration

### Base Configuration
```typescript
// src/services/api.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3001/api'
  : 'https://api.usetalktool.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or logout
    }
    return Promise.reject(error);
  }
);

export default api;
```

### API Endpoints to Integrate
```typescript
// Auth
POST   /auth/login
POST   /auth/register
POST   /auth/logout
POST   /auth/refresh
POST   /auth/forgot-password

// User
GET    /user/profile
PATCH  /user/profile
GET    /user/usage

// Calls
POST   /calls/initiate
GET    /calls/history
GET    /calls/:id
GET    /calls/:id/transcript

// Contacts
GET    /contacts
POST   /contacts
PATCH  /contacts/:id
DELETE /contacts/:id

// WebSocket
WS     /ws/call/:callId
```

---

## UI/UX Design System

### Color Palette
```typescript
// src/theme/colors.ts
export const colors = {
  // Primary - TalkTool brand blue
  primary: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3',  // Main brand color
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },
  
  // Semantic colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  
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
  },
  
  // Call-specific
  call: {
    active: '#10B981',
    connecting: '#F59E0B',
    ended: '#6B7280',
    muted: '#EF4444',
  },
};
```

### Typography
```typescript
// src/theme/typography.ts
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
};
```

### Spacing
```typescript
// src/theme/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};
```

---

## Language Support

```typescript
// src/utils/languages.ts
export type LanguageCode = 
  | 'en' | 'es' | 'zh' | 'hi' | 'ar' | 'pt' | 'bn' | 'ru' 
  | 'ja' | 'pa' | 'de' | 'ko' | 'fr' | 'tr' | 'it' | 'th'
  | 'vi' | 'pl' | 'uk' | 'nl' | 'el' | 'cs' | 'sv' | 'hu'
  | 'fi' | 'da' | 'no' | 'sk' | 'ro' | 'bg' | 'hr' | 'sl'
  | 'et' | 'lv' | 'lt' | 'he' | 'id' | 'ms' | 'tl' | 'sw'
  | 'af' | 'am' | 'az' | 'be' | 'bs' | 'ca' | 'cy' | 'eo'
  | 'eu' | 'fa' | 'ga' | 'gl' | 'gu' | 'ha' | 'ht' | 'hy';

export const languages: Record<LanguageCode, { name: string; nativeName: string; flag: string }> = {
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  // ... continue for all 50+ languages
};

export const popularLanguages: LanguageCode[] = [
  'en', 'es', 'zh', 'hi', 'ar', 'pt', 'ru', 'ja', 'ko', 'fr', 'de', 'vi'
];
```

---

## Push Notifications

### Setup
```typescript
// src/hooks/useNotifications.ts
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

export function useNotifications() {
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  const registerForPushNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    
    const token = await Notifications.getExpoPushTokenAsync();
    // Send token to backend
  };
}
```

### Notification Types
- Incoming call alerts
- Missed call notifications
- Usage limit warnings
- Account/billing updates

---

## State Management

### Auth Store
```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### Call Store
```typescript
// src/store/callStore.ts
import { create } from 'zustand';

interface CallStore {
  activeCall: ActiveCall | null;
  transcriptions: Transcription[];
  setActiveCall: (call: ActiveCall | null) => void;
  addTranscription: (transcription: Transcription) => void;
  clearTranscriptions: () => void;
}

export const useCallStore = create<CallStore>((set) => ({
  activeCall: null,
  transcriptions: [],
  setActiveCall: (call) => set({ activeCall: call }),
  addTranscription: (t) => set((s) => ({ transcriptions: [...s.transcriptions, t] })),
  clearTranscriptions: () => set({ transcriptions: [] }),
}));
```

---

## Testing Commands

```bash
# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Run with tunnel for physical device testing
npx expo start --tunnel

# Build for production
eas build --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## Environment Configuration

```typescript
// app.config.ts
export default {
  expo: {
    name: 'TalkTool',
    slug: 'talktool',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#2196F3',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.talktool.app',
      infoPlist: {
        NSMicrophoneUsageDescription: 'TalkTool needs microphone access for translated calls',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#2196F3',
      },
      package: 'com.talktool.app',
      permissions: ['RECORD_AUDIO'],
    },
    extra: {
      apiUrl: process.env.API_URL,
      wsUrl: process.env.WS_URL,
      eas: {
        projectId: 'your-project-id',
      },
    },
  },
};
```

---

## Implementation Priority

### Phase 1 - MVP (Week 1-2)
1. ✅ Project setup with Expo Router
2. ✅ Authentication flow (login/register/logout)
3. ✅ Dashboard with usage display
4. ✅ Basic call initiation UI
5. ✅ Call history list

### Phase 2 - Core Features (Week 3-4)
1. ✅ Active call screen with transcription
2. ✅ WebSocket integration for real-time updates
3. ✅ Contacts management
4. ✅ Settings screen

### Phase 3 - Polish (Week 5)
1. ✅ Push notifications
2. ✅ Offline support
3. ✅ Error handling & loading states
4. ✅ Accessibility improvements
5. ✅ Performance optimization

---

## Additional Instructions for Claude Code

1. **Use TypeScript strictly** - No `any` types, proper interfaces for all data
2. **Follow React Native best practices** - Use FlatList for lists, memoize appropriately
3. **Handle all edge cases** - Loading, error, empty states for every screen
4. **Implement proper error boundaries** - Catch and display errors gracefully
5. **Add haptic feedback** - Use expo-haptics for button presses and call events
6. **Support dark mode** - Use useColorScheme and themed styles
7. **Optimize for performance** - Lazy load screens, optimize images, minimize re-renders
8. **Write clean, documented code** - JSDoc comments for complex functions
9. **Test on both platforms** - Ensure iOS and Android compatibility

---

## Quick Start Command
