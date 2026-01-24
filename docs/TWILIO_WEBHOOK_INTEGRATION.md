# Twilio Webhook Server Integration

This document describes how the TalkTool Expo mobile app integrates with the Twilio webhook handling server for real-time translated phone calls.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TalkTool System                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────────────┐
│   Expo App      │    │  Next.js Backend    │    │  Twilio Webhook Server  │
│                 │    │                     │    │                         │
│  VoiceContext   │───▶│  /api/accessToken   │    │  /talk (outbound)       │
│  useDisplaySocket│   │  (JWT → Twilio      │    │  /incoming (inbound)    │
│                 │    │   access token)     │    │  /call/display/:sid     │
└────────┬────────┘    └─────────────────────┘    └────────────┬────────────┘
         │                                                      │
         │              ┌─────────────────────┐                │
         └─────────────▶│    Twilio Cloud     │◀───────────────┘
                        │                     │
                        │  - Voice Calls      │
                        │  - TwiML            │
                        │  - Recording        │
                        │  - STT/TTS          │
                        └─────────────────────┘
```

### Flow Summary

1. **Outbound Call**: App gets access token from Next.js backend → Twilio SDK connects → Server's `/talk` route handles call → WebSocket streams transcripts
2. **Inbound Call**: Twilio calls `/incoming` webhook → Server determines routing → Push notification to app → App accepts via SDK → WebSocket streams transcripts

---

## Environment Configuration

```bash
# .env / app.config.js

# Next.js Backend (user data, auth tokens)
EXPO_PUBLIC_BACKEND_URL=https://usetalktool.com

# Twilio Webhook Server (call handling)
EXPO_PUBLIC_TWILIO_SERVER_URL=https://usetalktoolserver.ngrok.app

# WebSocket URL (real-time transcripts)
EXPO_PUBLIC_WEBSOCKET_URL=wss://usetalktoolserver.ngrok.app
```

These are configured in `src/utils/constants.ts`:

```typescript
export const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL
  ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`
  : 'https://usetalktool.com/api';

export const TWILIO_SERVER_URL = process.env.EXPO_PUBLIC_TWILIO_SERVER_URL
  ?? 'https://usetalktoolserver.ngrok.app';

export const WS_BASE_URL = process.env.EXPO_PUBLIC_WEBSOCKET_URL
  ?? 'wss://usetalktoolserver.ngrok.app';
```

---

## Outbound Calls (`/talk` Route)

When the mobile app initiates an outbound call, the Twilio SDK connects to the server's `/talk` endpoint with the following parameters.

### Parameter Reference

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `To` | string | Yes | Destination phone number in E.164 format (e.g., `+15551234567`) |
| `callerId` | string | Yes | Caller ID number to display to recipient |
| `repLang` | string | Yes | User's language for STT (speech-to-text locale, e.g., `en-US`) |
| `customerLang` | string | Yes | Recipient's language (e.g., `es-MX`) |
| `clerkUserId` | string | No | Clerk user ID for tracking and billing |
| `orgId` | string | No | Organization ID for team accounts |
| `translateInitially` | boolean | No | Enable automatic greeting translation (default: `false`) |
| `initialMessage` | string | No | Custom welcome message (pre-translated for recipient) |
| `initialMessageOriginal` | string | No | Original welcome message text (for transcript) |

### Current Implementation

The current `VoiceContext` implementation (`src/contexts/VoiceContext.tsx`):

```typescript
interface OutboundCallParams {
  toNumber: string;
  fromNumber: string;
  fromLanguage: string;
  toLanguage: string;
}

const makeCall = useCallback(async (params: OutboundCallParams) => {
  // ... get Twilio access token ...

  const call = await voiceRef.current.connect(twilioToken, {
    params: {
      To: params.toNumber,
      From: params.fromNumber,
      fromLanguage: params.fromLanguage,
      toLanguage: params.toLanguage,
    },
  });
  // ...
}, [getToken]);
```

