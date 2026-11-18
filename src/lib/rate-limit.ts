/**
 * YEM360 — In-memory sliding-window rate limiter.
 * Suitable for a single-node deployment (the documented architecture).
 * Key examples: "login:1.2.3.4", "register:1.2.3.4", "post:create:<userId>".
 */

const buckets = new Map<string, number[]>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (buckets.size < 4000) return;
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, stamps] of buckets) {
    const alive = stamps.filter((t) => now - t < 15 * 60_000);
    if (alive.length === 0) buckets.delete(key);
    else buckets.set(key, alive);
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number; remaining: number } {
  const now = Date.now();
  sweep(now);
  const stamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (stamps.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - stamps[0])) / 1000);
    buckets.set(key, stamps);
    return { allowed: false, retryAfterSec: Math.max(1, retryAfter), remaining: 0 };
  }
  stamps.push(now);
  buckets.set(key, stamps);
  return { allowed: true, retryAfterSec: 0, remaining: limit - stamps.length };
}
