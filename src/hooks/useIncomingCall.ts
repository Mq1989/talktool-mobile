import { useCallback, useEffect, useState } from 'react';
import { useAuth, useOrganization } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useVoice } from '../contexts/VoiceContext';
import type { IncomingCallPayload } from '../contexts/VoiceContext';
import { availabilityService } from '../services/availabilityService';
import { useAgentNotifySocket, AgentNotifyCancel } from './useAgentNotifySocket';

/**
 * Bridges the /agent/notify socket → VoiceContext → navigation for foreground
 * incoming calls. The socket is only open while the user is "available"
 * (subscribed reactively from availabilityService, whose 30s heartbeat keeps
 * the server-side presence key alive that the ring fan-out requires).
 */
export function useIncomingCall() {
  const { userId } = useAuth();
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const router = useRouter();
  const { presentIncomingCall, dismissIncomingCall, pendingIncoming } = useVoice();

  // Own the availability service credentials + app-state listener app-wide so
  // availability (and thus incoming calls) persists no matter which screen is
  // mounted. Settings only toggles setAvailable/setUnavailable; it must NOT tear
  // this down on unmount. init() is idempotent.
  useEffect(() => {
    if (userId && orgId) {
      availabilityService.init(userId, orgId);
    }
  }, [userId, orgId]);

  // Reactively track "available" so the notify socket opens/closes with it.
  const [isAvailable, setIsAvailable] = useState(
    () => availabilityService.getState().isAvailable,
  );
  useEffect(() => {
    const sync = () => setIsAvailable(availabilityService.getState().isAvailable);
    const unsubscribe = availabilityService.subscribe(sync);
    sync(); // catch any change between initial render and subscribe
    return unsubscribe;
  }, []);

  const onIncomingCall = useCallback(
    (payload: IncomingCallPayload) => {
      presentIncomingCall(payload);
      router.push('/call/incoming');
    },
    [presentIncomingCall, router],
  );

  const onCallCanceled = useCallback(
    (event: AgentNotifyCancel) => {
      // Only act if the cancel is for the call we're currently ringing on.
      if (pendingIncoming && pendingIncoming.callSid === event.callSid) {
        dismissIncomingCall();
        router.replace('/(tabs)');
      }
    },
    [pendingIncoming, dismissIncomingCall, router],
  );

  useAgentNotifySocket({
    userId: userId ?? null,
    enabled: isAvailable,
    onIncomingCall,
    onCallCanceled,
  });
}

/**
 * Null-rendering component to mount useIncomingCall app-wide, inside the Clerk +
 * Voice providers (see app/_layout.tsx).
 */
export function IncomingCallController(): null {
  useIncomingCall();
  return null;
}
