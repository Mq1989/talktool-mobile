# TalkTool Data Models

## Overview

This document defines all TypeScript types and interfaces used in the TalkTool mobile app. These models align with the backend MongoDB schemas and Next.js web app types.

---

## User Types

### User

```typescript
/**
 * Basic user information from Clerk
 */
interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  createdAt: Date;
}
```

### UserProfile

```typescript
/**
 * Extended user profile from backend
 */
interface UserProfile {
  id: string;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  defaultLanguage: LanguageCode;
  phoneNumber?: string;
  timezone: string;

  // Balance information
  balance: Balance;

  // Subscription info
  plan: SubscriptionPlan | null;

  // Phone numbers assigned to user
  phoneNumbers: string[];

  // Organization memberships
  organizations: OrganizationMembership[];

  // Settings
  settings: UserSettings;

  createdAt: string;
  updatedAt: string;
}
```

### Balance

```typescript
/**
 * User or organization balance
 */
interface Balance {
  minutes: number;        // Total minutes available
  seconds: number;        // Balance in seconds (minutes * 60)
  orgId?: string;         // If org balance, the org ID
  lastUpdated: string;
}
```

### SubscriptionPlan

```typescript
/**
 * User's current subscription
 */
interface SubscriptionPlan {
  id: string;
  name: string;           // "Starter", "Pro", "Enterprise"
  price: number;
  currency: string;
  minutesIncluded: number;
  features: string[];
  status: 'active' | 'canceled' | 'past_due';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  renewsAt: string | null;
  canceledAt: string | null;
}
```

### UserSettings

```typescript
/**
 * User preferences stored on backend
 */
interface UserSettings {
  defaultLanguage: LanguageCode;
  defaultSpeakerMode: boolean;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  autoReloadEnabled: boolean;
  autoReloadThreshold: number;  // Minutes
  autoReloadAmount: number;     // Package ID
}
```

### LocalUserData

```typescript
/**
 * Supplemental user data stored locally (Zustand)
 */
interface LocalUserData {
  defaultLanguage: LanguageCode;
  companyName: string;
  phoneNumbers: string[];
  minutesBalance: number;
  plan: string | null;
}
```

---

## Call Types

### CallHistoryItem

```typescript
/**
 * Call record from history
 */
interface CallHistoryItem {
  // Identifiers
  id: string;             // Alias for _id
  _id: string;
  callSid: string;        // Twilio call SID

  // Parties
  from: string;           // Caller number
  to: string;             // Called number
  contact?: ContactSummary;

  // Languages
  fromLanguage: LanguageCode;   // repLang
  toLanguage: LanguageCode;     // customerLang

  // Status
  status: CallStatus;
  direction: 'inbound' | 'outbound';

  // Timing
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;

  // Computed UI properties
  phoneNumber: string;    // Computed: other party's number
  contactName: string;    // Computed: contact name or "Unknown"
  startTime: string;      // Alias for startedAt
  duration: number;       // Alias for durationSeconds

  // Content flags
  hasTranscript: boolean;
  hasRecording: boolean;
  hasSummary: boolean;
  isVoicemail: boolean;

  // Optional detailed content
  transcriptMessages?: TranscriptMessage[];
  summary?: CallSummary;
  recordingUrl?: string;
  recordingDuration?: number;

  // Voicemail-specific
  voicemailTranscription?: string;
  voicemailTranslation?: string;

  createdAt: string;
  updatedAt: string;
}
```

### CallStatus

```typescript
type CallStatus =
  | 'connecting'
  | 'ringing'
  | 'in-progress'
  | 'completed'
  | 'busy'
  | 'no-answer'
  | 'failed'
  | 'canceled'
  | 'voicemail';
```

### ActiveCall

```typescript
/**
 * Currently active call (in VoiceContext/callStore)
 */
interface ActiveCall {
  id: string;
  callSid: string;
  status: ActiveCallStatus;

  // Parties
  from: string;
  to: string;
  direction: 'inbound' | 'outbound';

  // Languages
  fromLanguage: LanguageCode;
  toLanguage: LanguageCode;

  // State
  duration: number;
  isMuted: boolean;
  isSpeakerOn: boolean;

  // Real-time transcriptions
  transcriptions: Transcription[];

  // Timestamps
  startedAt: string;
  connectedAt: string | null;
}
```

### ActiveCallStatus

```typescript
type ActiveCallStatus =
  | 'idle'
  | 'connecting'
  | 'ringing'
  | 'active'
  | 'reconnecting'
  | 'ended';
```

### TranscriptMessage

```typescript
/**
 * Single transcript entry (from WebSocket or API)
 */
interface TranscriptMessage {
  id: string;
  callSid: string;
  speaker: 'rep' | 'customer';
  originalText: string;
  translatedText: string;
  timestamp: string;
  isFinal: boolean;
}
```

