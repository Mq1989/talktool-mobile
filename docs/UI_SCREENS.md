# TalkTool UI Screens Specification

## Overview

This document provides screen-by-screen specifications for the TalkTool mobile app, including current implementation status and requirements for feature parity with the Next.js web app.

---

## Screen Inventory

### Current Screens

| Screen | Route | Status | Notes |
|--------|-------|--------|-------|
| Auth Redirect | `/` | ✅ | Routes to auth or tabs |
| Login | `/(auth)/login` | ✅ | Email + OAuth |
| Register | `/(auth)/register` | ✅ | With verification |
| Forgot Password | `/(auth)/forgot-password` | ✅ | Email reset |
| Dashboard | `/(tabs)/index` | ✅ | Home screen |
| Call History | `/(tabs)/calls` | ✅ | With pagination |
| Contacts | `/(tabs)/contacts` | ✅ | CRUD operations |
| Settings | `/(tabs)/settings` | ✅ | Preferences |
| New Call | `/call/new` | ✅ | Initiate call |
| Incoming Call | `/call/incoming` | ✅ | Accept/reject |
| Active Call | `/call/[id]` | ✅ | During call |

### Screens to Add

| Screen | Route | Priority | Notes |
|--------|-------|----------|-------|
| My Numbers | `/(tabs)/numbers` | High | Phone management |
| Plans/Billing | `/(tabs)/plans` | High | Minutes + payments |
| Voicemail | `/(tabs)/voicemail` | Medium | Inbox |
| Organization | `/organization` | Medium | Team management |
| Onboarding | `/onboarding/*` | Low | First-time setup |

---

## Authentication Screens

### Login Screen

**Route:** `/(auth)/login`
**Status:** ✅ Implemented

**Layout:**
```
┌─────────────────────────────────────┐
│                                     │
│           TalkTool Logo             │
│                                     │
│     ┌─────────────────────────┐     │
│     │ Email                   │     │
│     └─────────────────────────┘     │
│     ┌─────────────────────────┐     │
│     │ Password          👁    │     │
│     └─────────────────────────┘     │
│                                     │
│     ┌─────────────────────────┐     │
│     │       Sign In           │     │
│     └─────────────────────────┘     │
│                                     │
│        Forgot password?             │
│                                     │
│     ─────── or continue with ────── │
│                                     │
│     [Google]      [Apple]           │
│                                     │
│     Don't have an account? Sign up  │
│                                     │
└─────────────────────────────────────┘
```

**Functionality:**
- Email/password login via Clerk
- OAuth with Google and Apple
- Password visibility toggle
- Navigate to forgot password
- Navigate to register
- Error messages for invalid credentials
- Loading state during auth

**Components:**
- `Input` - Email and password fields
- `Button` - Sign in button
- `OAuthButton` - Social login buttons

---

### Register Screen

**Route:** `/(auth)/register`
**Status:** ✅ Implemented

**Layout:**
```
┌─────────────────────────────────────┐
│                                     │
│        Create Account               │
│                                     │
│     ┌─────────────────────────┐     │
│     │ First Name              │     │
│     └─────────────────────────┘     │
│     ┌─────────────────────────┐     │
│     │ Last Name               │     │
│     └─────────────────────────┘     │
│     ┌─────────────────────────┐     │
│     │ Email                   │     │
│     └─────────────────────────┘     │
│     ┌─────────────────────────┐     │
│     │ Password          👁    │     │
│     └─────────────────────────┘     │
│                                     │
│     ┌─────────────────────────┐     │
│     │       Create Account    │     │
│     └─────────────────────────┘     │
│                                     │
│     Already have an account? Login  │
│                                     │
└─────────────────────────────────────┘
```

