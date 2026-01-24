# TalkTool Mobile App Features

## Feature Parity Status

This document specifies all features required to achieve parity with the Next.js web app.

### Legend
- ✅ Implemented
- ⚠️ Partially Implemented
- ❌ Not Implemented

---

## Feature Summary

| Feature | Web App | Mobile Status |
|---------|---------|---------------|
| Authentication (Clerk) | ✅ | ✅ |
| Voice calls with translation | ✅ | ✅ |
| Real-time transcription | ✅ | ✅ |
| Call history | ✅ | ✅ |
| Contacts management | ✅ | ✅ |
| Dashboard with usage stats | ✅ | ✅ |
| Settings/preferences | ✅ | ✅ |
| 48 languages support | ✅ | ✅ |
| Voicemail handling | ✅ | ❌ |
| Organization/team support | ✅ | ❌ |
| Billing/payments (Stripe) | ✅ | ❌ |
| Phone number management | ✅ | ⚠️ |
| Recording playback | ✅ | ❌ |
| Call summaries (AI) | ✅ | ❌ |
| DTMF keypad | ✅ | ❌ |
| IVR on incoming calls | ✅ | ❌ |
| Onboarding flow | ✅ | ❌ |
| Minutes purchasing | ✅ | ❌ |

---

## Core Features (Implemented)

### Authentication

**Status: ✅ Implemented**

| Sub-feature | Status | Notes |
|-------------|--------|-------|
| Email/password login | ✅ | Clerk SDK |
| Email/password registration | ✅ | With email verification |
| OAuth (Google, Apple) | ✅ | Native OAuth flows |
| Forgot password | ✅ | Email reset flow |
| Session management | ✅ | Auto token refresh |
| Secure token storage | ✅ | Clerk secure storage |

**Implementation Files:**
- `app/(auth)/login.tsx`
- `app/(auth)/register.tsx`
- `app/(auth)/forgot-password.tsx`
- `src/hooks/useAuth.ts`
- `src/services/auth.service.ts`

---

### Voice Calling

**Status: ✅ Implemented**

| Sub-feature | Status | Notes |
|-------------|--------|-------|
| Outbound calls | ✅ | Twilio Voice SDK |
| Incoming calls | ✅ | Push notifications + SDK |
| Language selection | ✅ | 48 languages |
| Caller ID selection | ✅ | From user's numbers |
| Mute toggle | ✅ | With haptic feedback |
| Speaker toggle | ✅ | With haptic feedback |
| Call duration timer | ✅ | Real-time display |
| Call state management | ✅ | Zustand store |
| Background handling | ✅ | App state aware |

**Implementation Files:**
- `src/contexts/VoiceContext.tsx`
- `app/call/new.tsx`
- `app/call/[id].tsx`
- `app/call/incoming.tsx`
- `src/store/callStore.ts`
- `src/components/call/CallControls.tsx`

---

### Real-time Transcription

**Status: ✅ Implemented**

| Sub-feature | Status | Notes |
|-------------|--------|-------|
| WebSocket connection | ✅ | Auto-connect on call start |
| Live transcription display | ✅ | Both languages |
| Speaker identification | ✅ | Rep vs Customer |
| Auto-reconnection | ✅ | Exponential backoff |
| Heartbeat keepalive | ✅ | 30-second interval |

**Implementation Files:**
- `src/hooks/useDisplaySocket.ts`
- `src/components/call/TranscriptionDisplay.tsx`
- `src/store/callStore.ts`

---

### Call History

**Status: ✅ Implemented**

| Sub-feature | Status | Notes |
|-------------|--------|-------|
| List all calls | ✅ | Infinite scroll |
| Call details view | ✅ | Modal or screen |
| Filter by status | ⚠️ | UI exists, limited filters |
| Search calls | ⚠️ | Basic implementation |
| Pagination | ✅ | 20 items per page |

**Implementation Files:**
- `app/(tabs)/calls.tsx`
- `src/hooks/useCalls.ts`
- `src/services/calls.service.ts`

---

### Contacts Management

**Status: ✅ Implemented**

| Sub-feature | Status | Notes |
|-------------|--------|-------|
| List contacts | ✅ | Grouped by type |
| Create contact | ✅ | Modal form |
| Edit contact | ✅ | Inline editing |
| Delete contact | ✅ | With confirmation |
| Contact types | ✅ | allowed/blocked/general |
| Contact language | ✅ | Default language |

**Implementation Files:**
- `app/(tabs)/contacts.tsx`
- `src/services/contacts.service.ts`

---

### Dashboard

**Status: ✅ Implemented**

| Sub-feature | Status | Notes |
|-------------|--------|-------|
| Usage statistics | ✅ | Minutes used |
| Balance display | ✅ | Minutes remaining |
| Recent calls | ✅ | Last 5 calls |
| Quick actions | ✅ | New call button |
| Account status | ✅ | Plan info |

