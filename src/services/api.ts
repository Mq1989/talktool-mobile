import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, TWILIO_SERVER_URL } from '../utils/constants';

// Token getter function - will be set by the auth hook
let getAuthToken: (() => Promise<string | null>) | null = null;

export const setAuthTokenGetter = (getter: () => Promise<string | null>) => {
  console.log('[API] Auth token getter set');
  getAuthToken = getter;
};

console.log('[API] Initializing with baseURL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token (using Clerk)
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      if (getAuthToken) {
        const token = await getAuthToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('[API] Request to:', config.url, 'with auth token');
        } else {
          console.warn('[API] No auth token available for:', config.url);
        }
      } else {
        console.warn('[API] Auth token getter not set for:', config.url);
      }
    } catch (error) {
      console.error('[API] Error retrieving auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('[API] Response from:', response.config.url, 'status:', response.status);
    return response;
  },
  async (error: AxiosError) => {
    console.error('[API] Error from:', error.config?.url, 'status:', error.response?.status, 'message:', error.message);

    // Clerk handles token refresh automatically
    // We just need to handle other errors here
    if (error.response?.status === 401) {
      // Token might be expired - Clerk should handle refresh
      // If we still get 401, the session might be invalid
      console.warn('[API] Unauthorized request - session may be invalid');
    }

    return Promise.reject(error);
  }
);

// Contact data types for the API
export interface ContactData {
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  email?: string;
  language?: string;
  contactType?: 'allowed' | 'blocked' | 'general';
  notes?: string;
  shareWithOrg?: boolean;
}

