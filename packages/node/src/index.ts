import {
  IdentifyRequestSchema,
  type IdentifyResponse,
  type Permission,
} from "@realtime/protocol";

export type RealtimeNodeConfig = {
  secretKey: string;
  endpoint: string;
};

export type IdentifyInput = {
  user: { id: string; name: string; avatar?: string };
  room: string;
  permissions: Permission[] | readonly string[];
  ttlSeconds?: number;
};

async function request<T>(
  config: RealtimeNodeConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (typeof window !== "undefined") {
    throw new Error("@realtime/node is server-only and must not run in a browser");
  }
  if (!config.secretKey.startsWith("sk_")) {
    throw new Error("secretKey must be an sk_ server credential");
  }
  const response = await fetch(`${config.endpoint.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${config.secretKey}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(body.error?.message ?? `Request failed (${response.status})`);
  }
  return body as T;
}

export class Realtime {
  readonly rooms: {
    ensure: (input: { id: string; title?: string }) => Promise<{ id: string; internalId: string }>;
    get: (id: string) => Promise<unknown>;
    revoke: (id: string, input: { userId?: string; sessionId?: string; reason?: string }) => Promise<void>;
    comments: {
      list: (id: string) => Promise<unknown>;
      create: (id: string, body: Record<string, unknown>) => Promise<unknown>;
    };
    versions: {
      list: (id: string) => Promise<unknown>;
      create: (id: string, name: string) => Promise<unknown>;
      restore: (id: string, versionId: string) => Promise<unknown>;
    };
    grant: (
      id: string,
      input: { userId: string; permissions: Permission[] | readonly string[] },
    ) => Promise<unknown>;
    suggestions: {
      list: (id: string) => Promise<unknown>;
    };
    chat: {
      list: (id: string) => Promise<unknown>;
    };
  };

  constructor(private readonly config: RealtimeNodeConfig) {
    this.rooms = {
      ensure: async (input) => {
        const result = await request<{ room: { id: string; internalId: string } }>(
          this.config,
          "/v1/rooms",
          { method: "POST", body: JSON.stringify(input) },
        );
        return result.room;
      },
      get: (id) => request(this.config, `/v1/rooms/${encodeURIComponent(id)}`),
      revoke: async (id, input) => {
        await request(this.config, `/v1/rooms/${encodeURIComponent(id)}/revoke`, {
          method: "POST",
          body: JSON.stringify(input),
        });
      },
      comments: {
        list: (id: string) =>
          request(this.config, `/v1/rooms/${encodeURIComponent(id)}/comments`),
        create: (id: string, body: Record<string, unknown>) =>
          request(this.config, `/v1/rooms/${encodeURIComponent(id)}/comments`, {
            method: "POST",
            body: JSON.stringify(body),
          }),
      },
      versions: {
        list: (id: string) =>
          request(this.config, `/v1/rooms/${encodeURIComponent(id)}/versions`),
        create: (id: string, name: string) =>
          request(this.config, `/v1/rooms/${encodeURIComponent(id)}/versions`, {
            method: "POST",
            body: JSON.stringify({ name }),
          }),
        restore: (id: string, versionId: string) =>
          request(
            this.config,
            `/v1/rooms/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/restore`,
            { method: "POST" },
          ),
      },
      grant: (id, input) =>
        request(this.config, `/v1/rooms/${encodeURIComponent(id)}/grants`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
      suggestions: {
        list: (id: string) =>
          request(this.config, `/v1/rooms/${encodeURIComponent(id)}/suggestions`),
      },
      chat: {
        list: (id: string) => request(this.config, `/v1/rooms/${encodeURIComponent(id)}/chat`),
      },
    };
  }

  async identify(input: IdentifyInput): Promise<IdentifyResponse> {
    const parsed = IdentifyRequestSchema.parse(input);
    return request<IdentifyResponse>(this.config, "/v1/tokens", {
      method: "POST",
      body: JSON.stringify(parsed),
    });
  }
}
