import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { expandRolePreset, type Permission } from "@realtime/protocol";

export type SampleUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
};

export type SampleRole = "viewer" | "commenter" | "suggester" | "editor" | "administrator";

export type SampleDocument = {
  id: string;
  title: string;
  members: Record<string, SampleRole>;
};

function hashPassword(password: string, salt: Buffer): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function user(email: string, name: string, password: string): SampleUser {
  const salt = randomBytes(16);
  return {
    id: createHash("sha256").update(email).digest("hex").slice(0, 16),
    email,
    name,
    passwordSalt: salt.toString("hex"),
    passwordHash: hashPassword(password, salt),
  };
}

export const USERS: SampleUser[] = [
  user("alice@example.com", "Alice Rivera", "alice-pass-1"),
  user("bob@example.com", "Bob Chen", "bob-pass-1"),
];

export const DOCUMENTS: SampleDocument[] = [
  {
    id: "doc:welcome",
    title: "Team welcome",
    members: {
      [USERS[0].id]: "administrator",
      [USERS[1].id]: "editor",
    },
  },
  {
    id: "doc:review",
    title: "Q3 review",
    members: {
      [USERS[0].id]: "administrator",
      [USERS[1].id]: "suggester",
    },
  },
  {
    id: "doc:alice",
    title: "Alice private notes",
    members: { [USERS[0].id]: "administrator" },
  },
  {
    id: "doc:bob",
    title: "Bob private notes",
    members: { [USERS[1].id]: "administrator" },
  },
];

export function verifyUser(email: string, password: string): SampleUser | null {
  const found = USERS.find((item) => item.email === email.toLowerCase());
  if (!found) return null;
  const actual = Buffer.from(
    hashPassword(password, Buffer.from(found.passwordSalt, "hex")),
    "hex",
  );
  const expected = Buffer.from(found.passwordHash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  return found;
}

export function documentsFor(userId: string): SampleDocument[] {
  return DOCUMENTS.filter((doc) => Boolean(doc.members[userId]));
}

export function canAccessDocument(userId: string, documentId: string): boolean {
  return Boolean(DOCUMENTS.find((doc) => doc.id === documentId)?.members[userId]);
}

export function permissionsFor(userId: string, documentId: string): Permission[] {
  const role = DOCUMENTS.find((doc) => doc.id === documentId)?.members[userId];
  if (!role) return [];
  const permissions = [...expandRolePreset(role)];
  if (role === "editor" || role === "administrator") {
    if (!permissions.includes("media:join")) permissions.push("media:join");
    if (!permissions.includes("media:publish")) permissions.push("media:publish");
  }
  return permissions;
}

export function publicUser(user: SampleUser) {
  return { id: user.id, email: user.email, name: user.name };
}

const ROLES: SampleRole[] = ["viewer", "commenter", "suggester", "editor", "administrator"];

export function isSampleRole(value: string): value is SampleRole {
  return ROLES.includes(value as SampleRole);
}

export function getDocument(documentId: string): SampleDocument | undefined {
  return DOCUMENTS.find((doc) => doc.id === documentId);
}

export function shareDocument(
  actorId: string,
  documentId: string,
  email: string,
  role: SampleRole,
): SampleDocument {
  const doc = getDocument(documentId);
  if (!doc) throw new Error("Document not found");
  if (doc.members[actorId] !== "administrator") {
    throw new Error("Only an administrator can share this document");
  }
  const target = USERS.find((user) => user.email === email.toLowerCase());
  if (!target) throw new Error("Unknown user in this integrator");
  doc.members[target.id] = role;
  return doc;
}

export function revokeShare(actorId: string, documentId: string, userId: string): SampleDocument {
  const doc = getDocument(documentId);
  if (!doc) throw new Error("Document not found");
  if (doc.members[actorId] !== "administrator") {
    throw new Error("Only an administrator can change sharing");
  }
  if (userId === actorId) throw new Error("Cannot remove your own administrator access");
  delete doc.members[userId];
  return doc;
}

export function membersFor(documentId: string) {
  const doc = getDocument(documentId);
  if (!doc) return [];
  return Object.entries(doc.members).map(([id, role]) => {
    const user = USERS.find((item) => item.id === id);
    return { id, role, name: user?.name ?? id, email: user?.email };
  });
}
