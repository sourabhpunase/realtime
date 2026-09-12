import { z } from "zod";
import { hasPermission } from "./permissions.js";
import { RealtimeError } from "./errors.js";

export const MEDIA_SOURCES = ["microphone", "camera", "screen"] as const;
export type MediaSource = (typeof MEDIA_SOURCES)[number];

export const MediaTokenRequestSchema = z.object({
  sources: z.array(z.enum(MEDIA_SOURCES)).max(4).default(["microphone"]),
});

export function publishableMediaSources(perms: readonly string[]): MediaSource[] {
  const allowed: MediaSource[] = [];
  if (hasPermission(perms, "media:publish")) allowed.push("microphone");
  if (hasPermission(perms, "media:video")) allowed.push("camera");
  if (hasPermission(perms, "media:screen")) allowed.push("screen");
  return allowed;
}

export function authorizeMediaSources(
  perms: readonly string[],
  requested: readonly MediaSource[],
): MediaSource[] {
  const publishable = publishableMediaSources(perms);
  if (publishable.length === 0 && requested.every((source) => source === "microphone")) {
    return [];
  }
  const denied = requested.filter((source) => !publishable.includes(source));
  if (denied.length > 0) {
    throw new RealtimeError(
      "FORBIDDEN",
      `Not allowed to publish ${denied.join(", ")}. An audio-only grant cannot enable camera or screen.`,
      403,
    );
  }
  return requested.filter((source) => publishable.includes(source));
}

export const MEDIA_REVOCATION_NOTE =
  "LiveKit Cloud automatic token revocation is not used. An existing media session may continue until we call RemoveParticipant or the client disconnects. A new connection with an expired or revoked collaboration grant is rejected.";

export type MediaTokenResponse = {
  token: string;
  url: string;
  roomName: string;
  identity: string;
  expiresAt: string;
  expiresIn: number;
  canPublish: boolean;
  allowedSources: MediaSource[];
  revocation: {
    mechanism: "explicit-remove-participant";
    note: string;
  };
};
