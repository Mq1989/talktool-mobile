import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { API_BASE_URL, WS_BASE_URL } from '../utils/constants';
import { getLocaleForLanguage, LanguageCode } from '../utils/languages';

// Conditionally import Twilio Voice SDK (not available in Expo Go)
let Voice: any = null;
let Call: any = null;
let CallInvite: any = null;

try {
  const TwilioVoice = require('@twilio/voice-react-native-sdk');
  Voice = TwilioVoice.Voice;
  Call = TwilioVoice.Call;
  CallInvite = TwilioVoice.CallInvite;
} catch (e) {
  console.warn('Twilio Voice SDK not available - running in Expo Go?');
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
  // Optional enhanced parameters for /iosCall endpoint
  initialMessage?: string;
  initialMessageOriginal?: string;
  translateInitially?: boolean;
  orgId?: string;
}

interface VoiceContextType {
  // State
  callState: CallState;
  activeCall: any | null;  // Call type from SDK
  incomingCallInvite: any | null;  // CallInvite type from SDK
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
  isVoiceSupported: boolean;  // Whether Voice SDK is available

  // Actions
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
  configureIntroduction: (message: string, customerLang: string, repLang: string) => Promise<{ translatedMessage: string; introductionId: string } | null>;
  testVoiceSetup: () => Promise<{ success: boolean; message: string }>;
  endCallFromServer: () => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn, userId } = useAuth();
  const { user } = useUser();

  // Check if Voice SDK is available
  const isVoiceSupported = Voice !== null && Platform.OS !== 'web';

  // Voice SDK instance
  const voiceRef = useRef<any | null>(null);
  const parentCallSidRef = useRef<string | null>(null);
  const ringSoundRef = useRef<Audio.Sound | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldReconnectRef = useRef(true);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callStateRef = useRef<CallState>('idle');
  const wsInstanceRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // State
  const [callState, setCallState] = useState<CallState>('idle');
  const [activeCall, setActiveCall] = useState<any | null>(null);
  const [incomingCallInvite, setIncomingCallInvite] = useState<any | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [callLanguages, setCallLanguages] = useState<CallLanguages | null>(null);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  // Keep ref in sync for use in closures
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Restore instanceId from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem('device-ws-instance').then((storedId) => {
      if (storedId) {
        wsInstanceRef.current = storedId;
      }
    });
  }, []);

  // Clear instanceId when call ends
  useEffect(() => {
    if (callState === 'ended' || callState === 'idle') {
      wsInstanceRef.current = null;
      AsyncStorage.removeItem('device-ws-instance');
    }
  }, [callState]);

  // Initialize Voice SDK
  useEffect(() => {
    if (!isVoiceSupported) {
      console.log('Voice SDK not available (Expo Go or web)');
      return;
    }

    const initVoice = async () => {
      try {
        const voice = new Voice();
        voiceRef.current = voice;

        // Register event handlers
        voice.on(Voice.Event.CallInvite, handleIncomingCall);
        voice.on(Voice.Event.CancelledCallInvite, handleCancelledInvite);
        voice.on(Voice.Event.Registered, () => {
          console.log('Voice SDK registered for incoming calls');
          setIsRegistered(true);
        });
        voice.on(Voice.Event.Unregistered, () => {
          console.log('Voice SDK unregistered');
          setIsRegistered(false);
        });
        voice.on(Voice.Event.Error, (err: any) => {
          console.error('Voice SDK error:', err);
          setError(err.message || 'Voice SDK error');
        });

        // Register for incoming calls if signed in
        if (isSignedIn) {
          await registerForIncomingCalls();
        }
      } catch (err) {
        console.error('Failed to initialize Voice SDK:', err);
        setError('Failed to initialize voice service');
      }
    };

    initVoice();

    return () => {
      if (voiceRef.current) {
        voiceRef.current.removeAllListeners();
      }
    };
  }, [isVoiceSupported]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isSignedIn]);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && isSignedIn) {
      await registerForIncomingCalls();
    }
  };

  // Register for incoming calls
  const registerForIncomingCalls = async () => {
    if (!voiceRef.current || !isSignedIn) return;

    try {
      const token = await getToken();
      if (!token) {
        console.warn('No auth token available for voice registration');
        return;
      }

      // Get Twilio access token from Next.js backend
      const response = await fetch(`${API_BASE_URL}/accessToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ identity: 'mobile_user', platform: Platform.OS }),
      });

      if (!response.ok) {
        throw new Error('Failed to get access token');
      }

      const data = await response.json();
      const twilioToken = data.token || data.accessToken;

      if (twilioToken) {
        await voiceRef.current.register(twilioToken);
      }
    } catch (err) {
      console.error('Failed to register for incoming calls:', err);
    }
  };

  // Re-register when sign-in state changes
  useEffect(() => {
    if (isSignedIn) {
      registerForIncomingCalls();
    }
  }, [isSignedIn]);

  // Periodic token refresh every 10 minutes when registered
  useEffect(() => {
    if (!isRegistered) return;

    const interval = setInterval(async () => {
      try {
        const authToken = await getToken();
        if (!authToken || !voiceRef.current) return;

        const response = await fetch(`${API_BASE_URL}/accessToken`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ identity: userId || 'mobile_user', platform: Platform.OS }),
        });

        if (!response.ok) return;

        const data = await response.json();
        const twilioToken = data.token || data.accessToken;

        if (twilioToken) {
          await voiceRef.current.register(twilioToken);
          console.log('[VoiceContext] Token refreshed and re-registered');
        }
      } catch (err) {
        console.error('[VoiceContext] Token refresh failed:', err);
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [isRegistered, getToken, userId]);

  // Ring sound helpers
  const playIncomingRing = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      // Use bundled ringtone asset
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ringtoneAsset = require('../../assets/ringtone.mp3');
      const { sound } = await Audio.Sound.createAsync(
        ringtoneAsset,
        { isLooping: true, volume: 1.0 }
      );
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
    console.log('[VoiceContext] Incoming call invite received');

    // Extract custom parameters from the call invite
    const customParams = callInvite.getCustomParameters?.() || callInvite.customParameters || {};
    const parentCallSid = customParams.parentCallSid;
    const srcLang = customParams.srcLang;
    const dstLang = customParams.dstLang;
    const incomingNumber = customParams.incomingNumber;
    const isTranslatingParam = customParams.isTranslating;

    console.log('[VoiceContext] Custom params:', { parentCallSid, srcLang, dstLang, incomingNumber, isTranslatingParam });

    // Store parentCallSid (critical - this is the session key on the backend)
    parentCallSidRef.current = parentCallSid || null;

    // Set languages
    setCallLanguages({ srcLang: srcLang || 'en-US', dstLang: dstLang || 'en-US' });

    // Set incoming state
    setIncomingCallInvite(callInvite);
    setCallState('incoming');

    // Play incoming ring sound
    playIncomingRing();
  };

  const handleCancelledInvite = (_callInvite: any) => {
    console.log('[VoiceContext] Call invite cancelled');
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

      await fetch(`${API_BASE_URL}/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          callSid: effectiveCallSid,
          from: overrides?.from ?? callInfo?.from ?? '',
          to: overrides?.to ?? callInfo?.to ?? '',
          direction: overrides?.direction ?? callInfo?.direction ?? 'outbound',
          repLang: overrides?.repLang ?? callLanguages?.srcLang ?? 'en-US',
          customerLang: overrides?.customerLang ?? callLanguages?.dstLang ?? 'en-US',
        }),
      });
      console.log('[VoiceContext] Call record created for:', effectiveCallSid);
    } catch (err) {
      console.error('[VoiceContext] Failed to create call record:', err);
    }
  };

  const disconnectWebSocket = () => {
    console.log('[VoiceContext] disconnectWebSocket called');
    // Prevent auto-reconnect
    shouldReconnectRef.current = false;
    // Cancel any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (wsRef.current) {
      console.log('[VoiceContext] Closing WebSocket, readyState:', wsRef.current.readyState);
      wsRef.current.close(1000, 'intentional-close');
      wsRef.current = null;
    }
  };

  const connectWebSocket = (sid: string) => {
    console.log('[VoiceContext] connectWebSocket called with sid:', sid);
    if (!sid) {
      console.log('[VoiceContext] connectWebSocket: sid is empty, aborting');
      return;
    }

    let wsUrl = `${WS_BASE_URL}/call/display?callSid=${encodeURIComponent(sid)}`;
    if (wsInstanceRef.current) {
      wsUrl += `&fly-force-instance-id=${encodeURIComponent(wsInstanceRef.current)}`;
    }

    // Duplicate connection prevention: if already connected/connecting to same URL, skip
    if (wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) &&
        (wsRef.current as any).__targetUrl === wsUrl) {
      console.log('[VoiceContext] WebSocket already connected to target URL, skipping');
      return;
    }

    // Clean up existing connection
    disconnectWebSocket();
    shouldReconnectRef.current = true; // Allow reconnect for this new connection

    console.log('[VoiceContext] Connecting WebSocket to URL:', wsUrl);
    console.log('[VoiceContext] WS_BASE_URL:', WS_BASE_URL);
    console.log('[VoiceContext] Current callState at connect time:', callState);

    const socket = new WebSocket(wsUrl);
    (socket as any).__targetUrl = wsUrl;

    socket.onopen = () => {
      console.log('[VoiceContext] WebSocket OPEN - readyState:', socket.readyState);
      // Join the call room
      const joinMsg = { type: 'call.join', callSid: sid };
      console.log('[VoiceContext] Sending join message:', JSON.stringify(joinMsg));
      socket.send(JSON.stringify(joinMsg));

      // Start heartbeat ping every 25s
      heartbeatIntervalRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
        }
      }, 25000);
    };

    socket.onmessage = (event) => {
      console.log('[VoiceContext] WebSocket RAW message received:', event.data);
      try {
        const msg = JSON.parse(event.data);
        console.log('[VoiceContext] WebSocket parsed message - type:', msg.type, 'full:', JSON.stringify(msg));

        // Store instance ID for reconnection affinity
        if (msg.instanceId && msg.instanceId !== wsInstanceRef.current) {
          wsInstanceRef.current = msg.instanceId;
          AsyncStorage.setItem('device-ws-instance', msg.instanceId);
        }

        handleWsMessage(msg);
      } catch (err) {
        console.warn('[VoiceContext] Failed to parse WebSocket message:', err, 'raw:', event.data);
      }
    };

    socket.onclose = (event) => {
      console.log('[VoiceContext] WebSocket CLOSED - code:', event.code, 'reason:', event.reason);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      // Only reconnect if: flag is true AND call is still active (using ref for current value)
      const currentState = callStateRef.current;
      if (shouldReconnectRef.current && event.code !== 1000 && event.code !== 1001 &&
          (currentState === 'active' || currentState === 'call-ringing' || currentState === 'dialing')) {
        console.log('[VoiceContext] WebSocket closed unexpectedly during active call, reconnecting in 1.5s...');
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connectWebSocket(sid);
        }, 1500);
      } else {
        console.log('[VoiceContext] WebSocket closed, NOT reconnecting (shouldReconnect:', shouldReconnectRef.current, 'state:', currentState, ')');
      }
    };

    socket.onerror = (err: any) => {
      console.error('[VoiceContext] WebSocket ERROR:', JSON.stringify(err));
      console.error('[VoiceContext] WebSocket error - socket readyState:', socket.readyState);
    };

    wsRef.current = socket;
  };

  const handleWsMessage = (msg: any) => {
    console.log('[VoiceContext] handleWsMessage - type:', msg.type, 'current callState:', callState);
    switch (msg.type) {
      case 'transcript': {
        const transcript: TranscriptMessage = {
          id: `${msg.time || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          callSid: msg.callSid || callSid || '',
          speaker: msg.from === 'rep' ? 'user' : 'remote',
          originalText: msg.original || '',
          translatedText: msg.translation || '',
          originalLanguage: msg.from === 'rep' ? (callLanguages?.srcLang || '') : (callLanguages?.dstLang || ''),
          targetLanguage: msg.from === 'rep' ? (callLanguages?.dstLang || '') : (callLanguages?.srcLang || ''),
          timestamp: new Date(msg.time || Date.now()),
        };
        setTranscripts(prev => [...prev, transcript]);
        break;
      }

      case 'call-initiated':
        console.log('[VoiceContext] WS: call-initiated');
        setCallState('dialing');
        break;

      case 'call-ringing':
        console.log('[VoiceContext] WS: call-ringing');
        setCallState('call-ringing');
        break;

      case 'call-answered':
        console.log('[VoiceContext] WS: call-answered', msg);
        setCallState('active');
        if (msg.srcLang || msg.dstLang) {
          setCallLanguages({
            srcLang: msg.srcLang || callLanguages?.srcLang || 'en-US',
            dstLang: msg.dstLang || callLanguages?.dstLang || 'en-US',
          });
        }
        if (msg.isTranslating !== undefined) {
          setIsTranslating(Boolean(msg.isTranslating));
        }
        break;

      case 'end-call':
        console.log('[VoiceContext] WS: end-call', msg.reason);
        shouldReconnectRef.current = false;
        disconnectWebSocket();
        AsyncStorage.removeItem('device-ws-instance');
        wsInstanceRef.current = null;
        setCallState('ended');
        setCallSid(null);
        break;

      case 'toggle-translation.ack':
        console.log('[VoiceContext] WS: toggle-translation.ack', msg.isTranslating);
        setIsTranslating(Boolean(msg.isTranslating));
        break;

      case 'translation-state-sync':
        console.log('[VoiceContext] WS: translation-state-sync', msg);
        setIsTranslating(Boolean(msg.isTranslating));
        if (msg.srcLang || msg.dstLang) {
          setCallLanguages({
            srcLang: msg.srcLang || callLanguages?.srcLang || 'en-US',
            dstLang: msg.dstLang || callLanguages?.dstLang || 'en-US',
          });
        }
        break;

      case 'call.join.ack':
        console.log('[VoiceContext] WS: Joined call room (reconnection successful)');
        break;

      case 'call-connecting-customer':
        console.log('[VoiceContext] WS: call-connecting-customer');
        break;

      case 'control.applied':
        console.log('[VoiceContext] WS: control.applied', msg);
        break;

      case 'answering-machine':
        console.log('[VoiceContext] WS: answering-machine detected');
        break;

      case 'pong':
        // Heartbeat response, no action needed
        break;

      default:
        console.log('[VoiceContext] WS: Unknown message type:', msg.type);
    }
  };

  // NOTE: VoiceContext WebSocket is disabled. The useDisplaySocket hook on the
  // active call screen is the single display WebSocket connection. Having two
  // display connections causes the server to close them with code 1012 in a loop.

  // NOTE: Foreground reconnect also disabled - DisplaySocket handles reconnection.

  const setupCallEventListeners = (call: any, callParams?: {
    from: string;
    to: string;
    direction?: 'inbound' | 'outbound';
    repLang?: string;
    customerLang?: string;
  }) => {
    if (!Call) {
      console.warn('[VoiceContext] Call class not available, cannot set up event listeners');
      return;
    }

    console.log('[VoiceContext] Setting up call event listeners');

    // Call connected (equivalent to 'accept' event on web)
    call.on(Call.Event.Connected, () => {
      console.log('[VoiceContext] Event: Call connected');
      setCallState('active');
      setCallStartTime(Date.now());

      // Get parentCallSid from custom parameters (sent by backend on outbound calls)
      const customParams = call.getCustomParameters?.() || {};
      const parentCallSid = customParams.parentCallSid || parentCallSidRef.current;
      const effectiveCallSid = parentCallSid || call.getSid();

      // Store parentCallSid for WebSocket and API calls
      if (parentCallSid) {
        parentCallSidRef.current = parentCallSid;
      }

      console.log('[VoiceContext] Effective callSid:', effectiveCallSid);
      setCallSid(effectiveCallSid);
      setCallInfo(prev => prev ? { ...prev, callSid: effectiveCallSid } : {
        direction: callParams?.direction || 'outbound',
        from: callParams?.from || '',
        to: callParams?.to || '',
        callSid: effectiveCallSid,
      });

      // Create call record on backend
      createCallRecord(effectiveCallSid, callParams ? {
        from: callParams.from,
        to: callParams.to,
        direction: callParams.direction,
        repLang: callParams.repLang,
        customerLang: callParams.customerLang,
      } : undefined);
    });

    // Call ringing (remote party is being called)
    call.on(Call.Event.Ringing, () => {
      console.log('[VoiceContext] Event: Call ringing');
      setCallState('call-ringing');
      // Try to get SID at ringing time as belt-and-suspenders
      const sid = call.getSid?.() || (call as any)._sid || null;
      if (sid && !callSid) {
        console.log('[VoiceContext] Got callSid at Ringing:', sid);
        setCallSid(sid);
      }
    });

    call.on(Call.Event.Reconnecting, () => {
      console.log('[VoiceContext] Event: Call reconnecting');
      setCallState('reconnecting');
    });

    call.on(Call.Event.Reconnected, () => {
      console.log('[VoiceContext] Event: Call reconnected');
      setCallState('active');
    });

    // Call disconnected
    call.on(Call.Event.Disconnected, (err: any) => {
      const sid = call.getSid?.();
      console.log('[VoiceContext] Event: Call disconnected');
      console.log('[VoiceContext] Disconnect - call getSid():', sid);
      console.log('[VoiceContext] Disconnect - call getState():', call.getState?.());
      console.log('[VoiceContext] Disconnect - current callState:', callStateRef.current);
      if (err) {
        console.log('[VoiceContext] Disconnect error:', JSON.stringify(err, null, 2));
        console.log('[VoiceContext] Disconnect error code:', err.code);
        console.log('[VoiceContext] Disconnect error message:', err.message);
      } else {
        console.log('[VoiceContext] Disconnect: No error object provided');
      }

      // If the SDK leg disconnected before Connected ever fired but the call
      // has a SID, the call is still active server-side. Set callSid and
      // transition to 'active' so the UI navigates and the display WebSocket
      // can drive the call state from here.
      if (!err && sid && callStateRef.current === 'dialing') {
        console.log('[VoiceContext] SDK leg dropped during dialing but call has SID - treating as server-side active call');
        setCallSid(sid);
        setCallState('active');
        setActiveCall(null);
        return;
      }

      disconnectWebSocket();
      setActiveCall(null);
      setCallState('ended');
      setCallSid(null);
      setIsMuted(false);
    });

    // Connect failure
    call.on(Call.Event.ConnectFailure, (err: any) => {
      console.error('[VoiceContext] Event: Call connect failure:', err);
      setError(err?.message || 'Failed to connect call');
      disconnectWebSocket();
      setCallState('idle');
      setCallSid(null);
      setActiveCall(null);
    });

    console.log('[VoiceContext] Call event listeners set up complete');
  };

  const makeCall = useCallback(async (params: OutboundCallParams) => {
    console.log('[VoiceContext] makeCall called with:', {
      toNumber: params.toNumber,
      fromNumber: params.fromNumber,
      fromLanguage: params.fromLanguage,
      toLanguage: params.toLanguage,
    });

    if (!isVoiceSupported) {
      console.error('[VoiceContext] Voice SDK not available');
      setError('Voice calls require a development build. Run: npx expo run:ios');
      return;
    }

    if (!voiceRef.current) {
      console.error('[VoiceContext] Voice instance not initialized');
      setError('Voice service not initialized');
      return;
    }

    try {
      setError(null);
      clearTranscripts();
      setCallStartTime(null);

      console.log('[VoiceContext] Getting Clerk auth token...');
      const authToken = await getToken();
      if (!authToken) {
        console.error('[VoiceContext] No Clerk auth token available');
        throw new Error('Not authenticated');
      }
      console.log('[VoiceContext] Clerk auth token obtained');

      // Get Twilio access token from Next.js backend
      console.log('[VoiceContext] Fetching Twilio access token from:', `${API_BASE_URL}/accessToken`);
      const response = await fetch(`${API_BASE_URL}/accessToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          identity: userId || 'mobile_user',
          platform: Platform.OS
        }),
      });

      console.log('[VoiceContext] Access token response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[VoiceContext] Access token request failed:', errorData);
        throw new Error(errorData.message || 'Failed to get access token');
      }

      const data = await response.json();
      console.log('[VoiceContext] Access token response data keys:', Object.keys(data));
      const twilioToken = data.token || data.accessToken || data.data?.token;

      if (!twilioToken) {
        console.error('[VoiceContext] No token found in response:', data);
        throw new Error('No access token received from server');
      }
      console.log('[VoiceContext] Twilio access token obtained, length:', twilioToken.length);

      // Decode JWT payload to inspect grants (for debugging)
      try {
        const parts = twilioToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          console.log('[VoiceContext] Token payload - sub:', payload.sub);
          console.log('[VoiceContext] Token payload - grants:', JSON.stringify(payload.grants));
          console.log('[VoiceContext] Token payload - iss:', payload.iss);
          console.log('[VoiceContext] Token payload - exp:', new Date(payload.exp * 1000).toISOString());
        }
      } catch (decodeErr) {
        console.log('[VoiceContext] Could not decode token payload');
      }

      // Configure audio session for VoIP before connecting
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      console.log('[VoiceContext] makeCall: Setting callState to dialing');
      setCallState('dialing');

      // Convert language codes to locale codes for STT
      const repLang = getLocaleForLanguage(params.fromLanguage);
      const customerLang = getLocaleForLanguage(params.toLanguage);

      // Build call params for /iosCall endpoint
      // Server expects: CallSid (auto from SDK), To, callerId, repLang, customerLang,
      // clerkUserId, orgId, translateInitially, initialMessage
      const callParams = {
        To: params.toNumber,
        callerId: params.fromNumber,
        repLang,
        customerLang,
        clerkUserId: userId || '',
        orgId: params.orgId || '',
        translateInitially: params.translateInitially !== false ? 'true' : 'false',
        initialMessage: params.initialMessage || '',
        initialMessageOriginal: params.initialMessageOriginal || '',
      };

      console.log('[VoiceContext] Making call with params:', callParams);
      console.log('[VoiceContext] Calling voiceRef.current.connect()...');

      // Make the outbound call with server-compatible parameter names
      const call = await voiceRef.current.connect(twilioToken, {
        params: callParams,
      });

      console.log('[VoiceContext] voiceRef.current.connect() returned, call:', call ? 'exists' : 'null');
      if (call) {
        console.log('[VoiceContext] Call object keys:', Object.keys(call));
        console.log('[VoiceContext] Call getSid():', call.getSid?.());
        console.log('[VoiceContext] Call getState():', call.getState?.());
        console.log('[VoiceContext] Call getFrom():', call.getFrom?.());
        console.log('[VoiceContext] Call getTo():', call.getTo?.());
      }

      setActiveCall(call);

      // Set call info (will be updated with parentCallSid when Connected event fires)
      setCallInfo({
        direction: 'outbound',
        from: params.fromNumber,
        to: params.toNumber,
        callSid: null,
      });

      // Set up call event listeners
      setupCallEventListeners(call, {
        from: params.fromNumber,
        to: params.toNumber,
        direction: 'outbound',
        repLang,
        customerLang,
      });

      // Poll for callSid since getSid() returns null immediately after connect()
      const sidPollInterval = setInterval(() => {
        const sid = call.getSid?.() || (call as any)._sid || null;
        console.log('[VoiceContext] Polling for callSid:', sid);
        if (sid) {
          console.log('[VoiceContext] Got callSid from polling:', sid);
          setCallSid(sid);
          setCallInfo(prev => prev ? { ...prev, callSid: sid } : prev);
          clearInterval(sidPollInterval);
        }
      }, 300);

      // Stop polling after 15s or when call ends
      setTimeout(() => clearInterval(sidPollInterval), 15000);
      call.on(Call.Event.Disconnected, () => clearInterval(sidPollInterval));
      call.on(Call.Event.ConnectFailure, () => clearInterval(sidPollInterval));

      console.log('[VoiceContext] Outbound call initiated, polling for SID');
    } catch (err) {
      console.error('[VoiceContext] Failed to make call:', err);
      setError(err instanceof Error ? err.message : 'Failed to make call');
      setCallState('idle');
    }
  }, [getToken, userId]);

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCallInvite) {
      setError('No incoming call to accept');
      return;
    }

    try {
      // Stop ring and reset transcript
      stopIncomingRing();
      setTranscripts([]);
      setCallStartTime(Date.now());

      // Accept the call
      const call = await incomingCallInvite.accept();
      setActiveCall(call);
      setCallState('active');

      // Extract parentCallSid from custom parameters
      const customParams = incomingCallInvite.getCustomParameters?.() || incomingCallInvite.customParameters || {};
      const parentCallSid = parentCallSidRef.current || customParams.parentCallSid;
      const effectiveCallSid = parentCallSid || call.getSid();

      // Set translation state from custom params
      const shouldTranslate = customParams.isTranslating === 'true';
      setIsTranslating(shouldTranslate);

      // Set call info
      setCallInfo({
        direction: 'inbound',
        from: customParams.incomingNumber || 'Unknown',
        to: '',
        callSid: effectiveCallSid,
      });
      setCallSid(effectiveCallSid);

      // Set up call event listeners
      const inboundCallParams = {
        from: customParams.incomingNumber || 'Unknown',
        to: '',
        direction: 'inbound' as const,
        repLang: callLanguages?.srcLang || 'en-US',
        customerLang: callLanguages?.dstLang || 'en-US',
      };
      setupCallEventListeners(call, inboundCallParams);

      // Create call record on backend
      createCallRecord(effectiveCallSid, inboundCallParams);

      setIncomingCallInvite(null);
    } catch (err) {
      console.error('[VoiceContext] Failed to accept call:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept call');
      setCallState('idle');
      setIncomingCallInvite(null);
    }
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
        await fetch(`${API_BASE_URL}/api/calls/send-to-voicemail`, {
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

  const hangUp = useCallback(async () => {
    if (!activeCall) return;

    try {
      await activeCall.disconnect();
    } catch (err) {
      console.error('[VoiceContext] Failed to disconnect call:', err);
    }
    shouldReconnectRef.current = false;
    disconnectWebSocket();
    AsyncStorage.removeItem('device-ws-instance');
    wsInstanceRef.current = null;
    setActiveCall(null);
    setCallState('ended');
    setCallSid(null);
    setIsMuted(false);
  }, [activeCall]);

  const toggleMute = useCallback(() => {
    if (activeCall) {
      const newMutedState = !isMuted;
      activeCall.mute(newMutedState);
      setIsMuted(newMutedState);
    }
  }, [activeCall, isMuted]);

  const sendDigits = useCallback((digits: string) => {
    if (activeCall) {
      activeCall.sendDigits(digits);
    }
  }, [activeCall]);

  const toggleSpeaker = useCallback(() => {
    // Speaker toggle is handled via audio routing
    // This is a placeholder - actual implementation depends on expo-av or native module
    setIsSpeakerOn(!isSpeakerOn);
  }, [isSpeakerOn]);

  const toggleTranslation = useCallback((turnOn: boolean) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[VoiceContext] WebSocket not connected, cannot toggle translation');
      return;
    }
    const messageType = turnOn ? 'translation-on' : 'translation-off';
    wsRef.current.send(JSON.stringify({ type: messageType, callSid }));
  }, [callSid]);

  const addTranscript = useCallback((transcript: TranscriptMessage) => {
    setTranscripts(prev => [...prev, transcript]);
  }, []);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

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
        body: JSON.stringify({
          message,
          lang: customerLang,
          sourceLang: repLang,
          save: true,
        }),
      });

      if (!response.ok) {
        console.error('[VoiceContext] Introduction translation failed:', response.status);
        return null;
      }

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
    console.log('[VoiceContext] endCallFromServer called - resetting call state');
    setCallState('ended');
    setCallSid(null);
    setActiveCall(null);
    setIsMuted(false);
  }, []);

  const testVoiceSetup = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    console.log('[VoiceContext] === RUNNING TEST ===');

    // Test 1: Check if Voice SDK is loaded
    console.log('[VoiceContext] Test 1: Voice SDK loaded?', Voice !== null);
    if (!Voice) {
      const msg = 'FAIL: Twilio Voice SDK not loaded. Are you running in Expo Go?';
      console.error('[VoiceContext]', msg);
      return { success: false, message: msg };
    }
    console.log('[VoiceContext] PASS: Voice SDK is loaded');

    // Test 2: Check if Voice instance is initialized
    console.log('[VoiceContext] Test 2: Voice instance initialized?', voiceRef.current !== null);
    if (!voiceRef.current) {
      const msg = 'FAIL: Voice instance not initialized';
      console.error('[VoiceContext]', msg);
      return { success: false, message: msg };
    }
    console.log('[VoiceContext] PASS: Voice instance initialized');

    // Test 3: Check authentication
    console.log('[VoiceContext] Test 3: User authenticated?', isSignedIn);
    if (!isSignedIn) {
      const msg = 'FAIL: User not signed in';
      console.error('[VoiceContext]', msg);
      return { success: false, message: msg };
    }
    console.log('[VoiceContext] PASS: User is signed in');

    // Test 4: Fetch Clerk auth token
    console.log('[VoiceContext] Test 4: Fetching Clerk auth token...');
    let authToken: string | null = null;
    try {
      authToken = await getToken();
      if (!authToken) {
        const msg = 'FAIL: No Clerk auth token received';
        console.error('[VoiceContext]', msg);
        return { success: false, message: msg };
      }
      console.log('[VoiceContext] PASS: Clerk auth token received, length:', authToken.length);
    } catch (err) {
      const msg = `FAIL: Error getting Clerk token: ${err}`;
      console.error('[VoiceContext]', msg);
      return { success: false, message: msg };
    }

    // Test 5: Fetch Twilio access token
    console.log('[VoiceContext] Test 5: Fetching Twilio access token from:', `${API_BASE_URL}/accessToken`);
    try {
      const response = await fetch(`${API_BASE_URL}/accessToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          identity: userId || 'mobile_user',
          platform: Platform.OS
        }),
      });

      console.log('[VoiceContext] Access token response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = `FAIL: Access token request failed with status ${response.status}: ${JSON.stringify(errorData)}`;
        console.error('[VoiceContext]', msg);
        return { success: false, message: msg };
      }

      const data = await response.json();
      console.log('[VoiceContext] Access token response keys:', Object.keys(data));

      const twilioToken = data.token || data.accessToken || data.data?.token;
      if (!twilioToken) {
        const msg = `FAIL: No token in response. Keys: ${Object.keys(data).join(', ')}`;
        console.error('[VoiceContext]', msg);
        return { success: false, message: msg };
      }

      console.log('[VoiceContext] PASS: Twilio access token received, length:', twilioToken.length);
      console.log('[VoiceContext] Token preview:', twilioToken.substring(0, 50) + '...');

    } catch (err) {
      const msg = `FAIL: Error fetching Twilio token: ${err}`;
      console.error('[VoiceContext]', msg);
      return { success: false, message: msg };
    }

    console.log('[VoiceContext] === ALL TESTS PASSED ===');
    return { success: true, message: 'All tests passed! Voice SDK loaded, authenticated, and access token received.' };
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
