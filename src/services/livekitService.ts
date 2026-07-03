import axios from 'axios';
import { TWILIO_SERVER_URL } from '../utils/constants';

// /livekit/place-call and /livekit/token live on the Express LiveKit server
// (TWILIO_SERVER_URL), NOT on the Next.js backend (API_BASE_URL). They do not
// currently require Clerk auth — backend has a TODO to add it.
const lkApi = axios.create({
  baseURL: TWILIO_SERVER_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export interface PlaceCallBody {
  to: string;
  callerId: string;
  repLang: string;
  customerLang: string;
  clerkUserId: string;
  orgId?: string;
  translateInitially?: boolean;
  ttsOnly?: boolean;
  mode?: 'translator' | 'interpreter';
  cleanup?: boolean;
  shouldRecord?: boolean;
  initialMessage?: string | null;
  callContext?: string;
}

export interface PlaceCallResponse {
  roomName: string;
  token: string;
  livekitUrl: string;
  callSid: string;
  repIdentity: string;
  // Call-bound token authorizing the /call/display transcript subscription.
  // Passed to the display socket as `?auth=`. Server returns null when it has
  // no DISPLAY_TOKEN_SECRET configured (dev with enforcement off).
  displayToken: string | null;
}

export interface RefreshTokenResponse {
  token: string;
  livekitUrl: string;
  roomName: string;
  identity: string;
}

export const livekitService = {
  placeCall: async (body: PlaceCallBody): Promise<PlaceCallResponse> => {
    const response = await lkApi.post<PlaceCallResponse>('/livekit/place-call', {
      translateInitially: true,
      ttsOnly: true,
      mode: 'translator',
      cleanup: false,
      initialMessage: null,
      callContext: '',
      ...body,
    });
    return response.data;
  },

  refreshToken: async (roomName: string, identity: string): Promise<RefreshTokenResponse> => {
    const response = await lkApi.post<RefreshTokenResponse>('/livekit/token', {
      roomName,
      identity,
    });
    return response.data;
  },
};