**Implementation Files:**
- `app/(tabs)/index.tsx`
- `src/services/user.service.ts`
- `src/hooks/useAuth.ts`

---

### Settings

**Status: ✅ Implemented**

| Sub-feature | Status | Notes |
|-------------|--------|-------|
| Default language | ✅ | Persisted |
| Speaker mode default | ✅ | Persisted |
| Haptic feedback toggle | ✅ | Persisted |
| Theme selection | ✅ | light/dark/system |
| Sign out | ✅ | Clears all data |

**Implementation Files:**
- `app/(tabs)/settings.tsx`
- `src/store/settingsStore.ts`

---

## Missing Features (To Implement)

### Voicemail Handling

**Status: ❌ Not Implemented**

**Web App Behavior:**
- Receive voicemails when unavailable
- Automatic transcription of voicemails
- Translation to user's language
- TTS playback of translated voicemail
- Mark as read/unread
- Delete voicemails

**Required Implementation:**

| Component | Description |
|-----------|-------------|
| `app/(tabs)/voicemail.tsx` | Voicemail inbox screen |
| `src/components/voicemail/VoicemailList.tsx` | List of voicemails |
| `src/components/voicemail/VoicemailPlayer.tsx` | Audio playback |
| `src/services/voicemail.service.ts` | API integration |
| `src/hooks/useVoicemails.ts` | React Query hook |

**API Endpoints Needed:**
- `GET /api/voicemails` - List voicemails
- `GET /api/voicemails/:id` - Get voicemail details
- `PATCH /api/voicemails/:id` - Update (mark read)
- `DELETE /api/voicemails/:id` - Delete voicemail
- `GET /api/voicemails/:id/audio` - Get audio URL

**Data Model:**
```typescript
interface Voicemail {
  id: string;
  callSid: string;
  from: string;
  to: string;
  duration: number;
  recordingUrl: string;
  transcription: string;
  translatedText: string;
  language: string;
  isRead: boolean;
  createdAt: string;
}
```

---

### Organization/Team Support

**Status: ❌ Not Implemented**

**Web App Behavior:**
- Create/join organizations
- Share phone numbers across team
- Organization-level balance
- Team member management
- Role-based permissions (admin, member)
- Org-scoped contacts

**Required Implementation:**

| Component | Description |
|-----------|-------------|
| `app/organization/index.tsx` | Org dashboard |
| `app/organization/members.tsx` | Team members |
| `app/organization/settings.tsx` | Org settings |
| `src/store/orgStore.ts` | Organization state |
| `src/services/org.service.ts` | API integration |

**API Endpoints Needed:**
- `GET /api/organizations` - List user's orgs
- `GET /api/organizations/:id` - Get org details
- `POST /api/organizations` - Create org
- `GET /api/organizations/:id/members` - List members
- `POST /api/organizations/:id/invite` - Invite member
- `DELETE /api/organizations/:id/members/:userId` - Remove member

**Data Model:**
```typescript
interface Organization {
  id: string;
  name: string;
  ownerId: string;
  members: OrgMember[];
  balance: Balance;
  sharedNumbers: string[];
  createdAt: string;
}

interface OrgMember {
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}
```

---

### Billing/Payments (Stripe)

**Status: ❌ Not Implemented**

**Web App Behavior:**
- View current plan and balance
- Purchase minutes packages
- Stripe checkout integration
- Payment history
- Auto-reload settings
- Invoice downloads

**Required Implementation:**

| Component | Description |
|-----------|-------------|
| `app/(tabs)/plans.tsx` | Plans and billing screen |
| `src/components/billing/PlanCard.tsx` | Plan display |
| `src/components/billing/CheckoutButton.tsx` | Stripe checkout |
| `src/services/billing.service.ts` | API integration |

**API Endpoints Needed:**
- `GET /api/plans` - Available plans
- `GET /api/payments/history` - Payment history
- `POST /api/payments/checkout` - Create checkout session
- `GET /api/balance` - Current balance
- `POST /api/payments/auto-reload` - Configure auto-reload

**Integration:**
- Use `@stripe/stripe-react-native` for native checkout
- Handle deep link callbacks for payment completion
- Show success/failure states

---

### Phone Number Management

**Status: ⚠️ Partially Implemented**

**Current State:**
- Numbers listed in caller ID picker
- Basic number config fetch

**Missing Features:**
- Dedicated numbers screen
- Configure incoming call behavior
- Set incoming language plan
- Shared number management
- Purchase new numbers

**Required Implementation:**

| Component | Description |
|-----------|-------------|
| `app/(tabs)/numbers.tsx` | Phone numbers screen |
| `src/components/numbers/NumberCard.tsx` | Number display |
| `src/components/numbers/NumberConfig.tsx` | Config modal |
| `src/services/numbers.service.ts` | API integration |

