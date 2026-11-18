/**
 * YEM360 — Notifications + realtime bridge.
 * Realtime events reach the socket.io mini-service via an authenticated
 * internal HTTP endpoint (server-to-server, shared secret) — the REST API
 * stays the single source of truth; sockets only push.
 */
import { db } from "@/lib/db";

const REALTIME_URL = process.env.REALTIME_URL || "http://127.0.0.1:3004/internal/emit";

export async function internalEmit(
  event: string,
  payload: unknown,
  opts: { userIds?: string[]; rooms?: string[] } = {}
): Promise<void> {
  try {
    await fetch(REALTIME_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": process.env.INTERNAL_SECRET || "",
      },
      body: JSON.stringify({ event, payload, ...opts }),
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // realtime is best-effort; REST remains authoritative
  }
}

type NotifyType =
  | "LIKE" | "COMMENT" | "COMMENT_REPLY" | "FOLLOW" | "FRIEND_REQUEST" | "FRIEND_ACCEPT"
  | "MENTION" | "MESSAGE" | "CHANNEL_POST" | "SYSTEM" | "ORDER" | "PRODUCT_SOLD";

const PREF_KEY: Record<string, "notifyLikes" | "notifyComments" | "notifyFollows" | "notifyMessages"> = {
  LIKE: "notifyLikes",
  COMMENT: "notifyComments",
  COMMENT_REPLY: "notifyComments",
  MENTION: "notifyComments",
  FOLLOW: "notifyFollows",
  FRIEND_REQUEST: "notifyFollows",
  FRIEND_ACCEPT: "notifyFollows",
  MESSAGE: "notifyMessages",
};

export interface NotifyInput {
  userId: string; // recipient
  actorId?: string;
  type: NotifyType;
  entityType?: string;
  entityId?: string;
  text?: string;
}

export async function notify(input: NotifyInput): Promise<boolean> {
  if (input.actorId && input.actorId === input.userId) return false; // no self-notify

  const settings = await db.userSetting.findUnique({ where: { userId: input.userId } });
  const pref = PREF_KEY[input.type];
  if (settings && pref && !settings[pref]) return false;

  // never notify through a block relationship
  if (input.actorId) {
    const block = await db.block.findFirst({
      where: {
        OR: [
          { blockerId: input.userId, blockedId: input.actorId },
          { blockerId: input.actorId, blockedId: input.userId },
        ],
      },
    });
    if (block) return false;
  }

  const notification = await db.notification.create({ data: input });

  // push in realtime
  await internalEmit("notification:new", { notification }, { userIds: [input.userId] });
  return true;
}

export async function notifyMany(inputs: NotifyInput[]): Promise<void> {
  await Promise.all(inputs.map((n) => notify(n).catch(() => null)));
}