// API endpoints - Next.js Backend (all data operations including Twilio tokens)
export const apiEndpoints = {
  // Balance
  getBalance: () => api.get('/payments/balance'),

  // Calls history - uses page/limit pagination
  getCalls: (params?: { page?: number; limit?: number }) => api.get('/calls', { params }),
  getCallsForNumber: (number: string, params?: { page?: number; limit?: number }) =>
    api.get(`/calls/${encodeURIComponent(number)}`, { params }),
  getCallDetail: (callId: string) => api.get(`/calls/detail/${callId}`),
  getCallsCount: () => api.get('/calls/count'),

  // Contacts - matches Next.js backend structure
  getContacts: (params?: {
    type?: 'allowed' | 'blocked' | 'general' | 'all';
    scope?: 'all' | 'user' | 'org';
    search?: string;
    page?: number;
    limit?: number;
  }) => api.get('/contacts', { params }),
  getContact: (id: string) => api.get(`/contacts/${id}`),
  createContact: (data: ContactData) => api.post('/contacts', data),
  updateContact: (id: string, updates: Partial<ContactData>) =>
    api.patch(`/contacts/${id}`, updates),
  deleteContact: (id: string) => api.delete(`/contacts/${id}`),
  getContactCalls: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/contacts/${id}/calls`, { params }),

  // Number config
  getNumberConfigs: () => api.get('/numberConfig/list'),
  getNumberConfig: (id: string) => api.get(`/numberConfig/${id}`),
  updateNumberConfig: (id: string, data: Record<string, unknown>) =>
    api.patch(`/numberConfig/${id}`, data),
  setIncomingPlan: (id: string, data: Record<string, unknown>) =>
    api.post(`/numberConfig/${id}/incomingPlan`, data),

  // Twilio access token (on Next.js backend)
  getAccessToken: (identity?: string) => api.post('/accessToken', { identity }),

  // End call (on Next.js backend)
  endCall: (callSid: string) => api.post('/end-call', { callSid }),
  sendToVoicemail: (parentCallSid: string, browserCallSid: string) =>
    api.post('/calls/send-to-voicemail', { parentCallSid, browserCallSid }),

  // Payments
  createCreditsCheckout: (quantity: number) =>
    api.post('/payments/credits', { quantity }),
  confirmCreditsCheckout: (sessionId: string) =>
    api.post('/payments/credits/confirm', { sessionId }),
  getBalanceTransferStatus: () => api.get('/payments/balance/transfer'),
  transferBalance: (confirm: boolean) =>
    api.post('/payments/balance/transfer', { confirm }),

  // Apple IAP: verify a StoreKit 2 signed transaction (JWS) and credit minutes.
  // Idempotent server-side (keyed on the Apple transactionId).
  iapVerifyApple: (body: { jwsRepresentation: string; productId: string }) =>
    api.post('/payments/iap/apple/verify', body),

  // Transcripts & Recordings
  getTranscripts: (callSid: string) => api.get('/transcripts', { params: { callSid } }),
  getRecording: (callSid: string) => api.get(`/recordings/${callSid}`),

  // Mobile call config
  getMobileCallConfigs: (limit?: number) =>
    api.get('/mobile-call-config', { params: { limit } }),
  saveMobileCallConfig: (data: Record<string, unknown>) =>
    api.post('/mobile-call-config', data),
  getActiveMobileCallConfig: (callerIdNumber?: string) =>
    api.get('/mobile-call-config/active', { params: { callerIdNumber } }),
  clearActiveMobileCallConfig: (callerIdNumber: string) =>
    api.delete('/mobile-call-config/active', { params: { callerIdNumber } }),

  // Availability
  getAvailabilityStatus: (phoneNumber: string, userId?: string) =>
    api.get('/availability/status', { params: { phoneNumber, userId } }),
  setAvailable: (userId: string, orgId: string | null | undefined, phoneNumber: string) =>
    api.post('/availability/set-available', { userId, orgId, phoneNumber }),
  setAvailableMulti: (userId: string, orgId: string | null | undefined, phoneNumbers: string[]) =>
    api.post('/availability/set-available-multi', { userId, orgId, phoneNumbers }),
  setUnavailable: (userId: string, orgId: string | null | undefined, phoneNumber: string) =>
    api.post('/availability/set-unavailable', { userId, orgId, phoneNumber }),
  setUnavailableAll: (userId: string, orgId: string | null | undefined) =>
    api.post('/availability/set-unavailable-all', { userId, orgId }),
  setBusy: (userId: string, orgId: string | null | undefined, phoneNumber: string) =>
    api.post('/availability/set-busy', { userId, orgId, phoneNumber }),
  setRinging: (userId: string, orgId: string | null | undefined, phoneNumber: string) =>
    api.post('/availability/set-ringing', { userId, orgId, phoneNumber }),
  sendHeartbeat: (userId: string, orgId: string | null | undefined, phoneNumber: string, deviceId: string, status: string) =>
    api.post('/availability/heartbeat', { userId, orgId, phoneNumber, deviceId, status }),
  sendHeartbeatMulti: (userId: string, orgId: string | null | undefined, phoneNumbers: string[], deviceId: string, status: string) =>
    api.post('/availability/heartbeat-multi', { userId, orgId, phoneNumbers, deviceId, status }),
  getAvailabilityPreferences: () => api.get('/availability/preferences'),
  updateAvailabilityPreferences: (data: { preferredNumbers?: string[]; autoRestoreEnabled?: boolean }) =>
    api.put('/availability/preferences', data),
  restoreAvailability: () => api.post('/availability/restore'),

  // Plans & Addons
  getPlans: (organizationId?: string) =>
    api.get('/plans', { params: { organizationId } }),
  subscribeToPlan: (data: { planTier: string; organizationId?: string; successUrl?: string; cancelUrl?: string }) =>
    api.post('/plans', data),
  cancelPlan: (organizationId?: string) =>
    api.delete('/plans', { params: { organizationId } }),
  getAddons: (organizationId?: string) =>
    api.get('/addons', { params: { organizationId } }),
  subscribeToAddon: (data: { addonType: string; quantity?: number; organizationId?: string; successUrl?: string; cancelUrl?: string }) =>
    api.post('/addons', data),
  cancelAddon: (id: string, organizationId?: string) =>
    api.delete('/addons', { params: { id, organizationId } }),

  // Introductions (Translations)
  translateIntroduction: (data: { message: string; lang: string; sourceLang?: string; save?: boolean }) =>
    api.post('/introduction', data),
  getIntroductions: (params?: { limit?: number; targetLang?: string }) =>
    api.get('/introduction', { params }),

  // Organization
  getOrgMembers: () => api.get('/org/members'),
  inviteOrgMember: (data: { emailAddress: string; role: string; assignedNumberId?: string }) =>
    api.post('/org/invite', data),

  // IVR & Voice
  generateIvrAudio: (data: { ivrLanguages: string[]; numberId: string; voice?: string }) =>
    api.post('/ivr/generate-audio', data),
  getVoiceSample: (voiceId: string, text?: string) =>
    api.get('/voice/test', { params: { voiceId, text } }),
  getGoogleVoiceSample: (voiceId: string, text?: string) =>
    api.get('/voice/test/google', { params: { voiceId, text } }),

  // Phone numbers
  searchPhoneNumbers: (params: { areaCode?: string; countryCode?: string; prefix?: string; contains?: string }) =>
    api.get('/phoneNumbers/new', { params }),
  purchasePhoneNumber: (data: { phoneNumber: string; name?: string }) =>
    api.post('/phoneNumbers/new', data),
};

// Twilio Server endpoints (WebSocket only - no REST API on this server)
// The Twilio server handles WebSocket connections for real-time transcripts
// at: wss://{TWILIO_SERVER_URL}/call/display/{callSid}
export const twilioEndpoints = {
  // Note: Access token and end-call are now on the Next.js backend (apiEndpoints)
  // These methods are kept for backwards compatibility but redirect to apiEndpoints
  getAccessToken: (identity?: string) => apiEndpoints.getAccessToken(identity),
  endCall: (callSid: string) => apiEndpoints.endCall(callSid),
};

export default api;