### Transcription

```typescript
/**
 * Transcription for display in UI (simplified)
 */
interface Transcription {
  id: string;
  speaker: 'rep' | 'customer';
  originalText: string;
  translatedText: string;
  timestamp: string;
}
```

### CallSummary

```typescript
/**
 * AI-generated call summary
 */
interface CallSummary {
  text: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  generatedAt: string;
}
```

---

## Contact Types

### Contact

```typescript
/**
 * Contact record
 */
interface Contact {
  id: string;             // Alias for _id
  _id: string;

  // Name
  firstName: string;
  lastName: string;
  fullName: string;       // Computed: firstName + lastName

  // Phone
  phoneNumber: string;
  formattedPhone: string; // Computed: formatted for display

  // Language preference
  language: LanguageCode;

  // Classification
  contactType: ContactType;

  // Ownership
  userId: string;
  orgId?: string;         // If org-scoped contact
  scope: 'user' | 'org';

  // Additional
  notes?: string;
  tags?: string[];

  createdAt: string;
  updatedAt: string;
}
```

### ContactType

```typescript
type ContactType = 'allowed' | 'blocked' | 'general';
```

### ContactSummary

```typescript
/**
 * Minimal contact info embedded in calls
 */
interface ContactSummary {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}
```

### CreateContactInput

```typescript
interface CreateContactInput {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  language: LanguageCode;
  contactType: ContactType;
  notes?: string;
}
```

### UpdateContactInput

```typescript
interface UpdateContactInput {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  language?: LanguageCode;
  contactType?: ContactType;
  notes?: string;
}
```

---

## Phone Number Types

### NumberConfig

```typescript
/**
 * Phone number configuration
 */
interface NumberConfig {
  id: string;
  _id: string;

  // Number details
  number: string;         // E.164 format: +15551234567
  name: string;           // Friendly name: "Main Line"

  // Status
  status: 'active' | 'inactive' | 'pending';

  // Incoming call configuration
  incomingPlan: IncomingPlan;

  // Sharing
  isShared: boolean;
  orgId?: string;
  assignedTo: string;     // User ID

  // Capabilities
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };

  createdAt: string;
  updatedAt: string;
}
```

### IncomingPlan

```typescript
/**
 * Configuration for incoming calls to a number
 */
interface IncomingPlan {
  language: LanguageCode;         // Default language for callers
  greeting?: string;              // Custom greeting
  ivrEnabled: boolean;            // IVR menu enabled
  ivrConfig?: IVRConfig;
  voicemailEnabled: boolean;
  voicemailGreeting?: string;
  forwardingEnabled: boolean;
  forwardingNumber?: string;
}
```

### IVRConfig

```typescript
/**
 * IVR menu configuration
 */
interface IVRConfig {
  prompt: string;
  options: IVROption[];
  timeout: number;        // Seconds
  maxRetries: number;
}

interface IVROption {
  digit: string;          // '1', '2', ..., '9', '0', '*', '#'
  action: 'transfer' | 'voicemail' | 'repeat' | 'language';
  value?: string;         // Transfer number or language code
  label: string;          // "Press 1 for sales"
}
```

---

## Voicemail Types

### Voicemail

```typescript
/**
 * Voicemail record
 */
interface Voicemail {
  id: string;
  _id: string;

  // Associated call
  callSid: string;

  // Parties
  from: string;
  to: string;
  contact?: ContactSummary;

  // Recording
  recordingUrl: string;
  duration: number;       // Seconds

  // Transcription
  transcription: string;          // Original language
  translatedText: string;         // User's language
  originalLanguage: LanguageCode;
  translatedLanguage: LanguageCode;

  // Status
  isRead: boolean;
  isDeleted: boolean;

  createdAt: string;
  updatedAt: string;
}
```

---

## Organization Types

### Organization

```typescript
/**
 * Organization/team record
 */
interface Organization {
  id: string;
  _id: string;

  name: string;
  ownerId: string;

  // Members
  members: OrganizationMember[];
  memberCount: number;

  // Balance
  balance: Balance;

  // Shared resources
  sharedNumbers: string[];  // Number IDs
  sharedContacts: boolean;

  // Settings
  settings: OrganizationSettings;

  createdAt: string;
  updatedAt: string;
}
```

### OrganizationMember

```typescript
interface OrganizationMember {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: OrganizationRole;
  status: 'active' | 'invited' | 'removed';
  joinedAt: string;
  invitedAt: string;
  invitedBy: string;
}
```

### OrganizationRole

```typescript
type OrganizationRole = 'owner' | 'admin' | 'member';
```

### OrganizationMembership

