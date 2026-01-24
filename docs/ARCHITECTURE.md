# TalkTool Mobile App Architecture

## Overview

TalkTool Mobile is a React Native application built with Expo that provides real-time translated phone calls. This document describes the application architecture, technology stack, and key patterns used throughout the codebase.

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | React Native | 0.81.5 |
| Platform | Expo | 54.0.31 |
| Language | TypeScript | 5.8.3 |
| Navigation | Expo Router | 5.0.7 |
| Authentication | Clerk Expo | 3.0.3 |
| API Client | Axios | 1.9.0 |
| Server State | TanStack React Query | 5.80.6 |
| Local State | Zustand | 5.0.5 |
| Voice SDK | @twilio/voice-react-native-sdk | 1.2.0 |
| Storage | AsyncStorage | 2.1.2 |
| UI | Custom Components + Expo |  |

## Directory Structure

```
talktool-mobile/
├── app/                           # Expo Router file-based routing
│   ├── _layout.tsx               # Root layout with providers
│   ├── index.tsx                 # Auth redirect screen
│   ├── (auth)/                   # Auth group (unauthenticated)
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/                   # Tab navigation (authenticated)
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Dashboard
│   │   ├── calls.tsx             # Call history
│   │   ├── contacts.tsx          # Contacts
│   │   └── settings.tsx          # Settings
│   └── call/                     # Call screens
│       ├── new.tsx               # New call
│       ├── incoming.tsx          # Incoming call
│       └── [id].tsx              # Active call
├── src/
│   ├── components/               # Reusable components
│   │   ├── ui/                   # UI primitives
│   │   ├── common/               # Common components
│   │   └── call/                 # Call-specific components
│   ├── services/                 # API and business logic
│   ├── store/                    # Zustand stores
│   ├── types/                    # TypeScript definitions
│   ├── hooks/                    # Custom React hooks
│   ├── contexts/                 # React Contexts
│   ├── theme/                    # Design system
│   └── utils/                    # Utility functions
├── assets/                       # Images, fonts, etc.
└── docs/                         # Documentation
```

## Architecture Layers

### 1. Presentation Layer

**Screens (`app/`)**
- File-based routing using Expo Router
- Each file maps to a route
- Layout files provide shared UI (headers, tabs)
- Screens compose components and connect to hooks/stores

**Components (`src/components/`)**
- **UI Components**: Reusable primitives (Button, Card, Input, etc.)
- **Call Components**: Call-specific UI (CallControls, TranscriptionDisplay)
- **Common Components**: Shared components (Header, EmptyState)

### 2. State Management Layer

**Server State (React Query)**
- Manages async data from backend APIs
- Automatic caching, refetching, pagination
- Query keys defined in `src/utils/constants.ts`
- Used for: calls, contacts, user profile, dashboard

**Client State (Zustand)**
- Lightweight stores for local UI state
- Three stores:
  - `authStore`: User profile data
  - `callStore`: Active call state, transcriptions
  - `settingsStore`: Persisted user preferences

**Context (React Context)**
- `VoiceContext`: Twilio Voice SDK management
- Global state needed by many components

### 3. Service Layer

**API Service (`src/services/api.ts`)**
- Axios instance with interceptors
- Auto-attaches auth tokens
- Base URL from environment
- 15-second timeout

**Domain Services**
- `authService`: Authentication operations
- `userService`: User profile, dashboard
- `callsService`: Call history CRUD
- `contactsService`: Contact management
- `websocketService`: Real-time connection

### 4. Data Layer

**Types (`src/types/`)**
- TypeScript interfaces for all data
- Separated by domain: `api.types.ts`, `user.types.ts`, `call.types.ts`

**Storage**
- Clerk SDK manages auth tokens securely
- AsyncStorage for settings persistence
- React Query cache for server data

## Key Architectural Patterns

### Provider Composition

The root layout composes multiple providers:

