# TalkTool Mobile Changelog

All notable changes to the TalkTool mobile app will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned Features
- DTMF keypad for IVR navigation
- Recording playback in call details
- AI call summaries display
- Voicemail inbox and playback
- Phone number management screen
- Billing and plans screen
- Organization/team support
- Onboarding flow for new users
- Minutes purchasing via Stripe

### Planned Bug Fixes
- WebSocket reconnection reliability (CF-001)
- Call state management improvements (CF-002)
- Better error handling and messages (CF-003, UI-002)
- Token refresh reliability (API-001)
- Cache invalidation fixes (API-004)

---

## [1.0.0] - 2024-XX-XX

### Added
- Initial release of TalkTool mobile app
- User authentication via Clerk (email, OAuth)
- Outbound voice calls with real-time translation
- Incoming call support
- Real-time transcription display via WebSocket
- Call history with pagination
- Contact management (create, edit, delete)
- Dashboard with usage statistics
- Settings screen with preferences
- Support for 48 languages
- Mute and speaker controls during calls
- Haptic feedback on interactions
- Dark mode support

### Technical
- Expo SDK 54 with TypeScript
- Expo Router for navigation
- Twilio Voice React Native SDK
- TanStack React Query for data fetching
- Zustand for state management
- Axios for API communication

---

## Implementation Progress Tracker

### Phase 1: Bug Fixes & Stability

| Task | Status | PR | Notes |
|------|--------|-----|-------|
| Fix WebSocket reconnection | ⬜ Pending | - | See CF-001 |
| Implement call state machine | ⬜ Pending | - | See CF-002 |
| Add connection timeout | ⬜ Pending | - | See CF-003 |
| Fix token refresh | ⬜ Pending | - | See API-001 |
| Fix cache invalidation | ⬜ Pending | - | See API-004 |
| Improve error handling | ⬜ Pending | - | See UI-002 |
| Add loading state component | ⬜ Pending | - | See UI-001 |

### Phase 2: UI/UX Alignment

| Task | Status | PR | Notes |
|------|--------|-----|-------|
| Standardize loading states | ⬜ Pending | - | |
| Add toast notifications | ⬜ Pending | - | |
| Update theme colors | ⬜ Pending | - | |
| Fix navigation issues | ⬜ Pending | - | See UI-003 |
| Add confirmation dialogs | ⬜ Pending | - | |

### Phase 3: Core Missing Features

| Task | Status | PR | Notes |
|------|--------|-----|-------|
| DTMF keypad | ⬜ Pending | - | |
| Recording playback | ⬜ Pending | - | |
| Call summary display | ⬜ Pending | - | |
| Voicemail list | ⬜ Pending | - | |
| Voicemail detail/player | ⬜ Pending | - | |

### Phase 4: Business Features

| Task | Status | PR | Notes |
|------|--------|-----|-------|
| Phone numbers screen | ⬜ Pending | - | |
| Number configuration | ⬜ Pending | - | |
| Plans/billing screen | ⬜ Pending | - | |
| Stripe checkout | ⬜ Pending | - | |
| Payment history | ⬜ Pending | - | |
| Organization support | ⬜ Pending | - | |
| Team member management | ⬜ Pending | - | |

### Phase 5: User Experience

| Task | Status | PR | Notes |
|------|--------|-----|-------|
| Onboarding flow | ⬜ Pending | - | |
| Permission requests | ⬜ Pending | - | |
| Accessibility audit | ⬜ Pending | - | |
| Performance optimization | ⬜ Pending | - | |

---

## Status Legend

- ⬜ Pending - Not started
- 🔄 In Progress - Currently being worked on
- ✅ Complete - Finished and merged
- ❌ Blocked - Cannot proceed (see notes)
- ⏸️ Paused - Started but paused

---

## Feature Parity Checklist

### Authentication
- [x] Email/password login
- [x] Email/password registration
- [x] Email verification
- [x] OAuth (Google, Apple)
- [x] Forgot password
- [x] Session management
- [x] Secure token storage

### Voice Calling
- [x] Outbound calls
- [x] Incoming calls
- [x] Language selection (48 languages)
- [x] Caller ID selection
- [x] Mute toggle
- [x] Speaker toggle
- [x] Call duration display
- [ ] DTMF keypad
- [ ] Hold functionality

### Transcription
- [x] Real-time transcription
- [x] Speaker identification
- [x] Translation display
- [ ] Transcript export

### Call History
- [x] List all calls
- [x] Pagination
- [x] Call detail view
- [x] Transcript view
- [ ] Recording playback
- [ ] Call summary
- [ ] Filter by status
- [ ] Search calls

### Contacts
- [x] List contacts
- [x] Create contact
- [x] Edit contact
- [x] Delete contact
- [x] Contact types (allowed/blocked)
- [x] Default language per contact
- [ ] Import contacts
- [ ] Export contacts

### Voicemail
- [ ] Voicemail inbox
- [ ] Transcription display
- [ ] Translation display
- [ ] Audio playback
- [ ] TTS playback
- [ ] Mark read/unread
- [ ] Delete voicemail

### Phone Numbers
- [x] List numbers (in caller ID)
- [ ] Dedicated numbers screen
- [ ] Configure incoming settings
- [ ] Voicemail settings
- [ ] IVR configuration
- [ ] Purchase numbers

### Billing
- [ ] View current balance
- [ ] View current plan
- [ ] Purchase minutes
- [ ] Stripe checkout
- [ ] Payment history
- [ ] Auto-reload settings

### Organization
- [ ] List organizations
- [ ] Create organization
- [ ] Invite members
- [ ] Remove members
- [ ] Role management
- [ ] Shared numbers
- [ ] Org balance

### Settings
- [x] Default language
- [x] Speaker mode default
- [x] Haptic feedback toggle
- [x] Theme selection
- [x] Sign out
- [ ] Notification preferences
- [ ] Privacy settings

### User Experience
- [x] Dashboard
- [x] Quick actions
- [x] Recent calls
- [ ] Onboarding flow
- [ ] Permission requests
- [ ] Feature tour

---

## Release Notes Template

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New feature description

### Changed
- Changed behavior description

### Fixed
- Bug fix description

### Deprecated
- Deprecated feature description

### Removed
- Removed feature description

### Security
- Security fix description
```

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 1.0.0 | TBD | Initial release |
| - | - | - |

---

## Contributing

When contributing to this changelog:

1. Add entries under `[Unreleased]` section
2. Use the appropriate category (Added, Changed, Fixed, etc.)
3. Write clear, user-focused descriptions
4. Include PR/issue references where applicable
5. Move entries to versioned section upon release