**After Submit (Email Verification):**
```
┌─────────────────────────────────────┐
│                                     │
│        Verify Your Email            │
│                                     │
│     We sent a code to:              │
│     user@example.com                │
│                                     │
│     ┌─────────────────────────┐     │
│     │ Enter verification code │     │
│     └─────────────────────────┘     │
│                                     │
│     ┌─────────────────────────┐     │
│     │       Verify            │     │
│     └─────────────────────────┘     │
│                                     │
│     Didn't receive? Resend code     │
│                                     │
└─────────────────────────────────────┘
```

---

## Main Tab Screens

### Dashboard (Home)

**Route:** `/(tabs)/index`
**Status:** ✅ Implemented

**Layout:**
```
┌─────────────────────────────────────┐
│  Hello, John                    ⚙️  │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Minutes Balance             │    │
│  │                             │    │
│  │     120 minutes             │    │
│  │     ━━━━━━━━━━━━━░░░░░      │    │
│  │     120 / 500 used          │    │
│  │                             │    │
│  │  [Buy More Minutes]         │    │
│  └─────────────────────────────┘    │
│                                     │
│  Quick Actions                      │
│  ┌───────────┐  ┌───────────┐       │
│  │  📞 New   │  │  📇 Add   │       │
│  │   Call    │  │  Contact  │       │
│  └───────────┘  └───────────┘       │
│                                     │
│  Recent Calls                       │
│  ┌─────────────────────────────┐    │
│  │ 📞 Maria Garcia  ↗ 5 min    │    │
│  │    Spanish • 2 hours ago    │    │
│  ├─────────────────────────────┤    │
│  │ 📞 Unknown     ↙ missed     │    │
│  │    Chinese • Yesterday      │    │
│  └─────────────────────────────┘    │
│                                     │
│  [View All Calls →]                 │
│                                     │
├─────────────────────────────────────┤
│  🏠 Home  📞 Calls  👥 Contacts ⚙️  │
└─────────────────────────────────────┘
```

**Data Required:**
- User profile (name, balance)
- Recent calls (last 5)
- Plan information

**Actions:**
- New call → `/call/new`
- Add contact → modal
- View call → call detail modal
- View all calls → `/(tabs)/calls`
- Buy minutes → `/(tabs)/plans` (to implement)

---

### Call History

**Route:** `/(tabs)/calls`
**Status:** ✅ Implemented

**Layout:**
```
┌─────────────────────────────────────┐
│  Call History                   🔍  │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ All  Missed  Voicemail      │    │
│  └─────────────────────────────┘    │
│                                     │
│  Today                              │
│  ┌─────────────────────────────┐    │
│  │ 👤 Maria Garcia        5:32 │    │
│  │ ↗ Outbound • Spanish        │    │
│  │ 10:30 AM                    │    │
│  ├─────────────────────────────┤    │
│  │ 👤 +1 555 987 6543     2:15 │    │
│  │ ↙ Inbound • Chinese         │    │
│  │ 9:15 AM                     │    │
│  └─────────────────────────────┘    │
│                                     │
│  Yesterday                          │
│  ┌─────────────────────────────┐    │
│  │ 👤 Unknown            missed│    │
│  │ ↙ Inbound • Hindi           │    │
│  │ 3:45 PM                     │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Load More...]                     │
│                                     │
├─────────────────────────────────────┤
│  🏠 Home  📞 Calls  👥 Contacts ⚙️  │
└─────────────────────────────────────┘
```

**Call Detail Modal:**
```
┌─────────────────────────────────────┐
│  ← Call Details                     │
├─────────────────────────────────────┤
│                                     │
│         👤 Maria Garcia             │
│         +1 555 987 6543             │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Direction    Outbound       │    │
│  │ Duration     5:32           │    │
│  │ Languages    EN → ES        │    │
│  │ Date         Jan 15, 10:30  │    │
│  │ Status       Completed      │    │
│  └─────────────────────────────┘    │
│                                     │
│  Transcript                         │
│  ┌─────────────────────────────┐    │
│  │ You: Hello, how are you?    │    │
│  │ Them: Hola, estoy bien.     │    │
│  │ ...                         │    │
│  └─────────────────────────────┘    │
│                                     │
│  Summary (AI)          [TO ADD]     │
│  ┌─────────────────────────────┐    │
│  │ Customer inquired about...  │    │
│  └─────────────────────────────┘    │
│                                     │
│  Recording                 [TO ADD] │
│  ┌─────────────────────────────┐    │
│  │ ▶️ ━━━━━━━━━░░░░░░░ 5:32    │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Call Back]                        │
│                                     │
└─────────────────────────────────────┘
```

