# TalkTool Bug Audit

## Overview

This document catalogs known issues, potential bugs, and areas requiring improvement in the TalkTool mobile app. Issues are categorized by severity and area, with proposed fixes for each.

---

## Issue Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| **Critical** | App crashes or core feature broken | Fix immediately |
| **High** | Major feature degraded | Fix in current sprint |
| **Medium** | Minor feature issues | Fix in next sprint |
| **Low** | Polish/UX improvements | Backlog |

---

## Call Flow Issues

### CF-001: WebSocket Connection Drops During Active Call

**Severity:** Critical
**Status:** Known Issue

**Description:**
WebSocket connection to transcription service may drop during long calls or when network conditions change, causing loss of real-time transcription.

**Root Cause:**
- Exponential backoff reconnection may exceed max attempts during brief network fluctuations
- App backgrounding doesn't properly pause/resume WebSocket
- No explicit ping/pong heartbeat verification

**Current Implementation:**
```typescript
// src/hooks/useDisplaySocket.ts
// Reconnect attempts: 5 max with exponential backoff
// Heartbeat: 30s interval, but no pong verification
```

**Proposed Fix:**
1. Increase max reconnection attempts for active calls
2. Implement proper pong verification
3. Add connection state recovery on app foreground
4. Buffer transcriptions locally during brief disconnections

```typescript
// Enhanced reconnection logic
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY = 1000;

// Verify pong response
let lastPongTime = Date.now();
ws.onmessage = (event) => {
  if (event.data.type === 'pong') {
    lastPongTime = Date.now();
  }
};

// Check for missed pongs
setInterval(() => {
  if (Date.now() - lastPongTime > 60000) {
    reconnect();
  }
}, 30000);
```

---

### CF-002: Call State Not Updating Properly

**Severity:** High
**Status:** Known Issue

**Description:**
Call status in UI sometimes shows incorrect state (e.g., "connecting" when call is active, or "active" after call ends).

**Root Cause:**
- Race conditions between Twilio SDK events and state updates
- Multiple event handlers may fire in unexpected order
- State updates not atomic

**Current Implementation:**
```typescript
// VoiceContext - multiple event handlers update state independently
call.on('connected', () => updateStatus('active'));
call.on('disconnected', () => updateStatus('ended'));
```

**Proposed Fix:**
1. Implement state machine for call status transitions
2. Add validation for state transitions
3. Debounce rapid state changes
4. Add state transition logging for debugging

```typescript
// State machine approach
const VALID_TRANSITIONS = {
  idle: ['connecting'],
  connecting: ['ringing', 'active', 'ended'],
  ringing: ['active', 'ended'],
  active: ['reconnecting', 'ended'],
  reconnecting: ['active', 'ended'],
  ended: ['idle']
};

const updateCallStatus = (newStatus) => {
  const currentStatus = getState().status;
  if (VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
    setState({ status: newStatus });
  } else {
    console.warn(`Invalid transition: ${currentStatus} -> ${newStatus}`);
  }
};
```

---

### CF-003: Call Initiation Failures Not Properly Handled

**Severity:** High
**Status:** Known Issue

**Description:**
When call fails to connect (network error, invalid number, insufficient balance), user may be stuck on connecting screen or see generic error.

**Root Cause:**
- Error handling in VoiceContext doesn't cover all failure modes
- Access token fetch failure not distinct from call failure
- No timeout for stuck "connecting" state

**Proposed Fix:**
1. Add explicit timeout for connecting state (30 seconds)
2. Catch and categorize all error types
3. Show specific error messages to user
4. Auto-navigate back to new call screen on failure

```typescript
// Add connection timeout
useEffect(() => {
  if (status === 'connecting') {
    const timeout = setTimeout(() => {
      handleError('Connection timeout. Please try again.');
      resetCallState();
      navigation.goBack();
    }, 30000);
    return () => clearTimeout(timeout);
  }
}, [status]);
```

---

### CF-004: Incoming Call Handling Gaps

**Severity:** High
**Status:** Known Issue

**Description:**
Incoming calls may not be properly detected or displayed when app is in background or killed state.

**Root Cause:**
- Push notification handling incomplete
- Twilio registration may expire
- App state transitions not properly handling incoming calls

**Proposed Fix:**
1. Implement proper VoIP push notifications (iOS)
2. Re-register Twilio on app foreground
3. Add persistent notification channel (Android)
4. Handle call invite even when app was killed

---

### CF-005: End Call Not Cleaning Up State

**Severity:** Medium
**Status:** Known Issue

**Description:**
After call ends, some state may persist (transcriptions, call info), causing issues on next call or incorrect display.

**Root Cause:**
- `resetCallState` not called in all end scenarios
- WebSocket cleanup may fail silently
- Zustand state not fully reset

**Proposed Fix:**
1. Add comprehensive cleanup function
2. Call cleanup in all end paths (user end, remote end, error)
3. Add state verification after cleanup

