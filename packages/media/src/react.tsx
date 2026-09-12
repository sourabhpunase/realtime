import { useEffect, useRef, useState } from "react";
import { useRoom } from "@realtime/react";
import { hasPermission, type MediaSource, type MediaTokenResponse } from "@realtime/protocol";
import { RoomAudioSession, type VoiceState } from "./session.js";

function requestedSources(perms: readonly string[]): MediaSource[] {
  const sources: MediaSource[] = ["microphone"];
  if (hasPermission(perms, "media:video")) sources.push("camera");
  if (hasPermission(perms, "media:screen")) sources.push("screen");
  return sources;
}

export function VoiceToolbar() {
  const { roomId, session } = useRoom();
  const audio = useRef<RoomAudioSession | null>(null);
  if (!audio.current) audio.current = new RoomAudioSession();
  const [state, setState] = useState<VoiceState>(audio.current.getSnapshot());
  const [busy, setBusy] = useState(false);

  useEffect(() => audio.current?.subscribe(setState), []);

  useEffect(() => {
    return () => {
      void audio.current?.leave();
    };
  }, [roomId]);

  useEffect(() => {
    if (session?.connectionState === "permission_denied") {
      void audio.current?.leave();
    }
  }, [session?.connectionState]);

  async function join() {
    if (!session) return;
    const token = session.getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const response = await fetch(
        `${session.endpoint}/v1/rooms/${encodeURIComponent(roomId)}/media-token`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ sources: requestedSources(session.permissions) }),
        },
      );
      const body = (await response.json()) as MediaTokenResponse & {
        error?: { message?: string };
      };
      if (!response.ok) {
        setState((current) => ({
          ...current,
          status: response.status === 403 ? "permission_denied" : "error",
          error: body.error?.message ?? "Could not start voice",
        }));
        return;
      }
      await audio.current?.join(body);
    } catch (error) {
      setState((current) => ({
        ...current,
        status: "error",
        error: error instanceof Error ? error.message : "Voice failed",
      }));
    } finally {
      setBusy(false);
    }
  }

  const joined = state.status === "connected" || state.status === "reconnecting";
  const canJoin = Boolean(session?.permissions.includes("media:join") || session?.permissions.includes("room:admin"));
  const canCamera = state.allowedSources.includes("camera");
  const canScreen = state.allowedSources.includes("screen");

  return (
    <div
      data-realtime-voice
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        padding: "8px 0",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: 13,
      }}
    >
      {!canJoin ? (
        <span>Voice is not enabled for your role.</span>
      ) : !joined ? (
        <button type="button" disabled={busy} onClick={() => void join()}>
          Join voice
        </button>
      ) : (
        <>
          <button type="button" onClick={() => void audio.current?.leave()}>
            Leave voice
          </button>
          {state.canPublish ? (
            <button type="button" onClick={() => void audio.current?.setMuted(!state.muted)}>
              {state.muted ? "Unmute" : "Mute"}
            </button>
          ) : (
            <span>Listen only</span>
          )}
          {canCamera ? (
            <button type="button" onClick={() => void audio.current?.setCameraEnabled(!state.cameraOn)}>
              {state.cameraOn ? "Stop camera" : "Start camera"}
            </button>
          ) : null}
          {canScreen ? (
            <button type="button" onClick={() => void audio.current?.setScreenShareEnabled(!state.screenOn)}>
              {state.screenOn ? "Stop sharing" : "Share screen"}
            </button>
          ) : null}
          <select
            aria-label="Microphone"
            value={state.inputId ?? ""}
            onChange={(event) => void audio.current?.setInputDevice(event.target.value)}
          >
            <option value="">Input device</option>
            {state.inputDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || "Microphone"}
              </option>
            ))}
          </select>
          {state.outputSelectable ? (
            <select
              aria-label="Speaker"
              value={state.outputId ?? ""}
              onChange={(event) => void audio.current?.setOutputDevice(event.target.value)}
            >
              <option value="">Output device</option>
              {state.outputDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || "Speaker"}
                </option>
              ))}
            </select>
          ) : null}
        </>
      )}
      <span data-voice-status={state.status}>{statusLabel(state)}</span>
      {state.speaking.length > 0 ? <span>Speaking: {state.speaking.join(", ")}</span> : null}
      {state.error ? <span role="alert">{state.error}</span> : null}
    </div>
  );
}

function statusLabel(state: VoiceState): string {
  switch (state.status) {
    case "connecting":
      return "Connecting voice…";
    case "reconnecting":
      return "Reconnecting voice…";
    case "connected":
      return `Voice ${state.quality === "unknown" ? "connected" : state.quality}`;
    case "permission_denied":
      return "Microphone blocked";
    case "error":
      return "Voice unavailable";
    default:
      return "Voice idle";
  }
}
