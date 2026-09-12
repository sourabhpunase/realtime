# Milestone C — Room audio

Voice uses a **separate WebRTC path** (self-hosted LiveKit). Socket.IO never carries recorded audio.

Joining a document does **not** turn on the microphone. The user must click **Join voice**.

## Permissions

`media:join` and `media:publish` are independent of `room:write`.

| Grant | Effect |
|-------|--------|
| none | Toolbar says voice is not enabled |
| `media:join` | Listen only |
| `media:join` + `media:publish` | May publish **microphone** only |
| `media:video` | May publish **camera** after an explicit Start camera click |
| `media:screen` | May publish **screen** after an explicit Share screen click |

Joining voice never turns on camera or screen. Requesting those sources without the matching grant returns **403**. An audio-only grant cannot silently enable them.

## Token and revocation

`POST /v1/rooms/:id/media-token` requires a **room JWT** (not `sk_`) and current `media:join`.

LiveKit Cloud automatic token revocation is **not** used. On `POST /v1/rooms/:id/revoke` we call `RemoveParticipant`. An existing session may continue until that call succeeds or the client disconnects. A new connect with an expired collaboration grant is rejected.

## Local LiveKit

```bash
docker compose --profile media up livekit
# or, without Docker:
# brew install livekit && livekit-server --dev --bind 0.0.0.0
```

Then set in the platform environment (see `.env.example`):

```
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_HOST=http://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

Restart `npm run dev:platform`. Without these variables, **Join voice** returns a clear “not configured” error. The document editor still works.

Dev keys (`devkey` / `secret`) are LiveKit `--dev` defaults. Replace them for any shared host.

## Production notes

- Put LiveKit behind TLS (`wss://`).
- Open the UDP/TCP ports LiveKit advertises (see its config).
- Configure TURN for restrictive NATs (`rtc.stun_servers` / `rtc.turn_servers` in LiveKit).
- Recording and transcription stay off unless you add a separate, consented workflow.

## Manual audio check

Automated tests cover grants, source restriction, and explicit participant removal. They do **not** measure voice quality.

1. Start LiveKit and the platform with the env vars above.
2. Open the sample as Alice and Bob.
3. Click **Join voice** in both windows and allow the microphone.
4. Confirm you hear the other browser and that mute/device switching works.
5. Confirm typing in the document does not drop the call, and leaving voice does not reset the document.
6. Camera and screen buttons appear only for roles that include `media:video` / `media:screen` (sample administrators). They stay off until clicked.
