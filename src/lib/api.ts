/**
 * YEM360 — API helpers: unified JSON responses, CSRF origin check, IP extraction.
 */
import { NextRequest, NextResponse } from "next/server";
import { ZodError, ZodType } from "zod";

export function ok<T extends object>(data: T = {} as T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function fail(
  status: number,
  code: string,
  message?: string,
  extra?: object
) {
  return NextResponse.json(
    { ok: false, error: code, message: message ?? code, ...(extra ?? {}) },
    { status }
  );
}

export function getIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

/**
 * CSRF layer 2: verifies the request really comes from our own frontend.
 *
 * 2a) Sec-Fetch-Site — every modern browser attaches it to its own API calls
 *     and JS is forbidden from forging it, so it is the most reliable signal
 *     and immune to reverse-proxy Host rewriting. "same-origin", "same-site"
 *     and "none" are accepted (same policy as Django 4+), "cross-site" is
 *     rejected outright.
 * 2b) Origin — compared against every host candidate the server could be
 *     reached as (x-forwarded-host, host, request URL), with a hostname-only
 *     fallback for proxies that rewrite the port.
 * 2c) Referer — last fallback for old browsers without Sec-Fetch-Site.
 * Layer 1 is SameSite=Lax cookies.
 */
export function sameOrigin(req: NextRequest): boolean {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite) {
    return fetchSite === "same-origin" || fetchSite === "same-site" || fetchSite === "none";
  }

  const candidates = new Set<string>();
  const fwdHost = req.headers.get("x-forwarded-host");
  if (fwdHost) fwdHost.split(",").forEach((h) => h.trim() && candidates.add(h.trim()));
  const host = req.headers.get("host");
  if (host) candidates.add(host.trim());
  try {
    candidates.add(new URL(req.url).host);
  } catch {
    /* ignore */
  }
  // also accept hostname-only matches (proxy may strip/add the port)
  for (const h of [...candidates]) {
    try {
      candidates.add(new URL(`http://${h}`).hostname);
    } catch {
      /* ignore */
    }
  }

  const matches = (raw: string): boolean => {
    try {
      const u = new URL(raw);
      return candidates.has(u.host) || candidates.has(u.hostname);
    } catch {
      return false;
    }
  };

  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser client (curl / tests) — cookie SameSite still applies
  if (matches(origin)) return true;

  const referer = req.headers.get("referer");
  if (referer && matches(referer)) return true;

  return false;
}

/** Parse + validate a JSON body with zod. Returns a ready-made error response on failure. */
export async function readJson<T>(
  req: NextRequest,
  schema: ZodType<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { data: null, error: fail(400, "INVALID_JSON", "صيغة الطلب غير صالحة") };
  }
  try {
    return { data: schema.parse(raw), error: null };
  } catch (e) {
    if (e instanceof ZodError) {
      const first = e.issues[0];
      return {
        data: null,
        error: fail(422, "VALIDATION", `تحقق من المدخلات: ${first?.path.join(".") || ""} ${first?.message || ""}`.trim()),
      };
    }
    return { data: null, error: fail(400, "BAD_REQUEST") };
  }
}

/** Standard try/catch wrapper for route handlers. */
export function handler<Args extends unknown[]>(
  fn: (req: NextRequest, ...args: Args) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: Args): Promise<NextResponse> => {
    try {
      return await fn(req, ...args);
    } catch (e) {
      console.error("[api-error]", req.method, req.nextUrl.pathname, e);
      return fail(500, "SERVER_ERROR", "حدث خطأ غير متوقع في الخادم");
    }
  };
}
