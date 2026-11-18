/**
 * YEM360 — Central input validation schemas (zod v4).
 * Every mutating endpoint validates through these — no direct trust of client data.
 */
import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(3, "3 أحرف على الأقل")
  .max(20, "20 حرفاً كحد أقصى")
  .regex(/^[a-zA-Z0-9_]+$/, "أحرف إنجليزية وأرقام وشرطة سفلية فقط");

export const passwordSchema = z
  .string()
  .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
  .max(72)
  .regex(/[a-zA-Z]/, "يجب أن تحتوي على حرف واحد على الأقل")
  .regex(/[0-9]/, "يجب أن تحتوي على رقم واحد على الأقل");

export const registerSchema = z.object({
  name: z.string().min(2, "الاسم قصير جداً").max(50),
  username: usernameSchema,
  email: z.string().email("بريد إلكتروني غير صالح").max(120).toLowerCase(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  identifier: z.string().min(3).max(120), // email or username
  password: z.string().min(1).max(72),
});

export const twoFactorSchema = z.object({
  code: z.string().min(5).max(10),
});

export const postCreateSchema = z.object({
  content: z.string().min(1, "المنشور فارغ").max(5000),
  privacy: z.enum(["PUBLIC", "FOLLOWERS", "PRIVATE"]).default("PUBLIC"),
  mediaUrls: z.array(z.string().max(300)).max(4, "4 وسائط كحد أقصى").default([]),
  locationName: z.string().max(120).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  repostOfId: z.string().max(40).optional(),
});

export const commentCreateSchema = z.object({
  text: z.string().min(1).max(2000),
  parentId: z.string().max(40).optional(),
  target: z.enum(["post", "reel"]).default("post"),
});

export const messageSendSchema = z.object({
  text: z.string().max(4000).optional(),
  mediaUrl: z.string().max(300).optional(),
  mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
  replyToId: z.string().max(40).optional(),
});

export const groupCreateSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  memberIds: z.array(z.string().max(40)).max(50).min(1, "اختر عضواً واحداً على الأقل"),
});

export const storyCreateSchema = z.object({
  type: z.enum(["IMAGE", "TEXT", "VIDEO"]),
  mediaUrl: z.string().max(300).optional(),
  text: z.string().max(280).optional(),
  bgColor: z.string().max(30).optional(),
});

export const reelCreateSchema = z.object({
  caption: z.string().max(2000).optional(),
  videoUrl: z.string().min(1).max(300),
  duration: z.number().int().min(0).max(600).optional(),
  musicName: z.string().max(100).optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().max(300).optional().nullable(),
  coverUrl: z.string().max(300).optional().nullable(),
  website: z.string().max(200).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  birthday: z.string().max(10).optional().nullable(),
  gender: z.enum(["", "MALE", "FEMALE"]).optional(),
  professionalCategory: z.string().max(60).optional().nullable(),
  accountType: z.enum(["PERSONAL", "PROFESSIONAL", "CREATOR", "BUSINESS"]).optional(),
});

export const settingsSchema = z.object({
  theme: z.enum(["LIGHT", "DARK", "SYSTEM"]).optional(),
  emailNotify: z.boolean().optional(),
  pushNotify: z.boolean().optional(),
  notifyLikes: z.boolean().optional(),
  notifyComments: z.boolean().optional(),
  notifyFollows: z.boolean().optional(),
  notifyMessages: z.boolean().optional(),
  language: z.enum(["AR", "EN"]).optional(),
});

export const privacySchema = z.object({
  privateAccount: z.boolean().optional(),
  showOnlineStatus: z.boolean().optional(),
  whoCanMessage: z.enum(["EVERYONE", "FOLLOWERS", "NONE"]).optional(),
  storyPrivacy: z.enum(["ALL", "FOLLOWERS", "NONE"]).optional(),
  whoCanTagMe: z.enum(["EVERYONE", "FOLLOWERS", "NONE"]).optional(),
});

export const reportSchema = z.object({
  targetType: z.enum(["USER", "POST", "COMMENT", "REEL", "STORY", "MESSAGE", "PRODUCT"]),
  targetId: z.string().min(1).max(40),
  reason: z.enum(["SPAM", "HARASSMENT", "HATE_SPEECH", "VIOLENCE", "NUDITY", "MISINFORMATION", "OTHER"]),
  details: z.string().max(500).optional(),
});

export const productSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().min(5).max(2000),
  price: z.number().min(0).max(100_000_000),
  currency: z.enum(["YER", "USD", "SAR"]).default("YER"),
  category: z.string().max(50).optional(),
  stock: z.number().int().min(0).max(100000).default(1),
  imageUrls: z.array(z.string().max(300)).max(4).default([]),
});

export const orderSchema = z.object({
  productId: z.string().min(1).max(40),
  quantity: z.number().int().min(1).max(100).default(1),
  address: z.string().max(300),
  phone: z.string().min(7).max(20),
  note: z.string().max(300).optional(),
});

export const adSchema = z.object({
  title: z.string().min(3).max(80),
  body: z.string().min(5).max(300),
  imageUrl: z.string().max(300).optional(),
  targetUrl: z.string().url("رابط الهدف غير صالح").max(300),
  budget: z.number().min(0).max(1_000_000).default(0),
  targetGender: z.enum(["ALL", "MALE", "FEMALE"]).default("ALL"),
  targetMinAge: z.number().int().min(13).max(100).optional(),
  targetMaxAge: z.number().int().min(13).max(100).optional(),
});

export const channelSchema = z.object({
  name: z.string().min(2).max(50),
  handle: usernameSchema,
  description: z.string().max(300).optional(),
});

export const noteSchema = z.object({
  text: z.string().min(1).max(160),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});
