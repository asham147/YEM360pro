/**
 * YEM360 — Security event log (سجل الأحداث الأمنية).
 * Everything security-relevant is persisted to Security_Events for the
 * Activity Center / admin dashboard.
 */
import { db } from "@/lib/db";

type Severity = "INFO" | "WARN" | "HIGH";

export async function logSecurity(
  type: string,
  opts: {
    userId?: string | null;
    severity?: Severity;
    ip?: string | null;
    userAgent?: string | null;
    details?: string | null;
  } = {}
) {
  try {
    await db.securityEvent.create({
      data: {
        type,
        userId: opts.userId ?? undefined,
        severity: opts.severity ?? "INFO",
        ip: opts.ip ?? undefined,
        userAgent: opts.userAgent?.slice(0, 250) ?? undefined,
        details: opts.details?.slice(0, 500) ?? undefined,
      },
    });
  } catch (e) {
    // never let logging break the request
    console.error("[security-log]", type, e);
  }
}
