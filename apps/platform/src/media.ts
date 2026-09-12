import { createHash } from "node:crypto";
import {
  MEDIA_REVOCATION_NOTE,
  RealtimeError,
  type MediaSource,
} from "@realtime/protocol";

export type MediaIssueInput = {
  applicationId: string;
  roomExternalId: string;
  userId: string;
  userName: string;
  canPublish: boolean;
  sources: MediaSource[];
  ttlSeconds?: number;
};

export type IssuedMedia = {
  token: string;
  url: string;
  roomName: string;
  identity: string;
  expiresAt: Date;
  expiresIn: number;
  canPublish: boolean;
  allowedSources: MediaSource[];
};

export interface MediaAdapter {
  readonly enabled: boolean;
  issueToken(input: MediaIssueInput): Promise<IssuedMedia>;
  removeParticipant(applicationId: string, roomExternalId: string, userId: string): Promise<void>;
}

export function mediaIdentity(applicationId: string, userId: string): string {
  return `${applicationId}:${userId}`;
}

export function mediaRoomName(applicationId: string, roomExternalId: string): string {
  const slug = roomExternalId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  const digest = createHash("sha256").update(`${applicationId}:${roomExternalId}`).digest("hex").slice(0, 12);
  return `rt_${digest}_${slug}`;
}

export class DisabledMediaAdapter implements MediaAdapter {
  readonly enabled = false;

  async issueToken(): Promise<IssuedMedia> {
    throw new RealtimeError(
      "INTERNAL",
      "Voice is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.",
      503,
    );
  }

  async removeParticipant(): Promise<void> {
    return;
  }
}

export class MemoryMediaAdapter implements MediaAdapter {
  readonly enabled = true;
  issued: IssuedMedia[] = [];
  removed: string[] = [];

  async issueToken(input: MediaIssueInput): Promise<IssuedMedia> {
    const expiresIn = input.ttlSeconds ?? 900;
    const issued: IssuedMedia = {
      token: `lk_test_${mediaIdentity(input.applicationId, input.userId)}`,
      url: "ws://localhost:7880",
      roomName: mediaRoomName(input.applicationId, input.roomExternalId),
      identity: mediaIdentity(input.applicationId, input.userId),
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      expiresIn,
      canPublish: input.canPublish,
      allowedSources: input.canPublish ? input.sources : [],
    };
    this.issued.push(issued);
    return issued;
  }

  async removeParticipant(applicationId: string, roomExternalId: string, userId: string): Promise<void> {
    this.removed.push(`${mediaRoomName(applicationId, roomExternalId)}:${mediaIdentity(applicationId, userId)}`);
  }
}

export function createLiveKitAdapter(env: {
  url: string;
  apiKey: string;
  apiSecret: string;
  host?: string;
}): MediaAdapter {
  return new LiveKitMediaAdapter(env);
}

class LiveKitMediaAdapter implements MediaAdapter {
  readonly enabled = true;

  constructor(
    private readonly env: { url: string; apiKey: string; apiSecret: string; host?: string },
  ) {}

  async issueToken(input: MediaIssueInput): Promise<IssuedMedia> {
    const { AccessToken } = await import("livekit-server-sdk");
    const expiresIn = input.ttlSeconds ?? 900;
    const token = new AccessToken(this.env.apiKey, this.env.apiSecret, {
      identity: mediaIdentity(input.applicationId, input.userId),
      name: input.userName,
      ttl: expiresIn,
    });
    const TrackSource = await loadTrackSource();
    const sources = input.canPublish ? input.sources : [];
    token.addGrant({
      roomJoin: true,
      room: mediaRoomName(input.applicationId, input.roomExternalId),
      canSubscribe: true,
      canPublish: sources.length > 0,
      canPublishData: false,
      canPublishSources: liveKitPublishSources(sources, TrackSource),
    });
    return {
      token: await token.toJwt(),
      url: this.env.url,
      roomName: mediaRoomName(input.applicationId, input.roomExternalId),
      identity: mediaIdentity(input.applicationId, input.userId),
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      expiresIn,
      canPublish: sources.length > 0,
      allowedSources: sources,
    };
  }

  async removeParticipant(applicationId: string, roomExternalId: string, userId: string): Promise<void> {
    try {
      const { RoomServiceClient } = await import("livekit-server-sdk");
      const host = this.env.host ?? this.env.url.replace(/^ws/, "http");
      const client = new RoomServiceClient(host, this.env.apiKey, this.env.apiSecret);
      await client.removeParticipant(
        mediaRoomName(applicationId, roomExternalId),
        mediaIdentity(applicationId, userId),
      );
    } catch {
      /* Room or participant may already be gone. */
    }
  }
}

type LiveKitTrackSource = {
  CAMERA: number;
  MICROPHONE: number;
  SCREEN_SHARE: number;
  SCREEN_SHARE_AUDIO?: number;
};

const FALLBACK_TRACK_SOURCE: LiveKitTrackSource = {
  CAMERA: 1,
  MICROPHONE: 2,
  SCREEN_SHARE: 3,
  SCREEN_SHARE_AUDIO: 4,
};

async function loadTrackSource(): Promise<LiveKitTrackSource> {
  try {
    const mod = (await import("livekit-server-sdk")) as { TrackSource?: LiveKitTrackSource };
    return mod.TrackSource ?? FALLBACK_TRACK_SOURCE;
  } catch {
    return FALLBACK_TRACK_SOURCE;
  }
}

function liveKitPublishSources(sources: MediaSource[], TrackSource: LiveKitTrackSource): number[] {
  const granted: number[] = [];
  if (sources.includes("microphone")) granted.push(TrackSource.MICROPHONE);
  if (sources.includes("camera")) granted.push(TrackSource.CAMERA);
  if (sources.includes("screen")) {
    granted.push(TrackSource.SCREEN_SHARE);
    if (TrackSource.SCREEN_SHARE_AUDIO != null) granted.push(TrackSource.SCREEN_SHARE_AUDIO);
  }
  return granted;
}

export function mediaRevocationPayload() {
  return {
    mechanism: "explicit-remove-participant" as const,
    note: MEDIA_REVOCATION_NOTE,
  };
}

export function mediaAdapterFromEnv(env: NodeJS.ProcessEnv = process.env): MediaAdapter {
  const url = env.LIVEKIT_URL;
  const apiKey = env.LIVEKIT_API_KEY;
  const apiSecret = env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) {
    return new DisabledMediaAdapter();
  }
  return createLiveKitAdapter({
    url,
    apiKey,
    apiSecret,
    host: env.LIVEKIT_HOST,
  });
}