### Enhanced Implementation

To support all server parameters, update the interface and `makeCall`:

```typescript
interface OutboundCallParams {
  toNumber: string;
  fromNumber: string;
  fromLanguage: string;
  toLanguage: string;
  // Optional parameters
  initialMessage?: string;
  initialMessageOriginal?: string;
  translateInitially?: boolean;
  clerkUserId?: string;
  orgId?: string;
}

const makeCall = useCallback(async (params: OutboundCallParams) => {
  // ... get Twilio access token ...

  // Get user/org IDs from Clerk
  const { userId, organizationId } = useAuth();

  const call = await voiceRef.current.connect(twilioToken, {
    params: {
      To: params.toNumber,
      callerId: params.fromNumber,  // Server expects 'callerId'
      repLang: params.fromLanguage,  // Server expects 'repLang'
      customerLang: params.toLanguage,  // Server expects 'customerLang'
      translateInitially: params.translateInitially ? 'true' : 'false',
      initialMessage: params.initialMessage || '',
      initialMessageOriginal: params.initialMessageOriginal || '',
      clerkUserId: userId || '',
      orgId: organizationId || '',
    },
  });
  // ...
}, [getToken]);
```

### Server-Side Behavior

When the `/talk` endpoint receives these parameters:

1. **Validates** the caller ID and destination number
2. **Initiates** the outbound call via Twilio
3. **Configures** bidirectional speech-to-text (STT) streams
4. **Translates** audio in real-time between `repLang` and `customerLang`
5. **Streams** transcripts to connected WebSocket clients
6. **Records** the call (if enabled for the number)

---

## Inbound Calls (`/incoming` Route)

Twilio sends inbound calls to the `/incoming` webhook, which routes based on the phone number's policy configuration.

### How It Works

```
Phone Call → Twilio → /incoming webhook
                         │
                         ▼
              ┌─────────────────────┐
              │  Number Policy      │
              │  Configuration      │
              └─────────┬───────────┘
                        │
        ┌───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
   │  IVR    │    │ Forward │    │Allowlist│    │  Block  │
   │Language │    │  Direct │    │  Check  │    │         │
   │ Select  │    │         │    │         │    │         │
   └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### Policy Modes

| Mode | Behavior |
|------|----------|
| `all-callers-select-language` | IVR prompts caller to press 1-9 for language selection |
| `incoming-calls-forwarded-to-main` | Fixed language, forwards directly to assigned agent |
| `only-select-callers-select-language` | Checks allowlist, then forwards or prompts for language |
| `no-incoming-calls-allowed` | Rejects all incoming calls with a message |

### Mobile App Handling

When an inbound call arrives:

1. **Push Notification**: Server sends push notification via Twilio
2. **SDK Event**: `Voice.Event.CallInvite` fires in VoiceContext
3. **UI Display**: App shows incoming call screen with caller info
4. **Accept/Reject**: User can accept or reject the call

```typescript
// VoiceContext handles incoming calls
voice.on(Voice.Event.CallInvite, handleIncomingCall);

const handleIncomingCall = (callInvite: CallInvite) => {
  setIncomingCallInvite(callInvite);
  setCallState('ringing');
};

