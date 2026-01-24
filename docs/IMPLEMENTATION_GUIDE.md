# TalkTool Implementation Guide

## Overview

This guide provides step-by-step implementation instructions for achieving feature parity between the TalkTool Expo mobile app and the Next.js web app. Follow the priorities in order for optimal development flow.

---

## Implementation Priorities

| Priority | Focus Area | Description |
|----------|------------|-------------|
| **1** | Bug Fixes & Stability | Fix critical call flow and API issues |
| **2** | UI/UX Alignment | Match web app styling and behavior |
| **3** | Core Missing Features | DTMF, recordings, summaries, voicemail |
| **4** | Business Features | Billing, minutes, organization support |
| **5** | User Experience | Onboarding, polish, accessibility |

---

## Priority 1: Bug Fixes & Stability

### 1.1 Fix WebSocket Reliability

**Files to modify:**
- `src/hooks/useDisplaySocket.ts`

**Implementation Steps:**

1. **Enhance reconnection logic:**
```typescript
// useDisplaySocket.ts - Updated reconnection
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

const getReconnectDelay = (attempt: number) => {
  return RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
};

const reconnect = useCallback(() => {
  if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
    setSocketError('Connection lost. Please check your network.');
    return;
  }

  const delay = getReconnectDelay(reconnectAttempts.current);
  setTimeout(() => {
    reconnectAttempts.current++;
    connect();
  }, delay);
}, [connect]);
```

2. **Add pong verification:**
```typescript
let lastPongTime = useRef(Date.now());

// In message handler
if (data.type === 'pong') {
  lastPongTime.current = Date.now();
  return;
}

// Verify pongs in heartbeat interval
const heartbeatInterval = setInterval(() => {
  if (Date.now() - lastPongTime.current > 60000) {
    console.warn('Pong timeout, reconnecting...');
    ws.close();
    reconnect();
  } else {
    ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 30000);
```

3. **Handle app state changes:**
```typescript
useEffect(() => {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active' && callSid && !isSocketConnected) {
      // Reconnect when app comes to foreground
      connect();
    } else if (state === 'background') {
      // Keep connection but reduce heartbeat frequency
    }
  });
  return () => subscription?.remove();
}, [callSid, isSocketConnected]);
```

---

### 1.2 Fix Call State Management

**Files to modify:**
- `src/contexts/VoiceContext.tsx`
- `src/store/callStore.ts`

**Implementation Steps:**

1. **Implement state machine in callStore:**
```typescript
// src/store/callStore.ts
type CallStatus = 'idle' | 'connecting' | 'ringing' | 'active' | 'reconnecting' | 'ended';

const VALID_TRANSITIONS: Record<CallStatus, CallStatus[]> = {
  idle: ['connecting'],
  connecting: ['ringing', 'active', 'ended'],
  ringing: ['active', 'ended'],
  active: ['reconnecting', 'ended'],
  reconnecting: ['active', 'ended'],
  ended: ['idle']
};

interface CallStore {
  // ... existing fields
  transitionStatus: (newStatus: CallStatus) => boolean;
}

export const useCallStore = create<CallStore>((set, get) => ({
  // ... existing state

  transitionStatus: (newStatus) => {
    const currentStatus = get().activeCall?.status || 'idle';
    const validTransitions = VALID_TRANSITIONS[currentStatus];

    if (!validTransitions?.includes(newStatus)) {
      console.warn(`Invalid state transition: ${currentStatus} -> ${newStatus}`);
      return false;
    }

    set((state) => ({
      activeCall: state.activeCall
        ? { ...state.activeCall, status: newStatus }
        : null
    }));
    return true;
  }
}));
```

2. **Update VoiceContext to use state machine:**
```typescript
// VoiceContext.tsx
const handleCallConnected = () => {
  callStore.transitionStatus('active');
  startCallTimer();
};

const handleCallDisconnected = () => {
  if (callStore.transitionStatus('ended')) {
    cleanupCall();
  }
};
```

---

### 1.3 Improve Error Handling

**Files to create/modify:**
- `src/utils/errors.ts` (new)
- `src/services/api.ts`
- Various screens

**Implementation Steps:**

