import {
  ConnectionQuality,
  Room,
  RoomEvent,
  type LocalTrack,
  type LocalTrackPublication,
  type RemoteTrack,
} from "livekit-client";
import type { MediaSource, MediaTokenResponse } from "@realtime/protocol";

export type VoiceStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "permission_denied"
  | "error";

export type VoiceState = {
  status: VoiceStatus;
  muted: boolean;
  cameraOn: boolean;
  screenOn: boolean;
  canPublish: boolean;
  allowedSources: MediaSource[];
  speaking: string[];
  quality: "unknown" | "lost" | "poor" | "good" | "excellent";
  error?: string;
  inputDevices: MediaDeviceInfo[];
  outputDevices: MediaDeviceInfo[];
  inputId?: string;
  outputId?: string;
  outputSelectable: boolean;
};

type Listener = (state: VoiceState) => void;

export type RoomFactory = () => Room;

const emptyState = (): VoiceState => ({
  status: "idle",
  muted: false,
  cameraOn: false,
  screenOn: false,
  canPublish: false,
  allowedSources: [],
  speaking: [],
  quality: "unknown",
  inputDevices: [],
  outputDevices: [],
  outputSelectable: typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype,
});

export class RoomAudioSession {
  private room: Room | null = null;
  private listeners = new Set<Listener>();
  private remotes = new Map<string, HTMLMediaElement>();
  private locals = new Map<string, HTMLMediaElement>();
  private allowed = new Set<MediaSource>();
  private state: VoiceState = emptyState();

  constructor(private readonly createRoom: RoomFactory = () => new Room()) {}

  getSnapshot(): VoiceState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private emit(patch: Partial<VoiceState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }

