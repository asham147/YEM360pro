/**
 * YEM360 — Authentication & session management.
 * - bcrypt password hashing (cost 11)
 * - HS256 signed session cookie (httpOnly, SameSite=Lax) bound to a
 *   revocable Login_Sessions row (device tracking + remote logout)
 * - 2FA challenge tokens (typ: "2fa-challenge", 5 min TTL)
 */
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken, verifyToken, randomId } from "./crypto";
import { fail, getIp } from "./api";
import type { User, LoginSession } from "@prisma/client";

const COOKIE_NAME = "yem360_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 30; // 30 days
const CHALLENGE_TTL_SEC = 60 * 5; // 2FA challenge: 5 minutes

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 11);
}
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/* ───────────── user-agent parsing (no dependency) ───────────── */

export function parseUA(ua: string): { browser: string; os: string; device: string } {
  let browser = "متصفح";
  let os = "غير معروف";
  let device = "كمبيوتر";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/chrome\//i.test(ua)) browser = "Chrome";
  else if (/safari\//i.test(ua)) browser = "Safari";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipod/i.test(ua)) os = "iOS";
  else if (/ipad/i.test(ua)) os = "iPadOS";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";
  if (/mobile/i.test(ua)) device = "هاتف";
  else if (/tablet|ipad/i.test(ua)) device = "جهاز لوحي";
  return { browser, os, device };
}

/* ───────────── session lifecycle ───────────── */

export async function createLoginSession(userId: string, req: NextRequest): Promise<string> {
  const jti = randomId(18);
  const ua = req.headers.get("user-agent") || "";
  const { browser, os, device } = parseUA(ua);
  await db.loginSession.create({
    data: {
      userId,
      tokenId: jti,
      browser,
      os,
      device,
      ip: getIp(req).slice(0, 60),
      userAgent: ua.slice(0, 250),
      expiresAt: new Date(Date.now() + SESSION_TTL_SEC * 1000),
    },
  });
  return signToken({ sub: userId, jti, typ: "session" }, SESSION_TTL_SEC);
}

/**
 * true when the request really arrived over HTTPS — either terminated by Next
 * itself or forwarded by a reverse proxy (Caddy sets x-forwarded-proto).
 *
 * The session cookie MUST only carry the `Secure` flag in that case: on plain
 * HTTP deployments (LAN IP, phone, http domain) browsers silently drop Secure
 * cookies, which breaks login right after a successful POST (profile and every
 * authenticated API then answer 401 "يجب تسجيل الدخول أولاً").
 */
export function isSecureRequest(req: NextRequest): boolean {
  if (req.nextUrl.protocol === "https:") return true;
  const fwd = req.headers.get("x-forwarded-proto");
  return !!fwd && fwd.split(",")[0]?.trim() === "https";
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure,
    maxAge: SESSION_TTL_SEC,
    path: "/",
  };
}

export async function setSessionCookie(req: NextRequest, token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, sessionCookieOptions(isSecureRequest(req)));
}

export async function clearSessionCookie(req?: NextRequest): Promise<void> {
  const store = await cookies();
  // match the flags the browser originally stored so deletion always succeeds
  store.set(COOKIE_NAME, "", { ...sessionCookieOptions(req ? isSecureRequest(req) : false), maxAge: 0 });
}

export interface AuthContext {
  user: User;
  session: LoginSession;
}

export async function getAuth(): Promise<AuthContext | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  const payload = verifyToken(token);
  if (!payload || payload.typ !== "session") return null;

  const session = await db.loginSession.findUnique({ where: { tokenId: payload.jti } });
  if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) return null;

  const user = await db.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) return null;

  // throttle: refresh lastSeenAt at most once per minute
  const now = Date.now();
  if (now - session.lastSeenAt.getTime() > 60_000) {
    await Promise.all([
      db.loginSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }),
      db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } }).catch(() => null),
    ]);
  }
  return { user, session };
}

/** Route guard: returns { ctx } or { resp: 401 }. */
export async function authGuard(): Promise<
  { ctx: AuthContext; resp: null } | { ctx: null; resp: NextResponse }
> {
  const ctx = await getAuth();
  if (!ctx) return { ctx: null, resp: fail(401, "UNAUTHENTICATED", "يجب تسجيل الدخول أولاً") };
  return { ctx, resp: null };
}

/** Admin/moderator guard (use after authGuard). */
export function roleGuard(
  ctx: AuthContext,
  respForAuth: NextResponse | null,
  roles: ("ADMIN" | "MODERATOR")[]
): NextResponse | null {
  if (respForAuth) return respForAuth;
  if (!roles.includes(ctx.user.role as "ADMIN" | "MODERATOR")) {
    return fail(403, "FORBIDDEN", "لا تملك صلاحية الوصول لهذا الإجراء");
  }
  return null;
}

/** Combined auth + admin/moderator guard: narrows ctx after `if (g.resp) return g.resp;`. */
export async function requireRole(
  roles: ("ADMIN" | "MODERATOR")[]
): Promise<{ ctx: AuthContext; resp: null } | { ctx: null; resp: NextResponse }> {
  const g = await authGuard();
  if (g.resp) return { ctx: null, resp: g.resp };
  if (!roles.includes(g.ctx.user.role as "ADMIN" | "MODERATOR")) {
    return { ctx: null, resp: fail(403, "FORBIDDEN", "لا تملك صلاحية الوصول لهذا الإجراء") };
  }
  return { ctx: g.ctx, resp: null };
}

/** Short-lived token between password step and TOTP step of 2FA login. */
export function createChallengeToken(userId: string): string {
  return signToken({ sub: userId, jti: randomId(12), typ: "2fa-challenge" }, CHALLENGE_TTL_SEC);
}
export function verifyChallengeToken(token: string | undefined | null): string | null {
  const payload = verifyToken(token);
  if (!payload || payload.typ !== "2fa-challenge") return null;
  return payload.sub;
}
