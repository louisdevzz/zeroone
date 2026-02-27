import { Router, raw } from "express";
import { Webhook } from "svix";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { sendLoginNotification } from "../services/resend.service";

const router = Router();

// Raw body is needed for webhook signature verification
router.use(raw({ type: "application/json" }));

// ── POST /api/webhooks/clerk ───────────────────────────────────

router.post("/clerk", async (req, res) => {
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!SIGNING_SECRET) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET not set");
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  // Get headers
  const svix_id = req.headers["svix-id"] as string;
  const svix_timestamp = req.headers["svix-timestamp"] as string;
  const svix_signature = req.headers["svix-signature"] as string;

  // If headers are missing, return error
  if (!svix_id || !svix_timestamp || !svix_signature) {
    res.status(400).json({ error: "Missing Svix headers" });
    return;
  }

  // Create webhook instance
  const wh = new Webhook(SIGNING_SECRET);

  let evt: {
    type: string;
    data: {
      id: string;
      email_addresses?: Array<{ email_address: string; id: string }>;
      primary_email_address_id?: string;
      first_name?: string;
      last_name?: string;
      image_url?: string;
      created_at?: number;
      updated_at?: number;
    };
  };

  // Verify webhook
  try {
    evt = wh.verify(req.body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as typeof evt;
  } catch (err) {
    console.error("[clerk-webhook] Verification failed:", err);
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  const eventType = evt.type;
  const { id: clerkId, ...data } = evt.data;

  console.log(`[clerk-webhook] Received ${eventType} for user ${clerkId}`);

  try {
    switch (eventType) {
      case "user.created": {
        // Extract user data
        const primaryEmail = data.email_addresses?.find(
          (e) => e.id === data.primary_email_address_id
        )?.email_address;

        if (!primaryEmail) {
          console.error("[clerk-webhook] No primary email found");
          res.status(400).json({ error: "No primary email" });
          return;
        }

        const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

        // Check if user already exists by email
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.email, primaryEmail))
          .limit(1);

        if (existing) {
          // Update existing user with Clerk ID
          await db
            .update(users)
            .set({
              clerkId,
              name: name ?? existing.name,
              avatar: data.image_url ?? existing.avatar,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existing.id));
          console.log(`[clerk-webhook] Updated existing user ${existing.id} with Clerk ID`);
        } else {
          // Create new user
          await db.insert(users).values({
            clerkId,
            email: primaryEmail,
            name,
            avatar: data.image_url ?? null,
            password: null, // Clerk handles auth
            googleId: null,
          });
          console.log(`[clerk-webhook] Created new user with Clerk ID ${clerkId}`);
        }

        res.json({ success: true, message: "User synced" });
        break;
      }

      case "user.updated": {
        const primaryEmail = data.email_addresses?.find(
          (e) => e.id === data.primary_email_address_id
        )?.email_address;

        const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

        // Find user by Clerk ID
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.clerkId, clerkId))
          .limit(1);

        if (existing) {
          await db
            .update(users)
            .set({
              email: primaryEmail ?? existing.email,
              name: name ?? existing.name,
              avatar: data.image_url ?? existing.avatar,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existing.id));
          console.log(`[clerk-webhook] Updated user ${existing.id}`);
        }

        res.json({ success: true, message: "User updated" });
        break;
      }

      case "user.deleted": {
        // Find and delete user
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.clerkId, clerkId))
          .limit(1);

        if (existing) {
          await db.delete(users).where(eq(users.id, existing.id));
          console.log(`[clerk-webhook] Deleted user ${existing.id}`);
        }

        res.json({ success: true, message: "User deleted" });
        break;
      }

      case "session.created": {
        // Send login notification email
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.clerkId, clerkId))
          .limit(1);

        if (user) {
          // Get IP and user agent from request if available
          const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
          const userAgent = req.headers["user-agent"];

          await sendLoginNotification(user.email, user.name ?? "User", {
            ...(typeof ip === "string" ? { ip } : {}),
            ...(userAgent ? { userAgent } : {}),
            timestamp: new Date(),
          });
        }

        res.json({ success: true, message: "Login notification sent" });
        break;
      }

      default:
        console.log(`[clerk-webhook] Unhandled event type: ${eventType}`);
        res.json({ success: true, message: "Event ignored" });
    }
  } catch (err) {
    console.error("[clerk-webhook] Error processing webhook:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
