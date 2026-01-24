# iOS Call Implementation Progress

## Summary

Implementation of iOS call flow via POST `/iosCall` endpoint for TalkTool Mobile.

## Endpoint Specification

**Route:** POST /iosCall

**Parameters:**

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| CallSid | Yes | - | Twilio call SID from iOS SDK (auto-provided) |
| To | Yes | - | Customer phone number |
| callerId | No | TWILIO_NUMBER | Caller ID for outbound call |
| repLang | No | "en-US" | iOS user's language |
| customerLang | No | "es-MX" | Customer's language |
| clerkUserId | No | - | User identifier |
| orgId | No | - | Organization identifier |
| translateInitially | No | true | Start with translation enabled |
| initialMessage | No | - | Custom greeting for customer |

**Flow:**
1. iOS app initiates call via Twilio React Native SDK
2. SDK hits POST /iosCall with parameters
3. Server returns TwiML with Connect.Stream to /call/rep/{CallSid}
4. Server places customer leg via placeSecondLegA()
5. Customer answers, gets connected via /voice/customer → /call/customer/{CallSid}
6. Both streams connected through translation pipeline

## Implementation Status

### Completed

- [x] **VoiceContext.tsx** - Updated `OutboundCallParams` interface to include `orgId` parameter
- [x] **VoiceContext.tsx** - Updated `makeCall()` to pass all parameters to Twilio SDK connect()
  - Parameters passed: `To`, `callerId`, `repLang`, `customerLang`, `clerkUserId`, `orgId`, `translateInitially`, `initialMessage`, `initialMessageOriginal`
  - `CallSid` is automatically provided by the Twilio SDK
- [x] **call.types.ts** - Added `IosCallParams` interface documenting all endpoint parameters
- [x] **app/call/new.tsx** - Updated NewCallScreen to:
  - Import `useOrganization` from Clerk
  - Pass `orgId` from organization context
  - Pass `translateInitially: true` by default

### Files Modified

1. `src/contexts/VoiceContext.tsx`
   - Added `orgId?: string` to `OutboundCallParams` interface
   - Updated call params object to include `orgId`

2. `src/types/call.types.ts`
   - Added `IosCallParams` interface with full documentation

3. `app/call/new.tsx`
   - Added `useOrganization` import from `@clerk/clerk-expo`
   - Added `organization` from `useOrganization()` hook
   - Updated `makeCall()` invocation to pass `orgId` and `translateInitially`

## Architecture Notes

### Call Flow in Mobile App

```
NewCallScreen
    ↓ makeCall({ toNumber, fromNumber, fromLanguage, toLanguage, orgId, translateInitially })
VoiceContext
    ↓ voiceRef.current.connect(twilioToken, { params: callParams })
Twilio Voice SDK
    ↓ POST /iosCall (via TwiML App webhook URL)
Server
    ↓ Returns TwiML → Connect.Stream → Translation Pipeline
```

### Parameter Mapping

| Mobile Param | Server Param | Value Source |
|--------------|--------------|--------------|
| toNumber | To | User input (phone number) |
| fromNumber | callerId | Selected from numberConfigs |
| fromLanguage | repLang | Language selector (converted via getLocaleForLanguage) |
| toLanguage | customerLang | Language selector (converted via getLocaleForLanguage) |
| - | clerkUserId | From Clerk `useAuth().userId` |
| orgId | orgId | From Clerk `useOrganization().organization?.id` |
| translateInitially | translateInitially | Default `true` |
| initialMessage | initialMessage | Optional greeting message |

### Language Code Conversion

The app uses internal language codes (e.g., `EN_US`, `ES_MX`) which are converted to locale codes (e.g., `en-US`, `es-MX`) via `getLocaleForLanguage()` before being sent to the server.

## Display WebSocket Integration

### Overview

Connected iOS Expo app to the existing `/call/display/{callSid}` WebSocket to receive real-time transcript updates during calls.

### WebSocket Protocol

**URL:** `wss://[BACKEND_URL]/call/display/[callSid]`

**Messages Received:**
| Message Type | Purpose |
|-------------|---------|
| `call.join.ack` | Confirms display channel connected |
| `translation-state-sync` | Syncs current translation state (isTranslating, srcLang, dstLang) |
| `transcript` | Real-time transcript with original text and translation |
| `toggle-translation.ack` | Confirms translation state changed |
| `end-call` | Notifies call terminated with reason |
| `pong` | Heartbeat response |

**Messages Sent:**
| Message Type | Purpose |
|-------------|---------|
| `translation-on` | Enable translation |
| `translation-off` | Disable translation |
| `ping` | Heartbeat (sent every 30s) |

### Files Modified

1. **`src/hooks/useDisplaySocket.ts`** - Complete rewrite to match server protocol
   - Added `DisplayTranscript` interface matching server transcript format
   - Added `TranslationState` interface for translation sync
   - Added `CallEndEvent` interface for call end handling
   - Implemented all message type handlers
   - Added `toggleTranslation()` function to control translation on/off
   - Added `isJoined` state to track call.join.ack receipt

2. **`src/components/call/TranscriptionDisplay.tsx`** - New chat-style UI
   - Rep (You) messages on right with blue bubbles
   - Customer messages on left with gray bubbles
   - "TRANSLATED" label with 🌐 icon below original text
   - Timestamps displayed above each message group
   - Smooth fade-in and slide animations for new messages
   - Auto-scroll to bottom on new messages

3. **`app/call/[id].tsx`** - Updated ActiveCallScreen
   - Integrated new `useDisplaySocket` with all callbacks
   - Added local state for `displayTranscripts` and `callEnded`
   - Status header showing: connecting, ringing, active, ended states
   - Language flags with message count
   - Translation toggle button (🌐 Translation On/Off)
   - Call ended overlay with checkmark and redirect
   - Avatar border changes based on call status

### UI Features

- **Status Indicators:**
  - 🟡 Connecting / Ringing (yellow dot, pulsing)
  - 🟢 Active (green dot, steady)
  - ⚫ Ended (gray dot)

- **Chat Bubbles:**
  - Rep messages: Right-aligned, blue background
  - Customer messages: Left-aligned, gray background
  - Translation shown below with "TRANSLATED" label

- **Translation Toggle:**
  - Tap to enable/disable translation via WebSocket
  - Visual feedback (blue when active)

### Testing Checklist

- [ ] Verify call initiates successfully with all parameters
- [ ] Confirm `CallSid` is received in server logs
- [ ] Verify `repLang` and `customerLang` are correctly converted
- [ ] Test with and without organization membership
- [ ] Confirm translation pipeline connects both call legs
- [ ] Test `translateInitially` toggle functionality
- [ ] Verify WebSocket connects after call initiated
- [ ] Confirm `call.join.ack` message received
- [ ] Test transcript messages display correctly (rep on right, customer on left)
- [ ] Verify translation label shows when translation enabled
- [ ] Test translation toggle button sends WebSocket messages
- [ ] Confirm `end-call` message triggers proper UI transition
- [ ] Test app backgrounding/foregrounding reconnects WebSocket