1. **Create error utilities:**
```typescript
// src/utils/errors.ts
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INVALID_NUMBER: 'INVALID_NUMBER',
  CALL_FAILED: 'CALL_FAILED',
  UNKNOWN: 'UNKNOWN'
} as const;

export const ERROR_MESSAGES: Record<string, ErrorMessage> = {
  NETWORK_ERROR: {
    title: 'Connection Problem',
    message: 'Unable to connect. Please check your internet connection.',
    action: 'Try Again'
  },
  AUTH_EXPIRED: {
    title: 'Session Expired',
    message: 'Please sign in again to continue.',
    action: 'Sign In'
  },
  INSUFFICIENT_BALANCE: {
    title: 'Low Balance',
    message: 'You need more minutes to make this call.',
    action: 'Add Minutes'
  },
  INVALID_NUMBER: {
    title: 'Invalid Number',
    message: 'Please enter a valid phone number.',
    action: 'Edit Number'
  },
  CALL_FAILED: {
    title: 'Call Failed',
    message: 'Unable to connect the call. Please try again.',
    action: 'Retry'
  }
};

export const getErrorMessage = (error: any): ErrorMessage => {
  if (error.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }
  if (error.message?.includes('Network')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  if (error.response?.status === 401) {
    return ERROR_MESSAGES.AUTH_EXPIRED;
  }
  return {
    title: 'Error',
    message: 'Something went wrong. Please try again.',
    action: 'OK'
  };
};
```

2. **Add token refresh interceptor:**
```typescript
// src/services/api.ts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await tokenGetter?.({ skipCache: true });
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Token refresh failed, redirect to login
        return Promise.reject({ code: 'AUTH_EXPIRED' });
      }
    }

    return Promise.reject(error);
  }
);
```

---

### 1.4 Add Connection Timeout

**Files to modify:**
- `src/contexts/VoiceContext.tsx`

```typescript
// Add timeout for connecting state
const CALL_CONNECTION_TIMEOUT = 30000; // 30 seconds

useEffect(() => {
  if (callState === 'connecting') {
    const timeout = setTimeout(() => {
      if (callState === 'connecting') {
        handleCallError({ code: 'CALL_FAILED', message: 'Connection timeout' });
        resetCallState();
      }
    }, CALL_CONNECTION_TIMEOUT);

    return () => clearTimeout(timeout);
  }
}, [callState]);
```

---

### 1.5 Fix Cache Invalidation

**Files to modify:**
- `src/hooks/useCalls.ts`
- `src/contexts/VoiceContext.tsx`

```typescript
// After call ends, invalidate relevant queries
const queryClient = useQueryClient();

const onCallEnded = useCallback(() => {
  // Invalidate all call-related queries
  queryClient.invalidateQueries({ queryKey: ['calls'] });
  queryClient.invalidateQueries({ queryKey: ['user', 'dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['user', 'balance'] });
}, [queryClient]);
```

---

## Priority 2: UI/UX Alignment

### 2.1 Standardize Loading States

**Files to create:**
- `src/components/ui/LoadingState.tsx`

```typescript
// src/components/ui/LoadingState.tsx
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';

interface LoadingStateProps {
  isInitialLoading: boolean;
  isFetching?: boolean;
  skeleton?: React.ReactNode;
  children: React.ReactNode;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isInitialLoading,
  isFetching,
  skeleton,
  children
}) => {
  if (isInitialLoading) {
    return skeleton || <DefaultSkeleton />;
  }

  return (
    <View style={styles.container}>
      {isFetching && (
        <View style={styles.fetchingIndicator}>
          <ActivityIndicator size="small" />
        </View>
      )}
      {children}
    </View>
  );
};
```

### 2.2 Add Toast Notifications

**Files to create:**
- `src/components/ui/Toast.tsx`
- `src/contexts/ToastContext.tsx`

```typescript
// src/contexts/ToastContext.tsx
import { createContext, useContext, useState, useCallback } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextType {
  showToast: (type: Toast['type'], message: string) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
```

### 2.3 Update Theme to Match Web

**Files to modify:**
- `src/theme/colors.ts`
- `src/theme/typography.ts`
- `src/theme/spacing.ts`

```typescript
// src/theme/colors.ts - Align with web app
export const colors = {
  // Primary palette
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
  },
  // Semantic colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  // Neutrals
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    500: '#6B7280',
    700: '#374151',
    900: '#111827',
  }
};
```

---

## Priority 3: Core Missing Features

### 3.1 DTMF Keypad