**Features to Add:**
- Recording playback (audio player)
- Call summary section
- Voicemail tab filter

---

### Contacts

**Route:** `/(tabs)/contacts`
**Status:** ✅ Implemented

**Layout:**
```
┌─────────────────────────────────────┐
│  Contacts                     🔍  + │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ All  Allowed  Blocked       │    │
│  └─────────────────────────────┘    │
│                                     │
│  A                                  │
│  ┌─────────────────────────────┐    │
│  │ 👤 Ana Rodriguez            │    │
│  │    +1 555 111 2222 • Spanish│    │
│  └─────────────────────────────┘    │
│                                     │
│  M                                  │
│  ┌─────────────────────────────┐    │
│  │ 👤 Maria Garcia             │    │
│  │    +1 555 987 6543 • Spanish│    │
│  ├─────────────────────────────┤    │
│  │ 👤 Mike Chen                │    │
│  │    +1 555 333 4444 • Chinese│    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  🏠 Home  📞 Calls  👥 Contacts ⚙️  │
└─────────────────────────────────────┘
```

**Add/Edit Contact Modal:**
```
┌─────────────────────────────────────┐
│  × Add Contact                      │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │ First Name                  │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Last Name                   │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Phone Number                │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Language           Spanish ▼│    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Type               Allowed ▼│    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Notes (optional)            │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │       Save Contact          │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

### Settings

**Route:** `/(tabs)/settings`
**Status:** ✅ Implemented

**Layout:**
```
┌─────────────────────────────────────┐
│  Settings                           │
├─────────────────────────────────────┤
│                                     │
│  Account                            │
│  ┌─────────────────────────────┐    │
│  │ 👤 John Doe                 │    │
│  │    john@example.com         │    │
│  │    Pro Plan • 120 min left  │    │
│  └─────────────────────────────┘    │
│                                     │
│  Preferences                        │
│  ┌─────────────────────────────┐    │
│  │ Default Language   English ▼│    │
│  ├─────────────────────────────┤    │
│  │ Speaker Mode          ○──●  │    │
│  ├─────────────────────────────┤    │
│  │ Haptic Feedback       ●──○  │    │
│  ├─────────────────────────────┤    │
│  │ Theme              System ▼ │    │
│  └─────────────────────────────┘    │
│                                     │
│  App                                │
│  ┌─────────────────────────────┐    │
│  │ My Numbers              →   │  [TO ADD]
│  ├─────────────────────────────┤    │
│  │ Billing & Plans         →   │  [TO ADD]
│  ├─────────────────────────────┤    │
│  │ Organization            →   │  [TO ADD]
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │       Sign Out              │    │
│  └─────────────────────────────┘    │
│                                     │
│  Version 1.0.0                      │
│                                     │
├─────────────────────────────────────┤
│  🏠 Home  📞 Calls  👥 Contacts ⚙️  │
└─────────────────────────────────────┘
```

---

## Call Screens

### New Call

**Route:** `/call/new`
**Status:** ✅ Implemented

**Layout:**
```
┌─────────────────────────────────────┐
│  ← New Call                         │
├─────────────────────────────────────┤
│                                     │
│  Your Language                      │
│  ┌─────────────────────────────┐    │
│  │ 🇺🇸 English              ▼  │    │
│  └─────────────────────────────┘    │
│                                     │
│  Their Language                     │
│  ┌─────────────────────────────┐    │
│  │ 🇪🇸 Spanish              ▼  │    │
│  └─────────────────────────────┘    │
│                                     │
│  Phone Number                       │
│  ┌─────────────────────────────┐    │
│  │ +1 555 987 6543             │    │
│  └─────────────────────────────┘    │
│  Or select from contacts:           │
│  ┌─────────────────────────────┐    │
│  │ Maria Garcia • Spanish      │    │
│  │ Mike Chen • Chinese         │    │
│  └─────────────────────────────┘    │
│                                     │
│  Caller ID                          │
│  ┌─────────────────────────────┐    │
│  │ +1 555 123 4567 (Main)   ▼  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │         📞 Call             │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

