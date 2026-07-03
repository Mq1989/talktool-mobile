// Use environment variables with fallbacks for development

// App mode from environment
export const APP_MODE = process.env.EXPO_PUBLIC_APP_MODE ?? (__DEV__ ? 'development' : 'production');
export const IS_PRODUCTION = APP_MODE === 'production';

// Next.js Backend - for data operations (user profile, calls history, contacts, etc.)
// Note: iOS can't access localhost, so dev fallback uses ngrok
export const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL
  ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`
  : IS_PRODUCTION
    ? 'https://usetalktool.com/api'
    : 'https://usetalktoolfrontend.ngrok.app/api';

// Web Base URL (for opening Safari - must match same Clerk instance as API)
// Note: iOS can't access localhost, so dev fallback uses ngrok
export const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL
  ?? (IS_PRODUCTION ? 'https://usetalktool.com' : 'https://usetalktoolfrontend.ngrok.app');

// LiveKit call server (livekit-server.js) - place-call/token, /call/display
// socket, /agent/notify, availability. NOTE: despite the name, this is the
// LiveKit Express server, NOT the legacy Twilio server.js.
// iOS can't reach localhost, so dev also points at the ngrok tunnel that fronts
// the local livekit-server (run `ngrok http 8090`).
export const TWILIO_SERVER_URL = process.env.EXPO_PUBLIC_TWILIO_SERVER_URL
  ?? 'https://usetalktoolserver.ngrok.app';

// WebSocket URL - for real-time transcripts during calls.
// DERIVED from TWILIO_SERVER_URL (http->ws, https->wss) so the place-call host
// and the /call/display socket host can NEVER drift apart. They must resolve to
// the same livekit-server process: place-call creates the in-memory session
// that the display socket attaches to. Override with EXPO_PUBLIC_WEBSOCKET_URL
// only if you know it points at the same host.
export const WS_BASE_URL =
  process.env.EXPO_PUBLIC_WEBSOCKET_URL ??
  TWILIO_SERVER_URL.replace(/^http(s?):\/\//, (_m: string, s: string) => (s ? 'wss://' : 'ws://'));

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

// Display WebSocket reconnection (more aggressive for call reliability)
export const DISPLAY_WS_MAX_RECONNECT_ATTEMPTS = 15;
export const DISPLAY_WS_RECONNECT_BASE_MS = 1000;
export const DISPLAY_WS_RECONNECT_MAX_MS = 30000;

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
