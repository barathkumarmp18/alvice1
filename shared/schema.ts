import { z } from "zod";

// Emotion types for mood tracking
export const EmotionType = z.enum(["happiness", "sadness", "anger", "calm", "excitement"]);
export type EmotionType = z.infer<typeof EmotionType>;

// User role types
export const UserRole = z.enum(["creator", "explorer"]);
export type UserRole = z.infer<typeof UserRole>;

// Life stage options
export const LifeStage = z.enum([
  "student",
  "college_student",
  "professional",
  "looking_for_opportunities",
  "entrepreneur",
  "retired",
  "other"
]);
export type LifeStage = z.infer<typeof LifeStage>;

// Post type
export const PostType = z.enum(["post", "question"]);
export type PostType = z.infer<typeof PostType>;

// User Settings Schema
export const UserSettingsSchema = z.object({
  diaryPublic: z.boolean().default(true),
  allowAnonymousMessages: z.boolean().default(true),
  multiAccountIds: z.array(z.string()).default([]),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

// Organization/Education details
export const OrganizationDetailsSchema = z.object({
  type: z.enum(["school", "college", "company", "other"]),
  name: z.string(),
  id: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
}).optional();

export type OrganizationDetails = z.infer<typeof OrganizationDetailsSchema>;

// User Schema
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  username: z.string(),
  photoURL: z.string().optional(),
  role: UserRole,
  bio: z.string().optional(),
  dateOfBirth: z.string().optional(),
  interests: z.array(z.string()),
  contentPreferences: z.array(z.string()),
  lifeStage: LifeStage.optional(),
  organizationDetails: OrganizationDetailsSchema,
  employmentStatus: z.enum(["employed", "unemployed", "student", "self_employed", "retired"]).optional(),
  relationshipStatus: z.enum(["single", "in_relationship", "married", "prefer_not_to_say"]).optional(),
  followers: z.array(z.string()).default([]),
  following: z.array(z.string()).default([]),
  createdAt: z.string(),
  profileSetupComplete: z.boolean().default(false),
  lastMoodCheck: z.string().optional(),
  anonymousLinkId: z.string().optional(),
  settings: UserSettingsSchema.default({
    diaryPublic: true,
    allowAnonymousMessages: true,
    multiAccountIds: [],
  }),
  currentMood: EmotionType.optional(),
});

export type User = z.infer<typeof UserSchema>;

export const InsertUserSchema = UserSchema.omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof InsertUserSchema>;

// Post Schema
export const PostSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  type: PostType,
  title: z.string(),
  content: z.string(),
  images: z.array(z.string()).max(3).default([]),
  tribeIds: z.array(z.string()).max(5).default([]),
  tags: z.array(z.string()).default([]),
  likes: z.array(z.string()).default([]),
  commentCount: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Post = z.infer<typeof PostSchema>;

export const InsertPostSchema = PostSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  likes: true,
  commentCount: true 
});
export type InsertPost = z.infer<typeof InsertPostSchema>;

// Comment Schema
export const CommentSchema = z.object({
  id: z.string(),
  postId: z.string(),
  authorId: z.string(),
  content: z.string(),
  parentCommentId: z.string().optional(),
  likes: z.array(z.string()).default([]),
  createdAt: z.string(),
});

export type Comment = z.infer<typeof CommentSchema>;

export const InsertCommentSchema = CommentSchema.omit({ 
  id: true, 
  createdAt: true,
  likes: true 
});
export type InsertComment = z.infer<typeof InsertCommentSchema>;

// Tribe Schema
export const TribeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  founderId: z.string(),
  coverImage: z.string().optional(),
  maxMembers: z.number().optional(),
  allowAnonymous: z.boolean().default(false),
  founderVisible: z.boolean().default(true),
  isPrivate: z.boolean().default(false),
  members: z.array(z.string()).default([]),
  pendingMembers: z.array(z.string()).default([]),
  createdAt: z.string(),
});

export type Tribe = z.infer<typeof TribeSchema>;

export const InsertTribeSchema = TribeSchema.omit({ 
  id: true, 
  createdAt: true,
  members: true,
  pendingMembers: true 
});
export type InsertTribe = z.infer<typeof InsertTribeSchema>;

// Mood Entry Schema
export const MoodEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  emotion: EmotionType,
  reason: z.string(),
  isPublic: z.boolean(),
  date: z.string(),
  editCount: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type MoodEntry = z.infer<typeof MoodEntrySchema>;

export const InsertMoodEntrySchema = MoodEntrySchema.omit({ 
  id: true, 
  createdAt: true 
});
export type InsertMoodEntry = z.infer<typeof InsertMoodEntrySchema>;

// Message Schema
export const MessageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  content: z.string(),
  isAnonymous: z.boolean().default(false),
  read: z.boolean().default(false),
  createdAt: z.string(),
});

export type Message = z.infer<typeof MessageSchema>;

export const InsertMessageSchema = MessageSchema.omit({ 
  id: true, 
  createdAt: true,
  read: true 
});
export type InsertMessage = z.infer<typeof InsertMessageSchema>;

// Notification Schema
export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(["like", "comment", "follow", "tribe_invite", "message"]),
  actorId: z.string().optional(),
  postId: z.string().optional(),
  tribeId: z.string().optional(),
  message: z.string(),
  read: z.boolean().default(false),
  createdAt: z.string(),
});

export type Notification = z.infer<typeof NotificationSchema>;

export const InsertNotificationSchema = NotificationSchema.omit({ 
  id: true, 
  createdAt: true,
  read: true 
});
export type InsertNotification = z.infer<typeof InsertNotificationSchema>;

// Analytics Schema (for Creator Dashboard)
export const PostAnalyticsSchema = z.object({
  postId: z.string(),
  views: z.number().default(0),
  engagement: z.number().default(0),
  shares: z.number().default(0),
});

export type PostAnalytics = z.infer<typeof PostAnalyticsSchema>;

// Global Emotion Data (for mood statistics)
export const GlobalEmotionDataSchema = z.object({
  emotion: EmotionType,
  count: z.number(),
  percentage: z.number(),
});

export type GlobalEmotionData = z.infer<typeof GlobalEmotionDataSchema>;