### Active Call

**Route:** `/call/[id]`
**Status:** ✅ Implemented (needs DTMF)

**Layout:**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│         👤 Maria Garcia             │
│         +1 555 987 6543             │
│                                     │
│         🟢 Connected                │
│            05:32                    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │ You: Hello, how can I help? │    │
│  │                             │    │
│  │ Them: Hola, necesito        │    │
│  │ información sobre...        │    │
│  │                             │    │
│  │ You: Sure, let me check...  │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│                                     │
│    ┌───┐    ┌───┐    ┌───┐         │
│    │🔇│    │🔊│    │⌨️│  [TO ADD]  │
│    │Mute   │Speaker │Keypad│        │
│    └───┘    └───┘    └───┘         │
│                                     │
│         ┌─────────────┐             │
│         │   📞 End    │             │
│         └─────────────┘             │
│                                     │
└─────────────────────────────────────┘
```

**DTMF Keypad (to add):**
```
┌─────────────────────────────────────┐
│         Keypad                   ×  │
├─────────────────────────────────────┤
│                                     │
│       ┌───┐  ┌───┐  ┌───┐          │
│       │ 1 │  │ 2 │  │ 3 │          │
│       └───┘  └───┘  └───┘          │
│       ┌───┐  ┌───┐  ┌───┐          │
│       │ 4 │  │ 5 │  │ 6 │          │
│       └───┘  └───┘  └───┘          │
│       ┌───┐  ┌───┐  ┌───┐          │
│       │ 7 │  │ 8 │  │ 9 │          │
│       └───┘  └───┘  └───┘          │
│       ┌───┐  ┌───┐  ┌───┐          │
│       │ * │  │ 0 │  │ # │          │
│       └───┘  └───┘  └───┘          │
│                                     │
└─────────────────────────────────────┘
```

---

### Incoming Call

**Route:** `/call/incoming`
**Status:** ✅ Implemented

**Layout:**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                                     │
│                                     │
│         📞 Incoming Call            │
│                                     │
│         👤 +1 555 987 6543          │
│            or Contact Name          │
│                                     │
│         Language: Spanish           │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│      ┌─────────┐   ┌─────────┐      │
│      │ Decline │   │ Accept  │      │
│      │   🔴    │   │   🟢    │      │
│      └─────────┘   └─────────┘      │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

---

## Screens to Implement

### My Numbers

**Route:** `/(tabs)/numbers`
**Status:** ❌ Not Implemented

**Layout:**
```
┌─────────────────────────────────────┐
│  My Numbers                      +  │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Main Line                   │    │
│  │ +1 555 123 4567             │    │
│  │ 🟢 Active                   │    │
│  │ Incoming: English           │    │
│  │ [Configure]                 │    │
│  ├─────────────────────────────┤    │
│  │ Sales Line                  │    │
│  │ +1 555 234 5678             │    │
│  │ 🟢 Active • Shared          │    │
│  │ Incoming: Spanish           │    │
│  │ [Configure]                 │    │
│  └─────────────────────────────┘    │
│                                     │
│  [+ Get New Number]                 │
│                                     │
├─────────────────────────────────────┤
│  🏠 Home  📞 Calls  👥 Contacts ⚙️  │
└─────────────────────────────────────┘
```

**Number Config Modal:**
```
┌─────────────────────────────────────┐
│  × Configure Number                 │
├─────────────────────────────────────┤
│                                     │
│  Name                               │
│  ┌─────────────────────────────┐    │
│  │ Main Line                   │    │
│  └─────────────────────────────┘    │
│                                     │
│  Incoming Call Language             │
│  ┌─────────────────────────────┐    │
│  │ 🇺🇸 English              ▼  │    │
│  └─────────────────────────────┘    │
│                                     │
│  Voicemail                          │
│  ┌─────────────────────────────┐    │
│  │ Enable voicemail      ●──○  │    │
│  └─────────────────────────────┘    │
│                                     │
│  Custom Greeting                    │
│  ┌─────────────────────────────┐    │
│  │ Thank you for calling...    │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │       Save Changes          │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

