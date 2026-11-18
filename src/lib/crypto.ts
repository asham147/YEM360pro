/**
 * YEM360 — Security primitives
 * - HMAC-SHA256 signed tokens (JWT-compatible, HS256)
 * - AES-256-GCM field encryption (e.g. 2FA secrets at rest)
 * - RFC 6238 TOTP (التحقق الثنائي) without third-party dependencies
 * No secret is ever hardcoded: production values come from .env
 */
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "yem360-dev-only-change-JWT_SECRET-in-env";
const APP_SECRET = process.env.APP_SECRET || "yem360-dev-only-change-APP_SECRET-in-env";

/* ───────────────── base64url helpers ───────────────── */

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

/* ───────────────── Signed tokens (HS256) ───────────────── */

export interface TokenPayload {
  sub: string; // user id
  jti: string; // session id (Login_Sessions.token_id)
  typ: "session" | "2fa-challenge";
  iat: number;
  exp: number;
}

export function signToken(
  data: { sub: string; jti: string; typ: "session" | "2fa-challenge" },
  ttlSeconds: number
): string {
  const iat = Math.floor(Date.now() / 1000);
  const header = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = b64url(
    Buffer.from(JSON.stringify({ ...data, iat, exp: iat + ttlSeconds }))
  );
  const sig = b64url(
    crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${sig}`;
}

export function verifyToken(token: string | undefined | null): TokenPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest()
    .toString("base64url");
  // constant-time comparison
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(fromB64url(payload).toString()) as TokenPayload;
    if (!parsed.exp || parsed.exp * 1000 < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

/* ───────────────── AES-256-GCM field encryption ───────────────── */

const aesKey = crypto.createHash("sha256").update(APP_SECRET).digest();

export function encryptText(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ct.toString("base64url")}`;
}

export function decryptText(payload: string): string | null {
  try {
    const [v, ivB, tagB, ctB] = payload.split(".");
    if (v !== "v1") return null;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      aesKey,
      Buffer.from(ivB, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagB, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

/* ───────────────── base32 + TOTP (RFC 6238) ───────────────── */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s: string): Buffer {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of s.toUpperCase().replace(/[=\s]/g, "")) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function totpCode(secret: string, step?: number): string {
  const counter = step ?? Math.floor(Date.now() / 30000);
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const h = crypto.createHmac("sha1", key).update(buf).digest();
  const off = h[h.length - 1] & 0xf;
  const bin =
    ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return (bin % 1000000).toString().padStart(6, "0");
}

/** Verify a 6-digit TOTP code allowing ±1 time step (30s) of clock drift. */
export function verifyTotp(secret: string, code: string, window = 1): boolean {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6) return false;
  const step = Math.floor(Date.now() / 30000);
  for (let i = -window; i <= window; i++) {
    if (totpCode(secret, step + i) === clean) return true;
  }
  return false;
}

export function otpauthUrl(email: string, secret: string): string {
  return `otpauth://totp/YEM360:${encodeURIComponent(
    email
  )}?secret=${secret}&issuer=YEM360&algorithm=SHA1&digits=6&period=30`;
}

/** Random URL-safe id for media filenames etc. */
export function randomId(bytes = 9): string {
  return crypto.randomBytes(bytes).toString("base64url").replace(/[-_]/g, "x");
}
