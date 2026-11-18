/**
 * YEM360 — Hashtag syncing for posts (extract → upsert → link).
 */
import { db } from "@/lib/db";
import { extractHashtagNames } from "./privacy";

export async function syncPostHashtags(postId: string, text: string): Promise<void> {
  const names = extractHashtagNames(text);
  await db.postHashtag.deleteMany({ where: { postId } });
  if (!names.length) return;
  for (const name of names) {
    const tag = await db.hashtag.upsert({
      where: { name },
      update: { useCount: { increment: 1 }, lastUsedAt: new Date() },
      create: { name, useCount: 1, lastUsedAt: new Date() },
    });
    await db.postHashtag.create({ data: { postId, hashtagId: tag.id } });
  }
}

export async function removePostHashtags(postId: string): Promise<void> {
  const links = await db.postHashtag.findMany({ where: { postId }, include: { hashtag: true } });
  for (const link of links) {
    await db.hashtag.update({
      where: { id: link.hashtagId },
      data: { useCount: { decrement: 1 } },
    });
  }
  await db.postHashtag.deleteMany({ where: { postId } });
}
