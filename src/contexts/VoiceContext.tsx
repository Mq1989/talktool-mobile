import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Room, RoomEvent, Track, RemoteTrack, RemoteTrackPublication, RemoteParticipant } from 'livekit-client';
import { API_BASE_URL } from '../utils/constants';
import { getLocaleForLanguage } from '../utils/languages';
import { livekitService } from '../services/livekitService';

// Twilio Voice SDK is being phased out in favor of a LiveKit-based incoming
// flow (plan Phase 2). The native iOS bridge tries to register for PushKit at
// `new Voice()` time, which fails until APNs is reconfigured for the new
// com.talktool.app bundle ID at Twilio. Until Phase 2 lands, we keep the
// require() (so the bundle still resolves) but never instantiate Voice — that
// silences the "Failed to register for incoming calls" and PushKit errors.
const INCOMING_VIA_TWILIO = false;

let Voice: any = null;
let Call: any = null;

if (INCOMING_VIA_TWILIO) {
  try {
    const TwilioVoice = require('@twilio/voice-react-native-sdk');
    Voice = TwilioVoice.Voice;
    Call = TwilioVoice.Call;
  } catch (e) {
    console.warn('Twilio Voice SDK not available - running in Expo Go?');
  }
}

export type CallState = 'idle' | 'incoming' | 'connecting' | 'dialing' | 'ringing' | 'call-ringing' | 'active' | 'reconnecting' | 'ended';

export interface TranscriptMessage {
  id: string;
  callSid: string;
  speaker: 'user' | 'remote';
  originalText: string;
  translatedText: string;
  originalLanguage: string;
  targetLanguage: string;
  timestamp: Date;
}

export interface CallInfo {
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  callSid: string | null;
}

export interface CallLanguages {
  srcLang: string;
  dstLang: string;
}

interface OutboundCallParams {
  toNumber: string;
  fromNumber: string;
  fromLanguage: string;
  toLanguage: string;
  initialMessage?: string;
  initialMessageOriginal?: string;
  translateInitially?: boolean;
  orgId?: string;
  mode?: 'translator' | 'interpreter';
  cleanup?: boolean;
  shouldRecord?: boolean;
}

interface VoiceContextType {
  callState: CallState;
  activeCall: any | null;
  incomingCallInvite: any | null;
  isMuted: boolean;
  isSpeakerOn: boolean;
  callSid: string | null;
  callInfo: CallInfo | null;
  callLanguages: CallLanguages | null;
  callStartTime: number | null;
  isTranslating: boolean;
  transcripts: TranscriptMessage[];
  error: string | null;
  isRegistered: boolean;
  isVoiceSupported: boolean;
  room: Room | null;
  mode: 'translator' | 'interpreter';
  cleanup: boolean;