```typescript
const cleanupCall = () => {
  // Close WebSocket
  closeDisplaySocket();

  // Reset call store
  callStore.resetCallState();

  // Clear any timers
  clearAllCallTimers();

  // Verify cleanup
  if (callStore.activeCall !== null) {
    console.error('Call state not properly reset');
    callStore.setActiveCall(null);
  }
};
```

---

## UI/UX Issues

### UI-001: Loading State Inconsistencies

**Severity:** Medium
**Status:** Known Issue

**Description:**
Loading states are inconsistent across screens - some show spinners, some show nothing, some show skeletons.

**Root Cause:**
- No standardized loading pattern
- React Query `isLoading` vs `isFetching` confusion
- Missing loading states for some operations

**Proposed Fix:**
1. Create standardized `LoadingState` component
2. Use consistent pattern: initial load = skeleton, refetch = subtle indicator
3. Audit all screens for loading coverage

```typescript
// Standardized loading pattern
const LoadingState = ({ isInitialLoading, isFetching, children }) => {
  if (isInitialLoading) return <SkeletonLoader />;
  return (
    <>
      {isFetching && <RefreshIndicator />}
      {children}
    </>
  );
};
```

---

### UI-002: Error Messages Not User-Friendly

**Severity:** Medium
**Status:** Known Issue

**Description:**
Error messages often show technical details or generic "Something went wrong" instead of actionable messages.

**Root Cause:**
- Backend errors passed directly to UI
- No error message mapping
- Missing context-specific error handling

**Current Examples:**
- "Network Error" instead of "Unable to connect. Check your internet connection."
- "401 Unauthorized" instead of "Your session expired. Please sign in again."

**Proposed Fix:**
1. Create error message mapping
2. Add context to error handling
3. Provide actionable suggestions

```typescript
const ERROR_MESSAGES = {
  NETWORK_ERROR: {
    title: 'Connection Problem',
    message: 'Unable to connect to the server. Please check your internet connection.',
    action: 'Try Again'
  },
  AUTH_EXPIRED: {
    title: 'Session Expired',
    message: 'Your session has expired. Please sign in again.',
    action: 'Sign In'
  },
  INSUFFICIENT_BALANCE: {
    title: 'Low Balance',
    message: 'You don\'t have enough minutes for this call.',
    action: 'Add Minutes'
  }
};
```

---

### UI-003: Navigation Flow Issues

**Severity:** Medium
**Status:** Known Issue

**Description:**
Navigation can get into unexpected states, especially around call flows and deep linking.

**Specific Issues:**
- Back button during active call can navigate away unexpectedly
- Deep link to call detail when not authenticated
- Tab state not preserved when returning from call

**Proposed Fix:**
1. Block back navigation during active call
2. Add auth guard for deep links
3. Preserve tab state in navigation state

```typescript
// Block back during call
useEffect(() => {
  if (isCallActive) {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      Alert.alert(
        'Active Call',
        'You must end the call before navigating away.',
        [{ text: 'OK' }]
      );
    });
    return unsubscribe;
  }
}, [isCallActive]);
```

---

### UI-004: Theme/Styling Inconsistencies

**Severity:** Low
**Status:** Known Issue

**Description:**
Visual styling doesn't fully match Next.js web app. Colors, spacing, and typography have minor differences.

**Specific Issues:**
- Button colors slightly different
- Card shadows not matching
- Font weights inconsistent
- Spacing not using design system consistently

**Proposed Fix:**
1. Audit web app design tokens
2. Update `src/theme/` to match exactly
3. Create visual regression tests

---

### UI-005: Missing Feedback on Actions

**Severity:** Low
**Status:** Known Issue

**Description:**
Some actions don't provide immediate feedback (loading, success, error states).

**Specific Issues:**
- Contact save - no success toast
- Settings change - no confirmation
- Call end - no confirmation before ending

**Proposed Fix:**
1. Add toast notifications for CRUD operations
2. Add confirmation dialogs for destructive actions
3. Show inline success/error states

---

### UI-006: Accessibility Gaps

**Severity:** Low
**Status:** Known Issue

**Description:**
App has accessibility issues that affect screen reader users and users with motor impairments.

**Specific Issues:**
- Missing accessibility labels on icons
- Touch targets too small in some places
- Color contrast issues in some states
- No keyboard navigation support

**Proposed Fix:**
1. Add `accessibilityLabel` to all interactive elements
2. Ensure minimum 44pt touch targets
3. Audit color contrast ratios
4. Test with VoiceOver and TalkBack

---

## API Integration Issues

### API-001: Authentication Token Refresh Issues

**Severity:** High
**Status:** Known Issue

**Description:**
Token refresh doesn't always work correctly, causing 401 errors that aren't recovered gracefully.

**Root Cause:**
- Clerk token may expire during long sessions
- Concurrent requests during refresh can fail
- Token getter function may return stale token

**Proposed Fix:**
1. Implement token refresh interceptor
2. Queue requests during token refresh
3. Force re-authentication on persistent 401

