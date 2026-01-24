# TalkTool API Reference

## Overview

This document describes all API endpoints the Expo mobile app uses or should use to achieve feature parity with the Next.js web app. All endpoints are REST-based and require authentication via Clerk JWT tokens.

## Base Configuration

```typescript
// Base URL from environment
const baseURL = process.env.EXPO_PUBLIC_BACKEND_URL;

// All requests include Authorization header
headers: {
  'Authorization': `Bearer ${clerkToken}`,
  'Content-Type': 'application/json'
}
```

## Authentication

Authentication is handled by Clerk. The mobile app:
1. Authenticates users via Clerk SDK
2. Gets JWT token via `getToken()`
3. Includes token in all API requests

---

## Endpoints by Category

### User Endpoints

#### Get User Profile
```http
GET /api/user/profile
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "companyName": "Acme Inc",
    "defaultLanguage": "en",
    "phoneNumbers": ["+15551234567"],
    "timezone": "America/New_York",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Get Dashboard Data
```http
GET /api/user/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": {
      "minutes": 120,
      "seconds": 7200
    },
    "recentCalls": [...],
    "totalCalls": 45,
    "totalMinutes": 180,
    "plan": {
      "name": "Pro",
      "minutesIncluded": 500,
      "renewsAt": "2024-02-01T00:00:00Z"
    }
  }
}
```

#### Get Usage Statistics
```http
GET /api/user/usage
```

**Query Parameters:**
- `period`: `day` | `week` | `month` | `year`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCalls": 45,
    "totalMinutes": 180,
    "byLanguage": {
      "en-es": 60,
      "en-zh": 40
    },
    "byDay": [
      { "date": "2024-01-15", "minutes": 15 }
    ]
  }
}
```

---

### Call Endpoints

#### Get Call History
```http
GET /api/calls
```

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)
- `status`: `completed` | `missed` | `failed` | `voicemail`
- `direction`: `inbound` | `outbound`
- `startDate`: ISO date string
- `endDate`: ISO date string

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "call_123",
      "callSid": "CA123...",
      "from": "+15551234567",
      "to": "+15559876543",
      "fromLanguage": "en",
      "toLanguage": "es",
      "status": "completed",
      "direction": "outbound",
      "startedAt": "2024-01-15T10:30:00Z",
      "endedAt": "2024-01-15T10:35:00Z",
      "durationSeconds": 300,
      "hasTranscript": true,
      "hasRecording": true,
      "contact": {
        "firstName": "Maria",
        "lastName": "Garcia"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### Get Call Details
```http
GET /api/calls/detail/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "call_123",
    "callSid": "CA123...",
    "from": "+15551234567",
    "to": "+15559876543",
    "fromLanguage": "en",
    "toLanguage": "es",
    "status": "completed",
    "direction": "outbound",
    "startedAt": "2024-01-15T10:30:00Z",
    "endedAt": "2024-01-15T10:35:00Z",
    "durationSeconds": 300,
    "transcriptMessages": [
      {
        "id": "msg_1",
        "speaker": "rep",
        "originalText": "Hello, how can I help?",
        "translatedText": "Hola, ¿cómo puedo ayudar?",
        "timestamp": "2024-01-15T10:30:05Z"
      }
    ],
    "summary": {
      "text": "Customer inquired about product availability...",
      "keyPoints": ["Product inquiry", "Shipping question"],
      "actionItems": ["Send catalog"]
    },
    "recordingUrl": "https://...",
    "recordingDuration": 300
  }
}
```

#### Get Call Count
```http
GET /api/calls/count
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 45,
    "completed": 40,
    "missed": 3,
    "failed": 2
  }
}
```

#### End Call
```http
POST /api/end-call
```

**Request Body:**
```json
{
  "callSid": "CA123..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Call ended successfully"
}
```

---

### Transcription Endpoints

#### Get Call Transcripts
```http
GET /api/transcripts/:callSid
```

**Response:**
```json
{
  "success": true,
  "data": {
    "callSid": "CA123...",
    "messages": [
      {
        "id": "msg_1",
        "speaker": "rep",
        "originalText": "Hello",
        "translatedText": "Hola",
        "timestamp": "2024-01-15T10:30:05Z"
      }
    ]
  }
}
```

---

### Recording Endpoints

#### Get Recording URL
```http
GET /api/recordings/:callSid
```

**Response:**
```json
{
  "success": true,
  "data": {
    "callSid": "CA123...",
    "recordingUrl": "https://api.twilio.com/...",
    "duration": 300,
    "format": "mp3"
  }
}
```

---

### Contact Endpoints

#### List Contacts
```http
GET /api/contacts
```

**Query Parameters:**
- `page`: number
- `limit`: number
- `type`: `allowed` | `blocked` | `general`
- `search`: string

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "contact_123",
      "firstName": "Maria",
      "lastName": "Garcia",
      "phoneNumber": "+15559876543",
      "language": "es",
      "contactType": "allowed",
      "notes": "Preferred customer",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15
  }
}
```

#### Create Contact
```http
POST /api/contacts
```

**Request Body:**
```json
{
  "firstName": "Maria",
  "lastName": "Garcia",
  "phoneNumber": "+15559876543",
  "language": "es",
  "contactType": "allowed",
  "notes": "Preferred customer"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "contact_123",
    ...
  }
}
```

#### Update Contact
```http
PATCH /api/contacts/:id
```

**Request Body:**
```json
{
  "firstName": "Maria",
  "language": "pt"
}
```

#### Delete Contact
```http
DELETE /api/contacts/:id
```

---

### Phone Number Endpoints

#### List User Numbers
```http
GET /api/numberConfig/list
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "num_123",
      "number": "+15551234567",
      "name": "Main Line",
      "status": "active",
      "incomingPlan": {
        "language": "en",
        "greeting": "Hello, thank you for calling",
        "ivrEnabled": false
      },
      "isShared": false,
      "assignedTo": "user_123"
    }
  ]
}
```

#### Get Number Config
```http
GET /api/numberConfig/:id
```

#### Update Number Config
```http
PATCH /api/numberConfig/:id
```

**Request Body:**
```json
{
  "name": "Sales Line",
  "incomingPlan": {
    "language": "es",
    "greeting": "Gracias por llamar"
  }
}
```

---

### Voicemail Endpoints (To Implement)

#### List Voicemails
```http
GET /api/voicemails
```

**Query Parameters:**
- `page`: number
- `limit`: number
- `isRead`: boolean

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "vm_123",
      "callSid": "CA123...",
      "from": "+15559876543",
      "to": "+15551234567",
      "duration": 45,
      "recordingUrl": "https://...",
      "transcription": "Hi, this is Maria calling about...",
      "translatedText": "Hola, soy María llamando sobre...",
      "originalLanguage": "en",
      "isRead": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {...}
}
```

