import { LanguageCode } from '../utils/languages';

export interface CallInitiation {
  fromLanguage: LanguageCode;
  toLanguage: LanguageCode;
  phoneNumber: string;
  enableRecording: boolean;
  speakerMode: boolean;
}

/**
 * Parameters for iOS call via POST /iosCall endpoint
 *
 * Flow:
 * 1. iOS app initiates call via Twilio React Native SDK
 * 2. SDK hits POST /iosCall with parameters
 * 3. Server returns TwiML with Connect.Stream to /call/rep/{CallSid}
 * 4. Server places customer leg via placeSecondLegA()
 * 5. Customer answers, gets connected via /voice/customer → /call/customer/{CallSid}
 * 6. Both streams connected through translation pipeline
 */
export interface IosCallParams {
  /** Twilio call SID - automatically provided by Twilio SDK */
  CallSid?: string;
  /** Customer phone number to call (required) */
  To: string;
  /** Caller ID for outbound call (defaults to TWILIO_NUMBER) */
  callerId?: string;
  /** iOS user's language code e.g. "en-US" (defaults to "en-US") */
  repLang?: string;
  /** Customer's language code e.g. "es-MX" (defaults to "es-MX") */
  customerLang?: string;
  /** Clerk user identifier */
  clerkUserId?: string;
  /** Organization identifier */
  orgId?: string;
  /** Start with translation enabled (defaults to true) */
  translateInitially?: boolean;
  /** Custom greeting message for customer */
  initialMessage?: string;
}

export type CallStatus = 'connecting' | 'ringing' | 'active' | 'reconnecting' | 'ended';

export interface ActiveCall {
  id: string;
  status: CallStatus;
  startTime: Date | null;
  duration: number;
  fromLanguage: LanguageCode;
  toLanguage: LanguageCode;
  transcriptions: Transcription[];
  phoneNumber: string;
  contactName?: string;
}

export interface Transcription {
  id: string;
  timestamp: Date;
  originalText: string;
  translatedText: string;
  speaker: 'user' | 'remote';
  language: LanguageCode;
}

// Call Summary from AI analysis
export interface CallSummary {
  summary?: string;
  participants?: {
    caller_description?: string;
    callee_description?: string;
  };
  key_points?: string[];
  decisions?: string[];
  action_items?: Array<{
    owner: 'user' | 'other';
    task: string;
    due?: string | null;
  }>;
  sentiment?: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  languages_used?: string[];
  generatedAt?: Date;
}

// Transcript message from WebSocket
export interface TranscriptMessage {
  text?: string;
  original?: string;
  translation?: string;
  from?: string;
  to?: string;
  callSid?: string;
  time?: string;
  timeStamp?: number;
}

// Backend Call model - matches MongoDB schema
// Includes both backend property names and UI-friendly aliases
export interface CallHistoryItem {
  // Backend properties
  _id: string;
  callSid: string;
  repLang?: string;
  customerLang?: string;
  from?: string;
  to?: string;
  number?: string;
  thirdParty?: string;
  agentNumber?: string;
  status?: 'initiated' | 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed' | 'no-answer' | 'canceled' | 'missed' | 'voicemail' | 'voicemail-received' | 'voicemail-failed';
  direction?: 'inbound' | 'outbound-api' | 'outbound-dial';
  type?: 'call' | 'voicemail';
  startedAt?: string | Date;
  endedAt?: string | Date;
  durationSeconds?: number;
  transcriptionText?: string;
  recordingUrl?: string;

  // Voicemail processing fields
  voicemailTranscript?: string;
  voicemailTranslation?: string;
  voicemailSummary?: string;
  voicemailTtsUrl?: string;
  voicemailDetectedLang?: string;
  voicemailProcessedAt?: string | Date;

  meta?: Record<string, unknown>;
  clerkUserId?: string;
  organizationId?: string;
  transcriptMessages?: TranscriptMessage[];
  agent?: NumberConfig | string;
  contact?: Contact | string;
  summary?: CallSummary;
  createdAt?: string | Date;
  updatedAt?: string | Date;

  // UI-friendly aliases (computed by the service layer)
  id?: string; // alias for _id
  phoneNumber?: string; // computed from from/to/number
  contactName?: string; // computed from contact.firstName + lastName
  fromLanguage?: string; // alias for repLang
  toLanguage?: string; // alias for customerLang
  startTime?: Date; // alias for startedAt
  duration?: number; // alias for durationSeconds
  hasTranscript?: boolean; // computed from transcriptMessages
  hasRecording?: boolean; // computed from recordingUrl
}

export interface CallTranscript {
  callId: string;
  transcriptions: Transcription[];
  transcriptMessages?: TranscriptMessage[];
  summary?: CallSummary;
}

// NumberConfig model - matches MongoDB schema
export interface NumberConfig {
  _id: string;
  name: string;
  number: string;
  organizationId?: string;
  incomingPlan?: Record<string, unknown>;
  mainPhone?: string;
  status: 'active' | 'inactive';
  twilioNumberId: string;
  removed?: boolean;
  clerkUserId?: string;
  assignedUsers?: string[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// Contact model - matches MongoDB schema
// Includes both backend property names and UI-friendly aliases
export interface Contact {
  // Backend properties
  _id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phoneNumber: string;
  language?: string;
  clerkUserId?: string;
  organizationId?: string;
  numberConfig?: string;
  contactType?: 'allowed' | 'blocked' | 'general';
  notes?: string;
  deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;

  // UI-friendly aliases (computed by the service layer)
  id?: string; // alias for _id
  name?: string; // computed from firstName + lastName
  preferredLanguage?: string; // alias for language
  lastCalled?: Date | null; // computed from calls history
  totalCalls?: number; // computed from calls history
}

// Calls list API response
export interface CallsListResponse {
  calls: CallHistoryItem[];
  meta: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Contacts list API response
export interface ContactsListResponse {
  contacts: Contact[];
  meta: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    scope: string;
    userId: string;
    orgId: string | null;
  };
}

// Number configs list API response
export interface NumberConfigsListResponse {
  numbers: NumberConfig[];
}
