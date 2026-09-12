# Milestone D — Product completeness

Built on authenticated rooms (A), Yjs documents (B), and optional LiveKit audio (C).

## What works

- **Suggestion mode is a proposal path**, not recolored typing. Users with `suggestions:write` and **without** `room:write` store insert/delete/replace records. Accept (`suggestions:accept`) applies a **server-side** plain-text edit to the Yjs document and broadcasts `yjs:update`. Reject/withdraw do not mutate the document.
- **Follow:** click another participant in the presence bar. Only the follower scrolls. Stop following is explicit. Local follow state is not written into the followed user’s awareness (no follow loops).
- **Sharing:** the sample integrator owns membership. Alice can invite by email and role. The next room token uses the new grants. Optional `POST /v1/rooms/:id/grants` stores platform metadata; **delegated `identify()` permissions still win**.
- **Chat, reactions, in-room notices** persist and broadcast with `chat:write`.
- **Find**, skip-to-document, toolbar `aria-pressed`, and live regions for follow/chat/notices.
- **Voice typing** uses the browser SpeechRecognition API and inserts through the Tiptap/Yjs transaction path. It is off until clicked. Audio is not sent to the platform.
- **Exports:** text, Markdown, sanitized HTML print, and a **limited DOCX** (headings, paragraphs, marks, lists, and tables).

## Honest limits

- Suggestions are **plain text**. They do not carry marks, tables, or images.
- DOCX is not a round-trip format. Images become a text placeholder. Comments and suggestions are dropped.
- Follow uses the other user’s latest editor selection (and mouse position as fallback). Concurrent edits can shift the landing position by a few characters.
- Camera and screen require `media:video` / `media:screen` and an explicit click after Join voice. See [MILESTONE_C.md](MILESTONE_C.md).
- Platform grants are records, not an enforced ACL, unless the integrator copies them into `identify()`.
- SpeechRecognition availability is browser-dependent.

## Permissions

| Role | Document write | Propose | Accept | Chat |
|------|----------------|---------|--------|------|
| viewer | no | no | no | no |
| commenter | no | no | no | yes |
| suggester | no | yes | no | yes |
| editor | yes | yes | yes | yes |
| administrator | yes | yes | yes | yes |

## Demo

Open **Q3 review** as Bob (`bob@example.com` / `bob-pass-1`). Propose a replacement. Sign in as Alice and **Accept**. The document should gain that text without Bob ever receiving `room:write`.

Click a teammate’s name to follow; use **Stop following** to return to independent scrolling.

## Run

```bash
npm install
npm run build
npm test
npm run dev:platform
npm run dev:sample
```
