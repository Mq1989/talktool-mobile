import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { WS_BASE_URL, DISPLAY_WS_MAX_RECONNECT_ATTEMPTS, DISPLAY_WS_RECONNECT_BASE_MS, DISPLAY_WS_RECONNECT_MAX_MS } from '../utils/constants';

/**
 * Transcript message from the display WebSocket
 * Matches the server's transcript message format
 */
export interface DisplayTranscript {
  id: string;
  /** Display this - shows translation if enabled, original if not */
  text: string;
  /** What was actually spoken (in speaker's language) */
  original: string;
  /** Translated text (empty if translation off or same language) */
  translation: string;
  /** Who spoke: "rep" (iOS user) or "customer" */
  from: 'rep' | 'customer';
  /** Who receives: "customer" or "rep" */
  to: 'rep' | 'customer';
  /** Human-readable time string */
  timestamp: string;
  /** Epoch milliseconds (for sorting) */
  time: number;
  /** Whether translation was enabled for this message */
  translationEnabled?: boolean;
  callSid?: string;
}

/**
 * Translation state from the server
 */
export interface TranslationState {
  isTranslating: boolean;
  srcLang: string;
  dstLang: string;
}

/**
 * Call end event from the server
 */
export interface CallEndEvent {
  reason: 'rep-hangup' | 'customer-hangup' | 'browser-agent-hangup' | 'timeout' | 'error';
  timestamp: string;
}

interface UseDisplaySocketOptions {
  callSid: string | null;
  onTranscript?: (transcript: DisplayTranscript) => void;
  onCallEnd?: (event: CallEndEvent) => void;
  onCallAnswered?: () => void;
  onCallRinging?: () => void;
  onTranslationStateChange?: (state: TranslationState) => void;
  onConnected?: () => void;
  onError?: (error: string) => void;
}

interface UseDisplaySocketReturn {
  isConnected: boolean;
  isJoined: boolean;
  error: string | null;
  translationState: TranslationState | null;
  toggleTranslation: (enabled: boolean) => void;
  reconnect: () => void;
}