  async join(credentials: MediaTokenResponse): Promise<void> {
    if (this.room) await this.leave();
    this.allowed = new Set(credentials.allowedSources);
    this.emit({
      status: "connecting",
      canPublish: credentials.canPublish,
      allowedSources: [...credentials.allowedSources],
      cameraOn: false,
      screenOn: false,
      error: undefined,
    });
    const room = this.createRoom();
    this.room = room;

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      this.emit({
        speaking: speakers.map((participant) => participant.name || participant.identity),
      });
    });
    room.on(RoomEvent.ConnectionQualityChanged, (_quality, participant) => {
      if (participant === room.localParticipant) {
        this.emit({ quality: qualityLabel(_quality) });
      }
    });
    room.on(RoomEvent.Reconnecting, () => this.emit({ status: "reconnecting" }));
    room.on(RoomEvent.Reconnected, () => this.emit({ status: "connected" }));
    room.on(RoomEvent.Disconnected, () => {
      if (this.state.status !== "idle") this.emit({ status: "idle" });
    });
    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      this.attachRemote(track, participant.identity);
    });
    room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      this.detachRemote(participant.identity, track);
    });

    await room.connect(credentials.url, credentials.token);
    this.emit({ status: "connected" });

    if (this.allowed.has("microphone")) {
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        this.emit({ muted: false });
      } catch (error) {
        const denied = isPermissionDenied(error);
        this.emit({
          status: denied ? "permission_denied" : "connected",
          error: denied
            ? "Microphone permission denied. You can still hear others."
            : error instanceof Error
              ? error.message
              : "Could not publish microphone",
          canPublish: credentials.canPublish,
        });
      }
    }

    await this.refreshDevices();
  }

  async setMuted(muted: boolean): Promise<void> {
    if (!this.room || !this.allowed.has("microphone")) return;
    await this.room.localParticipant.setMicrophoneEnabled(!muted);
    this.emit({ muted });
  }

  async setCameraEnabled(enabled: boolean): Promise<void> {
    if (!this.room || !this.allowed.has("camera")) return;
    try {
      const publication = await this.room.localParticipant.setCameraEnabled(enabled);
      if (enabled && publication?.track) this.attachLocal("camera", publication.track);
      else this.detachLocal("camera");
      this.emit({ cameraOn: enabled, error: undefined });
    } catch (error) {
      this.emit({
        error: isPermissionDenied(error)
          ? "Camera permission denied."
          : error instanceof Error
            ? error.message
            : "Could not start camera",
      });
    }
  }

  async setScreenShareEnabled(enabled: boolean): Promise<void> {
    if (!this.room || !this.allowed.has("screen")) return;
    try {
      const publication = await this.room.localParticipant.setScreenShareEnabled(enabled);
      if (enabled && publication?.track) this.attachLocal("screen", publication.track);
      else this.detachLocal("screen");
      this.emit({ screenOn: enabled, error: undefined });
    } catch (error) {
      this.emit({
        error: isPermissionDenied(error)
          ? "Screen share permission denied."
          : error instanceof Error
            ? error.message
            : "Could not share screen",
      });
    }
  }

  async setInputDevice(deviceId: string): Promise<void> {
    if (!this.room) return;
    await this.room.switchActiveDevice("audioinput", deviceId);
    this.emit({ inputId: deviceId });
  }

  async setOutputDevice(deviceId: string): Promise<void> {
    if (!this.state.outputSelectable) return;
    if (this.room) {
      try {
        await this.room.switchActiveDevice("audiooutput", deviceId);
      } catch {
        for (const element of this.remotes.values()) {
          if (!(element instanceof HTMLAudioElement)) continue;
          const sink = element as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
          await sink.setSinkId?.(deviceId);
        }
      }
    }
    this.emit({ outputId: deviceId });
  }

  async leave(): Promise<void> {
    const room = this.room;
    this.room = null;
    this.allowed.clear();
    for (const [id, element] of this.remotes) {
      pauseAndRemove(element);
      this.remotes.delete(id);
    }
    for (const [id, element] of this.locals) {
      pauseAndRemove(element);
      this.locals.delete(id);
    }
    if (room) {
      for (const publication of room.localParticipant.audioTrackPublications.values()) {
        stopPublication(publication);
      }
      for (const publication of room.localParticipant.videoTrackPublications.values()) {
        stopPublication(publication);
      }
      room.removeAllListeners();
      room.disconnect();
    }
    this.emit(emptyState());
  }

  private attachRemote(track: RemoteTrack, identity: string) {
    if (typeof document === "undefined") return;
    const key = `${identity}:${track.kind}`;
    const element = track.attach();
    element.dataset.realtimeMedia = key;
    element.setAttribute(
      track.kind === "video" ? "data-realtime-remote-video" : "data-realtime-remote-audio",
      identity,
    );
    document.body.appendChild(element);
    this.remotes.set(key, element);
    if (track.kind === "audio" && this.state.outputId) {
      void this.setOutputDevice(this.state.outputId);
    }
  }

  private detachRemote(identity: string, track: RemoteTrack) {
    track.detach();
    const key = `${identity}:${track.kind}`;
    const element = this.remotes.get(key);
    if (element) {
      pauseAndRemove(element);
      this.remotes.delete(key);
    }
  }

  private attachLocal(kind: string, track: LocalTrack) {
    if (typeof document === "undefined") return;
    this.detachLocal(kind);
    const element = track.attach();
    element.dataset.realtimeLocal = kind;
    element.setAttribute("data-realtime-local-video", kind);
    document.body.appendChild(element);
    this.locals.set(kind, element);
  }

  private detachLocal(kind: string) {
    const element = this.locals.get(kind);
    if (element) {
      pauseAndRemove(element);
      this.locals.delete(kind);
    }
  }

  private async refreshDevices() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    this.emit({
      inputDevices: devices.filter((device) => device.kind === "audioinput"),
      outputDevices: devices.filter((device) => device.kind === "audiooutput"),
    });
  }
}

function qualityLabel(quality: ConnectionQuality): VoiceState["quality"] {
  switch (quality) {
    case ConnectionQuality.Lost:
      return "lost";
    case ConnectionQuality.Poor:
      return "poor";
    case ConnectionQuality.Good:
      return "good";
    case ConnectionQuality.Excellent:
      return "excellent";
    default:
      return "unknown";
  }
}

function isPermissionDenied(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")
  );
}

function stopPublication(publication: LocalTrackPublication) {
  const track = publication.track;
  track?.stop();
  track?.detach();
}

function pauseAndRemove(element: HTMLMediaElement) {
  element.pause();
  element.srcObject = null;
  element.remove();
}
