"use client";
/**
 * YEM360 — API client with unified error handling + upload helper.
 */
import type { Lang } from "./i18n";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  formData?: FormData
): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: formData ? undefined : { "Content-Type": "application/json" },
    body: formData ? formData : body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok || data.ok === false) {
    throw new ApiError(
      res.status,
      String(data.error || "ERROR"),
      String(data.message || "حدث خطأ، حاول مرة أخرى")
    );
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body),
  upload: async <T>(path: string, formData: FormData): Promise<T> =>
    request<T>("POST", path, undefined, formData),
};

export async function uploadFile(file: File, kind: string): Promise<{ media: { url: string; type: string; width?: number; height?: number } }> {
  return uploadFileWithProgress(file, kind);
}

export type UploadMedia = { media: { url: string; type: string; width?: number; height?: number; size?: number } };

/**
 * Upload with real progress events (XHR) — used for large files (reels up to
 * 60MB) so the UI can show a live percentage instead of an endless spinner.
 */
export function uploadFileWithProgress(
  file: File,
  kind: string,
  onProgress?: (pct: number) => void
): Promise<UploadMedia> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media/upload");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      const data = (xhr.response || {}) as Record<string, unknown>;
      if (xhr.status >= 200 && xhr.status < 300 && data.ok !== false) {
        onProgress?.(100);
        resolve(data as UploadMedia);
      } else {
        reject(new ApiError(xhr.status, String(data.error || "ERROR"), String(data.message || "حدث خطأ أثناء الرفع، حاول مرة أخرى")));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, "NETWORK", "تعذر الاتصال بالخادم، تحقق من الإنترنت"));
    xhr.ontimeout = () => reject(new ApiError(0, "TIMEOUT", "استغرق الرفع وقتاً طويلاً، حاول مرة أخرى"));
    xhr.send(fd);
  });
}

export const MEDIA_LIMITS = { imageMB: 8, videoMB: 60 } as const;

/**
 * Client-side pre-validation (server still re-validates with magic bytes).
 * Returns null when the file is acceptable, otherwise a localized message.
 */
export function validateMediaFile(file: File, lang: "ar" | "en"): string | null {
  const isVideo = file.type.startsWith("video/");
  const capMB = isVideo ? MEDIA_LIMITS.videoMB : MEDIA_LIMITS.imageMB;
  if (file.size > capMB * 1024 * 1024) {
    return lang === "ar"
      ? `حجم الملف كبير جداً (${(file.size / 1024 / 1024).toFixed(1)}MB) — الحد الأقصى ${capMB}MB`
      : `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB) — max ${capMB}MB`;
  }
  const allowed = isVideo ? ["video/mp4", "video/webm"] : ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return lang === "ar"
      ? `صيغة غير مدعومة (${file.type || "غير معروفة"}) — المسموح: ${isVideo ? "MP4, WEBM" : "JPG, PNG, WEBP, GIF"}`
      : `Unsupported format (${file.type || "unknown"}) — allowed: ${isVideo ? "MP4, WEBM" : "JPG, PNG, WEBP, GIF"}`;
  }
  return null;
}

export function timeAgo(iso: string, lang: Lang): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (lang === "ar") {
    if (min < 1) return "الآن";
    if (min < 60) return `منذ ${min} د`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `منذ ${hr} س`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `منذ ${day} ي`;
    return d.toLocaleDateString("ar", { day: "numeric", month: "short" });
  }
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return d.toLocaleDateString("en", { day: "numeric", month: "short" });
}

export function fmtNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}
