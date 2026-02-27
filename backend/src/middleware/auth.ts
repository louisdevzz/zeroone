import type { Request, Response, NextFunction } from "express";
import { verifyToken, createClerkClient } from "@clerk/backend";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    clerkId: string;
    email: string;
  };
}

// Alias for backwards compatibility
export const requireAuth = authenticate;

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Missing authorization token" });
    return;
  }

  const token = header.slice(7);

  try {
    // Verify Clerk JWT
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      audience: process.env.CLERK_JWT_AUDIENCE,
      issuer: process.env.CLERK_JWT_ISSUER,
      clockSkewInMs: 10_000, // tolerate up to 10s clock drift
    });

    if (!payload.sub) {
      res.status(401).json({ success: false, error: "Invalid token payload" });
      return;
    }

    const clerkId = payload.sub;

    // Find user in database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    if (!user) {
      // User exists in Clerk but not in our DB yet (webhook may not have fired)
      // Auto-create from Clerk profile
      try {
        const clerkUser = await clerk.users.getUser(clerkId);
        const primaryEmail = clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId
        )?.emailAddress;

        if (!primaryEmail) {
          res.status(401).json({ success: false, error: "No email on Clerk account." });
          return;
        }

        const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

        const [created] = await db
          .insert(users)
          .values({ clerkId, email: primaryEmail, name, avatar: clerkUser.imageUrl ?? null, password: null })
          .onConflictDoUpdate({ target: users.email, set: { clerkId, name, avatar: clerkUser.imageUrl ?? null, updatedAt: new Date() } })
          .returning();

        req.user = { userId: created.id, clerkId, email: created.email };
        console.log(`[auth] Auto-created user ${created.id} for Clerk ID ${clerkId}`);
        next();
        return;
      } catch (syncErr) {
        console.error("[auth] Failed to auto-create user:", syncErr);
        res.status(401).json({ success: false, error: "User not found. Please sign in again." });
        return;
      }
    }

    req.user = {
      userId: user.id,
      clerkId,
      email: user.email,
    };

    next();
  } catch (err) {
    console.error("[auth] Token verification failed:", err);
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}