  makeCall: (params: OutboundCallParams) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  rejectIncomingCall: () => Promise<void>;
  sendToVoicemail: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  sendDigits: (digits: string) => void;
  addTranscript: (transcript: TranscriptMessage) => void;
  clearTranscripts: () => void;
  clearError: () => void;
  toggleTranslation: (turnOn: boolean) => void;
  setMode: (value: 'translator' | 'interpreter') => void;
  setCleanup: (value: boolean) => void;
  configureIntroduction: (message: string, customerLang: string, repLang: string) => Promise<{ translatedMessage: string; introductionId: string } | null>;
  testVoiceSetup: () => Promise<{ success: boolean; message: string }>;
  endCallFromServer: () => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn, userId } = useAuth();
  const { user } = useUser();

  const isVoiceSupported = (Voice !== null || true) && Platform.OS !== 'web';

  // LiveKit room (outbound)
  const roomRef = useRef<Room | null>(null);
  const repIdentityRef = useRef<string | null>(null);
  const roomNameRef = useRef<string | null>(null);
  // Audio tracks the rep can hear in interpreter mode but must be silent in
  // translator mode (the customer's raw mic). Also the ducking targets when
  // the agent speaks the rep's translation.
  const duckableTracksRef = useRef<Set<RemoteTrack>>(new Set());
  // modeRef mirrors `mode` for use inside non-reactive event callbacks.
  const modeRef = useRef<'translator' | 'interpreter'>('translator');

  // Twilio SDK (incoming-only, deprecated path pending backend Phase 2)
  const voiceRef = useRef<any | null>(null);
  const parentCallSidRef = useRef<string | null>(null);
  const ringSoundRef = useRef<Audio.Sound | null>(null);
  const isRegisteringRef = useRef(false);

  const [callState, setCallState] = useState<CallState>('idle');
  const [activeCall, setActiveCall] = useState<any | null>(null);
  const [incomingCallInvite, setIncomingCallInvite] = useState<any | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [callLanguages, setCallLanguages] = useState<CallLanguages | null>(null);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [isTranslating, setIsTranslating] = useState(true);
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [mode, setModeState] = useState<'translator' | 'interpreter'>('translator');
  const [cleanup, setCleanupState] = useState<boolean>(false);

  // ---------- Twilio incoming-only init ----------
  useEffect(() => {
    if (!Voice || Platform.OS === 'web') return;

    const initVoice = async () => {
      try {
        const voice = new Voice();
        voiceRef.current = voice;

        voice.on(Voice.Event.CallInvite, handleIncomingCall);
        voice.on(Voice.Event.CancelledCallInvite, handleCancelledInvite);
        voice.on(Voice.Event.Registered, () => setIsRegistered(true));
        voice.on(Voice.Event.Unregistered, () => setIsRegistered(false));
        voice.on(Voice.Event.Error, (err: any) => {
          console.error('Voice SDK error:', err);
        });

        if (isSignedIn) {
          await registerForIncomingCalls();
        }
      } catch (err) {
        console.error('Failed to initialize Voice SDK:', err);
      }
    };

    initVoice();

    return () => {
      if (voiceRef.current) {
        voiceRef.current.removeAllListeners();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && isSignedIn) {
      await registerForIncomingCalls();
    }
  };

  const registerForIncomingCalls = async () => {
    if (!voiceRef.current || !isSignedIn) return;
    if (isRegisteringRef.current) return;
    isRegisteringRef.current = true;

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/accessToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ identity: userId || 'mobile_user', platform: Platform.OS }),
      });

      if (!response.ok) return;
      const data = await response.json();
      const twilioToken = data.token || data.accessToken;
      if (twilioToken) {
        await voiceRef.current.register(twilioToken);
      }
    } catch (err) {
      console.error('Failed to register for incoming calls:', err);
    } finally {
      isRegisteringRef.current = false;
    }
  };

  useEffect(() => {
    if (isSignedIn) registerForIncomingCalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Periodic Twilio re-register (incoming-only path; cheap; safe to leave)
  useEffect(() => {
    if (!isRegistered) return;
    const interval = setInterval(() => { registerForIncomingCalls(); }, 10 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegistered]);

  // ---------- Ring sound for incoming ----------
  const playIncomingRing = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ringtoneAsset = require('../../assets/ringtone.mp3');
      const { sound } = await Audio.Sound.createAsync(ringtoneAsset, { isLooping: true, volume: 1.0 });
      ringSoundRef.current = sound;
      await sound.playAsync();
    } catch (err) {
      console.warn('[VoiceContext] Failed to play ring sound:', err);
    }
  };

  const stopIncomingRing = async () => {
    try {
      if (ringSoundRef.current) {
        await ringSoundRef.current.stopAsync();
        await ringSoundRef.current.unloadAsync();
        ringSoundRef.current = null;
      }
    } catch (err) {
      console.warn('[VoiceContext] Failed to stop ring sound:', err);
    }
  };

  const handleIncomingCall = (callInvite: any) => {
    const customParams = callInvite.getCustomParameters?.() || callInvite.customParameters || {};
    parentCallSidRef.current = customParams.parentCallSid || null;
    setCallLanguages({
      srcLang: customParams.srcLang || 'en-US',
      dstLang: customParams.dstLang || 'en-US',
    });
    setIncomingCallInvite(callInvite);
    setCallState('incoming');
    playIncomingRing();
  };

  const handleCancelledInvite = () => {
    stopIncomingRing();
    setIncomingCallInvite(null);
    setCallState('idle');
  };

  const createCallRecord = async (effectiveCallSid: string, overrides?: {
    from?: string;
    to?: string;
    direction?: 'inbound' | 'outbound';
    repLang?: string;
    customerLang?: string;
  }) => {
    try {
      const authToken = await getToken();
      if (!authToken) return;

      const requestBody = {
        callSid: effectiveCallSid,
        from: overrides?.from ?? callInfo?.from ?? '',
        to: overrides?.to ?? callInfo?.to ?? '',
        direction: overrides?.direction ?? callInfo?.direction ?? 'outbound',
        repLang: overrides?.repLang ?? callLanguages?.srcLang ?? 'en-US',
        customerLang: overrides?.customerLang ?? callLanguages?.dstLang ?? 'en-US',
      };

      const response = await fetch(`${API_BASE_URL}/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[VoiceContext] createCallRecord failed:', response.status, errorData);
      }
    } catch (err) {
      console.error('[VoiceContext] createCallRecord exception:', err);
    }
  };

  // ---------- LiveKit room helpers ----------
  // Unlike the web (where not calling track.attach() = silence), LiveKit RN
  // auto-plays EVERY subscribed audio track. So we must explicitly unsubscribe
  // or zero the volume of tracks the rep should not hear, or the call sounds
  // like interpreter mode (echo of the rep's own translated voice + raw mic).
  const attachRemoteTrack = (track: RemoteTrack, publication: RemoteTrackPublication, _participant: RemoteParticipant) => {
    if (track.kind !== Track.Kind.Audio) return;
    const trackName = publication.trackName || (track as any).name || track.sid || '';

    // tts-for-customer is the rep's own speech translated for the customer —
    // it plays on the PSTN leg. The rep must NEVER hear it (echo). Unsubscribe.
    if (trackName === 'tts-for-customer') {
      console.log('[VoiceContext] Unsubscribing tts-for-customer (prevent echo)');
      try { publication.setSubscribed(false); } catch (e) { console.warn('[VoiceContext] unsub failed:', e); }
      return;
    }

    // tts-for-rep: the translation of the customer's speech. Always audible.
    if (trackName === 'tts-for-rep') {
      try { (track as any).setVolume?.(1); } catch {}
      console.log('[VoiceContext] tts-for-rep attached');
      return;
    }

    // Any other audio (the customer's raw mic). Audible only in interpreter
    // mode; silent in translator mode. Track it so ducking + mode flips can
    // re-apply volume without re-querying the room.
    duckableTracksRef.current.add(track);
    const vol = modeRef.current === 'interpreter' ? 1 : 0;
    try { (track as any).setVolume?.(vol); } catch {}
    console.log('[VoiceContext] raw audio track volume set to', vol, '(mode:', modeRef.current, ')');
  };

  // Apply a volume to every duckable (customer raw mic) track.
  const applyDuckableVolume = (vol: number) => {
    for (const track of duckableTracksRef.current) {
      try { (track as any).setVolume?.(vol); } catch {}
    }
  };

  // Agent → rep ducking. Payload: { type:"tts-state", recipient:"rep", active }
  // Fade the customer's raw mic while the agent speaks the rep's translation.
  const handleDataReceived = (payload: Uint8Array) => {
    if (modeRef.current !== 'interpreter') return;
    let msg: any;
    try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
    if (!msg || msg.type !== 'tts-state' || msg.recipient !== 'rep') return;
    applyDuckableVolume(msg.active ? 0.15 : 1);
  };

  const teardownRoom = () => {
    const r = roomRef.current;
    if (r) {
      try { r.disconnect(); } catch (e) { console.warn('[VoiceContext] room.disconnect failed:', e); }
    }
    duckableTracksRef.current.clear();
    roomRef.current = null;
    repIdentityRef.current = null;
    roomNameRef.current = null;
    setRoom(null);
  };

  const wireRoomEvents = (r: Room) => {
    r.on(RoomEvent.TrackSubscribed, attachRemoteTrack);
    r.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
      duckableTracksRef.current.delete(track);
    });
    r.on(RoomEvent.DataReceived, handleDataReceived);
    r.on(RoomEvent.Disconnected, (reason) => {
      console.log('[VoiceContext] Room disconnected:', reason);
      teardownRoom();
      setActiveCall(null);
      setCallState('ended');
      setCallSid(null);
      setIsMuted(false);
    });
    r.on(RoomEvent.Reconnecting, () => setCallState('reconnecting'));
    r.on(RoomEvent.Reconnected, () => setCallState('active'));
  };

  // ---------- Outbound dial via LiveKit ----------
  const makeCall = useCallback(async (params: OutboundCallParams) => {
    if (Platform.OS === 'web') {
      setError('Calls require a native build.');
      return;
    }

    try {
      setError(null);
      setTranscripts([]);
      setCallStartTime(null);

      const repLang = getLocaleForLanguage(params.fromLanguage);
      const customerLang = getLocaleForLanguage(params.toLanguage);

      setCallLanguages({ srcLang: repLang, dstLang: customerLang });
      setCallInfo({
        direction: 'outbound',
        from: params.fromNumber,
        to: params.toNumber,
        callSid: null,
      });
      setCallState('dialing');

      const placeBody = {
        to: params.toNumber,
        callerId: params.fromNumber,
        repLang,
        customerLang,
        clerkUserId: userId || '',
        orgId: params.orgId,
        translateInitially: params.translateInitially !== false,
        ttsOnly: true,
        mode: params.mode || mode,
        cleanup: params.cleanup ?? cleanup,
        // Recording is a pre-call decision (set on the New Call screen).
        // Backend defaults to true, so send the explicit choice every time.
        shouldRecord: params.shouldRecord === true,
        initialMessage: params.initialMessage || null,
        callContext: '',
      };

      console.log('[VoiceContext] POST /livekit/place-call body:', placeBody);
      const result = await livekitService.placeCall(placeBody);
      console.log('[VoiceContext] /livekit/place-call response:', {
        roomName: result.roomName,
        callSid: result.callSid,
        repIdentity: result.repIdentity,
      });

      repIdentityRef.current = result.repIdentity;
      roomNameRef.current = result.roomName;
      parentCallSidRef.current = result.callSid;

      // Configure iOS audio session for VoIP-style playback + recording.
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const r = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = r;
      wireRoomEvents(r);

      await r.connect(result.livekitUrl, result.token);
      await r.localParticipant.setMicrophoneEnabled(true);

      setRoom(r);
      setCallSid(result.callSid);
      setCallInfo(prev => prev ? { ...prev, callSid: result.callSid } : prev);
      setCallStartTime(Date.now());
      setIsTranslating(params.translateInitially !== false);
      const initialMode = params.mode || mode;
      setModeState(initialMode);
      modeRef.current = initialMode;
      setCleanupState(params.cleanup ?? cleanup);

      // Display socket on the active call screen drives 'call-answered' →
      // callState='active' transition. Until then we sit at 'dialing'.

      // Persist a call record in the user's history.
      createCallRecord(result.callSid, {
        from: params.fromNumber,
        to: params.toNumber,
        direction: 'outbound',
        repLang,
        customerLang,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to place call';
      console.error('[VoiceContext] makeCall failed:', msg, err);
      setError(msg);
      teardownRoom();
      setCallState('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, mode, cleanup]);

  // ---------- Incoming (Twilio path, pending Phase 2) ----------
  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCallInvite) {
      setError('No incoming call to accept');
      return;
    }

    try {
      stopIncomingRing();
      setTranscripts([]);
      setCallStartTime(Date.now());

      const call = await incomingCallInvite.accept();
      setActiveCall(call);
      setCallState('active');

      const customParams = incomingCallInvite.getCustomParameters?.() || incomingCallInvite.customParameters || {};
      const parentCallSid = parentCallSidRef.current || customParams.parentCallSid;
      const effectiveCallSid = parentCallSid || call.getSid();
      const shouldTranslate = customParams.isTranslating === 'true';
      setIsTranslating(shouldTranslate);

      setCallInfo({
        direction: 'inbound',
        from: customParams.incomingNumber || 'Unknown',
        to: '',
        callSid: effectiveCallSid,
      });
      setCallSid(effectiveCallSid);

      if (Call) {
        call.on(Call.Event.Disconnected, () => {
          setActiveCall(null);
          setCallState('ended');
          setCallSid(null);
          setIsMuted(false);
        });
      }

      createCallRecord(effectiveCallSid, {
        from: customParams.incomingNumber || 'Unknown',
        to: '',
        direction: 'inbound',
        repLang: callLanguages?.srcLang || 'en-US',
        customerLang: callLanguages?.dstLang || 'en-US',
      });

      setIncomingCallInvite(null);
    } catch (err) {
      console.error('[VoiceContext] Failed to accept call:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept call');
      setCallState('idle');
      setIncomingCallInvite(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingCallInvite]);

  const rejectIncomingCall = useCallback(async () => {
    if (!incomingCallInvite) return;
    try {
      stopIncomingRing();
      await incomingCallInvite.reject();
    } catch (err) {
      console.error('[VoiceContext] Failed to reject call:', err);
    } finally {
      setIncomingCallInvite(null);
      setCallState('idle');
    }
  }, [incomingCallInvite]);

  const sendToVoicemail = useCallback(async () => {
    if (!incomingCallInvite) return;
    try {
      stopIncomingRing();
      const parentCallSid = parentCallSidRef.current;
      await incomingCallInvite.reject();

      if (parentCallSid) {
        const authToken = await getToken();
        await fetch(`${API_BASE_URL}/calls/send-to-voicemail`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ parentCallSid }),
        });
      }
    } catch (err) {
      console.error('[VoiceContext] Failed to send to voicemail:', err);
    } finally {
      setIncomingCallInvite(null);
      setCallState('idle');
    }
  }, [incomingCallInvite, getToken]);

  // ---------- Shared call controls ----------
  const hangUp = useCallback(async () => {
    if (roomRef.current) {
      try { await roomRef.current.disconnect(); } catch (e) { console.warn('[VoiceContext] LK disconnect failed:', e); }
      teardownRoom();
    }
    if (activeCall) {
      try { await activeCall.disconnect(); } catch (e) { console.warn('[VoiceContext] Twilio disconnect failed:', e); }
    }
    setActiveCall(null);
    setCallState('ended');
    setCallSid(null);
    setIsMuted(false);
  }, [activeCall]);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    if (roomRef.current) {
      roomRef.current.localParticipant.setMicrophoneEnabled(!newMutedState).catch((e) => {
        console.warn('[VoiceContext] setMicrophoneEnabled failed:', e);
      });
    }
    if (activeCall) {
      try { activeCall.mute(newMutedState); } catch (e) { console.warn('[VoiceContext] Twilio mute failed:', e); }
    }
    setIsMuted(newMutedState);
  }, [activeCall, isMuted]);

  const sendDigits = useCallback((digits: string) => {
    if (activeCall) {
      try { activeCall.sendDigits(digits); } catch (e) { console.warn('[VoiceContext] sendDigits failed:', e); }
    }
  }, [activeCall]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev);
  }, []);

  // Translation/mode/cleanup are driven via the display WebSocket. The active
  // call screen owns the live WS connection (useDisplaySocket), so these context
  // setters are local-state only — the screen's toggleTranslation/sendSetMode/
  // sendSetCleanup actually transmit to the server.
  const toggleTranslation = useCallback((turnOn: boolean) => {
    setIsTranslating(turnOn);
  }, []);

  const setMode = useCallback((value: 'translator' | 'interpreter') => {
    setModeState(value);
    modeRef.current = value;
    // Re-apply customer raw-mic volume for the new mode: audible in
    // interpreter, silent in translator.
    applyDuckableVolume(value === 'interpreter' ? 1 : 0);
  }, []);

  const setCleanup = useCallback((value: boolean) => {
    setCleanupState(value);
  }, []);

  const addTranscript = useCallback((transcript: TranscriptMessage) => {
    setTranscripts(prev => [...prev, transcript]);
  }, []);

  const clearTranscripts = useCallback(() => setTranscripts([]), []);
  const clearError = useCallback(() => setError(null), []);

  const configureIntroduction = useCallback(async (
    message: string,
    customerLang: string,
    repLang: string,
  ): Promise<{ translatedMessage: string; introductionId: string } | null> => {
    try {
      const authToken = await getToken();
      if (!authToken) return null;
      const response = await fetch(`${API_BASE_URL}/introduction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ message, lang: customerLang, sourceLang: repLang, save: true }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return {
        translatedMessage: data.text || '',
        introductionId: data.introductionId || '',
      };
    } catch (err) {
      console.error('[VoiceContext] Failed to configure introduction:', err);
      return null;
    }
  }, [getToken]);

  const endCallFromServer = useCallback(() => {
    teardownRoom();
    setCallState('ended');
    setCallSid(null);
    setActiveCall(null);
    setIsMuted(false);
  }, []);

  const testVoiceSetup = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (!isSignedIn) {
      return { success: false, message: 'FAIL: User not signed in' };
    }
    try {
      const authToken = await getToken();
      if (!authToken) {
        return { success: false, message: 'FAIL: No Clerk auth token' };
      }
      const ping = await fetch(`${API_BASE_URL.replace(/\/api$/, '')}/healthz`).catch(() => null);
      const backendOk = ping && ping.ok;
      return {
        success: !!backendOk,
        message: backendOk
          ? `PASS: Clerk auth + backend reachable. LiveKit ready (rep-${userId}).`
          : 'WARN: Backend healthz unreachable; LiveKit dial may fail.',
      };
    } catch (err: any) {
      return { success: false, message: `FAIL: ${err?.message || err}` };
    }
  }, [getToken, userId, isSignedIn]);

  const value: VoiceContextType = {
    callState,
    activeCall,
    incomingCallInvite,
    isMuted,
    isSpeakerOn,
    callSid,
    callInfo,
    callLanguages,
    callStartTime,
    isTranslating,
    transcripts,
    error,
    isRegistered,
    isVoiceSupported,
    room,
    mode,
    cleanup,
    makeCall,
    acceptIncomingCall,
    rejectIncomingCall,
    sendToVoicemail,
    hangUp,
    toggleMute,
    toggleSpeaker,
    sendDigits,
    addTranscript,
    clearTranscripts,
    clearError,
    toggleTranslation,
    setMode,
    setCleanup,
    configureIntroduction,
    testVoiceSetup,
    endCallFromServer,
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}
