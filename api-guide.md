# TalkTool API PRD for Expo Mobile App

**Version:** 1.0  
**Last Updated:** January 2025  
**Base URL:** `https://api.talktool.ai` (production) | `http://localhost:3000` (development)

---

## Table of Contents

1. [Authentication](#authentication)
2. [User & Setup](#user--setup)
3. [Balance & Payments](#balance--payments)
4. [Phone Numbers](#phone-numbers)
5. [Calls](#calls)
6. [Contacts](#contacts)
7. [Availability (Agent Status)](#availability-agent-status)
8. [Mobile Call Configuration](#mobile-call-configuration)
9. [Recordings & Transcripts](#recordings--transcripts)
10. [IVR & Voice](#ivr--voice)
11. [Organization Management](#organization-management)
12. [Subscription Plans & Add-ons](#subscription-plans--add-ons)
13. [Introductions (Translations)](#introductions-translations)

---

## Authentication

All API requests require Clerk authentication. Include the Clerk session token in the `Authorization` header:

```
Authorization: Bearer <clerk_session_token>
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - User lacks permission for the resource

---

## User & Setup

### GET `/api/user/setup-status`

Returns the complete setup status for a user. Use this on app launch to determine onboarding state.

**Response:**
```json
{
  "setupComplete": true,
  "hasOrganization": true,
  "orgId": "org_xxxxx",
  "orgName": "User's Organization",
  "hasStartingBalance": true,
  "minutesRemaining": 20,
  "hasNumber": true,
  "assignedNumber": {
    "number": "+12132129530",
    "name": "User's Translator",
    "isShared": true
  }
}
```

**Use Case:** Check on app startup to route user to onboarding or main dashboard.

---

### POST `/api/user/fix-number`

Recovery endpoint to manually assign a shared number if user got stuck during signup.

**Response:**
```json
{
  "success": true,
  "message": "Shared number assigned successfully",
  "number": "+12132129530",
  "isShared": true,
  "numberConfigId": "648xxxxx",
  "alreadyExisted": false
}
```

---

## Balance & Payments

### GET `/api/payments/balance`

Get user's current minute balance and Stripe customer info.

**Response:**
```json
{
  "minutes": 45.5,
  "hours": 0.76,
  "stripeCustomerId": "cus_xxxxx",
  "creditBlockMinutes": 60,
  "unitAmount": 1500,
  "currency": "usd",
  "balanceType": "org",
  "orgId": "org_xxxxx",
  "minutesTransferred": 20
}
```

**Notes:**
- `balanceType`: `"org"` or `"user"` - indicates if balance is org-level or personal
- `minutesTransferred`: Only present if personal balance was auto-transferred to org

---

### POST `/api/payments/credits`

Create a Stripe checkout session to purchase minutes.

**Request:**
```json
{
  "quantity": 2
}
```

**Response:**
```json
{
  "sessionId": "cs_xxxxx",
  "url": "https://checkout.stripe.com/..."
}
```

**Use Case:** Open the `url` in a WebView or external browser for payment.

---

### POST `/api/payments/credits/confirm`

Confirm a completed checkout session and add minutes to balance.

**Request:**
```json
{
  "sessionId": "cs_xxxxx"
}
```

**Response:**
```json
{
  "minutes": 165.5,
  "minutesAdded": 120,
  "amount": 3000,
  "currency": "usd",
  "balanceType": "org",
  "alreadyProcessed": false
}
```

---

### GET `/api/payments/balance/transfer`

Check if user has personal balance that can be transferred to org.

**Response:**
```json
{
  "hasPersonalBalance": true,
  "personalMinutes": 20,
  "hasOrg": true,
  "orgId": "org_xxxxx",
  "canTransfer": true,
  "alreadyTransferred": false
}
```

---

### POST `/api/payments/balance/transfer`

Transfer personal balance to organization balance.

**Request:**
```json
{
  "confirm": true
}
```

**Response:**
```json
{
  "transferred": true,
  "minutesTransferred": 20,
  "fromUserId": "user_xxxxx",
  "toOrgId": "org_xxxxx",
  "newOrgBalance": 40
}
```

---

## Phone Numbers

### GET `/api/numberConfig`

Get all number configurations for the authenticated user/org.

**Response:**
```json
{
  "data": [
    {
      "_id": "648xxxxx",
      "name": "User's Translator",
      "number": "+12132129530",
      "status": "active",
      "twilioNumberId": "PNxxxxx",
      "clerkUserId": "user_xxxxx",
      "organizationId": "org_xxxxx",
      "isShared": true,
      "assignedUsers": ["user_xxxxx"],
      "incomingPlan": {
        "planType": "all-callers-select-language",
        "ivrLanguages": ["EN_US", "ES"],
        "ivrAudioUrl": "https://..."
      },
      "mainPhone": "+15551234567",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

### GET `/api/numberConfig/list`

Simplified list of numbers (lighter payload).

**Response:**
```json
{
  "numbers": [
    {
      "_id": "648xxxxx",
      "name": "User's Translator",
      "number": "+12132129530",
      "status": "active",
      "isShared": true,
      "mainPhone": "+15551234567",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

### GET `/api/numberConfig/[id]`

Get a specific number configuration by ID.

**Response:**
```json
{
  "_id": "648xxxxx",
  "name": "User's Translator",
  "number": "+12132129530",
  "status": "active",
  "incomingPlan": {...},
  "mainPhone": "+15551234567",
  "organizationId": "org_xxxxx",
  "assignedUsers": ["user_xxxxx"]
}
```

---

### PATCH `/api/numberConfig/[id]`

Update a number configuration.

**Request:**
```json
{
  "name": "My Translator",
  "mainPhone": "+15559876543",
  "assignedUsers": ["user_xxxxx", "user_yyyyy"]
}
```

**Allowed Fields:** `assignedUsers`, `clerkUserId`, `name`, `status`, `incomingPlan`, `mainPhone`

**Response:** Updated NumberConfig object

---

### POST `/api/numberConfig/[id]/incomingPlan`

Configure incoming call routing plan for a number.

**Request:**
```json
{
  "mainPhone": "+15551234567",
  "numberId": "648xxxxx",
  "plan": "all-callers-select-language",
  "mainLang": "EN_US",
  "ivrLanguages": ["EN_US", "ES", "ZH_CN"],
  "ivrAudioUrl": "https://blob.vercel-storage.com/ivr-xxx.mp3",
  "isActive": true,
  "voicemailGreeting": "Leave a message after the tone",
  "voicemailLang": "EN_US",
  "voicemailFallback": true,
  "browserFallbackMode": "phone-then-voicemail",
  "browserRingTimeout": 30
}
```

**Plan Types:**
- `all-callers-select-language` - IVR language selection
- `incoming-calls-forwarded-to-main` - Forward with translation
- `only-select-callers-select-language` - Allowlist-based

**Response:** Updated NumberConfig object

**Note:** Requires `incoming-calls` add-on or Business plan.

---

### GET `/api/phoneNumbers/new`

Search for available phone numbers to purchase.

**Query Parameters:**
- `areaCode` - 3-digit area code (US)
- `countryCode` - ISO country code (default: "US")
- `prefix` - Number prefix to search
- `contains` - Digits the number should contain

**Response:**
```json
[
  {
    "phoneNumber": "+15551234567",
    "friendlyName": "(555) 123-4567",
    "locality": "Los Angeles",
    "region": "CA",
    "capabilities": {
      "voice": true,
      "sms": true
    }
  }
]
```

---

### POST `/api/phoneNumbers/new`

Purchase a new dedicated phone number.

**Request:**
```json
{
  "phoneNumber": "+15551234567",
  "name": "My Business Line"
}
```

**Response:**
```json
{
  "number": {
    "_id": "648xxxxx",
    "number": "+15551234567",
    "name": "My Business Line",
    "status": "inactive"
  },
  "incomingPhoneNumber": {
    "sid": "PNxxxxx"
  }
}
```

**Note:** Requires available number slots (plan allowance + add-ons).

---

## Calls

### GET `/api/calls`

Get all calls for the user's accessible numbers with pagination.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 25, max: 100)

**Response:**
```json
{
  "calls": [
    {
      "_id": "648xxxxx",
      "callSid": "CAxxxxx",
      "from": "+15551234567",
      "to": "+12132129530",
      "status": "completed",
      "direction": "inbound",
      "durationSeconds": 180,
      "clerkUserId": "user_xxxxx",
      "organizationId": "org_xxxxx",
      "createdAt": "2025-01-15T14:30:00Z",
      "agent": {
        "_id": "648xxxxx",
        "name": "User's Translator",
        "number": "+12132129530"
      },
      "contact": {
        "_id": "648xxxxx",
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  ],
  "meta": {
    "total": 150,
    "totalPages": 6,
    "page": 1,
    "limit": 25,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### GET `/api/calls/[number]`

Get calls for a specific translator number.

**Path Parameters:**
- `number` - Phone number (e.g., `+12132129530`) or NumberConfig ID

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 25, max: 100)

**Response:** Same format as `/api/calls`

---

### GET `/api/calls/count`

Get total call count for all accessible numbers.

**Response:**
```json
42
```

---

### GET `/api/calls/detail/[callId]`

Get detailed information about a specific call.

**Path Parameters:**
- `callId` - Call SID or MongoDB ID

**Response:**
```json
{
  "call": {
    "_id": "648xxxxx",
    "callSid": "CAxxxxx",
    "from": "+15551234567",
    "to": "+12132129530",
    "status": "completed",
    "direction": "inbound",
    "durationSeconds": 180,
    "repLang": "EN_US",
    "customerLang": "ES",
    "agent": {...},
    "contact": {...},
    "createdAt": "2025-01-15T14:30:00Z"
  }
}
```

---

### POST `/api/calls/send-to-voicemail`

Send an incoming call to voicemail (used during ringing).

**Request:**
```json
{
  "parentCallSid": "CAxxxxx",
  "browserCallSid": "CAyyyyy"
}
```

**Response:**
```json
{
  "success": true
}
```

---

### POST `/api/end-call`

End an active call.

**Request:**
```json
{
  "callSid": "CAxxxxx"
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Contacts

### GET `/api/contacts`

List contacts with filtering and pagination.

**Query Parameters:**
- `type` - `"allowed"`, `"blocked"`, `"general"`, or `"all"`
- `numberConfigId` - Filter by specific number
- `scope` - `"all"`, `"user"`, or `"org"` (default: "user")
- `search` - Search by name/phone/email
- `organizationId` - Override org context
- `page` (default: 1)
- `limit` (default: 20, max: 100)

**Response:**
```json
{
  "contacts": [
    {
      "_id": "648xxxxx",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+15551234567",
      "email": "john@example.com",
      "language": "ES",
      "contactType": "general",
      "notes": "Customer from LA",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "totalPages": 3,
    "page": 1,
    "limit": 20,
    "hasNextPage": true,
    "hasPrevPage": false,
    "scope": "org",
    "userId": "user_xxxxx",
    "orgId": "org_xxxxx"
  }
}
```

---

### POST `/api/contacts`

Create a new contact.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+15551234567",
  "email": "john@example.com",
  "language": "ES",
  "contactType": "general",
  "notes": "New customer",
  "shareWithOrg": true,
  "numberConfig": "648xxxxx"
}
```

**Contact Types:**
- `general` - Regular contact
- `allowed` - Allowlisted for incoming calls
- `blocked` - Blocked caller

**Response:**
```json
{
  "contact": {...},
  "orgContact": {...}
}
```

---

### GET `/api/contacts/[id]`

Get a single contact.

**Response:**
```json
{
  "contact": {
    "_id": "648xxxxx",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+15551234567",
    ...
  }
}
```

---

### PATCH `/api/contacts/[id]`

Update a contact.

**Request:**
```json
{
  "firstName": "Johnny",
  "language": "EN_US"
}
```

**Response:**
```json
{
  "contact": {...}
}
```

---

### DELETE `/api/contacts/[id]`

Soft-delete a contact.

**Response:**
```json
{
  "success": true
}
```

---

### GET `/api/contacts/[id]/calls`

Get call history for a specific contact.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response:**
```json
{
  "contact": {...},
  "calls": [...],
  "stats": {
    "totalCalls": 15,
    "inboundCalls": 10,
    "outboundCalls": 5,
    "completedCalls": 14,
    "totalDuration": 3600,
    "lastCallDate": "2025-01-15T14:30:00Z"
  },
  "meta": {...}
}
```

---

## Availability (Agent Status)

### GET `/api/availability/status`

Get availability status for a phone number.

**Query Parameters:**
- `phoneNumber` - The translator number (required)
- `userId` - Specific user to check (default: current user)

**Response:**
```json
{
  "success": true,
  "phoneNumber": "+12132129530",
  "userId": "user_xxxxx",
  "userIsAvailable": true,
  "presence": {
    "status": "available",
    "deviceId": "device_xxxxx",
    "lastSeen": "2025-01-15T14:30:00Z"
  },
  "allAgents": [
    {
      "userId": "user_xxxxx",
      "status": "available"
    }
  ]
}
```

---

### POST `/api/availability/set-available`

Set agent as available for a single number.

**Request:**
```json
{
  "userId": "user_xxxxx",
  "orgId": "org_xxxxx",
  "phoneNumber": "+12132129530"
}
```

**Response:**
```json
{
  "success": true,
  "status": "available"
}
```

---

### POST `/api/availability/set-available-multi`

Set agent as available for multiple numbers.

**Request:**
```json
{
  "userId": "user_xxxxx",
  "orgId": "org_xxxxx",
  "phoneNumbers": ["+12132129530", "+15551234567"]
}
```

**Response:**
```json
{
  "success": true,
  "phoneNumbers": [...],
  "status": "available"
}
```

---

### POST `/api/availability/set-unavailable`

Set agent as unavailable for a single number.

**Request:**
```json
{
  "userId": "user_xxxxx",
  "orgId": "org_xxxxx",
  "phoneNumber": "+12132129530"
}
```

---

### POST `/api/availability/set-unavailable-all`

Set agent as unavailable for all numbers.

**Request:**
```json
{
  "userId": "user_xxxxx",
  "orgId": "org_xxxxx"
}
```

---

### POST `/api/availability/set-busy`

Set agent as busy (on a call).

**Request:**
```json
{
  "userId": "user_xxxxx",
  "orgId": "org_xxxxx",
  "phoneNumber": "+12132129530"
}
```

---

### POST `/api/availability/set-ringing`

Set agent as ringing (incoming call).

**Request:**
```json
{
  "userId": "user_xxxxx",
  "orgId": "org_xxxxx",
  "phoneNumber": "+12132129530"
}
```

---

### POST `/api/availability/heartbeat`

Send heartbeat to maintain availability status.

**Request:**
```json
{
  "userId": "user_xxxxx",
  "orgId": "org_xxxxx",
  "phoneNumber": "+12132129530",
  "deviceId": "device_xxxxx",
  "status": "available"
}
```

**Use Case:** Call every 30 seconds while app is active to maintain agent status.

---

### POST `/api/availability/heartbeat-multi`

Send heartbeat for multiple numbers.

**Request:**
```json
{
  "userId": "user_xxxxx",
  "orgId": "org_xxxxx",
  "phoneNumbers": ["+12132129530", "+15551234567"],
  "deviceId": "device_xxxxx",
  "status": "available"
}
```

---

### GET `/api/availability/preferences`

Get user's availability preferences for auto-restore.

**Response:**
```json
{
  "hasPreferences": true,
  "preferredNumbers": ["+12132129530"],
  "autoRestoreEnabled": true,
  "lastActiveAt": "2025-01-15T14:30:00Z"
}
```

---

### PUT `/api/availability/preferences`

Update availability preferences.

**Request:**
```json
{
  "preferredNumbers": ["+12132129530", "+15551234567"],
  "autoRestoreEnabled": true
}
```

---

### POST `/api/availability/restore`

Restore availability from saved preferences (call on app launch).

**Response:**
```json
{
  "restored": true,
  "phoneNumbers": ["+12132129530"],
  "restoredCount": 1
}
```

**Error Response:**
```json
{
  "restored": false,
  "reason": "no_valid_numbers"
}
```

---

## Mobile Call Configuration

### GET `/api/mobile-call-config`

Get recent mobile call configurations (saved call setups).

**Query Parameters:**
- `limit` (default: 10)

**Response:**
```json
{
  "configs": [
    {
      "_id": "648xxxxx",
      "repLang": "EN_US",
      "customerLang": "ES",
      "repLangLabel": "English (US)",
      "customerLangLabel": "Spanish",
      "repLangFlag": "🇺🇸",
      "customerLangFlag": "🇪🇸",
      "dialNumber": "+15551234567",
      "callerIdNumber": "+12132129530",
      "expectedFrom": "+15559876543",
      "translateInitially": true,
      "initialMessage": "Hola, ¿cómo puedo ayudarte?",
      "label": "Customer Support Call",
      "lastUsedAt": "2025-01-15T14:30:00Z",
      "usageCount": 5,
      "contactId": {
        "firstName": "John",
        "lastName": "Doe",
        "phoneNumber": "+15551234567"
      }
    }
  ]
}
```

---

### POST `/api/mobile-call-config`

Save a mobile call configuration.

**Request:**
```json
{
  "repLang": "EN_US",
  "customerLang": "ES",
  "dialNumber": "+15551234567",
  "callerIdNumber": "+12132129530",
  "expectedFrom": "+15559876543",
  "translateInitially": true,
  "initialMessage": "Hola, ¿cómo puedo ayudarte?",
  "initialMessageOriginal": "Hello, how can I help you?",
  "introductionId": "648xxxxx",
  "label": "Customer Support Call",
  "contactId": "648xxxxx"
}
```

**Response:**
```json
{
  "config": {...},
  "isNew": true,
  "message": "Configuration saved"
}
```

---

### GET `/api/mobile-call-config/active`

Check for active call configuration (pending call setup).

**Query Parameters:**
- `callerIdNumber` - Specific translator number to check

**Response:**
```json
{
  "hasActiveConfig": true,
  "config": {
    "dialNumber": "+15551234567",
    "repLang": "EN_US",
    "customerLang": "ES",
    "repLangLabel": "English (US)",
    "customerLangLabel": "Spanish",
    "repLangFlag": "🇺🇸",
    "customerLangFlag": "🇪🇸",
    "callerIdNumber": "+12132129530",
    "expectedFrom": "+15559876543",
    "translateInitially": true,
    "initialMessage": "Hola...",
    "configuredAt": 1705326600000
  },
  "ttlRemaining": 180,
  "expiresAt": "2025-01-15T14:35:00Z"
}
```

---

### DELETE `/api/mobile-call-config/active`

Clear an active call configuration.

**Query Parameters:**
- `callerIdNumber` - The translator number (required)

**Response:**
```json
{
  "cleared": true,
  "message": "Configuration cleared successfully"
}
```

---

## Recordings & Transcripts

### GET `/api/recordings/[callSid]`

Get a signed URL for a call recording.

**Response:**
```json
{
  "url": "https://signed-url...",
  "expiresIn": 3600,
  "callSid": "CAxxxxx"
}
```

**Note:** URL is temporary and expires. Requires org authorization.

---

### GET `/api/transcripts`

Get call transcripts/messages.

**Query Parameters:**
- `callSid` - The call SID (required)

**Response:**
```json
{
  "transcripts": [
    {
      "role": "rep",
      "original": "Hello, how can I help?",
      "translated": "Hola, ¿cómo puedo ayudar?",
      "timestamp": "2025-01-15T14:30:15Z"
    },
    {
      "role": "customer",
      "original": "Necesito ayuda con mi cuenta",
      "translated": "I need help with my account",
      "timestamp": "2025-01-15T14:30:25Z"
    }
  ]
}
```

---

## IVR & Voice

### POST `/api/ivr/generate-audio`

Generate IVR audio prompts for language selection.

**Request:**
```json
{
  "ivrLanguages": ["EN_US", "ES", "ZH_CN"],
  "numberId": "648xxxxx",
  "voice": "alloy"
}
```

**Response:**
```json
{
  "success": true,
  "script": "For English, press 1. Para español, presione 2. 中文请按3。",
  "audioUrl": "https://blob.vercel-storage.com/ivr-xxx.mp3",
  "filename": "ivr-648xxxxx-1705326600.mp3",
  "languages": [
    {
      "key": 1,
      "code": "EN_US",
      "label": "English (US)",
      "flag": "🇺🇸"
    },
    {
      "key": 2,
      "code": "ES",
      "label": "Spanish",
      "flag": "🇪🇸"
    }
  ]
}
```

---

### GET `/api/voice/test`

Get a voice sample (ElevenLabs).

**Query Parameters:**
- `voiceId` - The voice ID (required)
- `text` - Sample text (optional)

**Response:** Base64-encoded MP3 audio string

---

### GET `/api/voice/test/google`

Get a voice sample (Google TTS).

**Query Parameters:**
- `voiceId` - The Google voice ID (required)
- `text` - Sample text (optional)

**Response:** Base64-encoded MP3 audio string

---

## Organization Management

### GET `/api/org/members`

Get organization members.

**Response:**
```json
{
  "data": [
    {
      "id": "user_xxxxx",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "imageUrl": "https://...",
      "role": "org:admin"
    }
  ]
}
```

---

### POST `/api/org/invite`

Invite a new member to the organization.

**Request:**
```json
{
  "emailAddress": "newuser@example.com",
  "role": "org:member",
  "assignedNumberId": "648xxxxx"
}
```

**Roles:**
- `org:admin` - Full access
- `org:member` - Limited access

**Response:**
```json
{
  "success": true,
  "invitation": {
    "id": "inv_xxxxx",
    "emailAddress": "newuser@example.com",
    "role": "org:member",
    "status": "pending"
  }
}
```

---

## Subscription Plans & Add-ons

### GET `/api/plans`

Get available plans and current subscription status.

**Query Parameters:**
- `organizationId` - Override org context

**Response:**
```json
{
  "plans": [
    {
      "tier": "starter",
      "name": "Starter",
      "description": "For individuals getting started",
      "price": 0,
      "includedMinutes": 0,
      "features": {
        "hasIncomingCalls": false,
        "dedicatedNumbers": 0,
        "hasCallRouting": false
      },
      "highlights": ["Shared translator number", "Pay-as-you-go minutes"],
      "limitations": ["No incoming calls"]
    },
    {
      "tier": "business_inbound",
      "name": "Business Inbound",
      "description": "For businesses that receive calls",
      "price": 4900,
      "includedMinutes": 60,
      "features": {
        "hasIncomingCalls": true,
        "dedicatedNumbers": 1,
        "hasCallRouting": true,
        "hasIVR": true
      },
      "highlights": ["1 dedicated number", "60 minutes/month", "IVR support"]
    }
  ],
  "currentSubscription": {
    "planTier": "starter",
    "status": "active",
    "currentPeriodEnd": null,
    "cancelAtPeriodEnd": false
  },
  "planSummary": {
    "name": "Starter",
    "features": {...},
    "limits": {
      "totalDedicatedNumbers": 0
    }
  },
  "numberUsage": {
    "total": 1,
    "dedicated": 0,
    "shared": 1,
    "maxDedicated": 0,
    "canAddDedicated": false
  },
  "additionalNumberPrice": 1500
}
```

---

### POST `/api/plans`

Subscribe to a plan or upgrade.

**Request:**
```json
{
  "planTier": "business_inbound",
  "organizationId": "org_xxxxx",
  "successUrl": "https://app.talktool.ai/dashboard/plans?success=true",
  "cancelUrl": "https://app.talktool.ai/dashboard/plans?canceled=true"
}
```

**Response (new subscription):**
```json
{
  "type": "checkout",
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_xxxxx"
}
```

**Response (existing subscription - upgrade/downgrade):**
```json
{
  "type": "portal",
  "url": "https://billing.stripe.com/...",
  "message": "Redirecting to billing portal to manage your subscription"
}
```

**Response (downgrade to starter):**
```json
{
  "success": true,
  "message": "Downgraded to Starter plan",
  "subscription": {...}
}
```

---

### DELETE `/api/plans`

Cancel subscription (reverts to starter at period end).

**Query Parameters:**
- `organizationId` - Override org context

**Response:**
```json
{
  "success": true,
  "message": "Subscription will cancel at end of billing period",
  "cancelAt": "2025-02-15T00:00:00Z"
}
```

---

### GET `/api/addons`

Get add-ons and feature summary.

**Query Parameters:**
- `organizationId` - Override org context

**Response:**
```json
{
  "addons": [
    {
      "_id": "648xxxxx",
      "addonType": "incoming-calls",
      "status": "active",
      "quantity": 1,
      "currentPeriodEnd": "2025-02-15T00:00:00Z"
    }
  ],
  "summary": {
    "planTier": "starter",
    "planName": "Starter",
    "hasIncomingCalls": true,
    "hasIncomingCallsViaPlan": false,
    "hasIncomingCallsAddon": true,
    "hasCallRouting": false,
    "hasIVR": false,
    "planDedicatedNumbers": 0,
    "additionalNumbersCount": 1,
    "totalDedicatedNumbers": 1,
    "dedicatedNumberCount": 0,
    "numberConfigCount": 1,
    "canAddMoreNumbers": true,
    "numbersNeeded": 0
  }
}
```

---

### POST `/api/addons`

Subscribe to an add-on.

**Request:**
```json
{
  "addonType": "incoming-calls",
  "quantity": 1,
  "organizationId": "org_xxxxx",
  "successUrl": "https://...",
  "cancelUrl": "https://..."
}
```

**Add-on Types:**
- `incoming-calls` - Enable incoming call handling ($40/month)
- `additional-number` - Additional dedicated phone number ($15/month)

**Response:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_xxxxx"
}
```

---

### DELETE `/api/addons`

Cancel an add-on subscription.

**Query Parameters:**
- `id` - Add-on ID (required)
- `organizationId` - Override org context

**Response:**
```json
{
  "success": true,
  "addon": {...}
}
```

---

## Introductions (Translations)

### POST `/api/introduction`

Translate and save an introduction message.

**Request:**
```json
{
  "message": "Hello, I'm calling about your recent inquiry",
  "lang": "ES",
  "sourceLang": "EN_US",
  "save": true
}
```

**Response:**
```json
{
  "text": "Hola, estoy llamando sobre su consulta reciente",
  "originalMessage": "Hello, I'm calling about your recent inquiry",
  "introductionId": "648xxxxx"
}
```

---

### GET `/api/introduction`

Get user's recent introduction messages.

**Query Parameters:**
- `limit` (default: 10)
- `targetLang` - Filter by target language

**Response:**
```json
{
  "introductions": [
    {
      "_id": "648xxxxx",
      "originalMessage": "Hello, I'm calling...",
      "translatedMessage": "Hola, estoy llamando...",
      "sourceLang": "EN_US",
      "targetLang": "ES",
      "usageCount": 5,
      "lastUsedAt": "2025-01-15T14:30:00Z"
    }
  ]
}
```

---

## Access Token

### POST `/api/accessToken`

Generate a Twilio access token for client-side calling.

**Request:**
```json
{
  "identity": "user_xxxxx"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ..."
}
```

**Use Case:** Required for initializing Twilio Voice SDK on mobile.

---

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "error": "Error message",
  "details": "Additional context (optional)",
  "code": "ERROR_CODE (optional)"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable (e.g., no shared numbers available)

---

## Language Codes

Supported language codes for translations:

| Code | Language | Flag |
|------|----------|------|
| EN_US | English (US) | 🇺🇸 |
| EN_GB | English (UK) | 🇬🇧 |
| ES | Spanish | 🇪🇸 |
| ES_US | Spanish (US) | 🇲🇽 |
| FR | French | 🇫🇷 |
| FR_CA | French (Canada) | 🇨🇦 |
| DE | German | 🇩🇪 |
| PT | Portuguese | 🇵🇹 |
| PT_BR | Portuguese (Brazil) | 🇧🇷 |
| ZH_CN | Chinese (Simplified) | 🇨🇳 |
| ZH_TW | Chinese (Traditional) | 🇹🇼 |
| ZH_HK | Cantonese | 🇭🇰 |
| JA | Japanese | 🇯🇵 |
| KO | Korean | 🇰🇷 |
| AR | Arabic | 🇸🇦 |
| RU | Russian | 🇷🇺 |
| HI | Hindi | 🇮🇳 |
| VI | Vietnamese | 🇻🇳 |
| TL | Filipino/Tagalog | 🇵🇭 |
| TH | Thai | 🇹🇭 |
| IT | Italian | 🇮🇹 |
| NL | Dutch | 🇳🇱 |
| PL | Polish | 🇵🇱 |
| TR | Turkish | 🇹🇷 |
| UK | Ukrainian | 🇺🇦 |

---

## Rate Limits

- API requests: 100 requests/minute per user
- Balance consume (internal): No limit
- Stripe webhooks: Handled asynchronously

---

## WebSocket Events (Future)

For real-time updates, consider implementing WebSocket connections for:
- Call status updates
- Agent availability changes
- Incoming call notifications
- Balance updates

---

## Mobile-Specific Considerations

### App Startup Flow

1. Call `GET /api/user/setup-status` to check onboarding state
2. If `setupComplete: false`, show onboarding UI
3. If `hasNumber: false`, call `POST /api/user/fix-number`
4. Call `POST /api/availability/restore` to restore agent status
5. Start heartbeat timer (every 30s) with `POST /api/availability/heartbeat-multi`

### Making Outbound Calls

1. Get Twilio token: `POST /api/accessToken`
2. Save call config: `POST /api/mobile-call-config`
3. Initialize Twilio SDK with token
4. Make call through Twilio SDK

### Handling Incoming Calls (Browser Agent Mode)

1. Register device with availability system
2. Listen for Twilio push notifications
3. On incoming call, update status to "ringing"
4. Accept/reject call through Twilio SDK
5. On call end, restore "available" status

### Background Mode

- Keep heartbeat running in background (if possible)
- Use push notifications for incoming calls
- Restore availability on app foreground