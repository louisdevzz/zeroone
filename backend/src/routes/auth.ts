import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { verifyIdToken } from "../services/firebase.service";

const router = Router();

// ── Schemas ────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const googleSchema = z.object({
  idToken: z.string().min(1, "Firebase ID token is required"),
});

// ── Helpers ────────────────────────────────────────────────────

function signToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.sign({ userId, email }, secret, { expiresIn: "7d" });
}

function safeUser(u: typeof users.$inferSelect) {
  return { id: u.id, email: u.email, name: u.name, avatar: u.avatar, plan: u.plan };
}

// ── POST /api/auth/register ────────────────────────────────────

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { email, password, name } = parsed.data;

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ success: false, error: "Email already in use" });
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(users)
    .values({ email, password: hashed, name })
    .returning();

  const token = signToken(user.id, user.email);
  res.status(201).json({ success: true, data: { user: safeUser(user), token } });
});

// ── POST /api/auth/login ───────────────────────────────────────

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !user.password) {
    // No password = Google-only account
    res.status(401).json({ success: false, error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ success: false, error: "Invalid credentials" });
    return;
  }

  const token = signToken(user.id, user.email);
  res.json({ success: true, data: { user: safeUser(user), token } });
});

// ── POST /api/auth/google ── Firebase ID token ─────────────────
//
// Flow:
//   1. Client signs in with Google via Firebase SDK → receives idToken
//   2. Client sends POST /api/auth/google { idToken }
//   3. Backend verifies token with Firebase Admin SDK
//   4. Find-or-create user by googleId (or email fallback)
//   5. Return { user, token } (our own JWT)

router.post("/google", async (req, res) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  // Verify ID token with Firebase Admin
  let firebaseUser: Awaited<ReturnType<typeof verifyIdToken>>;
  try {
    firebaseUser = await verifyIdToken(parsed.data.idToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token verification failed";
    res.status(401).json({ success: false, error: message });
    return;
  }

  const { uid, email, name, picture } = firebaseUser;

  // Look up existing user by googleId OR email (account linking)
  const [existing] = await db
    .select()
    .from(users)
    .where(or(eq(users.googleId, uid), eq(users.email, email)))
    .limit(1);

  let user: typeof users.$inferSelect;

  if (existing) {
    // Update googleId + avatar if missing (first time linking Google to email account)
    if (!existing.googleId || !existing.avatar) {
      const [updated] = await db
        .update(users)
        .set({
          googleId: existing.googleId ?? uid,
          avatar: existing.avatar ?? picture ?? null,
          name: existing.name ?? name ?? null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
      user = updated;
    } else {
      user = existing;
    }
  } else {
    // New user — create without password
    const [created] = await db
      .insert(users)
      .values({
        email,
        googleId: uid,
        name: name ?? null,
        avatar: picture ?? null,
        password: null,
      })
      .returning();
    user = created;
  }

  const token = signToken(user.id, user.email);
  res.json({ success: true, data: { user: safeUser(user), token } });
});

// ── GET /api/auth/me ───────────────────────────────────────────

router.get("/me", async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Missing token" });
    return;
  }
  try {
    const secret = process.env.JWT_SECRET!;
    const payload = jwt.verify(header.slice(7), secret) as { userId: string };
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }
    res.json({ success: true, data: safeUser(user) });
  } catch {
    res.status(401).json({ success: false, error: "Invalid token" });
  }
});

export default router;
