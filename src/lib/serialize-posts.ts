/**
 * YEM360 — Post/comment/reel serializers used by all content APIs.
 */
import type { Prisma } from "@prisma/client";
import { publicUser, type PublicUser } from "./serialize";

export type PostWithRelations = Prisma.PostGetPayload<{
  include: {
    author: { include: { profile: true } };
    media: true;
    hashtags: { include: { hashtag: true } };
    likes: { select: { userId: true } };
    saves: { select: { userId: true } };
    reposts: { select: { authorId: true } };
    _count: { select: { likes: true; comments: true; reposts: true } };
    repostOf: {
      include: {
        author: { include: { profile: true } };
        media: true;
        hashtags: { include: { hashtag: true } };
      };
    };
  };
}>;

export interface PostDTO {
  id: string;
  content: string;
  privacy: string;
  createdAt: string;
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  viewCount: number;
  author: PublicUser;
  media: { id: string; type: string; url: string; width?: number | null; height?: number | null }[];
  hashtags: string[];
  likeCount: number;
  commentCount: number;
  repostCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  repostedByMe: boolean;
  repostOf: PostDTO | null;
  isPinned?: boolean;
}

export function serializePost(
  p: PostWithRelations,
  viewerId: string | null,
  opts?: { isPinned?: boolean }
): PostDTO {
  const dto: PostDTO = {
    id: p.id,
    content: p.content,
    privacy: p.privacy,
    createdAt: p.createdAt.toISOString(),
    locationName: p.locationName,
    latitude: p.latitude,
    longitude: p.longitude,
    viewCount: p.viewCount,
    author: publicUser(p.author, p.author.profile),
    media: p.media
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((m) => ({ id: m.id, type: m.type, url: m.url, width: m.width, height: m.height })),
    hashtags: p.hashtags.map((h) => h.hashtag.name),
    likeCount: p._count?.likes ?? p.likes?.length ?? 0,
    commentCount: p._count?.comments ?? 0,
    repostCount: p._count?.reposts ?? p.reposts?.length ?? 0,
    likedByMe: viewerId ? p.likes.some((l) => l.userId === viewerId) : false,
    savedByMe: viewerId ? p.saves.some((s) => s.userId === viewerId) : false,
    repostedByMe: viewerId ? p.reposts.some((r) => r.authorId === viewerId) : false,
    repostOf: null,
    isPinned: opts?.isPinned,
  };
  if (p.repostOf) {
    dto.repostOf = serializePost(
      p.repostOf as unknown as PostWithRelations,
      viewerId,
      {}
    );
  }
  return dto;
}

export function serializePosts(posts: PostWithRelations[], viewerId: string | null): PostDTO[] {
  return posts.map((p) => serializePost(p, viewerId));
}

export type CommentWithRelations = Prisma.CommentGetPayload<{
  include: {
    author: { include: { profile: true } };
    likes: { select: { userId: true } };
    _count: { select: { likes: true; replies: true } };
    replies: {
      include: {
        author: { include: { profile: true } };
        likes: { select: { userId: true } };
        _count: { select: { likes: true } };
      };
      orderBy: { createdAt: "asc" };
    };
  };
}>;

export function serializeComment(c: CommentWithRelations, viewerId: string | null) {
  return {
    id: c.id,
    text: c.text,
    createdAt: c.createdAt.toISOString(),
    parentId: c.parentId,
    author: publicUser(c.author, c.author.profile),
    likeCount: c._count?.likes ?? c.likes?.length ?? 0,
    replyCount: c._count?.replies ?? c.replies?.length ?? 0,
    likedByMe: viewerId ? c.likes.some((l) => l.userId === viewerId) : false,
    replies: c.replies.map((r) => ({
      id: r.id,
      text: r.text,
      createdAt: r.createdAt.toISOString(),
      parentId: r.parentId,
      author: publicUser(r.author, r.author.profile),
      likeCount: r._count?.likes ?? r.likes?.length ?? 0,
      replyCount: 0,
      likedByMe: viewerId ? r.likes.some((l) => l.userId === viewerId) : false,
      replies: [],
    })),
  };
}

export type ReelWithRelations = Prisma.ReelGetPayload<{
  include: {
    user: { include: { profile: true } };
    likes: { select: { userId: true } };
    _count: { select: { likes: true; comments: true } };
  };
}>;

export function serializeReel(r: ReelWithRelations, viewerId: string | null) {
  return {
    id: r.id,
    caption: r.caption,
    videoUrl: r.videoUrl,
    duration: r.duration,
    musicName: r.musicName,
    viewCount: r.viewCount,
    createdAt: r.createdAt.toISOString(),
    author: publicUser(r.user, r.user.profile),
    likeCount: r._count?.likes ?? r.likes?.length ?? 0,
    commentCount: r._count?.comments ?? 0,
    likedByMe: viewerId ? r.likes.some((l) => l.userId === viewerId) : false,
  };
}
