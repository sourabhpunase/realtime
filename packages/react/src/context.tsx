import { createContext, useContext, type MutableRefObject } from "react";
import type { RoomSession, ConnectionState } from "@realtime/core";
import type { Participant } from "@realtime/protocol";
import type { RealtimeClient } from "@realtime/core";

export type ClientContextValue = {
  client: RealtimeClient;
};

export const ClientContext = createContext<ClientContextValue | null>(null);

export type FollowTarget = {
  userId: string;
  sessionId: string;
  name: string;
} | null;

export type RoomContextValue = {
  roomId: string;
  session: RoomSession | null;
  users: Participant[];
  cursors: Record<string, { x: number; y: number; userId: string }>;
  connection: ConnectionState;
  surfaceRef: MutableRefObject<HTMLElement | null>;
  followTarget: FollowTarget;
  setFollowTarget: (target: FollowTarget) => void;
};

export const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoom(): RoomContextValue {
  const value = useContext(RoomContext);
  if (!value) throw new Error("useRoom must be used inside <Room>");
  return value;
}