**Files to create:**
- `src/components/call/DTMFKeypad.tsx`

**Files to modify:**
- `src/contexts/VoiceContext.tsx`
- `app/call/[id].tsx`

```typescript
// src/components/call/DTMFKeypad.tsx
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

const DTMF_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#']
];

interface DTMFKeypadProps {
  onPress: (digit: string) => void;
  onClose: () => void;
}

export const DTMFKeypad: React.FC<DTMFKeypadProps> = ({ onPress, onClose }) => {
  const handlePress = (digit: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(digit);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Keypad</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>Done</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.keypad}>
        {DTMF_KEYS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((digit) => (
              <TouchableOpacity
                key={digit}
                style={styles.key}
                onPress={() => handlePress(digit)}
              >
                <Text style={styles.keyText}>{digit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};
```

```typescript
// VoiceContext.tsx - Add sendDigits method
const sendDigits = useCallback((digits: string) => {
  if (activeCall?.callRef) {
    activeCall.callRef.sendDigits(digits);
  }
}, [activeCall]);
```

### 3.2 Recording Playback

**Files to create:**
- `src/components/call/RecordingPlayer.tsx`

**Files to modify:**
- `app/(tabs)/calls.tsx` (call detail)

```typescript
// src/components/call/RecordingPlayer.tsx
import { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';

interface RecordingPlayerProps {
  recordingUrl: string;
  duration: number;
}

export const RecordingPlayer: React.FC<RecordingPlayerProps> = ({
  recordingUrl,
  duration
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadAndPlay = async () => {
    try {
      setIsLoading(true);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordingUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error loading recording:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: Audio.PlaybackStatus) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis / 1000);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setPosition(0);
      }
    }
  };

  const togglePlay = async () => {
    if (!sound) {
      await loadAndPlay();
    } else if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={togglePlay} disabled={isLoading}>
        <Text>{isLoading ? '...' : isPlaying ? '⏸' : '▶️'}</Text>
      </TouchableOpacity>
      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: `${(position / duration) * 100}%` }]} />
      </View>
      <Text>{formatDuration(position)} / {formatDuration(duration)}</Text>
    </View>
  );
};
```

### 3.3 Call Summary Display

**Files to create:**
- `src/components/call/CallSummary.tsx`

```typescript
// src/components/call/CallSummary.tsx
import { View, Text, StyleSheet } from 'react-native';

interface CallSummaryProps {
  summary: {
    text: string;
    keyPoints: string[];
    actionItems: string[];
  };
}

export const CallSummary: React.FC<CallSummaryProps> = ({ summary }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Summary</Text>
      <Text style={styles.text}>{summary.text}</Text>

      {summary.keyPoints.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Points</Text>
          {summary.keyPoints.map((point, index) => (
            <View key={index} style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{point}</Text>
            </View>
          ))}
        </View>
      )}

      {summary.actionItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Action Items</Text>
          {summary.actionItems.map((item, index) => (
            <View key={index} style={styles.bulletItem}>
              <Text style={styles.checkbox}>☐</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
```

### 3.4 Voicemail Feature

**Files to create:**
- `src/services/voicemail.service.ts`
- `src/hooks/useVoicemails.ts`
- `src/components/voicemail/VoicemailList.tsx`
- `src/components/voicemail/VoicemailPlayer.tsx`
- `app/(tabs)/voicemail.tsx`

**Implementation outline:**

1. **Create voicemail service:**
```typescript
// src/services/voicemail.service.ts
import api from './api';

export const voicemailService = {
  getVoicemails: async (params: { page?: number; limit?: number }) => {
    const response = await api.get('/voicemails', { params });
    return response.data;
  },

  getVoicemail: async (id: string) => {
    const response = await api.get(`/voicemails/${id}`);
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await api.patch(`/voicemails/${id}`, { isRead: true });
    return response.data;
  },

  deleteVoicemail: async (id: string) => {
    await api.delete(`/voicemails/${id}`);
  }
};
```

2. **Create voicemail hook:**
```typescript
// src/hooks/useVoicemails.ts
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { voicemailService } from '../services/voicemail.service';

export const useVoicemails = () => {
  return useInfiniteQuery({
    queryKey: ['voicemails'],
    queryFn: ({ pageParam = 1 }) => voicemailService.getVoicemails({ page: pageParam }),
    getNextPageParam: (lastPage) => lastPage.pagination.hasNextPage
      ? lastPage.pagination.page + 1
      : undefined,
  });
};

export const useMarkVoicemailRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: voicemailService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voicemails'] });
    }
  });
};
```