### Plans & Billing

**Route:** `/(tabs)/plans`
**Status:** ❌ Not Implemented

**Layout:**
```
┌─────────────────────────────────────┐
│  Plans & Billing                    │
├─────────────────────────────────────┤
│                                     │
│  Current Balance                    │
│  ┌─────────────────────────────┐    │
│  │      120 minutes            │    │
│  │      ━━━━━━━━━━━░░░░░       │    │
│  │      120 / 500 remaining    │    │
│  │                             │    │
│  │  Pro Plan • Renews Feb 1    │    │
│  └─────────────────────────────┘    │
│                                     │
│  Buy More Minutes                   │
│  ┌─────────────────────────────┐    │
│  │ 100 min     $9.99           │    │
│  │ $0.10/min             [Buy] │    │
│  ├─────────────────────────────┤    │
│  │ 500 min     $39.99          │    │
│  │ $0.08/min    POPULAR  [Buy] │    │
│  ├─────────────────────────────┤    │
│  │ 1000 min    $69.99          │    │
│  │ $0.07/min             [Buy] │    │
│  └─────────────────────────────┘    │
│                                     │
│  Auto-Reload                        │
│  ┌─────────────────────────────┐    │
│  │ Enable auto-reload    ○──●  │    │
│  │ When balance below: 50 min  │    │
│  │ Reload: 500 minutes         │    │
│  └─────────────────────────────┘    │
│                                     │
│  Payment History                    │
│  ┌─────────────────────────────┐    │
│  │ Jan 1   Pro Plan    $49.99  │    │
│  │ Dec 15  500 min     $39.99  │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  🏠 Home  📞 Calls  👥 Contacts ⚙️  │
└─────────────────────────────────────┘
```

---

### Voicemail

**Route:** `/(tabs)/voicemail` or filter in calls
**Status:** ❌ Not Implemented

**Layout:**
```
┌─────────────────────────────────────┐
│  Voicemail                       🔍 │
├─────────────────────────────────────┤
│                                     │
│  New (2)                            │
│  ┌─────────────────────────────┐    │
│  │ 🔵 +1 555 987 6543    0:45  │    │
│  │    Spanish • Today 10:30 AM │    │
│  │    "Hola, soy María..."     │    │
│  ├─────────────────────────────┤    │
│  │ 🔵 Unknown            1:23  │    │
│  │    Chinese • Today 9:15 AM  │    │
│  │    "您好，我想问一下..."     │    │
│  └─────────────────────────────┘    │
│                                     │
│  Earlier                            │
│  ┌─────────────────────────────┐    │
│  │    +1 555 111 2222    0:30  │    │
│  │    French • Yesterday       │    │
│  │    "Bonjour, je..."         │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  🏠 Home  📞 Calls  👥 Contacts ⚙️  │
└─────────────────────────────────────┘
```