const acceptIncomingCall = async () => {
  const call = await incomingCallInvite.accept();
  setActiveCall(call);
  setupCallEventListeners(call);
};
```

### CallInvite Custom Parameters

The `CallInvite` object includes custom parameters set by the server:

| Parameter | Description |
|-----------|-------------|
| `From` | Caller's phone number |
| `CallerName` | Caller name (if available from contacts) |
| `fromLanguage` | Caller's detected/selected language |
| `toLanguage` | Recipient's (agent's) language |

Access via:
```typescript
const customParams = callInvite.getCustomParameters();
const callerLanguage = customParams.fromLanguage;
```

---

## WebSocket Integration (Real-time Transcripts)

The `useDisplaySocket` hook (`src/hooks/useDisplaySocket.ts`) connects to the server for real-time transcriptions.

### Connection URL

```typescript
const wsUrl = `${WS_BASE_URL}/call/display/${callSid}`;
// Example: wss://usetalktoolserver.ngrok.app/call/display/CA1234567890abcdef
```

### Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `transcript` / `translation` | Server → Client | Real-time transcript with translation |
| `call_end` / `ended` | Server → Client | Call has ended |
| `error` | Server → Client | Error notification |
| `heartbeat` / `ping` | Client → Server | Keep-alive (every 30s) |
| `pong` | Server → Client | Heartbeat acknowledgment |

### Transcript Message Structure

```typescript
interface TranscriptMessage {
  id: string;                    // Unique message ID
  callSid: string;              // Twilio Call SID
  speaker: 'user' | 'remote';   // Who spoke
  originalText: string;         // Original transcript
  translatedText: string;       // Translated text
  originalLanguage: string;     // Source language code
  targetLanguage: string;       // Target language code
  timestamp: Date;              // When spoken
}
```

### Usage Example

```typescript
import { useDisplaySocket } from '../hooks/useDisplaySocket';
import { useVoice } from '../contexts/VoiceContext';

function ActiveCallScreen() {
  const { callSid, addTranscript, transcripts } = useVoice();

  const { isConnected, error, reconnect } = useDisplaySocket({
    callSid,
    onTranscript: (transcript) => {
      addTranscript(transcript);
    },
    onCallEnd: () => {
      console.log('Call ended via socket');
    },
    onError: (err) => {
      console.error('Socket error:', err);
    },
  });

  return (
    <View>
      {transcripts.map((t) => (
        <TranscriptBubble key={t.id} message={t} />
      ))}
    </View>
  );
}
```

### Reconnection Behavior

- Auto-reconnects on disconnect (up to 5 attempts)
- 3-second delay between attempts
- Reconnects when app returns to foreground
- Manual `reconnect()` function available

---

## Language Codes Reference

The server uses locale codes for STT (Speech-to-Text) and short codes for translation.

| Language | STT Locale | Amazon Locale | Translate Code | Greeting |
|----------|------------|---------------|----------------|----------|
| English (US) | `en-US` | `en-US` | `en` | Hello |
| Spanish (Mexico) | `es-MX` | `es-US` | `es` | Hola |
| Spanish (Spain) | `es-ES` | `es-ES` | `es` | Hola |
| French | `fr-FR` | `fr-FR` | `fr` | Bonjour |
| Portuguese (Brazil) | `pt-BR` | `pt-BR` | `pt` | Olá |
| Mandarin | `zh-CN` | `zh-CN` | `zh` | 你好 |
| German | `de-DE` | `de-DE` | `de` | Hallo |
| Japanese | `ja-JP` | `ja-JP` | `ja` | こんにちは |
| Korean | `ko-KR` | `ko-KR` | `ko` | 안녕하세요 |
| Arabic | `ar-SA` | `ar-SA` | `ar` | مرحبا |
| Hindi | `hi-IN` | `hi-IN` | `hi` | नमस्ते |
| Italian | `it-IT` | `it-IT` | `it` | Ciao |
| Russian | `ru-RU` | `ru-RU` | `ru` | Привет |
| Vietnamese | `vi-VN` | `vi-VN` | `vi` | Xin chào |
| Thai | `th-TH` | `th-TH` | `th` | สวัสดี |
| Dutch | `nl-NL` | `nl-NL` | `nl` | Hallo |
| Polish | `pl-PL` | `pl-PL` | `pl` | Cześć |
| Turkish | `tr-TR` | `tr-TR` | `tr` | Merhaba |

### Mobile App Language Mapping

The mobile app (`src/utils/languages.ts`) uses short codes. When making calls, map to full locale:

```typescript
const languageToLocale: Record<string, string> = {
  'en': 'en-US',
  'es': 'es-MX',
  'zh': 'zh-CN',
  'hi': 'hi-IN',
  'ar': 'ar-SA',
  'pt': 'pt-BR',
  'ru': 'ru-RU',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'it': 'it-IT',
  'vi': 'vi-VN',
  // ... etc
};
```

---

## Security Considerations

### 1. Use HTTPS/WSS in Production
```typescript
// Always verify URLs use secure protocols
const isSecure = WS_BASE_URL.startsWith('wss://');
```

### 2. Access Token Expiration
Twilio access tokens expire (typically 1 hour). Always fetch a fresh token before initiating a call:
```typescript
// Don't cache tokens - fetch fresh before each call
const response = await fetch(`${API_BASE_URL}/accessToken`, { ... });
```

### 3. Validate CallSid Ownership
Before displaying transcripts, the server should validate that the requesting user owns the call:
```typescript
// Server validates user owns callSid before sending transcripts
if (call.userId !== authenticatedUserId) {
  ws.close(4003, 'Unauthorized');
}
```

### 4. Recording URL Security
Recording URLs from Twilio are signed with expiration. Don't store or share raw URLs:
```typescript
// Recording URLs expire - fetch fresh when needed
const { recordingUrl } = await fetch(`/api/recordings/${callSid}`);
```

### 5. Never Log Sensitive Data
```typescript
// BAD
console.log('Call params:', params);

