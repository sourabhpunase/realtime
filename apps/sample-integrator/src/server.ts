import { createReadStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createServer as createViteServer } from "vite";
import { Realtime } from "@realtime/node";
import {
  USERS,
  canAccessDocument,
  documentsFor,
  getDocument,
  isSampleRole,
  membersFor,
  permissionsFor,
  publicUser,
  revokeShare,
  shareDocument,
  verifyUser,
} from "./users.js";
import { clearSessionCookie, readSession, sessionCookie, signSession } from "./session.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sessionSecret = process.env.SAMPLE_SESSION_SECRET ?? "dev-sample-session";
const port = Number(process.env.SAMPLE_PORT ?? 4000);

const realtime = new Realtime({
  secretKey: process.env.REALTIME_SECRET_KEY ?? "sk_test_sample_local_dev_only_rotate",
  endpoint: process.env.REALTIME_API_URL ?? "http://localhost:3080",
});

function currentUser(req: express.Request) {
  const userId = readSession(req.header("cookie"), sessionSecret);
  return USERS.find((user) => user.id === userId) ?? null;
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

app.post("/auth/login", (req, res) => {
  const email = String(req.body?.email ?? "").toLowerCase().trim();
  const password = String(req.body?.password ?? "");
  const user = verifyUser(email, password);
  if (!user) {
    res.status(401).json({ error: { message: "Invalid email or password" } });
    return;
  }
  res.setHeader("Set-Cookie", sessionCookie(signSession(user.id, sessionSecret)));
  res.json({ user: publicUser(user) });
});

app.post("/auth/logout", (_req, res) => {
  res.setHeader("Set-Cookie", clearSessionCookie());
  res.json({ ok: true });
});

app.get("/auth/me", (req, res) => {
  const user = currentUser(req);
  if (!user) {
    res.status(401).json({ error: { message: "Not signed in" } });
    return;
  }
  res.json({ user: publicUser(user) });
});

app.get("/documents", (req, res) => {
  const user = currentUser(req);
  if (!user) {
    res.status(401).json({ error: { message: "Not signed in" } });
    return;
  }
  res.json({ documents: documentsFor(user.id) });
});

app.get("/directory", (req, res) => {
  const user = currentUser(req);
  if (!user) {
    res.status(401).json({ error: { message: "Not signed in" } });
    return;
  }
  res.json({ users: USERS.map(publicUser) });
});

app.get("/documents/:id", (req, res) => {
  const user = currentUser(req);
  if (!user) {
    res.status(401).json({ error: { message: "Not signed in" } });
    return;
  }
  const id = decodeURIComponent(req.params.id);
  if (!canAccessDocument(user.id, id)) {
    res.status(403).json({ error: { message: "You cannot access this document" } });
    return;
  }
  const doc = getDocument(id);
  res.json({
    document: doc,
    members: membersFor(id),
    role: doc?.members[user.id],
  });
});

app.post("/documents/:id/share", (req, res) => {
  const user = currentUser(req);
  if (!user) {
    res.status(401).json({ error: { message: "Not signed in" } });
    return;
  }
  const id = decodeURIComponent(req.params.id);
  const email = String(req.body?.email ?? "").toLowerCase().trim();
  const role = String(req.body?.role ?? "");
  if (!isSampleRole(role)) {
    res.status(400).json({ error: { message: "Unknown role" } });
    return;
  }
  try {
    const doc = shareDocument(user.id, id, email, role);
    res.json({ document: doc, members: membersFor(id) });
  } catch (error) {
    res.status(403).json({ error: { message: error instanceof Error ? error.message : "Share failed" } });
  }
});

app.delete("/documents/:id/members/:userId", (req, res) => {
  const user = currentUser(req);
  if (!user) {
    res.status(401).json({ error: { message: "Not signed in" } });
    return;
  }
  const id = decodeURIComponent(req.params.id);
  try {
    const doc = revokeShare(user.id, id, req.params.userId);
    res.json({ document: doc, members: membersFor(id) });
  } catch (error) {
    res.status(403).json({ error: { message: error instanceof Error ? error.message : "Revoke failed" } });
  }
});

app.post("/api/realtime/token", async (req, res) => {
  const user = currentUser(req);
  if (!user) {
    res.status(401).json({ error: { message: "Not signed in" } });
    return;
  }
  const roomId = String(req.body?.roomId ?? "");
  if (!canAccessDocument(user.id, roomId)) {
    res.status(403).json({ error: { message: "You cannot access this document" } });
    return;
  }
  const permissions = permissionsFor(user.id, roomId);
  await realtime.rooms.ensure({ id: roomId });
  const issued = await realtime.identify({
    user: { id: user.id, name: user.name },
    room: roomId,
    permissions,
  });
  res.json(issued);
});

if (process.env.NODE_ENV === "production") {
  const dist = join(root, "dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => {
    createReadStream(join(dist, "index.html")).pipe(res);
  });
} else {
  const vite = await createViteServer({
    root: join(root, "web"),
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

app.listen(port, () => {
  console.log(`Sample integrator on http://localhost:${port}`);
  console.log("Users: alice@example.com / alice-pass-1  and  bob@example.com / bob-pass-1");
});
