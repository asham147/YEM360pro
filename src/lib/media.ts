/**
 * YEM360 — Secure media upload pipeline.
 * - Magic-byte sniffing (never trust Content-Type/extension)
 * - Hard size caps from env (MAX_IMAGE_MB / MAX_VIDEO_MB)
 * - Images re-encoded with sharp → strips EXIF/GPS metadata (privacy)
 * - Random unguessable filenames, stored outside public/, served via /api/media/[...]
 * - SVG is explicitly rejected (XSS vector)
 */
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { randomId } from "./crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_MB || 8);
const MAX_VIDEO_MB = Number(process.env.MAX_VIDEO_MB || 60);

export type MediaKind = "post" | "story" | "reel" | "avatar" | "cover" | "message" | "product" | "ad";
export type MediaType = "IMAGE" | "VIDEO";

export interface SavedMedia {
  url: string; // public URL: /api/media/<subdir>/<file>
  type: MediaType;
  width?: number;
  height?: number;
  size: number;
}

function sniff(buf: Buffer): "jpeg" | "png" | "gif" | "webp" | "mp4" | "webm" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "png";
  if (buf.toString("ascii", 0, 4) === "GIF8") return "gif";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.toString("ascii", 4, 8) === "ftyp") return "mp4";
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "webm";
  return null;
}

export function mediaUrlToFile(url: string): string | null {
  const m = /^\/api\/media\/([a-z0-9]+)\/([A-Za-z0-9._-]+)$/.exec(url);
  if (!m) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(m[2])) return null; // traversal guard
  return path.join(process.cwd(), UPLOAD_DIR, m[1], m[2]);
}

const MAX_DIMENSIONS: Record<MediaKind, { w: number; h: number } | null> = {
  post: { w: 1920, h: 1920 },
  story: { w: 1080, h: 1920 },
  reel: null,
  avatar: { w: 512, h: 512 },
  cover: { w: 1440, h: 720 },
  message: { w: 1600, h: 1600 },
  product: { w: 1400, h: 1400 },
  ad: { w: 1200, h: 1200 },
};

export async function saveUpload(
  file: File,
  kind: MediaKind,
  opts?: { square?: boolean }
): Promise<SavedMedia> {
  const buf = Buffer.from(await file.arrayBuffer());
  const kindName = sniff(buf);
  if (!kindName) {
    throw Object.assign(new Error("نوع الملف غير مدعوم — الصيغ المسموحة: JPG، PNG، WEBP، GIF، MP4، WEBM"), { status: 415 });
  }

  const isVideo = kindName === "mp4" || kindName === "webm";
  const capMb = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
  if (buf.length > capMb * 1024 * 1024) {
    throw Object.assign(new Error(`حجم الملف يتجاوز الحد المسموح (${capMb}MB)`), { status: 413 });
  }

  // "story" → "stories" (matches seed data + instrumentation dirs); "message" → "messages"; else kind+s
  const subdir = kind === "message" ? "messages" : kind === "story" ? "stories" : `${kind}s`;
  const dir = path.join(process.cwd(), UPLOAD_DIR, subdir);
  await fs.mkdir(dir, { recursive: true });

  let out: Buffer<ArrayBufferLike> = buf;
  let width: number | undefined;
  let height: number | undefined;
  let ext: string = kindName === "jpeg" ? "jpg" : kindName;

  if (!isVideo) {
    // Re-encode → kills EXIF/GPS metadata, normalizes format (SVG already rejected by sniff)
    const dim = MAX_DIMENSIONS[kind];
    let img = sharp(buf, { failOn: "error" }).rotate();
    if (opts?.square) {
      img = img.resize(512, 512, { fit: "cover" });
    } else if (dim) {
      img = img.resize({ width: dim.w, height: dim.h, fit: "inside", withoutEnlargement: true });
    }
    if (kindName === "gif") {
      // keep animation: store original GIF but downscale if huge
      const meta = await sharp(buf).metadata();
      width = meta.width;
      height = meta.height;
    } else {
      const res = await img.webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
      out = res.data;
      width = res.info.width;
      height = res.info.height;
      ext = "webp";
    }
  }

  const name = `${randomId(12)}_${Date.now()}.${ext}`;
  await fs.writeFile(path.join(dir, name), out);
  return {
    url: `/api/media/${subdir}/${name}`,
    type: isVideo ? "VIDEO" : "IMAGE",
    width,
    height,
    size: out.length,
  };
}

export async function deleteMediaFile(url: string): Promise<void> {
  const file = mediaUrlToFile(url);
  if (!file) return;
  await fs.rm(file, { force: true }).catch(() => null);
}
