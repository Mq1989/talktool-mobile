import { AppState, AppStateStatus } from 'react-native';
import { apiEndpoints } from './api';
import * as Device from 'expo-device';

const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds per api-guide.md recommendation

interface AvailabilityState {
  isAvailable: boolean;
  activeNumbers: string[];
  heartbeatInterval: ReturnType<typeof setInterval> | null;
  appStateSubscription: ReturnType<typeof AppState.addEventListener> | null;
  userId: string | null;
  orgId: string | null;
  deviceId: string;
}

let state: AvailabilityState = {
  isAvailable: false,
  activeNumbers: [],
  heartbeatInterval: null,
  appStateSubscription: null,
  userId: null,
  orgId: null,
  deviceId: Device.deviceName || `device_${Date.now()}`,
};

// Observable availability: the incoming-call notify socket subscribes so it can
// open only while the user is "available" (and the required heartbeat is live).
// notifyListeners() fires on every isAvailable transition via start/stopHeartbeat.
type AvailabilityListener = () => void;
const listeners = new Set<AvailabilityListener>();
const notifyListeners = () => {
  for (const listener of listeners) {
    try {
      listener();
    } catch (e) {
      console.warn('[availabilityService] listener error:', e);
    }
  }
};

const sendHeartbeat = async () => {
  if (!state.isAvailable || state.activeNumbers.length === 0 || !state.userId || !state.orgId) {
    return;
  }

  try {
    if (state.activeNumbers.length === 1) {
      await apiEndpoints.sendHeartbeat(
        state.userId,
        state.orgId,
        state.activeNumbers[0],
        state.deviceId,
        'available'
      );
    } else {
      await apiEndpoints.sendHeartbeatMulti(
        state.userId,
        state.orgId,
        state.activeNumbers,
        state.deviceId,
        'available'
      );
    }
    console.log('[availabilityService] Heartbeat sent for numbers:', state.activeNumbers);
  } catch (error) {
    console.error('[availabilityService] Failed to send heartbeat:', error);
  }
};

const handleAppStateChange = (nextAppState: AppStateStatus) => {
  if (nextAppState === 'active' && state.isAvailable) {
    // App came back to foreground, send immediate heartbeat
    sendHeartbeat();
  }
};

const startHeartbeat = () => {
  // Clear existing interval if any
  if (state.heartbeatInterval) {
    clearInterval(state.heartbeatInterval);
  }

  // Send immediate heartbeat
  sendHeartbeat();

  // Start periodic heartbeat
  state.heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

  // isAvailable has just become (or stayed) true — notify subscribers.
  notifyListeners();
};

const stopHeartbeat = () => {
  if (state.heartbeatInterval) {
    clearInterval(state.heartbeatInterval);
    state.heartbeatInterval = null;
  }
  // isAvailable has just become false (or is confirmed off) — notify subscribers.
  notifyListeners();
};