```tsx
<ClerkProvider>
  <ClerkLoaded>
    <QueryClientProvider>
      <SafeAreaProvider>
        <VoiceProvider>
          <Stack />
        </VoiceProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  </ClerkLoaded>
</ClerkProvider>
```

### Service Layer Pattern

Services abstract API calls and transform data:

```tsx
// Service handles API call + transformation
const callsService = {
  getCallHistory: async (params) => {
    const response = await api.get('/calls', { params });
    return {
      calls: response.data.data.map(transformCall),
      pagination: response.data.pagination
    };
  }
};

// Hook uses service via React Query
const useCalls = () => {
  return useInfiniteQuery({
    queryKey: ['calls'],
    queryFn: ({ pageParam }) => callsService.getCallHistory({ page: pageParam })
  });
};
```

### Store Separation

State is organized by concern:

| Store | Responsibility | Persistence |
|-------|---------------|-------------|
| authStore | User profile data | Memory only |
| callStore | Active call state | Memory only |
| settingsStore | User preferences | AsyncStorage |

### Hook Composition

Custom hooks combine multiple data sources:

```tsx
const useAuth = () => {
  const clerk = useClerk();              // Clerk SDK
  const { localUserData } = useAuthStore(); // Zustand
  const { data: profile } = useQuery(...);  // React Query

  return {
    user: clerk.user,
    profile,
    localData: localUserData,
    isAuthenticated: !!clerk.user
  };
};
```

## Data Flow

### Authentication Flow

```
User Login
    ↓
Clerk SDK validates credentials
    ↓
JWT token stored securely
    ↓
Token provided to API via interceptor
    ↓
Backend validates token
    ↓
User profile fetched and stored in authStore
```

### Call Flow

```
User initiates call
    ↓
Fetch Twilio access token from backend
    ↓
Twilio SDK connects call
    ↓
callStore updated with call state
    ↓
WebSocket connects for transcriptions
    ↓
Real-time transcriptions added to store
    ↓
Call ends → cleanup state → refresh history
```

### Data Fetching Flow

```
Component mounts
    ↓
useQuery hook triggered
    ↓
Check React Query cache
    ↓ (cache miss or stale)
Service method called
    ↓
API request with auth token
    ↓
Response transformed
    ↓
Cache updated
    ↓
Component re-renders
```

## Environment Configuration

Environment variables are loaded via Expo's env system:

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_BACKEND_URL=https://api.example.com
EXPO_PUBLIC_WEBSOCKET_URL=wss://api.example.com
EXPO_PUBLIC_PROJECT_ID=expo-project-id
```

## Alignment with Next.js Web App

The mobile app mirrors the Next.js web app architecture:

| Concept | Next.js | Expo |
|---------|---------|------|
| Routing | App Router (file-based) | Expo Router (file-based) |
| Auth | Clerk | Clerk Expo |
| API | Server Actions + API Routes | External API calls |
| State | Zustand | Zustand |
| Server State | React Query | React Query |
| Styling | Tailwind CSS | StyleSheet + Theme |
| Voice | Twilio Client | Twilio Voice RN SDK |

## Security Considerations

1. **Authentication**: Clerk handles all auth securely
2. **Token Storage**: Secure storage via Clerk SDK
3. **API Security**: All requests include JWT
4. **Sensitive Data**: No secrets in client code
5. **Input Validation**: Handled by backend

## Performance Optimizations

1. **React Query Caching**: 5-minute stale time
2. **Infinite Queries**: Pagination for large lists
3. **Zustand Selectors**: Minimal re-renders
4. **Lazy Loading**: Screens loaded on-demand
5. **Image Optimization**: Expo Image component

## Error Handling Strategy

1. **API Errors**: Caught in services, surfaced to UI
2. **Network Errors**: Axios interceptors handle
3. **Auth Errors**: 401 triggers re-auth flow
4. **UI Errors**: Error boundaries at route level
5. **WebSocket Errors**: Auto-reconnect with backoff
