/**
 * YEM360 — Content moderation: banned-words filter with a short-lived cache.
 * Applied to posts, comments, messages, stories, reels, products and ads.
 */
import { db } from "@/lib/db";

let cache: { words: string[]; at: number } | null = null;
const TTL = 60_000;

async function getWords(): Promise<string[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.words;
  const rows = await db.bannedWord.findMany({ select: { word: true } });
  cache = { words: rows.map((r) => r.word.toLowerCase()), at: Date.now() };
  return cache.words;
}

/** Returns matched banned words (empty array = clean). */
export async function checkText(text: string): Promise<string[]> {
  const words = await getWords();
  if (!words.length || !text) return [];
  const normalized = text.toLowerCase();
  const matched: string[] = [];
  for (const w of words) {
    if (w && normalized.includes(w)) matched.push(w);
  }
  return matched;
}

export function invalidateBannedWordsCache() {
  cache = null;
}