**API Endpoints Needed:**
- `GET /api/numberConfig/list` - List numbers (exists)
- `GET /api/numberConfig/:id` - Get config (exists)
- `PATCH /api/numberConfig/:id` - Update config
- `GET /api/numbers/available` - Available to purchase
- `POST /api/numbers/purchase` - Purchase number

---

### Recording Playback

**Status: ❌ Not Implemented**

**Web App Behavior:**
- Play call recordings in call detail view
- Download recording option
- Playback controls (play/pause, seek)
- Recording indicator during calls

**Required Implementation:**

| Component | Description |
|-----------|-------------|
| `src/components/call/RecordingPlayer.tsx` | Audio player |
| Update `app/(tabs)/calls.tsx` | Add player to detail view |

**API Endpoints Needed:**
- `GET /api/recordings/:callSid` - Get recording URL

**Implementation Notes:**
- Use `expo-av` for audio playback
- Handle streaming audio URLs
- Show loading state while buffering
- Support background audio

---

### Call Summaries (AI)

**Status: ❌ Not Implemented**

**Web App Behavior:**
- AI-generated summary after call ends
- Displayed in call detail view
- Key points extraction
- Action items identified

**Required Implementation:**

| Component | Description |
|-----------|-------------|
| `src/components/call/CallSummary.tsx` | Summary display |
| Update call detail view | Add summary section |

**Data Model Update:**
```typescript
interface CallHistoryItem {
  // ... existing fields
  summary?: {
    text: string;
    keyPoints: string[];
    actionItems: string[];
    generatedAt: string;
  };
}
```

---

### DTMF Keypad

**Status: ❌ Not Implemented**

**Web App Behavior:**
- Show keypad during active call
- Send DTMF tones for IVR navigation
- Visual keypad with 0-9, *, #
- Audio feedback on press

**Required Implementation:**

| Component | Description |
|-----------|-------------|
| `src/components/call/DTMFKeypad.tsx` | Keypad component |
| Update `app/call/[id].tsx` | Add keypad toggle |
| Update `VoiceContext.tsx` | Add sendDigits method |

**Implementation Notes:**
- Twilio SDK supports `call.sendDigits(digits)`
- Add toggle button in call controls
- Slide-up animation for keypad
- Haptic feedback on key press

---

### IVR on Incoming Calls

**Status: ❌ Not Implemented**

**Web App Behavior:**
- Configure IVR menu for incoming calls
- Custom greeting message
- Route based on caller input
- Language detection option

**Required Implementation:**
- Backend configuration (mostly backend work)
- Mobile app displays IVR status in number config

---

### Onboarding Flow

**Status: ❌ Not Implemented**

**Web App Behavior:**
- First-time user setup wizard
- Select default language
- Grant microphone permissions
- Configure notification preferences
- Optional: purchase first number

**Required Implementation:**

| Component | Description |
|-----------|-------------|
| `app/onboarding/index.tsx` | Onboarding entry |
| `app/onboarding/language.tsx` | Language selection |
| `app/onboarding/permissions.tsx` | Permission requests |
| `app/onboarding/complete.tsx` | Completion screen |

**Flow:**
1. Check if user is new (no calls, no numbers)
2. Show language selection
3. Request microphone permission
4. Request notification permission
5. Show quick feature tour
6. Redirect to dashboard

---

### Minutes Purchasing

**Status: ❌ Not Implemented**

**Web App Behavior:**
- Purchase minute packages
- View package options
- Stripe checkout
- Immediate balance update

**Required Implementation:**
- Part of Billing/Payments feature
- Quick-purchase from low balance warning

---

## Feature Specifications

### Language Support

The app supports 48 languages for translation:

| Code | Language | Native Name |
|------|----------|-------------|
| en | English | English |
| es | Spanish | Español |
| zh | Chinese | 中文 |
| hi | Hindi | हिन्दी |
| ar | Arabic | العربية |
| pt | Portuguese | Português |
| fr | French | Français |
| de | German | Deutsch |
| ja | Japanese | 日本語 |
| ko | Korean | 한국어 |
| ... | (38 more) | ... |

Full list in `src/utils/languages.ts`.

---

## Implementation Priority

### Priority 1: Bug Fixes & Stability
- Fix known call flow issues
- Improve error handling
- Fix WebSocket reliability
- Add proper loading states

### Priority 2: Core Missing Features
- DTMF keypad (high user impact)
- Recording playback
- Call summaries display
- Phone number management

### Priority 3: Business Features
- Billing/payments (revenue)
- Minutes purchasing
- Voicemail handling

### Priority 4: Team Features
- Organization support
- Shared numbers
- Team management

### Priority 5: User Experience
- Onboarding flow
- UI/UX alignment with web
- Accessibility improvements