**Voicemail Detail:**
```
┌─────────────────────────────────────┐
│  ← Voicemail                    🗑  │
├─────────────────────────────────────┤
│                                     │
│         👤 +1 555 987 6543          │
│         Today, 10:30 AM             │
│         Duration: 0:45              │
│                                     │
│  Original (Spanish)                 │
│  ┌─────────────────────────────┐    │
│  │ "Hola, soy María llamando   │    │
│  │  para preguntar sobre el    │    │
│  │  producto que vi ayer..."   │    │
│  └─────────────────────────────┘    │
│                                     │
│  Translation (English)              │
│  ┌─────────────────────────────┐    │
│  │ "Hello, this is María       │    │
│  │  calling to ask about the   │    │
│  │  product I saw yesterday..."│    │
│  └─────────────────────────────┘    │
│                                     │
│  Audio                              │
│  ┌─────────────────────────────┐    │
│  │ ▶️ ━━━━━━━━━░░░░░░░  0:45   │    │
│  │    🔊 Speak Translation     │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Call Back]                        │
│                                     │
└─────────────────────────────────────┘
```

---

### Onboarding

**Route:** `/onboarding/*`
**Status:** ❌ Not Implemented

**Flow: 4 screens**

**Step 1 - Welcome:**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│           TalkTool Logo             │
│                                     │
│      Welcome to TalkTool            │
│                                     │
│   Make phone calls in any language  │
│   with real-time translation        │
│                                     │
│                                     │
│         ○ ○ ○ ○                     │
│                                     │
│     ┌─────────────────────────┐     │
│     │       Get Started       │     │
│     └─────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

**Step 2 - Select Language:**
```
┌─────────────────────────────────────┐
│                                     │
│     What's your primary language?   │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🇺🇸 English              ✓  │    │
│  ├─────────────────────────────┤    │
│  │ 🇪🇸 Spanish                 │    │
│  ├─────────────────────────────┤    │
│  │ 🇨🇳 Chinese                 │    │
│  ├─────────────────────────────┤    │
│  │ 🇫🇷 French                  │    │
│  ├─────────────────────────────┤    │
│  │ ...more languages           │    │
│  └─────────────────────────────┘    │
│                                     │
│         ● ○ ○ ○                     │
│                                     │
│     ┌─────────────────────────┐     │
│     │       Continue          │     │
│     └─────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

**Step 3 - Permissions:**
```
┌─────────────────────────────────────┐
│                                     │
│          🎤 Microphone              │
│                                     │
│   TalkTool needs access to your     │
│   microphone to make phone calls.   │
│                                     │
│                                     │
│     ┌─────────────────────────┐     │
│     │   Allow Microphone      │     │
│     └─────────────────────────┘     │
│                                     │
│          🔔 Notifications           │
│                                     │
│   Get notified about incoming       │
│   calls and voicemails.             │
│                                     │
│     ┌─────────────────────────┐     │
│     │   Allow Notifications   │     │
│     └─────────────────────────┘     │
│                                     │
│         ● ● ○ ○                     │
│                                     │
│     ┌─────────────────────────┐     │
│     │       Continue          │     │
│     └─────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

**Step 4 - Complete:**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│              ✅                     │
│                                     │
│        You're all set!              │
│                                     │
│   Start making translated calls     │
│   in 48+ languages.                 │
│                                     │
│                                     │
│         ● ● ● ●                     │
│                                     │
│     ┌─────────────────────────┐     │
│     │    Start Calling        │     │
│     └─────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

---

## Component Requirements

### New Components Needed

| Component | Location | Purpose |
|-----------|----------|---------|
| DTMFKeypad | `src/components/call/` | In-call keypad |
| RecordingPlayer | `src/components/call/` | Audio playback |
| CallSummary | `src/components/call/` | AI summary display |
| VoicemailList | `src/components/voicemail/` | Voicemail inbox |
| VoicemailPlayer | `src/components/voicemail/` | VM playback + TTS |
| NumberCard | `src/components/numbers/` | Number display |
| NumberConfig | `src/components/numbers/` | Config modal |
| PlanCard | `src/components/billing/` | Plan display |
| PackageCard | `src/components/billing/` | Minutes package |
| PaymentHistory | `src/components/billing/` | Transaction list |
| OnboardingStep | `src/components/onboarding/` | Step container |
| LanguagePicker | `src/components/onboarding/` | Language grid |