```typescript
// Token refresh interceptor
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await getToken({ skipCache: true });
      if (newToken) {
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api.request(error.config);
      }
    }
    return Promise.reject(error);
  }
);
```

---

### API-002: Response Parsing Errors

**Severity:** Medium
**Status:** Known Issue

**Description:**
Some API responses aren't parsed correctly, causing undefined values or crashes.

**Root Cause:**
- Backend response format changes not reflected in mobile
- Optional fields accessed without null checks
- Type mismatches between expected and actual response

**Proposed Fix:**
1. Add runtime response validation
2. Add defensive null checks
3. Log response parsing errors for debugging

```typescript
// Response validation
const parseCallResponse = (response) => {
  if (!response?.data) {
    throw new Error('Invalid call response: missing data');
  }
  return {
    ...response.data,
    duration: response.data.durationSeconds ?? 0,
    transcriptions: response.data.transcriptMessages ?? []
  };
};
```

---

### API-003: Pagination Not Working Correctly

**Severity:** Medium
**Status:** Known Issue

**Description:**
Infinite scroll pagination sometimes skips pages, duplicates items, or stops working.

**Root Cause:**
- React Query infinite query cursor handling
- Backend pagination may return inconsistent results
- Optimistic updates interfere with pagination

**Proposed Fix:**
1. Use cursor-based pagination instead of page numbers
2. Deduplicate results client-side
3. Disable optimistic updates for paginated queries

---

### API-004: Cache Invalidation Issues

**Severity:** Medium
**Status:** Known Issue

**Description:**
Data doesn't update after mutations - stale data shown until manual refresh.

**Specific Issues:**
- Call history not updated after call ends
- Contact list not updated after edit
- Balance not updated after call

**Proposed Fix:**
1. Add proper query invalidation after mutations
2. Implement optimistic updates where appropriate
3. Add pull-to-refresh as fallback

```typescript
// Invalidate queries after call ends
const endCall = async () => {
  await apiEndCall();
  queryClient.invalidateQueries(['calls']);
  queryClient.invalidateQueries(['user', 'dashboard']);
  queryClient.invalidateQueries(['user', 'balance']);
};
```

---

### API-005: Error Handling Gaps

**Severity:** Medium
**Status:** Known Issue

**Description:**
Not all API errors are caught and handled, leading to unhandled promise rejections or silent failures.

**Proposed Fix:**
1. Add global error boundary
2. Wrap all service calls in try-catch
3. Log errors to monitoring service

---

## Performance Issues

### PERF-001: Excessive Re-renders

**Severity:** Medium
**Status:** Known Issue

**Description:**
Some screens re-render excessively, causing performance issues on lower-end devices.

**Root Cause:**
- Zustand selectors not optimized
- Inline callbacks in render
- Missing React.memo on list items

**Proposed Fix:**
1. Use shallow equality in Zustand selectors
2. Memoize callbacks with useCallback
3. Add React.memo to list item components

---

### PERF-002: Large Bundle Size

**Severity:** Low
**Status:** Known Issue

**Description:**
App bundle is larger than necessary, affecting download and startup time.

**Proposed Fix:**
1. Audit dependencies for unused packages
2. Use dynamic imports for screens
3. Optimize images and assets

---

## Security Issues

### SEC-001: Sensitive Data in Logs

**Severity:** Medium
**Status:** Potential Issue

**Description:**
Console logs may contain sensitive information in production builds.

**Proposed Fix:**
1. Remove all console.log in production
2. Use structured logging with redaction
3. Audit for sensitive data exposure

---

## Bug Fix Priority Matrix

| Priority | Issue ID | Title | Effort |
|----------|----------|-------|--------|
| 1 | CF-001 | WebSocket Connection Drops | Medium |
| 2 | CF-002 | Call State Not Updating | Medium |
| 3 | CF-003 | Call Initiation Failures | Low |
| 4 | API-001 | Token Refresh Issues | Low |
| 5 | CF-004 | Incoming Call Handling | High |
| 6 | CF-005 | End Call Cleanup | Low |
| 7 | API-004 | Cache Invalidation | Low |
| 8 | UI-001 | Loading State Inconsistencies | Medium |
| 9 | UI-002 | Error Messages | Medium |
| 10 | UI-003 | Navigation Flow Issues | Medium |

---

## Testing Recommendations

### Unit Tests Needed
- Call state machine transitions
- Error message mapping
- Response parsing functions
- Zustand store actions

### Integration Tests Needed
- Full call flow (initiate → connect → transcribe → end)
- Authentication flow (login → token refresh → logout)
- Pagination through call history

### E2E Tests Needed
- Make outbound call
- Receive incoming call
- View and interact with call history
- Manage contacts

---

## Monitoring Recommendations

1. **Error Tracking**: Implement Sentry or similar for crash reporting
2. **Performance Monitoring**: Track API response times
3. **Analytics**: Track feature usage and drop-off points
4. **WebSocket Health**: Monitor connection stability metrics