#### Get Voicemail
```http
GET /api/voicemails/:id
```

#### Update Voicemail (Mark Read)
```http
PATCH /api/voicemails/:id
```

**Request Body:**
```json
{
  "isRead": true
}
```

#### Delete Voicemail
```http
DELETE /api/voicemails/:id
```

---

### Organization Endpoints (To Implement)

#### List Organizations
```http
GET /api/organizations
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "org_123",
      "name": "Acme Inc",
      "ownerId": "user_123",
      "memberCount": 5,
      "balance": {
        "minutes": 500,
        "seconds": 30000
      },
      "role": "owner"
    }
  ]
}
```

#### Get Organization
```http
GET /api/organizations/:id
```

#### Create Organization
```http
POST /api/organizations
```

**Request Body:**
```json
{
  "name": "Acme Inc"
}
```

#### List Organization Members
```http
GET /api/organizations/:id/members
```

#### Invite Member
```http
POST /api/organizations/:id/invite
```

**Request Body:**
```json
{
  "email": "colleague@example.com",
  "role": "member"
}
```

#### Remove Member
```http
DELETE /api/organizations/:id/members/:userId
```

---

### Billing Endpoints (To Implement)

#### Get Plans
```http
GET /api/plans
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "plan_starter",
      "name": "Starter",
      "price": 19.99,
      "minutes": 100,
      "features": ["Voice calls", "Transcription"]
    },
    {
      "id": "plan_pro",
      "name": "Pro",
      "price": 49.99,
      "minutes": 500,
      "features": ["Voice calls", "Transcription", "API access"]
    }
  ]
}
```

#### Get Balance
```http
GET /api/balance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "minutes": 120,
    "seconds": 7200,
    "plan": "pro",
    "renewsAt": "2024-02-01T00:00:00Z"
  }
}
```

#### Create Checkout Session
```http
POST /api/payments/checkout
```

**Request Body:**
```json
{
  "planId": "plan_pro",
  "successUrl": "talktool://payment/success",
  "cancelUrl": "talktool://payment/cancel"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_123...",
    "url": "https://checkout.stripe.com/..."
  }
}
```

#### Get Payment History
```http
GET /api/payments/history
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pay_123",
      "amount": 49.99,
      "currency": "usd",
      "status": "succeeded",
      "description": "Pro Plan - 500 minutes",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### Access Token Endpoint

#### Get Twilio Access Token
```http
GET /api/accessToken
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "identity": "user_123",
    "expiresAt": "2024-01-15T11:30:00Z"
  }
}
```

---

### Availability Endpoint

#### Toggle Availability
```http
POST /api/availability
```

**Request Body:**
```json
{
  "available": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "available": true,
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## WebSocket Endpoints

### Real-time Transcription
```
WSS /call/display/:callSid
```

**Message Types:**

```typescript
// Incoming: Transcription
{
  "type": "transcript",
  "data": {
    "id": "msg_123",
    "speaker": "rep" | "customer",
    "originalText": "Hello",
    "translatedText": "Hola",
    "timestamp": "2024-01-15T10:30:05Z"
  }
}

// Incoming: Call End
{
  "type": "call_end",
  "data": {
    "callSid": "CA123...",
    "reason": "completed" | "failed"
  }
}

// Outgoing: Heartbeat
{
  "type": "ping"
}

// Incoming: Heartbeat Response
{
  "type": "pong"
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

**Common Error Codes:**
- `UNAUTHORIZED` (401): Invalid/expired token
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request data
- `RATE_LIMITED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

---

## Rate Limiting

- Default: 100 requests per minute per user
- Calls endpoint: 20 requests per minute
- Checkout: 5 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312200
```
