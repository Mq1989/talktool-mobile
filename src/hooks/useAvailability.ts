import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { API_BASE_URL } from '../utils/constants';

interface UseAvailabilityReturn {
  isAvailable: boolean;
  selectedPhoneNumbers: string[];
  setSelectedPhoneNumbers: (numbers: string[]) => void;
  goAvailable: (phoneNumbers?: string[]) => Promise<void>;
  goUnavailable: () => Promise<void>;
}

export function useAvailability(): UseAvailabilityReturn {
  const { getToken } = useAuth();

  const [isAvailable, setIsAvailable] = useState(false);
  const [selectedPhoneNumbers, setSelectedPhoneNumbers] = useState<string[]>([]);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const goAvailable = useCallback(async (phoneNumbers?: string[]) => {
    try {
      const authToken = await getToken();
      if (!authToken) return;

      const numbers = phoneNumbers || selectedPhoneNumbers;

      await fetch(`${API_BASE_URL}/availability/set-available-multi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ phoneNumbers: numbers }),
      });

      setIsAvailable(true);
      if (phoneNumbers) {
        setSelectedPhoneNumbers(phoneNumbers);
      }

      // Start heartbeat every 30s
      clearHeartbeat();
      heartbeatIntervalRef.current = setInterval(async () => {
        try {
          const token = await getToken();
          if (!token) return;

          await fetch(`${API_BASE_URL}/availability/heartbeat-multi`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ phoneNumbers: numbers }),
          });
        } catch (err) {
          console.error('[useAvailability] Heartbeat failed:', err);
        }
      }, 30000);

      console.log('[useAvailability] Set available with numbers:', numbers);
    } catch (err) {
      console.error('[useAvailability] Failed to go available:', err);
    }
  }, [getToken, selectedPhoneNumbers, clearHeartbeat]);

  const goUnavailable = useCallback(async () => {
    try {
      const authToken = await getToken();
      if (!authToken) return;

      await fetch(`${API_BASE_URL}/availability/set-unavailable-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      setIsAvailable(false);
      clearHeartbeat();

      console.log('[useAvailability] Set unavailable');
    } catch (err) {
      console.error('[useAvailability] Failed to go unavailable:', err);
    }
  }, [getToken, clearHeartbeat]);

  return {
    isAvailable,
    selectedPhoneNumbers,
    setSelectedPhoneNumbers,
    goAvailable,
    goUnavailable,
  };
}