export const availabilityService = {
  /**
   * Initialize the availability service with user credentials
   * Both parameters are optional - call setCredentials() later if not available at init time
   */
  init(userId?: string, orgId?: string) {
    if (userId) state.userId = userId;
    if (orgId) state.orgId = orgId;

    // Listen for app state changes
    if (!state.appStateSubscription) {
      state.appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    }
  },

  /**
   * Set user credentials after initialization
   */
  setCredentials(userId: string, orgId: string) {
    state.userId = userId;
    state.orgId = orgId;
  },

  /**
   * Cleanup the availability service
   */
  cleanup() {
    this.setUnavailable();
    if (state.appStateSubscription) {
      state.appStateSubscription.remove();
      state.appStateSubscription = null;
    }
    state.userId = null;
    state.orgId = null;
  },

  /**
   * Set availability status for specific phone numbers
   * Uses multi-number API when multiple numbers provided
   */
  async setAvailable(numbers: string[]) {
    if (!state.userId || !state.orgId) {
      console.error('[availabilityService] Cannot set available - missing userId or orgId');
      return;
    }

    state.isAvailable = true;
    state.activeNumbers = numbers;

    try {
      if (numbers.length === 1) {
        await apiEndpoints.setAvailable(state.userId, state.orgId, numbers[0]);
      } else if (numbers.length > 1) {
        await apiEndpoints.setAvailableMulti(state.userId, state.orgId, numbers);
      }
      console.log('[availabilityService] Set available for numbers:', numbers);
    } catch (error) {
      console.error('[availabilityService] Failed to set availability:', error);
    }

    // Start heartbeat
    startHeartbeat();
  },

  /**
   * Set status to unavailable for all numbers
   */
  async setUnavailable() {
    if (!state.userId) {
      // Just clear local state
      state.isAvailable = false;
      state.activeNumbers = [];
      stopHeartbeat();
      return;
    }

    state.isAvailable = false;
    state.activeNumbers = [];

    // Stop heartbeat
    stopHeartbeat();

    try {
      await apiEndpoints.setUnavailableAll(state.userId, state.orgId);
      console.log('[availabilityService] Set unavailable for all numbers');
    } catch (error) {
      console.error('[availabilityService] Failed to set unavailable:', error);
    }
  },

  /**
   * Set status to unavailable for a single number
   */
  async setUnavailableForNumber(number: string) {
    if (!state.userId) {
      return;
    }

    state.activeNumbers = state.activeNumbers.filter(n => n !== number);
    state.isAvailable = state.activeNumbers.length > 0;

    if (!state.isAvailable) {
      stopHeartbeat();
    }

    try {
      await apiEndpoints.setUnavailable(state.userId, state.orgId, number);
      console.log('[availabilityService] Set unavailable for number:', number);
    } catch (error) {
      console.error('[availabilityService] Failed to set unavailable for number:', error);
    }
  },

  /**
   * Update availability for a single number
   */
  async toggleNumberAvailability(number: string, available: boolean) {
    if (!state.userId) {
      console.error('[availabilityService] Cannot toggle - missing userId');
      return;
    }

    if (available) {
      if (!state.activeNumbers.includes(number)) {
        state.activeNumbers.push(number);
      }
      try {
        await apiEndpoints.setAvailable(state.userId, state.orgId, number);
      } catch (error) {
        console.error(`[availabilityService] Failed to set available for ${number}:`, error);
      }
    } else {
      state.activeNumbers = state.activeNumbers.filter(n => n !== number);
      try {
        await apiEndpoints.setUnavailable(state.userId, state.orgId, number);
      } catch (error) {
        console.error(`[availabilityService] Failed to set unavailable for ${number}:`, error);
      }
    }

    // Update heartbeat state
    state.isAvailable = state.activeNumbers.length > 0;
    if (state.isAvailable && !state.heartbeatInterval) {
      startHeartbeat();
    } else if (!state.isAvailable) {
      stopHeartbeat();
    }
  },

  /**
   * Set status to busy (on a call)
   */
  async setBusy(number: string) {
    if (!state.userId) {
      return;
    }

    try {
      await apiEndpoints.setBusy(state.userId, state.orgId, number);
      console.log('[availabilityService] Set busy for number:', number);
    } catch (error) {
      console.error('[availabilityService] Failed to set busy:', error);
    }
  },

  /**
   * Set status to ringing (incoming call)
   */
  async setRinging(number: string) {
    if (!state.userId) {
      return;
    }

    try {
      await apiEndpoints.setRinging(state.userId, state.orgId, number);
      console.log('[availabilityService] Set ringing for number:', number);
    } catch (error) {
      console.error('[availabilityService] Failed to set ringing:', error);
    }
  },

  /**
   * Get availability status for a phone number
   */
  async getStatus(phoneNumber: string) {
    try {
      const response = await apiEndpoints.getAvailabilityStatus(phoneNumber, state.userId || undefined);
      return response.data;
    } catch (error) {
      console.error('[availabilityService] Failed to get status:', error);
      return null;
    }
  },

  /**
   * Get availability preferences
   */
  async getPreferences() {
    try {
      const response = await apiEndpoints.getAvailabilityPreferences();
      return response.data;
    } catch (error) {
      console.error('[availabilityService] Failed to get preferences:', error);
      return null;
    }
  },

  /**
   * Update availability preferences
   */
  async updatePreferences(data: { preferredNumbers?: string[]; autoRestoreEnabled?: boolean }) {
    try {
      const response = await apiEndpoints.updateAvailabilityPreferences(data);
      return response.data;
    } catch (error) {
      console.error('[availabilityService] Failed to update preferences:', error);
      return null;
    }
  },

  /**
   * Restore availability from saved preferences (call on app launch)
   */
  async restoreAvailability() {
    try {
      const response = await apiEndpoints.restoreAvailability();
      const data = response.data;
      if (data.restored && data.phoneNumbers) {
        state.isAvailable = true;
        state.activeNumbers = data.phoneNumbers;
        startHeartbeat();
        console.log('[availabilityService] Restored availability for:', data.phoneNumbers);
      }
      return data;
    } catch (error) {
      console.error('[availabilityService] Failed to restore availability:', error);
      return { restored: false, reason: 'error' };
    }
  },

  /**
   * Get current availability state
   */
  getState() {
    return {
      isAvailable: state.isAvailable,
      activeNumbers: [...state.activeNumbers],
      userId: state.userId,
      orgId: state.orgId,
    };
  },

  /**
   * Subscribe to availability changes. The callback fires on every isAvailable
   * transition; read the latest value via getState(). Returns an unsubscribe fn.
   */
  subscribe(listener: AvailabilityListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export default availabilityService;
