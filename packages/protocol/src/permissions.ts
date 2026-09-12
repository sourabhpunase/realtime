export const PERMISSIONS = [
  "room:join",
  "room:read",
  "room:write",
  "presence:write",
  "comments:write",
  "suggestions:write",
  "suggestions:accept",
  "chat:write",
  "history:read",
  "history:restore",
  "media:join",
  "media:publish",
  "media:video",
  "media:screen",
  "room:admin",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PRESETS = {
  viewer: ["room:join", "room:read"],
  commenter: ["room:join", "room:read", "presence:write", "comments:write", "chat:write"],
  suggester: [
    "room:join",
    "room:read",
    "presence:write",
    "comments:write",
    "suggestions:write",
    "chat:write",
  ],
  editor: [
    "room:join",
    "room:read",
    "room:write",
    "presence:write",
    "comments:write",
    "suggestions:write",
    "suggestions:accept",
    "chat:write",
    "history:read",
  ],
  administrator: [...PERMISSIONS],
} as const satisfies Record<string, readonly Permission[]>;

export type RolePreset = keyof typeof ROLE_PRESETS;

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export function normalizePermissions(input: readonly string[]): Permission[] {
  const unique = new Set<Permission>();
  for (const item of input) {
    if (!isPermission(item)) {
      throw new Error(`Unknown permission: ${item}`);
    }
    unique.add(item);
  }
  return [...unique];
}

export function hasPermission(
  granted: readonly string[],
  required: Permission,
): boolean {
  return granted.includes(required) || granted.includes("room:admin");
}

export function expandRolePreset(role: RolePreset): Permission[] {
  return [...ROLE_PRESETS[role]];
}