```typescript
/**
 * User's membership in an organization (embedded in UserProfile)
 */
interface OrganizationMembership {
  orgId: string;
  orgName: string;
  role: OrganizationRole;
  isDefault: boolean;
}
```

### OrganizationSettings

```typescript
interface OrganizationSettings {
  allowMemberPurchases: boolean;
  shareBalanceWithMembers: boolean;
  defaultLanguage: LanguageCode;
}
```

---

## Billing Types

### Plan

```typescript
/**
 * Available subscription plan
 */
interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  minutes: number;
  features: string[];
  isPopular: boolean;
  stripePriceId: string;
}
```

### MinutesPackage

```typescript
/**
 * One-time minutes purchase package
 */
interface MinutesPackage {
  id: string;
  name: string;
  minutes: number;
  price: number;
  currency: string;
  pricePerMinute: number;   // Computed
  stripePriceId: string;
}
```

### Payment

```typescript
/**
 * Payment history record
 */
interface Payment {
  id: string;
  stripePaymentId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  description: string;
  type: 'subscription' | 'minutes' | 'refund';
  invoiceUrl?: string;
  receiptUrl?: string;
  createdAt: string;
}
```

### CheckoutSession

```typescript
interface CheckoutSession {
  sessionId: string;
  url: string;
  expiresAt: string;
}
```

---

## Language Types

### LanguageCode

```typescript
type LanguageCode =
  | 'en' | 'es' | 'zh' | 'hi' | 'ar' | 'pt' | 'bn' | 'ru'
  | 'ja' | 'pa' | 'de' | 'jv' | 'ko' | 'fr' | 'te' | 'vi'
  | 'mr' | 'it' | 'ta' | 'tr' | 'ur' | 'gu' | 'pl' | 'uk'
  | 'ml' | 'kn' | 'or' | 'my' | 'th' | 'nl' | 'ro' | 'el'
  | 'cs' | 'hu' | 'sv' | 'he' | 'da' | 'fi' | 'no' | 'sk'
  | 'ca' | 'hr' | 'id' | 'ms' | 'fil' | 'bg' | 'sr' | 'sl';
```

### Language

```typescript
interface Language {
  code: LanguageCode;
  name: string;           // English name
  nativeName: string;     // Native script name
  flag: string;           // Emoji flag
}
```

---

## API Response Types

### ApiResponse

```typescript
/**
 * Standard API response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
```

### ApiError

```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}
```

### PaginatedResponse

```typescript
interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}
```

### Pagination

```typescript
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
```

---

## Store Types

### AuthStore

```typescript
interface AuthStore {
  localUserData: LocalUserData | null;
  isLoading: boolean;

  setLocalUserData: (data: LocalUserData) => void;
  updateLocalUserData: (data: Partial<LocalUserData>) => void;
  clearLocalData: () => void;
}
```

### CallStore

```typescript
interface CallStore {
  activeCall: ActiveCall | null;
  transcriptions: Transcription[];
  isMuted: boolean;
  isSpeakerOn: boolean;
  isSocketConnected: boolean;
  socketError: string | null;

  setActiveCall: (call: ActiveCall | null) => void;
  updateCallStatus: (status: ActiveCallStatus) => void;
  addTranscription: (transcription: Transcription) => void;
  clearTranscriptions: () => void;
  setMuted: (muted: boolean) => void;
  setSpeakerOn: (speakerOn: boolean) => void;
  setSocketConnected: (connected: boolean) => void;
  setSocketError: (error: string | null) => void;
  resetCallState: () => void;
}
```

### SettingsStore

```typescript
interface SettingsStore {
  defaultLanguage: LanguageCode;
  defaultSpeakerMode: boolean;
  enableHaptics: boolean;
  theme: 'light' | 'dark' | 'system';

  setDefaultLanguage: (language: LanguageCode) => void;
  setDefaultSpeakerMode: (enabled: boolean) => void;
  setEnableHaptics: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}
```

---

## WebSocket Message Types

### WebSocketMessage

```typescript
type WebSocketMessage =
  | TranscriptWebSocketMessage
  | CallEndWebSocketMessage
  | PingWebSocketMessage
  | PongWebSocketMessage;
```

### TranscriptWebSocketMessage

```typescript
interface TranscriptWebSocketMessage {
  type: 'transcript';
  data: TranscriptMessage;
}
```

### CallEndWebSocketMessage

```typescript
interface CallEndWebSocketMessage {
  type: 'call_end';
  data: {
    callSid: string;
    reason: 'completed' | 'failed' | 'busy' | 'no-answer';
  };
}
```

### PingWebSocketMessage

```typescript
interface PingWebSocketMessage {
  type: 'ping';
}
```

### PongWebSocketMessage

```typescript
interface PongWebSocketMessage {
  type: 'pong';
}
```