---

## Priority 4: Business Features

### 4.1 Billing/Plans Screen

**Files to create:**
- `src/services/billing.service.ts`
- `src/hooks/useBilling.ts`
- `app/(tabs)/plans.tsx`
- `src/components/billing/PlanCard.tsx`
- `src/components/billing/PackageCard.tsx`

**Key Implementation:**

```typescript
// src/services/billing.service.ts
import api from './api';
import * as Linking from 'expo-linking';

export const billingService = {
  getPlans: async () => {
    const response = await api.get('/plans');
    return response.data;
  },

  getBalance: async () => {
    const response = await api.get('/balance');
    return response.data;
  },

  createCheckout: async (planId: string) => {
    const successUrl = Linking.createURL('payment/success');
    const cancelUrl = Linking.createURL('payment/cancel');

    const response = await api.post('/payments/checkout', {
      planId,
      successUrl,
      cancelUrl
    });
    return response.data;
  },

  getPaymentHistory: async () => {
    const response = await api.get('/payments/history');
    return response.data;
  }
};
```

### 4.2 Phone Numbers Management

**Files to create:**
- `src/services/numbers.service.ts`
- `src/hooks/useNumbers.ts`
- `app/(tabs)/numbers.tsx`
- `src/components/numbers/NumberCard.tsx`
- `src/components/numbers/NumberConfigModal.tsx`

### 4.3 Organization Support

**Files to create:**
- `src/services/org.service.ts`
- `src/store/orgStore.ts`
- `src/hooks/useOrganization.ts`
- `app/organization/index.tsx`
- `app/organization/members.tsx`

---

## Priority 5: User Experience

### 5.1 Onboarding Flow

**Files to create:**
- `app/onboarding/_layout.tsx`
- `app/onboarding/welcome.tsx`
- `app/onboarding/language.tsx`
- `app/onboarding/permissions.tsx`
- `app/onboarding/complete.tsx`
- `src/hooks/useOnboarding.ts`

```typescript
// src/hooks/useOnboarding.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const ONBOARDING_KEY = '@talktool:onboarding_complete';

export const useOnboarding = () => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    setHasCompletedOnboarding(value === 'true');
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setHasCompletedOnboarding(true);
  };

  return { hasCompletedOnboarding, completeOnboarding };
};
```

### 5.2 Accessibility Improvements

**Checklist:**
- [ ] Add `accessibilityLabel` to all buttons and icons
- [ ] Ensure 44pt minimum touch targets
- [ ] Add `accessibilityRole` where appropriate
- [ ] Test with VoiceOver (iOS) and TalkBack (Android)
- [ ] Ensure sufficient color contrast
- [ ] Add `accessibilityHint` for complex actions

---

## Testing Strategy

### Unit Tests

```typescript
// Example: Call state machine tests
describe('CallStore', () => {
  it('should allow valid state transitions', () => {
    const store = useCallStore.getState();
    store.setActiveCall({ status: 'idle' });

    expect(store.transitionStatus('connecting')).toBe(true);
    expect(store.transitionStatus('active')).toBe(true);
    expect(store.transitionStatus('ended')).toBe(true);
  });

  it('should reject invalid state transitions', () => {
    const store = useCallStore.getState();
    store.setActiveCall({ status: 'idle' });

    expect(store.transitionStatus('active')).toBe(false);
    expect(store.transitionStatus('ended')).toBe(false);
  });
});
```

### Integration Tests

```typescript
// Example: Call flow integration test
describe('Call Flow', () => {
  it('should complete full call flow', async () => {
    // 1. Start call
    // 2. Verify connecting state
    // 3. Verify active state
    // 4. Verify transcriptions received
    // 5. End call
    // 6. Verify cleanup
  });
});
```

---

## Deployment Checklist

Before each release:

- [ ] All tests passing
- [ ] No console errors/warnings in production
- [ ] Performance profiling complete
- [ ] Accessibility audit passed
- [ ] Security review complete
- [ ] Feature flags configured
- [ ] Analytics events verified
- [ ] Error tracking configured
- [ ] App Store metadata updated
- [ ] Screenshots updated
- [ ] Release notes written
