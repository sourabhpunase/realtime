import { randomUUID } from "node:crypto";
import type { Participant } from "@realtime/protocol";
import type { Server } from "socket.io";

export type ClusterMode = "single" | "redis-adapter";

export type Cluster = {
  mode: ClusterMode;
  presenceAdd(channel: string, socketId: string, participant: Participant): Promise<void>;
  presenceRemove(channel: string, socketId: string): Promise<Participant | undefined>;
  presenceList(channel: string): Promise<Participant[]>;
  invalidateDoc(roomId: string): Promise<void>;
  close(): Promise<void>;
};

export function memoryCluster(): Cluster {
  const presence = new Map<string, Map<string, Participant>>();
  return {
    mode: "single",
    async presenceAdd(channel, socketId, participant) {
      if (!presence.has(channel)) presence.set(channel, new Map());
      presence.get(channel)!.set(socketId, participant);
    },
    async presenceRemove(channel, socketId) {
      const room = presence.get(channel);
      const participant = room?.get(socketId);
      room?.delete(socketId);
      if (room && room.size === 0) presence.delete(channel);
      return participant;
    },
    async presenceList(channel) {
      return [...(presence.get(channel)?.values() ?? [])];
    },
    async invalidateDoc() {},
    async close() {},
  };
}

export async function connectRedisCluster(
  redisUrl: string,
  io: Server,
  onInvalidate: (roomId: string) => void,
  instanceId = randomUUID(),
): Promise<Cluster> {
  const { createClient } = await import("redis");
  const { createAdapter } = await import("@socket.io/redis-adapter");
  const pub = createClient({ url: redisUrl });
  const sub = pub.duplicate();
  await pub.connect();
  await sub.connect();
  io.adapter(createAdapter(pub, sub));
  await sub.subscribe("rt:doc-invalidate", (message) => {
    if (!message) return;
    try {
      const payload = JSON.parse(message) as { roomId?: string; origin?: string };
      if (payload.roomId && payload.origin !== instanceId) onInvalidate(payload.roomId);
    } catch {
      onInvalidate(message);
    }
  });
  return {
    mode: "redis-adapter",
    async presenceAdd(channel, socketId, participant) {
      await pub.hSet(`rt:presence:${channel}`, socketId, JSON.stringify(participant));
    },
    async presenceRemove(channel, socketId) {
      const raw = await pub.hGet(`rt:presence:${channel}`, socketId);
      await pub.hDel(`rt:presence:${channel}`, socketId);
      return raw ? (JSON.parse(raw) as Participant) : undefined;
    },
    async presenceList(channel) {
      const raw = await pub.hGetAll(`rt:presence:${channel}`);
      return Object.values(raw).map((value) => JSON.parse(value) as Participant);
    },
    async invalidateDoc(roomId) {
      await pub.publish("rt:doc-invalidate", JSON.stringify({ roomId, origin: instanceId }));
    },
    async close() {
      await sub.unsubscribe("rt:doc-invalidate");
      await pub.quit();
      await sub.quit();
    },
  };
}