// GOOD
console.log('Call initiated to:', params.toNumber.slice(0, 6) + '****');
```

---

## Troubleshooting Guide

### Call Fails to Connect

**Symptoms**: Call state goes to `connecting` then immediately `idle`

**Possible Causes**:
1. Invalid access token - fetch a fresh one
2. Network connectivity issues
3. Invalid phone number format (must be E.164: `+15551234567`)
4. Insufficient account balance

**Debug Steps**:
```typescript
// Enable verbose logging
voice.on(Voice.Event.Error, (err) => {
  console.error('Voice error:', err.code, err.message);
});

call.on(Call.Event.ConnectFailure, (err) => {
  console.error('Connect failure:', err);
});
```

### WebSocket Not Connecting

**Symptoms**: `isConnected` stays `false`, no transcripts appear

**Possible Causes**:
1. CallSid not yet available (call not fully connected)
2. WebSocket URL misconfigured
3. Server not running or unreachable

**Debug Steps**:
```typescript
// Verify callSid exists before socket connection
useEffect(() => {
  if (callSid) {
    console.log('Connecting socket for:', callSid);
    // Socket will auto-connect via useDisplaySocket
  }
}, [callSid]);
```

### Transcripts Missing or Delayed

**Symptoms**: Call audio works but transcripts don't appear

**Possible Causes**:
1. WebSocket disconnected mid-call
2. Server-side STT service issues
3. Language code mismatch

**Debug Steps**:
```typescript
// Log all incoming WebSocket messages
ws.onmessage = (event) => {
  console.log('WS message:', event.data);
  // ... handle message
};
```

### Incoming Calls Not Received

**Symptoms**: Phone rings but app shows nothing

**Possible Causes**:
1. Push notifications not configured
2. Voice SDK not registered
3. App in background without proper permissions

**Debug Steps**:
```typescript
// Check registration status
const { isRegistered } = useVoice();
console.log('Voice SDK registered:', isRegistered);

// Verify registration
voice.on(Voice.Event.Registered, () => {
  console.log('Successfully registered for incoming calls');
});
```

### Audio Quality Issues

**Symptoms**: Choppy audio, delays, echo

**Possible Causes**:
1. Poor network connection
2. Bluetooth/audio routing issues
3. Background mode not properly configured

**Solutions**:
- Test on WiFi first to rule out network
- Ensure audio session category is correctly set
- Check iOS background modes include `voip`

---

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)
- [Data Models](./DATA_MODELS.md)
- [Twilio Voice React Native SDK](https://github.com/twilio/twilio-voice-react-native)
