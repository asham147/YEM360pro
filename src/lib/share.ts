/**
 * YEM360 — share + download helpers (Web Share API with clipboard fallback).
 */
import { toast } from "sonner";
import { t, type Lang } from "./i18n";

export function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).href;
}

export interface SharePayload {
  title?: string;
  text?: string;
  url: string;
}

/**
 * Share via the Web Share API (native sheet on mobile); falls back to
 * copying the link to the clipboard on desktop. Returns what happened so
 * the caller can toast the right message.
 */
export async function shareLink(p: SharePayload, lang: Lang): Promise<"shared" | "copied"> {
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: p.title, text: p.text, url: p.url });
      return "shared";
    }
    await navigator.clipboard.writeText(p.url);
    toast.success(t("link_copied", lang));
    return "copied";
  } catch (e) {
    if ((e as DOMException)?.name === "AbortError") throw e; // user dismissed the sheet
    // clipboard fallback if navigator.share threw
    try {
      await navigator.clipboard.writeText(p.url);
      toast.success(t("link_copied", lang));
      return "copied";
    } catch {
      throw e;
    }
  }
}

/** Trigger a file download — the media route sets Content-Disposition via ?dl=1. */
export function downloadMedia(mediaPath: string, lang: Lang): void {
  const a = document.createElement("a");
  a.href = mediaPath.includes("?") ? `${mediaPath}&dl=1` : `${mediaPath}?dl=1`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast.success(t("download_started", lang));
}