export function useDisplaySocket({
  callSid,
  onTranscript,
  onCallEnd,
  onCallAnswered,
  onCallRinging,
  onTranslationStateChange,
  onConnected,
  onError,
}: UseDisplaySocketOptions): UseDisplaySocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageTimeRef = useRef<number>(0);

  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translationState, setTranslationState] = useState<TranslationState | null>(null);

  // Callback refs to avoid stale closures in WebSocket handlers
  const onTranscriptRef = useRef(onTranscript);
  const onCallEndRef = useRef(onCallEnd);
  const onCallAnsweredRef = useRef(onCallAnswered);
  const onCallRingingRef = useRef(onCallRinging);
  const onTranslationStateChangeRef = useRef(onTranslationStateChange);
  const onConnectedRef = useRef(onConnected);
  const onErrorRef = useRef(onError);
  const translationStateRef = useRef(translationState);

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onCallEndRef.current = onCallEnd; }, [onCallEnd]);
  useEffect(() => { onCallAnsweredRef.current = onCallAnswered; }, [onCallAnswered]);
  useEffect(() => { onCallRingingRef.current = onCallRinging; }, [onCallRinging]);
  useEffect(() => { onTranslationStateChangeRef.current = onTranslationStateChange; }, [onTranslationStateChange]);
  useEffect(() => { onConnectedRef.current = onConnected; }, [onConnected]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { translationStateRef.current = translationState; }, [translationState]);

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearTimers();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsJoined(false);
  }, [clearTimers]);

  const toggleTranslation = useCallback((enabled: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && callSid) {
      wsRef.current.send(JSON.stringify({
        type: enabled ? 'translation-on' : 'translation-off',
        callSid,
      }));
    }
  }, [callSid]);

  const connect = useCallback(() => {
    console.log('[DisplaySocket] connect() called with callSid:', callSid);
    console.log('[DisplaySocket] WS_BASE_URL:', WS_BASE_URL);

    if (!callSid) {
      console.log('[DisplaySocket] No callSid provided, skipping connection');
      return;
    }

    // Clean up existing connection
    disconnect();

    try {
      // Connect to /call/display/{callSid} endpoint
      const wsUrl = `${WS_BASE_URL}/call/display/${callSid}`;
      console.log('[DisplaySocket] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[DisplaySocket] ✅ WebSocket OPEN - connected to:', wsUrl);
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;

        // Send call.join to ensure server attaches display to correct session
        // (matches web app behavior - critical for reliable attachment)
        try {
          ws.send(JSON.stringify({
            type: 'call.join',
            callSid,
            lastMessageTime: lastMessageTimeRef.current || undefined,
          }));
          console.log('[DisplaySocket] Sent call.join for callSid:', callSid);
        } catch (e) {
          console.error('[DisplaySocket] Failed to send call.join:', e);
        }

        // Start heartbeat ping every 25 seconds
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        console.log('[DisplaySocket] 📩 Raw message received:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('[DisplaySocket] Parsed message type:', data.type);

          switch (data.type) {
            // 1. Confirms display channel is connected
            case 'call.join.ack':
              console.log('[DisplaySocket] Joined call:', data.callSid);
              setIsJoined(true);
              onConnectedRef.current?.();
              break;

            // 2. Sync current translation state
            case 'translation-state-sync':
              const state: TranslationState = {
                isTranslating: data.isTranslating,
                srcLang: data.srcLang,
                dstLang: data.dstLang,
              };
              console.log('[DisplaySocket] Translation state:', state);
              setTranslationState(state);
              onTranslationStateChangeRef.current?.(state);
              break;

            // 3. Real-time transcript with translation
            case 'transcript':
              lastMessageTimeRef.current = Math.max(lastMessageTimeRef.current, data.time || Date.now());
              console.log('[DisplaySocket] Transcript received:', {
                from: data.from,
                original: data.original?.substring(0, 50),
                translation: data.translation?.substring(0, 50),
                text: data.text?.substring(0, 50),
              });
              const transcript: DisplayTranscript = {
                id: `${data.time || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                text: data.text || '',
                original: data.original || '',
                translation: data.translation || '',
                from: data.from || 'customer',
                to: data.to || 'rep',
                timestamp: data.timestamp || new Date().toLocaleTimeString(),
                time: data.time || Date.now(),
                translationEnabled: data.translationEnabled,
                callSid: data.callSid,
              };
              console.log('[DisplaySocket] Calling onTranscript callback with:', transcript.from, transcript.original?.substring(0, 30));
              onTranscriptRef.current?.(transcript);
              break;

            // 4. Confirms translation state changed
            case 'toggle-translation.ack':
              console.log('[DisplaySocket] Translation toggled:', data.isTranslating);
              setTranslationState(prev => prev ? { ...prev, isTranslating: data.isTranslating } : null);
              onTranslationStateChangeRef.current?.({
                isTranslating: data.isTranslating,
                srcLang: translationStateRef.current?.srcLang || '',
                dstLang: translationStateRef.current?.dstLang || '',
              });
              break;

            // 5. Call terminated
            case 'end-call':
              console.log('[DisplaySocket] Call ended:', data.reason);
              const endEvent: CallEndEvent = {
                reason: data.reason || 'rep-hangup',
                timestamp: data.timestamp || new Date().toISOString(),
              };
              onCallEndRef.current?.(endEvent);
              disconnect();
              break;

            // 6. Heartbeat response
            case 'pong':
              // Connection is alive, no action needed
              break;

            // 7. Call answered by remote party
            case 'call-answered':
              console.log('[DisplaySocket] Call answered:', data.callSid);
              onCallAnsweredRef.current?.();
              break;

            // 8. Call ringing at remote party
            case 'call-ringing':
              console.log('[DisplaySocket] Call ringing:', data.callSid);
              onCallRingingRef.current?.();
              break;

            case 'error':
              console.error('[DisplaySocket] Server error:', data.message);
              setError(data.message);
              onErrorRef.current?.(data.message);
              break;

            default:
              console.log('[DisplaySocket] Unknown message type:', data.type, data);
          }
        } catch (parseError) {
          console.error('[DisplaySocket] Error parsing message:', parseError);
        }
      };

      ws.onerror = (event) => {
        console.error('[DisplaySocket] WebSocket error:', event);
        setError('Connection error');
        onErrorRef.current?.('Connection error');
      };

      ws.onclose = (event) => {
        console.log('[DisplaySocket] WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsJoined(false);
        clearTimers();

        const shouldReconnect =
          event.code !== 1000 &&
          callSid &&
          reconnectAttempts.current < DISPLAY_WS_MAX_RECONNECT_ATTEMPTS;

        if (shouldReconnect) {
          reconnectAttempts.current++;
          const delay = Math.min(
            DISPLAY_WS_RECONNECT_BASE_MS * Math.pow(2, reconnectAttempts.current - 1),
            DISPLAY_WS_RECONNECT_MAX_MS
          );
          console.log(`[DisplaySocket] Reconnect ${reconnectAttempts.current}/${DISPLAY_WS_MAX_RECONNECT_ATTEMPTS} in ${delay}ms (code: ${event.code})`);
          reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
        }
      };
    } catch (err) {
      console.error('[DisplaySocket] Error creating WebSocket:', err);
      setError('Failed to connect');
      onErrorRef.current?.('Failed to connect');
    }
  }, [callSid, disconnect, clearTimers]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && callSid) {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          reconnectAttempts.current = 0; // Fresh start on foreground
          connect();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [callSid, connect]);

  // Connect when callSid changes
  useEffect(() => {
    if (callSid) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [callSid]);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  return {
    isConnected,
    isJoined,
    error,
    translationState,
    toggleTranslation,
    reconnect,
  };
}
