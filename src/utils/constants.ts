// Use environment variables with fallbacks for development

// Next.js Backend - for data operations (user profile, calls history, contacts, etc.)
export const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL
  ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`
  : __DEV__
    ? 'http://localhost:3000/api'
    : 'https://usetalktool.com/api';

// Twilio/Call Server - for call handling, access tokens, availability
export const TWILIO_SERVER_URL = process.env.EXPO_PUBLIC_TWILIO_SERVER_URL
  ?? (__DEV__ ? 'http://localhost:3001' : 'https://usetalktoolserver.ngrok.app');

// WebSocket URL - for real-time transcripts during calls
export const WS_BASE_URL = process.env.EXPO_PUBLIC_WEBSOCKET_URL
  ?? (__DEV__ ? 'ws://localhost:3001' : 'wss://usetalktoolserver.ngrok.app');

// Live Translation WebSocket URL - for live translate feature
export const LIVE_TRANS_WS_URL = process.env.EXPO_PUBLIC_LIVE_TRANS_URL
  ?? (__DEV__ ? 'ws://localhost:3002' : 'wss://live-trans.usetalktool.com');

export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  SETTINGS: 'settings',
} as const;

export const QUERY_KEYS = {
  BALANCE: 'balance',
  CALLS: 'calls',
  CALL_DETAIL: 'callDetail',
  CONTACTS: 'contacts',
} as const;

export const CALL_TIMEOUT_MS = 60000; // 1 minute
export const WS_RECONNECT_INTERVAL_MS = 1500;
export const MAX_WS_RECONNECT_ATTEMPTS = 5;

export const PLAN_LIMITS = {
  starter: {
    minutesPerMonth: 100,
    maxContacts: 50,
  },
  professional: {
    minutesPerMonth: 500,
    maxContacts: 200,
  },
  enterprise: {
    minutesPerMonth: -1, // unlimited
    maxContacts: -1, // unlimited
  },
} as const;
