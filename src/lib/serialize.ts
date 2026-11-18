/**
 * YEM360 — Shared serializers. Never expose passwordHash / 2FA secret.
 */
import type { User, Profile } from "@prisma/client";

export interface PublicUser {
  id: string;
  username: string;
  name: string;
  accountType: string;
  isVerified: boolean;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  bio?: string | null;
  website?: string | null;
  location?: string | null;
  createdAt?: string;
  professionalCategory?: string | null;
  role?: string;
  email?: string;
}

export function publicUser(u: User, p?: Profile | null, opts?: { self?: boolean }): PublicUser {
  const base: PublicUser = {
    id: u.id,
    username: u.username,
    name: u.name,
    accountType: u.accountType,
    isVerified: u.isVerified,
    avatarUrl: p?.avatarUrl ?? null,
    coverUrl: p?.coverUrl ?? null,
    bio: p?.bio ?? null,
    website: p?.website ?? null,
    location: p?.location ?? null,
    professionalCategory: u.professionalCategory ?? null,
  };
  if (opts?.self) {
    base.email = u.email;
    base.role = u.role;
    base.createdAt = u.createdAt.toISOString();
  }
  return base;
}

export function relativeTimeAr(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return `منذ ${min} د`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${hr} س`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `منذ ${day} ي`;
  return d.toLocaleDateString("ar", { day: "numeric", month: "short" });
}
