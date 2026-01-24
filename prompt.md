# Ralph Loop Prompt — WebSocket Connection Management

You are implementing WebSocket connection improvements for a React Native app (TalkTool Mobile). You will implement exactly ONE user story per invocation, then commit your changes.

## Workflow

1. **Read `prd.json`** in the project root. Parse the `stories` array.
2. **Find the first story** where `"passes": false` (by array order / lowest `id`).
3. **If no stories remain** with `"passes": false`, output `<promise>COMPLETE</promise>` and stop.
4. **Read the relevant source files** (listed below) to understand current code.
5. **Read the web reference** at `/Users/michaelstewart/numberlang/contexts/DeviceContext.jsx` to study the proven WebSocket patterns you should align with.
6. **Implement the story's requirements** as described in its `description` and `acceptance` fields.
7. **Update `prd.json`** — set `"passes": true` for the story you just implemented. Do not modify any other stories.
8. **Git commit** all changed files with message format: `ralph: story {id} - {title}`
9. **If all stories now have `"passes": true`**, output `<promise>COMPLETE</promise>`.

## Source Files

Read these files to understand the current state before making changes:

- `src/contexts/VoiceContext.tsx` — Primary file. Contains WebSocket connection logic (connectWebSocket), call state management, and message handlers. Most stories modify this file.
- `src/hooks/useDisplaySocket.ts` — Display-only WebSocket for monitoring. Stories 3-4 require aligning its intervals.
- `src/services/websocket.service.ts` — Legacy generic WebSocket service. Story 12 removes this.
- `src/hooks/useWebSocket.ts` — Legacy generic WebSocket hook. Story 12 removes this.

## Web Reference (Target Pattern)

Study `/Users/michaelstewart/numberlang/contexts/DeviceContext.jsx` for the proven patterns:
- Instance affinity via `fly-force-instance-id` query param
- 25-second heartbeat ping interval
- 1500ms reconnection delay
- `shouldReconnect` ref to prevent reconnection after intentional close
- Duplicate connection prevention
- Clean disconnect on call end

## Implementation Guidelines

- **One story at a time.** Implement only the story you identified in step 2.
- **Minimal changes.** Only modify what the story requires. Do not refactor unrelated code.
- **Do not break existing functionality.** Ensure existing message handlers, call state transitions, and UI remain functional.
- **Do not modify stories that already pass.** Only change the `"passes"` field for the story you implemented.
- **Use TypeScript** conventions consistent with the existing codebase.
- **Import statements** — add any needed imports (e.g., `AsyncStorage` from `@react-native-async-storage/async-storage`, `AppState` from `react-native`).
- **Refs** — use `useRef` for mutable values that should not trigger re-renders (wsInstanceRef, shouldReconnectRef, heartbeatRef, etc.).

## Commit Format

```
ralph: story {id} - {title}
```

Example: `ralph: story 3 - Reconnection Interval - Match Web Frontend`

Stage all modified files and commit. Do not push.

## Completion Signal

After committing, check if ALL stories in prd.json now have `"passes": true`. If yes, output exactly:

```
<promise>COMPLETE</promise>
```

This signals the loop to stop. If stories remain, simply exit after your commit.

## Guard Rails

- Never skip a story — always implement the lowest-ID story with `"passes": false`.
- Never set `"passes": true` without actually implementing the acceptance criteria.
- Never modify the `id`, `title`, `description`, or `acceptance` fields in prd.json.
- If a story depends on work from a previous story (e.g., story 2 needs the instanceId ref from story 1), that work should already be committed. Read the current source to confirm.
- Do not introduce unused imports or dead code.
- Do not add console.log statements unless the acceptance criteria specifically mention logging.
