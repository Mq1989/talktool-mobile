import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  WS_BASE_URL,
  DISPLAY_WS_MAX_RECONNECT_ATTEMPTS,
  DISPLAY_WS_RECONNECT_BASE_MS,
  DISPLAY_WS_RECONNECT_MAX_MS,
} from '../utils/constants';
import type { IncomingCallPayload } from '../contexts/VoiceContext';

/**
 * Cancel event for a ringing inbound call (caller hung up, or another agent
 * answered first). Matches the server's `call-canceled` payload.
 */
export interface AgentNotifyCancel {
  callSid: string;
  reason: string;
}

interface UseAgentNotifySocketOptions {
  /** Clerk user id; the notify channel is keyed by userId (no token needed). */
  userId: string | null;
  /** Open the socket only while true (drive off "available"). */
  enabled: boolean;
  onIncomingCall?: (payload: IncomingCallPayload) => void;
  onCallCanceled?: (event: AgentNotifyCancel) => void;
  onConnected?: () => void;
  onError?: (error: string) => void;
}

interface UseAgentNotifySocketReturn {
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

/**
 * Connects to the livekit-server `/agent/notify?userId=` WebSocket to receive
 * inbound-call ring events while the user is "available" (foreground path — no
 * VoIP push). Modeled on useDisplaySocket (backoff reconnect, app-level ping
 * heartbeat, foreground reconnect). The server sends:
 *   { type: "notify.ack", userId }
 *   { type: "incoming-call", callSid, roomName, callerNumber, srcLang, dstLang, targets }
 *   { type: "call-canceled", callSid, reason }
 *   { type: "pong", ts }
 */
export function useAgentNotifySocket({
  userId,
  enabled,
  onIncomingCall,
  onCallCanceled,
  onConnected,
  onError,
}: UseAgentNotifySocketOptions): UseAgentNotifySocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Callback refs to avoid stale closures in the WebSocket handlers.
  const onIncomingCallRef = useRef(onIncomingCall);
  const onCallCanceledRef = useRef(onCallCanceled);
  const onConnectedRef = useRef(onConnected);
  const onErrorRef = useRef(onError);
  useEffect(() => { onIncomingCallRef.current = onIncomingCall; }, [onIncomingCall]);
  useEffect(() => { onCallCanceledRef.current = onCallCanceled; }, [onCallCanceled]);
  useEffect(() => { onConnectedRef.current = onConnected; }, [onConnected]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

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
      try { wsRef.current.close(1000); } catch { /* noop */ }
      wsRef.current = null;
    }
    setIsConnected(false);
  }, [clearTimers]);

  const connect = useCallback(() => {
    if (!enabled || !userId) return;

    disconnect();

    try {
      const wsUrl = `${WS_BASE_URL}/agent/notify?userId=${encodeURIComponent(userId)}`;
      console.log('[AgentNotify] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[AgentNotify] ✅ connected');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        // App-level heartbeat (RN bridge doesn't relay protocol ping/pong).
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        let data: any;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        switch (data.type) {
          case 'notify.ack':
            console.log('[AgentNotify] ack for user:', data.userId);
            onConnectedRef.current?.();
            break;

          case 'incoming-call':
            console.log('[AgentNotify] incoming-call:', data.callSid, 'from', data.callerNumber);
            onIncomingCallRef.current?.({
              callSid: data.callSid,
              roomName: data.roomName,
              callerNumber: data.callerNumber,
              srcLang: data.srcLang,
              dstLang: data.dstLang,
              targets: data.targets,
            });
            break;

          case 'call-canceled':
            console.log('[AgentNotify] call-canceled:', data.callSid, data.reason);
            onCallCanceledRef.current?.({ callSid: data.callSid, reason: data.reason });
            break;

          case 'pong':
            break;

          default:
            console.log('[AgentNotify] unknown message type:', data.type);
        }
      };

      ws.onerror = () => {
        setError('Notify connection error');
        onErrorRef.current?.('Notify connection error');
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        clearTimers();

        const shouldReconnect =
          event.code !== 1000 &&
          enabled &&
          !!userId &&
          reconnectAttempts.current < DISPLAY_WS_MAX_RECONNECT_ATTEMPTS;

        if (shouldReconnect) {
          reconnectAttempts.current++;
          const delay = Math.min(
            DISPLAY_WS_RECONNECT_BASE_MS * Math.pow(2, reconnectAttempts.current - 1),
            DISPLAY_WS_RECONNECT_MAX_MS,
          );
          console.log(`[AgentNotify] reconnect ${reconnectAttempts.current}/${DISPLAY_WS_MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
          reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
        }
      };
    } catch {
      setError('Failed to connect notify socket');
      onErrorRef.current?.('Failed to connect notify socket');
    }
  }, [enabled, userId, disconnect, clearTimers]);

  // Open when enabled + userId; close otherwise.
  useEffect(() => {
    if (enabled && userId) {
      reconnectAttempts.current = 0;
      connect();
    } else {
      disconnect();
    }
    return () => { disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userId]);

  // Fresh reconnect on foreground.
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && enabled && userId) {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          reconnectAttempts.current = 0;
          connect();
        }
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userId]);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  return { isConnected, error, reconnect };
}
