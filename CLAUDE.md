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

# Physical device testing
npx expo start --tunnel

# Development build (required for Twilio Voice SDK - won't work in Expo Go)
npx expo run:ios
npx expo run:android

# Production builds (requires EAS CLI: npm install -g eas-cli)
eas build --platform ios
eas build --platform android
```

## Environment Setup

Copy `.env.example` to `.env` and configure:
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk authentication key
- `EXPO_PUBLIC_BACKEND_URL` - Next.js API base URL (e.g., `https://usetalktoolserver.ngrok.app`)
- `EXPO_PUBLIC_WEBSOCKET_URL` - WebSocket endpoint for transcriptions (e.g., `wss://usetalktoolserver.ngrok.app`)
- `EXPO_PUBLIC_PROJECT_ID` - EAS project ID for builds

## Architecture

### Provider Stack (app/_layout.tsx)
```
ClerkProvider → ClerkLoaded → QueryClientProvider → SafeAreaProvider → VoiceProvider → Slot
```

### State Management
- **React Query**: Server state (calls, contacts, balance) with 5-minute stale time, 2 retries
- **Zustand**: Client state in four stores:
  - `authStore` - User profile data (memory)
  - `callStore` - Active call, transcriptions, audio controls (memory)
  - `settingsStore` - User preferences (AsyncStorage persisted)
  - `liveTranslateStore` - Live translation session state (memory)
- **VoiceContext**: Twilio Voice SDK state and call management

### Routing
File-based routing via Expo Router:
- `app/(auth)/` - Unauthenticated screens (login, register, forgot-password)
- `app/(tabs)/` - Tab navigation for authenticated users (dashboard, calls, contacts, settings, translate)
- `app/call/` - Call screens (new, incoming, [id] for active calls)

## Critical Architectural Patterns

### Session Key Convention
The `parentCallSid` is the critical session key that links the mobile client to the backend call session. It's passed via Twilio custom parameters on inbound calls and returned from the server on outbound calls. All WebSocket messages and API calls use this as the primary identifier.

### Twilio SDK Conditional Loading
The Twilio Voice SDK is not available in Expo Go. VoiceContext handles this gracefully:
```typescript
let Voice: any = null;
try {
  const TwilioVoice = require('@twilio/voice-react-native-sdk');
  Voice = TwilioVoice.Voice;
} catch (e) {
  console.warn('Twilio Voice SDK not available - running in Expo Go?');
}
```
Check `isVoiceSupported` before calling voice functions.

### WebSocket Display Channel
The `useDisplaySocket` hook (`src/hooks/useDisplaySocket.ts`) manages real-time transcriptions:
- Connects to `/call/display/{callSid}` endpoint
- Sends `call.join` message with `callSid` and optional `lastMessageTime` for reconnection
- Handles message types: `transcript`, `call-answered`, `call-ringing`, `end-call`, `translation-state-sync`
- Exponential backoff reconnection (max 15 attempts)
- Heartbeat ping every 25 seconds

### Auth Token Flow
1. Clerk SDK manages JWT tokens with secure storage
2. `setAuthTokenGetter()` in `src/services/api.ts` sets up the token retrieval function
3. Axios interceptor automatically attaches Bearer token to all API requests
4. Twilio access tokens are fetched from `/api/accessToken` endpoint using Clerk JWT

### Service Layer Pattern
Services (`src/services/`) abstract API calls; hooks consume them via React Query:
```typescript
// Service handles API call
const callsService = {
  getCallHistory: async (params) => api.get('/calls', { params })
};

// Hook uses service via React Query
const useCalls = () => useInfiniteQuery({
  queryKey: ['calls'],
  queryFn: ({ pageParam }) => callsService.getCallHistory({ page: pageParam })
});
```

## API Endpoints

All endpoints are defined in `src/services/api.ts`:
- Next.js backend at `EXPO_PUBLIC_BACKEND_URL/api` handles: calls history, contacts, balance, access tokens, number configs
- WebSocket server at `EXPO_PUBLIC_WEBSOCKET_URL` handles real-time transcripts

## Key Files

- `src/contexts/VoiceContext.tsx` - Twilio SDK integration, call state machine, WebSocket management
- `src/hooks/useDisplaySocket.ts` - Display channel WebSocket for live transcriptions
- `src/services/api.ts` - API client with all endpoint definitions
- `src/utils/constants.ts` - Environment variables and configuration
- `src/utils/languages.ts` - Language code mappings for STT/TTS
