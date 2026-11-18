/**
 * YEM360 — shared client types (mirror of API payloads).
 */
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
  professionalCategory?: string | null;
  role?: string;
  email?: string;
  createdAt?: string;
  followerCount?: number;
  relationshipStatus?: string | null;
}

export interface PostMediaDTO {
  id: string;
  type: string;
  url: string;
  width?: number | null;
  height?: number | null;
}

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
  media: PostMediaDTO[];
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

export interface CommentDTO {
  id: string;
  text: string;
  createdAt: string;
  parentId: string | null;
  author: PublicUser;
  likeCount: number;
  replyCount: number;
  likedByMe: boolean;
  replies: CommentDTO[];
}

export interface ReelDTO {
  id: string;
  caption?: string | null;
  videoUrl: string;
  duration?: number | null;
  musicName?: string | null;
  viewCount: number;
  createdAt: string;
  author: PublicUser;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface StoryDTO {
  id: string;
  type: "IMAGE" | "TEXT" | "VIDEO";
  mediaUrl?: string | null;
  text?: string | null;
  bgColor?: string | null;
  createdAt: string;
  expiresAt: string;
  viewCount: number;
  viewedByMe: boolean;
}

export interface StoryGroup {
  user: PublicUser;
  hasUnseen: boolean;
  stories: StoryDTO[];
}

export interface ConversationDTO {
  id: string;
  type: "DIRECT" | "GROUP";
  title?: string | null;
  avatarUrl?: string | null;
  username?: string | null;
  userId?: string | null;
  membersCount: number;
  lastMessage?: {
    id: string; text?: string | null; mediaUrl?: string | null; mediaType?: string | null; senderId: string; createdAt: string;
  } | null;
  lastMessageAt: string;
  unread: number;
  isMuted: boolean;
  role?: string;
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  replyTo?: { id: string; text?: string | null; senderId: string } | null;
  createdAt: string;
}

export interface NotificationDTO {
  id: string;
  type: string;
  text?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
  actor: PublicUser | null;
}

export interface SettingsDTO {
  theme: string;
  emailNotify: boolean;
  pushNotify: boolean;
  notifyLikes: boolean;
  notifyComments: boolean;
  notifyFollows: boolean;
  notifyMessages: boolean;
}

export interface PrivacyDTO {
  privateAccount: boolean;
  showOnlineStatus: boolean;
  whoCanMessage: string;
  storyPrivacy: string;
  whoCanTagMe: string;
}

export interface ProfileRelationship {
  isSelf: boolean;
  isFollowing: boolean;
  isPending: boolean;
  followsMe: boolean;
  friendshipStatus: string | null;
  friendshipRole: string | null;
  friendshipId: string | null;
  isBlockedByMe: boolean;
  privateAccount: boolean;
  canSeeContent: boolean;
}

export interface ProfileDTO {
  user: PublicUser;
  note?: string | null;
  counts: { followers: number; following: number; friends: number; posts: number; reels: number };
  relationship: ProfileRelationship;
}

export interface ProductDTO {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category?: string | null;
  stock: number;
  status: string;
  viewCount: number;
  images: string[];
  seller: PublicUser;
  isMine: boolean;
  createdAt: string;
}

export interface OrderDTO {
  id: string;
  quantity: number;
  totalPrice: number;
  status: string;
  address?: string | null;
  phone?: string | null;
  note?: string | null;
  createdAt: string;
  product: { id: string; title: string; price: number; currency: string; image: string | null };
  counterpart: { username: string; name: string; avatarUrl?: string | null };
  role: "BUYER" | "SELLER";
}

export interface AdDTO {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  targetUrl: string;
  status?: string;
  budget?: number;
  impressionCount?: number;
  clickCount?: number;
  ctr?: number;
  advertiser?: { username: string; name: string };
  createdAt?: string;
}

export interface ChannelDTO {
  id: string;
  name: string;
  handle: string;
  description?: string | null;
  subscriberCount: number;
  owner: PublicUser;
  isOwner: boolean;
  createdAt: string;
}

export interface ChannelMessageDTO {
  id: string;
  text?: string | null;
  mediaUrl?: string | null;
  createdAt: string;
  sender: PublicUser;
}

export interface SessionDTO {
  id: string;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
  ip?: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

export interface SecurityEventDTO {
  id: string;
  type: string;
  severity: string;
  ip?: string | null;
  details?: string | null;
  createdAt: string;
}

export interface ReportAdminDTO {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string | null;
  status: string;
  action?: string | null;
  createdAt: string;
  reporter?: { username: string; name: string } | null;
  reviewedBy?: { username: string } | null;
  target: unknown;
}

export interface MeResponse {
  ok: boolean;
  user: PublicUser;
  settings?: SettingsDTO;
  privacy?: PrivacyDTO;
  counts?: { unreadNotifications: number; unreadMessages: number };
}

export type ViewName =
  | "home" | "explore" | "reels" | "messages" | "notifications" | "profile"
  | "settings" | "search" | "market" | "channels" | "map" | "insights" | "ads" | "admin" | "tag" | "live";

export interface ViewRoute {
  name: ViewName;
  param?: string; // username / conversationId / tag name...
}
