/**
 * YEM360 — Privacy & visibility rules shared by all APIs.
 * Central place so every endpoint enforces the same rules:
 * blocks (two-way), private accounts, post privacy, DM policy.
 */
import { db } from "@/lib/db";

/** Ids the given user has blocked + users who blocked them (two-way silence). */
export async function blockedPairIds(userId: string): Promise<string[]> {
  const rows = await db.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId));
}

export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const block = await db.block.findFirst({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
  });
  return !!block;
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const f = await db.follow.findFirst({
    where: { followerId, followingId, status: "ACCEPTED" },
  });
  return !!f;
}

/** Can viewer see the target's (private-capable) content? owner always true. */
export async function canViewPrivateContent(
  viewerId: string | null,
  target: { id: string; privacySetting?: { privateAccount: boolean } | null }
): Promise<boolean> {
  if (!viewerId) return !target.privacySetting?.privateAccount;
  if (viewerId === target.id) return true;
  if (await isBlockedBetween(viewerId, target.id)) return false;
  if (!target.privacySetting?.privateAccount) return true;
  return isFollowing(viewerId, target.id);
}

/** Prisma where-fragment for "posts visible to viewer". */
export async function visiblePostsWhere(viewerId: string | null) {
  const blocked = viewerId ? await blockedPairIds(viewerId) : [];
  const blockedFilter = blocked.length
    ? { authorId: { notIn: blocked } }
    : {};
  if (!viewerId) {
    return { privacy: "PUBLIC", deletedAt: null, author: { isActive: true, ...blockedFilter } };
  }
  const following = await db.follow.findMany({
    where: { followerId: viewerId, status: "ACCEPTED" },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);
  return {
    deletedAt: null,
    author: { isActive: true, ...blockedFilter },
    OR: [
      { authorId: viewerId },
      { privacy: "PUBLIC" },
      { privacy: "FOLLOWERS", authorId: { in: followingIds } },
    ],
  };
}

/** Who can DM the target according to their privacy settings? */
export async function canMessage(
  senderId: string,
  targetId: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (senderId === targetId) return { allowed: false, reason: "لا يمكنك مراسلة نفسك" };
  const target = await db.user.findUnique({
    where: { id: targetId },
    include: { privacySetting: true },
  });
  if (!target || !target.isActive) return { allowed: false, reason: "الحساب غير متاح" };
  const policy = target.privacySetting?.whoCanMessage ?? "EVERYONE";
  if (policy === "NONE") return { allowed: false, reason: "المستخدم لا يستقبل رسائل جديدة" };
  if (policy === "FOLLOWERS" && !(await isFollowing(senderId, targetId))) {
    return { allowed: false, reason: "المستخدم يستقبل الرسائل من المتابعين فقط" };
  }
  return { allowed: true };
}

/** Parse a single @mention username list from text. */
export function extractMentions(text: string): string[] {
  const names = new Set<string>();
  const re = /(?:^|[^a-zA-Z0-9_@])@([a-zA-Z0-9_]{3,20})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) names.add(m[1].toLowerCase());
  return [...names];
}

export function extractHashtagNames(text: string): string[] {
  const names = new Set<string>();
  const re = /(?:^|\s)#([\p{L}\p{N}_]{2,40})/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) names.add(m[1]);
  return [...names].slice(0, 12);
}
