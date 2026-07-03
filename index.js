// LiveKit React Native polyfills (DOMException, MediaRecorderShim, etc.) MUST
// be installed before any module that pulls in `livekit-client`. Expo Router
// pre-loads every route file (which transitively imports livekit-client through
// VoiceContext), so we cannot rely on a registerGlobals() call inside
// app/_layout.tsx — by the time that runs, the broken imports have already
// failed. CommonJS require() gives us strict synchronous execution order.
const { registerGlobals } = require('@livekit/react-native');
registerGlobals();

// Hand off to Expo Router.
require('expo-router/entry');
