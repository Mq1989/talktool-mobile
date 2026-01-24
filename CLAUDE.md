# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TalkTool Mobile is a React Native + Expo app for a real-time phone translation service. It provides sub-2-second latency translation across 50+ languages, integrating with Twilio Voice SDK for calls and WebSockets for live transcriptions.

## Development Commands

```bash
npm start              # Start Expo dev server
npm run ios            # Build and run on iOS (requires Xcode + simulator)
npm run android        # Build and run on Android (requires Android Studio + emulator)
npm run web            # Start web server
npm run lint           # Run ESLint
npm test               # Run Jest tests
npm test -- --testPathPattern="filename"  # Run single test file

# Physical device testing
npx expo start --tunnel

# Production builds (requires EAS CLI: npm install -g eas-cli)
eas build --platform all
eas build --platform ios
eas build --platform android
```

## Environment Setup

Copy `.env.example` to `.env` and configure:
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk authentication key
- `EXPO_PUBLIC_BACKEND_URL` - API base URL (e.g., `https://usetalktoolserver.ngrok.app`)
- `EXPO_PUBLIC_WEBSOCKET_URL` - WebSocket endpoint for transcriptions (e.g., `wss://usetalktoolserver.ngrok.app`)
- `EXPO_PUBLIC_PROJECT_ID` - EAS project ID for builds

## Architecture

### Provider Stack (app/_layout.tsx)
```
ClerkProvider → ClerkLoaded → QueryClientProvider → SafeAreaProvider → VoiceProvider → Router
```

### State Management
- **React Query**: Server state (calls, contacts, user profile) with 5-minute stale time
- **Zustand**: Client state split into four stores:
  - `authStore` - User profile data (memory)
  - `callStore` - Active call, transcriptions, audio controls (memory)
  - `settingsStore` - User preferences (AsyncStorage persisted)
  - `liveTranslateStore` - Live translation session state (memory)
- **VoiceContext**: Twilio Voice SDK management

### Routing
File-based routing via Expo Router:
- `app/(auth)/` - Unauthenticated screens (login, register, forgot-password)
- `app/(tabs)/` - Tab navigation for authenticated users (dashboard, calls, contacts, settings, translate)
- `app/call/` - Call screens (new, incoming, [id] for active calls)

### Key Patterns
- Services (`src/services/`) abstract API calls; hooks consume services via React Query
- Path alias: `@/*` maps to `src/*`
- API requests include Bearer token via axios interceptor (using Clerk SDK tokens)
- WebSocket for real-time transcriptions during calls

## Directory Structure

```
app/                    # Expo Router screens
src/
├── components/
│   ├── ui/            # Button, Card, Input, Badge, Avatar, LoadingSpinner
│   ├── common/        # Header, EmptyState
│   ├── call/          # CallControls, CallTimer, TranscriptionDisplay, LanguageSelector
│   └── translate/     # LiveTranscriptDisplay, SessionControls (live translation UI)
├── contexts/          # VoiceContext (Twilio SDK)
├── services/          # API layer: api.ts, auth, user, calls, contacts, websocket, liveTranslate
├── store/             # Zustand stores
├── hooks/             # useAuth, useCalls, useDisplaySocket, useWebSocket, useNotifications, useLiveTranslate
├── types/             # TypeScript interfaces by domain
├── theme/             # colors, typography, spacing
└── utils/             # constants, helpers, languages, tokenCache
docs/                   # Comprehensive documentation (ARCHITECTURE.md, API_REFERENCE.md, etc.)
```

## Key Technologies

- **Expo SDK 54** with Expo Router for file-based routing
- **Clerk** for authentication with secure token storage
- **Twilio Voice React Native SDK** for phone calls
- **React Query v5** for server state
- **Zustand v4** for client state
- **React Hook Form + Zod** for forms

## Theme

Primary color: `#2196F3` (Material Blue). See `src/theme/colors.ts` for full palette including semantic colors (success, warning, error) and call-specific states.
